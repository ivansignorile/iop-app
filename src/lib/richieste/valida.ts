export const MAX_FILES = 10;
export const MAX_FILE_BYTES = 15 * 1024 * 1024;
export const MAX_RICHIESTE_ORA = 5;
export const MAX_NOME = 100;
export const MAX_EMAIL = 254;
export const MAX_TELEFONO = 30;
export const MAX_COMUNE = 100;
export const MAX_DESCRIZIONE = 5000;
export const MAX_NOME_FILE = 200;
export const MAX_TITOLO = 150;
export const MIME_IMMAGINI = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
export const MIME_DOCUMENTI = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];
export const MIME_FOGLI = [
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
export const MIME_ARCHIVI = ["application/zip", "application/x-zip-compressed"];
export const MIME_AMMESSI = [...MIME_IMMAGINI, ...MIME_DOCUMENTI, ...MIME_FOGLI, ...MIME_ARCHIVI];
export const MIME_LOGO = ["image/png", "image/jpeg", "application/pdf"];
/** Un documento con uno di questi MIME rende la richiesta "foto + capitolato". */
const MIME_CAPITOLATO = [...MIME_DOCUMENTI, ...MIME_FOGLI, ...MIME_ARCHIVI];

export const RUOLI_FILE = ["documento", "logo", "altro"] as const;
export type RuoloFile = (typeof RUOLI_FILE)[number];
export const FORMATI_OUTPUT = ["pdf_protetto", "word", "carta_intestata"] as const;
export type FormatoOutput = (typeof FORMATI_OUTPUT)[number];

export type FileMeta = { nome: string; mime: string; size: number; ruolo: RuoloFile };
export type RichiestaTipo = "foto_descrizione" | "foto_capitolato";
export type RichiestaInput = {
  nome: string;
  email: string;
  telefono: string | null;
  tipo: RichiestaTipo;
  formato: FormatoOutput;
  titolo: string | null;
  descrizione: string | null;
  comune: string | null;
  files: FileMeta[];
  consensoPrivacy: true;
  honeypot: string;
};

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const opt = (v: unknown) => str(v) || null;

function fileValido(f: unknown): f is FileMeta {
  if (!f || typeof f !== "object") return false;
  const o = f as Record<string, unknown>;
  return (
    typeof o.nome === "string" &&
    o.nome.length > 0 &&
    o.nome.length <= MAX_NOME_FILE &&
    typeof o.mime === "string" &&
    typeof o.size === "number" &&
    Number.isFinite(o.size) &&
    o.size > 0 &&
    RUOLI_FILE.includes(o.ruolo as RuoloFile)
  );
}

export function validaRichiesta(
  raw: Record<string, unknown>,
): { ok: true; data: RichiestaInput } | { ok: false; errore: string } {
  if (str(raw.honeypot)) return { ok: false, errore: "Richiesta non valida." };

  const nome = str(raw.nome);
  const email = str(raw.email).toLowerCase();
  const descrizione = opt(raw.descrizione);
  const titolo = opt(raw.titolo);
  const formato = FORMATI_OUTPUT.find((f) => f === raw.formato) ?? null;
  const rawFiles: unknown[] = Array.isArray(raw.files) ? raw.files : [];

  if (nome.length < 2) return { ok: false, errore: "Inserisci il tuo nome." };
  if (nome.length > MAX_NOME) return { ok: false, errore: `Nome troppo lungo (max ${MAX_NOME} caratteri).` };
  if (email.length > MAX_EMAIL || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, errore: "Email non valida." };
  if (!formato) return { ok: false, errore: "Scegli il formato del preventivo." };
  if (titolo && titolo.length > MAX_TITOLO) {
    return { ok: false, errore: `Titolo troppo lungo (max ${MAX_TITOLO} caratteri).` };
  }
  if (descrizione && descrizione.length > MAX_DESCRIZIONE) {
    return { ok: false, errore: `Descrizione troppo lunga (max ${MAX_DESCRIZIONE} caratteri).` };
  }
  if (rawFiles.length > MAX_FILES) return { ok: false, errore: `Massimo ${MAX_FILES} file.` };

  const files: FileMeta[] = [];
  for (const f of rawFiles) {
    if (!fileValido(f)) return { ok: false, errore: "File non valido." };
    if (!MIME_AMMESSI.includes(f.mime)) return { ok: false, errore: `Formato non ammesso: ${f.nome}` };
    if (f.ruolo === "logo" && !MIME_LOGO.includes(f.mime)) return { ok: false, errore: "Logo: formato ammesso PNG, JPG o PDF." };
    if (f.size > MAX_FILE_BYTES) return { ok: false, errore: `File troppo grande (max 15 MB): ${f.nome}` };
    files.push({ nome: f.nome, mime: f.mime, size: f.size, ruolo: f.ruolo });
  }

  const telefono = opt(raw.telefono);
  const comune = opt(raw.comune);
  if (telefono && telefono.length > MAX_TELEFONO) {
    return { ok: false, errore: `Telefono troppo lungo (max ${MAX_TELEFONO} caratteri).` };
  }
  if (comune && comune.length > MAX_COMUNE) {
    return { ok: false, errore: `Comune troppo lungo (max ${MAX_COMUNE} caratteri).` };
  }

  if (files.length === 0) return { ok: false, errore: "Carica almeno un file." };
  if (formato === "carta_intestata" && !files.some((f) => f.ruolo === "logo")) {
    return { ok: false, errore: "Carica la carta intestata o il logo." };
  }
  if (raw.privacy !== true && raw.privacy !== "on") return { ok: false, errore: "Devi accettare l'informativa privacy." };

  const tipo: RichiestaTipo = files.some((f) => f.ruolo === "documento" && MIME_CAPITOLATO.includes(f.mime))
    ? "foto_capitolato"
    : "foto_descrizione";

  return {
    ok: true,
    data: { nome, email, telefono, tipo, formato, titolo, descrizione, comune, files, consensoPrivacy: true, honeypot: "" },
  };
}
