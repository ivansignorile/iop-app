import { describe, expect, it } from "vitest";

import { conMime, mimeFile } from "./mime-file";

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

describe("mimeFile", () => {
  it("usa l'estensione se il browser non dà un tipo", () => {
    expect(mimeFile({ name: "computo.xlsx", type: "" })).toBe(XLSX);
    expect(mimeFile({ name: "FOTO.HEIC", type: "" })).toBe("image/heic");
  });
  it("usa l'estensione se il tipo del browser non è tra quelli ammessi", () => {
    expect(mimeFile({ name: "docs.zip", type: "application/zip-compressed" })).toBe("application/zip");
    expect(mimeFile({ name: "c.xlsx", type: "application/octet-stream" })).toBe(XLSX);
  });
  it("tiene il tipo del browser se è ammesso", () => {
    expect(mimeFile({ name: "docs.zip", type: "application/x-zip-compressed" })).toBe("application/x-zip-compressed");
    expect(mimeFile({ name: "a.jpg", type: "image/jpeg" })).toBe("image/jpeg");
  });
  it("estensione sconosciuta: resta il tipo del browser (il server lo rifiuterà)", () => {
    expect(mimeFile({ name: "x.exe", type: "application/x-msdownload" })).toBe("application/x-msdownload");
  });
});

describe("conMime", () => {
  it("restituisce un file col tipo dato, stesso nome e contenuto", async () => {
    const f = new File(["abc"], "computo.xlsx", { type: "" });
    const g = conMime(f, XLSX);
    expect(g.type).toBe(XLSX);
    expect(g.name).toBe("computo.xlsx");
    expect(await g.text()).toBe("abc");
  });
  it("non copia se il tipo è già giusto", () => {
    const f = new File(["abc"], "a.jpg", { type: "image/jpeg" });
    expect(conMime(f, "image/jpeg")).toBe(f);
  });
});
