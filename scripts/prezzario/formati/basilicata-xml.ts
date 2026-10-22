import { XMLParser } from "fast-xml-parser";
import { finalizza, numeroIt, unisci, type VoceGrezza, type VoceNormalizzata } from "../core";

type Testo = string | number | undefined;
type Sottovoce = { codice?: Testo; descrizione?: Testo; unitaMisura?: { codice?: Testo }; prezzo?: Testo };
type Voce = { codice?: Testo; descrizione?: Testo; sottovoci?: { Sottovoce?: Sottovoce[] } };
type Categoria = { codice?: Testo; descrizione?: Testo; voci?: { Voce?: Voce[] } };
type Capitolo = { codice?: Testo; descrizione?: Testo; categorie?: { Categoria?: Categoria[] } };

const ARRAY = new Set(["Capitolo", "Categoria", "Voce", "Sottovoce"]);

/** Il file è UTF-16 ma dichiara UTF-8: la codifica si decide dal BOM. */
export function decodifica(buf: Buffer): string {
  if (buf[0] === 0xff && buf[1] === 0xfe) return buf.subarray(2).toString("utf16le");
  if (buf[0] === 0xfe && buf[1] === 0xff) {
    const le = Buffer.from(buf.subarray(2));
    le.swap16();
    return le.toString("utf16le");
  }
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) return buf.subarray(3).toString("utf8");
  return buf.toString("utf8");
}

/** Metà alta della code page 850 (byte 0x80–0xFF). */
const CP850 =
  "ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜø£Ø×ƒáíóúñÑªº¿®¬½¼¡«»░▒▓│┤ÁÂÀ©╣║╗╝¢¥┐└┴┬├─┼ãÃ╚╔╩╦╠═╬¤ðÐÊËÈıÍÎÏ┘┌█▄¦Ì▀ÓßÔÒõÕµþÞÚÛÙýÝ¯´\u00ad±‗¾¶§÷¸°¨·¹³²■\u00a0";
const classe = (da: number, a: number) =>
  `[${CP850.slice(da - 0x80, a - 0x80 + 1).replace(/[\\\]^-]/g, "\\$&")}]`;
/** Sequenze UTF-8 da 2 e 3 byte scritte coi caratteri CP850 corrispondenti. */
const MOJIBAKE = new RegExp(
  `${classe(0xe0, 0xef)}${classe(0x80, 0xbf)}{2}|${classe(0xc2, 0xdf)}${classe(0x80, 0xbf)}`,
  "g",
);
const utf8 = new TextDecoder("utf-8", { fatal: true });

/**
 * Il file contiene testo UTF-8 letto come CP850 (OEM Windows) e risalvato ("gi├á" → "già", "┬░" → "°").
 * Ogni sequenza che, riportata a byte, è UTF-8 valido viene ricostruita.
 */
export function riparaCp850(t: string): string {
  return t.replace(MOJIBAKE, (seq) => {
    try {
      return utf8.decode(Uint8Array.from([...seq].map((c) => 0x80 + CP850.indexOf(c))));
    } catch {
      return seq;
    }
  });
}

const s = (t: Testo) => (t == null ? "" : riparaCp850(String(t)).trim());

/**
 * Prezzario XML della Regione Basilicata:
 * `Prezzario > capitoli > Capitolo > categorie > Categoria > voci > Voce > sottovoci > Sottovoce`.
 * Codice = Cap.Cat.Voce.Sottovoce, descrizione = voce + sottovoce.
 */
export function parse(buf: Buffer): VoceNormalizzata[] {
  const parser = new XMLParser({ parseTagValue: false, isArray: (nome) => ARRAY.has(nome) });
  const xml = parser.parse(decodifica(buf));
  const capitoli: Capitolo[] | undefined = xml?.Prezzario?.capitoli?.Capitolo;
  if (!Array.isArray(capitoli) || !capitoli.length) throw new Error("basilicata-xml: manca Prezzario/capitoli/Capitolo");

  const grezze: VoceGrezza[] = [];
  for (const cap of capitoli) {
    for (const cat of cap.categorie?.Categoria ?? []) {
      const capitolo = unisci(s(cap.descrizione), s(cat.descrizione));
      for (const v of cat.voci?.Voce ?? []) {
        for (const sv of v.sottovoci?.Sottovoce ?? []) {
          grezze.push({
            codice: [cap.codice, cat.codice, v.codice, sv.codice].map(s).join("."),
            capitolo,
            descrizione: unisci(s(v.descrizione), s(sv.descrizione)),
            unita_testo: s(sv.unitaMisura?.codice),
            prezzo: numeroIt(s(sv.prezzo)),
          });
        }
      }
    }
  }
  if (!grezze.length) throw new Error("basilicata-xml: nessuna Sottovoce");
  return finalizza(grezze);
}
