import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/field";
import { Card, PageHeader, StatoBadge } from "@/components/ui/misc";
import { requirePlatformAdmin } from "@/lib/admin";
import { formatDate } from "@/lib/format";
import { FORMATO_LABEL, raggruppaFile, RUOLO_LABEL } from "@/lib/richieste/etichette";
import { RUOLI_FILE } from "@/lib/richieste/valida";
import { createAdminClient } from "@/lib/supabase/admin";

import { setStatoRichiesta } from "../actions";

type FileInfo = { nome: string; mime: string; size: number; path: string; ruolo?: string };

const statoLabel = {
  nuova: "Nuova",
  in_lavorazione: "In lavorazione",
  evasa: "Evasa",
  scartata: "Scartata",
} as const;

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function RichiestaDettaglioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePlatformAdmin();
  const { id } = await params;

  const admin = createAdminClient();
  const { data: r } = await admin
    .from("richieste_servizio")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!r) notFound();

  const files = (Array.isArray(r.files) ? r.files : []) as FileInfo[];
  const urlByPath = new Map<string, string>();
  if (files.length) {
    const { data: signed } = await admin.storage
      .from("richieste")
      .createSignedUrls(files.map((f) => f.path), 3600);
    for (const s of signed ?? []) {
      if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl);
    }
  }

  const gruppi = raggruppaFile(files);
  const action = setStatoRichiesta.bind(null, r.id);

  return (
    <div>
      <p className="mb-4 text-sm">
        <Link href="/admin/richieste" className="text-link">
          ← Tutte le richieste
        </Link>
      </p>
      <PageHeader
        eyebrow="Richiesta"
        title={r.nome}
        description={`Ricevuta il ${formatDate(r.created_at)}${r.comune ? ` · ${r.comune}` : ""}`}
        action={<StatoBadge stato={r.stato} />}
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-8">
          <section>
            <h2 className="title-sm mb-3 text-ink">Contatto</h2>
            <dl className="grid grid-cols-[7rem_1fr] gap-y-2 text-sm">
              <dt className="text-muted">Email</dt>
              <dd>
                <a href={`mailto:${r.email}`} className="text-link">{r.email}</a>
              </dd>
              <dt className="text-muted">Telefono</dt>
              <dd>
                {r.telefono ? (
                  <a href={`tel:${r.telefono}`} className="text-link">{r.telefono}</a>
                ) : (
                  "—"
                )}
              </dd>
              <dt className="text-muted">Tipo</dt>
              <dd className="text-ink">{r.tipo === "foto_capitolato" ? "Foto + capitolato" : "Foto + descrizione"}</dd>
              <dt className="text-muted">Formato</dt>
              <dd className="text-ink">{r.formato_output ? FORMATO_LABEL[r.formato_output] : "—"}</dd>
              <dt className="text-muted">Progetto</dt>
              <dd className="text-ink">{r.titolo_progetto ?? "—"}</dd>
              <dt className="text-muted">Privacy</dt>
              <dd className="text-ink">
                {r.consenso_privacy_at ? `accettata il ${formatDate(r.consenso_privacy_at)}` : "—"}
              </dd>
              <dt className="text-muted">Notifiche</dt>
              <dd className="text-ink">
                email {r.notifica_email_ok === false ? "✗" : r.notifica_email_ok ? "ok" : "—"}
                {" · "}
                whatsapp {r.notifica_whatsapp_ok === false ? "✗" : r.notifica_whatsapp_ok ? "ok" : "—"}
              </dd>
            </dl>
          </section>

          <section>
            <h2 className="title-sm mb-3 text-ink">Note</h2>
            <p className="max-w-[65ch] whitespace-pre-wrap text-base leading-relaxed text-body">
              {r.descrizione?.trim() || "Nessuna nota."}
            </p>
          </section>

          <section>
            <h2 className="title-sm mb-3 text-ink">File ({files.length})</h2>
            {files.length === 0 ? (
              <p className="text-sm text-muted">Nessun file allegato.</p>
            ) : (
              <div className="space-y-6">
                {RUOLI_FILE.filter((ruolo) => gruppi[ruolo].length > 0).map((ruolo) => {
                  const lista = gruppi[ruolo];
                  return (
                    <div key={ruolo}>
                      <h3 className="mb-2 text-sm font-medium text-muted">
                        {RUOLO_LABEL[ruolo]} ({lista.length})
                      </h3>
                      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {lista.map((f) => {
                          const url = urlByPath.get(f.path);
                          const isImage = f.mime.startsWith("image/");
                          return (
                            <li key={f.path} className="border border-hairline">
                              {url && isImage ? (
                                <a href={url} target="_blank" rel="noreferrer">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={url}
                                    alt={f.nome}
                                    className="aspect-[4/3] w-full bg-surface-soft object-cover"
                                  />
                                </a>
                              ) : null}
                              <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                                <span className="truncate text-ink">{f.nome}</span>
                                {url ? (
                                  <a href={url} target="_blank" rel="noreferrer" className="shrink-0 text-link">
                                    Apri · {formatSize(f.size)}
                                  </a>
                                ) : (
                                  <span className="shrink-0 text-muted">non disponibile</span>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <aside>
          <Card>
            <h2 className="title-sm mb-4 text-ink">Gestione</h2>
            <form action={action} className="space-y-5">
              <Field label="Stato" htmlFor="stato">
                <Select id="stato" name="stato" defaultValue={r.stato}>
                  {Object.entries(statoLabel).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Note interne" htmlFor="note_interne">
                <Textarea
                  id="note_interne"
                  name="note_interne"
                  defaultValue={r.note_interne ?? ""}
                  rows={5}
                />
              </Field>
              <Button type="submit">Salva</Button>
            </form>
          </Card>
        </aside>
      </div>
    </div>
  );
}
