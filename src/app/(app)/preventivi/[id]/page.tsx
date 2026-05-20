import Link from "next/link";
import { notFound } from "next/navigation";

import { requireContext } from "@/lib/auth";
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

  const preview: PreviewData = {
    org,
    preventivo,
    cliente,
    edificio,
    interventi: interventi ?? [],
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
      />
    </div>
  );
}
