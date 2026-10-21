export type Comune = { codice_istat: string; nome: string; provincia: string; regione: string };

type ComuneJson = { codice: string; nome: string; sigla: string; regione: { nome: string } };

/** Slug di prezzari.regione; il Trentino-Alto Adige si divide nelle due Province autonome. */
export function slugRegione(denominazione: string, provincia: string): string {
  if (denominazione.startsWith("Trentino")) return provincia === "BZ" ? "bolzano" : "trento";
  const it = denominazione.split("/")[0];
  return it
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** comuni.json di matteocontrini/comuni-json (dati ISTAT). */
export function parseComuni(buf: Buffer): Comune[] {
  const dati: unknown = JSON.parse(buf.toString("utf8"));
  if (!Array.isArray(dati) || !dati.length) throw new Error("comuni: atteso un array di comuni");
  return (dati as ComuneJson[]).map((c) => {
    if (!c.codice || !c.nome || !c.sigla || !c.regione?.nome) throw new Error(`comuni: voce incompleta ${JSON.stringify(c)}`);
    return { codice_istat: c.codice, nome: c.nome, provincia: c.sigla, regione: slugRegione(c.regione.nome, c.sigla) };
  });
}
