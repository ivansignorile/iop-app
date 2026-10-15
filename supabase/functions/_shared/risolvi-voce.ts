// supabase/functions/_shared/risolvi-voce.ts
export type FontePrezzi = "prezzario" | "propri" | "entrambi";
export type FonteScelta = "prezzario" | "propria" | "manuale";
export type VoceCandidata = { descrizione: string; prezzo: number } | null;

export function risolviVoce(fonte: FontePrezzi, prezzario: VoceCandidata, propria: VoceCandidata) {
  const da = (scelta: "prezzario" | "propria", v: NonNullable<VoceCandidata>, avviso: string | null = null) => ({
    scelta, descrizione: v.descrizione, prezzo: v.prezzo, avviso,
  });
  if (fonte !== "prezzario" && propria) return da("propria", propria);
  if (prezzario) {
    return da("prezzario", prezzario, fonte === "propri" ? "Nessuna voce nella tua libreria: usata la voce del prezzario." : null);
  }
  return { scelta: null, descrizione: null, prezzo: null, avviso: null };
}

export function applicaScelta(
  scelta: "prezzario" | "propria",
  row: { descrizione_prezzario: string | null; prezzo_prezzario: number | null; descrizione_propria: string | null; prezzo_proprio: number | null },
) {
  const descrizione = scelta === "prezzario" ? row.descrizione_prezzario : row.descrizione_propria;
  const prezzo = scelta === "prezzario" ? row.prezzo_prezzario : row.prezzo_proprio;
  if (descrizione == null || prezzo == null) return null;
  return { descrizione, prezzo_unitario: Number(prezzo), fonte_scelta: scelta as FonteScelta };
}
