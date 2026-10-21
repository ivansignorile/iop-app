import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { decodifica, parse, riparaCp850 } from "./basilicata-xml";

// La fixture è salvata come il file ufficiale: UTF-16LE con BOM e dichiarazione encoding="UTF-8".
const fixture = readFileSync(new URL("../fixtures/basilicata-xml/prezzario.xml", import.meta.url));

describe("basilicata-xml", () => {
  it("lancia su buffer vuoto o struttura sbagliata", () => {
    expect(() => parse(Buffer.alloc(0))).toThrow(/basilicata-xml/);
    expect(() => parse(Buffer.from("<prezzario><settore/></prezzario>"))).toThrow(/basilicata-xml/);
  });

  it("decodifica in base al BOM", () => {
    expect(fixture.subarray(0, 2)).toEqual(Buffer.from([0xff, 0xfe]));
    expect(decodifica(fixture).startsWith('<?xml version="1.0" encoding="UTF-8"')).toBe(true);
    expect(decodifica(Buffer.from("﻿<a/>", "utf8"))).toBe("<a/>");
  });

  it("ripara il testo UTF-8 letto come CP850", () => {
    expect(riparaCp850("gi├á predisposte, pi├╣ assi, 10┬░C, 1├À2 cm, nonch├®")).toBe(
      "già predisposte, più assi, 10°C, 1÷2 cm, nonché",
    );
    expect(riparaCp850("città già più")).toBe("città già più");
  });

  const voci = parse(fixture);

  it("legge tutte le sottovoci della fixture", () => {
    // 15 sottovoci: D3.05.013.01 compare 3 volte (tiene la prima); la voce B.18.150 non ha sottovoci
    expect(voci).toHaveLength(13);
    expect(voci.some((v) => v.codice.startsWith("B.18.150"))).toBe(false);
  });

  it("voci reali: codice Cap.Cat.Voce.Sottovoce, descrizione voce + sottovoce", () => {
    expect(voci.find((v) => v.codice === "A.01.001.01")).toEqual({
      codice: "A.01.001.01",
      capitolo: "NOLEGGI",
      descrizione: "Veicolo peso totale: — fino a kg. 1.200 (portata kg. 600) a caldo",
      unita_testo: "ora",
      unita: "corpo",
      prezzo: 63.29,
    });

    const corrimano = voci.find((v) => v.codice === "B.18.149.03");
    expect(corrimano).toMatchObject({
      capitolo: "OPERE EDILI — PORTE, INFISSI E PORTE TAGLIAFUOCO",
      unita_testo: "m",
      unita: "ml",
      prezzo: 21.61,
    });
    expect(corrimano?.descrizione).toMatch(/^Posa in opera di porte, portoncini, portoni, corrimano e imbotti/);
    expect(corrimano?.descrizione).toMatch(/— Posa in opera di corrimano forniti dalla stazione appaltante$/);

    const cavo = voci.find((v) => v.codice === "D3.05.013.03");
    expect(cavo).toMatchObject({ unita_testo: "m", prezzo: 7.54 });
    expect(cavo?.descrizione).toMatch(/^Fornitura e posa in opera di cavo coassiale per discesa d'antenna TV/);
    expect(cavo?.descrizione).toContain("tubazioni già predisposte");
    expect(cavo?.descrizione).toMatch(/— cavo diametro esterno 6,80 mm$/);
  });
});
