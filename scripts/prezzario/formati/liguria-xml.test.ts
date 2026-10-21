import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse, unitaLiguria } from "./liguria-xml";

const fixture = readFileSync(new URL("../fixtures/liguria-xml/Prezzario.xml", import.meta.url));

describe("liguria-xml", () => {
  it("lancia su buffer vuoto o struttura sbagliata", () => {
    expect(() => parse(Buffer.alloc(0))).toThrow(/liguria-xml/);
    expect(() => parse(Buffer.from("<Prezzario><Contenuto/></Prezzario>"))).toThrow(/liguria-xml/);
  });

  it("estrae la sigla dell'unità", () => {
    expect(unitaLiguria("metro quadrato (m²)")).toBe("m²");
    expect(unitaLiguria("mcvpp (m³vpp)")).toBe("m³vpp");
    expect(unitaLiguria("metro quadrato cent(m²/cm)")).toBe("m²/cm");
    expect(unitaLiguria("Litri (I,L)")).toBe("L");
    expect(unitaLiguria("Watt")).toBe("Watt");
  });

  const voci = parse(fixture);

  it("legge tutti gli articoli con prezzo > 0 della fixture", () => {
    // 17 articoli, 30.E23.A05.100 ha prezzo 0.00
    expect(voci).toHaveLength(16);
    expect(voci.find((v) => v.codice === "30.E23.A05.100")).toBeUndefined();
  });

  it("voci reali: descrizione voce + articolo", () => {
    const demolizione = voci.find((v) => v.codice === "20.A05.A10.015");
    expect(demolizione).toMatchObject({
      capitolo: "Opere Edili - Nuove Costruzioni — Demolizioni e simili",
      unita_testo: "m³vpp",
      prezzo: 44.22,
    });
    expect(demolizione?.descrizione).toMatch(/^Demolizione completa di fabbricato, eseguita a mano/);
    expect(demolizione?.descrizione).toMatch(/— di tipo civile con struttura portante in mattoni/);

    const sondaggio = voci.find((v) => v.codice === "05.B10.C10.010");
    expect(sondaggio).toMatchObject({ unita_testo: "m", unita: "ml", prezzo: 125.86 });
    expect(sondaggio?.descrizione).toBe(
      "Perforazione ad andamento verticale, eseguito a rotazione a carotaggio continuo del diametro di 101 mm per profondità: — fino a 20 m",
    );

    const smaltimento = voci.find((v) => v.codice === "25.A15.G10.011");
    expect(smaltimento).toMatchObject({ unita_testo: "t", prezzo: 35.42 });
    expect(smaltimento?.descrizione).toMatch(/^Costo di smaltimento presso siti autorizzati/);

    expect(voci.find((v) => v.codice === "20.A05.A20.010")).toMatchObject({ unita_testo: "m³", unita: "mc", prezzo: 24.46 });
  });
});
