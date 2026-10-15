import { MAX_FILE_BYTES, MIME_AMMESSI, type FileMeta } from "./valida";

export const CARTELLA_RE = /^\d{4}-\d{2}-\d{2}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const CARICAMENTO_KO = "Caricamento non valido, riprova.";

export type OggettoStorage = { name: string; size: number | null; mimetype: string | null };

const KO = { ok: false as const, errore: CARICAMENTO_KO };
const normalizzaMime = (m: string) => m.split(";")[0].trim().toLowerCase();

/** Confronta quanto dichiarato dal client con gli oggetti realmente presenti nello storage. */
export function verificaFileCaricati(
  cartella: string,
  paths: string[],
  dichiarati: FileMeta[],
  stored: OggettoStorage[],
): { ok: true; files: (FileMeta & { path: string })[] } | { ok: false; errore: string } {
  if (typeof cartella !== "string" || !CARTELLA_RE.test(cartella)) return KO;
  if (!Array.isArray(paths) || paths.length !== dichiarati.length || new Set(paths).size !== paths.length) return KO;

  const byName = new Map(stored.map((o) => [o.name, o]));
  const files: (FileMeta & { path: string })[] = [];
  for (const [i, path] of paths.entries()) {
    if (typeof path !== "string" || !path.startsWith(`${cartella}/`)) return KO;
    const nome = path.slice(cartella.length + 1);
    if (!nome || nome.includes("/")) return KO;
    const obj = byName.get(nome);
    if (!obj || typeof obj.size !== "number" || !Number.isFinite(obj.size) || obj.size <= 0 || obj.size > MAX_FILE_BYTES) return KO;
    if (typeof obj.mimetype !== "string") return KO;
    const mime = normalizzaMime(obj.mimetype);
    if (!MIME_AMMESSI.includes(mime)) return KO;
    files.push({ nome: dichiarati[i].nome, mime, size: obj.size, path });
  }
  return { ok: true, files };
}
