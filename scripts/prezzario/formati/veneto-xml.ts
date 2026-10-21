import { XMLParser } from "fast-xml-parser";
import { finalizza, unisci, type VoceGrezza, type VoceNormalizzata } from "../core";

type Prezzo = { "@_cod"?: string; "@_umi"?: string; "@_val"?: string; "#text"?: string };
type Paragrafo = { estesa?: string; sint?: string; prezzi?: { prezzo?: Prezzo[] } };
type Capitolo = { "@_desc"?: string; paragrafo?: Paragrafo[] };
type Settore = { "@_desc"?: string; capitolo?: Capitolo[] };

const ARRAY = new Set(["settore", "capitolo", "paragrafo", "prezzo"]);

/** Codici `VEN26-01.02.01.00` → `01.02.01.00`. */
function codiceVeneto(cod: string): string {
  return cod.trim().replace(/^[A-Z]{3}\d{2}-/, "");
}

/**
 * Elenco prezzi XML della Regione Veneto:
 * `prezzario > settore[desc] > capitolo[desc] > paragrafo (sint, estesa) > prezzi > prezzo[cod, umi, val]testo`.
 * Descrizione = estesa del paragrafo + testo del prezzo.
 */
export function parse(buf: Buffer): VoceNormalizzata[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseTagValue: false,
    parseAttributeValue: false,
    isArray: (nome) => ARRAY.has(nome),
  });
  const xml = parser.parse(buf.toString("utf8"));
  const settori: Settore[] | undefined = xml?.prezzario?.settore;
  if (!Array.isArray(settori) || !settori.length) throw new Error("veneto-xml: manca prezzario/settore");

  const grezze: VoceGrezza[] = [];
  for (const s of settori) {
    for (const c of s.capitolo ?? []) {
      const capitolo = unisci(s["@_desc"], c["@_desc"]);
      for (const p of c.paragrafo ?? []) {
        for (const z of p.prezzi?.prezzo ?? []) {
          if (!z["@_cod"]) continue;
          const val = Number(z["@_val"]);
          grezze.push({
            codice: codiceVeneto(z["@_cod"]),
            capitolo,
            descrizione: unisci(p.estesa ?? p.sint, z["#text"]),
            unita_testo: z["@_umi"],
            prezzo: Number.isFinite(val) ? val : null,
          });
        }
      }
    }
  }
  if (!grezze.length) throw new Error("veneto-xml: nessun elemento prezzo");
  return finalizza(grezze);
}
