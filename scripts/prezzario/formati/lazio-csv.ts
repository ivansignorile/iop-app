import { unzipSync } from "fflate";
import { finalizza, numeroIt, pulisci, unisci, type VoceGrezza, type VoceNormalizzata } from "../core";

/** Righe di un CSV con separatore `sep`: campi tra virgolette (con `""`), fine riga \r\n, \r o \n; righe vuote saltate. */
export function leggiCsv(testo: string, sep: string): string[][] {
  const righe: string[][] = [];
  let riga: string[] = [];
  let campo = "";
  let virgolette = false;
  const chiudiRiga = () => {
    riga.push(campo);
    campo = "";
    if (riga.some((c) => c !== "")) righe.push(riga);
    riga = [];
  };
  for (let i = 0; i < testo.length; i++) {
    const ch = testo[i];
    if (virgolette) {
      if (ch === '"') {
        if (testo[i + 1] === '"') {
          campo += '"';
          i++;
        } else virgolette = false;
      } else campo += ch;
    } else if (ch === '"' && campo === "") virgolette = true;
    else if (ch === sep) {
      riga.push(campo);
      campo = "";
    } else if (ch === "\r" || ch === "\n") {
      if (ch === "\r" && testo[i + 1] === "\n") i++;
      chiudiRiga();
    } else campo += ch;
  }
  if (campo !== "" || riga.length) chiudiRiga();
  return righe;
}

/** UTF-8 (con o senza BOM) se valido, altrimenti cp1252 (la parte A del Lazio). */
export function decodifica(buf: Uint8Array): string {
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) return new TextDecoder("utf-8").decode(buf.subarray(3));
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder("windows-1252").decode(buf);
  }
}

const PREZZO = /^(?:€\s*)?\d[\d .]*(?:,\d{1,5})?$/;
const CODICE_PUNTATO = /^\d[\dA-Za-z.]*$/;
const CODICE_E = /^[A-Z]\d{2,}[a-z]*$/;

export type Scarti = Record<string, number>;

type Riga = { codice: string; chiave: string; descrizione: string; prezzo: number | null; usata: boolean };

const pulisciCella = (c: string | undefined) => (c ?? "").replace(/ /g, " ").trim();
const prezzoDi = (c: string | undefined) => {
  const t = pulisciCella(c).replace(/\s+/g, " ");
  return PREZZO.test(t) ? numeroIt(t) : null;
};
const tokens = (codice: string) => (codice.match(/\d+|[A-Za-z]+/g) ?? []).map((t) => (/^\d+$/.test(t) ? String(Number(t)) : t));
const piu = (s: Scarti, motivo: string) => (s[motivo] = (s[motivo] ?? 0) + 1);

/** Colonna con più celle che sembrano un prezzo ("€ 1 826,34", "48.898,85"). */
function colonnaPrezzo(righe: string[][]): number {
  const conta = new Map<number, number>();
  for (const r of righe)
    r.forEach((c, i) => {
      if (i >= 3 && pulisciCella(c) && prezzoDi(c) != null && pulisciCella(c).includes(",")) conta.set(i, (conta.get(i) ?? 0) + 1);
    });
  let best = -1;
  let max = 0;
  for (const [i, n] of conta) if (n > max) [best, max] = [i, n];
  if (best < 0) throw new Error("lazio-csv: nessuna colonna prezzo");
  return best;
}

