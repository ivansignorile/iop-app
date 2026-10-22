import type { Fonte } from "../fonti";

export const FONTI_CALABRIA: Fonte[] = [
  {
    regione: "calabria",
    ambito: "",
    anno: 2025,
    // edizione 2025 prorogata (la 2026 non è uscita); l'API price-list risponde solo con un path, quindi XML
    titolo: "Prezzario Regione Calabria 2025",
    formato: "easy-xml",
    file: "calabria/2025_XML.zip#\\.xml$",
    url: "https://gestione-prezzario.calabriallpp.it/data/2025_(XML).zip",
    licenza: "CC BY 3.0",
    attivo: true,
  },
];
