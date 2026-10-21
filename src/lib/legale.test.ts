import { describe, expect, it } from "vitest";

import { AGGIORNATO_AL, TITOLARE } from "./legale";

describe("dati del titolare per privacy e termini", () => {
  it("sono tutti compilati", () => {
    for (const [campo, valore] of Object.entries(TITOLARE)) {
      expect(valore, campo).toMatch(/\S/);
      expect(valore, campo).not.toMatch(/TODO|xxx|\[/i);
    }
  });
  it("email di contatto valida", () => {
    expect(TITOLARE.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });
  it("data di aggiornamento in formato leggibile", () => {
    expect(AGGIORNATO_AL).toMatch(/^\d{1,2} \p{L}+ \d{4}$/u);
  });
});
