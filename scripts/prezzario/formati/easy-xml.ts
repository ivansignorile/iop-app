import { XMLParser } from "fast-xml-parser";
import { finalizza, numeroIt, senzaPrefisso, unisci, type VoceGrezza, type VoceNormalizzata } from "../core";

/**
 * XML `EASY:Prezzario` della piattaforma "gestione-prezzario" (Piemonte, Bolzano, Sardegna, Calabria…).
 * Ogni `EASY:Articolo` è una voce foglia con i testi di tutti i livelli (`livello1..N`, 4 o 5),
 * `um`, `prezzo` e l'eventuale `Analisi` (ignorata: contiene un altro `prezzo`).
 *
 * - codice: attributo `codice` senza prefisso di fonte (`PIE26_`, `BOL26_`, …)
 * - capitolo: titolo breve del livello 2 (il livello 1 è la macro-categoria, in Bolzano/Calabria un testo lungo)
 * - descrizione: testo del livello N-1 (voce) + testo del livello N (articolo)
 * - scartati: articoli senza prezzo o a 0 (finalizza) e quelli marcati "VOCE NON UFFICIALE"
 */

type Livello = string | { "#text"?: string; "@_descrizionebreve"?: string };
type Articolo = Record<string, unknown> & { "@_codice"?: string; um?: unknown; prezzo?: unknown };

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  htmlEntities: true,
  stopNodes: ["*.Analisi"],
  isArray: (name) => name === "Articolo",
});

function testo(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (typeof v === "object" && "#text" in v) return String((v as { "#text": unknown })["#text"] ?? "");
  return "";
}

function breve(v: Livello | undefined): string {
  if (v && typeof v === "object" && v["@_descrizionebreve"]) return v["@_descrizionebreve"];
  return testo(v);
}

/** Segnaposto "...", "-" (= come il padre / livello non usato) e grassetto markdown "**" contano come vuoti. */
function ripulito(t: string): string {
  const s = t.replace(/\*\*/g, "").trim();
  return /^[.…\-–\s]*$/.test(s) ? "" : s;
}

/** Testo completo del livello, col titolo breve come ripiego. */
function completo(v: Livello | undefined): string {
  return ripulito(testo(v)) || ripulito(breve(v));
}

/** Titolo del capitolo: senza `descrizionebreve` (Calabria) il livello è "TITOLO: nota lunga" → tiene il titolo. */
function capitolo(v: Livello | undefined): string {
  const t = ripulito(breve(v)).replace(/\s+/g, " ");
  if (t.length <= 120) return t;
  const dueP = t.indexOf(":");
  if (dueP > 0 && dueP <= 120) return t.slice(0, dueP).trim();
  return `${t.slice(0, 117).replace(/\s+\S*$/, "")}…`;
}

export function parse(buf: Buffer): VoceNormalizzata[] {
  const xml = buf.toString("utf8").replace(/^\uFEFF/, "");
  if (!xml.includes("Prezzario")) throw new Error("easy-xml: manca l'elemento EASY:Prezzario");
  let doc: { Prezzario?: { Contenuto?: { Articolo?: Articolo[] } } };
  try {
    doc = parser.parse(xml);
  } catch (e) {
    throw new Error(`easy-xml: XML non valido (${(e as Error).message})`);
  }
  const articoli = doc.Prezzario?.Contenuto?.Articolo;
  if (!doc.Prezzario) throw new Error("easy-xml: manca l'elemento EASY:Prezzario");
  if (!Array.isArray(articoli) || !articoli.length) throw new Error("easy-xml: nessun EASY:Articolo in EASY:Contenuto");

  const grezze: VoceGrezza[] = [];
  for (const a of articoli) {
    const livelli: Livello[] = [];
    for (let n = 1; `livello${n}` in a; n++) livelli.push(a[`livello${n}`] as Livello);
    if (livelli.length < 2) continue;
    // Bolzano: componenti ausiliarie delle analisi (codici ZA.…), dichiarate "VOCE NON UFFICIALE – NON USARE"
    if (livelli.some((l) => /voce non ufficiale/i.test(breve(l)))) continue;
    const foglia = livelli[livelli.length - 1];
    const padre = livelli.length > 2 ? livelli[livelli.length - 2] : undefined;
    grezze.push({
      codice: senzaPrefisso(String(a["@_codice"] ?? "")),
      capitolo: capitolo(livelli[1]),
      descrizione: unisci(completo(padre), completo(foglia)),
      unita_testo: testo(a.um),
      prezzo: numeroIt(testo(a.prezzo) || null),
    });
  }
  return finalizza(grezze);
}
