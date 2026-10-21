import type { Formato } from "./formati";

export type Fonte = {
  regione: string;
  /** Sigla provincia per i listini provinciali (Toscana), '' per l'intera regione. */
  ambito: string;
  anno: number;
  titolo: string;
  formato: Formato;
  /** Path relativo a scripts/prezzario/data; `archivio.zip#regex` sceglie il file dentro lo zip. */
  file: string;
  url: string;
  /** Richiesta POST della piattaforma gestione-prezzario (campi del form). */
  form?: Record<string, string>;
  licenza: string | null;
  attivo: boolean;
};

export const FONTI: Fonte[] = [
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
