"use server";

import { revalidatePath } from "next/cache";

import { requireContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function s(v: FormDataEntryValue | null): string | null {
  const x = String(v ?? "").trim();
  return x === "" ? null : x;
}

export async function saveOrgAction(formData: FormData) {
  const { org } = await requireContext();
  const supabase = await createClient();

  const iva = Number(String(formData.get("default_iva") ?? "10").replace(",", "."));
  const costo = formData.get("costo_giornaliero")
    ? Number(String(formData.get("costo_giornaliero")).replace(",", "."))
    : null;

  const { data: prezzari } = await supabase
    .from("prezzari")
    .select("regione")
    .eq("attivo", true);
  const richiesta = String(formData.get("regione") ?? "");
  const regione = (prezzari ?? []).some((p) => p.regione === richiesta)
    ? richiesta
    : org.regione;

  await supabase
    .from("organizations")
    .update({
      name: s(formData.get("name")) ?? org.name,
      ragione_sociale: s(formData.get("ragione_sociale")),
      partita_iva: s(formData.get("partita_iva")),
      indirizzo: s(formData.get("indirizzo")),
      comune: s(formData.get("comune")),
      cap: s(formData.get("cap")),
      provincia: s(formData.get("provincia")),
      email: s(formData.get("email")),
      telefono: s(formData.get("telefono")),
      default_iva: Number.isFinite(iva) ? iva : 10,
      costo_giornaliero: costo,
      logo_url: s(formData.get("logo_url")),
      regione,
    })
    .eq("id", org.id);

  revalidatePath("/impostazioni");
  revalidatePath("/dashboard");
}
