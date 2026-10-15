// supabase/functions/_shared/risolvi-voce.test.ts
import { describe, expect, it } from "vitest";

import { applicaScelta, risolviVoce } from "./risolvi-voce";

const P = { descrizione: "Intonaco civile (prezzario)", prezzo: 24.5 };
const M = { descrizione: "Intonaco come lo facciamo noi", prezzo: 22 };

describe("risolviVoce", () => {
  it("entrambi + propria presente → propria come default", () => {
    expect(risolviVoce("entrambi", P, M)).toEqual({ scelta: "propria", descrizione: M.descrizione, prezzo: 22, avviso: null });
  });
  it("entrambi + propria mancante → prezzario (requisito cliente)", () => {
    expect(risolviVoce("entrambi", P, null)).toEqual({ scelta: "prezzario", descrizione: P.descrizione, prezzo: 24.5, avviso: null });
  });
  it("solo prezzario → prezzario anche se esiste la propria", () => {
    expect(risolviVoce("prezzario", P, M).scelta).toBe("prezzario");
  });
  it("solo propri senza propria → ricade sul prezzario con avviso", () => {
    expect(risolviVoce("propri", P, null)).toEqual({
      scelta: "prezzario", descrizione: P.descrizione, prezzo: 24.5,
      avviso: "Nessuna voce nella tua libreria: usata la voce del prezzario.",
    });
  });
  it("nessuna delle due → nulla da applicare", () => {
    expect(risolviVoce("entrambi", null, null)).toEqual({ scelta: null, descrizione: null, prezzo: null, avviso: null });
  });
});

describe("applicaScelta", () => {
  const row = { descrizione_prezzario: P.descrizione, prezzo_prezzario: 24.5, descrizione_propria: M.descrizione, prezzo_proprio: 22 };
  it("copia descrizione e prezzo della fonte scelta", () => {
    expect(applicaScelta("prezzario", row)).toEqual({ descrizione: P.descrizione, prezzo_unitario: 24.5, fonte_scelta: "prezzario" });
    expect(applicaScelta("propria", row)).toEqual({ descrizione: M.descrizione, prezzo_unitario: 22, fonte_scelta: "propria" });
  });
  it("fonte non disponibile → null", () => {
    expect(applicaScelta("propria", { ...row, descrizione_propria: null, prezzo_proprio: null })).toBeNull();
  });
});
