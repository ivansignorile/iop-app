export type UnitaMisura = "corpo" | "mq" | "ml" | "mc" | "giorno" | "cad" | "kg";
export type ArticoloApi = { c: string; l: number; d: string | null; u: string | null };
export type PrezzoApi = { c: string; z: string | number | null };
export type VoceNormalizzata = {
  codice: string;
  capitolo: string | null;
  descrizione: string;
  unita_testo: string;
  unita: UnitaMisura;
  prezzo: number;
};

const togliPrefisso = (c: string) => c.replace(/^.+?_/, "");

export function mapUnita(u: string): UnitaMisura {
  const base = u
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/²/g, "2")
    .replace(/³/g, "3")
    .split("/")[0];
  switch (base) {
    case "mq":
    case "m2":
      return "mq";
    case "mc":
    case "m3":
      return "mc";
    case "m":
    case "ml":
      return "ml";
    case "cad":
    case "cadauno":
    case "n":
    case "n.":
    case "nr":
    case "nr.":
    case "cp":
    case "capo":
      return "cad";
    case "kg":
      return "kg";
    case "giorno":
    case "gg":
    case "g":
      return "giorno";
    default:
      return "corpo";
  }
}

export function normalizzaPrezzario(articoli: ArticoloApi[], prezzi: PrezzoApi[]): VoceNormalizzata[] {
  const mappaPrezzi = new Map<string, number>();
  for (const p of prezzi) {
    if (p.z === null || p.z === undefined || p.z === "") continue;
    const n = Number(p.z);
    if (Number.isFinite(n) && n > 0 && !mappaPrezzi.has(p.c)) mappaPrezzi.set(p.c, n);
  }

  const capitoli = new Map<string, string>();
  for (const a of articoli) {
    if (a.l === 1 && a.d) capitoli.set(togliPrefisso(a.c), a.d.replace(/\s+/g, " ").trim());
  }

  const viste = new Set<string>();
  const out: VoceNormalizzata[] = [];
  for (const a of articoli) {
    if (a.l !== 4) continue;
    const grezzo = mappaPrezzi.get(a.c);
    if (grezzo === undefined) continue;
    const prezzo = Math.round(grezzo * 100) / 100;
    if (!(prezzo > 0)) continue;
    const codice = togliPrefisso(a.c);
    if (viste.has(codice)) continue;
    const descrizione = (a.d ?? "").replace(/\s+/g, " ").trim();
    if (!descrizione) continue;
    viste.add(codice);
    const testo = (a.u ?? "").trim();
    out.push({
      codice,
      capitolo: capitoli.get(codice.split(".")[0]) ?? null,
      descrizione,
      unita_testo: testo || "a corpo",
      unita: testo ? mapUnita(testo) : "corpo",
      prezzo,
    });
  }
  return out;
}
