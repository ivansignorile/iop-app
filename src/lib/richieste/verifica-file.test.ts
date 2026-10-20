import { describe, expect, it } from "vitest";

import { verificaFileCaricati } from "./verifica-file";

const C = "2026-10-14/0b8f7c1e-1a2b-4c3d-8e9f-0123456789ab";
const dich = [{ nome: "foto.png", mime: "image/png", size: 100, ruolo: "documento" as const }];
const st = (o = {}) => [{ name: "0-foto.png", size: 100, mimetype: "image/png", ...o }];
const p = [`${C}/0-foto.png`];
const KO = { ok: false, errore: "Caricamento non valido, riprova." };

describe("verificaFileCaricati", () => {
  it("cartella non valida", () => {
    expect(verificaFileCaricati("../x", p, dich, st())).toMatchObject({ ok: false });
  });
  it("path annidato", () => {
    expect(verificaFileCaricati(C, [`${C}/a/0-foto.png`], dich, st())).toMatchObject({ ok: false });
  });
  it("path fuori cartella", () => {
    expect(verificaFileCaricati(C, ["2026-10-14/altra/0-foto.png"], dich, st())).toMatchObject({ ok: false });
  });
  it("path duplicati", () => {
    const d2 = [dich[0], dich[0]];
    expect(verificaFileCaricati(C, [p[0], p[0]], d2, st())).toMatchObject({ ok: false });
  });
  it("lunghezze diverse", () => {
    expect(verificaFileCaricati(C, p, [], st())).toMatchObject({ ok: false });
  });
  it("oggetto mancante", () => {
    expect(verificaFileCaricati(C, p, dich, [])).toEqual(KO);
  });
  it("oggetto troppo grande", () => {
    expect(verificaFileCaricati(C, p, dich, st({ size: 15 * 1024 * 1024 + 1 }))).toEqual(KO);
  });
  it("mime non ammesso", () => {
    expect(verificaFileCaricati(C, p, dich, st({ mimetype: "application/x-msdownload" }))).toEqual(KO);
  });
  it("size/mime nulli", () => {
    expect(verificaFileCaricati(C, p, dich, st({ size: null }))).toEqual(KO);
    expect(verificaFileCaricati(C, p, dich, st({ mimetype: null }))).toEqual(KO);
  });
  it("mime con parametri normalizzato", () => {
    const r = verificaFileCaricati(C, [`${C}/0-n.txt`], [{ nome: "n.txt", mime: "text/plain", size: 5, ruolo: "altro" as const }], [
      { name: "0-n.txt", size: 5, mimetype: "Text/Plain;charset=UTF-8" },
    ]);
    expect(r).toEqual({ ok: true, files: [{ nome: "n.txt", mime: "text/plain", size: 5, path: `${C}/0-n.txt`, ruolo: "altro" }] });
  });
  it("happy path usa i metadati reali", () => {
    const r = verificaFileCaricati(C, p, dich, st({ size: 90, mimetype: "image/png" }));
    expect(r).toEqual({ ok: true, files: [{ nome: "foto.png", mime: "image/png", size: 90, path: p[0], ruolo: "documento" }] });
  });
  it("accetta Excel e Zip come metadati reali", () => {
    const xlsx = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    const r = verificaFileCaricati(C, [`${C}/0-c.xlsx`], [{ nome: "c.xlsx", mime: xlsx, size: 5, ruolo: "documento" }], [
      { name: "0-c.xlsx", size: 5, mimetype: xlsx },
    ]);
    expect(r.ok).toBe(true);
    const z = verificaFileCaricati(C, [`${C}/0-d.zip`], [{ nome: "d.zip", mime: "application/zip", size: 5, ruolo: "documento" }], [
      { name: "0-d.zip", size: 5, mimetype: "application/x-zip-compressed" },
    ]);
    expect(z.ok).toBe(true);
  });
  it("il logo reale deve essere PNG, JPG o PDF anche se dichiarato diverso", () => {
    const d = [{ nome: "logo.png", mime: "image/png", size: 5, ruolo: "logo" as const }];
    expect(verificaFileCaricati(C, [`${C}/0-logo.png`], d, [{ name: "0-logo.png", size: 5, mimetype: "image/webp" }])).toEqual(KO);
  });
});
