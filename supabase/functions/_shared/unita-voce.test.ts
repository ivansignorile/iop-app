// supabase/functions/_shared/unita-voce.test.ts
import { describe, expect, it } from "vitest";

import { AVVISO_UNITA_DIVERSA, eACorpo, unitaDaVoci } from "./unita-voce";

describe("eACorpo", () => {
  it("riconosce le varianti di a corpo", () => {
    for (const t of ["a corpo", "A Corpo ", "corpo", "a.c.", "AC"]) expect(eACorpo(t)).toBe(true);
  });
  it("h, ha, % non sono a corpo", () => {
    for (const t of ["h", "ha", "%", "t"]) expect(eACorpo(t)).toBe(false);
  });
});

describe("unitaDaVoci", () => {
  it("nessuna voce → corpo senza avviso", () => {
    expect(unitaDaVoci(null, null)).toEqual({ unita: "corpo", avviso: null });
  });
  it("solo prezzario con unità normale", () => {
    expect(unitaDaVoci({ unita: "mq", unita_testo: "m²" }, null)).toEqual({ unita: "mq", avviso: null });
  });
  it("solo prezzario a corpo vero → nessun avviso", () => {
    expect(unitaDaVoci({ unita: "corpo", unita_testo: "a corpo" }, null)).toEqual({ unita: "corpo", avviso: null });
  });
  it("solo prezzario 'corpo' con testo h → resta corpo con avviso sul testo", () => {
    expect(unitaDaVoci({ unita: "corpo", unita_testo: "h" }, null)).toEqual({
      unita: "corpo",
      avviso: "Unità del prezzario: h. Verifica quantità e prezzo.",
    });
  });
  it("solo propria → sua unità", () => {
    expect(unitaDaVoci(null, { unita: "ml" })).toEqual({ unita: "ml", avviso: null });
  });
  it("entrambe con stessa unità → nessun avviso", () => {
    expect(unitaDaVoci({ unita: "mq", unita_testo: "m²" }, { unita: "mq" })).toEqual({ unita: "mq", avviso: null });
  });
  it("entrambe con unità diverse → unità della propria e avviso", () => {
    expect(unitaDaVoci({ unita: "mq", unita_testo: "m²" }, { unita: "corpo" })).toEqual({
      unita: "corpo",
      avviso: AVVISO_UNITA_DIVERSA,
    });
  });
  it("entrambe 'corpo' ma prezzario in h → unità diversa", () => {
    expect(unitaDaVoci({ unita: "corpo", unita_testo: "%" }, { unita: "corpo" })).toEqual({
      unita: "corpo",
      avviso: AVVISO_UNITA_DIVERSA,
    });
  });
});
