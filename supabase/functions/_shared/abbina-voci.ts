// supabase/functions/_shared/abbina-voci.ts
// Logica pura dell'abbinamento voci (validazione output modello, compatibilità unità, patch riga).
import { type FontePrezzi, risolviVoce } from "./risolvi-voce.ts";
import { eACorpo, type UnitaVoce } from "./unita-voce.ts";

export const MAX_INTERVENTI = 100;

/** Unità di misura: un solo tipo, dichiarato in unita-voce.ts. */
export type Unita = UnitaVoce;

export type CandPrezzario = {
  id: string;
  codice: string;
  descrizione: string;
  unita: Unita;
  unita_testo: string;
  prezzo: number;
};

export type CandPropria = {
  id: string;
  titolo: string;
  descrizione: string;
  unita: Unita;
  prezzo: number;
};

export type InterventoDaAbbinare = {
  id: string;
  unita: Unita;
  prezzario: CandPrezzario[];
  proprie: CandPropria[];
};

export type Abbinamento = {
  intervento_id: string;
  prezzario_voce_id: string | null;
  voce_propria_id: string | null;
};

const UNITA_LABEL: Record<Unita, string> = {
  corpo: "corpo",
  mq: "m²",
  ml: "m",
  mc: "m³",
  giorno: "giorno",
  cad: "cad",
  kg: "kg",
};

/** Unità reale di una voce prezzario: le voci mappate su 'corpo' con testo diverso (h, %, t…) sono un'altra unità. */
export function unitaPrezzarioCompatibile(unitaIntervento: Unita, cand: Pick<CandPrezzario, "unita" | "unita_testo">) {
  if (cand.unita !== unitaIntervento) return false;
  if (cand.unita === "corpo" && !eACorpo(cand.unita_testo)) return false;
  return true;
}

export function avvisoUnitaPrezzario(cand: Pick<CandPrezzario, "unita_testo">, unitaIntervento: Unita) {
  return `Unità diversa nel prezzario (${cand.unita_testo} vs ${UNITA_LABEL[unitaIntervento]}): verifica il prezzo.`;
}

export function avvisoUnitaPropria(cand: Pick<CandPropria, "unita">, unitaIntervento: Unita) {
  return `Unità diversa nella libreria (${UNITA_LABEL[cand.unita]} vs ${UNITA_LABEL[unitaIntervento]}): verifica il prezzo.`;
}

export const AVVISO_NESSUNA = "Nessuna voce equivalente trovata: prezzo stimato da verificare.";

/**
 * Valida l'output del modello: tiene solo interventi noti (prima occorrenza) e id presenti
 * tra i candidati di QUELL'intervento. Restituisce una mappa intervento_id → scelta valida.
 */
export function validaAbbinamenti(output: unknown, interventi: InterventoDaAbbinare[]) {
  const perId = new Map(interventi.map((i) => [i.id, i]));
  const risultato = new Map<string, { prezzario: CandPrezzario | null; propria: CandPropria | null }>();
  const lista = (output as { abbinamenti?: unknown } | null)?.abbinamenti;
  if (!Array.isArray(lista)) return risultato;
  for (const raw of lista) {
    if (!raw || typeof raw !== "object") continue;
    const a = raw as Partial<Abbinamento>;
    if (typeof a.intervento_id !== "string") continue;
    const intervento = perId.get(a.intervento_id);
    if (!intervento || risultato.has(a.intervento_id)) continue;
    const prezzario =
      typeof a.prezzario_voce_id === "string"
        ? (intervento.prezzario.find((c) => c.id === a.prezzario_voce_id) ?? null)
        : null;
    const propria =
      typeof a.voce_propria_id === "string"
        ? (intervento.proprie.find((c) => c.id === a.voce_propria_id) ?? null)
        : null;
    risultato.set(a.intervento_id, { prezzario, propria });
  }
  return risultato;
}

export type EsitoRiga = "abbinato" | "senza" | "unita_diversa";

/** Divide in lotti di dimensione fissa (l'ultimo può essere più corto). */
export function inLotti<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export type PatchIntervento = {
  prezzario_voce_id: string | null;
  codice_prezzario: string | null;
  descrizione_prezzario: string | null;
  prezzo_prezzario: number | null;
  voce_propria_id: string | null;
  descrizione_propria: string | null;
  prezzo_proprio: number | null;
  abbinamento_avviso: string | null;
  fonte_scelta: "prezzario" | "propria" | null;
  descrizione?: string;
  prezzo_unitario?: number;
};

/**
 * Costruisce l'update della riga. Le descrizioni dei candidati scelti sono sempre salvate;
 * descrizione/prezzo della riga cambiano solo con un candidato di unità compatibile.
 */
export function costruisciPatch(
  fonte: FontePrezzi,
  unitaIntervento: Unita,
  prezzario: CandPrezzario | null,
  propria: CandPropria | null,
): { patch: PatchIntervento; esito: EsitoRiga } {
  // Con fonte 'prezzario' la libreria non entra in gioco.
  const prop = fonte === "prezzario" ? null : propria;
  const base = {
    prezzario_voce_id: prezzario?.id ?? null,
    codice_prezzario: prezzario?.codice ?? null,
    descrizione_prezzario: prezzario?.descrizione ?? null,
    prezzo_prezzario: prezzario ? Number(prezzario.prezzo) : null,
    voce_propria_id: prop?.id ?? null,
    descrizione_propria: prop?.descrizione ?? null,
    prezzo_proprio: prop ? Number(prop.prezzo) : null,
  };

  if (!prezzario && !prop) {
    return { patch: { ...base, abbinamento_avviso: AVVISO_NESSUNA, fonte_scelta: null }, esito: "senza" };
  }

  const prezOk = prezzario && unitaPrezzarioCompatibile(unitaIntervento, prezzario) ? prezzario : null;
  const propOk = prop && prop.unita === unitaIntervento ? prop : null;
  const toVoce = (c: { descrizione: string; prezzo: number } | null) =>
    c ? { descrizione: c.descrizione, prezzo: Number(c.prezzo) } : null;

  const preferita = risolviVoce(fonte, toVoce(prezzario), toVoce(prop));
  const compatibile = risolviVoce(fonte, toVoce(prezOk), toVoce(propOk));

  // Avviso di unità per la voce che sarebbe stata preferita ma ha unità diversa.
  let avvisoUnita: string | null = null;
  if (preferita.scelta === "propria" && !propOk && prop) avvisoUnita = avvisoUnitaPropria(prop, unitaIntervento);
  else if (preferita.scelta === "prezzario" && !prezOk && prezzario)
    avvisoUnita = avvisoUnitaPrezzario(prezzario, unitaIntervento);

  if (compatibile.scelta && compatibile.descrizione != null && compatibile.prezzo != null) {
    return {
      patch: {
        ...base,
        abbinamento_avviso: avvisoUnita ?? compatibile.avviso,
        fonte_scelta: compatibile.scelta,
        descrizione: compatibile.descrizione,
        prezzo_unitario: compatibile.prezzo,
      },
      esito: "abbinato",
    };
  }

  // Solo candidati con unità diversa: si salvano i riferimenti, prezzo e descrizione della riga restano.
  return {
    patch: { ...base, abbinamento_avviso: avvisoUnita ?? AVVISO_NESSUNA, fonte_scelta: null },
    esito: "unita_diversa",
  };
}
