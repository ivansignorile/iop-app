"use server";

import { revalidatePath } from "next/cache";

import { requireContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type Unita = Database["public"]["Enums"]["unita_misura"];

function s(v: FormDataEntryValue | null): string | null {
  const x = String(v ?? "").trim();
  return x === "" ? null : x;
}
function num(v: FormDataEntryValue | null): number {
  const x = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(x) ? x : 0;
}

/* ---------------- Prezzi unitari ---------------- */

export async function addPrezzo(formData: FormData) {
  const { org } = await requireContext();
  const supabase = await createClient();
  const voce = s(formData.get("voce"));
  if (!voce) return;
  await supabase.from("prezzi_unitari").insert({
    org_id: org.id,
    voce,
    unita: (s(formData.get("unita")) ?? "mq") as Unita,
    prezzo: num(formData.get("prezzo")),
    categoria: s(formData.get("categoria")),
  });
  revalidatePath("/libreria");
}

export async function updatePrezzo(id: string, formData: FormData) {
  await requireContext();
  const supabase = await createClient();
  await supabase
    .from("prezzi_unitari")
    .update({
      voce: s(formData.get("voce")) ?? "—",
      unita: (s(formData.get("unita")) ?? "mq") as Unita,
      prezzo: num(formData.get("prezzo")),
    })
    .eq("id", id);
  revalidatePath("/libreria");
}

export async function deletePrezzo(formData: FormData) {
  await requireContext();
  const supabase = await createClient();
  await supabase.from("prezzi_unitari").delete().eq("id", String(formData.get("id")));
  revalidatePath("/libreria");
}

/* ---------------- Cicli di lavorazione ---------------- */

export async function addCiclo(formData: FormData) {
  const { org } = await requireContext();
  const supabase = await createClient();
  const titolo = s(formData.get("titolo"));
  const descrizione = s(formData.get("descrizione_fasi"));
  if (!titolo || !descrizione) return;
  await supabase.from("cicli_lavorazione").insert({
    org_id: org.id,
    titolo,
    categoria: s(formData.get("categoria")),
    descrizione_fasi: descrizione,
    unita_default: (s(formData.get("unita_default")) ?? "corpo") as Unita,
    prezzo_default: formData.get("prezzo_default") ? num(formData.get("prezzo_default")) : null,
  });
  revalidatePath("/libreria");
}

export async function updateCiclo(id: string, formData: FormData) {
  await requireContext();
  const supabase = await createClient();
  await supabase
    .from("cicli_lavorazione")
    .update({
      titolo: s(formData.get("titolo")) ?? "—",
      categoria: s(formData.get("categoria")),
      descrizione_fasi: s(formData.get("descrizione_fasi")) ?? "",
      unita_default: (s(formData.get("unita_default")) ?? "corpo") as Unita,
      prezzo_default: formData.get("prezzo_default") ? num(formData.get("prezzo_default")) : null,
    })
    .eq("id", id);
  revalidatePath("/libreria");
}

export async function deleteCiclo(formData: FormData) {
  await requireContext();
  const supabase = await createClient();
  await supabase.from("cicli_lavorazione").delete().eq("id", String(formData.get("id")));
  revalidatePath("/libreria");
}
