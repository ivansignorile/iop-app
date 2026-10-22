import type { Fonte } from "../fonti";

export const FONTI_LOMBARDIA: Fonte[] = [
  {
    regione: "lombardia",
    ambito: "",
    anno: 2026,
    titolo: "Prezzario Regione Lombardia 2026",
    formato: "lombardia-xml",
    // parti 1-3 con allegati; la Parte 4 "precedente struttura" ha un altro schema e non viene importata
    file: "lombardia/Prezzario_2026_LOM261_XML.zip#Parte 3\\.xml$",
    url: "https://www.regione.lombardia.it/content/dam/rl/canali-tematici-servizi/09-infrastrutture-trasporti-e-mobilit%C3%A0/01-acquisti-e-contratti-pubblici/02-prezzario-regionale-dei-lavori-pubblici/02-prezzario-regionale-dei-lavori-pubblici-infr/allegati/allegato-2026-unico/allegati-27-05/Prezzario_2026_LOM261_XML.zip",
    licenza: "Uso commerciale vietato senza autorizzazione scritta della Regione: in attesa",
    attivo: false,
  },
];
