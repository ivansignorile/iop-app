export const MAX_FILES = 10;
export const MAX_FILE_BYTES = 15 * 1024 * 1024;
export const MAX_RICHIESTE_ORA = 5;
export const MIME_IMMAGINI = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
export const MIME_DOCUMENTI = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];
export const MIME_AMMESSI = [...MIME_IMMAGINI, ...MIME_DOCUMENTI];

export type FileMeta = { nome: string; mime: string; size: number };
export type RichiestaTipo = "foto_descrizione" | "foto_capitolato";
export type RichiestaInput = {
  nome: string;
  email: string;
  telefono: string | null;
  tipo: RichiestaTipo;
  descrizione: string;
  comune: string | null;
  files: FileMeta[];
  honeypot: string;
};

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const opt = (v: unknown) => str(v) || null;

export function validaRichiesta(
  raw: Record<string, unknown>,
): { ok: true; data: RichiestaInput } | { ok: false; errore: string } {
  if (str(raw.honeypot)) return { ok: false, errore: "Richiesta non valida." };

  const nome = str(raw.nome);
  const email = str(raw.email).toLowerCase();
  const descrizione = str(raw.descrizione);
  const tipo = raw.tipo === "foto_capitolato" ? "foto_capitolato" : raw.tipo === "foto_descrizione" ? "foto_descrizione" : null;
  const files = Array.isArray(raw.files) ? (raw.files as FileMeta[]) : [];

  if (nome.length < 2) return { ok: false, errore: "Inserisci il tuo nome." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, errore: "Email non valida." };
  if (!tipo) return { ok: false, errore: "Scegli il tipo di richiesta." };
  if (descrizione.length < 10) return { ok: false, errore: "Descrivi il lavoro (almeno 10 caratteri)." };
  if (files.length > MAX_FILES) return { ok: false, errore: `Massimo ${MAX_FILES} file.` };
  for (const f of files) {
    if (!MIME_AMMESSI.includes(f.mime)) return { ok: false, errore: `Formato non ammesso: ${f.nome}` };
    if (f.size > MAX_FILE_BYTES) return { ok: false, errore: `File troppo grande (max 15 MB): ${f.nome}` };
  }
  if (!files.some((f) => MIME_IMMAGINI.includes(f.mime))) return { ok: false, errore: "Carica almeno una foto." };
  if (tipo === "foto_capitolato" && !files.some((f) => MIME_DOCUMENTI.includes(f.mime))) {
    return { ok: false, errore: "Carica anche il capitolato (PDF, Word o testo)." };
  }

  return {
    ok: true,
    data: { nome, email, telefono: opt(raw.telefono), tipo, descrizione, comune: opt(raw.comune), files, honeypot: "" },
  };
}
