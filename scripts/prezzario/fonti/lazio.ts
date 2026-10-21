import type { Fonte } from "../fonti";

/**
 * Tariffa dei prezzi 2023 (prorogata). Lo zip open data contiene 9 CSV, uno per parte (A opere edili … S sicurezza):
 * il formato `lazio-csv` legge lo zip intero e unisce le parti, con i codici prefissati dalla lettera (A1.01.1, E01001a…).
 */
export const FONTI_LAZIO: Fonte[] = [
  {
    regione: "lazio",
    ambito: "",
    anno: 2023,
    titolo: "Prezzario Regione Lazio 2023",
    formato: "lazio-csv",
    file: "lazio/Tariffa_2023_formato_open_DATA.zip",
    url: "https://regione.lazio.it/sites/default/files/2023-05/Tariffa_2023_formato_open_DATA%20%281%29.zip",
    licenza: null,
    attivo: true,
  },
];
