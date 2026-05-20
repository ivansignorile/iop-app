import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader, StatoBadge } from "@/components/ui/misc";
import { requireContext } from "@/lib/auth";
import { formatDate, formatEuro } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function PreventiviPage() {
  await requireContext();
  const supabase = await createClient();

  const { data: preventivi } = await supabase
    .from("preventivi")
    .select("id, numero_protocollo, oggetto, data, stato, totale_imponibile, clienti(nome)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader
        title="Preventivi"
        description="Tutte le offerte tecnico-economiche della tua impresa."
        action={<ButtonLink href="/preventivi/nuovo?modalita=manuale">Nuovo preventivo</ButtonLink>}
      />

      {!preventivi || preventivi.length === 0 ? (
        <EmptyState
          title="Nessun preventivo"
          description="Crea il primo preventivo dal capitolato o partendo da zero."
          action={
            <ButtonLink href="/preventivi/nuovo?modalita=manuale">
              Crea preventivo
            </ButtonLink>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-md border border-hairline">
          <table className="w-full text-sm">
            <thead className="bg-surface-soft text-left text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Protocollo</th>
                <th className="px-4 py-3 font-medium">Cliente / Oggetto</th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Stato</th>
                <th className="px-4 py-3 text-right font-medium">Imponibile</th>
              </tr>
            </thead>
            <tbody>
              {preventivi.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-hairline hover:bg-surface-soft/60"
                >
                  <td className="px-4 py-3">
                    <Link href={`/preventivi/${p.id}`} className="text-link">
                      {p.numero_protocollo ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink">
                    {p.clienti?.nome ?? p.oggetto ?? "Senza titolo"}
                  </td>
                  <td className="px-4 py-3 text-body">{formatDate(p.data)}</td>
                  <td className="px-4 py-3">
                    <StatoBadge stato={p.stato} />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink">
                    {formatEuro(p.totale_imponibile)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
