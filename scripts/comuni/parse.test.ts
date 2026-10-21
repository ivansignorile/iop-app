import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseComuni, slugRegione } from "./parse";

describe("slugRegione", () => {
  it.each([
    ["Trentino-Alto Adige/Südtirol", "TN", "trento"],
    ["Trentino-Alto Adige/Südtirol", "BZ", "bolzano"],
    ["Valle d'Aosta/Vallée d'Aoste", "AO", "valle-d-aosta"],
    ["Friuli-Venezia Giulia", "UD", "friuli-venezia-giulia"],
    ["Emilia-Romagna", "FC", "emilia-romagna"],
    ["Campania", "NA", "campania"],
  ])("%s (%s) -> %s", (regione, provincia, atteso) => {
    expect(slugRegione(regione, provincia)).toBe(atteso);
  });
});

describe("parseComuni", () => {
  const righe = parseComuni(readFileSync("scripts/comuni/fixtures/comuni.json"));
  it("legge tutti i comuni della fixture", () => {
    expect(righe).toHaveLength(9);
  });
  it("Prato è in provincia PO, Toscana", () => {
    expect(righe.find((r) => r.nome === "Prato")).toEqual({
      codice_istat: "100005", nome: "Prato", provincia: "PO", regione: "toscana",
    });
  });
  it("Bolzano va sulla provincia autonoma", () => {
    expect(righe.find((r) => r.nome === "Bolzano")?.regione).toBe("bolzano");
  });
  it("file non valido -> errore", () => {
    expect(() => parseComuni(Buffer.from("{}"))).toThrow("comuni:");
  });
});
