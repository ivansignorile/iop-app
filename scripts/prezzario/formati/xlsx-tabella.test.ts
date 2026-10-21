import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { daCp1252, parse, testoUnita } from "./xlsx-tabella";

const fixture = (nome: string) => readFileSync(join(__dirname, "../fixtures/xlsx-tabella", nome));
const voce = (voci: ReturnType<typeof parse>, codice: string) => voci.find((v) => v.codice === codice);

function xlsx(righe: unknown[][], foglio = "Foglio1"): Buffer {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(righe), foglio);
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

describe("xlsx-tabella: struttura sbagliata", () => {
  it("buffer vuoto → errore", () => {
    expect(() => parse(Buffer.alloc(0))).toThrow(/xlsx-tabella/);
  });
  it("foglio senza intestazione nota → errore", () => {
    expect(() => parse(xlsx([["a", "b"], [1, 2]]))).toThrow(/xlsx-tabella: intestazione non riconosciuta/);
  });
  it("intestazione giusta ma nessun prezzo → errore", () => {
    const buf = xlsx([["Numero d'ordine", "Descrizione dell'articolo", "u.m.", "prezzo €"], ["1", "CAPITOLO", null, null]], "Capitolo 1");
    expect(() => parse(buf)).toThrow(/nessuna voce con prezzo/);
  });
});

describe("helper", () => {
  it("testoUnita toglie € / e il punto di cad.", () => {
    expect(testoUnita("€/m")).toBe("m");
    expect(testoUnita("cad.")).toBe("cad");
    expect(testoUnita("n.")).toBe("n.");
  });
  it("daCp1252 corregge i controlli C1", () => {
    expect(daCp1252("all\u0092esterno \u0096 voce")).toBe("all’esterno – voce");
  });
});

describe("xlsx-tabella: Marche 2026", () => {
  const voci = parse(fixture("marche.xlsx"));
  it("27 voci: capitoli senza codice e sovrapprezzi in % scartati", () => {
    expect(voci).toHaveLength(27);
    expect(voce(voci, "04.03.003*.005")).toBeUndefined(); // unità %
  });
  it("voci reali", () => {
    expect(voce(voci, "01.01.001")).toMatchObject({
      capitolo: "01 INDAGINI GEOGNOSTICHE",
      unita_testo: "cad",
      unita: "cad",
      prezzo: 1085.15,
    });
    expect(voce(voci, "01.01.001")!.descrizione).toMatch(/^Trasporto e approntamento dell'attrezzatura di perforazione a rotazione\./);
    expect(voce(voci, "01.01.006")).toMatchObject({ unita_testo: "m", unita: "ml", prezzo: 68.74 });
    expect(voce(voci, "01.01.006")!.descrizione).toMatch(/^Compenso per uso di corone diamantate\./);
    const v = voce(voci, "01.01.013.002")!;
    expect(v).toMatchObject({ unita_testo: "cad", prezzo: 86.81 });
    expect(v.descrizione).toMatch(/^Prelievo di campioni indisturbati impiegando campionatore a pareti sottili\./);
    expect(v.descrizione).toMatch(/Da m 20,01 a m 40\.$/);
    expect(voce(voci, "04.03.003*.003")!.capitolo).toBe("04 OPERE DI CONSOLIDAMENTO E DI RISTRUTTURAZIONE");
  });
});

describe("xlsx-tabella: Puglia 2026", () => {
  const voci = parse(fixture("puglia.xlsx"));
  it("22 voci dal foglio lavorazioni, % scartato", () => {
    expect(voci).toHaveLength(22);
    expect(voce(voci, "01.E02.036f.011")).toBeUndefined();
  });
  it("descrizione = voce + articolo, prezzo = TOTALE_GENERALE", () => {
    const v = voce(voci, "01.E01.001.001")!;
    expect(v).toMatchObject({
      capitolo: "SCAVI, RINTERRI, ESPURGHI E GESTIONE DEI MATERIALI DI RISULTA",
      unita_testo: "m³",
      unita: "mc",
      prezzo: 8.63,
    });
    expect(v.descrizione).toMatch(/^Scavo a sezione aperta effettuato con mezzi meccanici/);
    expect(v.descrizione).toContain(" — in rocce sciolte (argilla, sabbia, ghiaia");
    expect(voce(voci, "01.E01.003.001")).toMatchObject({ unita_testo: "m³", prezzo: 4.33 });
    expect(voce(voci, "01.E01.003.001")!.descrizione).toMatch(/^Scavo di sbancamento, pulizia o scotico/);
    expect(voce(voci, "01.E02.036g.001")).toMatchObject({ unita_testo: "a corpo", unita: "corpo", prezzo: 831.43 });
    expect(voce(voci, "01.E02.036g.001")!.descrizione).toMatch(/— fino a 100 kg$/);
  });
});

describe("xlsx-tabella: Umbria 2025", () => {
  const voci = parse(fixture("umbria.xlsx"));
  it("26 voci da 3 fogli (capitoli 1, 14, S1)", () => {
    expect(voci).toHaveLength(26);
  });
  it("righe .0 = descrizione madre delle figlie", () => {
    const v = voce(voci, "1.1.20.1")!;
    expect(v).toMatchObject({ unita_testo: "cad", prezzo: 184 });
    expect(v.capitolo).toMatch(/^INDAGINI GEOGNOSTICHE E GEOTECNICHE/);
    expect(v.descrizione).toMatch(/^INSTALLAZIONE DI ATTREZZATURA PER SONDAGGIO\./);
    expect(v.descrizione).toMatch(/— Per distanza fino a m 300\.$/);
    expect(voce(voci, "1.1.20.0")).toBeUndefined();
  });
  it("voce senza varianti, madre senza .0 (cap. 14), costi sicurezza", () => {
    expect(voce(voci, "1.1.10")).toMatchObject({ unita_testo: "cad", prezzo: 1125 });
    const v = voce(voci, "14.1.10.1")!;
    expect(v).toMatchObject({ unita_testo: "cad", prezzo: 189, capitolo: "IMPIANTO IDRICO - SANITARIO" });
    expect(v.descrizione).toMatch(/^PREDISPOSIZIONE DI ALLACCIO IDRICO PER APPARECCHI IGIENICO-SANITARI\./);
    expect(v.descrizione).toContain("— Allaccio per lavabo, lavamani");
    expect(voce(voci, "S1.1.10.1")).toMatchObject({ unita_testo: "mq", unita: "mq", prezzo: 16.3 });
    expect(voce(voci, "1.1.40.7.CAM")).toMatchObject({ unita_testo: "m", prezzo: 0.5 });
  });
});
