import { describe, expect, it } from "vitest";
import { finalizza, numeroIt, pulisci, senzaPrefisso, unisci } from "./core";

describe("numeroIt", () => {
  it.each([
    ["1 826,34", 1826.34],
    ["1.826,34", 1826.34],
    ["81.7345", 81.7345],
    ["12,5", 12.5],
    ["€ 43,14", 43.14],
    [5.91, 5.91],
  ] as const)("%s -> %s", (input, atteso) => {
    expect(numeroIt(input)).toBe(atteso);
  });
  it.each(["", "  ", null, undefined, "n.d."])("%s -> null", (input) => {
    expect(numeroIt(input)).toBeNull();
  });
});

describe("pulisci", () => {
  it("toglie _x000D_, a capo, NBSP e spazi multipli", () => {
    expect(pulisci("a_x000D_\n  b  c ")).toBe("a b c");
  });
  it("null diventa stringa vuota", () => {
    expect(pulisci(null)).toBe("");
  });
});

describe("unisci", () => {
  it("unisce padre e voce", () => {
    expect(unisci("Muratura in mattoni", "con malta M5")).toBe("Muratura in mattoni — con malta M5");
  });
  it("scarta parti vuote", () => {
    expect(unisci("Scotico", null, "")).toBe("Scotico");
  });
  it("scarta la parte già contenuta nella precedente", () => {
    expect(unisci("Scavo di sbancamento in terreno", "Scavo di sbancamento")).toBe("Scavo di sbancamento in terreno");
  });
});

describe("senzaPrefisso", () => {
  it("toglie il prefisso di fonte", () => {
    expect(senzaPrefisso("PIE26_01.A01.A05.010")).toBe("01.A01.A05.010");
  });
  it("lascia i codici senza prefisso", () => {
    expect(senzaPrefisso("LOM261.OC.EEA.Pa02")).toBe("LOM261.OC.EEA.Pa02");
  });
});

describe("finalizza", () => {
  it("arrotonda, scarta e deduplica", () => {
    const r = finalizza([
      { codice: "S01.A50.010", descrizione: "Perforazione", unita_testo: "m", prezzo: 81.7345 },
      { codice: "S01.A50.010", descrizione: "Doppione", unita_testo: "m", prezzo: 99 },
      { codice: "S01.A50.020", descrizione: "Zero", unita_testo: "m", prezzo: 0 },
      { codice: "S01.A50.030", descrizione: "  ", unita_testo: "m", prezzo: 5 },
      { codice: "S01.A50.040", descrizione: "Nullo", unita_testo: "m", prezzo: null },
      { codice: "S01.A50.050", capitolo: "Sondaggi", descrizione: "Senza unità", unita_testo: null, prezzo: 3 },
    ]);
    expect(r).toEqual([
      { codice: "S01.A50.010", capitolo: null, descrizione: "Perforazione", unita_testo: "m", unita: "ml", prezzo: 81.73 },
      { codice: "S01.A50.050", capitolo: "Sondaggi", descrizione: "Senza unità", unita_testo: "a corpo", unita: "corpo", prezzo: 3 },
    ]);
  });
});
