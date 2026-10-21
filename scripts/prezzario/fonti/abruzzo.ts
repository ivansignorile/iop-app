import type { Fonte } from "../fonti";

/**
 * Prezzario pubblicato solo in PDF sul BURA del 03/08/2026 (DGR 434 del 22/07/2026), due allegati.
 * `file` è il TESTO estratto e concatenato (l'importer non scarica né converte i PDF):
 *
 *   B=https://bura.regione.abruzzo.it/sites/bura.regione.abruzzo.it/files/bollettini/2026-08-03
 *   curl -O $B/all-prezzario-opere-edili-regione-abruzzo-2026.pdf
 *   curl -O $B/all-prezzario-regione-abruzzo-impianti-tecnologici-2026.pdf
 *   pdftotext -layout -enc UTF-8 all-prezzario-opere-edili-regione-abruzzo-2026.pdf edili.txt
 *   pdftotext -layout -enc UTF-8 all-prezzario-regione-abruzzo-impianti-tecnologici-2026.pdf impianti.txt
 *   { cat edili.txt; printf '\f'; cat impianti.txt; } > scripts/prezzario/data/abruzzo/2026.txt
 *
 * (pdftotext di poppler 26.08)
 */
export const FONTI_ABRUZZO: Fonte[] = [
  {
    regione: "abruzzo",
    ambito: "",
    anno: 2026,
    titolo: "Prezzario Regione Abruzzo 2026",
    formato: "pdf-testo",
    file: "abruzzo/2026.txt",
    url: "https://bura.regione.abruzzo.it/sites/bura.regione.abruzzo.it/files/bollettini/2026-08-03/all-prezzario-opere-edili-regione-abruzzo-2026.pdf",
    licenza: null,
    attivo: true,
  },
];
