import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "./toscana-csv";

const dir = join(__dirname, "../fixtures/toscana-csv");
const fixture = (nome: string) => readFileSync(join(dir, nome));

describe("toscana-csv", () => {
  it("buffer vuoto o header sbagliato -> throw", () => {
    expect(() => parse(Buffer.alloc(0))).toThrow(/toscana-csv/);
    expect(() => parse(Buffer.from("a|b|c\n1|2|3\n"))).toThrow(/toscana-csv/);
  });

  it("Firenze: 12 voci, codice senza TOS26_, descrizione dai livelli 2-4", () => {
    const voci = parse(fixture("firenze.csv"));
    expect(voci).toHaveLength(12);
    const scavo = voci.find((v) => v.codice === "01.A04.001.001")!;
    expect(scavo.descrizione).toMatch(/^Oggetto: SCAVO Compreso:.* — Tipo: DI SBANCAMENTO .* — Compreso: accatastamento in cantiere$/);
    expect(scavo).toMatchObject({ unita_testo: "m³", unita: "mc", prezzo: 5.77, capitolo: "Ambito: EDILIZIA CIVILE Categoria: NUOVE COSTRUZIONI" });
    const operaio = voci.find((v) => v.codice === "RU.M10.001.001")!;
    expect(operaio.descrizione).toMatch(/Livello: 4° Operaio: super specializzato$/);
    expect(operaio).toMatchObject({ unita_testo: "ora", prezzo: 43.31 });
    const demolizione = voci.find((v) => v.codice === "01.A03.001.001")!;
    expect(demolizione.descrizione.startsWith("Oggetto: DEMOLIZIONE")).toBe(true);
    expect(demolizione).toMatchObject({ unita_testo: "m³", prezzo: 14.07 });
  });

  it("stesso codice, prezzi diversi tra Firenze e Prato", () => {
    const fi = new Map(parse(fixture("firenze.csv")).map((v) => [v.codice, v.prezzo]));
    const po = new Map(parse(fixture("prato.csv")).map((v) => [v.codice, v.prezzo]));
    expect([...fi.keys()]).toEqual([...po.keys()]);
    expect(fi.get("01.A03.001.001")).toBe(14.07);
    expect(po.get("01.A03.001.001")).toBe(14.12);
    expect(fi.get("RU.M10.001.001")).not.toBe(po.get("RU.M10.001.001"));
  });
});
