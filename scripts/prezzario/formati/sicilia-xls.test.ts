import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { parse } from "./sicilia-xls";

const voci = parse(readFileSync(join(__dirname, "../fixtures/sicilia-xls/sicilia.xls")));
const voce = (codice: string) => voci.find((v) => v.codice === codice);

describe("sicilia-xls: struttura sbagliata", () => {
  it("buffer vuoto → errore", () => {
    expect(() => parse(Buffer.alloc(0))).toThrow(/sicilia-xls/);
  });
  it("foglio senza colonne attese → errore", () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Codice", "Testo"], ["SIC24_1.1.1", "x"]]), "Prezzario SICILIA 2024");
    expect(() => parse(XLSX.write(wb, { type: "buffer", bookType: "biff8" }))).toThrow(/sicilia-xls: nessun foglio/);
  });
});

describe("sicilia-xls: Sicilia 2024", () => {
  it("16 voci, sovrapprezzo in % scartato", () => {
    expect(voci).toHaveLength(16);
    expect(voce("1.2.1")).toBeUndefined();
  });
  it("prefisso SIC24_ tolto, descrizione = madre + sottovoce", () => {
    const v = voce("1.1.1.1")!;
    expect(v).toMatchObject({ unita_testo: "m³", unita: "mc", prezzo: 5.33 });
    expect(v.capitolo).toMatch(/^SCAVI, RINTERRI, DEMOLIZIONI/);
    expect(v.descrizione).toMatch(/^Scavo di sbancamento per qualsiasi finalità, per lavori da eseguirsi in ambito extraurbano/);
    expect(v.descrizione).toContain("— in terreni costituiti da argille, limi, sabbie");
  });
  it("voce senza sottovoci e prezzi elementari dell'appendice", () => {
    expect(voce("1.1.2")).toMatchObject({ unita_testo: "m³", prezzo: 42.31 });
    expect(voce("1.1.2")!.descrizione).toMatch(/^Scavo di sbancamento per qualsiasi finalità.*con l'uso di mine/);
    expect(voce("RU24_M1")).toMatchObject({ descrizione: "Tecnico Specializzato", unita_testo: "h", prezzo: 31.62, capitolo: "MANODOPERA" });
    expect(voce("PR24_01M0002")).toMatchObject({ unita_testo: "m³", prezzo: 144.23, capitolo: "MATERIALI" });
  });
  it("caratteri cp1252 corretti", () => {
    const v = voce("1.2.5.1")!;
    expect(v).toMatchObject({ unita_testo: "m³ x km", prezzo: 0.66 });
    expect(v.descrizione).not.toMatch(/[\u0080-\u009f]/);
    expect(v.descrizione).toContain("1.1.1. – 1.1.2");
  });
});
