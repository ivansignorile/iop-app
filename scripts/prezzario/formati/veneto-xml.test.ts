import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "./veneto-xml";

const fixture = readFileSync(new URL("../fixtures/veneto-xml/elenco-prezzi.xml", import.meta.url));

describe("veneto-xml", () => {
  it("lancia su buffer vuoto o struttura sbagliata", () => {
    expect(() => parse(Buffer.alloc(0))).toThrow(/veneto-xml/);
    expect(() => parse(Buffer.from("<Prezzario><capitoli/></Prezzario>"))).toThrow(/veneto-xml/);
  });

  const voci = parse(fixture);

  it("legge tutte le voci con prezzo > 0 della fixture", () => {
    // 24 prezzi, 2 a importo nullo (01.06.07.d3, 01.06.07.h)
    expect(voci).toHaveLength(22);
    expect(voci.find((v) => v.codice === "01.06.07.h")).toBeUndefined();
  });

  it("toglie il prefisso VEN26- e unisce estesa + testo del prezzo", () => {
    const v = voci.find((x) => x.codice === "01.02.01.00");
    expect(v).toMatchObject({ capitolo: "OPERE EDILI — SCAVI", unita_testo: "m²", unita: "mq", prezzo: 3.47 });
    expect(v?.descrizione).toMatch(/^Scavo di pulizia generale eseguito con mezzi meccanici/);
    expect(v?.descrizione).toMatch(/— SCAVO DI PULIZIA GENERALE FINO ALLA PROFONDITA' DI M 0,20$/);
  });

  it("voci reali", () => {
    const scavo = voci.find((x) => x.codice === "01.02.04.a");
    expect(scavo).toMatchObject({ unita_testo: "m³", unita: "mc", prezzo: 11.89 });
    expect(scavo?.descrizione).toMatch(/^Scavo a sezione obbligata eseguito con mezzi meccanici/);
    expect(scavo?.descrizione).toMatch(/Per profondità di scavo fino a 4\.00 m$/);

    const cartongesso = voci.find((x) => x.codice === "01.06.07.q");
    expect(cartongesso).toMatchObject({ unita_testo: "t", prezzo: 316.25 });
    expect(cartongesso?.descrizione).toMatch(/— Per materiale cartongesso$/);

    const operaio = voci.find((x) => x.codice === "RU.01.01.a");
    expect(operaio).toMatchObject({ unita_testo: "h", unita: "corpo", prezzo: 35.78 });
    expect(operaio?.descrizione).toMatch(/OPERAIO 4° LIVELLO EDILE$/);
  });
});
