import { UNITA_LABEL, formatDate, formatEuro } from "@/lib/format";
import { prezzarioRiga, type RifPrezzario } from "@/lib/prezzario-preventivo";
import { riferimentoPrezzario } from "@/lib/scelta-fonte";
import type { Tables } from "@/lib/supabase/types";

export type PreviewAllegato = {
  url: string;
  caption: string | null;
  livello: number | null;
};

export type PreviewFotoDescrizione = {
  url: string;
  punti: { x: number; y: number; livello: number; nota?: string }[];
};

export type PreviewData = {
  org: Tables<"organizations">;
  /** Prezzario del preventivo (per il riferimento delle voci); null = regione dell'org. */
  prezzario: RifPrezzario | null;
  /** Prezzario di provenienza di ogni voce del prezzario usata nelle righe (id voce → prezzario). */
  prezzariVoci: Record<string, RifPrezzario>;
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
    | "id"
    | "gruppo"
    | "titolo"
    | "descrizione"
    | "unita"
    | "quantita"
    | "prezzo_unitario"
    | "importo"
    | "prezzo_mercato"
    | "fonte_scelta"
    | "codice_prezzario"
    | "prezzario_voce_id"
  >[];
  allegati?: PreviewAllegato[];
  fotoDescrizioni?: PreviewFotoDescrizione[];
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

function importoLabel(i: PreviewData["interventi"][number]) {
  if (i.unita === "corpo") return `${formatEuro(i.importo)} + IVA`;
  return `${formatEuro(i.prezzo_unitario)} ${UNITA_LABEL[i.unita]} × ${i.quantita} = ${formatEuro(i.importo)} + IVA`;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="eyebrow mb-3 border-b border-hairline pb-2 text-stone">
      {children}
    </h3>
  );
}

