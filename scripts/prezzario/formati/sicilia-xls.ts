import type { VoceNormalizzata } from "../core";
import { daCp1252, leggiWorkbook, parseConMappa, type MappaColonne } from "./xlsx-tabella";

/**
 * Prezzario Regione Siciliana (XLS 97-2003): un foglio con `Codice | Descrizione | Un.Mis. |
 * 1° Prezzo Unit. | Prez.Applic. | …`. Gerarchia dal codice (`01` capitolo, `1.1` categoria,
 * `1.1.1` voce madre, `1.1.1.1` sottovoce con prezzo): descrizione = madre + sottovoce.
 * Il prefisso `SIC24_` (anche `SIC_24_`) si toglie; `RU24_`, `AT24_`, `PR24_` (manodopera, noli,
 * materiali dell'appendice) restano perché distinguono i prezzi elementari.
 * Alcune celle hanno caratteri cp1252 letti come controlli C1 (’ → \x92): si correggono.
 */
export const MAPPA_SICILIA: MappaColonne = {
  nome: "sicilia",
  fogli: /^Prezzario/i,
  colonne: { codice: "codice", descrizione: ["descrizione"], unita: "unmis", prezzo: "prezapplic" },
  gerarchia: "codice",
  livelloMinimoPadre: 3,
  prefisso: /^SIC_?\d{2}_/,
  correggiTesto: daCp1252,
};

export function parse(buf: Buffer): VoceNormalizzata[] {
  return parseConMappa(leggiWorkbook(buf, "sicilia-xls"), MAPPA_SICILIA, "sicilia-xls");
}
