import type { Fonte } from "../fonti";

export const FONTI_SARDEGNA: Fonte[] = [
  {
    regione: "sardegna",
    ambito: "",
    anno: 2026,
    titolo: "Prezzario Regione Sardegna 2026",
    formato: "api-llpp",
    file: "sardegna/2026.json",
    url: "https://prezzariogestione.regione.sardegna.it/api/apillppv2-price-list",
    form: { year: "2026", addendum: "0" },
    licenza: "CC BY 3.0",
    attivo: true,
  },
];
