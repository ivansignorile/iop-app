import { describe, expect, it } from "vitest";

import { rigaRichiesta } from "./riga";
import type { RichiestaInput } from "./valida";

const C = "2026-10-20/0b8f7c1e-1a2b-4c3d-8e9f-0123456789ab";
const files = [
  { nome: "computo.pdf", mime: "application/pdf", size: 100, ruolo: "documento" as const, path: `${C}/0-documento-computo.pdf` },
  { nome: "logo.png", mime: "image/png", size: 50, ruolo: "logo" as const, path: `${C}/1-logo-logo.png` },
];
const dati: RichiestaInput = {
  nome: "Mario Rossi",
  email: "mario@example.com",
  telefono: null,
  tipo: "foto_capitolato",
  formato: "carta_intestata",
  titolo: "Villa Rossi",
  descrizione: null,
  comune: "Roma",
  files: files.map(({ nome, mime, size, ruolo }) => ({ nome, mime, size, ruolo })),
  consensoPrivacy: true,
  honeypot: "",
};

describe("rigaRichiesta", () => {
  it("mappa formato, titolo, consenso privacy e file con ruolo", () => {
    const ora = new Date("2026-10-20T19:00:00.000Z");
    const r = rigaRichiesta(dati, files, C, ora);
    expect(r).toEqual({
      nome: "Mario Rossi",
      email: "mario@example.com",
      telefono: null,
      tipo: "foto_capitolato",
      descrizione: null,
      comune: "Roma",
      formato_output: "carta_intestata",
      titolo_progetto: "Villa Rossi",
      consenso_privacy_at: "2026-10-20T19:00:00.000Z",
      files,
      cartella: C,
    });
    expect(r.files[1].ruolo).toBe("logo");
  });
  it("senza data esplicita usa adesso", () => {
    const r = rigaRichiesta(dati, files, C);
    expect(Number.isNaN(Date.parse(r.consenso_privacy_at))).toBe(false);
  });
});
