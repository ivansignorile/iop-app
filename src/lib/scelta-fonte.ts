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
  abbinamento_avviso?: string | null;
};

/** Normalizza i fine riga (\r\n e \r → \n): le textarea inviate via FormData usano \r\n. */
export function normalizzaFineRiga<T extends string | null | undefined>(testo: T): T {
  return (typeof testo === "string" ? testo.replace(/\r\n?/g, "\n") : testo) as T;
}

/** True se l'avviso riguarda l'unità di misura (da verificare a mano, non va mai cancellato). */
export function isAvvisoUnita(avviso: string | null | undefined): boolean {
  return typeof avviso === "string" && avviso.startsWith("Unità");
}

/** Avviso da tenere dopo una scelta/modifica: restano solo gli avvisi di unità. */
export function avvisoDaTenere(avviso: string | null | undefined): string | null {
  return isAvvisoUnita(avviso) ? (avviso as string) : null;
}

export type DecisioneMassiva =
  | {
      esito: "aggiorna";
      patch: NonNullable<ReturnType<typeof applicaScelta>> & { abbinamento_avviso: null };
    }
  | { esito: "manuale" }
  | { esito: "gia_scelta" }
  | { esito: "senza_fonte" }
  | { esito: "da_verificare" };

/**
 * Decide cosa fare di una riga nella scelta "per tutte le voci".
 * Le righe modificate a mano non vengono mai toccate; quelle già sulla fonte scelta
 * restano invariate (così non si perde un prezzo ritoccato a mano); quelle con unità
 * diversa vanno verificate a mano, una per una.
 */
export function decidiSceltaMassiva(scelta: SceltaFonte, row: RigaScelta): DecisioneMassiva {
  if (row.fonte_scelta === "manuale") return { esito: "manuale" };
  const patch = applicaScelta(scelta, row);
  if (!patch) return { esito: "senza_fonte" };
  if (row.fonte_scelta === scelta) return { esito: "gia_scelta" };
  if (isAvvisoUnita(row.abbinamento_avviso)) return { esito: "da_verificare" };
  return { esito: "aggiorna", patch: { ...patch, abbinamento_avviso: null } };
}

function stessoTesto(a: string | null | undefined, b: string | null | undefined) {
  return (normalizzaFineRiga(a) ?? "").trim() === (normalizzaFineRiga(b) ?? "").trim();
}

/** True se il salvataggio della descrizione rende la riga "modificata a mano". */
export function diventaManuale(
  fonte: RigaScelta["fonte_scelta"] | undefined,
  descrizioneFonte: string | null | undefined,
  nuovaDescrizione: string | null,
): boolean {
  if (fonte !== "prezzario" && fonte !== "propria") return false;
  return !stessoTesto(descrizioneFonte, nuovaDescrizione);
}

const TOLLERANZA_PREZZO = 0.005;

/**
 * True se una riga senza fonte (fonte_scelta null) viene ritoccata a mano: descrizione o prezzo
 * diversi da quelli salvati. Così un abbinamento successivo non la sovrascrive.
 */
export function modificataSenzaFonte(
  fonte: RigaScelta["fonte_scelta"] | undefined,
  descrizioneAttuale: string | null | undefined,
  prezzoAttuale: number | string | null | undefined,
  nuovaDescrizione: string | null,
  nuovoPrezzo: number,
): boolean {
  if (fonte !== null) return false;
  if (!stessoTesto(descrizioneAttuale, nuovaDescrizione)) return true;
  const p = Number(prezzoAttuale ?? 0);
  if (!Number.isFinite(p) || !Number.isFinite(nuovoPrezzo)) return false;
  return Math.abs(p - nuovoPrezzo) > TOLLERANZA_PREZZO;
}

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
