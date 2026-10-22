import { finalizza, numeroIt, pulisci, senzaPrefisso, unisci, type VoceGrezza, type VoceNormalizzata } from "../core";

/**
 * Prezzari pubblicati solo in PDF (Abruzzo, Molise). Il parser riceve il TESTO già estratto con
 * `pdftotext -layout -enc UTF-8 <file.pdf> <file.txt>` (pagine separate da form feed); più PDF della
 * stessa fonte (es. prezzario + errata corrige) si concatenano in un unico .txt: a parità di codice
 * vince l'ultima occorrenza, così l'errata messa in coda sovrascrive la voce originale.
 *
 * Due impaginazioni:
 * - "riga-prezzo" (Abruzzo): codice e descrizione allineati in alto, unità/SIC/MAN%/PREZZO su una riga
 *   a parte sotto la descrizione.
 * - "prezzo-in-riga" (Molise): tabella con celle centrate in verticale; codice, U.M., € e percentuali
 *   sulla stessa riga, descrizione distribuita sopra e sotto la riga del codice.
 */
export function parse(buf: Buffer): VoceNormalizzata[] {
  const testo = buf.toString("utf8").replace(/\r/g, "");
  let grezze: VoceGrezza[];
  if (/SIC\.€\s+MAN\.%\s+PREZZO/.test(testo)) grezze = parseRigaPrezzo(testo);
  else if (/U\.M\.?\s+€\s+% RU/.test(testo)) grezze = parsePrezzoInRiga(testo);
  else throw new Error("pdf-testo: intestazione tabella non riconosciuta (né 'U.M. SIC.€ MAN.% PREZZO' né 'U.M. € % RU')");
  // "%" (maggiorazioni percentuali) e "K" (coefficienti) non sono prezzi in euro
  const voci = finalizza(grezze.filter((v) => !/^(%|K$)/.test(pulisci(v.unita_testo))));
  if (!voci.length) throw new Error("pdf-testo: nessuna voce con codice e prezzo");
  return voci;
}

const PREFISSO = /^\s*([A-Z]{3}\d{2})_\s*(\S+)/;
const UNITA_NOTE = /^(?:cad|mq|mc|m|ml|kg|ora|t|%|paio|dmc|cmc|dm|km|kW|W|K|l|giorno|giunto|min|cm|q|m²|m³|[a-z]{1,3}\/[a-z]{1,4})$/;
const NUMERO = /\d+(?:\.\d{3})*,\d{1,2}/g;

/** Tiene l'ultima occorrenza di ogni codice (errata in coda), nell'ordine della prima. */
function ultimaVince<T extends { codice: string }>(voci: T[]): T[] {
  const m = new Map<string, T>();
  for (const v of voci) m.set(v.codice, v);
  return [...m.values()];
}

/** Codice padre di una voce foglia: "P.02.10.10.a" → "P.02.10.10", "A01001a" → "A01001", "A16041.6a" → "A16041.6". */
function padre(codice: string): string | null {
  const punto = codice.match(/^(.+\.\d+)\.[a-z]+\d*$/);
  if (punto) return punto[1];
  const lettera = codice.match(/^(.*\d)[a-z]+$/);
  return lettera ? lettera[1] : null;
}

// ---------------------------------------------------------------------------------------------
// Abruzzo: riga del prezzo separata

type VoceAbr = { codice: string; testo: string[]; unita: string | null; prezzo: number | null; chiusa: boolean };

const ABR_INTESTAZIONE = [
  /^\s*PREZZARIO .*\d{4}\s*$/,
  /^\s*CODICE\s+DESCRIZIONE\s+U\.M\./,
  /^\s*-\s*\d+\s*-\s*$/,
  /^[A-Z]{1,3} - \S/,
];
// unità  SIC.€  [MAN.% %]  PREZZO
const ABR_PREZZO = /^(\s{20,})(\S.*?)\s{2,}(\d+(?:\.\d{3})*,\d{2})(?:\s+\d+,\d+\s*%)?\s+(\d+(?:\.\d{3})*,\d{2})\s*$/;

