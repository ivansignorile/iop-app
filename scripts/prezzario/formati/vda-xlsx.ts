import { finalizza, numeroIt, pulisci, unisci, type VoceGrezza, type VoceNormalizzata } from "../core";
import { ePercentuale, leggiWorkbook, normalizzaIntestazione, righe, testoUnita } from "./xlsx-tabella";

/**
 * Prezzario Regione Valle d'Aosta (XLSX con layout da stampa): `Codice | Descrizione | U.m. | Prezzo | % MdO`.
 * Ogni voce occupa di solito 2 righe (codice + descrizione, poi U.m. + prezzo senza codice), a volte una sola;
 * righe senza codice con solo testo continuano la descrizione della voce aperta. La gerarchia è nel codice
 * (`S01` capitolo, `S01.A50` voce madre, `S01.A50.010` variante con prezzo): descrizione = madri + variante.
 * Le correzioni dell'Errata Corrige (pk=133710) si applicano ai codici prima di costruire le voci.
 */

/**
 * Errata Corrige della DGR 643/2026 (PDF "Errata Corrige", 2 pagine): codice errato → corretto.
 * `occorrenza` (1, 2, …) = quale riga con quel codice, nell'ordine del file (fogli compresi), va corretta;
 * senza `occorrenza` si correggono tutte. `a: null` = riga da eliminare. Le righe "restano uguali" /
 * "resta quello esistente" non servono. L'occorrenza è ricavata dal contesto nel file 02 (es. P08.B30.025
 * compare due volte, €/ton e €/m³: la seconda è la .027).
 */
export type Correzione = { da: string; occorrenza?: number; a: string | null };

export const CORREZIONI: Correzione[] = [
  { da: "P08.B30.025", occorrenza: 2, a: "P08.B30.027" },
  { da: "P15.H10", occorrenza: 2, a: "P15.H15" },
  { da: "P15.H10.005", a: "P15.H15.005" },
  { da: "P15.H10.010", a: "P15.H15.010" },
  { da: "P15.H10.015", a: "P15.H15.015" },
  { da: "P15.I10", occorrenza: 2, a: "P15.I15" },
  { da: "P15.I10.005", a: "P15.I15.005" },
  { da: "P15.I10.010", a: "P15.I15.010" },
  { da: "P15.I10.015", a: "P15.I15.015" },
  { da: "P15.I20", occorrenza: 1, a: "P15.I17" },
  { da: "P15.I20.005", a: "P15.I17.005" },
  { da: "P15.I20.010", a: "P15.I17.010" },
  { da: "P42.016.025.800", occorrenza: 2, a: "P42.025.025.800" },
  { da: "P42.016.100.350", occorrenza: 2, a: "S42.016.100.350" },
  { da: "P42.040.040.150", occorrenza: 2, a: "S42.040.040.150" },
  ...["040", "050", "065", "080", "100", "125", "150", "200", "250"].map((dn) => ({
    da: `P42.N15.005.${dn}`,
    occorrenza: 2,
    a: `P42.N25.005.${dn}`,
  })),
  { da: "P42.N30", occorrenza: 2, a: "P42.N30.005" },
  { da: "P42.P25.010.050", occorrenza: 2, a: "P42.P25.010.125" },
  { da: "S03.Z12", occorrenza: 2, a: "S03.Z13" },
  { da: "S03.Z12.015", a: "S03.Z13.015" },
  { da: "S03.Z12.020", a: "S03.Z13.020" },
  { da: "S10.M15", occorrenza: 2, a: null },
  { da: "S20.A35.005", occorrenza: 2, a: "S20.A37.005" },
  { da: "S41.D70", occorrenza: 2, a: "S41.D71" },
  { da: "S41.D70.201", a: "S41.D71.201" },
  { da: "S41.D70.202", a: "S41.D71.202" },
  { da: "S41.D70.203", a: "S41.D71.203" },
  { da: "S41.D70", occorrenza: 3, a: "S41.D72" },
  { da: "S41.D70.301", a: "S41.D72.301" },
  { da: "S41.D70.302", a: "S41.D72.302" },
  { da: "S41.D70.303", a: "S41.D72.303" },
  { da: "S41.D70", occorrenza: 4, a: "S41.D73" },
  { da: "S41.D70.401", a: "S41.D73.401" },
  { da: "S41.D70.402", a: "S41.D73.402" },
  { da: "S41.D70.403", a: "S41.D73.403" },
  { da: "S41.D80", occorrenza: 2, a: "S41.D85" },
  { da: "S41.D80.201", a: "S41.D85.201" },
  { da: "S41.D80.202", a: "S41.D85.202" },
  { da: "S41.D80.203", a: "S41.D85.203" },
  { da: "S41.D90", occorrenza: 2, a: "S41.D95" },
  { da: "S41.D90.201", a: "S41.D95.201" },
  { da: "S41.D90.202", a: "S41.D95.202" },
  { da: "S41.D90.203", a: "S41.D95.203" },
  { da: "S41.F01", a: "S41.F00.000" },
  { da: "S41.F01.000", a: "S41.F00.000" },
  { da: "S41.F02", occorrenza: 1, a: "S41.F01.000" },
  { da: "S41.F02.000", a: "S41.F01.000" },
  { da: "S41.F02", occorrenza: 2, a: "S41.F02.010" },
  { da: "S41.F04", a: "S41.F04.010" },
  { da: "S41.F05", a: "S41.F05.010" },
  { da: "S41.F05.020", a: "S41.F13.020" },
  { da: "S42.G30.004", occorrenza: 2, a: "S42.G30.008" },
  { da: "S42.M10.005", a: "S42.M10.080" },
  { da: "S42.M10.010", a: null },
  { da: "S42.M10.015", occorrenza: 1, a: "S42.M10.100" },
  { da: "S42.M10.015", occorrenza: 2, a: "S42.M10.125" },
  { da: "S42.M10.020", a: "S42.M10.150" },
  { da: "S42.S10.000", occorrenza: 2, a: "S42.S10.025" },
  { da: "S43.A11.p.80.80", occorrenza: 2, a: null },
];

