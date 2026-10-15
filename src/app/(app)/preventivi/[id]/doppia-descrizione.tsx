"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { formatEuro } from "@/lib/format";
import type { SceltaFonte } from "@/lib/scelta-fonte";
import type { Tables } from "@/lib/supabase/types";
import { scegliFonte } from "./actions";

type InterventoDoppio = Pick<
  Tables<"preventivo_interventi">,
  | "id"
  | "codice_prezzario"
  | "descrizione_prezzario"
  | "prezzo_prezzario"
  | "descrizione_propria"
  | "prezzo_proprio"
  | "fonte_scelta"
  | "abbinamento_avviso"
>;

function disponibile(descrizione: string | null, prezzo: number | null) {
  return descrizione != null && prezzo != null;
}

/** Due descrizioni affiancate (prezzario / libreria personale) con scelta di quella che va nel preventivo. */
export function DoppiaDescrizione({
  intervento: i,
  preventivoId,
}: {
  intervento: InterventoDoppio;
  preventivoId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [errore, setErrore] = useState<string | null>(null);

  if (!i.descrizione_prezzario && !i.descrizione_propria) return null;

  const haPrezzario = disponibile(i.descrizione_prezzario, i.prezzo_prezzario);
  const haPropria = disponibile(i.descrizione_propria, i.prezzo_proprio);
  const manuale = i.fonte_scelta === "manuale";

  function scegli(scelta: SceltaFonte) {
    setErrore(null);
    startTransition(async () => {
      try {
        await scegliFonte(i.id, preventivoId, scelta);
      } catch {
        setErrore("Cambio descrizione non riuscito. Riprova.");
      }
    });
  }

  return (
    <section aria-label="Descrizioni disponibili" className="mt-3 space-y-3" aria-busy={pending}>
      {i.abbinamento_avviso ? (
        <p role="note" className="rounded-sm border-l-2 border-ink bg-surface-soft px-3 py-2 text-sm text-ink">
          <span className="font-semibold">Attenzione: </span>
          {i.abbinamento_avviso}
        </p>
      ) : null}

      {manuale ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="inline-flex items-center rounded-full bg-surface-strong px-2.5 py-0.5 text-xs font-medium text-ink">
            Modificata a mano
          </span>
          <span className="text-muted">Nel preventivo va la descrizione del campo qui sotto.</span>
          {haPrezzario ? (
            <Button
              type="button"
              variant="secondary"
              className="h-8 px-3 text-xs"
              disabled={pending}
              onClick={() => scegli("prezzario")}
            >
              Ripristina prezzario
            </Button>
          ) : null}
          {haPropria ? (
            <Button
              type="button"
              variant="secondary"
              className="h-8 px-3 text-xs"
              disabled={pending}
              onClick={() => scegli("propria")}
            >
              Ripristina mia
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <CardFonte
          titolo={`Prezzario regionale${i.codice_prezzario ? ` · ${i.codice_prezzario}` : ""}`}
          descrizione={i.descrizione_prezzario}
          prezzo={i.prezzo_prezzario}
          vuoto="Nessuna voce del prezzario abbinata a questa lavorazione."
          scelta={i.fonte_scelta === "prezzario"}
          disponibile={haPrezzario}
          pending={pending}
          onUsa={() => scegli("prezzario")}
        />
        <CardFonte
          titolo="La tua descrizione"
          descrizione={i.descrizione_propria}
          prezzo={i.prezzo_proprio}
          vuoto="Nessuna voce nella tua libreria per questa lavorazione."
          scelta={i.fonte_scelta === "propria"}
          disponibile={haPropria}
          pending={pending}
          onUsa={() => scegli("propria")}
        />
      </div>

      {errore ? (
        <p role="alert" className="text-sm text-ink">
          {errore}
        </p>
      ) : null}
    </section>
  );
}

function CardFonte({
  titolo,
  descrizione,
  prezzo,
  vuoto,
  scelta,
  disponibile,
  pending,
  onUsa,
}: {
  titolo: string;
  descrizione: string | null;
  prezzo: number | null;
  vuoto: string;
  scelta: boolean;
  disponibile: boolean;
  pending: boolean;
  onUsa: () => void;
}) {
  return (
    <article
      aria-label={titolo}
      aria-current={scelta ? "true" : undefined}
      className={`flex min-w-0 flex-col rounded-md border p-4 transition-colors ${
        scelta ? "border-ink bg-canvas" : "border-hairline bg-surface-soft"
      }`}
    >
      <header className="mb-2 flex items-start justify-between gap-3">
        <p className="eyebrow min-w-0 break-words text-stone">{titolo}</p>
        {scelta ? (
          <span className="shrink-0 rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-on-primary">
            Nel preventivo
          </span>
        ) : null}
      </header>

      {descrizione ? (
        <p
          tabIndex={0}
          className="max-h-40 overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-graphite"
        >
          {descrizione}
        </p>
      ) : (
        <p className="text-sm text-muted">{vuoto}</p>
      )}

      <div className="mt-auto flex items-center justify-between gap-3 pt-3">
        <span className="text-sm font-medium tabular-nums text-ink">
          {prezzo != null ? formatEuro(prezzo) : "—"}
        </span>
        {!scelta && disponibile ? (
          <Button
            type="button"
            variant="secondary"
            className="h-8 px-3 text-xs active:scale-[0.98]"
            disabled={pending}
            onClick={onUsa}
          >
            {pending ? "Aggiorno…" : "Usa questa"}
          </Button>
        ) : null}
      </div>
    </article>
  );
}
