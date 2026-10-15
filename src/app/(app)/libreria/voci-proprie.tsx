"use client";

import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { FormError, Input, Select, Textarea } from "@/components/ui/field";
import { UNITA_LABEL, formatDate, formatEuro } from "@/lib/format";
import { UNITA } from "@/lib/libreria/voce";
import type { Tables } from "@/lib/supabase/types";
import {
  deleteDocumentoLibreria,
  deleteVocePropria,
  updateVocePropria,
} from "./actions";

export type VocePropria = Pick<
  Tables<"voci_proprie">,
  "id" | "titolo" | "descrizione" | "unita" | "prezzo" | "categoria" | "documento_id"
>;
export type DocumentoLibreria = Pick<
  Tables<"documenti_libreria">,
  "id" | "nome_file" | "stato" | "voci_estratte" | "errore" | "created_at"
>;

const PAGINA = 100;

function normalizza(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/* ---------------- Voci ---------------- */

export function VociProprie({
  voci,
  documenti,
}: {
  voci: VocePropria[];
  documenti: DocumentoLibreria[];
}) {
  const [q, setQ] = useState("");
  const [limite, setLimite] = useState(PAGINA);
  const nomiDoc = useMemo(
    () => new Map(documenti.map((d) => [d.id, d.nome_file])),
    [documenti],
  );

  const filtrate = useMemo(() => {
    const parole = normalizza(q).split(/\s+/).filter(Boolean);
    if (!parole.length) return voci;
    return voci.filter((v) => {
      const testo = normalizza(`${v.titolo} ${v.descrizione} ${v.categoria ?? ""}`);
      return parole.every((p) => testo.includes(p));
    });
  }, [voci, q]);

  return (
    <section className="mb-12">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="title-sm text-ink">Le tue voci</h2>
          <p className="mt-1 text-sm text-slate tabular-nums">
            {voci.length} {voci.length === 1 ? "voce" : "voci"} in libreria
          </p>
        </div>
        {voci.length > 0 ? (
          <div className="w-full sm:w-72">
            <label htmlFor="cerca-voci" className="sr-only">
              Cerca nelle tue voci
            </label>
            <Input
              id="cerca-voci"
              type="search"
              placeholder="Cerca: intonaco, frontalini…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setLimite(PAGINA);
              }}
            />
          </div>
        ) : null}
      </div>

      {voci.length === 0 ? (
        <div className="border border-hairline px-6 py-14">
          <p className="title-sm text-ink">Nessuna voce ancora.</p>
          <p className="mt-1 max-w-md text-sm text-graphite">
            Carica qui sopra uno o più preventivi già fatti: le voci con descrizione e prezzo
            unitario compariranno in questa tabella, pronte da modificare.
          </p>
        </div>
      ) : filtrate.length === 0 ? (
        <p className="border-t border-hairline py-6 text-sm text-stone">
          Nessuna voce corrisponde a &ldquo;{q}&rdquo;.
        </p>
      ) : (
        <>
          <div className="hidden grid-cols-[minmax(0,3fr)_minmax(0,5fr)_7rem_8rem] gap-4 border-b border-ink pb-2 text-xs uppercase tracking-wide text-stone md:grid">
            <span>Voce</span>
            <span>Descrizione</span>
            <span className="text-right">Prezzo</span>
            <span className="text-right">Azioni</span>
          </div>
          <ul className="divide-y divide-hairline">
            {filtrate.slice(0, limite).map((v) => (
              <VoceRow
                key={v.id}
                voce={v}
                origine={v.documento_id ? nomiDoc.get(v.documento_id) ?? null : null}
              />
            ))}
          </ul>
          {filtrate.length > limite ? (
            <div className="mt-4">
              <Button variant="secondary" type="button" onClick={() => setLimite((l) => l + PAGINA)}>
                Mostra altre {Math.min(PAGINA, filtrate.length - limite)}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

function VoceRow({ voce, origine }: { voce: VocePropria; origine: string | null }) {
  const [aperta, setAperta] = useState(false);
  const [modifica, setModifica] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (modifica) {
    return (
      <li className="py-4">
        <form
          action={(fd) =>
            startTransition(async () => {
              const r = await updateVocePropria(voce.id, fd);
              if (r.ok) {
                setModifica(false);
                setErrore(null);
              } else setErrore(r.errore);
            })
          }
          className="space-y-3 bg-surface-soft p-4"
        >
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_10rem_6rem_8rem]">
            <div>
              <label htmlFor={`t-${voce.id}`} className="mb-1 block text-sm font-medium text-ink">Titolo</label>
              <Input id={`t-${voce.id}`} name="titolo" defaultValue={voce.titolo} required maxLength={300} />
            </div>
            <div>
              <label htmlFor={`c-${voce.id}`} className="mb-1 block text-sm font-medium text-ink">Categoria</label>
              <Input id={`c-${voce.id}`} name="categoria" defaultValue={voce.categoria ?? ""} maxLength={100} />
            </div>
            <div>
              <label htmlFor={`u-${voce.id}`} className="mb-1 block text-sm font-medium text-ink">Unità</label>
              <Select id={`u-${voce.id}`} name="unita" defaultValue={voce.unita}>
                {UNITA.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label htmlFor={`p-${voce.id}`} className="mb-1 block text-sm font-medium text-ink">Prezzo €</label>
              <Input
                id={`p-${voce.id}`}
                name="prezzo"
                type="number"
                step="0.01"
                min="0.01"
                defaultValue={voce.prezzo}
                required
              />
            </div>
          </div>
          <div>
            <label htmlFor={`d-${voce.id}`} className="mb-1 block text-sm font-medium text-ink">Descrizione</label>
            <Textarea id={`d-${voce.id}`} name="descrizione" rows={5} defaultValue={voce.descrizione} required />
          </div>
          <FormError message={errore} />
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={pending} className="active:scale-[0.98]">
              {pending ? "Salvataggio…" : "Salva"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setModifica(false);
                setErrore(null);
              }}
            >
              Annulla
            </Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li
      className={`grid gap-2 py-4 transition-opacity md:grid-cols-[minmax(0,3fr)_minmax(0,5fr)_7rem_8rem] md:gap-4 ${
        pending ? "opacity-40" : ""
      }`}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{voce.titolo}</p>
        <p className="mt-0.5 truncate text-xs text-stone">
          {[voce.categoria, origine ? `da ${origine}` : null].filter(Boolean).join(" · ") || "inserita a mano"}
        </p>
      </div>
      <div className="min-w-0 text-sm leading-relaxed text-graphite">
        <p className={aperta ? "whitespace-pre-line" : "line-clamp-2"}>{voce.descrizione}</p>
        {voce.descrizione.length > 140 ? (
          <button
            type="button"
            onClick={() => setAperta((a) => !a)}
            className="mt-1 text-xs text-slate underline underline-offset-2"
            aria-expanded={aperta}
          >
            {aperta ? "Riduci" : "Leggi tutta"}
          </button>
        ) : null}
      </div>
      <p className="text-sm tabular-nums text-ink md:text-right">
        {formatEuro(voce.prezzo)} <span className="text-slate">{UNITA_LABEL[voce.unita]}</span>
      </p>
      <div className="flex items-start gap-4 text-sm md:justify-end">
        <button
          type="button"
          onClick={() => setModifica(true)}
          className="text-ink underline underline-offset-2"
        >
          Modifica
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!confirm(`Eliminare la voce "${voce.titolo}"?`)) return;
            startTransition(async () => {
              const r = await deleteVocePropria(voce.id);
              if (!r.ok) alert(r.errore);
            });
          }}
          className="text-ink underline underline-offset-2"
        >
          Elimina
        </button>
      </div>
    </li>
  );
}

/* ---------------- Documenti ---------------- */

const STATO_DOC: Record<DocumentoLibreria["stato"], { label: string; tone: string }> = {
  caricato: { label: "Caricato", tone: "bg-surface-strong text-ink" },
  in_elaborazione: { label: "In elaborazione", tone: "border border-ink text-ink" },
  elaborato: { label: "Elaborato", tone: "bg-primary text-on-primary" },
  errore: { label: "Errore", tone: "border border-hairline-soft text-stone" },
};

export function DocumentiLibreria({ documenti }: { documenti: DocumentoLibreria[] }) {
  if (documenti.length === 0) return null;
  return (
    <details className="mb-12 border-t border-hairline pt-4">
      <summary className="cursor-pointer text-sm text-slate">
        Preventivi caricati ({documenti.length})
      </summary>
      <ul className="mt-3 divide-y divide-hairline">
        {documenti.map((d) => (
          <DocumentoRow key={d.id} doc={d} />
        ))}
      </ul>
    </details>
  );
}

function DocumentoRow({ doc }: { doc: DocumentoLibreria }) {
  const [pending, startTransition] = useTransition();
  const stato = STATO_DOC[doc.stato];
  return (
    <li
      className={`grid gap-2 py-3 text-sm transition-opacity md:grid-cols-[minmax(0,1fr)_9rem_7rem_5rem] md:items-center md:gap-4 ${
        pending ? "opacity-40" : ""
      }`}
    >
      <div className="min-w-0">
        <p className="truncate text-ink">{doc.nome_file}</p>
        <p className="text-xs text-stone">
          {formatDate(doc.created_at)}
          {doc.stato === "errore" && doc.errore ? ` · ${doc.errore}` : ""}
        </p>
      </div>
      <span>
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${stato.tone}`}>
          {stato.label}
        </span>
      </span>
      <span className="tabular-nums text-graphite md:text-right">
        {doc.voci_estratte} {doc.voci_estratte === 1 ? "voce" : "voci"}
      </span>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm(`Eliminare "${doc.nome_file}"? Il file viene cancellato, le voci estratte restano in libreria.`)) return;
          startTransition(async () => {
            const r = await deleteDocumentoLibreria(doc.id);
            if (!r.ok) alert(r.errore);
          });
        }}
        className="text-left text-ink underline underline-offset-2 md:text-right"
      >
        Elimina
      </button>
    </li>
  );
}
