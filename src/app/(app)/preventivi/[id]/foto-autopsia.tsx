"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

export type Punto = { x: number; y: number; livello: number; nota?: string };
export type Sospetto = { x: number; y: number; livello_suggerito: number; motivo: string };

export function FotoAutopsia({
  imageUrl,
  initialPunti = [],
  mappa,
  onAvvia,
  onSave,
  onRileva,
}: {
  imageUrl: string;
  initialPunti?: Punto[];
  mappa?: Record<number, string>;
  onAvvia: (punti: Punto[]) => Promise<void>;
  onSave?: (punti: Punto[]) => Promise<void>;
  onRileva?: (punti: Punto[]) => Promise<Sospetto[]>;
}) {
  const [punti, setPunti] = useState<Punto[]>(initialPunti);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [sospetti, setSospetti] = useState<Sospetto[]>([]);
  const [modale, setModale] = useState(false);

  function addPunto(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setPunti((p) => {
      const next = [...p, { x, y, livello: 5 }];
      setOpenIdx(next.length - 1);
      return next;
    });
  }

  function setLivello(idx: number, value: number) {
    setPunti((p) => p.map((pt, i) => (i === idx ? { ...pt, livello: value } : pt)));
  }

  function setNota(idx: number, value: string) {
    setPunti((p) => p.map((pt, i) => (i === idx ? { ...pt, nota: value } : pt)));
  }

  function removePunto(idx: number) {
    setOpenIdx(null);
    setPunti((p) => p.filter((_, i) => i !== idx));
  }

  function acceptSospetto(i: number) {
    const s = sospetti[i];
    setPunti((p) => {
      const next = [...p, { x: s.x, y: s.y, livello: s.livello_suggerito }];
      setOpenIdx(next.length - 1);
      return next;
    });
    setSospetti((arr) => arr.filter((_, j) => j !== i));
  }

  async function onAvviaClick() {
    setLoading(true);
    try {
      if (onRileva) {
        const found = await onRileva(punti);
        if (found.length > 0) {
          setSospetti(found);
          setModale(true);
          return;
        }
      }
      await onAvvia(punti);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div
        onClick={addPunto}
        className="relative cursor-crosshair overflow-visible rounded-md border border-hairline"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="Facciata" className="w-full select-none rounded-md" />

        {/* marker reali */}
        {punti.map((pt, i) => (
          <span
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              setOpenIdx(i);
            }}
            className="absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-2 border-canvas bg-ink text-xs font-semibold text-canvas"
            style={{ left: `${pt.x * 100}%`, top: `${pt.y * 100}%` }}
          >
            {pt.livello}
          </span>
        ))}

        {/* marker fantasma (sospetti) */}
        {sospetti.map((s, i) => (
          <span
            key={`s${i}`}
            onClick={(e) => {
              e.stopPropagation();
              acceptSospetto(i);
            }}
            title={s.motivo}
            className="absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-ink bg-canvas text-xs font-semibold text-ink"
            style={{ left: `${s.x * 100}%`, top: `${s.y * 100}%` }}
          >
            ?
          </span>
        ))}

        {/* popover punto aperto */}
        {openIdx !== null && punti[openIdx] ? (
          <div
            onClick={(e) => e.stopPropagation()}
            className={`absolute z-10 w-56 translate-y-2 rounded-md border border-hairline bg-canvas p-3 shadow-lg ${punti[openIdx].x > 0.6 ? "-translate-x-full" : punti[openIdx].x < 0.15 ? "translate-x-0" : "-translate-x-1/2"}`}
            style={{
              left: `${punti[openIdx].x * 100}%`,
              top: `${punti[openIdx].y * 100}%`,
            }}
          >
            <p className="mb-2 text-xs text-stone">Punto · livello degrado</p>
            <select
              value={punti[openIdx].livello}
              onChange={(e) => setLivello(openIdx, Number(e.target.value))}
              className="w-full rounded-md border border-hairline px-2 py-1 text-sm"
            >
              {Array.from({ length: 9 }, (_, k) => k + 1).map((n) => (
                <option key={n} value={n}>
                  Livello {n}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-graphite">
              {mappa?.[punti[openIdx].livello]
                ? `→ ${mappa[punti[openIdx].livello]}`
                : "→ (nessun ciclo mappato)"}
              {punti[openIdx].livello >= 7 ? " · pitturazione totale" : ""}
            </p>
            <Input
              className="mt-2"
              value={punti[openIdx].nota ?? ""}
              placeholder="Nota (facoltativa)"
              onChange={(e) => setNota(openIdx, e.target.value)}
            />
            <div className="mt-2 flex justify-between">
              <button
                type="button"
                onClick={() => removePunto(openIdx)}
                className="text-xs text-stone underline"
              >
                Rimuovi
              </button>
              <button
                type="button"
                onClick={() => setOpenIdx(null)}
                className="text-xs text-link underline"
              >
                Chiudi
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {punti.length === 0 ? (
        <p className="text-sm text-stone">
          Clicca sulla foto per posizionare i punti e assegnare il livello.
        </p>
      ) : null}

      <div className="flex gap-2">
        {onSave ? (
          <Button
            variant="secondary"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onSave(punti);
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "Salvataggio…" : "Salva annotazioni"}
          </Button>
        ) : null}
        <Button disabled={loading || punti.length === 0} onClick={onAvviaClick}>
          {loading ? "Generazione…" : "Avvia"}
        </Button>
      </div>

      {/* modale punti mancanti */}
      {modale ? (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-scrim/40 p-4">
          <div className="w-full max-w-md rounded-md border border-hairline bg-canvas p-5">
            <p className="title-sm text-ink">Punti forse saltati</p>
            <p className="mt-1 text-sm text-graphite">
              Dalla foto sembrano esserci {sospetti.length} aree di degrado non segnalate. Sono
              evidenziate con un punto tratteggiato &ldquo;?&rdquo;: cliccale per aggiungerle e
              assegnare il livello.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setModale(false)}>
                Aggiungo io manualmente
              </Button>
              <Button
                onClick={async () => {
                  setModale(false);
                  setSospetti([]);
                  setLoading(true);
                  try {
                    await onAvvia(punti);
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                Procedi comunque
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
