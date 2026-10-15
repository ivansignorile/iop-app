import { describe, expect, it } from "vitest";
import { mapUnita, normalizzaPrezzario, type ArticoloApi, type PrezzoApi } from "./parse";

describe("mapUnita", () => {
  it.each([
    ["mq", "mq"], ["m²", "mq"], ["m2", "mq"], ["m", "ml"], ["ml", "ml"], ["mc", "mc"], ["m³", "mc"],
    ["cad", "cad"], ["cadauno", "cad"], ["n.", "cad"], ["cad/30gg", "cad"], ["mq/30 gg", "mq"],
    ["kg", "kg"], ["giorno", "giorno"], ["h", "corpo"], ["a corpo", "corpo"], ["%", "corpo"],
  ])("%s -> %s", (input, atteso) => {
    expect(mapUnita(input)).toBe(atteso);
  });
});

const articoli: ArticoloApi[] = [
  { c: "CAM26_E08", l: 1, d: "OPERE EDILI - MURATURE", u: null },
  { c: "CAM26_E08.010", l: 2, d: "Murature", u: null },
  { c: "CAM26_E08.010.010", l: 3, d: "Tufo", u: null },
  { c: "CAM26_E08.010.010.A", l: 4, d: "Muratura  di tufo\n spessore 12 cm", u: "mq" },
  { c: "CAM26_E08.010.010.B", l: 4, d: "Zero", u: "mq" },
  { c: "CAM26_E08.010.010.C", l: 4, d: "Senza unita", u: null },
];
const prezzi: PrezzoApi[] = [
  { c: "CAM26_E08.010.010.A", z: "36.12000" },
  { c: "CAM26_E08.010.010.B", z: "0" },
  { c: "CAM26_E08.010.010.C", z: 10.004 },
];

describe("normalizzaPrezzario", () => {
  it("normalizza e scarta voci senza prezzo", () => {
    const r = normalizzaPrezzario(articoli, prezzi);
    expect(r).toHaveLength(2);
    expect(r[0]).toEqual({
      codice: "E08.010.010.A", capitolo: "OPERE EDILI - MURATURE",
      descrizione: "Muratura di tufo spessore 12 cm", unita_testo: "mq", unita: "mq", prezzo: 36.12,
    });
    expect(r[1]).toMatchObject({ codice: "E08.010.010.C", unita: "corpo", unita_testo: "a corpo", prezzo: 10 });
  });
  it("deduplica per codice", () => {
    const r = normalizzaPrezzario([...articoli, articoli[3]], prezzi);
    expect(r.filter((v) => v.codice === "E08.010.010.A")).toHaveLength(1);
  });
  it("scarta articolo l4 senza prezzo nella mappa", () => {
    expect(normalizzaPrezzario(articoli, [])).toHaveLength(0);
  });
});
