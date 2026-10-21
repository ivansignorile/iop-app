import type { Fonte } from "../fonti";

/** Un listino per provincia (stessi codici, prezzi diversi). Fonte: dataset CKAN dati.toscana.it/dataset/prezzario-lavori-2026. */
const LISTINI: [ambito: string, file: string, url: string][] = [
  ["AR", "2026-arezzo-csv.zip", "https://dati.toscana.it/dataset/7d0fd279-fbae-44a8-8f71-6986514acf0c/resource/949940df-50d1-4ca1-847a-62dcda879fb5/download/2026-arezzo-csv.zip"],
  ["FI", "2026-firenze-csv.zip", "https://dati.toscana.it/dataset/7d0fd279-fbae-44a8-8f71-6986514acf0c/resource/925a8190-ea9d-407e-a05d-9a19c2850e3d/download/2026-firenze-csv.zip"],
  ["GR", "2026-grosseto-csv.zip", "https://dati.toscana.it/dataset/7d0fd279-fbae-44a8-8f71-6986514acf0c/resource/003cb46c-e604-4dbe-8d5b-74178451a0b2/download/2026-grosseto-csv.zip"],
  ["LI", "2026-livorno-csv.zip", "https://dati.toscana.it/dataset/7d0fd279-fbae-44a8-8f71-6986514acf0c/resource/83da1701-2db9-4ad4-adbb-1ba855ce86dd/download/2026-livorno-csv.zip"],
  ["LU", "2026-lucca-csv.zip", "https://dati.toscana.it/dataset/7d0fd279-fbae-44a8-8f71-6986514acf0c/resource/01b18386-e108-417e-b5b9-a5b49bc52f42/download/2026-lucca-csv.zip"],
  ["MS", "2026-massa-carrara-csv.zip", "https://dati.toscana.it/dataset/7d0fd279-fbae-44a8-8f71-6986514acf0c/resource/1a390d71-5939-4b94-850f-5f9ceab1e9f7/download/2026-massa-carrara-csv.zip"],
  ["PI", "2026-pisa-csv.zip", "https://dati.toscana.it/dataset/7d0fd279-fbae-44a8-8f71-6986514acf0c/resource/c98af0a1-5c60-48d2-9d01-78dff59a5c8d/download/2026-pisa-csv.zip"],
  ["PO", "2026-prato-csv.zip", "https://dati.toscana.it/dataset/7d0fd279-fbae-44a8-8f71-6986514acf0c/resource/d81a92f8-e806-4b41-9803-91e7e9e65815/download/2026-prato-csv.zip"],
  ["PT", "2026-pistoia-csv.zip", "https://dati.toscana.it/dataset/7d0fd279-fbae-44a8-8f71-6986514acf0c/resource/937cfa06-a751-428d-9101-05e5e5231db2/download/2026-pistoia-csv.zip"],
  ["SI", "2026-siena-csv.zip", "https://dati.toscana.it/dataset/7d0fd279-fbae-44a8-8f71-6986514acf0c/resource/6893b585-48f7-44ca-a404-3d9fe7005d15/download/2026-siena-csv.zip"],
];

export const FONTI_TOSCANA: Fonte[] = LISTINI.map(([ambito, file, url]) => ({
  regione: "toscana",
  ambito,
  anno: 2026,
  titolo: "Prezzario Regione Toscana 2026",
  formato: "toscana-csv",
  file: `toscana/${file}#-Articolo-2026\\.csv$`,
  url,
  licenza: "CC BY 3.0",
  attivo: true,
}));
