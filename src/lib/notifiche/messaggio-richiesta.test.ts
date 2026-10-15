import { describe, expect, it } from "vitest";

import { testoRichiesta } from "./messaggio-richiesta";

const r = {
  id: "abc",
  nome: "Mario Rossi",
  email: "mario@example.com",
  telefono: "3331234567",
  tipo: "foto_capitolato" as const,
  descrizione: "Rifacimento facciata",
  comune: "Benevento",
  files: [
    { nome: "f.jpg", mime: "image/jpeg", size: 1 },
    { nome: "c.pdf", mime: "application/pdf", size: 1 },
  ],
  honeypot: "",
};

describe("testoRichiesta", () => {
  it("contiene dati di contatto, tipo, conteggio file e link admin", () => {
    const { oggetto, testo } = testoRichiesta(r, "https://iop.example/admin/richieste/abc");
    expect(oggetto).toBe("Nuova richiesta preventivo 24h — Mario Rossi (Benevento)");
    expect(testo).toContain("Foto + capitolato");
    expect(testo).toContain("mario@example.com");
    expect(testo).toContain("3331234567");
    expect(testo).toContain("2 file");
    expect(testo).toContain("https://iop.example/admin/richieste/abc");
  });
  it("senza comune/telefono non stampa 'null'", () => {
    const { oggetto, testo } = testoRichiesta({ ...r, comune: null, telefono: null }, "u");
    expect(oggetto).toBe("Nuova richiesta preventivo 24h — Mario Rossi");
    expect(testo).not.toContain("null");
  });
});
