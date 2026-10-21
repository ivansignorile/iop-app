import type { Fonte } from "../fonti";

/**
 * Elenco prezzi 2026 (DGR 643 del 05/06/2026) in 3 XLSX: 3 fonti con la stessa regione/ambito/anno che l'importer
 * fa confluire nello stesso prezzario (upsert su regione/ambito/anno, voci su prezzario_id/codice; i codici dei
 * 3 file non si sovrappongono). L'Errata Corrige (https://www.regione.vda.it/allegato.aspx?pk=133710) è applicata
 * dal formato `vda-xlsx` (tabella CORREZIONI). Opere edili per ultime, così `fonte_url` punta al file principale.
 */
const fonte = (file: string, pk: number): Fonte => ({
  regione: "valle-d-aosta",
  ambito: "",
  anno: 2026,
  titolo: "Prezzario Regione Valle d'Aosta 2026",
  formato: "vda-xlsx",
  file: `valle-d-aosta/${file}`,
  url: `https://www.regione.vda.it/allegato.aspx?pk=${pk}`,
  licenza: null,
  attivo: true,
});

export const FONTI_VALLE_D_AOSTA: Fonte[] = [
  fonte("04_Impianti_Meccanici_2026.xlsx", 126856),
  fonte("06_Impianti_Elettrici_2026.xlsx", 126858),
  fonte("02_Opere_Edili_Elementari_Compiute_2026.xlsx", 126854),
];