function parseRigaPrezzo(testo: string): VoceGrezza[] {
  const voci: VoceAbr[] = [];
  let cur: VoceAbr | null = null;
  let titoloInAttesa: { t: string; rientro: number }[] = [];
  let colUnita = -1;
  let dopoPrezzo = false;

  for (const riga of testo.split(/\n|\f/)) {
    if (!riga.trim()) {
      dopoPrezzo = false;
      continue;
    }
    if (ABR_INTESTAZIONE.some((re) => re.test(riga))) continue;

    const c = riga.match(PREFISSO);
    if (c) {
      const resto = pulisci(riga.slice(c[0].length));
      cur = { codice: senzaPrefisso(`${c[1]}_${c[2]}`), testo: resto ? [resto] : [], unita: null, prezzo: null, chiusa: false };
      // titolo del gruppo sulle righe sopra il codice; una riga con rientro diverso è il titolo del sottogruppo
      if (!resto && livello(cur.codice) <= 2 && titoloInAttesa.length) {
        const r0 = titoloInAttesa[0].rientro;
        cur.testo = titoloInAttesa.filter((x) => x.rientro === r0).map((x) => x.t);
      }
      titoloInAttesa = [];
      voci.push(cur);
      dopoPrezzo = false;
      continue;
    }

    const p = riga.match(ABR_PREZZO);
    if (p && cur && !cur.chiusa) {
      cur.unita = p[2].trim();
      cur.prezzo = numeroIt(p[4]);
      cur.chiusa = true;
      colUnita = p[1].length;
      dopoPrezzo = true;
      continue;
    }
    // seconda riga dell'unità ("x dm di" / "altezza")
    if (dopoPrezzo && cur?.unita && riga.search(/\S/) >= colUnita - 3 && riga.trim().length <= 14) {
      const resto = riga.trim();
      cur.unita = resto.length <= 2 ? cur.unita + resto : `${cur.unita} ${resto}`; // "Giunto/mes" + "e"
      continue;
    }
    dopoPrezzo = false;
    if (/^\s*[\d.,]+\s*$/.test(riga)) continue; // "0,00" degli articoli senza prezzo

    if (cur && !cur.chiusa && (livello(cur.codice) >= 3 || !cur.testo.length)) cur.testo.push(pulisci(riga));
    else titoloInAttesa.push({ t: pulisci(riga), rientro: riga.search(/\S/) });
  }

  const tutte = ultimaVince(voci);
  const perCodice = new Map(tutte.map((v) => [v.codice, v]));
  const grezze: VoceGrezza[] = [];
  for (const v of tutte) {
    if (v.prezzo == null) continue;
    const pa = padre(v.codice);
    const vp = pa ? perCodice.get(pa) : undefined;
    const cap = perCodice.get(v.codice.split(".").slice(0, 2).join("."));
    grezze.push({
      codice: v.codice,
      capitolo: cap ? cap.testo.join(" ") : null,
      descrizione: unisci(vp && vp !== v ? vp.testo.join(" ") : null, v.testo.join(" ")),
      unita_testo: v.unita,
      prezzo: v.prezzo,
    });
  }
  return grezze;
}

function livello(codice: string): number {
  return codice.split(".").length - 1;
}

// ---------------------------------------------------------------------------------------------
// Molise: prezzo sulla riga del codice, celle centrate in verticale

type Colonne = { um: number; eu: number };
type Riga =
  | { tipo: "voce"; codice: string; testo: string; unita: string; prezzo: number | null }
  | { tipo: "testo"; testo: string; laterale: string }
  | { tipo: "vuota" }
  | { tipo: "titolo"; testo: string };

const MOL_INTESTAZIONE = [
  /^\s*CODICE\s+DESCRIZIONE\s+U\.M/,
  /PREZZARIO OPERE PUBBLICHE/,
  /^\s*20\d\d(\s+PARTE\s+[A-Z])?\s*$/,
  /^\s*PARTE\s+[A-Z]\b/,
  /^\s*\|?\s*\d+\s*\|?\s*$/,
];

