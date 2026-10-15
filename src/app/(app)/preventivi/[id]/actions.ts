"use server";

import { revalidatePath } from "next/cache";

import { requireContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/types";

import { applicaScelta, risolviVoce } from "../../../../../supabase/functions/_shared/risolvi-voce";
import { unitaDaVoci } from "../../../../../supabase/functions/_shared/unita-voce";
import {
  aBlocchi,
  decidiSceltaMassiva,
  diventaManuale,
  isSceltaFonte,
  prezzoDiverso,
  type SceltaFonte,
} from "@/lib/scelta-fonte";

type Unita = Database["public"]["Enums"]["unita_misura"];
type Stato = Database["public"]["Enums"]["preventivo_stato"];
type FontePrezzi = Database["public"]["Enums"]["fonte_prezzi"];
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

  const { data: cur, error: curError } = await supabase
    .from("preventivo_interventi")
    .select("descrizione_prezzario, descrizione_propria, prezzo_prezzario, prezzo_proprio, fonte_scelta")
    .eq("id", interventoId)
    .maybeSingle();
  const nuovaDesc = s(formData.get("descrizione"));
  const nuovoPrezzo = n(formData.get("prezzo_unitario"));
  // Se la riga corrente non è leggibile non tocchiamo fonte_scelta.
  const fontePatch: { fonte_scelta?: "manuale" } = {};
  if (!curError && cur) {
    const descFonte =
      cur.fonte_scelta === "prezzario"
        ? cur.descrizione_prezzario
        : cur.fonte_scelta === "propria"
          ? cur.descrizione_propria
          : null;
    const prezzoFonte =
      cur.fonte_scelta === "prezzario"
        ? cur.prezzo_prezzario
        : cur.fonte_scelta === "propria"
          ? cur.prezzo_proprio
          : null;
    // Descrizione o prezzo ritoccati a mano → la riga non segue più la fonte.
    if (
      diventaManuale(cur.fonte_scelta, descFonte, nuovaDesc) ||
      prezzoDiverso(cur.fonte_scelta, prezzoFonte, nuovoPrezzo)
    ) {
      fontePatch.fonte_scelta = "manuale";
    }
  }

  await supabase
    .from("preventivo_interventi")
    .update({
      ...fontePatch,
      titolo: s(formData.get("titolo")) ?? "Intervento",
      gruppo: s(formData.get("gruppo")),
      descrizione: nuovaDesc,
      unita: (s(formData.get("unita")) ?? "corpo") as Unita,
      quantita: n(formData.get("quantita")),
      prezzo_unitario: nuovoPrezzo,
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

export async function setPrezzoMercato(
  interventoId: string,
  preventivoId: string,
  prezzoMercato: number | null,
  fonte: string | null,
) {
  await requireContext();
  const supabase = await createClient();
  await supabase
    .from("preventivo_interventi")
    .update({ prezzo_mercato: prezzoMercato, fonte_mercato: fonte })
    .eq("id", interventoId);
  revalidatePath(`/preventivi/${preventivoId}`);
}

export async function saveSuperficie(
  preventivoId: string,
  edificioId: string | null,
  superficieMq: number,
) {
  const { org } = await requireContext();
  const supabase = await createClient();
  if (edificioId) {
    await supabase.from("edifici").update({ superficie_stimata_mq: superficieMq }).eq("id", edificioId);
  } else {
    const { data } = await supabase
      .from("edifici")
      .insert({ org_id: org.id, superficie_stimata_mq: superficieMq })
      .select("id")
      .single();
    if (data?.id) {
      await supabase.from("preventivi").update({ edificio_id: data.id }).eq("id", preventivoId);
    }
  }
  revalidatePath(`/preventivi/${preventivoId}`);
}

export async function saveAnnotazioni(
  preventivoId: string,
  storagePath: string,
  punti: unknown,
) {
  const { org } = await requireContext();
  const supabase = await createClient();
  await supabase
    .from("foto_annotazioni")
    .delete()
    .eq("preventivo_id", preventivoId)
    .eq("storage_path", storagePath);
  await supabase.from("foto_annotazioni").insert({
    org_id: org.id,
    preventivo_id: preventivoId,
    storage_path: storagePath,
    punti: punti as Json,
    legenda: {} as Json,
  });
  revalidatePath(`/preventivi/${preventivoId}`);
}

type InterventoGenerato = {
  titolo: string;
  descrizione: string;
  unita: Unita;
  quantita: number;
  prezzo_unitario: number;
};

export async function generaInterventiDaFoto(
  preventivoId: string,
  interventi: InterventoGenerato[],
) {
  const { org } = await requireContext();
  const supabase = await createClient();
  const { count } = await supabase
    .from("preventivo_interventi")
    .select("id", { count: "exact", head: true })
    .eq("preventivo_id", preventivoId);
  const UNITA_VALIDE: Unita[] = ["corpo", "mq", "ml", "mc", "giorno", "cad", "kg"];
  const base = count ?? 0;
  if (interventi.length > 0) {
    const { error } = await supabase.from("preventivo_interventi").insert(
      interventi.map((i, idx) => ({
        org_id: org.id,
        preventivo_id: preventivoId,
        ordine: base + idx,
        gruppo: "Da foto",
        titolo: i.titolo,
        descrizione: i.descrizione,
        unita: UNITA_VALIDE.includes(i.unita) ? i.unita : ("corpo" as Unita),
        quantita: i.quantita,
        prezzo_unitario: i.prezzo_unitario,
      })),
    );
    if (error) throw error;
  }
  await recomputeTotale(preventivoId);
  revalidatePath(`/preventivi/${preventivoId}`);
}

export async function addCicloPitturazione(
  preventivoId: string,
  superficieMq: number | null,
) {
  const { org } = await requireContext();
  const supabase = await createClient();

  // Cerca un ciclo "pitturazione" in libreria (org poi globale)
  const { data: cicli } = await supabase
    .from("cicli_lavorazione")
    .select("*")
    .ilike("titolo", "%pitturazione%")
    .order("org_id", { ascending: false, nullsFirst: false })
    .limit(1);
  const ciclo = cicli?.[0];

  const { count } = await supabase
    .from("preventivo_interventi")
    .select("id", { count: "exact", head: true })
    .eq("preventivo_id", preventivoId);

  await supabase.from("preventivo_interventi").insert({
    org_id: org.id,
    preventivo_id: preventivoId,
    ordine: count ?? 0,
    titolo: ciclo?.titolo ?? "Pitturazione totale della superficie",
    descrizione:
      ciclo?.descrizione_fasi ??
      "Ciclo completo di pitturazione della superficie: preparazione del supporto, applicazione fissativo e finitura.",
    unita: (ciclo?.unita_default ?? "mq") as Unita,
    quantita: superficieMq ?? 1,
    prezzo_unitario: ciclo?.prezzo_default ?? 0,
    ciclo_id: ciclo?.id ?? null,
  });

  await recomputeTotale(preventivoId);
  revalidatePath(`/preventivi/${preventivoId}`);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FONTI_PREZZI: string[] = ["prezzario", "propri", "entrambi"];

/** Cambia la fonte prezzi del preventivo (vale per i prossimi abbinamenti). */
export async function setFontePrezzi(preventivoId: string, fonte: string) {
  const { org } = await requireContext();
  if (!UUID_RE.test(preventivoId) || !FONTI_PREZZI.includes(fonte)) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("preventivi")
    .update({ fonte_prezzi: fonte as FontePrezzi })
    .eq("id", preventivoId)
    .eq("org_id", org.id);
  if (error) throw new Error("Salvataggio della fonte prezzi non riuscito.");
  revalidatePath(`/preventivi/${preventivoId}`);
}

export type VocePrezzario = {
  id: string;
  codice: string;
  descrizione: string;
  unita: Unita;
  unita_testo: string;
  prezzo: number;
  prezzario: string;
};
export type VocePropria = {
  id: string;
  titolo: string;
  descrizione: string;
  unita: Unita;
  prezzo: number;
};

const MIN_RICERCA = 2;
const MAX_RICERCA = 200;
const LIMITE_RISULTATI = 10;

/** Cerca nel prezzario della regione dell'org e/o nella libreria personale, secondo la fonte prezzi. */
export async function cercaVoci(
  q: string,
  fonte: FontePrezzi,
): Promise<{ prezzario: VocePrezzario[]; proprie: VocePropria[] }> {
  const { org } = await requireContext();
  const testo = typeof q === "string" ? q.trim().slice(0, MAX_RICERCA) : "";
  if (testo.length < MIN_RICERCA || !FONTI_PREZZI.includes(fonte)) {
    return { prezzario: [], proprie: [] };
  }
  const supabase = await createClient();
  const [p, m] = await Promise.all([
    fonte !== "propri"
      ? supabase.rpc("cerca_prezzario", { q: testo, p_regione: org.regione, p_limit: LIMITE_RISULTATI })
      : Promise.resolve({ data: [], error: null }),
    fonte !== "prezzario"
      ? supabase.rpc("cerca_voci_proprie", { q: testo, p_org: org.id, p_limit: LIMITE_RISULTATI })
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (p.error || m.error) throw new Error("Ricerca voci non riuscita.");
  return {
    prezzario: (p.data ?? []).map((v) => ({
      id: v.id,
      codice: v.codice,
      descrizione: v.descrizione,
      unita: v.unita,
      unita_testo: v.unita_testo,
      prezzo: Number(v.prezzo),
      prezzario: v.prezzario,
    })),
    proprie: (m.data ?? []).map((v) => ({
      id: v.id,
      titolo: v.titolo,
      descrizione: v.descrizione,
      unita: v.unita,
      prezzo: Number(v.prezzo),
    })),
  };
}

function titoloDa(descrizione: string) {
  const t = descrizione.trim().replace(/\s+/g, " ");
  if (t.length <= 80) return t;
  const taglio = t.slice(0, 80);
  const spazio = taglio.lastIndexOf(" ");
  return `${(spazio > 40 ? taglio.slice(0, spazio) : taglio).trimEnd()}…`;
}

/** Aggiunge un intervento da una voce di prezzario e/o della libreria (doppia descrizione). */
export async function addInterventoDaVoce(
  preventivoId: string,
  sel: { prezzarioVoceId: string | null; vocePropriaId: string | null },
): Promise<void> {
  const { org } = await requireContext();
  const prezzarioVoceId = sel?.prezzarioVoceId ?? null;
  let vocePropriaId = sel?.vocePropriaId ?? null;
  if (
    !UUID_RE.test(preventivoId) ||
    (prezzarioVoceId !== null && !UUID_RE.test(prezzarioVoceId)) ||
    (vocePropriaId !== null && !UUID_RE.test(vocePropriaId))
  ) {
    throw new Error("Richiesta non valida.");
  }

  const supabase = await createClient();
  const { data: prev } = await supabase
    .from("preventivi")
    .select("id, fonte_prezzi")
    .eq("id", preventivoId)
    .eq("org_id", org.id)
    .maybeSingle();
  if (!prev) throw new Error("Preventivo non trovato.");

  // Con fonte 'prezzario' la libreria non entra in gioco.
  if (prev.fonte_prezzi === "prezzario") vocePropriaId = null;
  if (!prezzarioVoceId && !vocePropriaId) throw new Error("Seleziona almeno una voce.");

  const [{ data: pv }, { data: vp }, { count }] = await Promise.all([
    prezzarioVoceId
      ? supabase
          .from("prezzario_voci")
          .select("id, codice, descrizione, unita, unita_testo, prezzo")
          .eq("id", prezzarioVoceId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    vocePropriaId
      ? supabase
          .from("voci_proprie")
          .select("id, titolo, descrizione, unita, prezzo")
          .eq("id", vocePropriaId)
          .eq("org_id", org.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("preventivo_interventi")
      .select("id", { count: "exact", head: true })
      .eq("preventivo_id", preventivoId),
  ]);
  if ((prezzarioVoceId && !pv) || (vocePropriaId && !vp)) throw new Error("Voce non trovata.");

  const r = risolviVoce(
    prev.fonte_prezzi,
    pv ? { descrizione: pv.descrizione, prezzo: Number(pv.prezzo) } : null,
    vp ? { descrizione: vp.descrizione, prezzo: Number(vp.prezzo) } : null,
  );
  const u = unitaDaVoci(pv, vp);

  const { error } = await supabase.from("preventivo_interventi").insert({
    org_id: org.id,
    preventivo_id: preventivoId,
    ordine: count ?? 0,
    titolo: vp?.titolo ?? (pv ? titoloDa(pv.descrizione) : "Intervento"),
    unita: u.unita,
    quantita: 1,
    descrizione: r.descrizione,
    prezzo_unitario: r.prezzo ?? 0,
    fonte_scelta: r.scelta,
    abbinamento_avviso: u.avviso ?? r.avviso,
    prezzario_voce_id: pv?.id ?? null,
    codice_prezzario: pv?.codice ?? null,
    descrizione_prezzario: pv?.descrizione ?? null,
    prezzo_prezzario: pv ? Number(pv.prezzo) : null,
    voce_propria_id: vp?.id ?? null,
    descrizione_propria: vp?.descrizione ?? null,
    prezzo_proprio: vp ? Number(vp.prezzo) : null,
  });
  if (error) throw new Error("Aggiunta della voce non riuscita.");

  await recomputeTotale(preventivoId);
  revalidatePath(`/preventivi/${preventivoId}`);
}

/** Sceglie per una voce la descrizione (e il prezzo) del prezzario o della libreria personale. */
export async function scegliFonte(
  interventoId: string,
  preventivoId: string,
  scelta: SceltaFonte,
): Promise<void> {
  await requireContext();
  if (!UUID_RE.test(interventoId) || !UUID_RE.test(preventivoId) || !isSceltaFonte(scelta)) {
    throw new Error("Richiesta non valida.");
  }
  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("preventivo_interventi")
    .select("descrizione_prezzario, prezzo_prezzario, descrizione_propria, prezzo_proprio")
    .eq("id", interventoId)
    .eq("preventivo_id", preventivoId)
    .maybeSingle();
  if (error) throw new Error("Cambio descrizione non riuscito.");
  if (!row) throw new Error("Voce non trovata.");
  // Copia solo descrizione e prezzo: l'unità resta quella della riga.
  const patch = applicaScelta(scelta, row);
  if (!patch) throw new Error("Questa descrizione non è disponibile per la voce.");
  const { error: updError } = await supabase
    .from("preventivo_interventi")
    .update(patch)
    .eq("id", interventoId)
    .eq("preventivo_id", preventivoId);
  if (updError) throw new Error("Cambio descrizione non riuscito.");
  await recomputeTotale(preventivoId);
  revalidatePath(`/preventivi/${preventivoId}`);
}

const BLOCCO_AGGIORNAMENTI = 20;

export type EsitoSceltaTutti = {
  aggiornati: number;
  /** Voci modificate a mano, lasciate invariate. */
  saltati: number;
  /** Voci senza la descrizione richiesta. */
  senzaFonte: number;
  /** Voci già sulla fonte richiesta. */
  giaImpostati: number;
  errori: number;
};

/** Applica la stessa fonte a tutte le voci del preventivo (mai a quelle modificate a mano). */
export async function scegliFonteTutti(
  preventivoId: string,
  scelta: SceltaFonte,
): Promise<EsitoSceltaTutti> {
  const { org } = await requireContext();
  if (!UUID_RE.test(preventivoId) || !isSceltaFonte(scelta)) throw new Error("Richiesta non valida.");
  const supabase = await createClient();
  const { data: prev } = await supabase
    .from("preventivi")
    .select("id")
    .eq("id", preventivoId)
    .eq("org_id", org.id)
    .maybeSingle();
  if (!prev) throw new Error("Preventivo non trovato.");

  const { data: rows, error } = await supabase
    .from("preventivo_interventi")
    .select("id, descrizione_prezzario, prezzo_prezzario, descrizione_propria, prezzo_proprio, fonte_scelta")
    .eq("preventivo_id", preventivoId);
  if (error) throw new Error("Lettura delle voci non riuscita.");

  const esito: EsitoSceltaTutti = { aggiornati: 0, saltati: 0, senzaFonte: 0, giaImpostati: 0, errori: 0 };
  const daAggiornare: { id: string; patch: NonNullable<ReturnType<typeof applicaScelta>> }[] = [];
  for (const r of rows ?? []) {
    const d = decidiSceltaMassiva(scelta, r);
    if (d.esito === "aggiorna") daAggiornare.push({ id: r.id, patch: d.patch });
    else if (d.esito === "manuale") esito.saltati++;
    else if (d.esito === "senza_fonte") esito.senzaFonte++;
    else esito.giaImpostati++;
  }

  for (const blocco of aBlocchi(daAggiornare, BLOCCO_AGGIORNAMENTI)) {
    const risultati = await Promise.all(
      blocco.map(({ id, patch }) =>
        supabase
          .from("preventivo_interventi")
          .update(patch)
          .eq("id", id)
          .eq("preventivo_id", preventivoId)
          // Non sovrascrive una voce diventata manuale nel frattempo.
          .or("fonte_scelta.is.null,fonte_scelta.neq.manuale")
          .select("id"),
      ),
    );
    for (const r of risultati) {
      if (r.error) esito.errori++;
      // 0 righe restituite: voce diventata manuale nel frattempo oppure update negato dalla RLS.
      else if ((r.data ?? []).length > 0) esito.aggiornati++;
      else esito.saltati++;
    }
  }

  if (esito.aggiornati > 0) await recomputeTotale(preventivoId);
  revalidatePath(`/preventivi/${preventivoId}`);
  return esito;
}
