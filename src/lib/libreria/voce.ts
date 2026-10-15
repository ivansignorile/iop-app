export const UNITA = ["corpo", "mq", "ml", "mc", "giorno", "cad", "kg"] as const;
export type Unita = (typeof UNITA)[number];

export const MAX_TITOLO = 300;
export const MAX_DESCRIZIONE = 10000;
export const MAX_CATEGORIA = 100;
export const MAX_PREZZO = 10_000_000;

/** Tipi accettati per l'import dei vecchi preventivi (gli stessi che il modello legge). */
export const MIME_PREVENTIVI = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"];
export const MAX_PREVENTIVO_BYTES = 20 * 1024 * 1024;

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
    .replace(/^[._]+/, "")
    .slice(-120);
  return pulito || "file";
}
