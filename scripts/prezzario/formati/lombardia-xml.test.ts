import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse, unitaLombardia } from "./lombardia-xml";

const fixture = readFileSync(new URL("../fixtures/lombardia-xml/prezzario.xml", import.meta.url));

describe("lombardia-xml", () => {
  it("lancia su buffer vuoto o struttura sbagliata", () => {
    expect(() => parse(Buffer.alloc(0))).toThrow(/lombardia-xml/);
    expect(() => parse(Buffer.from("<report><voci></voci></report>"))).toThrow(/lombardia-xml/);
  });

  it("toglie la quantità unitaria dall'unità", () => {
    expect(unitaLombardia("1 m²")).toBe("m²");
    expect(unitaLombardia("1 m² * cm")).toBe("m² * cm");
    expect(unitaLombardia("null cad")).toBe("cad");
    expect(unitaLombardia("100 kg")).toBe("100 kg");
  });

  const voci = parse(fixture);

  it("scarta le voci con prezzo 0", () => {
    // 13 voci, le prime 3 (tubi generici) hanno prezzo 0.00
    expect(voci).toHaveLength(10);
    expect(voci.find((v) => v.codice === "LOM261.RM.87.10.15.D0017.0000.-")).toBeUndefined();
  });

  it("voci reali: codice intero, declaratoria completa", () => {
    const muratura = voci.find((v) => v.codice === "LOM261.OC.EEA.Pa02.C0100.H0002.0005.-");
    expect(muratura).toMatchObject({ capitolo: "OPERA COMPIUTA — EDILIZIA", unita_testo: "m²", unita: "mq", prezzo: 43.14 });
    expect(muratura?.descrizione).toMatch(/^OPERA: Sistema di muratura, in lastre di gesso rivestito;/);
    expect(muratura?.descrizione).toMatch(/LAVORO: Posa\. .*SPECIFICHE TECNICHE: spessore singola lastra/);
    expect(muratura?.descrizione).not.toContain("OP1");

    const ascensore = voci.find((v) => v.codice === "LOM261.OC.EEA.Pa01.M8900.Za001.0000.a");
    expect(ascensore).toMatchObject({ unita_testo: "cad", unita: "cad", prezzo: 32433.4 });
    expect(ascensore?.descrizione).toMatch(/^OPERA: Impianto ascensore, ad azionamento elettrico;/);

    const additivo = voci.find((v) => v.codice === "LOM261.RM.00.10.00.Ba002.0000.0");
    expect(additivo).toMatchObject({ capitolo: "RISORSA MATERIALE — IMPASTI", unita_testo: "m² * cm", prezzo: 4.03 });
    expect(additivo?.descrizione).toMatch(/^Additivo sintetico di composto chimico ossido di ferro;.*Sovrapprezzo$/);

    expect(voci.find((v) => v.codice === "LOM261.RM.00.10.05.K0003.0000.-")).toMatchObject({ unita_testo: "100 kg", prezzo: 27.78 });
  });
});
