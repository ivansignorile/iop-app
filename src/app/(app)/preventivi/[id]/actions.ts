"use server";

import { revalidatePath } from "next/cache";

import { requireContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type Unita = Database["public"]["Enums"]["unita_misura"];
type Stato = Database["public"]["Enums"]["preventivo_stato"];
type ClienteTipo = Database["public"]["Enums"]["cliente_tipo"];

function n(v: FormDataEntryValue | null): number {
  const x = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(x) ? x : 0;
}
function s(v: FormDataEntryValue | null): string | null {
  const x = String(v ?? "").trim();
  return x === "" ? null : x;
}

async function recomputeTotale(preventivoId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("preventivo_interventi")
    .select("importo")
    .eq("preventivo_id", preventivoId);
  const totale = (data ?? []).reduce((acc, r) => acc + Number(r.importo ?? 0), 0);
  await supabase
    .from("preventivi")
    .update({ totale_imponibile: totale })
    .eq("id", preventivoId);
}

/** Salva oggetto/iva/data/note + committente + edificio. */
export async function saveAnagrafica(preventivoId: string, formData: FormData) {
  const { org } = await requireContext();
  const supabase = await createClient();

  const { data: prev } = await supabase
    .from("preventivi")
    .select("id, cliente_id, edificio_id")
    .eq("id", preventivoId)
    .single();
  if (!prev) return;

  // Committente
  const clientePatch = {
    org_id: org.id,
    tipo: (s(formData.get("cliente_tipo")) ?? "condominio") as ClienteTipo,
    nome: s(formData.get("cliente_nome")) ?? "Committente",
    amministratore: s(formData.get("cliente_amministratore")),
    codice_fiscale: s(formData.get("cliente_cf")),
    partita_iva: s(formData.get("cliente_piva")),
    email: s(formData.get("cliente_email")),
    telefono: s(formData.get("cliente_telefono")),
  };
  let clienteId = prev.cliente_id;
  if (clienteId) {
    await supabase.from("clienti").update(clientePatch).eq("id", clienteId);
  } else {
    const { data } = await supabase
      .from("clienti")
      .insert(clientePatch)
      .select("id")
      .single();
    clienteId = data?.id ?? null;
  }

  // Edificio
  const edificioPatch = {
    org_id: org.id,
    cliente_id: clienteId,
    indirizzo: s(formData.get("ed_indirizzo")),
    comune: s(formData.get("ed_comune")),
    cap: s(formData.get("ed_cap")),
    provincia: s(formData.get("ed_provincia")),
    piani: formData.get("ed_piani") ? Math.trunc(n(formData.get("ed_piani"))) : null,
    facciate: formData.get("ed_facciate")
      ? Math.trunc(n(formData.get("ed_facciate")))
      : null,
    balconi: formData.get("ed_balconi")
      ? Math.trunc(n(formData.get("ed_balconi")))
      : null,
    tipo_copertura: s(formData.get("ed_copertura")),
    porzione: s(formData.get("ed_porzione")),
  };
  let edificioId = prev.edificio_id;
  if (edificioId) {
    await supabase.from("edifici").update(edificioPatch).eq("id", edificioId);
  } else {
    const { data } = await supabase
      .from("edifici")
      .insert(edificioPatch)
      .select("id")
      .single();
    edificioId = data?.id ?? null;
  }

  await supabase
    .from("preventivi")
    .update({
      oggetto: s(formData.get("oggetto")),
      iva: n(formData.get("iva")),
      data: s(formData.get("data")) ?? undefined,
      note: s(formData.get("note")),
      cliente_id: clienteId,
      edificio_id: edificioId,
    })
    .eq("id", preventivoId);

  revalidatePath(`/preventivi/${preventivoId}`);
}

/** Aggiunge un intervento copiando un ciclo della libreria. */
export async function addInterventoFromCiclo(
  preventivoId: string,
  cicloId: string,
) {
  const { org } = await requireContext();
  const supabase = await createClient();

  const { data: ciclo } = await supabase
    .from("cicli_lavorazione")
    .select("*")
    .eq("id", cicloId)
    .single();
  if (!ciclo) return;

  const { count } = await supabase
    .from("preventivo_interventi")
    .select("id", { count: "exact", head: true })
    .eq("preventivo_id", preventivoId);

  await supabase.from("preventivo_interventi").insert({
    org_id: org.id,
    preventivo_id: preventivoId,
    ordine: count ?? 0,
    titolo: ciclo.titolo,
    descrizione: ciclo.descrizione_fasi,
    unita: ciclo.unita_default,
    quantita: 1,
    prezzo_unitario: ciclo.prezzo_default ?? 0,
    ciclo_id: ciclo.id,
  });

  await recomputeTotale(preventivoId);
  revalidatePath(`/preventivi/${preventivoId}`);
}

export async function addInterventoBlank(preventivoId: string) {
  const { org } = await requireContext();
  const supabase = await createClient();
  const { count } = await supabase
    .from("preventivo_interventi")
    .select("id", { count: "exact", head: true })
    .eq("preventivo_id", preventivoId);

  await supabase.from("preventivo_interventi").insert({
    org_id: org.id,
    preventivo_id: preventivoId,
    ordine: count ?? 0,
    titolo: "Nuovo intervento",
    unita: "corpo" as Unita,
    quantita: 1,
    prezzo_unitario: 0,
  });

  await recomputeTotale(preventivoId);
  revalidatePath(`/preventivi/${preventivoId}`);
}

export async function updateIntervento(
  interventoId: string,
  preventivoId: string,
  formData: FormData,
) {
  await requireContext();
  const supabase = await createClient();

  await supabase
    .from("preventivo_interventi")
    .update({
      titolo: s(formData.get("titolo")) ?? "Intervento",
      gruppo: s(formData.get("gruppo")),
      descrizione: s(formData.get("descrizione")),
      unita: (s(formData.get("unita")) ?? "corpo") as Unita,
      quantita: n(formData.get("quantita")),
      prezzo_unitario: n(formData.get("prezzo_unitario")),
      sconto: n(formData.get("sconto")),
    })
    .eq("id", interventoId);

  await recomputeTotale(preventivoId);
  revalidatePath(`/preventivi/${preventivoId}`);
}

export async function deleteIntervento(
  interventoId: string,
  preventivoId: string,
) {
  await requireContext();
  const supabase = await createClient();
  await supabase.from("preventivo_interventi").delete().eq("id", interventoId);
  await recomputeTotale(preventivoId);
  revalidatePath(`/preventivi/${preventivoId}`);
}

export async function saveAllegato(
  preventivoId: string,
  storagePath: string,
  livello: number | null,
  caption: string | null,
) {
  const { org } = await requireContext();
  const supabase = await createClient();
  await supabase.from("preventivo_allegati").insert({
    org_id: org.id,
    preventivo_id: preventivoId,
    storage_path: storagePath,
    tipo: "foto",
    caption,
    livello_degrado: livello,
  });
  revalidatePath(`/preventivi/${preventivoId}`);
}

export async function updateStato(preventivoId: string, stato: Stato) {
  await requireContext();
  const supabase = await createClient();
  await supabase.from("preventivi").update({ stato }).eq("id", preventivoId);
  revalidatePath(`/preventivi/${preventivoId}`);
}
