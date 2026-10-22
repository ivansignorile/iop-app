import { describe, expect, it } from "vitest";
import type { VoceNormalizzata } from "./core";
import type { Fonte } from "./fonti";
import { codiciDaCancellare, raggruppa, unisciGruppo } from "./gruppi";

const fonte = (regione: string, ambito: string, file: string): Fonte => ({
  regione, ambito, anno: 2026, titolo: "T", formato: "api-llpp", file, url: "u", licenza: null, attivo: true,
});
const voce = (codice: string): VoceNormalizzata => ({
  codice, capitolo: null, descrizione: "d", unita_testo: "mq", unita: "mq", prezzo: 1,
});

describe("raggruppa", () => {
  it("unisce le fonti dello stesso prezzario (regione, ambito, anno) mantenendo l'ordine", () => {
    const g = raggruppa([fonte("umbria", "", "a"), fonte("toscana", "FI", "f"), fonte("umbria", "", "b"), fonte("toscana", "PO", "p")]);
    expect(g.map((x) => x.map((f) => f.file))).toEqual([["a", "b"], ["f"], ["p"]]);
  });
});

describe("unisciGruppo", () => {
  it("concatena le voci dei file", () => {
    expect(unisciGruppo([[voce("A")], [voce("B")]]).map((v) => v.codice)).toEqual(["A", "B"]);
  });
  it("codice presente in due file dello stesso prezzario -> errore", () => {
    expect(() => unisciGruppo([[voce("A")], [voce("A")]])).toThrow("A");
  });
});

describe("codiciDaCancellare", () => {
  it("restituisce i codici in DB che non ci sono più nella fonte", () => {
    expect(codiciDaCancellare(["A", "B", "C"], new Set(["A", "C", "D"]))).toEqual(["B"]);
  });
});
