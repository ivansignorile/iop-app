"use server";

import { notificaRichiesta } from "@/lib/notifiche/invia";
import {
  MAX_FILE_BYTES,
  MAX_FILES,
  MAX_RICHIESTE_ORA,
  MIME_AMMESSI,
  validaRichiesta,
  type FileMeta,
} from "@/lib/richieste/valida";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "richieste";
const CARTELLA_RE = /^\d{4}-\d{2}-\d{2}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CARICAMENTO_KO = "Caricamento non valido, riprova.";

const safe = (nome: string) => nome.normalize("NFKD").replace(/[^\w.-]+/g, "_").slice(-80);

export async function preparaUpload(files: FileMeta[]) {
  if (!Array.isArray(files) || files.length === 0 || files.length > MAX_FILES) {
    return { ok: false as const, errore: "Carica almeno una foto." };
  }
  // Valida solo i file (con dati fittizi per il resto): stessi limiti del submit.
  const check = validaRichiesta({
    nome: "xx",
    email: "a@b.it",
    tipo: "foto_descrizione",
    descrizione: "x".repeat(10),
    files,
    honeypot: "",
  });
  if (!check.ok) return { ok: false as const, errore: check.errore };

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
  if (
    typeof cartella !== "string" ||
    !CARTELLA_RE.test(cartella) ||
    !Array.isArray(paths) ||
    paths.length !== r.files.length ||
    new Set(paths).size !== paths.length ||
    paths.some((p) => typeof p !== "string" || !p.startsWith(`${cartella}/`) || p.slice(cartella.length + 1).includes("/"))
  ) {
    return { ok: false as const, errore: "Richiesta non valida." };
  }

  const supabase = createAdminClient();

  // I metadati dichiarati dal client non sono affidabili: uso quelli reali dello storage.
  const { data: stored, error: listError } = await supabase.storage.from(BUCKET).list(cartella, { limit: 100 });
  if (listError || !stored) return { ok: false as const, errore: CARICAMENTO_KO };
  const byName = new Map(stored.map((o) => [o.name, o]));
  const files: (FileMeta & { path: string })[] = [];
  for (const [i, path] of paths.entries()) {
    const obj = byName.get(path.slice(cartella.length + 1));
    const size = Number(obj?.metadata?.size);
    const mime = obj?.metadata?.mimetype;
    if (!obj || !Number.isFinite(size) || size <= 0 || size > MAX_FILE_BYTES || typeof mime !== "string" || !MIME_AMMESSI.includes(mime)) {
      return { ok: false as const, errore: CARICAMENTO_KO };
    }
    files.push({ nome: r.files[i].nome, mime, size, path });
  }
  // Rivalida con i metadati reali (es. "carica almeno una foto", capitolato).
  const reale = validaRichiesta({ ...input, files: files.map(({ nome, mime, size }) => ({ nome, mime, size })) });
  if (!reale.ok) return reale;

  const unOraFa = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await supabase
    .from("richieste_servizio")
    .select("id", { count: "exact", head: true })
    .eq("email", r.email)
    .gte("created_at", unOraFa);
  if ((count ?? 0) >= MAX_RICHIESTE_ORA) return { ok: false as const, errore: "Troppe richieste, riprova più tardi." };

  const { data, error } = await supabase
    .from("richieste_servizio")
    .insert({ nome: r.nome, email: r.email, telefono: r.telefono, tipo: r.tipo, descrizione: r.descrizione, comune: r.comune, files })
    .select("id")
    .single();
  if (error || !data) return { ok: false as const, errore: "Invio non riuscito, riprova." };

  // Prima salvo, poi notifico: una notifica fallita non perde la richiesta.
  const esito = await notificaRichiesta({ ...r, files, id: data.id });
  await supabase
    .from("richieste_servizio")
    .update({ notifica_email_ok: esito.email, notifica_whatsapp_ok: esito.whatsapp })
    .eq("id", data.id);

  return { ok: true as const };
}
