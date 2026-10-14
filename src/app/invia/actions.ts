"use server";

import { notificaRichiesta } from "@/lib/notifiche/invia";
import { erroreInserimento } from "@/lib/richieste/esito-insert";
import { consentiAzione, TROPPE_RICHIESTE } from "@/lib/richieste/rate-limit";
import { MAX_FILES, MAX_RICHIESTE_ORA, validaRichiesta, type FileMeta } from "@/lib/richieste/valida";
import { CARICAMENTO_KO, verificaFileCaricati } from "@/lib/richieste/verifica-file";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "richieste";

const safe = (nome: string) => nome.normalize("NFKD").replace(/[^\w.-]+/g, "_").slice(-80);

export async function preparaUpload(files: FileMeta[], honeypot = "") {
  if (!Array.isArray(files) || files.length === 0) return { ok: false as const, errore: "Carica almeno una foto." };
  if (files.length > MAX_FILES) return { ok: false as const, errore: `Massimo ${MAX_FILES} file.` };
  // Valida solo i file (con dati fittizi per il resto): stessi limiti del submit.
  const check = validaRichiesta({
    nome: "xx",
    email: "a@b.it",
    tipo: "foto_descrizione",
    descrizione: "x".repeat(10),
    files,
    honeypot,
  });
  if (!check.ok) return { ok: false as const, errore: check.errore };
  if (!(await consentiAzione("prepara"))) return { ok: false as const, errore: TROPPE_RICHIESTE };

  const supabase = createAdminClient();
  const cartella = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}`;
  const uploads: { path: string; token: string }[] = [];
  for (const [i, f] of files.entries()) {
    const path = `${cartella}/${i}-${safe(f.nome)}`;
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data) return { ok: false as const, errore: "Upload non disponibile, riprova." };
    uploads.push({ path, token: data.token });
  }
  return { ok: true as const, cartella, uploads };
}

export async function inviaRichiesta(input: Record<string, unknown> & { cartella: string; paths: string[] }) {
  const v = validaRichiesta(input);
  if (!v.ok) return v;
  const r = v.data;

  const { cartella, paths } = input;
  if (typeof cartella !== "string" || !Array.isArray(paths)) return { ok: false as const, errore: "Richiesta non valida." };

  const supabase = createAdminClient();

  // I metadati dichiarati dal client non sono affidabili: uso quelli reali dello storage.
  const { data: stored, error: listError } = await supabase.storage.from(BUCKET).list(cartella, { limit: 100 });
  if (listError || !stored) return { ok: false as const, errore: CARICAMENTO_KO };
  const verifica = verificaFileCaricati(
    cartella,
    paths,
    r.files,
    stored.map((o) => ({ name: o.name, size: Number(o.metadata?.size) || null, mimetype: o.metadata?.mimetype ?? null })),
  );
  if (!verifica.ok) return verifica;
  const files = verifica.files;
  // Rivalida con i metadati reali (es. "carica almeno una foto", capitolato).
  const reale = validaRichiesta({ ...input, files: files.map(({ nome, mime, size }) => ({ nome, mime, size })) });
  if (!reale.ok) return reale;

  // Replay: uscita rapida (senza consumare quota). La garanzia atomica e' l'indice unico su `cartella`.
  const { count: gia } = await supabase
    .from("richieste_servizio")
    .select("id", { count: "exact", head: true })
    .eq("cartella", cartella);
  if ((gia ?? 0) > 0) return { ok: false as const, errore: "Richiesta già inviata." };

  if (!(await consentiAzione("invia"))) return { ok: false as const, errore: TROPPE_RICHIESTE };

  const unOraFa = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await supabase
    .from("richieste_servizio")
    .select("id", { count: "exact", head: true })
    .eq("email", r.email)
    .gte("created_at", unOraFa);
  if ((count ?? 0) >= MAX_RICHIESTE_ORA) return { ok: false as const, errore: TROPPE_RICHIESTE };

  const { data, error } = await supabase
    .from("richieste_servizio")
    .insert({ nome: r.nome, email: r.email, telefono: r.telefono, tipo: r.tipo, descrizione: r.descrizione, comune: r.comune, files, cartella })
    .select("id")
    .single();
  // 23505: replay concorrente/riordinato, nessuna notifica.
  if (error || !data) return { ok: false as const, errore: erroreInserimento(error) };

  // Prima salvo, poi notifico: una notifica fallita non perde la richiesta.
  const esito = await notificaRichiesta({ ...r, files, id: data.id });
  await supabase
    .from("richieste_servizio")
    .update({ notifica_email_ok: esito.email, notifica_whatsapp_ok: esito.whatsapp })
    .eq("id", data.id);

  return { ok: true as const };
}
