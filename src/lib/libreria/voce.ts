export const UNITA = ["corpo", "mq", "ml", "mc", "giorno", "cad", "kg"] as const;
export type Unita = (typeof UNITA)[number];

export const MAX_TITOLO = 300;
export const MAX_DESCRIZIONE = 10000;
export const MAX_CATEGORIA = 100;
export const MAX_PREZZO = 10_000_000;

/** Tipi accettati per l'import dei vecchi preventivi. Limiti duplicati in
 * supabase/functions/importa-preventivi/index.ts: tenerli allineati. */
export const MIME_PREVENTIVI = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
export const MAX_PREVENTIVO_BYTES = 20 * 1024 * 1024;
/** Le immagini passano al modello così come sono: limite dell'API a 5 MB. */
export const MAX_IMMAGINE_BYTES = 5 * 1024 * 1024;

/** Motivo per cui un file non può essere importato, o null se va bene. */
export function controllaPreventivo(mime: string, size: number): string | null {
  if (!MIME_PREVENTIVI.includes(mime)) return "Formato non supportato (PDF, JPG, PNG, WEBP)";
  if (size === 0) return "File vuoto";
  if (size > MAX_PREVENTIVO_BYTES) return "File oltre i 20 MB";
  if (mime !== "application/pdf" && size > MAX_IMMAGINE_BYTES) return "Immagine oltre i 5 MB";
  return null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

export type VoceInput = {
  titolo: string;
  descrizione: string;
  unita: Unita;
  prezzo: number;
  categoria: string | null;
};

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export function validaVoce(
  raw: Record<string, unknown>,
): { ok: true; value: VoceInput } | { ok: false; errore: string } {
  const titolo = str(raw.titolo);
  const descrizione = str(raw.descrizione);
  const unita = str(raw.unita);
  const prezzoStr = str(raw.prezzo).replace(",", ".");
  const categoria = str(raw.categoria) || null;

  if (!titolo) return { ok: false, errore: "Il titolo è obbligatorio." };
  if (titolo.length > MAX_TITOLO) return { ok: false, errore: "Titolo troppo lungo." };
  if (!descrizione) return { ok: false, errore: "La descrizione è obbligatoria." };
  if (descrizione.length > MAX_DESCRIZIONE) return { ok: false, errore: "Descrizione troppo lunga." };
  if (!(UNITA as readonly string[]).includes(unita)) return { ok: false, errore: "Unità non valida." };
  if (categoria && categoria.length > MAX_CATEGORIA) return { ok: false, errore: "Categoria troppo lunga." };
  const prezzo = prezzoStr === "" ? NaN : Number(prezzoStr);
  if (!Number.isFinite(prezzo) || prezzo <= 0 || prezzo > MAX_PREZZO) {
    return { ok: false, errore: "Inserisci un prezzo maggiore di zero." };
  }
  return {
    ok: true,
    value: { titolo, descrizione, unita: unita as Unita, prezzo: Math.round(prezzo * 100) / 100, categoria },
  };
}

/** Nome file sicuro per la chiave di Storage: niente slash né caratteri strani. */
export function nomeFileStorage(nome: string): string {
  const pulito = nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/\.{2,}/g, ".")
    .slice(-120)
    .replace(/^[._]+/, "");
  return pulito || "file";
}

/** Dopo questo tempo un documento ancora 'in_elaborazione' è considerato bloccato
 * (stesso valore di STALE_MS nella edge function importa-preventivi). */
export const ELABORAZIONE_STALE_MS = 10 * 60 * 1000;

export function elaborazioneBloccata(avviata: string | null, ora = Date.now()): boolean {
  if (!avviata) return true;
  const t = Date.parse(avviata);
  return !Number.isFinite(t) || ora - t > ELABORAZIONE_STALE_MS;
}

/** Dopo quanto un documento rimasto 'caricato' (avvio mai partito) si può riprovare. */
export const RIPROVA_CARICATO_MS = 60 * 1000;

/** Se il documento si può rielaborare a mano: in errore, caricato da più di un minuto
 * (l'avvio non è mai partito) o in elaborazione ma bloccato. Mai se elaborato. */
export function puoRiprovare(
  doc: { stato: string; created_at: string; elaborazione_at: string | null },
  ora = Date.now(),
): boolean {
  switch (doc.stato) {
    case "errore":
      return true;
    case "caricato": {
      const t = Date.parse(doc.created_at);
      return !Number.isFinite(t) || ora - t > RIPROVA_CARICATO_MS;
    }
    case "in_elaborazione":
      return elaborazioneBloccata(doc.elaborazione_at, ora);
    default:
      return false;
  }
}

/** Parole di ricerca sicure per i filtri PostgREST (.or/ilike): solo lettere e cifre,
 * massimo 6 parole da 40 caratteri. */
export function paroleRicerca(q: string): string[] {
  return q
    .normalize("NFC")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length > 1)
    .map((w) => w.slice(0, 40))
    .slice(0, 6);
}
