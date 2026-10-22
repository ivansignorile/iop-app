/** Riga restituita da `prezzario_del_preventivo`. */
export type PrezzarioPreventivo = {
  id: string;
  titolo: string;
  regione: string;
  ambito: string;
  fallback: boolean;
};

const NOMI_REGIONE: Record<string, string> = {
  "valle-d-aosta": "Valle d'Aosta",
  "friuli-venezia-giulia": "Friuli Venezia Giulia",
  "emilia-romagna": "Emilia-Romagna",
  trento: "Trento",
  bolzano: "Bolzano",
};

export const NOMI_PROVINCIA: Record<string, string> = {
  AR: "Arezzo",
  FI: "Firenze",
  GR: "Grosseto",
  LI: "Livorno",
  LU: "Lucca",
  MS: "Massa-Carrara",
  PI: "Pisa",
  PO: "Prato",
  PT: "Pistoia",
  SI: "Siena",
};

export function nomeRegione(regione: string | null | undefined): string {
  const t = (regione ?? "").replace(/[-_]+/g, " ").trim();
  return NOMI_REGIONE[regione ?? ""] ?? t.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}

/** "Regione Campania", "Provincia autonoma di Trento". */
export function nomeEnte(regione: string | null | undefined): string {
  const nome = nomeRegione(regione);
  if (!nome) return "";
  return regione === "trento" || regione === "bolzano" ? `Provincia autonoma di ${nome}` : `Regione ${nome}`;
}

export type EtichettaPrezzario = { titolo: string; avviso: string | null };

export function etichettaPrezzario(
  p: PrezzarioPreventivo | null,
  regioneOrg: string,
): EtichettaPrezzario {
  if (!p) return { titolo: `Prezzario ${nomeRegione(regioneOrg)}`.trim(), avviso: null };
  const provincia = p.ambito ? NOMI_PROVINCIA[p.ambito] ?? p.ambito : "";
  return {
    titolo: provincia ? `${p.titolo} — ${provincia}` : p.titolo,
    avviso: p.fallback ? `Comune non riconosciuto: uso il prezzario di ${nomeRegione(p.regione)}.` : null,
  };
}

export type RifPrezzario = { regione: string; ambito: string };

/** Prezzario da citare per una riga: quello della voce scelta, poi del preventivo, poi dell'org. */
export function prezzarioRiga(
  voceId: string | null | undefined,
  perVoce: Record<string, RifPrezzario>,
  preventivo: RifPrezzario | null,
  regioneOrg: string,
): RifPrezzario {
  return (voceId ? perVoce[voceId] : undefined) ?? preventivo ?? { regione: regioneOrg, ambito: "" };
}