const CODICE = /^[A-Z]\d{0,2}(\.[A-Za-z0-9+-]+)*$/;

/** Ripulisce i refusi nella colonna codice: "P50,A70" → "P50.A70", "Nr. 65 S50.N15.003" → "S50.N15.003". */
export function normalizzaCodice(c: unknown): string {
  return pulisci(c == null ? "" : String(c))
    .replace(/^Nr\.\s*\d+\s+/i, "")
    .replace(/,/g, ".");
}

/** Correzione per (codice, occorrenza): stringa = nuovo codice, null = elimina, undefined = invariato. */
export function correggi(codice: string, occorrenza: number, correzioni = CORREZIONI): string | null | undefined {
  const c =
    correzioni.find((x) => x.da === codice && x.occorrenza === occorrenza) ??
    correzioni.find((x) => x.da === codice && x.occorrenza === undefined);
  return c ? c.a : undefined;
}

type Voce = { codice: string; testi: string[]; unita: string; prezzo: number | null; capitolo: string | null };

function trovaColonne(rs: unknown[][]): { riga: number; codice: number; descrizione: number; unita: number; prezzo: number } | null {
  for (let r = 0; r < Math.min(rs.length, 10); r++) {
    const h = rs[r].map((x) => normalizzaIntestazione(x as string));
    const codice = h.indexOf("codice");
    const descrizione = h.findIndex((x) => x.startsWith("descrizione"));
    const unita = h.indexOf("um");
    const prezzo = h.findIndex((x) => x === "prezzo" || /^20\d\d$/.test(x));
    if (codice >= 0 && descrizione >= 0 && unita >= 0 && prezzo >= 0) return { riga: r, codice, descrizione, unita, prezzo };
  }
  return null;
}

/** Parole significative (≥ 4 lettere) per capire se un frammento continua la voce precedente. */
function parole(s: string): Set<string> {
  return new Set(s.toLowerCase().match(/\p{L}{4,}/gu) ?? []);
}

/** Variante scritta come frammento ("a 4 moduli", "2 x 1,5 mm²", "- 50 Hz …", "P= 54 W …") che non regge da sola. */
function eFrammento(s: string): boolean {
  return /^(\p{Ll}|\d|-|P=)/u.test(s);
}

/** Unisce le parti togliendo quelle già contenute in una parte successiva. */
function componi(parti: string[]): string {
  const p = parti.map((x) => pulisci(x)).filter(Boolean);
  return unisci(...p.filter((x, i) => !p.slice(i + 1).some((y) => y.toLowerCase().includes(x.toLowerCase()))));
}

