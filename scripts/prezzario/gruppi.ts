import type { VoceNormalizzata } from "./core";
import type { Fonte } from "./fonti";

/** Fonti dello stesso prezzario (regione, ambito, anno): più file confluiscono in uno. */
export function raggruppa(fonti: Fonte[]): Fonte[][] {
  const gruppi = new Map<string, Fonte[]>();
  for (const f of fonti) {
    const k = `${f.regione}|${f.ambito}|${f.anno}`;
    gruppi.set(k, [...(gruppi.get(k) ?? []), f]);
  }
  return [...gruppi.values()];
}

/** Voci di tutti i file di un prezzario; un codice ripetuto tra file è un errore, non una sovrascrittura. */
export function unisciGruppo(perFile: VoceNormalizzata[][]): VoceNormalizzata[] {
  const visti = new Set<string>();
  const out: VoceNormalizzata[] = [];
  for (const voci of perFile) {
    for (const v of voci) {
      if (visti.has(v.codice)) throw new Error(`Codice ${v.codice} presente in più file dello stesso prezzario`);
      visti.add(v.codice);
      out.push(v);
    }
  }
  return out;
}

export function codiciDaCancellare(esistenti: string[], nuovi: Set<string>): string[] {
  return esistenti.filter((c) => !nuovi.has(c));
}
