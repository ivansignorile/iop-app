import type { Fonte } from "../fonti";

const BASE = "https://www.regione.umbria.it/documents/18/2335454/";

/**
 * Edizione 2025 (DGR 190 del 04/03/2026, in vigore dal 18/03/2026; refusi corretti con DD 8793 del 03/09/2026),
 * pubblicata in 3 file. Sono 3 fonti con la stessa regione/ambito/anno: l'importer fa l'upsert del prezzario su
 * (regione, ambito, anno), quindi tutte e 3 finiscono nello stesso prezzario, e le voci su (prezzario_id, codice),
 * che nei 3 file non si sovrappongono (1–13, 14–21, S1–S7). `fonte_url` del prezzario resta quello dell'ultima
 * fonte importata: per questo i capitoli 1–13 sono in fondo.
 */
const fonte = (file: string, url: string): Fonte => ({
  regione: "umbria",
  ambito: "",
  anno: 2025,
  titolo: "Prezzario Regione Umbria 2025",
  formato: "xlsx-tabella",
  file: `umbria/${file}`,
  url: BASE + url,
  licenza: null,
  attivo: true,
});

export const FONTI_UMBRIA: Fonte[] = [
  fonte(
    "erp-umbria-2025-cap14-21-corretto.xlsx",
    "Elenco+regionale+dei+prezzi+2025+-+Capitoli+da+14+a+21+-+Refusi+stampa.xlsx/fbfa8982-e216-4aba-aa6c-bd4694765851",
  ),
  fonte(
    "erp-umbria-2025-costi-sicurezza.xlsx",
    "Elenco+regionale+dei+prezzi+2025+-+Costi+della+sicurezza.xlsx/204e2971-9b19-4095-9849-67d0ec3319ce",
  ),
  fonte(
    "erp-umbria-2025-cap01-13-corretto.xlsx",
    "Elenco+regionale+dei+prezzi+2025+-+Capitoli+da+1+a+13+-+Refusi+stampa.xlsx/307f8e29-7387-43c2-87ba-cc60cb1073ce",
  ),
];
