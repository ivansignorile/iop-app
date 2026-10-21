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

import { FONTI_CAMPANIA } from "./fonti/campania";

export const FONTI: Fonte[] = [...FONTI_CAMPANIA];
