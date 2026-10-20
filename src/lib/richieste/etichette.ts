import type { FormatoOutput, RuoloFile } from "./valida";

export const FORMATO_LABEL: Record<FormatoOutput, string> = {
  pdf_protetto: "PDF protetto",
  word: "Word",
  carta_intestata: "Carta intestata",
};

export const RUOLO_LABEL: Record<RuoloFile, string> = {
  documento: "Documentazione tecnica",
  logo: "Carta intestata / logo",
  altro: "Altri allegati",
};

/** Raggruppa i file per ruolo. Le richieste precedenti al 20/10 non hanno `ruolo`: finiscono in "altro". */
export function raggruppaFile<T extends { ruolo?: unknown }>(files: T[]): Record<RuoloFile, T[]> {
  const out: Record<RuoloFile, T[]> = { documento: [], logo: [], altro: [] };
  for (const f of files) {
    const ruolo = f.ruolo === "documento" || f.ruolo === "logo" ? f.ruolo : "altro";
    out[ruolo].push(f);
  }
  return out;
}
