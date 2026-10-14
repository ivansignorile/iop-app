export const MAX_FILES = 10;
export const MAX_FILE_BYTES = 15 * 1024 * 1024;
export const MAX_RICHIESTE_ORA = 5;
export const MAX_NOME = 100;
export const MAX_EMAIL = 254;
export const MAX_TELEFONO = 30;
export const MAX_COMUNE = 100;
export const MAX_DESCRIZIONE = 5000;
export const MAX_NOME_FILE = 200;
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
    o.size > 0
  );
}

export function validaRichiesta(
  raw: Record<string, unknown>,
): { ok: true; data: RichiestaInput } | { ok: false; errore: string } {
  if (str(raw.honeypot)) return { ok: false, errore: "Richiesta non valida." };

  const nome = str(raw.nome);
  const email = str(raw.email).toLowerCase();
  const descrizione = str(raw.descrizione);
  const tipo = raw.tipo === "foto_capitolato" ? "foto_capitolato" : raw.tipo === "foto_descrizione" ? "foto_descrizione" : null;
  const rawFiles: unknown[] = Array.isArray(raw.files) ? raw.files : [];

  if (nome.length < 2) return { ok: false, errore: "Inserisci il tuo nome." };
  if (nome.length > MAX_NOME) return { ok: false, errore: `Nome troppo lungo (max ${MAX_NOME} caratteri).` };
  if (email.length > MAX_EMAIL || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, errore: "Email non valida." };
  if (!tipo) return { ok: false, errore: "Scegli il tipo di richiesta." };
  if (descrizione.length < 10) return { ok: false, errore: "Descrivi il lavoro (almeno 10 caratteri)." };
  if (descrizione.length > MAX_DESCRIZIONE) {
    return { ok: false, errore: `Descrizione troppo lunga (max ${MAX_DESCRIZIONE} caratteri).` };
  }
  if (rawFiles.length > MAX_FILES) return { ok: false, errore: `Massimo ${MAX_FILES} file.` };

  const files: FileMeta[] = [];
  for (const f of rawFiles) {
    if (!fileValido(f)) return { ok: false, errore: "File non valido." };
    if (!MIME_AMMESSI.includes(f.mime)) return { ok: false, errore: `Formato non ammesso: ${f.nome}` };
    if (f.size > MAX_FILE_BYTES) return { ok: false, errore: `File troppo grande (max 15 MB): ${f.nome}` };
    files.push({ nome: f.nome, mime: f.mime, size: f.size });
  }

  const telefono = opt(raw.telefono);
  const comune = opt(raw.comune);
  if (telefono && telefono.length > MAX_TELEFONO) {
    return { ok: false, errore: `Telefono troppo lungo (max ${MAX_TELEFONO} caratteri).` };
  }
  if (comune && comune.length > MAX_COMUNE) {
    return { ok: false, errore: `Comune troppo lungo (max ${MAX_COMUNE} caratteri).` };
  }

  if (!files.some((f) => MIME_IMMAGINI.includes(f.mime))) return { ok: false, errore: "Carica almeno una foto." };
  if (tipo === "foto_capitolato" && !files.some((f) => MIME_DOCUMENTI.includes(f.mime))) {
    return { ok: false, errore: "Carica anche il capitolato (PDF, Word o testo)." };
  }

  return {
    ok: true,
    data: { nome, email, telefono, tipo, descrizione, comune, files, honeypot: "" },
  };
}
