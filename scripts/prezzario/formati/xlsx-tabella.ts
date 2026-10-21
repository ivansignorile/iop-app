import * as XLSX from "xlsx";
import { finalizza, mapUnita, numeroIt, pulisci, unisci, type VoceGrezza, type VoceNormalizzata } from "../core";

type Cella = string | number | boolean | null;

/**
 * Mappa delle colonne di un prezzario in forma di tabella (una riga = una voce o un titolo).
 * Le intestazioni si confrontano normalizzate (minuscolo, senza accenti, spazi e punteggiatura)
 * e basta che l'intestazione della cella inizi con l'etichetta indicata.
 */
export type MappaColonne = {
  nome: string;
  /** Fogli da leggere (default: tutti quelli con l'intestazione). */
  fogli?: RegExp;
  colonne: {
    codice: string;
    /** Più colonne = descrizione padre + voce, unite con `unisci`. */
    descrizione: string[];
    unita: string;
    prezzo: string;
    /** Colonna con il nome del capitolo, se c'è. */
    capitolo?: string;
  };
  /**
   * `nessuna`: ogni riga con prezzo è completa.
   * `codice`: gerarchia dal codice puntato; i codici a 1 livello senza prezzo sono capitoli,
   * le righe senza prezzo da `livelloMinimoPadre` livelli in su sono descrizioni madre
   * (anche nella forma `x.y.z.0`, Umbria) che si antepongono alle figlie.
   */
  gerarchia: "nessuna" | "codice";
  livelloMinimoPadre?: number;
  /** Righe senza codice che sono capitoli (es. Marche "01 INDAGINI GEOGNOSTICHE"). */
  capitoloSenzaCodice?: RegExp;
  /** Prefisso di fonte da togliere dal codice. */
  prefisso?: RegExp;
  /** Correzione del testo delle celle (es. caratteri cp1252 letti male negli XLS). */
  correggiTesto?: (s: string) => string;
};

export const MAPPE: Record<"marche" | "puglia" | "umbria", MappaColonne> = {
  marche: {
    nome: "marche",
    colonne: { codice: "numordtariffa", descrizione: ["descrizione"], unita: "unitadimisura", prezzo: "prezzounitario" },
    gerarchia: "nessuna",
    capitoloSenzaCodice: /^\d{2}\s+[^\s.-]/,
  },
  puglia: {
    nome: "puglia",
    fogli: /^lavorazioni$/i,
    colonne: {
      codice: "codicearticolo",
      descrizione: ["voce", "articolo"],
      unita: "um",
      prezzo: "totalegenerale",
      capitolo: "capitolo",
    },
    gerarchia: "nessuna",
  },
  umbria: {
    nome: "umbria",
    fogli: /^Capitolo /i,
    colonne: { codice: "numerodordine", descrizione: ["descrizionedellarticolo"], unita: "um", prezzo: "prezzo" },
    gerarchia: "codice",
    livelloMinimoPadre: 3,
  },
};

export function normalizzaIntestazione(s: Cella): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Testo dell'unità: toglie "€/" e il punto finale quando serve a riconoscerla ("cad." → "cad"). */
export function testoUnita(u: Cella): string {
  let t = pulisci(u == null ? "" : String(u)).replace(/^€\s*\/\s*/, "");
  if (/\.$/.test(t) && mapUnita(t) === "corpo" && mapUnita(t.slice(0, -1)) !== "corpo") t = t.slice(0, -1);
  return t;
}

const CP1252_C1: Record<number, string> = {
  0x80: "€", 0x82: "‚", 0x83: "ƒ", 0x84: "„", 0x85: "…", 0x86: "†", 0x87: "‡", 0x88: "ˆ", 0x89: "‰",
  0x8a: "Š", 0x8b: "‹", 0x8c: "Œ", 0x8e: "Ž", 0x91: "‘", 0x92: "’", 0x93: "“", 0x94: "”", 0x95: "•",
  0x96: "–", 0x97: "—", 0x98: "˜", 0x99: "™", 0x9a: "š", 0x9b: "›", 0x9c: "œ", 0x9e: "ž", 0x9f: "Ÿ",
};

/** Caratteri di controllo C1 (U+0080–U+009F) letti al posto dei corrispondenti cp1252 (’, –, €…). */
export function daCp1252(s: string): string {
  return s.replace(/[\u0080-\u009f]/g, (c) => CP1252_C1[c.charCodeAt(0)] ?? " ");
}

export function leggiWorkbook(buf: Buffer, formato: string): XLSX.WorkBook {
  if (!buf || buf.length === 0) throw new Error(`${formato}: file vuoto`);
  try {
    return XLSX.read(buf, { type: "buffer" });
  } catch (e) {
    throw new Error(`${formato}: file non leggibile come foglio di calcolo (${(e as Error).message})`);
  }
}

export function righe(ws: XLSX.WorkSheet): Cella[][] {
  return XLSX.utils.sheet_to_json<Cella[]>(ws, { header: 1, defval: null, raw: true, blankrows: false });
}

type Indici = { codice: number; descrizione: number[]; unita: number; prezzo: number; capitolo: number | null };

