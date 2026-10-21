import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { unzipSync } from "fflate";
import type { VoceNormalizzata } from "./core";
import { FONTI, type Fonte } from "./fonti";
import { FORMATI } from "./formati";

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
  const entry = Object.entries(unzipSync(buf)).find(([nome]) => re.test(nome));
  if (!entry) throw new Error(`${fonte.file}: nessun file dello zip corrisponde a ${voce}`);
  return Buffer.from(entry[1]);
}

async function carica(fonte: Fonte, voci: VoceNormalizzata[]) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY mancanti");
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { regione, ambito, anno, titolo, url: fonte_url, licenza, attivo } = fonte;
  const { data: prezzario, error: errP } = await supabase
    .from("prezzari")
    .upsert({ regione, ambito, anno, titolo, fonte_url, licenza, attivo }, { onConflict: "regione,ambito,anno" })
    .select("id")
    .single();
  if (errP || !prezzario) throw new Error(`Upsert prezzari: ${errP?.message ?? "nessun id"}`);

  for (let i = 0; i < voci.length; i += BLOCCO) {
    const blocco = voci.slice(i, i + BLOCCO).map((v) => ({ ...v, prezzario_id: prezzario.id }));
    const { error } = await supabase.from("prezzario_voci").upsert(blocco, { onConflict: "prezzario_id,codice" });
    if (error) throw new Error(`Upsert voci (da ${i}): ${error.message}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes("--dry");
  const pos = args.filter((a) => !a.startsWith("--"));
  const fonti = args.includes("--tutte")
    ? FONTI
    : FONTI.filter((f) => f.regione === pos[0] && (pos[1] === undefined || f.ambito === pos[1].toUpperCase()));
  if (!fonti.length) throw new Error("Uso: pnpm prezzario:import <regione> [ambito] [--dry] | --tutte [--dry]");

  for (const fonte of fonti) {
    const nome = `${fonte.regione}${fonte.ambito ? `/${fonte.ambito}` : ""} ${fonte.anno}`;
    const voci = FORMATI[fonte.formato](await leggi(fonte));
    if (!voci.length) throw new Error(`${nome}: nessuna voce valida`);
    console.log(`${nome}: ${voci.length} voci`);
    if (dry) {
      for (let k = 0; k < 3; k++) console.log("  ", JSON.stringify(voci[Math.floor(Math.random() * voci.length)]));
      continue;
    }
    await carica(fonte, voci);
    console.log(`${nome}: importato`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
