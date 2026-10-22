import type { Fonte } from "../fonti";

export const FONTI_CAMPANIA: Fonte[] = [
  {
    regione: "campania",
    ambito: "",
    anno: 2026,
    titolo: "Prezzario Regione Campania 2026",
    formato: "api-llpp",
    file: "campania/2026.json",
    url: "https://gestione-prezzario.regione.campania.it/api/apillppv2-price-list",
    form: { year: "2026", addendum: "0" },
    licenza: null,
    attivo: true,
  },
];
