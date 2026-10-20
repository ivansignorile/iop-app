import { describe, expect, it } from "vitest";

import { FORMATO_LABEL, raggruppaFile } from "./etichette";

describe("etichette richieste", () => {
  it("etichette dei formati", () => {
    expect(FORMATO_LABEL).toEqual({ pdf_protetto: "PDF protetto", word: "Word", carta_intestata: "Carta intestata" });
  });
  it("raggruppa per ruolo; i file senza ruolo (richieste vecchie) vanno in altro", () => {
    const g = raggruppaFile([
      { nome: "a.pdf", ruolo: "documento" },
      { nome: "l.png", ruolo: "logo" },
      { nome: "vecchio.jpg" },
      { nome: "x", ruolo: "boh" },
    ]);
    expect(g.documento.map((f) => f.nome)).toEqual(["a.pdf"]);
    expect(g.logo.map((f) => f.nome)).toEqual(["l.png"]);
    expect(g.altro.map((f) => f.nome)).toEqual(["vecchio.jpg", "x"]);
  });
});
