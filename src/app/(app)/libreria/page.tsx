import { Card, PageHeader } from "@/components/ui/misc";
import { requireContext } from "@/lib/auth";
import { UNITA_LABEL, formatEuro } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function LibreriaPage() {
  await requireContext();
  const supabase = await createClient();

  const [{ data: cicli }, { data: prezzi }, { data: materiali }] =
    await Promise.all([
      supabase
        .from("cicli_lavorazione")
        .select("id, codice, titolo, categoria, unita_default, prezzo_default")
        .order("categoria", { ascending: true })
        .order("titolo", { ascending: true }),
      supabase
        .from("prezzi_unitari")
        .select("id, voce, unita, prezzo, categoria")
        .order("categoria", { ascending: true }),
      supabase
        .from("materiali_prodotti")
        .select("id, lavorazione_keyword, prodotto, marca, alternativa")
        .order("lavorazione_keyword", { ascending: true }),
    ]);

  return (
    <div>
      <PageHeader
        title="Libreria"
        description="Cicli di lavorazione, prezzi di riferimento e mappa materiali su corda."
      />

      <section className="mb-10">
        <h2 className="title-sm mb-3 text-ink">
          Cicli di lavorazione ({cicli?.length ?? 0})
        </h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {cicli?.map((c) => (
            <Card key={c.id} className="p-4">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-muted">
                  {c.categoria}
                </span>
                {c.prezzo_default ? (
                  <span className="text-xs text-ink">
                    {formatEuro(c.prezzo_default)} {UNITA_LABEL[c.unita_default]}
                  </span>
                ) : (
                  <span className="text-xs text-muted">
                    {UNITA_LABEL[c.unita_default]}
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-ink">{c.titolo}</p>
              {c.codice ? (
                <p className="mt-1 text-xs text-muted">{c.codice}</p>
              ) : null}
            </Card>
          ))}
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-2">
        <section>
          <h2 className="title-sm mb-3 text-ink">
            Prezzi di riferimento ({prezzi?.length ?? 0})
          </h2>
          <div className="overflow-hidden rounded-md border border-hairline">
            <table className="w-full text-sm">
              <tbody>
                {prezzi?.map((p) => (
                  <tr key={p.id} className="border-t border-hairline first:border-t-0">
                    <td className="px-4 py-2.5 text-ink">{p.voce}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-body">
                      {formatEuro(p.prezzo)}{" "}
                      <span className="text-muted">{UNITA_LABEL[p.unita]}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="title-sm mb-3 text-ink">
            Materiali ({materiali?.length ?? 0})
          </h2>
          <div className="overflow-hidden rounded-md border border-hairline">
            <table className="w-full text-sm">
              <tbody>
                {materiali?.map((m) => (
                  <tr key={m.id} className="border-t border-hairline first:border-t-0">
                    <td className="px-4 py-2.5 text-body">
                      {m.lavorazione_keyword}
                    </td>
                    <td className="px-4 py-2.5 text-ink">
                      {m.prodotto}
                      {m.marca ? (
                        <span className="text-muted"> · {m.marca}</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