/** Titoli dall'indice generale (righe "NOME    pagina" prima della prima voce). */
function indice(testo: string): { titoli: Set<string>; capitoli: Map<string, string> } {
  const titoli = new Set<string>();
  const capitoli = new Map<string, string>();
  const fine = testo.search(/^\s*[A-Z]{3}\d{2}_/m);
  for (const riga of testo.slice(0, fine < 0 ? 0 : fine).split(/\n|\f/)) {
    const m = riga.match(/^\s*(\S.*?\S)\s{2,}\d+\s*$/);
    if (!m) continue;
    const nome = pulisci(m[1]);
    titoli.add(nome);
    const cap = nome.match(/^([A-Z]{1,2}\d{0,2})\.\s+(.+)$/);
    if (cap) capitoli.set(cap[1], cap[2]);
  }
  return { titoli, capitoli };
}

function eTitolo(t: string, titoli: Set<string>): boolean {
  if (/[a-zà-ü]/.test(t) || t.length < 6) return false;
  if (titoli.has(t)) return true;
  for (const n of titoli) if (n.length > t.length && (n.startsWith(t) || n.endsWith(t))) return true;
  return false;
}

/** Separa il testo in colonna U.M. (dopo almeno 2 spazi) dal resto della riga. */
function laterale(riga: string, col: Colonne): { testo: string; laterale: string } {
  const m = riga.match(/^(.*?)(\s{2,})(\S.*)$/);
  if (m && m[1].length + m[2].length >= col.um - 4 && m[1].length + m[2].length < col.eu) {
    return { testo: pulisci(m[1]), laterale: pulisci(m[3]) };
  }
  if (riga.search(/\S/) >= col.um - 4) return { testo: "", laterale: pulisci(riga) };
  return { testo: pulisci(riga), laterale: "" };
}

/** Prezzo nella colonna €: numero che termina vicino all'intestazione "€"; prima di lui l'unità. */
function codaPrezzo(riga: string, inizio: number, col: Colonne) {
  let prezzo: RegExpMatchArray | null = null;
  for (const n of riga.matchAll(NUMERO)) {
    const fine = n.index! + n[0].length;
    if (n.index! >= inizio && n.index! >= col.um - 1 && fine >= col.eu - 6 && fine <= col.eu + 8) {
      prezzo = n;
      break;
    }
  }
  if (!prezzo) return { testo: pulisci(riga.slice(inizio)), unita: "", prezzo: null };
  const limite = prezzo.index!;
  const prima = riga.slice(0, limite);
  // unità: token che iniziano dentro la colonna U.M.
  let inizioUnita = limite;
  for (const t of prima.matchAll(/\S+/g)) {
    if (t.index! >= inizio && t.index! >= col.um - 4) {
      inizioUnita = t.index!;
      break;
    }
  }
  // unità attaccata alla descrizione ("… assito di legno dmc   1,32"): ultimo token, se è un'unità nota
  if (inizioUnita === limite) {
    const ultimo = prima.match(/(\S+)\s*$/);
    if (ultimo && UNITA_NOTE.test(ultimo[1]) && ultimo.index! >= inizio) inizioUnita = ultimo.index!;
  }
  // "… 800 V cad": nella colonna U.M. è sconfinata la fine della descrizione
  const parti = riga.slice(inizioUnita, limite).trim().split(/\s+/);
  if (parti.length > 1 && UNITA_NOTE.test(parti[parti.length - 1]) && !/^(\d+|a|x)$/i.test(parti[0])) {
    inizioUnita = riga.lastIndexOf(parti[parti.length - 1], limite);
  }
  return {
    testo: pulisci(riga.slice(inizio, inizioUnita)),
    unita: pulisci(riga.slice(inizioUnita, limite)),
    prezzo: numeroIt(prezzo[0]),
  };
}

function righeMolise(testo: string, titoli: Set<string>): Riga[] {
  const out: Riga[] = [];
  let col: Colonne | null = null;
  for (const pagina of testo.split("\f")) {
    const righe = pagina.split("\n");
    const h = righe.find((r) => /CODICE\s+DESCRIZIONE\s+U\.M\.?\s+€/.test(r));
    if (h) col = { um: h.indexOf("U.M"), eu: h.indexOf("€") };
    if (!col) continue;
    for (const riga of righe) {
      if (!riga.trim()) {
        out.push({ tipo: "vuota" });
        continue;
      }
      if (MOL_INTESTAZIONE.some((re) => re.test(riga))) continue;
      const c = riga.match(PREFISSO);
      if (c) {
        const coda = codaPrezzo(riga, c[0].length, col);
        out.push({ tipo: "voce", codice: senzaPrefisso(`${c[1]}_${c[2]}`), ...coda });
        continue;
      }
      const t = pulisci(riga);
      if (eTitolo(t, titoli)) {
        out.push({ tipo: "titolo", testo: t });
        continue;
      }
      // riga con prezzo ma senza codice (codice mancante nel PDF): non è descrizione di nessuno
      if (codaPrezzo(riga, 0, col).prezzo != null) {
        out.push({ tipo: "titolo", testo: t });
        continue;
      }
      out.push({ tipo: "testo", ...laterale(riga, col) });
    }
  }
  return out;
}

