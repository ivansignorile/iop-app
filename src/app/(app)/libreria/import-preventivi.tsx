"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { controllaPreventivo, nomeFileStorage } from "@/lib/libreria/voce";
import { createClient } from "@/lib/supabase/client";
import { avviaESegui, type EsitoElaborazione } from "./elaborazione";

type Esito =
  | { stato: "attesa" }
  | { stato: "lavoro"; fase: string }
  | EsitoElaborazione;

/** scartato: rifiutato prima dell'upload, fuori dal conteggio dell'avanzamento. */
type Riga = { file: File; esito: Esito; scartato: boolean };

const MAX_FILE_PER_VOLTA = 10;

function tipoFile(f: File): string {
  if (f.type) return f.type;
  const ext = f.name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "";
}

export function ImportPreventivi({ orgId, userId }: { orgId: string; userId: string }) {
  const router = useRouter();
  const [righe, setRighe] = useState<Riga[]>([]);
  const [inCorso, setInCorso] = useState(false);
  const [trascina, setTrascina] = useState(false);

  const valide = righe.filter((r) => !r.scartato);
  const fatti = valide.filter((r) => ["ok", "errore", "lento"].includes(r.esito.stato)).length;
  const vociTotali = valide.reduce((n, r) => n + (r.esito.stato === "ok" ? r.esito.voci : 0), 0);
  const daElaborare = righe.filter((r) => r.esito.stato === "attesa").length;

  function scegli(lista: FileList | null) {
    if (!lista || inCorso) return;
    const nuovi = Array.from(lista)
      .slice(0, MAX_FILE_PER_VOLTA)
      .map<Riga>((file) => {
        const err = controllaPreventivo(tipoFile(file), file.size);
        return err
          ? { file, esito: { stato: "errore", messaggio: err }, scartato: true }
          : { file, esito: { stato: "attesa" }, scartato: false };
      });
    setRighe(nuovi);
  }

  function aggiorna(i: number, esito: Esito) {
    setRighe((prev) => prev.map((r, j) => (j === i ? { ...r, esito } : r)));
  }

  async function avvia() {
    if (inCorso) return;
    setInCorso(true);
    const supabase = createClient();
    // In sequenza: un documento alla volta, per non saturare l'estrazione.
    for (let i = 0; i < righe.length; i++) {
      const { file, esito } = righe[i];
      if (esito.stato !== "attesa") continue;
      try {
        aggiorna(i, { stato: "lavoro", fase: "Caricamento" });
        const path = `${orgId}/libreria/${crypto.randomUUID()}-${nomeFileStorage(file.name)}`;
        const { error: upErr } = await supabase.storage
          .from("preventivi")
          // Blob con tipo esplicito: storage-js usa il tipo del Blob, non contentType.
          .upload(path, new Blob([file], { type: tipoFile(file) }), { upsert: false });
        if (upErr) throw new Error("Caricamento del file non riuscito");

        const { data: doc, error: insErr } = await supabase
          .from("documenti_libreria")
          .insert({
            org_id: orgId,
            storage_path: path,
            nome_file: file.name.slice(0, 200),
            created_by: userId,
          })
          .select("id")
          .single();
        if (insErr || !doc) {
          await supabase.storage.from("preventivi").remove([path]);
          throw new Error("Registrazione del documento non riuscita");
        }

        aggiorna(i, { stato: "lavoro", fase: "Lettura delle voci" });
        aggiorna(i, await avviaESegui(supabase, doc.id));
      } catch (e) {
        aggiorna(i, {
          stato: "errore",
          messaggio: e instanceof Error ? e.message : "Errore imprevisto",
        });
      }
      router.refresh();
    }
    setInCorso(false);
  }

  const totale = valide.length;
  const progresso = totale ? fatti / totale : 0;

  return (
    <section className="mb-12 grid gap-10 border border-hairline p-6 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:p-10">
      <div>
        <p className="eyebrow mb-3 text-stone">Libreria personale</p>
        <h2 className="title-lg mb-3 text-ink">I tuoi vecchi preventivi diventano il tuo prezzario.</h2>
        <p className="max-w-[52ch] text-base leading-relaxed text-graphite">
          Carica i tuoi vecchi preventivi: IOP ne estrae descrizioni e prezzi, che diventano la tua
          libreria personale.
        </p>
        <p className="mt-4 text-sm text-stone">
          Ogni documento viene letto in sequenza: può servire un minuto o due. Le descrizioni restano
          scritte come le hai scritte tu.
        </p>
      </div>

      <div>
        <label
          onDragOver={(e) => {
            e.preventDefault();
            if (!inCorso) setTrascina(true);
          }}
          onDragLeave={() => setTrascina(false)}
          onDrop={(e) => {
            e.preventDefault();
            setTrascina(false);
            scegli(e.dataTransfer.files);
          }}
          className={`flex cursor-pointer flex-col items-start gap-1 border border-dashed px-6 py-8 transition-[border-color,background-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            trascina ? "border-ink bg-surface-soft" : "border-hairline-soft hover:border-ink"
          } ${inCorso ? "pointer-events-none opacity-50" : ""}`}
        >
          <span className="text-sm font-semibold text-ink">
            {righe.length ? `${righe.length} file selezionati` : "Trascina qui i preventivi"}
          </span>
          <span className="text-sm text-slate">oppure clicca per sceglierli dal computer</span>
          <span className="mt-2 text-xs text-stone">PDF fino a 20 MB · JPG, PNG, WEBP fino a 5 MB</span>
          <input
            type="file"
            accept=".pdf,application/pdf,image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            disabled={inCorso}
            onChange={(e) => {
              scegli(e.target.files);
              e.target.value = "";
            }}
          />
        </label>

        {righe.length > 0 ? (
          <div className="mt-6">
            <div className="mb-2 flex items-baseline justify-between gap-4 text-sm">
              <span className="font-semibold text-ink tabular-nums" aria-live="polite">
                {totale > 0
                  ? `${fatti}/${totale} — ${vociTotali} ${vociTotali === 1 ? "voce estratta" : "voci estratte"}`
                  : "Nessun file importabile"}
              </span>
              {!inCorso && daElaborare === 0 ? (
                <button
                  type="button"
                  onClick={() => setRighe([])}
                  className="text-sm text-slate underline underline-offset-2"
                >
                  Pulisci
                </button>
              ) : null}
            </div>
            <div className="h-px w-full bg-hairline">
              <div
                className="h-px origin-left bg-ink transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{ transform: `scaleX(${progresso})` }}
              />
            </div>

            <ul className="mt-4 divide-y divide-hairline">
              {righe.map((r, i) => (
                <li key={`${r.file.name}-${i}`} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                  <span className="min-w-0 truncate text-ink">{r.file.name}</span>
                  <EsitoLabel esito={r.esito} />
                </li>
              ))}
            </ul>

            <div className="mt-6">
              <Button
                type="button"
                onClick={avvia}
                disabled={inCorso || daElaborare === 0}
                className="active:scale-[0.98]"
              >
                {inCorso ? "Estrazione in corso…" : "Estrai le voci"}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function EsitoLabel({ esito }: { esito: Esito }) {
  switch (esito.stato) {
    case "attesa":
      return <span className="shrink-0 text-stone">In attesa</span>;
    case "lavoro":
      return (
        <span className="flex shrink-0 items-center gap-2 text-graphite">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink" aria-hidden />
          {esito.fase}…
        </span>
      );
    case "ok":
      return (
        <span className="shrink-0 font-medium text-ink tabular-nums">
          {esito.voci} {esito.voci === 1 ? "voce" : "voci"}
        </span>
      );
    case "lento":
      return (
        <span className="max-w-[60%] shrink-0 text-right text-graphite">
          Ancora in elaborazione, ricarica più tardi
        </span>
      );
    case "errore":
      return (
        <span className="max-w-[60%] shrink-0 text-right text-graphite" role="alert">
          <span className="font-semibold text-ink">Errore.</span> {esito.messaggio}
        </span>
      );
  }
}