export function PreventivoPreview({ data }: { data: PreviewData }) {
  const { org, preventivo, cliente, edificio, interventi, allegati, fotoDescrizioni } = data;
  const groups = groupBy(interventi);
  const totale = interventi.reduce((a, i) => a + Number(i.importo ?? 0), 0);
  const iva = Number(preventivo.iva);
  const luogo =
    [edificio?.indirizzo, edificio?.comune].filter(Boolean).join(" - ") || "—";
  const azienda = org.ragione_sociale ?? org.name;

  return (
    <article className="mx-auto max-w-[820px] border border-hairline bg-canvas p-10 text-ink print:border-0">
      {/* Intestazione */}
      <header className="mb-8 border-b border-hairline pb-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <h2 className="title-lg">OFFERTA TECNICO ECONOMICA</h2>
          {org.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={org.logo_url} alt={org.name} className="h-14 w-auto object-contain" />
          ) : (
            <span className="text-lg font-medium text-ink">{azienda}</span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="eyebrow text-stone">Luogo intervento</p>
            <p className="text-ink">{luogo}</p>
          </div>
          <div>
            <p className="eyebrow text-stone">Protocollo</p>
            <p className="text-ink">{preventivo.numero_protocollo ?? "—"}</p>
          </div>
          <div>
            <p className="eyebrow text-stone">Data</p>
            <p className="text-ink">{formatDate(preventivo.data)}</p>
          </div>
        </div>
        <div className="mt-4 text-sm">
          <p className="eyebrow text-stone">Cliente</p>
          <p className="text-ink">
            {cliente?.nome ?? "—"}
            {cliente?.amministratore ? ` · Amm. ${cliente.amministratore}` : ""}
          </p>
        </div>
      </header>

      {/* Relazione */}
      <section className="mb-8 text-sm leading-relaxed">
        <SectionTitle>Relazione</SectionTitle>
        <p className="whitespace-pre-line text-graphite">
          {preventivo.note?.trim()
            ? preventivo.note
            : `A seguito della Vostra gentilissima richiesta e dopo aver effettuato il sopralluogo presso lo stabile sito in ${luogo}, ${azienda} formula la propria migliore offerta economica per i sotto descritti interventi.`}
        </p>
        <p className="mt-3 text-graphite">
          Le maestranze sono in grado di operare con tecniche di sicurezza su
          corda in tutte le parti oggetto della presente offerta, SENZA
          installare alcun tipo di ponteggio, opera provvisionale o piattaforma
          aerea, nel pieno rispetto della normativa vigente D.Lgs 9 aprile 2008
          n° 81 e s.m.i. integrato dal D.Lgs 106/2009.
        </p>
      </section>

      {/* Interventi */}
      <section className="mb-8">
        <SectionTitle>Descrizione interventi</SectionTitle>
        {interventi.length === 0 ? (
          <p className="text-sm text-stone">Nessun intervento inserito.</p>
        ) : (
          <div className="space-y-5">
            {groups.map(([gruppo, items]) => (
              <div key={gruppo}>
                {groups.length > 1 ? (
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate">
                    {gruppo}
                  </p>
                ) : null}
                <div className="space-y-4">
                  {items.map((i) => {
                    // Solo la descrizione effettiva; se viene dal prezzario se ne cita il codice.
                    const rp = prezzarioRiga(i.prezzario_voce_id, data.prezzariVoci, data.prezzario, org.regione);
                    const rif = riferimentoPrezzario(i.fonte_scelta, i.codice_prezzario, rp.regione, rp.ambito);
                    return (
                    <div key={i.id} className="border-b border-hairline pb-3 last:border-b-0">
                      <div className="flex items-start justify-between gap-4">
                        <p className="font-semibold text-ink">{i.titolo}</p>
                        <p className="whitespace-nowrap text-sm text-ink">{importoLabel(i)}</p>
                      </div>
                      {i.descrizione ? (
                        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-graphite">
                          {i.descrizione}
                        </p>
                      ) : null}
                      {rif ? <p className="mt-1 text-xs text-stone">{rif}</p> : null}
                      {i.prezzo_mercato != null ? (
                        <p className="mt-1 text-xs text-stone">
                          Riferimento mercato:{" "}
                          <span className="tabular-nums">{formatEuro(i.prezzo_mercato)}</span>{" "}
                          {UNITA_LABEL[i.unita]}
                          {Number(i.prezzo_mercato) > 0 &&
                          Math.abs(Number(i.prezzo_unitario) - Number(i.prezzo_mercato)) /
                            Number(i.prezzo_mercato) >
                            0.2
                            ? " — scostamento significativo rispetto al prezzo offerto"
                            : ""}
                        </p>
                      ) : null}
                    </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Riepilogo */}
      <section className="mb-8">
        <SectionTitle>Riepilogo offerta</SectionTitle>
        <table className="w-full text-sm">
          <tbody>
            {groups.map(([gruppo, items]) => {
              const sub = items.reduce((a, i) => a + Number(i.importo ?? 0), 0);
              return (
                <tr key={gruppo} className="border-b border-hairline">
                  <td className="py-2 text-graphite">{gruppo}</td>
                  <td className="py-2 text-right tabular-nums text-ink">{formatEuro(sub)}</td>
                </tr>
              );
            })}
            <tr className="border-t-2 border-ink">
              <td className="py-2 font-semibold text-ink">Totale imponibile</td>
              <td className="py-2 text-right font-semibold tabular-nums text-ink">{formatEuro(totale)}</td>
            </tr>
            <tr>
              <td className="py-1 text-sm text-slate">IVA {iva}%</td>
              <td className="py-1 text-right text-sm tabular-nums text-slate">
                {formatEuro((totale * iva) / 100)}
              </td>
            </tr>
            <tr>
              <td className="py-1 font-semibold text-ink">Totale</td>
              <td className="py-1 text-right font-semibold tabular-nums text-ink">
                {formatEuro(totale * (1 + iva / 100))}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Report fotografico */}
      {allegati && allegati.length > 0 ? (
        <section className="mb-8 break-inside-avoid">
          <SectionTitle>Allegato — report fotografico</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            {allegati.map((a, idx) => (
              <figure key={idx} className="break-inside-avoid">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={a.url}
                  alt={a.caption ?? "Foto"}
                  className="aspect-[4/3] w-full rounded-md border border-hairline object-cover"
                />
                <figcaption className="mt-1 text-xs leading-snug text-graphite">
                  {a.livello ? (
                    <span className="font-semibold text-ink">
                      Grado {a.livello}/9.{" "}
                    </span>
                  ) : null}
                  {a.caption}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      {/* Riferimenti normativi */}
      <section className="mb-8 text-sm leading-relaxed text-graphite break-inside-avoid">
        <SectionTitle>Riferimenti normativi</SectionTitle>
        <ul className="list-disc space-y-1 pl-5">
          <li>D.Lgs. 9 aprile 2008, n. 81 e s.m.i. — Testo Unico per la salute e la sicurezza nei luoghi di lavoro.</li>
          <li>Allegato XXI del D.Lgs. 81/08 — formazione dei lavoratori per attività su funi.</li>
          <li>Regolamento (UE) 2016/425 sui dispositivi di protezione individuale (DPI).</li>
        </ul>
        <p className="mt-2">
          Gli interventi in quota saranno effettuati esclusivamente mediante calate su corde
          statiche, e solo se le condizioni meteorologiche non mettono in pericolo la sicurezza dei lavoratori.
        </p>
      </section>

      {/* Condizioni generali */}
      <section className="mb-8 text-sm leading-relaxed text-graphite break-inside-avoid">
        <SectionTitle>Condizioni generali</SectionTitle>
        <dl className="space-y-2">
          <div>
            <dt className="font-semibold text-ink">Prezzi</dt>
            <dd>
              L&apos;importo si intende a corpo, salvo diverso accordo scritto. Sono compresi
              oneri, manodopera, fornitura materiali e attrezzature per consegnare le opere
              complete a regola d&apos;arte. Importi al netto di IVA {iva}%.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Modalità di pagamento</dt>
            <dd>Da concordare; per cantieri superiori a € 15.000 si sottoscrive contratto quadro.</dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Garanzie</dt>
            <dd>Le garanzie sulle lavorazioni saranno prestate a norma di legge.</dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Oneri del Committente</dt>
            <dd>
              Fornitura di acqua ed energia elettrica, eventuali permessi di occupazione suolo
              pubblico, direzione lavori e coordinatori della sicurezza ove previsti.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Validità e detrazioni</dt>
            <dd>
              Offerta valida 60 giorni. Possibilità di detrazione fiscale secondo normativa
              vigente. Foro competente: Bari.
            </dd>
          </div>
        </dl>
      </section>

      {fotoDescrizioni && fotoDescrizioni.length > 0 ? (
        <section className="mb-8 break-inside-avoid">
          <SectionTitle>Approfondimento — compilazione tramite foto</SectionTitle>
          <div className="space-y-6">
            {fotoDescrizioni.map((f, idx) => (
              <figure key={idx} className="break-inside-avoid">
                <div className="relative overflow-hidden rounded-md border border-hairline">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.url} alt="Foto descrizione" className="w-full" />
                  {f.punti.map((p, j) => (
                    <span key={j} className="absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-canvas bg-ink text-xs font-semibold text-canvas" style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}>{p.livello}</span>
                  ))}
                </div>
                <figcaption className="mt-2 text-xs text-graphite">
                  <ul className="space-y-0.5">
                    {f.punti.map((p, j) => (
                      <li key={j}><span className="font-semibold text-ink">Livello {p.livello}.</span> {p.nota ?? ""}</li>
                    ))}
                  </ul>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      <footer className="border-t border-hairline pt-4 text-xs text-slate">
        {azienda}
        {org.partita_iva ? ` · P.IVA ${org.partita_iva}` : ""}
        {[org.indirizzo, org.cap, org.comune, org.provincia].filter(Boolean).join(" ")
          ? ` · ${[org.indirizzo, org.cap, org.comune, org.provincia].filter(Boolean).join(" ")}`
          : ""}
        {org.email ? ` · ${org.email}` : ""}
        {org.telefono ? ` · ${org.telefono}` : ""}
      </footer>
    </article>
  );
}
