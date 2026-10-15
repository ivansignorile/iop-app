import { describe, expect, it } from "vitest";

import {
  aBlocchi,
  decidiSceltaMassiva,
  diventaManuale,
  etichettaRegione,
  isSceltaFonte,
  prezzoDiverso,
  riferimentoPrezzario,
} from "./scelta-fonte";

const base = {
  descrizione_prezzario: "Desc prezzario",
  prezzo_prezzario: 10,
  descrizione_propria: "Desc mia",
  prezzo_proprio: 12,
  fonte_scelta: "propria" as const,
};

describe("decidiSceltaMassiva", () => {
  it("non tocca mai le righe manuali", () => {
    expect(decidiSceltaMassiva("prezzario", { ...base, fonte_scelta: "manuale" })).toEqual({ esito: "manuale" });
  });
  it("aggiorna verso il prezzario", () => {
    expect(decidiSceltaMassiva("prezzario", base)).toEqual({
      esito: "aggiorna",
      patch: { descrizione: "Desc prezzario", prezzo_unitario: 10, fonte_scelta: "prezzario" },
    });
  });
  it("lascia invariata la riga già sulla fonte scelta", () => {
    expect(decidiSceltaMassiva("propria", base)).toEqual({ esito: "gia_scelta" });
  });
  it("salta se la fonte manca", () => {
    expect(decidiSceltaMassiva("propria", { ...base, descrizione_propria: null, fonte_scelta: "prezzario" })).toEqual({
      esito: "senza_fonte",
    });
    expect(decidiSceltaMassiva("prezzario", { ...base, prezzo_prezzario: null })).toEqual({ esito: "senza_fonte" });
  });
  it("gestisce righe senza fonte (null)", () => {
    expect(decidiSceltaMassiva("prezzario", { ...base, fonte_scelta: null }).esito).toBe("aggiorna");
  });
});

describe("diventaManuale", () => {
  it("ignora spazi ai bordi", () => {
    expect(diventaManuale("prezzario", "Testo ", "Testo")).toBe(false);
  });
  it("rileva una modifica reale", () => {
    expect(diventaManuale("propria", "Testo", "Testo diverso")).toBe(true);
  });
  it("non cambia righe manuali o senza fonte", () => {
    expect(diventaManuale("manuale", "a", "b")).toBe(false);
    expect(diventaManuale(null, "a", "b")).toBe(false);
    expect(diventaManuale(undefined, "a", "b")).toBe(false);
  });
});

describe("prezzoDiverso", () => {
  it("rileva un prezzo ritoccato", () => {
    expect(prezzoDiverso("prezzario", 10, 11)).toBe(true);
    expect(prezzoDiverso("propria", "12.50", 12.4)).toBe(true);
  });
  it("tollera differenze sotto il mezzo centesimo", () => {
    expect(prezzoDiverso("prezzario", 10, 10.004)).toBe(false);
    expect(prezzoDiverso("propria", "12.50", 12.5)).toBe(false);
  });
  it("non cambia righe manuali, senza fonte o senza prezzo di fonte", () => {
    expect(prezzoDiverso("manuale", 10, 20)).toBe(false);
    expect(prezzoDiverso(null, 10, 20)).toBe(false);
    expect(prezzoDiverso(undefined, 10, 20)).toBe(false);
    expect(prezzoDiverso("prezzario", null, 20)).toBe(false);
  });
});

describe("helper", () => {
  it("isSceltaFonte accetta solo la whitelist", () => {
    expect(isSceltaFonte("prezzario")).toBe(true);
    expect(isSceltaFonte("propria")).toBe(true);
    expect(isSceltaFonte("manuale")).toBe(false);
    expect(isSceltaFonte(1)).toBe(false);
  });
  it("aBlocchi spezza in blocchi", () => {
    expect(aBlocchi([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(aBlocchi([], 20)).toEqual([]);
  });
  it("etichettaRegione capitalizza", () => {
    expect(etichettaRegione("campania")).toBe("Campania");
    expect(etichettaRegione("emilia_romagna")).toBe("Emilia Romagna");
    expect(etichettaRegione(null)).toBe("");
  });
  it("riferimentoPrezzario solo con fonte prezzario e codice", () => {
    expect(riferimentoPrezzario("prezzario", "E.01.010", "campania")).toBe(
      "Rif. Prezzario Regione Campania – E.01.010",
    );
    expect(riferimentoPrezzario("prezzario", "X1", "")).toBe("Rif. Prezzario regionale – X1");
    expect(riferimentoPrezzario("propria", "X1", "campania")).toBeNull();
    expect(riferimentoPrezzario("prezzario", null, "campania")).toBeNull();
  });
});