export function parse(buf: Buffer): VoceNormalizzata[] {
  const wb = leggiWorkbook(buf, "vda-xlsx");
  const voci: Voce[] = [];
  const occorrenze = new Map<string, number>();
  let fogliValidi = 0;

  for (const nome of wb.SheetNames) {
    const rs = righe(wb.Sheets[nome]);
    const col = trovaColonne(rs);
    if (!col) continue;
    fogliValidi++;
    let corrente: Voce | null = null;
    let capitolo: string | null = null;

    for (const r of rs.slice(col.riga + 1)) {
      const grezzo = normalizzaCodice(r[col.codice]);
      const testo = pulisci(r[col.descrizione] == null ? "" : String(r[col.descrizione]));
      const unita = testoUnita(r[col.unita] as string | null);
      const prezzo = numeroIt(r[col.prezzo] as string | number | null);

      if (grezzo && CODICE.test(grezzo)) {
        const n = (occorrenze.get(grezzo) ?? 0) + 1;
        occorrenze.set(grezzo, n);
        const corretto = correggi(grezzo, n);
        if (corretto === null) {
          corrente = null;
          continue;
        }
        const codice = corretto ?? grezzo;
        if (codice.split(".").length === 1) {
          capitolo = testo || capitolo;
          corrente = null;
          continue;
        }
        if (corrente && corrente.codice === codice && corrente.prezzo === null) {
          if (testo) corrente.testi.push(testo);
        } else {
          corrente = { codice, testi: testo ? [testo] : [], unita: "", prezzo: null, capitolo };
          voci.push(corrente);
        }
      } else if (grezzo) {
        // "NOTE:", "note:" o codici illeggibili: il testo che segue non è di nessuna voce
        corrente = null;
        continue;
      } else if (!prezzo && /^[A-Z]\d{2}\s+-\s+\S/.test(testo)) {
        // file impianti elettrici: "P60 - MATERIALI - IMPIANTI ELETTRICI" fa da capitolo
        capitolo = testo.replace(/^[A-Z]\d{2}\s+-\s+/, "");
        corrente = null;
        continue;
      } else if (corrente && corrente.prezzo === null && testo) {
        corrente.testi.push(testo);
      }

      if (corrente && corrente.prezzo === null && prezzo !== null) {
        corrente.prezzo = prezzo;
        corrente.unita = unita;
      }
    }
  }
  if (fogliValidi === 0) throw new Error("vda-xlsx: nessun foglio con le colonne Codice/Descrizione/U.m./Prezzo");

  const madri = new Map<string, string>();
  for (const v of voci) if (v.prezzo === null && !madri.has(v.codice)) madri.set(v.codice, componi(v.testi));

  const grezze: VoceGrezza[] = [];
  /** Ultima voce completa (non frammento) per gruppo `XNN.YNN`. */
  const ancore = new Map<string, string>();
  for (const v of voci) {
    if (v.prezzo === null || ePercentuale(v.unita)) continue;
    const livelli = v.codice.split(".");
    const proprio = componi(v.testi);
    const antenati: string[] = [];
    for (let n = 2; n < livelli.length; n++) {
      const d = madri.get(livelli.slice(0, n).join("."));
      if (d) antenati.push(d);
    }
    const gruppo = livelli.slice(0, 2).join(".");
    const ancora = ancore.get(gruppo);
    if (antenati.length === 0 && ancora && eFrammento(proprio)) {
      // senza voce madre (impianti elettrici): il frammento continua l'ultima voce completa del gruppo;
      // se inizia in minuscolo deve condividere almeno una parola ("placca 3p" non continua "Tasto falso polo")
      const comuni = [...parole(proprio)].some((p) => parole(ancora).has(p));
      if (comuni || !/^\p{Ll}/u.test(proprio)) antenati.push(ancora);
    } else if (antenati.length === 0 && !eFrammento(proprio)) {
      ancore.set(gruppo, proprio);
    }
    grezze.push({
      codice: v.codice,
      capitolo: v.capitolo,
      descrizione: componi([...antenati, proprio]),
      unita_testo: v.unita,
      prezzo: v.prezzo,
    });
  }

  const out = finalizza(grezze);
  if (out.length === 0) throw new Error("vda-xlsx: nessuna voce con prezzo");
  return out;
}
