import Link from "next/link";
import { notFound } from "next/navigation";

import { requireContext } from "@/lib/auth";
import { prezzariDelleVoci } from "@/lib/prezzari-voci";
import { etichettaPrezzario } from "@/lib/prezzario-preventivo";
import { createClient } from "@/lib/supabase/server";
import { PreventivoEditor } from "./editor";
import type { PreviewData } from "./preview";

export default async function PreventivoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { org } = await requireContext();
  const { id } = await params;
  const supabase = await createClient();

  const { data: preventivo } = await supabase
    .from("preventivi")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!preventivo) notFound();

  const [{ data: cliente }, { data: edificio }, { data: interventi }, { data: cicli }] =
    await Promise.all([
      preventivo.cliente_id
        ? supabase.from("clienti").select("*").eq("id", preventivo.cliente_id).maybeSingle()
        : Promise.resolve({ data: null }),
      preventivo.edificio_id
        ? supabase.from("edifici").select("*").eq("id", preventivo.edificio_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("preventivo_interventi")
        .select("*")
        .eq("preventivo_id", id)
        .order("ordine", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("cicli_lavorazione")
        .select("id, titolo, categoria, unita_default, prezzo_default")
        .order("categoria", { ascending: true })
        .order("titolo", { ascending: true }),
    ]);

  const { data: prezzari } = await supabase.rpc("prezzario_del_preventivo", { p_preventivo: id });
  const prezzario = prezzari?.[0] ?? null;
  const prezzariVoci = await prezzariDelleVoci(supabase, interventi ?? []);

  const { data: allegatiRows } = await supabase
    .from("preventivo_allegati")
    .select("storage_path, caption, livello_degrado")
    .eq("preventivo_id", id)
    .eq("tipo", "foto")
    .order("created_at", { ascending: true });

  const allegati = [] as PreviewData["allegati"];
  if (allegatiRows && allegatiRows.length > 0) {
    const { data: signed } = await supabase.storage
      .from("preventivi")
      .createSignedUrls(allegatiRows.map((a) => a.storage_path), 3600);
    allegatiRows.forEach((a, idx) => {
      const url = signed?.[idx]?.signedUrl;
      if (url) allegati!.push({ url, caption: a.caption, livello: a.livello_degrado });
    });
  }

  const preview: PreviewData = {
    org,
    prezzario,
    prezzariVoci,
    preventivo,
    cliente,
    edificio,
    interventi: interventi ?? [],
    allegati,
  };

  return (
    <div>
      <Link href="/preventivi" className="mb-4 inline-block text-sm text-link">
        ← Preventivi
      </Link>
      <PreventivoEditor
        preventivo={preventivo}
        cliente={cliente}
        edificio={edificio}
        interventi={interventi ?? []}
        cicli={cicli ?? []}
        preview={preview}
        prezzario={etichettaPrezzario(prezzario, org.regione)}
      />
    </div>
  );
}
