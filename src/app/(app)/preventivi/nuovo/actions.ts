"use server";

import { redirect } from "next/navigation";

import { requireContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type Modalita = Database["public"]["Enums"]["preventivo_modalita"];

export async function createPreventivoAction(formData: FormData) {
  const { org, userId } = await requireContext();
  const rawModalita = String(formData.get("modalita") ?? "manuale");
  const modalita = (["manuale", "capitolato", "foto"].includes(rawModalita)
    ? rawModalita
    : "manuale") as Modalita;
  const oggetto = String(formData.get("oggetto") ?? "").trim() || null;

  const supabase = await createClient();

  // Protocollo progressivo: {YY}-{n}
  const { count } = await supabase
    .from("preventivi")
    .select("id", { count: "exact", head: true })
    .eq("org_id", org.id);

  const yy = new Date().getFullYear().toString().slice(-2);
  const protocollo = `${yy}-${(count ?? 0) + 1}`;

  const { data, error } = await supabase
    .from("preventivi")
    .insert({
      org_id: org.id,
      modalita,
      oggetto,
      numero_protocollo: protocollo,
      iva: org.default_iva,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect("/preventivi?error=create");
  }

  redirect(`/preventivi/${data!.id}`);
}
