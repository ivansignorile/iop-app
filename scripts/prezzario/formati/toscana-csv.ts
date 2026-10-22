import { finalizza, numeroIt, pulisci, senzaPrefisso, unisci, type VoceGrezza, type VoceNormalizzata } from "../core";
import { decodifica, leggiCsv } from "./lazio-csv";

// Colonne per indice: due colonne si chiamano entrambe "Manodopera".
const COL = { codice: 0, livello1: 2, livello2: 3, livello3: 4, livello4: 5, unita: 6, prezzo: 8 } as const;

/** Livello 1 senza le specifiche: "Ambito: EDILIZIA CIVILE Categoria: NUOVE COSTRUZIONI CAM: no…" → fino a "CAM:"/"Compreso:"… */
function capitolo(livello1: string): string | null {
  const t = pulisci(livello1).split(/\s+(?:CAM|Compreso|Escluso|Specifiche|Esecuzione|Conforme):/)[0];
  return t || null;
}

/** CSV "Articolo" di un listino provinciale Toscana (separatore `|`, con header, descrizione su 4 livelli). */
export function parse(buf: Buffer): VoceNormalizzata[] {
  if (!buf.length) throw new Error("toscana-csv: file vuoto");
  const [header, ...righe] = leggiCsv(decodifica(buf), "|");
  const h = (header ?? []).map((c) => pulisci(c).toLowerCase());
  if (h[COL.codice] !== "codice" || h[COL.unita] !== "unità di misura" || h[COL.prezzo] !== "prezzo" || h[COL.livello4] !== "articolo") {
    throw new Error("toscana-csv: header Codice|…|Articolo|Unità di misura|…|Prezzo non trovato");
  }
  const grezze: VoceGrezza[] = righe.map((r) => ({
    codice: senzaPrefisso(r[COL.codice] ?? ""),
    capitolo: capitolo(r[COL.livello1] ?? ""),
    descrizione: unisci(r[COL.livello2], r[COL.livello3], r[COL.livello4]),
    unita_testo: r[COL.unita],
    prezzo: numeroIt(r[COL.prezzo]),
  }));
  const voci = finalizza(grezze);
  if (!voci.length) throw new Error("toscana-csv: nessuna voce con codice e prezzo");
  return voci;
}
