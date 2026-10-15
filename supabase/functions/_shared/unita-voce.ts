// supabase/functions/_shared/unita-voce.ts
// Logica pura: unità della riga e avviso quando si aggiunge una voce scelta a mano (prezzario e/o libreria).
// Nessun import a runtime: il file è usato sia dalle edge function (Deno) sia da Next.

export type UnitaVoce = "corpo" | "mq" | "ml" | "mc" | "giorno" | "cad" | "kg";

const TESTI_A_CORPO = new Set(["a corpo", "corpo", "a.c.", "ac"]);

/** Vero se il testo unità del prezzario indica davvero "a corpo" (non h, ha, %, t… mappati su 'corpo'). */
export function eACorpo(unitaTesto: string) {
  return TESTI_A_CORPO.has(unitaTesto.trim().toLowerCase());
}

export const AVVISO_UNITA_DIVERSA = "Unità diversa tra prezzario e tua voce: verifica il prezzo.";

export function avvisoUnitaTestoPrezzario(unitaTesto: string) {
  return `Unità del prezzario: ${unitaTesto.trim()}. Verifica quantità e prezzo.`;
}

/**
 * Unità della nuova riga e avviso di unità.
 * - Solo prezzario: la sua unità; se è 'corpo' ma il testo non è "a corpo" resta 'corpo' con avviso.
 * - Entrambe: vince l'unità della voce propria; avviso se l'unità reale del prezzario è diversa.
 * - Solo propria: la sua unità. Nessuna: 'corpo'.
 */
export function unitaDaVoci(
  prezzario: { unita: UnitaVoce; unita_testo: string } | null,
  propria: { unita: UnitaVoce } | null,
): { unita: UnitaVoce; avviso: string | null } {
  const prezzarioCorpoAnomalo = !!prezzario && prezzario.unita === "corpo" && !eACorpo(prezzario.unita_testo);
  if (propria) {
    const diversa = !!prezzario && (prezzario.unita !== propria.unita || prezzarioCorpoAnomalo);
    return { unita: propria.unita, avviso: diversa ? AVVISO_UNITA_DIVERSA : null };
  }
  if (prezzario) {
    return {
      unita: prezzario.unita,
      avviso: prezzarioCorpoAnomalo ? avvisoUnitaTestoPrezzario(prezzario.unita_testo) : null,
    };
  }
  return { unita: "corpo", avviso: null };
}
