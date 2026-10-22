import { readFileSync } from "node:fs";
import { join } from "node:path";
import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { parse, parseDettagli } from "./lazio-csv";

const dir = join(__dirname, "../fixtures/lazio-csv");
const fixture = (nome: string) => readFileSync(join(dir, nome));

describe("lazio-csv", () => {
  it("buffer vuoto o struttura sbagliata -> throw", () => {
    expect(() => parse(Buffer.alloc(0))).toThrow(/lazio-csv/);
    expect(() => parse(Buffer.from("a;b;c\nd;e;f\n"))).toThrow(/lazio-csv/);
    expect(() => parse(Buffer.from(zipSync({ "leggimi.txt": new Uint8Array([1]) })))).toThrow(/nessun CSV/);
  });

  it("parte A in cp1252: gerarchia dal codice, numeri '1 826,34', % scartate", () => {
    const { voci, scarti } = parseDettagli(fixture("parte-a.csv"));
    expect(voci).toHaveLength(33);
    expect(scarti).toEqual({ "maggiorazione percentuale": 1, "riga con prezzo senza codice": 1 });
    const v = voci.find((x) => x.codice === "A1.01.1")!;
    expect(v.descrizione.startsWith("Trasporto dell’attrezzatura di perforazione a rotazione")).toBe(true);
    expect(v).toMatchObject({ unita_testo: "cad", unita: "cad", prezzo: 1826.34, capitolo: "SONDAGGI GEOGNOSTICI A ROTAZIONE" });
    const f = voci.find((x) => x.codice === "A1.01.2.b")!;
    expect(f.descrizione).toMatch(/^Installazione di attrezzatura per sondaggio.* — per distanza superiore a 300 m$/);
    expect(f).toMatchObject({ unita_testo: "cad", prezzo: 360.53 });
    const c = voci.find((x) => x.codice === "A6.01.2.6.5.a")!;
    expect(c.descrizione).toMatch(/^PER IMPIEGHI STRUTTURALI — Calcestruzzo speciale auto-compattante .* — Classe di esposizione ambientale XA2/);
    expect(c).toMatchObject({ unita_testo: "mc", unita: "mc", prezzo: 284.17 });
  });

  it("parte E: codici E01001a, testo introduttivo senza codice e capitolo 'E01.'", () => {
    const voci = parse(fixture("parte-e.csv"));
    expect(voci).toHaveLength(13);
    const v = voci.find((x) => x.codice === "E01001a")!;
    expect(v.descrizione).toMatch(/^Tubo in acciaio senza saldatura a norma UNI EN 10255.* — serie leggera: — diametro nominale 3\/8", spess\. 2 mm$/);
    expect(v).toMatchObject({ unita_testo: "m", unita: "ml", prezzo: 10.72, capitolo: "IMPIANTI IDRO-SANITARI E GAS DOMESTICO" });
  });

  it("parte D: righe di esempio scartate, codici 'D 1.01.1.a'", () => {
    const { voci, scarti } = parseDettagli(fixture("parte-d.csv"));
    expect(voci).toHaveLength(6);
    expect(scarti).toEqual({ "riga di esempio/totale": 12 });
    const v = voci.find((x) => x.codice === "D1.01.1.a")!;
    expect(v.descrizione).toMatch(/^Punto luce e punto di comando sottotraccia.* — punto luce comandato direttamente dal quadro/);
    expect(v).toMatchObject({ unita_testo: "cad", prezzo: 19.36 });
  });

  it("parte H: prezzo su riga senza codice attribuito alla voce madre", () => {
    const voci = parse(fixture("parte-h.csv"));
    expect(voci).toHaveLength(18);
    expect(voci.find((x) => x.codice === "H1.01.7")).toMatchObject({ unita_testo: "mq", prezzo: 100.02 });
    const v = voci.find((x) => x.codice === "H1.02.8")!;
    expect(v.descrizione).toMatch(/^Revisione e restauro di paramento murario.* — revisione di paramento murario in mattoncini/);
    expect(v.prezzo).toBe(159.63);
  });

  it("zip con più CSV: un solo prezzario con tutte le parti", () => {
    const nomi = ["parte-a.csv", "parte-d.csv", "parte-e.csv", "parte-h.csv"];
    const zip = Buffer.from(zipSync(Object.fromEntries(nomi.map((n) => [n, new Uint8Array(fixture(n))]))));
    const voci = parse(zip);
    expect(voci).toHaveLength(33 + 6 + 13 + 18);
    expect(new Set(voci.map((v) => v.codice[0]))).toEqual(new Set(["A", "D", "E", "H"]));
  });
});
