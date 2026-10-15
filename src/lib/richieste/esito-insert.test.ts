import { describe, expect, it } from "vitest";
import { erroreInserimento, GIA_INVIATA, INVIO_KO } from "./esito-insert";

describe("erroreInserimento", () => {
  it("23505 (cartella duplicata) -> già inviata", () => {
    expect(erroreInserimento({ code: "23505" })).toBe(GIA_INVIATA);
  });
  it("altri errori -> invio non riuscito", () => {
    expect(erroreInserimento({ code: "23502" })).toBe(INVIO_KO);
    expect(erroreInserimento({})).toBe(INVIO_KO);
    expect(erroreInserimento(null)).toBe(INVIO_KO);
  });
});