/** Un CSV di una parte della Tariffa Lazio (`;`, senza header, gerarchia dal codice). */
function parseParte(testo: string, grezze: VoceGrezza[], scarti: Scarti) {
  const righe = leggiCsv(testo, ";");
  const p = colonnaPrezzo(righe);
  // Lettera della parte: colonna prima del codice (A, B, D…); assente nella parte E (codici E01001a).
  const lettere = new Map<string, number>();
  if (p >= 4)
    for (const r of righe) {
      // Colonna della lettera, oppure lettera in testa al codice ("D 1.01.1.a", ";D;IMPIANTI ELETTRICI").
      const l = pulisciCella(r[p - 4]) || (pulisciCella(r[p - 3]).match(/^([A-Z])(?:$|[ .]\d)/)?.[1] ?? "");
      if (/^[A-Z]$/.test(l)) lettere.set(l, (lettere.get(l) ?? 0) + 1);
    }
  const lettera = [...lettere].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const descrizioni = new Map<string, string>();
  const capitoliE = new Map<string, string>();
  let ultima: Riga | null = null;
  let intro = "";

  const normalizza = (cella: string): string | null => {
    let t = pulisciCella(cella);
    if (!t) return null;
    if (lettera) {
      t = t.replace(new RegExp(`^${lettera}[ .]?(?=\\d)`), "");
      t = t.replace(/\s+/g, ".").replace(/\.{2,}/g, ".").replace(/\.$/, "");
      return CODICE_PUNTATO.test(t) ? lettera + t : null;
    }
    return CODICE_E.test(t) ? t : null;
  };

  const capitolo = (codice: string, tk: string[]): string | null => {
    if (!lettera) return capitoliE.get(codice.slice(0, 3)) ?? null;
    return descrizioni.get(tk.slice(0, 3).join(".")) ?? descrizioni.get(tk.slice(0, 2).join(".")) ?? null;
  };

  /** Descrizioni degli antenati sotto il livello capitolo, dall'alto. */
  const antenati = (tk: string[]): string[] => {
    const min = lettera ? 4 : 2;
    const out: string[] = [];
    for (let n = min; n < tk.length; n++) {
      const d = descrizioni.get(tk.slice(0, n).join("."));
      if (d) out.push(d);
    }
    if (!lettera && intro) {
      const primo = out[0] ?? "";
      if (/^[a-zà-ù]/.test(primo) || (primo && primo.length < 30)) out.unshift(intro);
    }
    return out;
  };

  const emetti = (codice: string, tk: string[], parti: string[], unita: string, prezzo: number) => {
    grezze.push({ codice, capitolo: capitolo(codice, tk), descrizione: unisci(...parti), unita_testo: unita, prezzo });
  };

  for (const r of righe) {
    const cellaCodice = r[p - 3] ?? "";
    const descr = pulisci(r[p - 2]);
    const unita = pulisci(r[p - 1]);
    const prezzo = prezzoDi(r[p]);
    const codice = normalizza(cellaCodice);
    if (unita === "%" || pulisciCella(r[p]).endsWith("%")) {
      // Maggiorazioni percentuali: non sono prezzi in euro.
      if (codice) piu(scarti, "maggiorazione percentuale");
      if (codice && descr) descrizioni.set(tokens(codice).join("."), descr);
      continue;
    }

    if (!lettera) {
      const cap = pulisciCella(r[0]).match(/^([A-Z]\d{2})\.\s+(.+)/);
      if (cap) {
        capitoliE.set(cap[1], pulisci(cap[2]));
        intro = "";
        continue;
      }
    }

    if (codice) {
      const tk = tokens(codice);
      const riga: Riga = { codice, chiave: tk.join("."), descrizione: descr, prezzo, usata: false };
      if (prezzo != null && prezzo > 0) {
        const parti = [...antenati(tk), descr];
        if (!descr && !antenati(tk).length) piu(scarti, "voce senza descrizione");
        else emetti(codice, tk, parti, unita, prezzo);
        riga.usata = true;
      } else if (pulisciCella(r[p]) && prezzo == null) piu(scarti, "prezzo non numerico");
      if (descr) descrizioni.set(riga.chiave, descr);
      if (lettera && tk.length <= 3) intro = "";
      ultima = riga;
      continue;
    }

    if (pulisciCella(cellaCodice)) {
      if (prezzo != null) piu(scarti, "codice non riconosciuto");
      continue;
    }

    if (prezzo != null) {
      // Riga con prezzo ma senza codice: completa la voce madre appena sopra se non ha già un prezzo.
      if (!unita || unita === "=") {
        piu(scarti, "riga di esempio/totale");
      } else if (ultima && ultima.prezzo == null && !ultima.usata) {
        const tk = tokens(ultima.codice);
        emetti(ultima.codice, tk, [...antenati(tk), ultima.descrizione, descr], unita, prezzo);
        ultima.usata = true;
      } else piu(scarti, "riga con prezzo senza codice");
      continue;
    }

    if (!lettera && descr) {
      const lettereDescr = descr.replace(/[^A-Za-zÀ-ú]/g, "");
      intro = lettereDescr && lettereDescr === lettereDescr.toUpperCase() ? "" : descr;
    }
  }
}

/** Voci e conteggio delle righe scartate; accetta un singolo CSV o lo zip open data con tutte le parti. */
export function parseDettagli(buf: Buffer): { voci: VoceNormalizzata[]; scarti: Scarti } {
  if (!buf.length) throw new Error("lazio-csv: file vuoto");
  const scarti: Scarti = {};
  const grezze: VoceGrezza[] = [];
  if (buf[0] === 0x50 && buf[1] === 0x4b) {
    const csv = Object.entries(unzipSync(buf))
      .filter(([nome]) => /\.csv$/i.test(nome))
      .sort(([a], [b]) => a.localeCompare(b));
    if (!csv.length) throw new Error("lazio-csv: nessun CSV nello zip");
    for (const [, dati] of csv) parseParte(decodifica(dati), grezze, scarti);
  } else parseParte(decodifica(buf), grezze, scarti);
  const voci = finalizza(grezze);
  if (!voci.length) throw new Error("lazio-csv: nessuna voce con codice e prezzo");
  const doppie = grezze.length - voci.length;
  if (doppie) scarti["codice doppio o prezzo nullo"] = doppie;
  return { voci, scarti };
}

export function parse(buf: Buffer): VoceNormalizzata[] {
  return parseDettagli(buf).voci;
}
