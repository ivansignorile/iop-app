import { XMLParser } from "fast-xml-parser";
import { finalizza, unisci, type VoceGrezza, type VoceNormalizzata } from "../core";

type Testo = string | number | undefined;
type Articolo = {
  "@_codice"?: string;
  tipo?: Testo;
  capitolo?: Testo;
  voce?: Testo;
  articolo?: Testo;
  descrizionebreve?: Testo;
  um?: Testo;
  prezzo?: { "@_valore"?: string };
};

const s = (t: Testo) => (t == null ? "" : String(t).trim());

/** `metro quadrato (m²)` → `m²`, `Litri (I,L)` → `L`, `Watt` → `Watt`. */
export function unitaLiguria(um: string): string {
  const m = um.match(/\(([^()]+)\)\s*$/);
  if (!m) return um.trim();
  return m[1].split(",").pop()!.trim();
}

/**
 * Prezzario XML della Regione Liguria (Appalti Liguria):
 * `Prezzario > Contenuto > Articolo[codice] (tipo, capitolo, voce, articolo, descrizionebreve, um, prezzo[valore])`.
 * Descrizione = voce + articolo.
 */
export function parse(buf: Buffer): VoceNormalizzata[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseTagValue: false,
    parseAttributeValue: false,
    removeNSPrefix: true,
    isArray: (nome) => nome === "Articolo",
  });
  const xml = parser.parse(buf.toString("utf8"));
  const articoli: Articolo[] | undefined = xml?.Prezzario?.Contenuto?.Articolo;
  if (!Array.isArray(articoli) || !articoli.length) throw new Error("liguria-xml: manca Prezzario/Contenuto/Articolo");

  const grezze: VoceGrezza[] = articoli.map((a) => {
    const val = Number(a.prezzo?.["@_valore"]);
    return {
      codice: s(a["@_codice"]),
      capitolo: unisci(s(a.tipo), s(a.capitolo)),
      descrizione: unisci(s(a.voce), s(a.articolo)) || s(a.descrizionebreve),
      unita_testo: unitaLiguria(s(a.um)),
      prezzo: Number.isFinite(val) ? val : null,
    };
  });
  return finalizza(grezze);
}
