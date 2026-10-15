"use server";

import { revalidatePath } from "next/cache";

import { requirePlatformAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

type Stato = Database["public"]["Enums"]["richiesta_stato"];

const STATI: Stato[] = ["nuova", "in_lavorazione", "evasa", "scartata"];

export async function setStatoRichiesta(id: string, formData: FormData) {
  await requirePlatformAdmin();
  const stato = String(formData.get("stato")) as Stato;
  if (!STATI.includes(stato)) return;
  const note = String(formData.get("note_interne") ?? "").trim() || null;
  const { error } = await createAdminClient()
    .from("richieste_servizio")
    .update({ stato, note_interne: note })
    .eq("id", id);
  if (error) throw error;
  revalidatePath(`/admin/richieste/${id}`);
  revalidatePath("/admin/richieste");
}
