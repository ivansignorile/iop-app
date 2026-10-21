export type UnitaMisura = "corpo" | "mq" | "ml" | "mc" | "giorno" | "cad" | "kg";
export type VoceNormalizzata = {
  codice: string;
  capitolo: string | null;
  descrizione: string;
  unita_testo: string;
  unita: UnitaMisura;
  prezzo: number;
};
/** Voce come esce dal parser di un formato, prima delle regole comuni. */
export type VoceGrezza = {
  codice: string;
  capitolo?: string | null;
  descrizione: string;
  unita_testo?: string | null;
  prezzo: number | null;
};

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

/** Numero da testo italiano ("1 826,34", "1.826,34") o inglese ("81.7345"). */
export function numeroIt(s: string | number | null | undefined): number | null {
  if (typeof s === "number") return Number.isFinite(s) ? s : null;
  if (s == null) return null;
  let t = s.replace(/[^\d,.-]/g, "");
  if (!/\d/.test(t)) return null;
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  else if ((t.match(/\./g) ?? []).length > 1) t = t.replace(/\./g, "");
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function pulisci(s: string | null | undefined): string {
  return (s ?? "").replace(/_x000D_/gi, " ").replace(/[\s ]+/g, " ").trim();
}

/** Unisce descrizione del padre e della voce, scartando vuoti e ripetizioni. */
export function unisci(...parti: (string | null | undefined)[]): string {
  const out: string[] = [];
  for (const p of parti) {
    const t = pulisci(p);
    if (!t) continue;
    const prec = out[out.length - 1];
    if (prec && prec.toLowerCase().includes(t.toLowerCase())) continue;
    out.push(t);
  }
  return out.join(" — ");
}

export function senzaPrefisso(codice: string): string {
  return codice.trim().replace(/^[A-Z]{3}\d{2}_/, "");
}

export function finalizza(voci: VoceGrezza[]): VoceNormalizzata[] {
  const viste = new Set<string>();
  const out: VoceNormalizzata[] = [];
  for (const v of voci) {
    const codice = v.codice.trim();
    const descrizione = pulisci(v.descrizione);
    if (!codice || !descrizione || v.prezzo == null || viste.has(codice)) continue;
    const prezzo = Math.round(v.prezzo * 100) / 100;
    if (!(prezzo > 0)) continue;
    viste.add(codice);
    const testo = pulisci(v.unita_testo);
    out.push({
      codice,
      capitolo: pulisci(v.capitolo) || null,
      descrizione,
      unita_testo: testo || "a corpo",
      unita: testo ? mapUnita(testo) : "corpo",
      prezzo,
    });
  }
  return out;
}
