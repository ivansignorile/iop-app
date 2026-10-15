"use server";

import { revalidatePath } from "next/cache";

import { requireContext } from "@/lib/auth";
import { isUuid, validaVoce } from "@/lib/libreria/voce";
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

/* ---------------- Libreria personale (voci proprie) ---------------- */

export type EsitoAzione = { ok: true } | { ok: false; errore: string };

export async function updateVocePropria(id: string, formData: FormData): Promise<EsitoAzione> {
  const { org } = await requireContext();
  if (!isUuid(id)) return { ok: false, errore: "Voce non valida." };
  const v = validaVoce(Object.fromEntries(formData));
  if (!v.ok) return v;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("voci_proprie")
    .update(v.value)
    .eq("id", id)
    .eq("org_id", org.id)
    .select("id");
  if (error) return { ok: false, errore: "Salvataggio non riuscito." };
  if (!data?.length) return { ok: false, errore: "Voce non trovata." };
  revalidatePath("/libreria");
  return { ok: true };
}

export async function deleteVocePropria(id: string): Promise<EsitoAzione> {
  const { org } = await requireContext();
  if (!isUuid(id)) return { ok: false, errore: "Voce non valida." };
  const supabase = await createClient();
  const { error } = await supabase.from("voci_proprie").delete().eq("id", id).eq("org_id", org.id);
  if (error) return { ok: false, errore: "Eliminazione non riuscita." };
  revalidatePath("/libreria");
  return { ok: true };
}

/** Elimina il documento caricato e il suo file. Le voci estratte restano in libreria. */
export async function deleteDocumentoLibreria(id: string): Promise<EsitoAzione> {
  const { org } = await requireContext();
  if (!isUuid(id)) return { ok: false, errore: "Documento non valido." };
  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("documenti_libreria")
    .select("id, storage_path")
    .eq("id", id)
    .eq("org_id", org.id)
    .maybeSingle();
  if (!doc) return { ok: false, errore: "Documento non trovato." };

  if (doc.storage_path.startsWith(`${org.id}/libreria/`)) {
    const { error: stErr } = await supabase.storage.from("preventivi").remove([doc.storage_path]);
    if (stErr) return { ok: false, errore: "Impossibile eliminare il file." };
  }
  const { error } = await supabase
    .from("documenti_libreria")
    .delete()
    .eq("id", id)
    .eq("org_id", org.id);
  if (error) return { ok: false, errore: "Eliminazione non riuscita." };
  revalidatePath("/libreria");
  return { ok: true };
}
