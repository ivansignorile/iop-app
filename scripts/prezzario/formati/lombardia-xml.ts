import { XMLParser } from "fast-xml-parser";
import { finalizza, unisci, type VoceGrezza, type VoceNormalizzata } from "../core";

type Testo = string | number | undefined;
type Dettaglio = {
  "@_codice_voce"?: string;
  "@_prezzo_voce"?: string;
  "@_unita_misura_voce"?: string;
  declaratoria_voce?: Testo;
  descr_liv_1?: Testo;
  descr_liv_2?: Testo;
};

const s = (t: Testo) => (t == null ? "" : String(t).trim());

/** `1 m²` → `m²`; anche `0 cad`/`null cad` → `cad`. Le quantità diverse da 1 (`100 kg`) restano. */
export function unitaLombardia(u: string): string {
  return u.trim().replace(/^(?:1|0|null)\s+/i, "");
}

/**
 * Prezzario XML della Regione Lombardia (`LOM261`):
 * `report > voci > voci > dettaglio_voce[codice_voce, prezzo_voce, unita_misura_voce] > declaratoria_voce`.
 * La declaratoria è già completa; il codice resta intero (`LOM261.…` è il codice ufficiale).
 */
export function parse(buf: Buffer): VoceNormalizzata[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseTagValue: false,
    parseAttributeValue: false,
    isArray: (nome) => nome === "voci",
    // le analisi (risorse) e il dettaglio non servono: non vengono espansi
    stopNodes: ["*.risorse", "*.declaratoria_voce_dettaglio"],
  });
  const xml = parser.parse(buf.toString("utf8"));
  const voci: { dettaglio_voce?: Dettaglio }[] | undefined = xml?.report?.voci?.[0]?.voci;
  if (!Array.isArray(voci) || !voci.length) throw new Error("lombardia-xml: manca report/voci/voci");

  const grezze: VoceGrezza[] = [];
  for (const v of voci) {
    const d = v.dettaglio_voce;
    if (!d?.["@_codice_voce"]) continue;
    const val = Number(d["@_prezzo_voce"]);
    grezze.push({
      codice: d["@_codice_voce"].trim(),
      capitolo: unisci(s(d.descr_liv_1), s(d.descr_liv_2)),
      descrizione: s(d.declaratoria_voce),
      unita_testo: unitaLombardia(d["@_unita_misura_voce"] ?? ""),
      prezzo: Number.isFinite(val) ? val : null,
    });
  }
  if (!grezze.length) throw new Error("lombardia-xml: nessun dettaglio_voce");
  return finalizza(grezze);
}
