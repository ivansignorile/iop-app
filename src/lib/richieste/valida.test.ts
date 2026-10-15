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
  it("rifiuta voci file malformate (null, size non numerico/mancante/Infinity, nome non stringa)", () => {
    const err = { ok: false, errore: "File non valido." };
    expect(validaRichiesta({ ...base, files: [null] })).toEqual(err);
    expect(validaRichiesta({ ...base, files: [{ nome: "a.jpg", mime: "image/jpeg", size: "abc" }] })).toEqual(err);
    expect(validaRichiesta({ ...base, files: [{ nome: "a.jpg", mime: "image/jpeg" }] })).toEqual(err);
    expect(validaRichiesta({ ...base, files: [{ nome: "a.jpg", mime: "image/jpeg", size: Infinity }] })).toEqual(err);
    expect(validaRichiesta({ ...base, files: [{ nome: 42, mime: "image/jpeg", size: 10 }] })).toEqual(err);
  });
  it("files non array viene trattato come lista vuota", () => {
    expect(validaRichiesta({ ...base, files: "abc" })).toEqual({ ok: false, errore: "Carica almeno una foto." });
  });
  it("rimuove le chiavi extra dai file", () => {
    const r = validaRichiesta({
      ...base,
      files: [{ nome: "facciata.jpg", mime: "image/jpeg", size: 10, extra: "x", url: "http://x" }],
    });
    expect(r.ok && r.data.files).toEqual([{ nome: "facciata.jpg", mime: "image/jpeg", size: 10 }]);
  });
  it("limita la lunghezza di descrizione (5000) e nome (100)", () => {
    expect(validaRichiesta({ ...base, descrizione: "a".repeat(5001) }).ok).toBe(false);
    expect(validaRichiesta({ ...base, descrizione: "a".repeat(5000) }).ok).toBe(true);
    expect(validaRichiesta({ ...base, nome: "a".repeat(101) }).ok).toBe(false);
    expect(validaRichiesta({ ...base, nome: "a".repeat(100) }).ok).toBe(true);
  });
  it("limita telefono (30) e comune (100)", () => {
    expect(validaRichiesta({ ...base, telefono: "1".repeat(31) }).ok).toBe(false);
    expect(validaRichiesta({ ...base, comune: "c".repeat(101) }).ok).toBe(false);
  });
});
