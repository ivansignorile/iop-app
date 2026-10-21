import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "./pdf-testo";

// Estratti reali di `pdftotext -layout -enc UTF-8` (pagine separate da form feed).
const fixture = (nome: string) => readFileSync(new URL(`../fixtures/pdf-testo/${nome}`, import.meta.url));

describe("pdf-testo", () => {
  it("lancia su buffer vuoto o struttura sbagliata", () => {
    expect(() => parse(Buffer.alloc(0))).toThrow(/pdf-testo/);
    expect(() => parse(Buffer.from("CODICE  DESCRIZIONE  QUANTITÀ\nABR26_P.01  Voce  10,00\n"))).toThrow(/pdf-testo/);
    // intestazione giusta ma nessuna voce con prezzo
    expect(() => parse(Buffer.from("CODICE   DESCRIZIONE   U.M.   SIC.€     MAN.%      PREZZO\n"))).toThrow(/pdf-testo/);
  });

  describe("Abruzzo (unità e prezzo su una riga a parte)", () => {
    // pag. 1 e 539 opere edili, pag. 34 e inizio 35 impianti tecnologici
    const voci = parse(fixture("abruzzo.txt"));
    const voce = (c: string) => voci.find((v) => v.codice === c);

    it("legge tutte le voci con prezzo, codici senza ABR26_", () => {
      expect(voci).toHaveLength(48);
      expect(voci.every((v) => !v.codice.startsWith("ABR26_"))).toBe(true);
    });

    it("voce foglia = descrizione dell'articolo + variante (pag. 1)", () => {
      const v = voce("P.02.10.10.a")!;
      expect(v.descrizione.startsWith("Realizzazione di Puntellatura in legname di strutture in genere")).toBe(true);
      expect(v.descrizione.endsWith("— Fornitura e posa in opera senza recupero del materiale")).toBe(true);
      expect(v).toMatchObject({ capitolo: "OPERE PROVVISIONALI", unita_testo: "mc", unita: "mc", prezzo: 1004.29 });
      expect(voce("P.02.10.10.c")).toMatchObject({ unita_testo: "m³/mese", prezzo: 36.15 });
    });

    it("unità su due righe (pag. 539)", () => {
      expect(voce("U.04.20.30.a")).toMatchObject({ unita_testo: "x dm di altezza", prezzo: 9.21 });
      expect(voce("U.04.20.30.a")!.descrizione).toMatch(/^Anello di prolunga per pozzetti pedonali.*— 30x30 cm$/);
    });

    it("prezzo a pagina successiva, senza MAN.% (impianti pag. 34-35)", () => {
      const v = voce("IM.50.10.80.a")!;
      expect(v.descrizione).toMatch(/^Stufa a pellet per produzione di aria calda.*— Resa calorica massima 5,3 kW/);
      expect(v.descrizione).toMatch(/consumo 0,5 ÷ 1,2 kg\/h$/);
      expect(v).toMatchObject({ unita_testo: "Cad", unita: "cad", prezzo: 1232 });
      expect(voce("IM.50.10.60.a")).toMatchObject({ unita_testo: "Cad", prezzo: 444.51 });
      // articolo con "0,00" e senza riga prezzo: non è una voce
      expect(voce("IM.50.10.80")).toBeUndefined();
    });
  });

  describe("Molise (prezzo sulla riga del codice, celle centrate)", () => {
    // indice generale (pag. 1), pag. 29 e 144 dell'Allegato B, inizio dell'errata corrige del 20/05/2026
    const voci = parse(fixture("molise.txt"));
    const voce = (c: string) => voci.find((v) => v.codice === c);

    it("legge tutte le voci con prezzo, codici senza MOL26_", () => {
      expect(voci).toHaveLength(33);
      expect(voci.every((v) => !v.codice.startsWith("MOL26_"))).toBe(true);
    });

    it("descrizione centrata sopra e sotto la riga del codice (pag. 29)", () => {
      const v = voce("A01001a")!;
      expect(v.descrizione).toBe(
        "Scavo di sbancamento effettuato con mezzi meccanici anche in presenza d’acqua fino ad un battente massimo di 20 cm, " +
          "compresa la rimozione di arbusti e ceppaie e trovanti di dimensione non superiore a 0,25 mc, la profilatura delle pareti, " +
          "la regolarizzazione del fondo, il carico sugli automezzi ed il trasporto a rinterro o rilevato nell’ambito del cantiere " +
          "fino ad una distanza massima di 1.500 m: — in rocce sciolte (argilla, sabbia, ghiaia, terreno vegetale e simili)",
      );
      expect(v).toMatchObject({ capitolo: "MOVIMENTI DI TERRA", unita_testo: "mc", prezzo: 8.04 });
      // riga del codice senza testo: la variante va su due righe attorno al codice
      expect(voce("A01002c")!.descrizione).toMatch(
        /— in roccia compatta, senza uso di mine, con l’ausilio di mezzi di demolizione meccanica compreso l’incidenza dello scavo oltre la sezione di calcolo$/,
      );
      expect(voce("A01002c")).toMatchObject({ unita_testo: "mc", prezzo: 118.6 });
      expect(voce("A01005")).toMatchObject({
        descrizione: "Compenso allo scavo se effettuato in presenza di terre argillose",
        unita_testo: "mc",
        prezzo: 19.62,
      });
    });

    it("applica l'errata corrige messa in coda (prezzo mancante nell'Allegato B)", () => {
      const v = voce("A10062b")!;
      expect(v.descrizione).toMatch(/^Rivestimento impermeabilizzante leggero costituito da resine poliureiche pure.*— per ogni mm in più di poliurea pura$/);
      expect(v).toMatchObject({ unita_testo: "mq", prezzo: 22.77 });
      expect(voce("A14042")).toMatchObject({
        descrizione: "Zoccolino areato in legno di faggio, idoneo per pavimentazione per danza anallergici in legno, dimensioni 38 x 48 x 2400 mm",
        unita_testo: "m",
        prezzo: 32,
      });
    });
  });
});
