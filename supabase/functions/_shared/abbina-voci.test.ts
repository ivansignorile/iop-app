// supabase/functions/_shared/abbina-voci.test.ts
import { describe, expect, it } from "vitest";

import {
  AVVISO_NESSUNA,
  type CandPrezzario,
  type CandPropria,
  costruisciPatch,
  type InterventoDaAbbinare,
  unitaPrezzarioCompatibile,
  validaAbbinamenti,
} from "./abbina-voci";

const prez = (over: Partial<CandPrezzario> = {}): CandPrezzario => ({
  id: "p1",
  codice: "E08.010",
  descrizione: "Intonaco civile",
  unita: "mq",
  unita_testo: "m²",
  prezzo: 20,
  ...over,
});
const prop = (over: Partial<CandPropria> = {}): CandPropria => ({
  id: "l1",
  titolo: "Intonaco",
  descrizione: "Intonaco nostro",
  unita: "mq",
  prezzo: 18,
  ...over,
});

describe("unitaPrezzarioCompatibile", () => {
  it("accetta stessa unità", () => {
    expect(unitaPrezzarioCompatibile("mq", { unita: "mq", unita_testo: "m²" })).toBe(true);
  });
  it("rifiuta unità diversa", () => {
    expect(unitaPrezzarioCompatibile("corpo", { unita: "mq", unita_testo: "m²" })).toBe(false);
  });
  it("accetta 'a corpo' vero", () => {
    expect(unitaPrezzarioCompatibile("corpo", { unita: "corpo", unita_testo: "a corpo" })).toBe(true);
  });
  it("rifiuta unità mappate su corpo (h, %, t)", () => {
    for (const t of ["h", "%", "t", "lt", "ha"]) {
      expect(unitaPrezzarioCompatibile("corpo", { unita: "corpo", unita_testo: t })).toBe(false);
    }
  });
});

describe("validaAbbinamenti", () => {
  const interventi: InterventoDaAbbinare[] = [
    { id: "i1", unita: "mq", prezzario: [prez()], proprie: [prop()] },
    { id: "i2", unita: "mq", prezzario: [prez({ id: "p2" })], proprie: [] },
  ];

  it("scarta id non presenti tra i candidati di quell'intervento", () => {
    const r = validaAbbinamenti(
      { abbinamenti: [{ intervento_id: "i1", prezzario_voce_id: "p2", voce_propria_id: "l1" }] },
      interventi,
    );
    expect(r.get("i1")).toEqual({ prezzario: null, propria: prop() });
  });

  it("ignora interventi sconosciuti e duplicati (vale il primo)", () => {
    const r = validaAbbinamenti(
      {
        abbinamenti: [
          { intervento_id: "x", prezzario_voce_id: "p1", voce_propria_id: null },
          { intervento_id: "i2", prezzario_voce_id: "p2", voce_propria_id: null },
          { intervento_id: "i2", prezzario_voce_id: null, voce_propria_id: null },
        ],
      },
      interventi,
    );
    expect([...r.keys()]).toEqual(["i2"]);
    expect(r.get("i2")?.prezzario?.id).toBe("p2");
  });

  it("output malformato → mappa vuota", () => {
    expect(validaAbbinamenti(null, interventi).size).toBe(0);
    expect(validaAbbinamenti({ abbinamenti: "x" }, interventi).size).toBe(0);
  });
});

describe("costruisciPatch", () => {
  it("entrambi: preferisce la voce propria compatibile", () => {
    const { patch, abbinato } = costruisciPatch("entrambi", "mq", prez(), prop());
    expect(abbinato).toBe(true);
    expect(patch).toMatchObject({
      fonte_scelta: "propria",
      descrizione: "Intonaco nostro",
      prezzo_unitario: 18,
      descrizione_prezzario: "Intonaco civile",
      codice_prezzario: "E08.010",
      abbinamento_avviso: null,
    });
  });

  it("prezzario: ignora la libreria", () => {
    const { patch } = costruisciPatch("prezzario", "mq", prez(), prop());
    expect(patch).toMatchObject({ fonte_scelta: "prezzario", prezzo_unitario: 20, voce_propria_id: null });
  });

  it("nessun candidato → avviso e nessun prezzo", () => {
    const { patch, abbinato } = costruisciPatch("entrambi", "mq", null, null);
    expect(abbinato).toBe(false);
    expect(patch.abbinamento_avviso).toBe(AVVISO_NESSUNA);
    expect(patch.prezzo_unitario).toBeUndefined();
    expect(patch.fonte_scelta).toBeNull();
  });

  it("unità diversa nel prezzario: salva descrizioni, non tocca il prezzo", () => {
    const { patch, abbinato } = costruisciPatch("prezzario", "corpo", prez({ unita: "corpo", unita_testo: "h" }), null);
    expect(abbinato).toBe(true);
    expect(patch.prezzo_unitario).toBeUndefined();
    expect(patch.descrizione).toBeUndefined();
    expect(patch.descrizione_prezzario).toBe("Intonaco civile");
    expect(patch.fonte_scelta).toBeNull();
    expect(patch.abbinamento_avviso).toBe("Unità diversa nel prezzario (h vs corpo): verifica il prezzo.");
  });

  it("propria con unità diversa: ripiega sul prezzario compatibile con avviso", () => {
    const { patch } = costruisciPatch("entrambi", "mq", prez(), prop({ unita: "ml" }));
    expect(patch).toMatchObject({
      fonte_scelta: "prezzario",
      prezzo_unitario: 20,
      descrizione_propria: "Intonaco nostro",
      abbinamento_avviso: "Unità diversa nella libreria (m vs m²): verifica il prezzo.",
    });
  });

  it("propri senza voce propria: usa prezzario con avviso di risolviVoce", () => {
    const { patch } = costruisciPatch("propri", "mq", prez(), null);
    expect(patch.fonte_scelta).toBe("prezzario");
    expect(patch.abbinamento_avviso).toMatch(/Nessuna voce nella tua libreria/);
  });
});
