import { describe, expect, it } from "vitest";

import { testoRichiesta } from "./messaggio-richiesta";

const r = {
  id: "abc",
  nome: "Mario Rossi",
  email: "mario@example.com",
  telefono: "3331234567",
  tipo: "foto_capitolato" as const,
  formato: "word" as const,
  titolo: "Villa Rossi",
  descrizione: "Rifacimento facciata",
  comune: "Benevento",
  files: [
    { nome: "c.pdf", mime: "application/pdf", size: 1, ruolo: "documento" as const },
    { nome: "logo.png", mime: "image/png", size: 1, ruolo: "logo" as const },
  ],
  consensoPrivacy: true as const,
  honeypot: "",
};

describe("testoRichiesta", () => {
  it("contiene dati di contatto, tipo e link admin", () => {
    const { oggetto, testo } = testoRichiesta(r, "https://iop.example/admin/richieste/abc");
    expect(oggetto).toBe("Nuova richiesta preventivo 24h — Mario Rossi (Benevento)");
    expect(testo).toContain("Foto + capitolato");
    expect(testo).toContain("mario@example.com");
    expect(testo).toContain("3331234567");
    expect(testo).toContain("https://iop.example/admin/richieste/abc");
  });
  it("riporta formato, progetto e allegati per ruolo", () => {
    const { testo } = testoRichiesta(r, "u");
    expect(testo).toContain("Formato: Word");
    expect(testo).toContain("Progetto: Villa Rossi");
    expect(testo).toContain("Allegati: 1 documenti, 1 loghi, 0 altri");
  });
  it("senza comune/telefono/titolo/note non stampa 'null'", () => {
    const { oggetto, testo } = testoRichiesta({ ...r, comune: null, telefono: null, titolo: null, descrizione: null }, "u");
    expect(oggetto).toBe("Nuova richiesta preventivo 24h — Mario Rossi");
    expect(testo).not.toContain("null");
    expect(testo).not.toContain("Progetto:");
  });
});
