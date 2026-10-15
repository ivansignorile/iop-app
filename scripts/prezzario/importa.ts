import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { normalizzaPrezzario, type ArticoloApi, type PrezzoApi } from "./parse";

const ENDPOINT = "https://gestione-prezzario.regione.campania.it/api/apillppv2-price-list";
const BLOCCO = 500;

type Risposta = {
  success: boolean;
  data: { articles: ArticoloApi[]; prices: PrezzoApi[] };
};

async function main() {
  const [sorgente, regione, annoStr, titolo] = process.argv.slice(2);
  if (!sorgente || !regione || !annoStr || !titolo) {
    throw new Error('Uso: pnpm prezzario:import <file.json|--download> <regione> <anno> "<titolo>"');
  }
  const anno = Number(annoStr);
  if (!Number.isInteger(anno)) throw new Error("Anno non valido");

  let json: Risposta;
  if (sorgente === "--download") {
    const form = new FormData();
    form.append("year", String(anno));
    form.append("addendum", "0");
    const res = await fetch(ENDPOINT, { method: "POST", body: form });
    if (!res.ok) throw new Error(`Download fallito: HTTP ${res.status}`);
    const testo = await res.text();
    const dest = `scripts/prezzario/data/${regione}-${anno}.json`;
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, testo);
    console.log(`Salvato ${dest}`);
    json = JSON.parse(testo);
  } else {
    json = JSON.parse(readFileSync(sorgente, "utf8"));
  }
  if (json.success !== true) throw new Error("Risposta con success !== true");

  const voci = normalizzaPrezzario(json.data.articles, json.data.prices);
  console.log(`Articoli: ${json.data.articles.length}, voci valide: ${voci.length}`);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY mancanti");
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data: prezzario, error: errP } = await supabase
    .from("prezzari")
    .upsert({ regione, anno, titolo, attivo: true }, { onConflict: "regione,anno" })
    .select("id")
    .single();
  if (errP || !prezzario) throw new Error(`Upsert prezzari: ${errP?.message ?? "nessun id"}`);

  for (let i = 0; i < voci.length; i += BLOCCO) {
    const blocco = voci.slice(i, i + BLOCCO).map((v) => ({ ...v, prezzario_id: prezzario.id }));
    const { error } = await supabase
      .from("prezzario_voci")
      .upsert(blocco, { onConflict: "prezzario_id,codice" });
    if (error) throw new Error(`Upsert voci (da ${i}): ${error.message}`);
    console.log(`Importate ${Math.min(i + BLOCCO, voci.length)}/${voci.length}`);
  }
  console.log("Import completato");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
