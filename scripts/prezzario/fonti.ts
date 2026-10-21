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

import { FONTI_ABRUZZO } from "./fonti/abruzzo";
import { FONTI_CAMPANIA } from "./fonti/campania";
import { FONTI_EMILIA_ROMAGNA } from "./fonti/emilia-romagna";
import { FONTI_FRIULI_VENEZIA_GIULIA } from "./fonti/friuli-venezia-giulia";
import { FONTI_TRENTO } from "./fonti/trento";
import { FONTI_MOLISE } from "./fonti/molise";
import { FONTI_VENETO } from "./fonti/veneto";
import { FONTI_BASILICATA } from "./fonti/basilicata";
import { FONTI_LIGURIA } from "./fonti/liguria";
import { FONTI_LOMBARDIA } from "./fonti/lombardia";

export const FONTI: Fonte[] = [
  ...FONTI_CAMPANIA,
  ...FONTI_ABRUZZO,
  ...FONTI_MOLISE,
  ...FONTI_EMILIA_ROMAGNA,
  ...FONTI_FRIULI_VENEZIA_GIULIA,
  ...FONTI_TRENTO,
  ...FONTI_VENETO,
  ...FONTI_BASILICATA,
  ...FONTI_LIGURIA,
  ...FONTI_LOMBARDIA,
];