type VoceMol = { codice: string; sopra: string[]; riga: string; sotto: string[]; unita: string; prezzo: number | null };

/** Costo di una cella con `a` righe sopra e `b` sotto la riga del codice (centratura verticale). */
function costo(a: number, b: number): number {
  const d = b - a;
  if (d === 0) return 0;
  if (d === 1) return 0.5;
  if (d === -1) return 1;
  return 3 * Math.abs(d);
}

function parsePrezzoInRiga(testo: string): VoceGrezza[] {
  const { titoli, capitoli } = indice(testo);
  const righe = righeMolise(testo, titoli);

  // Voci e "buchi" di righe di testo tra una voce e l'altra.
  type Buco = { segmenti: Riga[][] }; // segmenti separati da titoli
  const voci: { r: Extract<Riga, { tipo: "voce" }>; prima: Buco; alto: boolean; latSopra: string; latSotto: string }[] = [];
  let buco: Buco = { segmenti: [[]] };
  for (let i = 0; i < righe.length; i++) {
    const r = righe[i];
    if (r.tipo === "voce") {
      const prec = righe[i - 1];
      const succ = righe[i + 1];
      voci.push({
        r,
        prima: buco,
        alto: /^[A-Z]{2}_/.test(r.codice),
        latSopra: prec?.tipo === "testo" ? prec.laterale : "",
        latSotto: succ?.tipo === "testo" ? succ.laterale : "",
      });
      buco = { segmenti: [[]] };
    } else if (r.tipo === "titolo") buco.segmenti.push([]);
    else buco.segmenti[buco.segmenti.length - 1].push(r);
  }
  const bucoFinale = buco;

  const risultato: VoceMol[] = voci.map((v) => ({
    codice: v.r.codice,
    sopra: [],
    riga: v.r.testo,
    sotto: [],
    unita: v.r.unita || [v.latSopra, v.latSotto].filter(Boolean).join(" "),
    prezzo: v.r.prezzo,
  }));
  const testi = (rs: Riga[]) => rs.flatMap((r) => (r.tipo === "testo" && r.testo ? [r.testo] : []));

  // Voci allineate in alto (RU_, AT_): descrizione = riga del codice + righe seguenti fino a una vuota.
  // Voci centrate: programmazione dinamica sulla divisione di ogni buco tra la voce prima e quella dopo.
  let i = 0;
  while (i < voci.length) {
    if (voci[i].alto) {
      const succ = i + 1 < voci.length ? voci[i + 1].prima : bucoFinale;
      const seg = succ.segmenti[0];
      const fine = seg.findIndex((r) => r.tipo === "vuota");
      risultato[i].sotto = testi(fine < 0 ? seg : seg.slice(0, fine));
      i++;
      continue;
    }
    let j = i;
    while (j < voci.length && !voci[j].alto) j++;
    const blocco = voci.slice(i, j);
    dividiCentrate(
      blocco.map((v) => v.prima),
      blocco.map((v) => v.r.testo !== ""),
      j < voci.length ? null : bucoFinale,
      testi,
    ).forEach((d, k) => {
      risultato[i + k].sopra = d.sopra;
      risultato[i + k].sotto = d.sotto;
    });
    // il buco dopo l'ultima voce centrata, se seguita da una voce in alto, non le appartiene oltre la prima riga vuota
    if (j < voci.length) {
      const seg = voci[j].prima.segmenti[0];
      const fine = seg.findIndex((r) => r.tipo === "vuota");
      const sotto = testi(fine < 0 ? seg : seg.slice(0, fine));
      risultato[j - 1].sotto = sotto.slice(0, risultato[j - 1].sopra.length + 1);
    }
    i = j;
  }

  // Intestazione comune ("Quadro da incasso …:", con o senza codice): la si ripete sulle voci seguenti
  // che la sottintendono, finché non comincia una descrizione nuova o un titolo.
  const codici = new Set(risultato.map((v) => v.codice));
  let intestazione: string[] = [];
  let capitoloIntestazione = "";
  risultato.forEach((v, k) => {
    const capitolo = v.codice.slice(0, 3);
    if (voci[k].prima.segmenti.length > 1 || capitolo !== capitoloIntestazione) intestazione = [];
    capitoloIntestazione = capitolo;
    const pa = padre(v.codice);
    if (pa && codici.has(pa)) return;
    const h = v.sopra.map((t) => /:$/.test(t)).lastIndexOf(true);
    if (h >= 0) {
      intestazione = v.sopra.slice(0, h + 1);
      return;
    }
    const propria = [...v.sopra, v.riga, ...v.sotto].filter(Boolean);
    // descrizione che inizia con una parola maiuscola = nuova voce (capogruppo se chiude con ":");
    // altrimenti ("potere d'interruzione 6 kA:", "SDR 26 (PN 10):") è una variante dell'ultimo capogruppo
    if (/^[A-ZÀ-Ü][a-zà-ü]/.test(propria[0] ?? "")) intestazione = /:$/.test(propria[propria.length - 1]) ? propria : [];
    else if (intestazione.length) v.sopra = [...intestazione, ...v.sopra];
  });

  const tutte = ultimaVince(risultato);
  const perCodice = new Map(tutte.map((v) => [v.codice, v]));
  const desc = (v: VoceMol) => [...v.sopra, v.riga, ...v.sotto].filter(Boolean).join(" ");
  const grezze: VoceGrezza[] = [];
  for (const v of tutte) {
    if (v.prezzo == null) continue;
    const pa = padre(v.codice);
    const vp = pa ? perCodice.get(pa) : undefined;
    const cap = v.codice.match(/^([A-Z]{2})_/)?.[1] ?? v.codice.match(/^([A-Z]\d{2})/)?.[1];
    grezze.push({
      codice: v.codice,
      capitolo: (cap && capitoli.get(cap)) || null,
      descrizione: unisci(vp ? desc(vp) : null, desc(v)),
      unita_testo: v.unita,
      prezzo: v.prezzo,
    });
  }
  return grezze;
}

