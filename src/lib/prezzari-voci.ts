import type { SupabaseClient } from "@supabase/supabase-js";

import type { RifPrezzario } from "./prezzario-preventivo";
import type { Database } from "./supabase/types";

/** Prezzario di provenienza (regione, ambito) delle voci del prezzario usate nelle righe. */
export async function prezzariDelleVoci(
  supabase: SupabaseClient<Database>,
  righe: { prezzario_voce_id: string | null }[],
): Promise<Record<string, RifPrezzario>> {
  const ids = [...new Set(righe.map((r) => r.prezzario_voce_id).filter((x): x is string => !!x))];
  if (!ids.length) return {};
  const { data } = await supabase.from("prezzario_voci").select("id, prezzari(regione, ambito)").in("id", ids);
  const out: Record<string, RifPrezzario> = {};
  for (const v of data ?? []) if (v.prezzari) out[v.id] = { regione: v.prezzari.regione, ambito: v.prezzari.ambito };
  return out;
}
