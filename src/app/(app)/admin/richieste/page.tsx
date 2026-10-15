import Link from "next/link";

import { EmptyState, PageHeader, StatoBadge } from "@/components/ui/misc";
import { requirePlatformAdmin } from "@/lib/admin";
import { formatDate } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";

const tipoLabel: Record<string, string> = {
  foto_descrizione: "Foto + descrizione",
  foto_capitolato: "Foto + capitolato",
};

export default async function RichiestePage() {
  await requirePlatformAdmin();

  const { data: richieste } = await createAdminClient()
    .from("richieste_servizio")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Richieste"
        description="Preventivi in 24h richiesti da INVIA FILE."
      />

      {!richieste || richieste.length === 0 ? (
        <EmptyState
          title="Nessuna richiesta"
          description="Le richieste inviate dalla home compariranno qui."
        />
      ) : (
        <div className="overflow-x-auto rounded-md border border-hairline">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-surface-soft text-left text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Comune</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 text-right font-medium">File</th>
                <th className="px-4 py-3 font-medium">Stato</th>
                <th className="px-4 py-3 font-medium">Notifiche</th>
              </tr>
            </thead>
            <tbody>
              {richieste.map((r) => {
                const fails = [
                  r.notifica_email_ok === false ? "email ✗" : null,
                  r.notifica_whatsapp_ok === false ? "whatsapp ✗" : null,
                ].filter(Boolean);
                return (
                  <tr
                    key={r.id}
                    className="border-t border-hairline hover:bg-surface-soft/60"
                  >
                    <td className="px-4 py-3 text-body">
                      <Link href={`/admin/richieste/${r.id}`} className="text-link">
                        {formatDate(r.created_at)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink">{r.nome}</td>
                    <td className="px-4 py-3 text-body">{r.comune ?? "—"}</td>
                    <td className="px-4 py-3 text-body">{tipoLabel[r.tipo] ?? r.tipo}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink">
                      {Array.isArray(r.files) ? r.files.length : 0}
                    </td>
                    <td className="px-4 py-3">
                      <StatoBadge stato={r.stato} />
                    </td>
                    <td className="px-4 py-3 text-xs text-ink">
                      {fails.length ? fails.join(", ") : <span className="text-stone">ok</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
