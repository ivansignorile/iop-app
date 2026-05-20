import { EmptyState, PageHeader } from "@/components/ui/misc";
import { requireContext } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

const TIPO_LABEL: Record<string, string> = {
  condominio: "Condominio",
  privato: "Privato",
  azienda: "Azienda",
};

export default async function ClientiPage() {
  await requireContext();
  const supabase = await createClient();

  const { data: clienti } = await supabase
    .from("clienti")
    .select("id, nome, tipo, comune, amministratore, created_at")
    .order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader
        title="Clienti"
        description="Committenti (condomini, privati, aziende) delle tue offerte."
      />

      {!clienti || clienti.length === 0 ? (
        <EmptyState
          title="Nessun cliente"
          description="I committenti vengono creati durante la compilazione di un preventivo."
        />
      ) : (
        <div className="overflow-hidden rounded-md border border-hairline">
          <table className="w-full text-sm">
            <thead className="bg-surface-soft text-left text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Comune</th>
                <th className="px-4 py-3 font-medium">Amministratore</th>
                <th className="px-4 py-3 font-medium">Creato</th>
              </tr>
            </thead>
            <tbody>
              {clienti.map((c) => (
                <tr key={c.id} className="border-t border-hairline">
                  <td className="px-4 py-3 text-ink">{c.nome}</td>
                  <td className="px-4 py-3 text-body">
                    {TIPO_LABEL[c.tipo] ?? c.tipo}
                  </td>
                  <td className="px-4 py-3 text-body">{c.comune ?? "—"}</td>
                  <td className="px-4 py-3 text-body">
                    {c.amministratore ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {formatDate(c.created_at)}
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
