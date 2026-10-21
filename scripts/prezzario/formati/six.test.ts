import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "./six";

const fixture = (nome: string) => readFileSync(join(__dirname, "../fixtures/six", nome));

describe("six: struttura non valida", () => {
  it("buffer vuoto -> throw", () => {
    expect(() => parse(Buffer.alloc(0))).toThrow(/six: file vuoto/);
  });
  it("XML senza Documento -> throw", () => {
    expect(() => parse(Buffer.from("<prezzi><voce/></prezzi>"))).toThrow(/six: manca <Documento>/);
  });
  it("Documento senza prezzario -> throw", () => {
    expect(() => parse(Buffer.from('<Documento xmlns="six.xsd"><intestazione/></Documento>'))).toThrow(/six: manca <prezzario>/);
  });
  it("prodotti senza prezzo -> throw", () => {
    const xml = '<Documento><prezzario><prodotto prdId="A"><prdDescrizione breve="X"/></prodotto></prezzario></Documento>';
    expect(() => parse(Buffer.from(xml))).toThrow(/six: nessun <prodotto> con <prdQuotazione>/);
  });
});

describe("six: Emilia-Romagna (iso-8859-1, gruppi Eldasoft)", () => {
  const voci = parse(fixture("emilia-romagna.xml"));
  const voce = (c: string) => voci.find((v) => v.codice === c);

  it("numero voci", () => {
    expect(voci).toHaveLength(15);
  });
  it("A01.001.005.a: estesa del padre + sottovoce, capitolo dai gruppi", () => {
    const v = voce("A01.001.005.a");
    expect(v?.descrizione.startsWith("Scavo di sbancamento effettuato con mezzi meccanici anche in presenza d'acqua")).toBe(true);
    expect(v?.descrizione.endsWith("— in rocce sciolte (argilla, sabbia, ghiaia, terreno vegetale e simili)")).toBe(true);
    expect(v).toMatchObject({ unita_testo: "m³", unita: "mc", prezzo: 5.47, capitolo: "A01 - MOVIMENTI DI TERRA" });
  });
  it("A01.004.005.b", () => {
    const v = voce("A01.004.005.b");
    expect(v?.descrizione.startsWith("Scavo a sezione obbligata, fino alla profondità di 2 m")).toBe(true);
    expect(v).toMatchObject({ unita_testo: "m³", prezzo: 13 });
  });
  it("A02.016.015.a: &#191; diventa apostrofo", () => {
    const v = voce("A02.016.015.a");
    expect(v?.descrizione.startsWith("Esecuzione di rilievo 'Mise a la mase' con primo elettrodo")).toBe(true);
    expect(v?.descrizione).not.toContain("¿");
    expect(v).toMatchObject({ unita_testo: "cad", unita: "cad", prezzo: 20.3 });
  });
});

describe("six: Friuli Venezia Giulia (S.T.R.)", () => {
  const voci = parse(fixture("friuli-venezia-giulia.xml"));
  const voce = (c: string) => voci.find((v) => v.codice === c);

  it("numero voci", () => {
    expect(voci).toHaveLength(10);
  });
  it("01.1.AB1.01.A: sottovoce con estesa del padre", () => {
    const v = voce("01.1.AB1.01.A");
    expect(v?.descrizione.startsWith("Puntellazione di strutture orizzontali di qualsiasi tipo")).toBe(true);
    expect(v?.descrizione.endsWith("— Puntellazione di travi, rampe scale, solai piani e di copertura fino a 3 m di altezza di puntellazione")).toBe(true);
    expect(v).toMatchObject({ unita_testo: "m²", unita: "mq", prezzo: 27.32, capitolo: "OPERE PROVVISIONALI" });
  });
  it("01.1.AB1.02: voce con prezzo diretto (titolo + estesa)", () => {
    const v = voce("01.1.AB1.02");
    expect(v?.descrizione.startsWith("PUNTELLAZIONI DI STRUTTURE VERTICALI — Puntellazioni di strutture murarie verticali")).toBe(true);
    expect(v).toMatchObject({ unita_testo: "m²", prezzo: 62.09 });
  });
  it("01.1.AB1.03.B: sottovoce già citata nel padre resta in coda", () => {
    expect(voce("01.1.AB1.03.B")?.descrizione.endsWith("— Controventature orizzontali")).toBe(true);
  });
  it("10.1.BY1.01.A", () => {
    const v = voce("10.1.BY1.01.A");
    expect(v?.descrizione.startsWith("RIMOZIONE DI MACERIE — Esecuzione della rimozione di macerie")).toBe(true);
    expect(v).toMatchObject({ unita_testo: "m³", unita: "mc", prezzo: 5.99, capitolo: "SUOLO" });
  });
});

describe("six: Trento (UTF-8 con BOM, Prometeo)", () => {
  const voci = parse(fixture("trento.xml"));
  const voce = (c: string) => voci.find((v) => v.codice === c);

  it("numero voci", () => {
    expect(voci).toHaveLength(9);
  });
  it("B.02.10.0010.007: demolizione di fabbricati, volumetria <= 5000 m³, 12.00 €/m³", () => {
    const v = voce("B.02.10.0010.007");
    expect(v?.descrizione.startsWith("DEMOLIZIONE DI FABBRICATI — Demolizione completa di fabbricati esistenti")).toBe(true);
    expect(v?.descrizione.endsWith("— volumetria <= 5000 m³")).toBe(true);
    expect(v).toMatchObject({ unita_testo: "m³", unita: "mc", prezzo: 12, capitolo: "OPERE EDILI" });
  });
  it("B.02.10.0010.008", () => {
    expect(voce("B.02.10.0010.008")).toMatchObject({ unita_testo: "m³", prezzo: 7.26 });
  });
  it("A.01.05.0010.005: operaio specializzato", () => {
    const v = voce("A.01.05.0010.005");
    expect(v?.descrizione.startsWith("LAVORI GENIO CIVILE — Prezzo medio orario")).toBe(true);
    expect(v?.descrizione.endsWith("— operaio specializzato")).toBe(true);
    expect(v).toMatchObject({ unita_testo: "h", prezzo: 41.69 });
  });
});
