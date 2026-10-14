import { describe, expect, it } from "vitest";

import { MAX_FILES, validaRichiesta } from "./valida";

const base = {
  nome: "Mario Rossi",
  email: "mario@example.com",
  telefono: "3331234567",
  tipo: "foto_descrizione",
  descrizione: "Facciata con distacchi di intonaco al secondo piano",
  comune: "Benevento",
  files: [{ nome: "facciata.jpg", mime: "image/jpeg", size: 2_000_000 }],
  honeypot: "",
};

describe("validaRichiesta", () => {
  it("accetta una richiesta valida", () => {
    const r = validaRichiesta(base);
    expect(r.ok).toBe(true);
  });
  it("rifiuta se l'honeypot è compilato (bot)", () => {
    expect(validaRichiesta({ ...base, honeypot: "x" })).toEqual({ ok: false, errore: "Richiesta non valida." });
  });
  it("rifiuta email non valida", () => {
    expect(validaRichiesta({ ...base, email: "mario" }).ok).toBe(false);
  });
  it("richiede almeno una foto", () => {
    expect(validaRichiesta({ ...base, files: [] }).ok).toBe(false);
    expect(
      validaRichiesta({ ...base, files: [{ nome: "a.pdf", mime: "application/pdf", size: 10 }] }).ok,
    ).toBe(false);
  });
  it("con foto_capitolato richiede anche un PDF/documento", () => {
    expect(validaRichiesta({ ...base, tipo: "foto_capitolato" }).ok).toBe(false);
    expect(
      validaRichiesta({
        ...base,
        tipo: "foto_capitolato",
        files: [...base.files, { nome: "cap.pdf", mime: "application/pdf", size: 100 }],
      }).ok,
    ).toBe(true);
  });
  it("rifiuta troppi file, file troppo grandi, MIME non ammessi", () => {
    const tanti = Array.from({ length: MAX_FILES + 1 }, () => base.files[0]);
    expect(validaRichiesta({ ...base, files: tanti }).ok).toBe(false);
    expect(validaRichiesta({ ...base, files: [{ nome: "x.jpg", mime: "image/jpeg", size: 16 * 1024 * 1024 }] }).ok).toBe(false);
    expect(validaRichiesta({ ...base, files: [{ nome: "x.exe", mime: "application/x-msdownload", size: 10 }] }).ok).toBe(false);
  });
  it("normalizza: trim, email minuscola, telefono vuoto → null", () => {
    const r = validaRichiesta({ ...base, nome: "  Mario ", email: " Mario@Example.com ", telefono: " " });
    expect(r.ok && r.data).toMatchObject({ nome: "Mario", email: "mario@example.com", telefono: null });
  });
  it("descrizione minima 10 caratteri", () => {
    expect(validaRichiesta({ ...base, descrizione: "corto" }).ok).toBe(false);
  });
});
