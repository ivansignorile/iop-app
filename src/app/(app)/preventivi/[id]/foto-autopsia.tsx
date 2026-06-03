"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

export type Punto = { x: number; y: number; livello: number; nota?: string };

export function FotoAutopsia({
  imageUrl,
  initialPunti = [],
  mappa,
  onAvvia,
  onSave,
}: {
  imageUrl: string;
  initialPunti?: Punto[];
  mappa?: Record<number, string>;
  onAvvia: (punti: Punto[]) => Promise<void>;
  onSave?: (punti: Punto[]) => Promise<void>;
}) {
  const [punti, setPunti] = useState<Punto[]>(initialPunti);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  function addPunto(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setPunti((p) => [...p, { x, y, livello: 5 }]);
  }
  function setLivello(idx: number, value: number) {
    setPunti((p) => p.map((pt, i) => (i === idx ? { ...pt, livello: value } : pt)));
  }
  function setNota(idx: number, value: string) {
    setPunti((p) => p.map((pt, i) => (i === idx ? { ...pt, nota: value } : pt)));
  }
  function removePunto(idx: number) {
    setPunti((p) => p.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-4">
      <div onClick={addPunto} className="relative cursor-crosshair overflow-hidden rounded-md border border-hairline">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={imgRef} src={imageUrl} alt="Facciata" className="w-full select-none" />
        {punti.map((pt, i) => (
          <span
            key={i}
            className="absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-canvas bg-ink text-xs font-semibold text-canvas"
            style={{ left: `${pt.x * 100}%`, top: `${pt.y * 100}%` }}
          >
            {pt.livello}
          </span>
        ))}
      </div>
      <ol className="space-y-2">
        {punti.map((pt, i) => (
          <li key={i} className="flex flex-wrap items-center gap-2">
            <select
              value={pt.livello}
              onChange={(e) => setLivello(i, Number(e.target.value))}
              className="rounded-md border border-hairline px-2 py-1 text-sm"
            >
              {Array.from({ length: 9 }, (_, k) => k + 1).map((n) => (
                <option key={n} value={n}>
                  Livello {n}
                </option>
              ))}
            </select>
            <span className="text-sm text-graphite">
              {mappa?.[pt.livello] ? `→ ${mappa[pt.livello]}` : "→ (nessun ciclo mappato)"}
              {pt.livello >= 7 ? " · pitturazione totale" : ""}
            </span>
            <Input
              value={pt.nota ?? ""}
              placeholder="Nota (facoltativa)"
              onChange={(e) => setNota(i, e.target.value)}
            />
            <button type="button" onClick={() => removePunto(i)} className="text-xs text-stone underline">
              Rimuovi
            </button>
          </li>
        ))}
        {punti.length === 0 ? (
          <li className="text-sm text-stone">
            Clicca sulla foto per posizionare i punti e assegnare il livello.
          </li>
        ) : null}
      </ol>
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
        <Button
          disabled={loading || punti.length === 0}
          onClick={async () => {
            setLoading(true);
            try {
              await onAvvia(punti);
            } finally {
              setLoading(false);
            }
          }}
        >
          {loading ? "Generazione…" : "Avvia"}
        </Button>
      </div>
    </div>
  );
}
