import { XMLParser } from "fast-xml-parser";
import { finalizza, numeroIt, pulisci, senzaPrefisso, unisci, type VoceGrezza, type VoceNormalizzata } from "../core";

/**
 * XML SIX (`<Documento xmlns="six.xsd">`): Emilia-Romagna (Eldasoft, iso-8859-1), Friuli VG (S.T.R.), Trento (Prometeo).
 * `prezzario > unitaDiMisura[] + listaQuotazione[] + prodotto[]`, lista piatta: la gerarchia sta nel prefisso di `prdId`.
 * La voce padre porta la descrizione `estesa`, la sottovoce con prezzo spesso solo la `breve`.
 */

type Nodo = Record<string, unknown>;

const ARRAY = new Set(["gruppo", "grpValore", "prezzario", "unitaDiMisura", "listaQuotazione", "prodotto", "prdDescrizione", "prdQuotazione", "prdGrpValore", "udmDescrizione", "vlrDescrizione"]);

/** Decodifica rispettando BOM o `encoding` della dichiarazione XML (iso-8859-1 → windows-1252). */
function decodifica(buf: Buffer): string {
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) return new TextDecoder("utf-8").decode(buf.subarray(3));
  if (buf[0] === 0xff && buf[1] === 0xfe) return new TextDecoder("utf-16le").decode(buf.subarray(2));
  if (buf[0] === 0xfe && buf[1] === 0xff) return new TextDecoder("utf-16be").decode(buf.subarray(2));
  const enc = /encoding=["']([^"']+)["']/i.exec(buf.subarray(0, 200).toString("latin1"))?.[1]?.toLowerCase() ?? "utf-8";
  const latin = /^(iso-?8859-1|latin-?1|windows-1252|cp1252)$/.test(enc);
  return new TextDecoder(latin ? "windows-1252" : "utf-8").decode(buf);
}

const lista = (v: unknown): Nodo[] => (Array.isArray(v) ? v : v == null ? [] : [v]) as Nodo[];
const testo = (v: unknown): string => (typeof v === "string" ? v : "");

/** Descrizione in italiano (SIX bilingue: più `prdDescrizione` con `lingua`). */
function descrizioneIt(v: unknown): Nodo | undefined {
  const d = lista(v);
  return d.find((x) => testo(x.lingua).toLowerCase().startsWith("it")) ?? d[0];
}

/** `¿` è l'apostrofo nell'export Eldasoft (`&#191;`). */
const sistema = (s: string) => pulisci(s.replace(/¿/g, "'"));

/** Testo di un prodotto: `estesa`, preceduta dalla `breve` se questa è un titolo diverso (non troncato con "..."). */
function testoProdotto(d: Nodo | undefined): string {
  const breve = sistema(testo(d?.breve));
  const estesa = sistema(testo(d?.estesa));
  if (!estesa) return breve;
  if (!breve || breve.includes("...") || estesa.toLowerCase().startsWith(breve.toLowerCase())) return estesa;
  return unisci(breve, estesa);
}

/**
 * Come `unisci`, ma la sottovoce non sparisce mai: `unisci` scarta la parte già contenuta nel padre
 * (es. "Controventature orizzontali" dentro il testo della voce) e due codici finirebbero con la stessa descrizione.
 */
function unisciVoce(padre: string, voce: string): string {
  const u = unisci(padre, voce);
  return voce && u === pulisci(padre) ? `${u} — ${voce}` : u;
}

type Prodotto = { codice: string; voce: boolean; breve: string; estesa: string; testo: string; udm: string; prezzo: number | null; grp: string };

