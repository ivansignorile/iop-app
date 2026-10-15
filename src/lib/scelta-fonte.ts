import { applicaScelta } from "../../supabase/functions/_shared/risolvi-voce";

export type SceltaFonte = "prezzario" | "propria";
export const SCELTE_FONTE: readonly SceltaFonte[] = ["prezzario", "propria"];

export function isSceltaFonte(v: unknown): v is SceltaFonte {
  return typeof v === "string" && (SCELTE_FONTE as readonly string[]).includes(v);
}

type RigaScelta = {
  descrizione_prezzario: string | null;
  prezzo_prezzario: number | null;
  descrizione_propria: string | null;
  prezzo_proprio: number | null;
  fonte_scelta: "prezzario" | "propria" | "manuale" | null;
};

export type DecisioneMassiva =
  | { esito: "aggiorna"; patch: NonNullable<ReturnType<typeof applicaScelta>> }
  | { esito: "manuale" }
  | { esito: "gia_scelta" }
  | { esito: "senza_fonte" };

/**
 * Decide cosa fare di una riga nella scelta "per tutte le voci".
 * Le righe modificate a mano non vengono mai toccate; quelle già sulla fonte scelta
 * restano invariate (così non si perde un prezzo ritoccato a mano).
 */
export function decidiSceltaMassiva(scelta: SceltaFonte, row: RigaScelta): DecisioneMassiva {
  if (row.fonte_scelta === "manuale") return { esito: "manuale" };
  const patch = applicaScelta(scelta, row);
  if (!patch) return { esito: "senza_fonte" };
  if (row.fonte_scelta === scelta) return { esito: "gia_scelta" };
  return { esito: "aggiorna", patch };
}

/** True se il salvataggio della descrizione rende la riga "modificata a mano". */
export function diventaManuale(
  fonte: RigaScelta["fonte_scelta"] | undefined,
  descrizioneFonte: string | null | undefined,
  nuovaDescrizione: string | null,
): boolean {
  if (fonte !== "prezzario" && fonte !== "propria") return false;
  return (descrizioneFonte ?? "").trim() !== (nuovaDescrizione ?? "").trim();
}

const TOLLERANZA_PREZZO = 0.005;

/** True se il nuovo prezzo si discosta da quello della fonte scelta (oltre mezzo centesimo). */
export function prezzoDiverso(
  fonte: RigaScelta["fonte_scelta"] | undefined,
  prezzoFonte: number | string | null | undefined,
  nuovoPrezzo: number,
): boolean {
  if (fonte !== "prezzario" && fonte !== "propria") return false;
  if (prezzoFonte == null) return false;
  const p = Number(prezzoFonte);
  if (!Number.isFinite(p) || !Number.isFinite(nuovoPrezzo)) return false;
  return Math.abs(p - nuovoPrezzo) > TOLLERANZA_PREZZO;
}

/** Spezza un array in blocchi di dimensione fissa. */
export function aBlocchi<T>(items: readonly T[], dimensione: number): T[][] {
  const out: T[][] = [];
  const n = Math.max(1, Math.trunc(dimensione));
  for (let i = 0; i < items.length; i += n) out.push(items.slice(i, i + n));
  return out;
}

export function etichettaRegione(regione: string | null | undefined) {
  const t = (regione ?? "").replace(/[-_]+/g, " ").trim();
  return t ? t.replace(/(^|\s)\S/g, (c) => c.toUpperCase()) : "";
}

/** Riga di riferimento in anteprima/stampa quando la fonte è il prezzario. */
export function riferimentoPrezzario(
  fonte: RigaScelta["fonte_scelta"] | undefined,
  codice: string | null | undefined,
  regione: string | null | undefined,
): string | null {
  if (fonte !== "prezzario" || !codice?.trim()) return null;
  const r = etichettaRegione(regione);
  return `Rif. Prezzario ${r ? `Regione ${r}` : "regionale"} – ${codice.trim()}`;
}
