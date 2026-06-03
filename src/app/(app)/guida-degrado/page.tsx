import { Card, PageHeader } from "@/components/ui/misc";
import { requireContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { LivelloCard } from "./livello-card";

export default async function GuidaDegradoPage() {
  const { org } = await requireContext();
  const supabase = await createClient();

  // Righe org corrente
  const { data: orgRows } = await supabase
    .from("degrado_samples")
    .select("id, livello, intervento, descrizione, image_path, ciclo_id")
    .eq("org_id", org.id)
    .order("livello", { ascending: true });

  // Righe globali (default)
  const { data: globalRows } = await supabase
    .from("degrado_samples")
    .select("id, livello, intervento, descrizione, image_path, ciclo_id")
    .is("org_id", null)
    .order("livello", { ascending: true });

  // Cicli disponibili per la select
  const { data: cicli } = await supabase
    .from("cicli_lavorazione")
    .select("id, titolo")
    .order("titolo", { ascending: true });

  type SampleRow = {
    id: string;
    livello: number;
    intervento: string;
    descrizione: string | null;
    image_path: string | null;
    ciclo_id: string | null;
  };

  const orgMap = new Map<number, SampleRow>();
  for (const r of orgRows ?? []) orgMap.set(r.livello, r as SampleRow);

  const globalMap = new Map<number, SampleRow>();
  for (const r of globalRows ?? []) globalMap.set(r.livello, r as SampleRow);

  // Genera signed URL per la riga attiva (override > globale)
  const levels = await Promise.all(
    Array.from({ length: 9 }, (_, k) => k + 1).map(async (livello) => {
      const override = orgMap.get(livello) ?? null;
      const globale = globalMap.get(livello) ?? null;
      const active = override ?? globale;
      let signedUrl: string | null = null;
      if (active?.image_path) {
        const { data } = await supabase.storage
          .from("preventivi")
          .createSignedUrl(active.image_path, 3600);
        signedUrl = data?.signedUrl ?? null;
      }
      return { livello, override, globale, signedUrl };
    }),
  );

  return (
    <div>
      <PageHeader
        eyebrow="Riferimento"
        title="Guida alla scala del degrado"
        description="Come il sistema valuta l'ammaloramento di una facciata, da 1 (minimo) a 9 (severo), e quale lavorazione viene suggerita per ciascun livello."
      />

      <div className="grid gap-4 md:grid-cols-3">
        {levels.map((l) => (
          <LivelloCard
            key={`${l.livello}-${l.override?.id ?? "g"}-${l.override?.ciclo_id ?? ""}-${l.override?.descrizione ?? ""}-${l.override?.image_path ?? ""}`}
            livello={l.livello}
            override={l.override}
            globale={l.globale}
            signedUrl={l.signedUrl}
            cicli={cicli ?? []}
          />
        ))}
      </div>

      <Card className="mt-4">
        <p className="title-sm text-ink">Come leggere i livelli</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-graphite">
          <li>
            <span className="font-semibold text-ink">1–3</span>: degrado lieve,
            interventi estetici/localizzati.
          </li>
          <li>
            <span className="font-semibold text-ink">4–6</span>: degrado medio,
            ripristini puntuali e protezione.
          </li>
          <li>
            <span className="font-semibold text-ink">7–9</span>: degrado
            importante su area estesa, si suggerisce pitturazione totale e ciclo
            completo.
          </li>
        </ul>
      </Card>
    </div>
  );
}