export function parse(buf: Buffer): VoceNormalizzata[] {
  if (!buf.length) throw new Error("six: file vuoto");
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    removeNSPrefix: true,
    parseTagValue: false,
    parseAttributeValue: false,
    htmlEntities: true,
    isArray: (nome) => ARRAY.has(nome),
  });
  let doc: Nodo;
  try {
    doc = parser.parse(decodifica(buf)) as Nodo;
  } catch (e) {
    throw new Error(`six: XML non valido (${(e as Error).message})`);
  }
  const radice = doc?.Documento as Nodo | undefined;
  if (!radice || typeof radice !== "object") throw new Error("six: manca <Documento>");
  const prezzario = lista(radice.prezzario)[0];
  if (!prezzario) throw new Error("six: manca <prezzario>");
  const prodotti = lista(prezzario.prodotto);
  if (!prodotti.length) throw new Error("six: nessun <prodotto>");
  const sep = testo((radice.intestazione as Nodo | undefined)?.separatore) || ".";

  const unita = new Map<string, string>();
  for (const u of lista(prezzario.unitaDiMisura)) {
    const t = sistema(testo(u.simbolo)) || sistema(testo(lista(u.udmDescrizione)[0]?.breve)) || sistema(testo(u.udmId));
    // "cad." (Trento) → "cad": `mapUnita` non riconosce il punto finale.
    unita.set(testo(u.unitaDiMisuraId), t.replace(/\.+$/, ""));
  }

  // Albero dei capitoli dai gruppi (Emilia-Romagna): grpValoreId → descrizione della radice (vlrId senza ".").
  const vlrPerId = new Map<string, { vlrId: string; descr: string }>();
  const descrPerVlr = new Map<string, string>();
  for (const g of lista(radice.gruppo)) {
    for (const v of lista(g.grpValore)) {
      const vlrId = testo(v.vlrId);
      const descr = sistema(testo(lista(v.vlrDescrizione)[0]?.breve));
      vlrPerId.set(testo(v.grpValoreId), { vlrId, descr });
      if (vlrId && !descrPerVlr.has(vlrId)) descrPerVlr.set(vlrId, descr);
    }
  }

  const listaPrincipale = testo(lista(prezzario.listaQuotazione)[0]?.listaQuotazioneId);
  const perCodice = new Map<string, Prodotto>();
  const ordine: Prodotto[] = [];
  for (const p of prodotti) {
    const codice = senzaPrefisso(testo(p.prdId));
    if (!codice) continue; // intestazioni senza codice (titoli di capitolo Eldasoft)
    const d = descrizioneIt(p.prdDescrizione);
    const quot = lista(p.prdQuotazione);
    const q = quot.find((x) => testo(x.listaQuotazioneId) === listaPrincipale) ?? quot[0];
    const prod: Prodotto = {
      codice,
      voce: testo(p.voce) === "true",
      breve: sistema(testo(d?.breve)),
      estesa: sistema(testo(d?.estesa)),
      testo: testoProdotto(d),
      udm: unita.get(testo(p.unitaDiMisuraId)) ?? "",
      prezzo: q ? numeroIt(testo(q.valore)) : null,
      grp: testo(lista(p.prdGrpValore)[0]?.grpValoreId),
    };
    if (!perCodice.has(codice)) perCodice.set(codice, prod);
    ordine.push(prod);
  }

  const padre = (codice: string): Prodotto | undefined => {
    const parti = codice.split(sep);
    for (let n = parti.length - 1; n > 0; n--) {
      const p = perCodice.get(parti.slice(0, n).join(sep));
      if (p) return p;
    }
    return undefined;
  };

  const capitolo = (p: Prodotto): string | null => {
    const radiceCodice = p.codice.split(sep)[0];
    const top = radiceCodice !== p.codice ? perCodice.get(radiceCodice) : undefined;
    if (top) return top.breve || top.testo;
    const g = vlrPerId.get(p.grp);
    if (g) return descrPerVlr.get(g.vlrId.split(".")[0]) ?? g.descr;
    return null;
  };

  const grezze: VoceGrezza[] = [];
  for (const p of ordine) {
    if (p.prezzo == null || !(p.prezzo > 0)) continue;
    const pad = padre(p.codice);
    const propriaEstesa = !!p.estesa && p.estesa.toLowerCase() !== p.breve.toLowerCase();
    const descrizione = pad && (pad.voce || !propriaEstesa) ? unisciVoce(pad.testo, p.testo) : p.testo;
    grezze.push({ codice: p.codice, capitolo: capitolo(p), descrizione, unita_testo: p.udm, prezzo: p.prezzo });
  }
  if (!grezze.length) throw new Error("six: nessun <prodotto> con <prdQuotazione> valorizzata");
  return finalizza(grezze);
}
