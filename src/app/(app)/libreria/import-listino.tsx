"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

function fileToBase64(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(f);
  });
}

export function ImportListino() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function deduci() {
    if (files.length === 0) return;
    setLoading(true);
    setError(null);
    setDone(null);
    try {
      const payload = {
        files: await Promise.all(
          files.slice(0, 3).map(async (f) => ({
            base64: await fileToBase64(f),
            media_type: f.type || "application/pdf",
            filename: f.name,
          })),
        ),
      };
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke("extract-listino", {
        body: payload,
      });
      if (error || data?.error) throw new Error(data?.error ?? "errore");
      setDone(
        `Aggiunti ${data.cicli_creati} cicli e ${data.prezzi_creati} prezzi al tuo listino.`,
      );
      setFiles([]);
      router.refresh();
    } catch {
      setError("Deduzione non riuscita. Verifica i file (PDF) e la chiave AI.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mb-12 bg-scrim p-8 text-on-primary md:p-10">
      <p className="eyebrow mb-3 text-on-primary/60">Setup intelligente</p>
      <h2 className="display-md mb-3 max-w-2xl">
        Il tuo listino, dedotto in un attimo dai preventivi che hai già fatto.
      </h2>
      <p className="mb-8 max-w-2xl text-base leading-relaxed text-on-primary/80">
        Carica 2 o 3 tue vecchie offerte in PDF: l&apos;AI le legge, riconosce i
        cicli di lavorazione e i prezzi che applichi di solito, e costruisce il
        tuo listino su misura. Da quel momento ogni nuovo preventivo nasce con i{" "}
        <span className="text-on-primary">tuoi numeri</span> — niente più stime
        generiche.
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <label className="inline-flex cursor-pointer items-center rounded-full bg-on-primary px-5 py-2.5 text-sm font-semibold text-primary">
          {files.length ? `${files.length} file selezionati` : "Scegli i preventivi (PDF)"}
          <input
            type="file"
            accept=".pdf,application/pdf,image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              setFiles(Array.from(e.target.files ?? []).slice(0, 3));
              setError(null);
              setDone(null);
            }}
          />
        </label>

        <button
          onClick={deduci}
          disabled={loading || files.length === 0}
          className="inline-flex h-10 items-center justify-center rounded-full border border-on-primary px-5 text-sm font-semibold text-on-primary disabled:opacity-40"
        >
          {loading ? "Lettura in corso…" : "Deduci il mio listino →"}
        </button>
      </div>

      {files.length > 0 ? (
        <ul className="mt-4 text-sm text-on-primary/70">
          {files.map((f) => (
            <li key={f.name}>· {f.name}</li>
          ))}
        </ul>
      ) : null}

      {error ? <p className="mt-4 text-sm text-on-primary">{error}</p> : null}
      {done ? (
        <p className="mt-4 text-sm font-semibold text-on-primary">{done}</p>
      ) : null}
    </section>
  );
}
