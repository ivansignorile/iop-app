"use server";

import { revalidatePath } from "next/cache";

import { requireContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function s(v: FormDataEntryValue | null): string | null {
  const x = String(v ?? "").trim();
  return x === "" ? null : x;
}

/** Salva (insert o update) la riga org-level per un livello di degrado. */
export async function saveLivelloMap(livello: number, formData: FormData) {
  const { org } = await requireContext();
  const supabase = await createClient();

  const ciclo_id = s(formData.get("ciclo_id"));
  const descrizione = s(formData.get("descrizione"));
  const image_path = s(formData.get("image_path"));

  // Ricava intervento dal titolo del ciclo scelto
  let intervento = "Intervento";
  if (ciclo_id) {
    const { data: ciclo } = await supabase
      .from("cicli_lavorazione")
      .select("titolo")
      .eq("id", ciclo_id)
      .maybeSingle();
    if (ciclo?.titolo) intervento = ciclo.titolo;
  }

  // Controlla se esiste già riga org per questo livello
  const { data: existing } = await supabase
    .from("degrado_samples")
    .select("id")
    .eq("org_id", org.id)
    .eq("livello", livello)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("degrado_samples")
      .update({ ciclo_id, descrizione, image_path, intervento })
      .eq("id", existing.id);
  } else {
    await supabase.from("degrado_samples").insert({
      org_id: org.id,
      livello,
      intervento,
      ciclo_id,
      descrizione,
      image_path,
    });
  }

  revalidatePath("/guida-degrado");
}

/** Elimina la riga org-level per un livello (ripristina default globale). */
export async function resetLivello(livello: number) {
  const { org } = await requireContext();
  const supabase = await createClient();

  await supabase
    .from("degrado_samples")
    .delete()
    .eq("org_id", org.id)
    .eq("livello", livello);

  revalidatePath("/guida-degrado");
}
