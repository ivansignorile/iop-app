"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { StatoBadge } from "@/components/ui/misc";
import { UNITA_LABEL, formatEuro } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/types";
import {
  addInterventoBlank,
  addInterventoFromCiclo,
  deleteIntervento,
  saveAllegato,
  saveAnagrafica,
  updateIntervento,
  updateStato,
} from "./actions";
import { PreventivoPreview, type PreviewData } from "./preview";

type Ciclo = Pick<
  Tables<"cicli_lavorazione">,
  "id" | "titolo" | "categoria" | "unita_default" | "prezzo_default"
>;
type Intervento = Tables<"preventivo_interventi">;
type Stato = Tables<"preventivi">["stato"];

const UNITA: Array<Tables<"preventivo_interventi">["unita"]> = [
  "corpo",
  "mq",
  "ml",
  "mc",
  "giorno",
  "cad",
  "kg",
];
const STATI: Stato[] = ["bozza", "inviato", "accettato", "rifiutato"];

export function PreventivoEditor({
  preventivo,
  cliente,
  edificio,
  interventi,
  cicli,
  preview,
}: {
  preventivo: Tables<"preventivi">;
  cliente: Tables<"clienti"> | null;
  edificio: Tables<"edifici"> | null;
  interventi: Intervento[];
  cicli: Ciclo[];
  preview: PreviewData;
}) {
  const tabs =
    preventivo.modalita === "capitolato"
      ? (["Capitolato", "Anagrafica", "Interventi", "Foto", "Anteprima"] as const)
      : (["Anagrafica", "Interventi", "Foto", "Anteprima"] as const);
  const [tab, setTab] = useState<string>(tabs[0]);
  const [pending, startTransition] = useTransition();
  const totale = interventi.reduce((a, i) => a + Number(i.importo ?? 0), 0);

  return (
    <div>
      {/* Testata */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted">
            {preventivo.numero_protocollo} ·{" "}
            {preventivo.modalita === "capitolato" ? "Da capitolato" : "Manuale"}
          </p>
          <h1 className="display-md text-ink">
            {preventivo.oggetto || "Preventivo senza titolo"}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <StatoBadge stato={preventivo.stato} />
          <Select
            defaultValue={preventivo.stato}
            className="w-40"
            onChange={(e) =>
              startTransition(() =>
                updateStato(preventivo.id, e.target.value as Stato),
              )
            }
          >
            {STATI.map((st) => (
              <option key={st} value={st}>
                {st.charAt(0).toUpperCase() + st.slice(1)}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b border-hairline">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm ${
              tab === t
                ? "border-ink font-medium text-ink"
                : "border-transparent text-muted"
            }`}
          >
            {t}
          </button>
        ))}
        <div className="ml-auto self-center text-sm text-muted">
          Imponibile:{" "}
          <span className="font-medium text-ink">{formatEuro(totale)}</span>
        </div>
      </div>

      {tab === "Capitolato" && (
        <CapitolatoTab preventivo={preventivo} onDone={() => setTab("Interventi")} />
      )}

      {tab === "Anagrafica" && (
        <AnagraficaTab
          preventivo={preventivo}
          cliente={cliente}
          edificio={edificio}
        />
      )}

      {tab === "Interventi" && (
        <InterventiTab
          preventivoId={preventivo.id}
          interventi={interventi}
          cicli={cicli}
          pending={pending}
          start={startTransition}
        />
      )}

      {tab === "Foto" && (
        <FotoTab preventivoId={preventivo.id} orgId={preventivo.org_id} />
      )}

      {tab === "Anteprima" && (
        <div>
          <div className="mb-4 flex justify-end print:hidden">
            <a
              href={`/stampa/preventivo/${preventivo.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center justify-center rounded-full border border-ink bg-canvas px-5 text-sm font-semibold text-ink"
            >
              Stampa / PDF
            </a>
          </div>
          <PreventivoPreview data={preview} />
        </div>
      )}
    </div>
  );
}

function AnagraficaTab({
  preventivo,
  cliente,
  edificio,
}: {
  preventivo: Tables<"preventivi">;
  cliente: Tables<"clienti"> | null;
  edificio: Tables<"edifici"> | null;
}) {
  const [saved, setSaved] = useState(false);
  return (
    <form
      action={async (fd) => {
        await saveAnagrafica(preventivo.id, fd);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }}
      className="grid gap-8 md:grid-cols-2"
    >
      <section className="space-y-4">
        <h2 className="title-sm text-ink">Committente</h2>
        <Field label="Tipo" htmlFor="cliente_tipo">
          <Select
            id="cliente_tipo"
            name="cliente_tipo"
            defaultValue={cliente?.tipo ?? "condominio"}
          >
            <option value="condominio">Condominio</option>
            <option value="privato">Privato</option>
            <option value="azienda">Azienda</option>
          </Select>
        </Field>
        <Field label="Nome / Ragione sociale" htmlFor="cliente_nome">
          <Input id="cliente_nome" name="cliente_nome" defaultValue={cliente?.nome ?? ""} />
        </Field>
        <Field label="Amministratore" htmlFor="cliente_amministratore">
          <Input
            id="cliente_amministratore"
            name="cliente_amministratore"
            defaultValue={cliente?.amministratore ?? ""}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Codice fiscale" htmlFor="cliente_cf">
            <Input id="cliente_cf" name="cliente_cf" defaultValue={cliente?.codice_fiscale ?? ""} />
          </Field>
          <Field label="Partita IVA" htmlFor="cliente_piva">
            <Input id="cliente_piva" name="cliente_piva" defaultValue={cliente?.partita_iva ?? ""} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email" htmlFor="cliente_email">
            <Input id="cliente_email" name="cliente_email" type="email" defaultValue={cliente?.email ?? ""} />
          </Field>
          <Field label="Telefono" htmlFor="cliente_telefono">
            <Input id="cliente_telefono" name="cliente_telefono" defaultValue={cliente?.telefono ?? ""} />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="title-sm text-ink">Edificio & preventivo</h2>
        <Field label="Indirizzo" htmlFor="ed_indirizzo">
          <Input id="ed_indirizzo" name="ed_indirizzo" defaultValue={edificio?.indirizzo ?? ""} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Comune" htmlFor="ed_comune">
            <Input id="ed_comune" name="ed_comune" defaultValue={edificio?.comune ?? ""} />
          </Field>
          <Field label="CAP" htmlFor="ed_cap">
            <Input id="ed_cap" name="ed_cap" defaultValue={edificio?.cap ?? ""} />
          </Field>
          <Field label="Prov." htmlFor="ed_provincia">
            <Input id="ed_provincia" name="ed_provincia" defaultValue={edificio?.provincia ?? ""} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Piani" htmlFor="ed_piani">
            <Input id="ed_piani" name="ed_piani" type="number" defaultValue={edificio?.piani ?? ""} />
          </Field>
          <Field label="Facciate" htmlFor="ed_facciate">
            <Input id="ed_facciate" name="ed_facciate" type="number" defaultValue={edificio?.facciate ?? ""} />
          </Field>
          <Field label="Balconi" htmlFor="ed_balconi">
            <Input id="ed_balconi" name="ed_balconi" type="number" defaultValue={edificio?.balconi ?? ""} />
          </Field>
        </div>
        <Field label="Tipo copertura" htmlFor="ed_copertura">
          <Input id="ed_copertura" name="ed_copertura" defaultValue={edificio?.tipo_copertura ?? ""} />
        </Field>
        <Field label="Porzione interessata" htmlFor="ed_porzione">
          <Input id="ed_porzione" name="ed_porzione" defaultValue={edificio?.porzione ?? ""} />
        </Field>

        <div className="grid grid-cols-3 gap-3 border-t border-hairline pt-4">
          <Field label="Oggetto" htmlFor="oggetto">
            <Input id="oggetto" name="oggetto" defaultValue={preventivo.oggetto ?? ""} className="col-span-1" />
          </Field>
          <Field label="Data" htmlFor="data">
            <Input id="data" name="data" type="date" defaultValue={preventivo.data} />
          </Field>
          <Field label="IVA %" htmlFor="iva">
            <Input id="iva" name="iva" type="number" step="0.01" defaultValue={preventivo.iva} />
          </Field>
        </div>
      </section>

      <div className="md:col-span-2 flex items-center gap-3">
        <Button type="submit">Salva anagrafica</Button>
        {saved ? <span className="text-sm text-success">Salvato</span> : null}
      </div>
    </form>
  );
}

function InterventiTab({
  preventivoId,
  interventi,
  cicli,
  pending,
  start,
}: {
  preventivoId: string;
  interventi: Intervento[];
  cicli: Ciclo[];
  pending: boolean;
  start: (cb: () => void) => void;
}) {
  const [cicloId, setCicloId] = useState("");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3 rounded-md border border-hairline bg-surface-soft p-4">
        <div className="flex-1 min-w-[240px]">
          <label className="mb-1.5 block text-sm font-medium text-ink">
            Aggiungi dalla libreria cicli
          </label>
          <Select value={cicloId} onChange={(e) => setCicloId(e.target.value)}>
            <option value="">Seleziona un ciclo…</option>
            {cicli.map((c) => (
              <option key={c.id} value={c.id}>
                [{c.categoria}] {c.titolo}
                {c.prezzo_default
                  ? ` — ${formatEuro(c.prezzo_default)} ${UNITA_LABEL[c.unita_default]}`
                  : ""}
              </option>
            ))}
          </Select>
        </div>
        <Button
          variant="secondary"
          disabled={!cicloId || pending}
          onClick={() =>
            start(() => {
              addInterventoFromCiclo(preventivoId, cicloId);
              setCicloId("");
            })
          }
        >
          Aggiungi ciclo
        </Button>
        <Button
          variant="ghost"
          disabled={pending}
          onClick={() => start(() => addInterventoBlank(preventivoId))}
        >
          + Intervento vuoto
        </Button>
      </div>

      {interventi.length === 0 ? (
        <p className="text-sm text-muted">
          Nessun intervento. Aggiungine uno dalla libreria o crea un intervento
          vuoto.
        </p>
      ) : (
        <div className="space-y-4">
          {interventi.map((i) => (
            <InterventoRow
              key={i.id}
              intervento={i}
              preventivoId={preventivoId}
              pending={pending}
              start={start}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FotoTab({
  preventivoId,
  orgId,
}: {
  preventivoId: string;
  orgId: string;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<
    { livello: number; intervento: string; descrizione: string } | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setResult(null);
    setSavedMsg(null);
    setError(null);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function analizza() {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result).split(",")[1]);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const supabase = createClient();

      // Carica la foto nello storage e registra l'allegato col livello
      const path = `${orgId}/${preventivoId}/foto-${Date.now()}.${file.name.split(".").pop() ?? "jpg"}`;
      await supabase.storage.from("preventivi").upload(path, file, { upsert: true });

      const { data, error } = await supabase.functions.invoke("classify-degrado", {
        body: { image_base64: base64, media_type: file.type || "image/jpeg" },
      });
      if (error || data?.error) throw new Error("errore");
      const v = data.valutazione;
      setResult(v);
      await saveAllegato(
        preventivoId,
        path,
        v.livello,
        `${v.intervento}. ${v.descrizione}`,
      );
      setSavedMsg("Foto e descrizione aggiunte al report fotografico del preventivo.");
    } catch {
      setError("Analisi non riuscita (verifica la chiave AI).");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h2 className="title-sm text-ink">Analisi degrado da foto</h2>
        <p className="mt-1 text-sm text-muted">
          Carica una foto della facciata: l&apos;AI stima il grado di degrado
          (1-9) e suggerisce l&apos;intervento. La foto viene allegata al
          preventivo.
        </p>
      </div>

      <label className="inline-flex cursor-pointer items-center rounded-md border border-hairline px-4 py-2 text-sm text-ink">
        Scegli foto
        <input type="file" accept="image/*" className="hidden" onChange={onFile} />
      </label>

      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="Anteprima" className="max-h-72 rounded-md border border-hairline" />
      ) : null}

      {file ? (
        <Button onClick={analizza} disabled={loading}>
          {loading ? "Analisi in corso…" : "Analizza degrado"}
        </Button>
      ) : null}

      {error ? (
        <p className="border border-hairline-soft bg-surface-soft px-3 py-2 text-sm text-ink">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="rounded-md border border-hairline bg-surface-soft p-4">
          <p className="text-sm">
            <span className="font-medium text-ink">Livello {result.livello}/9</span>{" "}
            · {result.intervento}
          </p>
          <p className="mt-1 text-sm text-body">{result.descrizione}</p>
          {savedMsg ? <p className="mt-2 text-sm text-success">{savedMsg}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function CapitolatoTab({
  preventivo,
  onDone,
}: {
  preventivo: Tables<"preventivi">;
  onDone: () => void;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  function fileToBase64(f: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(",")[1]);
      r.onerror = reject;
      r.readAsDataURL(f);
    });
  }

  async function genera() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setDone(null);
    try {
      const supabase = createClient();
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      const isText = file.type.startsWith("text/") || file.name.toLowerCase().endsWith(".txt");

      let body: Record<string, unknown>;
      if (isText) {
        body = { preventivo_id: preventivo.id, testo: await file.text(), filename: file.name };
      } else {
        body = {
          preventivo_id: preventivo.id,
          file_base64: await fileToBase64(file),
          media_type: isPdf ? "application/pdf" : file.type || "application/pdf",
          filename: file.name,
        };
      }

      const { data, error } = await supabase.functions.invoke("parse-capitolato", { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setDone(`Generati ${data.interventi_creati} interventi.`);
      router.refresh();
      setTimeout(onDone, 1000);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Generazione non riuscita. Verifica che la chiave AI sia configurata.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h2 className="title-sm text-ink">Capitolato / computo metrico</h2>
        <p className="mt-1 text-sm text-graphite">
          Carica il file del capitolato o del computo (PDF o testo). L&apos;AI lo
          esamina e genera interventi, prezzi e anagrafica, che potrai rivedere e
          modificare.
        </p>
      </div>

      <label className="inline-flex cursor-pointer items-center rounded-full border border-ink px-5 py-2 text-sm font-semibold text-ink">
        {file ? "Cambia file" : "Scegli file"}
        <input
          type="file"
          accept=".pdf,.txt,application/pdf,text/plain"
          className="hidden"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setDone(null);
            setError(null);
          }}
        />
      </label>
      {file ? <p className="text-sm text-ink">{file.name}</p> : null}

      {error ? (
        <p className="border border-hairline-soft bg-surface-soft px-3 py-2 text-sm text-ink">
          {error}
        </p>
      ) : null}
      {done ? <p className="text-sm text-success">{done}</p> : null}

      <Button onClick={genera} disabled={loading || !file}>
        {loading ? "Analisi del capitolato in corso…" : "Genera preventivo dal file"}
      </Button>
    </div>
  );
}

function InterventoRow({
  intervento: i,
  preventivoId,
  pending,
  start,
}: {
  intervento: Intervento;
  preventivoId: string;
  pending: boolean;
  start: (cb: () => void) => void;
}) {
  const [descrizione, setDescrizione] = useState(i.descrizione ?? "");
  const [sugg, setSugg] = useState<string | null>(null);
  const [suggLoading, setSuggLoading] = useState(false);

  async function suggerisci() {
    setSuggLoading(true);
    setSugg(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke("suggest-materiali", {
        body: { lavorazione: i.titolo },
      });
      if (error || data?.error) throw new Error("errore");
      const s = data.suggerimento;
      setSugg(
        `${s.prodotto}${s.marca ? ` (${s.marca})` : ""}${
          s.alternativa ? ` — alt: ${s.alternativa}` : ""
        }`,
      );
    } catch {
      setSugg("Suggerimento non disponibile (verifica la chiave AI).");
    } finally {
      setSuggLoading(false);
    }
  }

  return (
    <form
      action={updateIntervento.bind(null, i.id, preventivoId)}
      className="rounded-md border border-hairline p-4"
    >
      <div className="grid gap-3 md:grid-cols-[1fr_160px]">
        <Field label="Titolo" htmlFor={`t-${i.id}`}>
          <Input id={`t-${i.id}`} name="titolo" defaultValue={i.titolo} />
        </Field>
        <Field label="Gruppo" htmlFor={`g-${i.id}`}>
          <Input
            id={`g-${i.id}`}
            name="gruppo"
            defaultValue={i.gruppo ?? ""}
            placeholder="es. Parti comuni"
          />
        </Field>
      </div>

      <Field label="Descrizione (ciclo di lavorazione)" htmlFor={`d-${i.id}`}>
        <Textarea
          id={`d-${i.id}`}
          name="descrizione"
          value={descrizione}
          onChange={(e) => setDescrizione(e.target.value)}
          rows={4}
        />
      </Field>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={suggerisci}
          disabled={suggLoading}
          className="rounded-md border border-hairline px-3 py-1.5 text-xs text-ink"
        >
          {suggLoading ? "…" : "Suggerisci materiale (AI)"}
        </button>
        {sugg ? (
          <>
            <span className="text-xs text-body">{sugg}</span>
            <button
              type="button"
              onClick={() =>
                setDescrizione((d) => `${d}${d ? "\n" : ""}Materiale: ${sugg}`)
              }
              className="text-xs text-link"
            >
              + aggiungi
            </button>
          </>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Field label="Unità" htmlFor={`u-${i.id}`}>
          <Select id={`u-${i.id}`} name="unita" defaultValue={i.unita}>
            {UNITA.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Quantità" htmlFor={`q-${i.id}`}>
          <Input id={`q-${i.id}`} name="quantita" type="number" step="0.001" defaultValue={i.quantita} />
        </Field>
        <Field label="Prezzo unit." htmlFor={`p-${i.id}`}>
          <Input id={`p-${i.id}`} name="prezzo_unitario" type="number" step="0.01" defaultValue={i.prezzo_unitario} />
        </Field>
        <Field label="Sconto" htmlFor={`s-${i.id}`}>
          <Input id={`s-${i.id}`} name="sconto" type="number" step="0.01" defaultValue={i.sconto} />
        </Field>
        <div className="flex flex-col justify-end">
          <span className="mb-1.5 block text-sm font-medium text-ink">
            Importo
          </span>
          <span className="flex h-11 items-center font-medium tabular-nums text-ink">
            {formatEuro(i.importo)}
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <Button type="submit" variant="secondary" className="px-4 py-2">
          Salva
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="px-4 py-2 text-ink underline underline-offset-2"
          disabled={pending}
          onClick={() => start(() => deleteIntervento(i.id, preventivoId))}
        >
          Elimina
        </Button>
      </div>
    </form>
  );
}
