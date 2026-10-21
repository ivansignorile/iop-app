import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "./easy-xml";

const fixture = (nome: string) => readFileSync(join(__dirname, "../fixtures/easy-xml", nome));

describe("easy-xml", () => {
  it("lancia su buffer vuoto o struttura sbagliata", () => {
    expect(() => parse(Buffer.from(""))).toThrow(/easy-xml/);
    expect(() => parse(Buffer.from("<?xml version='1.0'?><Listino><Voce/></Listino>"))).toThrow(/easy-xml/);
    expect(() =>
      parse(Buffer.from('<EASY:Prezzario xmlns:EASY="x"><EASY:Contenuto></EASY:Contenuto></EASY:Prezzario>')),
    ).toThrow(/easy-xml: nessun EASY:Articolo/);
  });

  it("Piemonte 2026: voce + articolo, errata corrige già incorporata, voci senza prezzo scartate", () => {
    const voci = parse(fixture("piemonte-2026.xml"));
    expect(voci).toHaveLength(29); // 30 articoli, 27.A05.A05.005 senza prezzo
    const per = new Map(voci.map((v) => [v.codice, v]));

    const scotico = per.get("01.A01.A05.010")!;
    expect(scotico.descrizione).toMatch(/^Esecuzione di scotico dello strato superficiale/);
    expect(scotico.descrizione).toMatch(/— In assenza di alberi$/);
    expect(scotico).toMatchObject({ capitolo: "SCAVI", unita_testo: "m³", unita: "mc", prezzo: 5.91 });

    expect(per.get("01.A01.A05.020")).toMatchObject({ unita_testo: "m³", prezzo: 7.21 });
    // DD 1433 del 23/07/2026: 186,99 → 198,05
    expect(per.get("26.A02.A16.100")).toMatchObject({ unita_testo: "m²", unita: "mq", prezzo: 198.05 });
    expect(per.get("26.A02.A16.100")!.descrizione).toMatch(/^Muratura in pietra\..*— In Pietra di Luserna a spacco da cm 4 a cm 6$/);
    expect(per.get("PR060.M005.000.025")).toMatchObject({
      descrizione: "Multistrato in pioppo (Populus spp.) — Spessore mm 16",
      unita_testo: "m²",
      prezzo: 20.29,
    });
    // foglia "..." = stessa descrizione del padre
    expect(per.get("PR050.M055.000.000")!.descrizione).toBe("Molle");
    expect(per.has("27.A05.A05.005")).toBe(false);
    expect(voci.every((v) => !v.codice.startsWith("PIE26_"))).toBe(true);
  });

  it("Bolzano 2026: 5 livelli, capitolo dal titolo breve, prezzo vuoto e voci non ufficiali scartate", () => {
    const voci = parse(fixture("bolzano-2026.xml"));
    expect(voci).toHaveLength(14); // 19 articoli: 4 senza prezzo, 1 "VOCE NON UFFICIALE" (ZA.…)
    const per = new Map(voci.map((v) => [v.codice, v]));

    const muratura = per.get("02.07.01.01.B")!;
    expect(muratura.descrizione).toMatch(/^Muratura di mattoni pieni UNI, dimensioni 5,5x12x25 cm/);
    expect(muratura.descrizione).toMatch(/— con malta bastarda della classe M5$/);
    expect(muratura).toMatchObject({
      capitolo: "Murature in pietra artificiale (blocchi, laterizi)",
      unita_testo: "m3",
      unita: "mc",
      prezzo: 751.15,
    });
    expect(per.get("01.01.01.01A.01")).toMatchObject({
      descrizione: "Settore edile/civile — Operaio altamente specializzato o maestro professionale",
      unita_testo: "h",
      prezzo: 46.68,
    });
    expect(per.get("01.04.09.60.D")).toMatchObject({
      descrizione: "Tessuto non tessuto in polipropilene — TNT in PP - 500 g/m²",
      unita_testo: "m2",
      unita: "mq",
      prezzo: 3.01,
    });
    // "**Caldaie**" → grassetto markdown tolto
    expect(per.get("13.90.01.01.20A")).toMatchObject({ unita_testo: "cad", prezzo: 12749.87 });
    expect(per.get("13.90.01.01.20A")!.descrizione).toMatch(/^Caldaie — Caldaia a gassificazione di ceppi di legno/);
    expect(per.has("80.01.01.01.A")).toBe(false);
    expect(per.has("01.02.16.10.A")).toBe(false);
    expect(per.has("ZA.02.90.01.01")).toBe(false);
    expect(voci.every((v) => !v.codice.startsWith("BOL26_"))).toBe(true);
  });

  it("Calabria 2025: livelli senza descrizionebreve, capitolo accorciato, prezzi a 5 decimali arrotondati", () => {
    const voci = parse(fixture("calabria-2025.xml"));
    expect(voci).toHaveLength(20);
    const per = new Map(voci.map((v) => [v.codice, v]));

    const bonifica = per.get("01.A01.001.001")!;
    expect(bonifica.descrizione).toMatch(
      /^Localizzazione, bonifica e scavi stratigrafici — Localizzazione e bonifica delle aree mediante ricerca superficiale/,
    );
    expect(bonifica).toMatchObject({ capitolo: "BONIFICA DA ORDIGNI BELLICI", unita_testo: "m²", prezzo: 1.56 });
    expect(per.get("PR.P15.205.002")).toMatchObject({
      capitolo: "MATERIALI PLASTICI E COMPOSITI",
      descrizione: "Pozzetto di cacciata in polietilene monoblocco — tipo chiuso h.80 cm",
      unita_testo: "cad",
      unita: "cad",
      prezzo: 502.97,
    });
    expect(per.get("AT.N01.001.043")).toMatchObject({ capitolo: "MACCHINE OPERATRICI", unita_testo: "ora", prezzo: 32.18 });
    expect(voci.every((v) => (v.capitolo ?? "").length <= 120)).toBe(true);
    expect(voci.every((v) => !v.codice.startsWith("CAL25_"))).toBe(true);
  });
});