/** Cerca l'intestazione nelle prime righe; restituisce riga e indici delle colonne, o null. */
function trovaIntestazione(rs: Cella[][], mappa: MappaColonne): { riga: number; idx: Indici } | null {
  for (let r = 0; r < Math.min(rs.length, 10); r++) {
    const h = rs[r].map(normalizzaIntestazione);
    const col = (etichetta: string) => {
      const esatta = h.indexOf(etichetta);
      return esatta >= 0 ? esatta : h.findIndex((x) => x.startsWith(etichetta));
    };
    const idx: Indici = {
      codice: col(mappa.colonne.codice),
      descrizione: mappa.colonne.descrizione.map(col),
      unita: col(mappa.colonne.unita),
      prezzo: col(mappa.colonne.prezzo),
      capitolo: mappa.colonne.capitolo ? col(mappa.colonne.capitolo) : null,
    };
    const tutte = [idx.codice, ...idx.descrizione, idx.unita, idx.prezzo, ...(idx.capitolo === null ? [] : [idx.capitolo])];
    if (tutte.every((i) => i >= 0)) return { riga: r, idx };
  }
  return null;
}

function testo(c: Cella | undefined, correggi?: (s: string) => string): string {
  if (c == null) return "";
  return pulisci(correggi ? correggi(String(c)) : String(c));
}

/** Sovrapprezzi e riduzioni in percentuale: non sono prezzi in euro, si scartano. */
export function ePercentuale(unita: string): boolean {
  return unita.trim() === "%";
}

/** Applica la mappa a un workbook già letto. Lancia se nessun foglio ha l'intestazione attesa. */
export function parseConMappa(wb: XLSX.WorkBook, mappa: MappaColonne, formato = "xlsx-tabella"): VoceNormalizzata[] {
  const grezze: VoceGrezza[] = [];
  let fogliValidi = 0;

  for (const nome of wb.SheetNames) {
    if (mappa.fogli && !mappa.fogli.test(nome)) continue;
    const rs = righe(wb.Sheets[nome]);
    const h = trovaIntestazione(rs, mappa);
    if (!h) continue;
    fogliValidi++;
    const { idx } = h;

    const lette: (VoceGrezza & { unita_testo: string })[] = [];
    let capitolo: string | null = null;
    for (const r of rs.slice(h.riga + 1)) {
      const codice = mappa.prefisso ? testo(r[idx.codice]).replace(mappa.prefisso, "") : testo(r[idx.codice]);
      const parti = idx.descrizione.map((i) => testo(r[i], mappa.correggiTesto));
      const descrizione = unisci(...parti);
      if (!codice) {
        if (mappa.capitoloSenzaCodice?.test(descrizione)) capitolo = descrizione;
        continue;
      }
      const prezzo = numeroIt(r[idx.prezzo] as string | number | null);
      if (idx.capitolo !== null) capitolo = testo(r[idx.capitolo], mappa.correggiTesto) || capitolo;
      const unita_testo = testoUnita(r[idx.unita]);
      if (ePercentuale(unita_testo)) continue;
      lette.push({ codice, descrizione, unita_testo, prezzo: prezzo && prezzo > 0 ? prezzo : null, capitolo });
    }

    if (mappa.gerarchia === "nessuna") {
      for (const l of lette) if (l.prezzo !== null) grezze.push(l);
      continue;
    }

    const minimo = mappa.livelloMinimoPadre ?? 3;
    const madri = new Map<string, string>();
    for (const l of lette) if (l.prezzo === null && !madri.has(l.codice)) madri.set(l.codice, l.descrizione);
    let cap: string | null = null;
    for (const l of lette) {
      const livelli = l.codice.split(".");
      if (l.prezzo === null) {
        // capitolo: codice corto a un livello ("1", "01", "S1", "RU") senza unità né prezzo
        if (livelli.length === 1 && l.codice.length <= 3 && !l.unita_testo && l.descrizione) cap = l.descrizione;
        continue;
      }
      const antenati: string[] = [];
      for (let n = livelli.length - 1; n >= minimo; n--) {
        const p = livelli.slice(0, n).join(".");
        const d = madri.get(p) ?? madri.get(`${p}.0`);
        if (d) antenati.unshift(d);
      }
      grezze.push({ ...l, descrizione: unisci(...antenati, l.descrizione), capitolo: cap });
    }
  }

  if (fogliValidi === 0) throw new Error(`${formato}: nessun foglio con le colonne attese per "${mappa.nome}"`);
  const voci = finalizza(grezze);
  if (voci.length === 0) throw new Error(`${formato}: nessuna voce con prezzo per "${mappa.nome}"`);
  return voci;
}

/** Riconosce la fonte dall'intestazione dei fogli e applica la sua mappa. */
export function parse(buf: Buffer): VoceNormalizzata[] {
  const wb = leggiWorkbook(buf, "xlsx-tabella");
  for (const mappa of Object.values(MAPPE)) {
    const ok = wb.SheetNames.some(
      (n) => (!mappa.fogli || mappa.fogli.test(n)) && trovaIntestazione(righe(wb.Sheets[n]), mappa) !== null,
    );
    if (ok) return parseConMappa(wb, mappa);
  }
  throw new Error("xlsx-tabella: intestazione non riconosciuta (attese Marche, Puglia o Umbria)");
}
