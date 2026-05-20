import { PageHeader } from "@/components/ui/misc";
import { requireContext } from "@/lib/auth";
import { UNITA_LABEL, formatEuro } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import {
  AddCicloForm,
  AddPrezzoForm,
  CicloRow,
  PrezzoRow,
} from "./forms";

export default async function LibreriaPage() {
  const { org } = await requireContext();
  const supabase = await createClient();

  const [
    { data: prezziOrg },
    { data: prezziGlob },
    { data: cicliOrg },
    { data: cicliGlob },
  ] = await Promise.all([
    supabase
      .from("prezzi_unitari")
      .select("id, voce, unita, prezzo, categoria")
      .eq("org_id", org.id)
      .order("voce"),
    supabase
      .from("prezzi_unitari")
      .select("id, voce, unita, prezzo")
      .is("org_id", null)
      .order("categoria"),
    supabase
      .from("cicli_lavorazione")
      .select("id, titolo, categoria, unita_default, prezzo_default, descrizione_fasi")
      .eq("org_id", org.id)
      .order("titolo"),
    supabase
      .from("cicli_lavorazione")
      .select("id, titolo, categoria, unita_default, prezzo_default")
      .is("org_id", null)
      .order("categoria"),
  ]);

  return (
    <div>
      <PageHeader
        eyebrow="Listino"
        title="Libreria prezzi e cicli"
        description="I prezzi e i cicli della tua impresa hanno priorità e vengono usati dall'AI per generare i preventivi. Quelli globali restano come riferimento."
      />

      {/* ---------- Prezzi ---------- */}
      <section className="mb-12">
        <h2 className="title-sm mb-4 text-ink">I tuoi prezzi unitari</h2>
        <AddPrezzoForm />
        <div className="mt-4">
          {!prezziOrg || prezziOrg.length === 0 ? (
            <p className="text-sm text-stone">
              Nessun prezzo personalizzato. Aggiungine uno qui sopra: avrà
              priorità sui riferimenti globali.
            </p>
          ) : (
            prezziOrg.map((p) => <PrezzoRow key={p.id} prezzo={p} />)
          )}
        </div>

        <details className="mt-6">
          <summary className="cursor-pointer text-sm text-slate">
            Riferimenti globali ({prezziGlob?.length ?? 0})
          </summary>
          <div className="mt-3 overflow-hidden border border-hairline">
            <table className="w-full text-sm">
              <tbody>
                {prezziGlob?.map((p) => (
                  <tr key={p.id} className="border-b border-hairline last:border-0">
                    <td className="px-4 py-2 text-graphite">{p.voce}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-ink">
                      {formatEuro(p.prezzo)}{" "}
                      <span className="text-slate">{UNITA_LABEL[p.unita]}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>

      {/* ---------- Cicli ---------- */}
      <section>
        <h2 className="title-sm mb-4 text-ink">I tuoi cicli di lavorazione</h2>
        <AddCicloForm />
        <div className="mt-4">
          {!cicliOrg || cicliOrg.length === 0 ? (
            <p className="text-sm text-stone">
              Nessun ciclo personalizzato. Quelli che aggiungi appariranno tra le
              voci selezionabili nell&apos;editor e nel grounding dell&apos;AI.
            </p>
          ) : (
            cicliOrg.map((c) => <CicloRow key={c.id} ciclo={c} />)
          )}
        </div>

        <details className="mt-6">
          <summary className="cursor-pointer text-sm text-slate">
            Cicli globali ({cicliGlob?.length ?? 0})
          </summary>
          <div className="mt-3 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {cicliGlob?.map((c) => (
              <div key={c.id} className="border border-hairline p-3">
                <p className="text-xs uppercase tracking-wide text-stone">
                  {c.categoria}
                </p>
                <p className="text-sm font-medium text-ink">{c.titolo}</p>
                <p className="mt-1 text-xs text-slate">
                  {c.prezzo_default
                    ? `${formatEuro(c.prezzo_default)} ${UNITA_LABEL[c.unita_default]}`
                    : UNITA_LABEL[c.unita_default]}
                </p>
              </div>
            ))}
          </div>
        </details>
      </section>
    </div>
  );
}
