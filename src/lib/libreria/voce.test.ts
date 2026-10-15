import { describe, expect, it } from "vitest";

import {
  controllaPreventivo,
  elaborazioneBloccata,
  isUuid,
  nomeFileStorage,
  paroleRicerca,
  puoRiprovare,
  validaVoce,
} from "./voce";

const base = {
  titolo: "Ripristino frontalini",
  descrizione: "Rimozione parti ammalorate, passivazione ferri, ricostruzione con malta.",
  unita: "ml",
  prezzo: "38,50",
  categoria: "balconi",
};

describe("validaVoce", () => {
  it("accetta una voce valida e normalizza il prezzo con la virgola", () => {
    expect(validaVoce(base)).toEqual({
      ok: true,
      value: { ...base, prezzo: 38.5 },
    });
  });
  it("categoria vuota diventa null", () => {
    const r = validaVoce({ ...base, categoria: "  " });
    expect(r.ok && r.value.categoria).toBeNull();
  });
  it("rifiuta titolo o descrizione vuoti", () => {
    expect(validaVoce({ ...base, titolo: " " }).ok).toBe(false);
    expect(validaVoce({ ...base, descrizione: "" }).ok).toBe(false);
  });
  it("rifiuta unità fuori enum", () => {
    expect(validaVoce({ ...base, unita: "litri" }).ok).toBe(false);
  });
  it("rifiuta prezzo zero, negativo o non numerico", () => {
    expect(validaVoce({ ...base, prezzo: "0" }).ok).toBe(false);
    expect(validaVoce({ ...base, prezzo: "-3" }).ok).toBe(false);
    expect(validaVoce({ ...base, prezzo: "abc" }).ok).toBe(false);
    expect(validaVoce({ ...base, prezzo: "" }).ok).toBe(false);
  });
});

describe("isUuid", () => {
  it("riconosce un uuid", () => {
    expect(isUuid("3f2a8c1e-9b4d-4e7a-a1c2-5d6e7f8a9b0c")).toBe(true);
    expect(isUuid("3f2a8c1e")).toBe(false);
    expect(isUuid(null)).toBe(false);
  });
});

describe("nomeFileStorage", () => {
  it("toglie slash, accenti e spazi", () => {
    expect(nomeFileStorage("../Preventivo Città 2024.pdf")).toBe("Preventivo_Citta_2024.pdf");
    expect(nomeFileStorage("///")).toBe("file");
  });
  it("produce solo nomi accettati dal trigger DB (niente '..', niente punto iniziale)", () => {
    const formato = /^[A-Za-z0-9_-][A-Za-z0-9._-]{0,119}$/;
    for (const nome of ["a..b.pdf", "%2e%2e%2fx.pdf", "..\\..\\x.pdf", `${"x".repeat(130)}.pdf`, `.${"y".repeat(119)}`]) {
      const out = nomeFileStorage(nome);
      expect(out).toMatch(formato);
      expect(out).not.toContain("..");
    }
  });
});

describe("controllaPreventivo", () => {
  const MB = 1024 * 1024;
  it("accetta PDF fino a 20 MB e immagini fino a 5 MB", () => {
    expect(controllaPreventivo("application/pdf", 19 * MB)).toBeNull();
    expect(controllaPreventivo("image/jpeg", 4 * MB)).toBeNull();
  });
  it("rifiuta oltre i limiti, vuoti e formati non ammessi", () => {
    expect(controllaPreventivo("application/pdf", 21 * MB)).not.toBeNull();
    expect(controllaPreventivo("image/png", 6 * MB)).not.toBeNull();
    expect(controllaPreventivo("image/gif", MB)).not.toBeNull();
    expect(controllaPreventivo("image/heic", MB)).not.toBeNull();
    expect(controllaPreventivo("application/pdf", 0)).not.toBeNull();
  });
});

describe("elaborazioneBloccata", () => {
  const ora = Date.parse("2026-10-15T12:00:00Z");
  it("recente non è bloccata, oltre 10 minuti sì", () => {
    expect(elaborazioneBloccata("2026-10-15T11:55:00Z", ora)).toBe(false);
    expect(elaborazioneBloccata("2026-10-15T11:49:00Z", ora)).toBe(true);
    expect(elaborazioneBloccata(null, ora)).toBe(true);
  });
});

describe("paroleRicerca", () => {
  it("toglie i caratteri speciali di PostgREST e le parole di una lettera", () => {
    expect(paroleRicerca("intonaco, (civile)* a %50 già")).toEqual(["intonaco", "civile", "50", "già"]);
    expect(paroleRicerca("  ")).toEqual([]);
  });
});

describe("puoRiprovare", () => {
  const ora = Date.parse("2026-10-15T12:00:00Z");
  const fa = (s: number) => new Date(ora - s * 1000).toISOString();

  it("sempre per i documenti in errore", () => {
    expect(puoRiprovare({ stato: "errore", created_at: fa(5), elaborazione_at: null }, ora)).toBe(true);
  });
  it("per i caricati solo dopo circa un minuto", () => {
    expect(puoRiprovare({ stato: "caricato", created_at: fa(30), elaborazione_at: null }, ora)).toBe(false);
    expect(puoRiprovare({ stato: "caricato", created_at: fa(61), elaborazione_at: null }, ora)).toBe(true);
  });
  it("mai per gli elaborati", () => {
    expect(puoRiprovare({ stato: "elaborato", created_at: fa(9999), elaborazione_at: fa(9000) }, ora)).toBe(false);
  });
  it("per gli in elaborazione solo se bloccati", () => {
    expect(puoRiprovare({ stato: "in_elaborazione", created_at: fa(700), elaborazione_at: fa(60) }, ora)).toBe(false);
    expect(puoRiprovare({ stato: "in_elaborazione", created_at: fa(900), elaborazione_at: fa(660) }, ora)).toBe(true);
  });
});
