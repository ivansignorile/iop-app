// Edge function: importa-preventivi
// Legge un vecchio preventivo (PDF o immagine) caricato in Storage, ne estrae le
// voci di lavorazione con prezzo unitario e le salva nella libreria personale
// dell'org (voci_proprie). Tutto passa dal client con il JWT dell'utente: RLS
// su documenti_libreria, voci_proprie e storage.objects. verify_jwt=true.

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-opus-4-7";

const MAX_BYTES = 20 * 1024 * 1024;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UNITA = ["corpo", "mq", "ml", "mc", "giorno", "cad", "kg"] as const;
type Unita = (typeof UNITA)[number];

const IMAGE_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["voci"],
  properties: {
    voci: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["titolo", "descrizione", "unita", "prezzo", "categoria"],
        properties: {
          titolo: { type: "string", description: "Nome breve della lavorazione" },
          descrizione: {
            type: "string",
            description: "Descrizione COMPLETA come scritta nel preventivo, senza riassumere",
          },
          unita: { type: "string", enum: [...UNITA] },
          prezzo: { type: "number", description: "Prezzo UNITARIO in euro (non l'importo totale)" },
          categoria: { type: "string" },
        },
      },
    },
  },
};

const SYSTEM_PROMPT =
  "Estrai da questo preventivo edile tutte le voci di lavorazione con prezzo unitario. " +
  "Mantieni il testo della descrizione così come scritto dalla ditta: è la sua libreria personale. " +
  "Ignora totali, IVA, condizioni di pagamento. " +
  "Se una voce ha solo l'importo a corpo, unita='corpo' e prezzo=importo.";

class UserError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

type Voce = {
  titolo: string;
  descrizione: string;
  unita: Unita;
  prezzo: number;
  categoria: string | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  // Valorizzato appena il documento è letto: da lì ogni errore va salvato sulla riga.
  let documentoId: string | null = null;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Non autenticato" }, 401);

    let body: { documento_id?: unknown };
    try {
      body = await req.json();
    } catch {
      return json({ error: "Body JSON non valido" }, 400);
    }
    const id = typeof body?.documento_id === "string" ? body.documento_id : "";
    if (!UUID_RE.test(id)) return json({ error: "documento_id non valido" }, 400);

    // RLS: l'utente vede solo i documenti delle proprie org.
    const { data: doc, error: docErr } = await supabase
      .from("documenti_libreria")
      .select("id, org_id, storage_path, nome_file")
      .eq("id", id)
      .maybeSingle();
    if (docErr) throw new Error(docErr.message);
    if (!doc) return json({ error: "Documento non trovato" }, 404);
    documentoId = doc.id;

    await setStato(supabase, doc.id, { stato: "in_elaborazione", errore: null });

    // Il path deve stare nella cartella dell'org del documento.
    if (!doc.storage_path.startsWith(`${doc.org_id}/libreria/`)) {
      throw new UserError("Percorso del file non valido");
    }

    const { data: blob, error: dlErr } = await supabase.storage
      .from("preventivi")
      .download(doc.storage_path);
    if (dlErr || !blob) throw new UserError("File non trovato nello storage", 404);
    if (blob.size === 0) throw new UserError("Il file è vuoto");
    if (blob.size > MAX_BYTES) {
      throw new UserError("File troppo grande: il limite è 20 MB", 413);
    }

    const mediaType = detectMediaType(blob.type, doc.storage_path);
    if (!mediaType) {
      throw new UserError("Formato non supportato: carica un PDF o un'immagine (JPG, PNG, WEBP, GIF)", 415);
    }

    const data = toBase64(new Uint8Array(await blob.arrayBuffer()));
    const source = { type: "base64", media_type: mediaType, data };
    const fileBlock = mediaType === "application/pdf"
      ? { type: "document", source }
      : { type: "image", source };

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 16000,
        system: [{ type: "text", text: SYSTEM_PROMPT }],
        messages: [{
          role: "user",
          content: [
            fileBlock,
            { type: "text", text: `Preventivo: ${doc.nome_file}. Restituisci le voci in JSON.` },
          ],
        }],
        output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
      }),
    });
    if (!aiRes.ok) {
      console.error("anthropic", aiRes.status, await aiRes.text());
      throw new UserError("Errore del servizio di estrazione, riprova più tardi", 502);
    }
    const aiData = await aiRes.json();
    if (aiData.stop_reason === "max_tokens") {
      throw new UserError("Documento troppo lungo: dividilo in più file", 422);
    }
    const textBlock = (aiData.content ?? []).find((b: { type: string }) => b.type === "text");
    if (!textBlock) throw new UserError("Risposta di estrazione vuota", 502);
    const parsed = JSON.parse(textBlock.text) as { voci?: unknown[] };

    const voci = normalizza(parsed.voci ?? []);

    // Dedup con le voci esistenti dell'org per lower(titolo)+unita.
    const { data: esistenti, error: exErr } = await supabase
      .from("voci_proprie")
      .select("id, titolo, unita, prezzo, descrizione")
      .eq("org_id", doc.org_id);
    if (exErr) throw new Error(exErr.message);
    const mappa = new Map(
      (esistenti ?? []).map((v) => [chiave(v.titolo, v.unita), v]),
    );

    const daInserire: Array<Voce & { org_id: string; documento_id: string }> = [];
    const daAggiornare: Array<{ id: string; prezzo: number; descrizione: string }> = [];
    for (const v of voci) {
      const ex = mappa.get(chiave(v.titolo, v.unita));
      if (ex) {
        if (Number(ex.prezzo) !== v.prezzo || ex.descrizione !== v.descrizione) {
          daAggiornare.push({ id: ex.id, prezzo: v.prezzo, descrizione: v.descrizione });
        }
      } else {
        daInserire.push({ ...v, org_id: doc.org_id, documento_id: doc.id });
      }
    }

    if (daInserire.length) {
      const { error } = await supabase.from("voci_proprie").insert(daInserire);
      if (error) throw new Error(error.message);
    }
    for (const u of daAggiornare) {
      const { error } = await supabase
        .from("voci_proprie")
        .update({ prezzo: u.prezzo, descrizione: u.descrizione })
        .eq("id", u.id);
      if (error) throw new Error(error.message);
    }

    const n = daInserire.length + daAggiornare.length;
    await setStato(supabase, doc.id, { stato: "elaborato", voci_estratte: n, errore: null });

    return json({
      voci: n,
      inserite: daInserire.length,
      aggiornate: daAggiornare.length,
      saltate: voci.length - n,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = e instanceof UserError ? e.status : 500;
    if (!(e instanceof UserError)) console.error("importa-preventivi", e);
    if (documentoId) {
      await setStato(supabase, documentoId, { stato: "errore", errore: msg.slice(0, 500) })
        .catch((err) => console.error("set errore", err));
    }
    return json({ error: msg }, status);
  }
});

