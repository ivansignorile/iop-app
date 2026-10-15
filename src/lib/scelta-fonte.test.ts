import { describe, expect, it } from "vitest";

import {
  aBlocchi,
  avvisoDaTenere,
  decidiSceltaMassiva,
  diventaManuale,
  etichettaRegione,
  isAvvisoUnita,
  isSceltaFonte,
  modificataSenzaFonte,
  normalizzaFineRiga,
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
      patch: { descrizione: "Desc prezzario", prezzo_unitario: 10, fonte_scelta: "prezzario", abbinamento_avviso: null },
    });
  });
  it("cancella un avviso non di unità quando aggiorna", () => {
    const d = decidiSceltaMassiva("prezzario", { ...base, abbinamento_avviso: "Nessuna voce nella tua libreria: usata la voce del prezzario." });
    expect(d.esito === "aggiorna" && d.patch.abbinamento_avviso).toBeNull();
  });
  it("lascia da verificare a mano le righe con unità diversa", () => {
    expect(
      decidiSceltaMassiva("prezzario", { ...base, abbinamento_avviso: "Unità diversa nel prezzario (h vs m²): verifica il prezzo." }),
    ).toEqual({ esito: "da_verificare" });
    expect(
      decidiSceltaMassiva("prezzario", { ...base, fonte_scelta: null, abbinamento_avviso: "Unità del prezzario: h. Verifica quantità e prezzo." }),
    ).toEqual({ esito: "da_verificare" });
  });
  it("con unità diversa le righe manuali restano manuali", () => {
    expect(decidiSceltaMassiva("prezzario", { ...base, fonte_scelta: "manuale", abbinamento_avviso: "Unità diversa" })).toEqual({
      esito: "manuale",
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
  it("ignora la differenza CRLF/LF tra textarea e descrizione salvata", () => {
    expect(diventaManuale("prezzario", "Riga 1\nRiga 2", "Riga 1\r\nRiga 2")).toBe(false);
    expect(diventaManuale("propria", "Riga 1\r\nRiga 2", "Riga 1\nRiga 2")).toBe(false);
    expect(diventaManuale("propria", "Riga 1\rRiga 2", "Riga 1\nRiga 2")).toBe(false);
  });
  it("rileva comunque un cambio reale su testo multiriga", () => {
    expect(diventaManuale("prezzario", "Riga 1\nRiga 2", "Riga 1\r\nRiga 3")).toBe(true);
  });
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

describe("normalizzaFineRiga", () => {
  it("porta CRLF e CR a LF", () => {
    expect(normalizzaFineRiga("a\r\nb\rc\nd")).toBe("a\nb\nc\nd");
    expect(normalizzaFineRiga(null)).toBeNull();
  });
});

describe("modificataSenzaFonte", () => {
  it("rileva descrizione o prezzo ritoccati su una riga senza fonte", () => {
    expect(modificataSenzaFonte(null, "Testo", 10, "Altro testo", 10)).toBe(true);
    expect(modificataSenzaFonte(null, "Testo", 10, "Testo", 11)).toBe(true);
    expect(modificataSenzaFonte(null, "Testo", "10.00", "Testo", 10.01)).toBe(true);
    expect(modificataSenzaFonte(null, null, 0, "Nuovo", 0)).toBe(true);
  });
  it("ignora CRLF, spazi ai bordi e differenze sotto il mezzo centesimo", () => {
    expect(modificataSenzaFonte(null, "Riga 1\nRiga 2", 10, " Riga 1\r\nRiga 2 ", 10.004)).toBe(false);
    expect(modificataSenzaFonte(null, null, null, null, 0)).toBe(false);
  });
  it("vale solo per righe senza fonte", () => {
    expect(modificataSenzaFonte("prezzario", "a", 1, "b", 2)).toBe(false);
    expect(modificataSenzaFonte("propria", "a", 1, "b", 2)).toBe(false);
    expect(modificataSenzaFonte("manuale", "a", 1, "b", 2)).toBe(false);
    expect(modificataSenzaFonte(undefined, "a", 1, "b", 2)).toBe(false);
  });
});

describe("avvisi", () => {
  it("riconosce gli avvisi di unità", () => {
    expect(isAvvisoUnita("Unità diversa tra prezzario e tua voce: verifica il prezzo.")).toBe(true);
    expect(isAvvisoUnita("Unità del prezzario: h. Verifica quantità e prezzo.")).toBe(true);
    expect(isAvvisoUnita("Nessuna voce equivalente trovata: prezzo stimato da verificare.")).toBe(false);
    expect(isAvvisoUnita(null)).toBe(false);
  });
  it("tiene solo gli avvisi di unità", () => {
    expect(avvisoDaTenere("Unità diversa nella libreria (m vs m²): verifica il prezzo.")).toBe(
      "Unità diversa nella libreria (m vs m²): verifica il prezzo.",
    );
    expect(avvisoDaTenere("Nessuna voce equivalente trovata: prezzo stimato da verificare.")).toBeNull();
    expect(avvisoDaTenere(undefined)).toBeNull();
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
