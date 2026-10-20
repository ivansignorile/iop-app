import { describe, expect, it } from "vitest";

import { MAX_FILES, validaRichiesta } from "./valida";

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const base = {
  nome: "Mario Rossi",
  email: "mario@example.com",
  telefono: "3331234567",
  formato: "pdf_protetto",
  titolo: "Villa Rossi",
  descrizione: "Facciata con distacchi di intonaco al secondo piano",
  comune: "Benevento",
  privacy: true,
  files: [{ nome: "facciata.jpg", mime: "image/jpeg", size: 2_000_000, ruolo: "documento" }],
  honeypot: "",
};
const logo = { nome: "logo.png", mime: "image/png", size: 5000, ruolo: "logo" };

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
  it("richiede almeno un file", () => {
    expect(validaRichiesta({ ...base, files: [] })).toEqual({ ok: false, errore: "Carica almeno un file." });
  });
  it("files non array viene trattato come lista vuota", () => {
    expect(validaRichiesta({ ...base, files: "abc" })).toEqual({ ok: false, errore: "Carica almeno un file." });
  });
  it("accetta un solo computo Excel senza foto e deriva tipo foto_capitolato", () => {
    const r = validaRichiesta({ ...base, files: [{ nome: "computo.xlsx", mime: XLSX, size: 1000, ruolo: "documento" }] });
    expect(r.ok && r.data.tipo).toBe("foto_capitolato");
  });
  it("accetta Zip anche con il MIME di Windows", () => {
    const zip = { nome: "docs.zip", mime: "application/x-zip-compressed", size: 1000, ruolo: "documento" };
    expect(validaRichiesta({ ...base, files: [zip] }).ok).toBe(true);
    expect(validaRichiesta({ ...base, files: [{ ...zip, mime: "application/zip" }] }).ok).toBe(true);
  });
  it("con sole foto deriva tipo foto_descrizione", () => {
    const r = validaRichiesta(base);
    expect(r.ok && r.data.tipo).toBe("foto_descrizione");
  });
  it("un PDF tra gli altri allegati non rende la richiesta foto_capitolato", () => {
    const r = validaRichiesta({
      ...base,
      files: [...base.files, { nome: "nota.pdf", mime: "application/pdf", size: 10, ruolo: "altro" }],
    });
    expect(r.ok && r.data.tipo).toBe("foto_descrizione");
  });
  it("rifiuta senza consenso privacy", () => {
    expect(validaRichiesta({ ...base, privacy: undefined })).toEqual({
      ok: false,
      errore: "Devi accettare l'informativa privacy.",
    });
    expect(validaRichiesta({ ...base, privacy: "off" }).ok).toBe(false);
  });
  it("accetta il consenso inviato dal form HTML", () => {
    expect(validaRichiesta({ ...base, privacy: "on" }).ok).toBe(true);
  });
  it("rifiuta un formato sconosciuto", () => {
    expect(validaRichiesta({ ...base, formato: "pdf" })).toEqual({
      ok: false,
      errore: "Scegli il formato del preventivo.",
    });
  });
  it("carta intestata richiede il logo", () => {
    expect(validaRichiesta({ ...base, formato: "carta_intestata" })).toEqual({
      ok: false,
      errore: "Carica la carta intestata o il logo.",
    });
    expect(validaRichiesta({ ...base, formato: "carta_intestata", files: [...base.files, logo] }).ok).toBe(true);
  });
  it("accetta un logo anche se il formato non è carta intestata", () => {
    expect(validaRichiesta({ ...base, files: [...base.files, logo] }).ok).toBe(true);
  });
  it("il logo ammette solo PNG, JPG o PDF", () => {
    expect(validaRichiesta({ ...base, files: [...base.files, { ...logo, mime: "image/webp" }] })).toEqual({
      ok: false,
      errore: "Logo: formato ammesso PNG, JPG o PDF.",
    });
  });
  it("rifiuta un ruolo sconosciuto", () => {
    expect(validaRichiesta({ ...base, files: [{ ...base.files[0], ruolo: "segreto" }] })).toEqual({
      ok: false,
      errore: "File non valido.",
    });
  });
  it("limita il titolo a 150 caratteri, vuoto → null", () => {
    expect(validaRichiesta({ ...base, titolo: "t".repeat(151) })).toEqual({
      ok: false,
      errore: "Titolo troppo lungo (max 150 caratteri).",
    });
    const r = validaRichiesta({ ...base, titolo: "  " });
    expect(r.ok && r.data.titolo).toBeNull();
  });
  it("le note sono facoltative: vuote → null", () => {
    const r = validaRichiesta({ ...base, descrizione: "" });
    expect(r.ok && r.data.descrizione).toBeNull();
  });
  it("rifiuta troppi file, file troppo grandi, MIME non ammessi", () => {
    const tanti = Array.from({ length: MAX_FILES + 1 }, () => base.files[0]);
    expect(validaRichiesta({ ...base, files: tanti }).ok).toBe(false);
    expect(
      validaRichiesta({ ...base, files: [{ ...base.files[0], size: 16 * 1024 * 1024 }] }).ok,
    ).toBe(false);
    expect(
      validaRichiesta({ ...base, files: [{ nome: "x.exe", mime: "application/x-msdownload", size: 10, ruolo: "altro" }] }).ok,
    ).toBe(false);
  });
  it("normalizza: trim, email minuscola, telefono vuoto → null", () => {
    const r = validaRichiesta({ ...base, nome: "  Mario ", email: " Mario@Example.com ", telefono: " " });
    expect(r.ok && r.data).toMatchObject({ nome: "Mario", email: "mario@example.com", telefono: null });
  });
  it("rifiuta voci file malformate (null, size non numerico/mancante/Infinity, nome non stringa)", () => {
    const err = { ok: false, errore: "File non valido." };
    const f = base.files[0];
    expect(validaRichiesta({ ...base, files: [null] })).toEqual(err);
    expect(validaRichiesta({ ...base, files: [{ ...f, size: "abc" }] })).toEqual(err);
    expect(validaRichiesta({ ...base, files: [{ nome: "a.jpg", mime: "image/jpeg", ruolo: "documento" }] })).toEqual(err);
    expect(validaRichiesta({ ...base, files: [{ ...f, size: Infinity }] })).toEqual(err);
    expect(validaRichiesta({ ...base, files: [{ ...f, nome: 42 }] })).toEqual(err);
  });
  it("rimuove le chiavi extra dai file", () => {
    const r = validaRichiesta({
      ...base,
      files: [{ nome: "facciata.jpg", mime: "image/jpeg", size: 10, ruolo: "documento", extra: "x", url: "http://x" }],
    });
    expect(r.ok && r.data.files).toEqual([{ nome: "facciata.jpg", mime: "image/jpeg", size: 10, ruolo: "documento" }]);
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
