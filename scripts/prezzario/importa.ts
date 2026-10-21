import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { unzipSync } from "fflate";
import type { VoceNormalizzata } from "./core";
import { FONTI, type Fonte } from "./fonti";
import { FORMATI } from "./formati";
import { codiciDaCancellare, raggruppa, unisciGruppo } from "./gruppi";

const DATA = "scripts/prezzario/data";
const BLOCCO = 500;

async function leggi(fonte: Fonte): Promise<Buffer> {
  const [file, voce] = fonte.file.split("#");
  const path = join(DATA, file);
  if (!existsSync(path)) {
    const init: RequestInit = {};
    if (fonte.form) {
      const form = new FormData();
      for (const [k, v] of Object.entries(fonte.form)) form.append(k, v);
      Object.assign(init, { method: "POST", body: form });
    }
    const res = await fetch(fonte.url, init);
    if (!res.ok) throw new Error(`Download ${fonte.url}: HTTP ${res.status}`);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, Buffer.from(await res.arrayBuffer()));
    console.log(`Salvato ${path}`);
  }
  const buf = readFileSync(path);
  if (!voce) return buf;
  const re = new RegExp(voce, "i");
  // Si decomprime solo il file richiesto.
  const entry = Object.entries(unzipSync(buf, { filter: (f) => re.test(f.name) }))[0];
  if (!entry) throw new Error(`${fonte.file}: nessun file dello zip corrisponde a ${voce}`);
  return Buffer.from(entry[1]);
}

async function carica(gruppo: Fonte[], voci: VoceNormalizzata[]) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY mancanti");
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // Il registro è la fonte di verità: titolo, licenza e attivo vengono dall'ultima fonte del gruppo.
  const { regione, ambito, anno, titolo, url: fonte_url, licenza, attivo } = gruppo[gruppo.length - 1];
  // Spento durante il caricamento: un import a metà non viene mai scelto per un preventivo.
  const { data: prezzario, error: errP } = await supabase
    .from("prezzari")
    .upsert({ regione, ambito, anno, titolo, fonte_url, licenza, attivo: false }, { onConflict: "regione,ambito,anno" })
    .select("id")
    .single();
  if (errP || !prezzario) throw new Error(`Upsert prezzari: ${errP?.message ?? "nessun id"}`);

  for (let i = 0; i < voci.length; i += BLOCCO) {
    const blocco = voci.slice(i, i + BLOCCO).map((v) => ({ ...v, prezzario_id: prezzario.id }));
    const { error } = await supabase.from("prezzario_voci").upsert(blocco, { onConflict: "prezzario_id,codice" });
    if (error) throw new Error(`Upsert voci (da ${i}): ${error.message}`);
  }

  // Voci non più presenti nella fonte (errata, nuova edizione dello stesso anno): si cancellano.
  // preventivo_interventi.prezzario_voce_id è on delete set null e la riga conserva i suoi dati.
  const esistenti: string[] = [];
  for (let da = 0; ; da += 1000) {
    const { data, error } = await supabase
      .from("prezzario_voci")
      .select("codice")
      .eq("prezzario_id", prezzario.id)
      .order("codice")
      .range(da, da + 999);
    if (error) throw new Error(`Lettura codici: ${error.message}`);
    esistenti.push(...(data ?? []).map((r) => r.codice));
    if (!data || data.length < 1000) break;
  }
  const vecchi = codiciDaCancellare(esistenti, new Set(voci.map((v) => v.codice)));
  for (let i = 0; i < vecchi.length; i += 200) {
    const { error } = await supabase
      .from("prezzario_voci")
      .delete()
      .eq("prezzario_id", prezzario.id)
      .in("codice", vecchi.slice(i, i + 200));
    if (error) throw new Error(`Cancellazione voci vecchie: ${error.message}`);
  }

  const { error: errA } = await supabase.from("prezzari").update({ attivo }).eq("id", prezzario.id);
  if (errA) throw new Error(`Attivazione: ${errA.message}`);
  return vecchi.length;
}

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes("--dry");
  const pos = args.filter((a) => !a.startsWith("--"));
  const fonti = args.includes("--tutte")
    ? FONTI
    : FONTI.filter((f) => f.regione === pos[0] && (pos[1] === undefined || f.ambito === pos[1].toUpperCase()));
  if (!fonti.length) throw new Error("Uso: pnpm prezzario:import <regione> [ambito] [--dry] | --tutte [--dry]");

  const falliti: string[] = [];
  for (const gruppo of raggruppa(fonti)) {
    const f = gruppo[0];
    const nome = `${f.regione}${f.ambito ? `/${f.ambito}` : ""} ${f.anno}`;
    try {
      const perFile: VoceNormalizzata[][] = [];
      for (const fonte of gruppo) perFile.push(FORMATI[fonte.formato](await leggi(fonte)));
      const voci = unisciGruppo(perFile);
      if (!voci.length) throw new Error("nessuna voce valida");
      if (dry) {
        console.log(`${nome}: ${voci.length} voci (${gruppo.length} file)`);
        for (let k = 0; k < 3; k++) console.log("  ", JSON.stringify(voci[Math.floor(Math.random() * voci.length)]));
        continue;
      }
      const cancellate = await carica(gruppo, voci);
      console.log(`${nome}: importate ${voci.length} voci, cancellate ${cancellate} non più presenti`);
    } catch (e) {
      falliti.push(nome);
      console.error(`${nome}: ERRORE ${e instanceof Error ? e.message : e}`);
    }
  }
  if (falliti.length) throw new Error(`Import non riuscito per: ${falliti.join(", ")}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
