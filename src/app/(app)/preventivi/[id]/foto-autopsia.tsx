"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

export type Punto = { x: number; y: number; numero: number; lavorazione: string };

export function FotoAutopsia({
  imageUrl,
  initialPunti = [],
  onAvvia,
  onSave,
}: {
  imageUrl: string;
  initialPunti?: Punto[];
  onAvvia: (punti: Punto[], legenda: Record<string, string>) => Promise<void>;
  onSave?: (punti: Punto[], legenda: Record<string, string>) => Promise<void>;
}) {
  const [punti, setPunti] = useState<Punto[]>(initialPunti);
  const [next, setNext] = useState(1);
  const [loading, setLoading] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  function addPunto(e: React.MouseEvent<HTMLDivElement>) {
    if (punti.length >= 9) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const numero = next > 9 ? 9 : next;
    setPunti((p) => [...p, { x, y, numero, lavorazione: "" }]);
    setNext((n) => Math.min(n + 1, 9));
  }
  function setLavorazione(idx: number, value: string) {
    setPunti((p) => p.map((pt, i) => (i === idx ? { ...pt, lavorazione: value } : pt)));
  }
  function removePunto(idx: number) {
    setPunti((p) => p.filter((_, i) => i !== idx));
  }
  function legendaFrom(pts: Punto[]): Record<string, string> {
    const leg: Record<string, string> = {};
    for (const pt of pts) if (pt.lavorazione) leg[String(pt.numero)] = pt.lavorazione;
    return leg;
  }

  return (
    <div className="space-y-4">
      <div onClick={addPunto} className="relative cursor-crosshair overflow-hidden rounded-md border border-hairline">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={imgRef} src={imageUrl} alt="Facciata" className="w-full select-none" />
        {punti.map((pt, i) => (
          <span key={i} className="absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-canvas bg-ink text-xs font-semibold text-canvas" style={{ left: `${pt.x * 100}%`, top: `${pt.y * 100}%` }}>{pt.numero}</span>
        ))}
      </div>
      <ol className="space-y-2">
        {punti.map((pt, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-xs text-canvas">{pt.numero}</span>
            <Input value={pt.lavorazione} placeholder="Tipo di lavorazione / ripristino" onChange={(e) => setLavorazione(i, e.target.value)} />
            <button type="button" onClick={() => removePunto(i)} className="text-xs text-stone underline">Rimuovi</button>
          </li>
        ))}
        {punti.length === 0 ? <li className="text-sm text-stone">Clicca sulla foto per posizionare i punti.</li> : null}
      </ol>
      <div className="flex gap-2">
        {onSave ? <Button variant="secondary" onClick={() => onSave(punti, legendaFrom(punti))}>Salva annotazioni</Button> : null}
        <Button disabled={loading || punti.length === 0} onClick={async () => { setLoading(true); try { await onAvvia(punti, legendaFrom(punti)); } finally { setLoading(false); } }}>{loading ? "Generazione…" : "Avvia"}</Button>
      </div>
    </div>
  );
}
