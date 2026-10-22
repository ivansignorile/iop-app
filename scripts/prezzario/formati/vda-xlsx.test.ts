import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { correggi, normalizzaCodice, parse } from "./vda-xlsx";

const voci = parse(readFileSync(join(__dirname, "../fixtures/vda-xlsx/vda.xlsx")));
const voce = (codice: string) => voci.find((v) => v.codice === codice);

describe("vda-xlsx: struttura sbagliata", () => {
  it("buffer vuoto → errore", () => {
    expect(() => parse(Buffer.alloc(0))).toThrow(/vda-xlsx/);
  });
  it("foglio senza colonne attese → errore", () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Codice", "Testo"], ["S01.A50.010", "x"]]), "S2026");
    expect(() => parse(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }))).toThrow(/vda-xlsx: nessun foglio/);
  });
});

describe("vda-xlsx: helper", () => {
  it("normalizzaCodice ripulisce i refusi", () => {
    expect(normalizzaCodice("P50,A70")).toBe("P50.A70");
    expect(normalizzaCodice("Nr. 65 S50.N15.003")).toBe("S50.N15.003");
  });
  it("correggi segue codice e occorrenza dell'errata corrige", () => {
    expect(correggi("P08.B30.025", 1)).toBeUndefined();
    expect(correggi("P08.B30.025", 2)).toBe("P08.B30.027");
    expect(correggi("S41.D70", 3)).toBe("S41.D72");
    expect(correggi("S42.M10.015", 2)).toBe("S42.M10.125");
    expect(correggi("S42.M10.010", 1)).toBeNull();
    expect(correggi("S01.A50.010", 1)).toBeUndefined();
  });
});

describe("vda-xlsx: Valle d'Aosta 2026", () => {
  it("38 voci: 2 righe per voce, % scartato, duplicato eliminato", () => {
    expect(voci).toHaveLength(38);
    expect(voce("S00.010.005")).toBeUndefined(); // sovrapprezzo CAM in %
    expect(voci.filter((v) => v.codice === "S43.A11.p.80.80")).toHaveLength(1);
  });
  it("variante = frammento unito al padre, prezzo arrotondato", () => {
    const v = voce("S01.A50.010")!;
    expect(v).toMatchObject({ unita_testo: "m", unita: "ml", prezzo: 81.73, capitolo: "INDAGINI GEOGNOSTICHE, SONDAGGI E RILIEVI" });
    expect(v.descrizione).toMatch(/^Perforazione ad andamento verticale eseguita a rotazione a carotaggio continuo/);
    expect(v.descrizione).toMatch(/— da 0,01 m a 20,00 m dal piano di campagna$/);
    const w = voce("S01.A10.020")!;
    expect(w).toMatchObject({ unita_testo: "cad", prezzo: 926.17 });
    expect(w.descrizione).toMatch(/^Installazione dell’attrezzatura per l’esecuzione di sondaggi a rotazione/);
    expect(w.descrizione).toMatch(/— per distanze superiori ai 300 m$/);
  });
  it("errata corrige applicata", () => {
    expect(voce("P15.H10.005")).toBeUndefined();
    expect(voce("P15.H15.005")!.descrizione).toMatch(/^Tegola bituminosa canadese/);
    expect(voce("P15.I17.005")).toMatchObject({ unita_testo: "kg", unita: "kg", prezzo: 15.25 });
    expect(voce("P15.I17.005")!.descrizione).toMatch(/^Sfiati ed esalatori.* — in acciaio inox o rame spessore 8-10\/10 mm$/);
    expect(voce("P15.I20.015")!.descrizione).toMatch(/^MANTO POLIOLEFINE ARMATO A FISSAGGIO MECCANICO LINEARE/);
    expect(voce("S41.F00.000")).toMatchObject({ unita_testo: "m³", prezzo: 41.01 });
    expect(voce("S41.F00.000")!.descrizione).toMatch(/— Allestimento e accatastamento alberi schiantati$/);
    expect(voce("S41.F13.020")).toMatchObject({ unita_testo: "m", prezzo: 2.34 });
    expect(voce("S41.F05.020")).toBeUndefined();
  });
  it("impianti elettrici: capitolo da riga senza codice, frammenti uniti alla voce precedente", () => {
    expect(voce("P60.A01.001")).toMatchObject({ unita_testo: "kg", prezzo: 19.46, capitolo: "MATERIALI - IMPIANTI ELETTRICI" });
    expect(voce("P60.A04.111")).toMatchObject({ descrizione: "Supporto in resina a 3 moduli — a 4 moduli", prezzo: 3.8 });
    expect(voce("P60.A04.200")!.descrizione).toBe("placca 3p finitura standard");
  });
});
