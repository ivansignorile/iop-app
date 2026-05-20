import { UNITA_LABEL, formatDate, formatEuro } from "@/lib/format";
import type { Tables } from "@/lib/supabase/types";

export type PreviewData = {
  org: Tables<"organizations">;
  preventivo: Pick<
    Tables<"preventivi">,
    "numero_protocollo" | "data" | "oggetto" | "iva" | "note"
  >;
  cliente: Pick<
    Tables<"clienti">,
    "nome" | "tipo" | "amministratore" | "indirizzo" | "comune"
  > | null;
  edificio: Pick<
    Tables<"edifici">,
    "indirizzo" | "comune" | "cap" | "provincia"
  > | null;
  interventi: Pick<
    Tables<"preventivo_interventi">,
    "id" | "gruppo" | "titolo" | "descrizione" | "unita" | "quantita" | "prezzo_unitario" | "importo"
  >[];
};

function groupBy(interventi: PreviewData["interventi"]) {
  const map = new Map<string, PreviewData["interventi"]>();
  for (const i of interventi) {
    const key = i.gruppo?.trim() || "Lavorazioni";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(i);
  }
  return [...map.entries()];
}

/** Riga importo intervento. */
function importoLabel(i: PreviewData["interventi"][number]) {
  if (i.unita === "corpo") return `${formatEuro(i.importo)} + IVA`;
  return `${formatEuro(i.prezzo_unitario)} ${UNITA_LABEL[i.unita]} × ${i.quantita} = ${formatEuro(i.importo)} + IVA`;
}

export function PreventivoPreview({ data }: { data: PreviewData }) {
  const { org, preventivo, cliente, edificio, interventi } = data;
  const groups = groupBy(interventi);
  const totale = interventi.reduce((a, i) => a + Number(i.importo ?? 0), 0);
  const luogo =
    [edificio?.indirizzo, edificio?.comune].filter(Boolean).join(" - ") || "—";

  return (
    <article className="mx-auto max-w-[820px] border border-hairline bg-canvas p-10 text-ink print:border-0">
      {/* Intestazione */}
      <header className="mb-8 border-b border-hairline pb-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <h2 className="title-lg">OFFERTA TECNICO ECONOMICA</h2>
          {org.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={org.logo_url}
              alt={org.name}
              className="h-14 w-auto object-contain"
            />
          ) : (
            <span className="text-lg font-medium text-ink">
              {org.ragione_sociale ?? org.name}
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">
              Luogo intervento
            </p>
            <p className="text-ink">{luogo}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">
              Protocollo
            </p>
            <p className="text-ink">{preventivo.numero_protocollo ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Data</p>
            <p className="text-ink">{formatDate(preventivo.data)}</p>
          </div>
        </div>
        <div className="mt-4 text-sm">
          <p className="text-xs uppercase tracking-wide text-muted">Cliente</p>
          <p className="text-ink">
            {cliente?.nome ?? "—"}
            {cliente?.amministratore ? ` · Amm. ${cliente.amministratore}` : ""}
          </p>
        </div>
      </header>

      {/* Relazione */}
      <section className="mb-8 text-sm/relaxed">
        <h3 className="mb-2 font-medium">Relazione</h3>
        <p className="text-body">
          A seguito della Vostra gentilissima richiesta e dopo aver effettuato il
          sopralluogo presso lo stabile, formuliamo la nostra migliore offerta
          economica per i sotto descritti interventi. Le lavorazioni vengono
          eseguite con tecniche di sicurezza su corda, nel rispetto del D.Lgs
          81/2008 e s.m.i., senza installazione di ponteggi, opere provvisionali
          o piattaforme aeree.
        </p>
      </section>

      {/* Interventi */}
      <section className="mb-8">
        <h3 className="mb-3 font-medium">Descrizione interventi</h3>
        {interventi.length === 0 ? (
          <p className="text-sm text-muted">Nessun intervento inserito.</p>
        ) : (
          <div className="space-y-5">
            {groups.map(([gruppo, items]) => (
              <div key={gruppo}>
                {groups.length > 1 ? (
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                    {gruppo}
                  </p>
                ) : null}
                <div className="space-y-4">
                  {items.map((i) => (
                    <div
                      key={i.id}
                      className="border-b border-hairline pb-3 last:border-b-0"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <p className="font-medium text-ink">{i.titolo}</p>
                        <p className="whitespace-nowrap text-sm text-ink">
                          {importoLabel(i)}
                        </p>
                      </div>
                      {i.descrizione ? (
                        <p className="mt-1 whitespace-pre-line text-sm/relaxed text-body">
                          {i.descrizione}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Riepilogo */}
      <section className="mb-8">
        <h3 className="mb-3 font-medium">Riepilogo offerta</h3>
        <table className="w-full text-sm">
          <tbody>
            {groups.map(([gruppo, items]) => {
              const sub = items.reduce((a, i) => a + Number(i.importo ?? 0), 0);
              return (
                <tr key={gruppo} className="border-b border-hairline">
                  <td className="py-2 text-body">{gruppo}</td>
                  <td className="py-2 text-right tabular-nums text-ink">
                    {formatEuro(sub)}
                  </td>
                </tr>
              );
            })}
            <tr className="border-t-2 border-ink">
              <td className="py-2 font-medium text-ink">
                Totale imponibile (IVA {preventivo.iva}%)
              </td>
              <td className="py-2 text-right font-medium tabular-nums text-ink">
                {formatEuro(totale)}
              </td>
            </tr>
            <tr>
              <td className="py-1 text-sm text-muted">
                IVA {preventivo.iva}%
              </td>
              <td className="py-1 text-right text-sm tabular-nums text-muted">
                {formatEuro((totale * Number(preventivo.iva)) / 100)}
              </td>
            </tr>
            <tr>
              <td className="py-1 font-semibold text-ink">Totale</td>
              <td className="py-1 text-right font-semibold tabular-nums text-ink">
                {formatEuro(totale * (1 + Number(preventivo.iva) / 100))}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <footer className="border-t border-hairline pt-4 text-xs text-muted">
        {org.ragione_sociale ?? org.name}
        {org.partita_iva ? ` · P.IVA ${org.partita_iva}` : ""}
        {[org.indirizzo, org.cap, org.comune, org.provincia]
          .filter(Boolean)
          .join(" ")
          ? ` · ${[org.indirizzo, org.cap, org.comune, org.provincia].filter(Boolean).join(" ")}`
          : ""}
        {org.email ? ` · ${org.email}` : ""}
        {org.telefono ? ` · ${org.telefono}` : ""}
      </footer>
    </article>
  );
}
