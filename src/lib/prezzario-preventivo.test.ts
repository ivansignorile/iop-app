import { describe, expect, it } from "vitest";
import { etichettaPrezzario, nomeEnte, prezzarioRiga } from "./prezzario-preventivo";
import { riferimentoPrezzario } from "./scelta-fonte";

describe("nomeEnte", () => {
  it.each([
    ["campania", "Regione Campania"],
    ["valle-d-aosta", "Regione Valle d'Aosta"],
    ["friuli-venezia-giulia", "Regione Friuli Venezia Giulia"],
    ["emilia-romagna", "Regione Emilia-Romagna"],
    ["trento", "Provincia autonoma di Trento"],
    ["bolzano", "Provincia autonoma di Bolzano"],
    ["", ""],
  ])("%s -> %s", (regione, atteso) => {
    expect(nomeEnte(regione)).toBe(atteso);
  });
});

describe("etichettaPrezzario", () => {
  const toscanaFi = { id: "1", titolo: "Prezzario Regione Toscana 2026", regione: "toscana", ambito: "FI", fallback: false };
  it("aggiunge la provincia ai listini provinciali", () => {
    expect(etichettaPrezzario(toscanaFi, "campania")).toEqual({
      titolo: "Prezzario Regione Toscana 2026 — Firenze",
      avviso: null,
    });
  });
  it("avvisa quando il comune non è riconosciuto", () => {
    const campania = { id: "2", titolo: "Prezzario Regione Campania 2026", regione: "campania", ambito: "", fallback: true };
    expect(etichettaPrezzario(campania, "campania")).toEqual({
      titolo: "Prezzario Regione Campania 2026",
      avviso: "Comune non riconosciuto: uso il prezzario di Campania.",
    });
  });
  it("senza prezzario usa la regione dell'organizzazione", () => {
    expect(etichettaPrezzario(null, "campania")).toEqual({ titolo: "Prezzario Campania", avviso: null });
  });
});

describe("riferimentoPrezzario per ente e provincia", () => {
  it("listino provinciale", () => {
    expect(riferimentoPrezzario("prezzario", "TOS26_01", "toscana", "FI")).toBe(
      "Rif. Prezzario Regione Toscana (Firenze) – TOS26_01",
    );
  });
  it("provincia autonoma", () => {
    expect(riferimentoPrezzario("prezzario", "B.02.10", "trento")).toBe(
      "Rif. Prezzario Provincia autonoma di Trento – B.02.10",
    );
  });
});

describe("prezzarioRiga", () => {
  const mappa = { v1: { regione: "campania", ambito: "" } };
  const preventivo = { regione: "toscana", ambito: "FI" };
  it("usa il prezzario da cui viene la voce", () => {
    expect(prezzarioRiga("v1", mappa, preventivo, "lazio")).toEqual({ regione: "campania", ambito: "" });
  });
  it("senza voce collegata usa quello del preventivo", () => {
    expect(prezzarioRiga(null, mappa, preventivo, "lazio")).toEqual(preventivo);
  });
  it("senza prezzario usa la regione dell'organizzazione", () => {
    expect(prezzarioRiga("v9", mappa, null, "lazio")).toEqual({ regione: "lazio", ambito: "" });
  });
});