const MAX_CELLA = 40;

/** Indizi testuali su un taglio prima della riga `i`: fine descrizione (":") o inizio frase lo rendono più probabile. */
function taglio(righe: string[], i: number): number {
  if (i <= 0 || i >= righe.length) return 0;
  const prima = righe[i - 1];
  const dopo = righe[i];
  let c = 0;
  if (/:$/.test(prima)) c -= 1;
  if (/^[A-ZÀ-Ü][a-zà-ü]/.test(dopo)) c -= 0.6; // parola maiuscola: probabile inizio di una descrizione
  if (/^[A-ZÀ-Ü]/.test(dopo) && /[.:;]$/.test(prima)) c -= 0.4;
  return c;
}

/**
 * `buchi[k]` = righe tra la voce k-1 e la voce k (per k = 0: prima della prima voce del blocco);
 * `coda` = righe dopo l'ultima voce (null se il blocco è seguito da una voce allineata in alto).
 * Ogni buco si divide in [righe sotto la voce k-1 | (scartate) | righe sopra la voce k]: senza titoli
 * scartare costa caro (sono descrizioni), dopo un titolo no (avvertenze). Tra tutte le divisioni si
 * sceglie quella che rende le celle più simmetriche attorno alla riga del codice.
 */
function dividiCentrate(
  buchi: { segmenti: Riga[][] }[],
  conTesto: boolean[],
  coda: { segmenti: Riga[][] } | null,
  testi: (r: Riga[]) => string[],
) {
  type Opzione = { sotto: number; sopra: number; costo: number };
  const n = buchi.length;
  // Righe sopra il codice fino a una che chiude con ":" sono un'intestazione senza codice (comune a più
  // voci): non contano per la simmetria della cella. `dopoIntestazione[k]` = righe dopo l'ultima di queste.
  const dopoIntestazione = buchi.map((b) => {
    const segs = b.segmenti.map(testi);
    const ultimo = segs[segs.length - 1];
    for (let h = ultimo.length - 1; h >= 0; h--) if (/:$/.test(ultimo[h])) return ultimo.length - 1 - h;
    return Infinity;
  });
  const costoVoce = (k: number, a: number, b: number) => {
    const libere = dopoIntestazione[k];
    if (a <= libere || !(libere > 0 || conTesto[k])) return costo(a, b);
    // dopo un titolo le righe non prese andrebbero perse: meglio tenerle come intestazione
    return costo(libere, b) + (buchi[k].segmenti.length > 1 ? -0.2 * Math.min(a - libere, 6) : 0.3);
  };

  const opzioni = (b: { segmenti: Riga[][] }, haPrima: boolean, haDopo: boolean): Opzione[] => {
    const segs = b.segmenti.map(testi);
    const g1 = segs[0].length;
    const g2 = segs[segs.length - 1].length;
    const tagliVuoti = new Set<number>();
    if (segs.length === 1) {
      let k = 0;
      for (const r of b.segmenti[0]) {
        if (r.tipo === "testo" && r.testo) k++;
        else if (r.tipo === "vuota") tagliVuoti.add(k);
      }
    }
    const out: Opzione[] = [];
    for (let s = 0; s <= (haPrima ? Math.min(g1, MAX_CELLA) : 0); s++) {
      const maxA = haDopo ? Math.min(segs.length === 1 ? g1 - s : g2, MAX_CELLA) : 0;
      for (let a = 0; a <= maxA; a++) {
        let c: number;
        if (segs.length === 1) {
          const scarto = g1 - s - a;
          // senza voce prima o dopo (inizio/fine blocco) le righe in eccesso non sono di nessuno
          c = haPrima && haDopo ? 2 * scarto : 0;
          if (scarto === 0 && s > 0 && a > 0 && tagliVuoti.has(s)) c -= 0.4;
          c += taglio(segs[0], s);
          if (scarto > 0) c += taglio(segs[0], g1 - a);
        } else c = 0.5 * (g1 - s);
        out.push({ sotto: s, sopra: a, costo: c });
      }
    }
    return out;
  };

  const tutti = [...buchi.map((b, k) => opzioni(b, k > 0, true)), coda ? opzioni(coda, true, false) : [{ sotto: 0, sopra: 0, costo: 0 }]];
  const best: number[][] = [tutti[0].map((o) => o.costo)];
  const da: number[][] = [tutti[0].map(() => -1)];
  for (let k = 1; k <= n; k++) {
    // migliore predecessore per ogni valore di "sopra" della voce k-1
    const perSopra = new Map<number, { c: number; i: number }>();
    tutti[k - 1].forEach((p, pi) => {
      const prev = perSopra.get(p.sopra);
      if (!prev || best[k - 1][pi] < prev.c) perSopra.set(p.sopra, { c: best[k - 1][pi], i: pi });
    });
    best[k] = [];
    da[k] = [];
    tutti[k].forEach((o, oi) => {
      let m = Infinity;
      let arg = 0;
      for (const [a, p] of perSopra) {
        const c = p.c + costoVoce(k - 1, a, o.sotto);
        if (c < m) {
          m = c;
          arg = p.i;
        }
      }
      best[k][oi] = m + o.costo;
      da[k][oi] = arg;
    });
  }
  const scelte: number[] = new Array(n + 1);
  let bi = 0;
  best[n].forEach((c, oi) => {
    if (c < best[n][bi]) bi = oi;
  });
  for (let k = n; k >= 0; k--) {
    scelte[k] = bi;
    bi = da[k][bi];
  }

  const testoBuco = (k: number) => (k < n ? buchi[k] : coda)?.segmenti.map(testi) ?? [[]];
  const out: { sopra: string[]; sotto: string[] }[] = [];
  for (let k = 0; k < n; k++) {
    const qui = testoBuco(k);
    const ultimo = qui[qui.length - 1];
    const sopraN = tutti[k][scelte[k]].sopra;
    out.push({ sopra: ultimo.slice(ultimo.length - sopraN), sotto: testoBuco(k + 1)[0].slice(0, tutti[k + 1][scelte[k + 1]].sotto) });
  }
  return out;
}
