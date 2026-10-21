import { finalizza, senzaPrefisso, type VoceGrezza, type VoceNormalizzata } from "../core";

export type ArticoloApi = { c: string; l: number; d: string | null; u: string | null };
export type PrezzoApi = { c: string; z: string | number | null };

/** Risposta di `apillppv2-price-list` della piattaforma gestione-prezzario: articoli a 4 livelli + prezzi. */
export function normalizzaPrezzario(articoli: ArticoloApi[], prezzi: PrezzoApi[]): VoceNormalizzata[] {
  const mappaPrezzi = new Map<string, number>();
  for (const p of prezzi) {
    if (p.z === null || p.z === undefined || p.z === "") continue;
    const n = Number(p.z);
    if (Number.isFinite(n) && n > 0 && !mappaPrezzi.has(p.c)) mappaPrezzi.set(p.c, n);
  }

  const capitoli = new Map<string, string>();
  for (const a of articoli) {
    if (a.l === 1 && a.d) capitoli.set(senzaPrefisso(a.c), a.d);
  }

  const grezze: VoceGrezza[] = [];
  for (const a of articoli) {
    if (a.l !== 4) continue;
    const codice = senzaPrefisso(a.c);
    grezze.push({
      codice,
      capitolo: capitoli.get(codice.split(".")[0]) ?? null,
      descrizione: a.d ?? "",
      unita_testo: a.u,
      prezzo: mappaPrezzi.get(a.c) ?? null,
    });
  }
  return finalizza(grezze);
}

export function parse(buf: Buffer): VoceNormalizzata[] {
  const json = JSON.parse(buf.toString("utf8"));
  if (json?.success !== true || !Array.isArray(json.data?.articles) || !Array.isArray(json.data?.prices)) {
    throw new Error("api-llpp: risposta senza success/data.articles/data.prices");
  }
  return normalizzaPrezzario(json.data.articles, json.data.prices);
}
