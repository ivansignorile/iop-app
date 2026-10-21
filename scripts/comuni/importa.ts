import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { parseComuni } from "./parse";

const URL_FONTE = "https://raw.githubusercontent.com/matteocontrini/comuni-json/master/comuni.json";
const FILE = "scripts/prezzario/data/comuni/comuni.json";
const BLOCCO = 1000;

async function main() {
  if (!existsSync(FILE)) {
    const res = await fetch(URL_FONTE);
    if (!res.ok) throw new Error(`Download comuni: HTTP ${res.status}`);
    mkdirSync(dirname(FILE), { recursive: true });
    writeFileSync(FILE, Buffer.from(await res.arrayBuffer()));
  }
  const comuni = parseComuni(readFileSync(FILE));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY mancanti");
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  for (let i = 0; i < comuni.length; i += BLOCCO) {
    const { error } = await supabase.from("comuni").upsert(comuni.slice(i, i + BLOCCO), { onConflict: "codice_istat" });
    if (error) throw new Error(`Upsert comuni (da ${i}): ${error.message}`);
  }
  console.log(`Comuni importati: ${comuni.length}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
