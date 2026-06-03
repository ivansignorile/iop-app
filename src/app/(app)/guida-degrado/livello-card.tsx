"use client";

import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/field";
import { Card } from "@/components/ui/misc";
import { createClient } from "@/lib/supabase/client";

import { resetLivello, saveLivelloMap } from "./actions";

type SampleRow = {
  id: string;
  livello: number;
  intervento: string;
  descrizione: string | null;
  image_path: string | null;
  ciclo_id: string | null;
};

type CicloRef = { id: string; titolo: string };

interface Props {
  livello: number;
  override: SampleRow | null;
  globale: SampleRow | null;
  signedUrl: string | null;
  cicli: CicloRef[];
}

export function LivelloCard({ livello, override, globale, signedUrl, cicli }: Props) {
  const active = override ?? globale;
  const hasOverride = override !== null;

  const [previewUrl, setPreviewUrl] = useState<string | null>(signedUrl);
  const [uploadedPath, setUploadedPath] = useState<string | null>(
    active?.image_path ?? null,
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const badge = hasOverride ? "Personalizzato" : active ? "Default" : "Vuoto";
  const badgeClass = hasOverride
    ? "border border-ink bg-canvas text-ink"
    : active
      ? "bg-surface-strong text-ink"
      : "border border-hairline text-stone";

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `degrado/livello-${livello}-${Date.now()}.${ext}`;
      const supabase = createClient();
      const { error } = await supabase.storage
        .from("preventivi")
        .upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: signed } = await supabase.storage
        .from("preventivi")
        .createSignedUrl(path, 3600);
      setUploadedPath(path);
      setPreviewUrl(signed?.signedUrl ?? null);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Errore upload");
    } finally {
      setUploading(false);
    }
  }

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (uploadedPath) fd.set("image_path", uploadedPath);
    startTransition(async () => {
      await saveLivelloMap(livello, fd);
    });
  }

  function handleReset() {
    startTransition(async () => {
      await resetLivello(livello);
    });
  }

  return (
    <Card>
      {/* Header row */}
      <div className="mb-4 flex items-baseline justify-between">
        <span className="display-md text-ink">{livello}</span>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClass}`}
          >
            {badge}
          </span>
          <span className="eyebrow text-stone">su 9</span>
        </div>
      </div>

      {/* Image area */}
      <div
        className="group relative mt-1 aspect-[4/3] w-full cursor-pointer overflow-hidden rounded-md border border-hairline"
        onClick={() => fileRef.current?.click()}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={`Livello ${livello}`}
            className="h-full w-full object-cover transition-opacity group-hover:opacity-80"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-stone">
            {uploading ? "Caricamento…" : "Clicca per caricare immagine"}
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-canvas/60 text-xs text-ink">
            Caricamento…
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
          <span className="rounded-full border border-ink bg-canvas px-3 py-1 text-xs font-medium text-ink shadow-sm">
            Cambia
          </span>
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      {uploadError && (
        <p className="mt-1 text-xs text-red-600">{uploadError}</p>
      )}

      {/* Form */}
      <form onSubmit={handleSave} className="mt-4 space-y-4">
        <Field label="Ciclo di lavorazione" htmlFor={`ciclo-${livello}`}>
          <Select
            id={`ciclo-${livello}`}
            name="ciclo_id"
            defaultValue={active?.ciclo_id ?? ""}
          >
            <option value="">— nessuno —</option>
            {cicli.map((c) => (
              <option key={c.id} value={c.id}>
                {c.titolo}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Descrizione" htmlFor={`desc-${livello}`}>
          <Textarea
            id={`desc-${livello}`}
            name="descrizione"
            rows={3}
            defaultValue={active?.descrizione ?? ""}
            placeholder="Note sul livello di degrado…"
          />
        </Field>

        <div className="flex items-center gap-2 pt-1">
          <Button
            type="submit"
            variant="primary"
            disabled={isPending || uploading}
            className="flex-1"
          >
            {isPending ? "Salvataggio…" : "Salva"}
          </Button>
          {hasOverride && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleReset}
              disabled={isPending}
            >
              Ripristina
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
