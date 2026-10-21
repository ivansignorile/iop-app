import type { Fonte } from "../fonti";

export const FONTI_PIEMONTE: Fonte[] = [
  {
    regione: "piemonte",
    ambito: "",
    anno: 2026,
    titolo: "Prezzario Regione Piemonte 2026",
    formato: "easy-xml",
    // file ?v=2 (09/10/2026): include l'errata corrige DD 1433 del 23/07/2026
    file: "piemonte/2026_1_XML.zip#\\.xml$",
    url: "https://gestione-prezzario.regione.piemonte.it/data/2026-1/2026_1_XML.zip?v=2",
    licenza: "CC BY 3.0",
    attivo: true,
  },
];
