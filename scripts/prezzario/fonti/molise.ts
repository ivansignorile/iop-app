import type { Fonte } from "../fonti";

/**
 * Prezzario Opere Pubbliche Molise 2026 (DGR 14 del 28/01/2026, BURM n. 4 del 31/01/2026), solo PDF:
 * Allegato B "Elenco prezzi delle lavorazioni" + integrazione refusi del 20/05/2026.
 * `file` è il TESTO estratto (l'importer non scarica né converte i PDF); l'errata va IN CODA, così
 * il parser (a parità di codice vince l'ultima occorrenza) la applica:
 *
 *   pdftotext -layout -enc UTF-8 allegato_b_elenco_prezzi_2026.pdf allegato_b.txt
 *   pdftotext -layout -enc UTF-8 integrazione_refusi_20_05_2026.pdf refusi.txt
 *   { cat allegato_b.txt; printf '\f'; cat refusi.txt; } > scripts/prezzario/data/molise/2026.txt
 *
 * (pdftotext di poppler 26.08). `url` = Allegato B dall'albo della Regione (cloud.urbi.it); l'URL
 * dell'errata del 20/05/2026 non è stato ritrovato.
 */
export const FONTI_MOLISE: Fonte[] = [
  {
    regione: "molise",
    ambito: "",
    anno: 2026,
    titolo: "Prezzario Regione Molise 2026",
    formato: "pdf-testo",
    file: "molise/2026.txt",
    url: "https://cloud.urbi.it/urbi/progs/urp/fecore02.sto?DOCORE_testata=51191827&DOCORE_versione=1&FNSTR=FNYNHFTP_B___EDTXWO_PFEUWT_MIXWA_LAPGZWTYHUB_RXKBDXOPA_OAK_TWYUJDGQA.OML.J7P&DB_NAME=l1200158&ContestoChk=DE",
    licenza: null,
    attivo: true,
  },
];
