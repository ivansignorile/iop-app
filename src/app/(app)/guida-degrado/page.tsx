import { Card, PageHeader } from "@/components/ui/misc";
import { requireContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function GuidaDegradoPage() {
  await requireContext();
  const supabase = await createClient();

  const { data: livelli } = await supabase
    .from("degrado_samples")
    .select("livello, intervento, descrizione, image_path")
    .order("livello", { ascending: true });

  const perLivello = new Map<
    number,
    { intervento: string; descrizione: string | null; image_path: string | null }
  >();
  for (const l of livelli ?? []) {
    if (!perLivello.has(l.livello)) {
      perLivello.set(l.livello, {
        intervento: l.intervento,
        descrizione: l.descrizione,
        image_path: l.image_path,
      });
    }
  }

  const samples = await Promise.all(
    Array.from({ length: 9 }, (_, k) => k + 1).map(async (livello) => {
      const s = perLivello.get(livello);
      let url: string | null = null;
      if (s?.image_path) {
        const { data } = await supabase.storage
          .from("preventivi")
          .createSignedUrl(s.image_path, 3600);
        url = data?.signedUrl ?? null;
      }
      return {
        livello,
        intervento: s?.intervento ?? null,
        descrizione: s?.descrizione ?? null,
        url,
      };
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
        {samples.map((s) => (
          <Card key={s.livello}>
            <div className="flex items-baseline justify-between">
              <span className="display-md text-ink">{s.livello}</span>
              <span className="eyebrow text-stone">su 9</span>
            </div>
            {s.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={s.url}
                alt={`Livello ${s.livello}`}
                className="mt-3 aspect-[4/3] w-full rounded-md border border-hairline object-cover"
              />
            ) : (
              <div className="mt-3 flex aspect-[4/3] items-center justify-center rounded-md border border-dashed border-hairline text-xs text-stone">
                Nessuna immagine di riferimento
              </div>
            )}
            <p className="mt-3 title-sm text-ink">{s.intervento ?? "—"}</p>
            {s.descrizione ? (
              <p className="mt-1 text-sm leading-relaxed text-graphite">
                {s.descrizione}
              </p>
            ) : null}
          </Card>
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
