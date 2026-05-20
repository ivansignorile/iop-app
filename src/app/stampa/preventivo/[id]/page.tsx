import { notFound } from "next/navigation";

import { requireContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PreventivoPreview, type PreviewData } from "@/app/(app)/preventivi/[id]/preview";
import { AutoPrint } from "./auto-print";

export default async function StampaPreventivoPage({
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

  const [{ data: cliente }, { data: edificio }, { data: interventi }] =
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
        .order("ordine", { ascending: true }),
    ]);

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
    preventivo,
    cliente,
    edificio,
    interventi: interventi ?? [],
    allegati,
  };

  return (
    <div className="bg-surface-soft py-8 print:bg-canvas print:py-0">
      <AutoPrint />
      <PreventivoPreview data={preview} />
    </div>
  );
}