async function setStato(supabase: SupabaseClient, id: string, patch: Record<string, unknown>) {
  const { error } = await supabase.from("documenti_libreria").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

function chiave(titolo: string, unita: string) {
  return `${titolo.trim().toLowerCase()}|${unita}`;
}

/** Pulisce l'output del modello: scarta voci senza titolo/descrizione o con prezzo <= 0,
 * e deduplica dentro lo stesso documento (vince la prima occorrenza). */
function normalizza(raw: unknown[]): Voce[] {
  const out: Voce[] = [];
  const visti = new Set<string>();
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const titolo = String(o.titolo ?? "").trim().slice(0, 300);
    const descrizione = String(o.descrizione ?? "").trim() || titolo;
    const unita = (UNITA as readonly string[]).includes(String(o.unita)) ? (o.unita as Unita) : "corpo";
    const prezzo = Math.round(Number(o.prezzo) * 100) / 100;
    const categoria = String(o.categoria ?? "").trim().slice(0, 100) || null;
    if (!titolo || !Number.isFinite(prezzo) || prezzo <= 0) continue;
    const k = chiave(titolo, unita);
    if (visti.has(k)) continue;
    visti.add(k);
    out.push({ titolo, descrizione, unita, prezzo, categoria });
  }
  return out;
}

function detectMediaType(blobType: string, path: string): string | null {
  const t = (blobType || "").toLowerCase().split(";")[0].trim();
  if (t === "application/pdf") return t;
  if (Object.values(IMAGE_TYPES).includes(t)) return t;
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "application/pdf";
  return IMAGE_TYPES[ext] ?? null;
}

/** Base64 a blocchi: evita lo stack overflow di String.fromCharCode(...bytes) sui file grandi. */
function toBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  let bin = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK) as unknown as number[]);
  }
  return btoa(bin);
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}
