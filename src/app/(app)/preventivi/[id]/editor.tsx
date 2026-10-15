"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { StatoBadge } from "@/components/ui/misc";
import { UNITA_LABEL, formatEuro } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/types";
import {
  addCicloPitturazione,
  addInterventoBlank,
  addInterventoFromCiclo,
  deleteIntervento,
  generaInterventiDaFoto,
  saveAllegato,
  saveAnagrafica,
  saveAnnotazioni,
  saveSuperficie,
  setFontePrezzi,
  setPrezzoMercato,
  updateIntervento,
  updateStato,
} from "./actions";
import { CercaVoce } from "./cerca-voce";
import { FotoAutopsia, type Punto, type Sospetto } from "./foto-autopsia";
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

const SOGLIA_SCOSTAMENTO = 0.2; // 20%
function scostamento(ditta: number, mercato: number | null): number | null {
  if (!mercato || mercato <= 0 || ditta <= 0) return null;
  return Math.abs(ditta - mercato) / mercato;
}

type EsitoAbbinamento = {
  abbinati: number;
  senza_corrispondenza: number;
  unita_diversa: number;
  non_elaborati: number;
  errori: number;
};

/** Abbina le voci al prezzario/libreria. Lancia un Error con messaggio in italiano. */
async function abbinaVoci(preventivoId: string, soloNuovi: boolean): Promise<EsitoAbbinamento> {
  const supabase = createClient();
  type Risposta = Partial<Omit<EsitoAbbinamento, "errori">> & { error?: string; errori?: string[] };
  let res: Awaited<ReturnType<typeof supabase.functions.invoke<Risposta>>>;
  try {
    res = await supabase.functions.invoke<Risposta>("abbina-voci", {
      body: { preventivo_id: preventivoId, solo_nuovi: soloNuovi },
    });
  } catch {
    throw new Error("Abbinamento al prezzario non riuscito: controlla la connessione e riprova.");
  }
  const { data, error } = res;
  if (error || !data || data.error) {
    const status = (error as { context?: Response } | null)?.context?.status;
    throw new Error(
      status === 404
        ? "Abbinamento al prezzario non riuscito: preventivo non trovato."
        : status === 400
          ? "Abbinamento al prezzario non riuscito: imposta la regione del prezzario nelle Impostazioni."
          : "Abbinamento al prezzario non riuscito. Riprova tra qualche istante.",
    );
  }
  return {
    abbinati: Number(data.abbinati ?? 0),
    senza_corrispondenza: Number(data.senza_corrispondenza ?? 0),
    unita_diversa: Number(data.unita_diversa ?? 0),
    non_elaborati: Number(data.non_elaborati ?? 0),
    errori: Array.isArray(data.errori) ? data.errori.length : 0,
  };
}

function testoEsitoAbbinamento(e: EsitoAbbinamento): string {
  const voci = (n: number) => (n === 1 ? "1 voce" : `${n} voci`);
  const parti = [
    `${voci(e.abbinati)} ${e.abbinati === 1 ? "abbinata" : "abbinate"}`,
    `${e.senza_corrispondenza} senza corrispondenza`,
  ];
  if (e.unita_diversa > 0) parti.push(`${e.unita_diversa} con unità diversa`);
  let s = `${parti.join(", ")}.`;
  if (e.non_elaborati > 0) {
    s += ` ${e.non_elaborati} non ${e.non_elaborati === 1 ? "elaborata" : "elaborate"}: premi di nuovo "Abbina al prezzario".`;
  }
  if (e.errori > 0) {
    s += ` ${e.errori === 1 ? "Si è verificato 1 errore" : `Si sono verificati ${e.errori} errori`}: riprova.`;
  }
  return s;
}

export function PreventivoEditor({
  preventivo,
  cliente,
  edificio,
  interventi,
  cicli,
  preview,
  regione,
}: {
  preventivo: Tables<"preventivi">;
  cliente: Tables<"clienti"> | null;
  edificio: Tables<"edifici"> | null;
  interventi: Intervento[];
  cicli: Ciclo[];
  preview: PreviewData;
  regione: string;
}) {
  const tabs =
    preventivo.modalita === "capitolato"
      ? (["Capitolato", "Anagrafica", "Interventi", "Foto", "Foto descrizione", "Anteprima"] as const)
      : (["Anagrafica", "Interventi", "Foto", "Foto descrizione", "Anteprima"] as const);
  const defaultTab =
    preventivo.modalita === "foto" ? "Foto descrizione" : tabs[0];
  const [tab, setTab] = useState<string>(defaultTab);
  const [pending, startTransition] = useTransition();
  const totale = interventi.reduce((a, i) => a + Number(i.importo ?? 0), 0);

  return (
    <div>
      {/* Testata */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted">
            {preventivo.numero_protocollo} ·{" "}
            {preventivo.modalita === "capitolato" ? "Da capitolato" : preventivo.modalita === "foto" ? "Da foto" : "Manuale"}
          </p>
          <h1 className="display-md text-ink">
            {preventivo.oggetto || "Preventivo senza titolo"}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Select
            aria-label="Fonte prezzi"
            defaultValue={preventivo.fonte_prezzi}
            className="w-52"
            onChange={(e) =>
              startTransition(() => setFontePrezzi(preventivo.id, e.target.value))
            }
          >
            <option value="entrambi">Prezzi: Entrambi</option>
            <option value="prezzario">Prezzi: Solo prezzario</option>
            <option value="propri">Prezzi: Solo miei prezzi</option>
          </Select>
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
        <CapitolatoTab
          preventivo={preventivo}
          onDone={() => setTab("Interventi")}
          onFotoDescrizione={() => setTab("Foto descrizione")}
        />
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
          fontePrezzi={preventivo.fonte_prezzi}
          regione={regione}
          interventi={interventi}
          cicli={cicli}
          edificio={edificio}
          pending={pending}
          start={startTransition}
        />
      )}

      {tab === "Foto" && (
        <FotoTab preventivoId={preventivo.id} orgId={preventivo.org_id} edificio={edificio} />
      )}

      {tab === "Foto descrizione" && (
        <FotoDescrizioneTab
          preventivoId={preventivo.id}
          orgId={preventivo.org_id}
          onSuccess={() => setTab("Interventi")}
        />
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
  fontePrezzi,
  regione,
  interventi,
  cicli,
  edificio,
  pending,
  start,
}: {
  preventivoId: string;
  fontePrezzi: Tables<"preventivi">["fonte_prezzi"];
  regione: string;
  interventi: Intervento[];
  cicli: Ciclo[];
  edificio: Tables<"edifici"> | null;
  pending: boolean;
  start: (cb: () => void) => void;
}) {
  const router = useRouter();
  const [cicloId, setCicloId] = useState("");
  const [abbinando, setAbbinando] = useState(false);
  const [esito, setEsito] = useState<string | null>(null);
  const [abbinaError, setAbbinaError] = useState<string | null>(null);

  async function abbina() {
    setAbbinando(true);
    setEsito(null);
    setAbbinaError(null);
    try {
      setEsito(testoEsitoAbbinamento(await abbinaVoci(preventivoId, true)));
      router.refresh();
    } catch (e) {
      setAbbinaError(e instanceof Error ? e.message : "Abbinamento al prezzario non riuscito.");
    } finally {
      setAbbinando(false);
    }
  }

  return (
    <div className="space-y-6">
      <CercaVoce preventivoId={preventivoId} fontePrezzi={fontePrezzi} regione={regione} />

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
        <Button
          variant="secondary"
          disabled={pending || abbinando || interventi.length === 0}
          onClick={abbina}
        >
          {abbinando ? "Abbinamento in corso…" : "Abbina al prezzario"}
        </Button>
      </div>

      {abbinaError ? (
        <p className="border border-hairline-soft bg-surface-soft px-3 py-2 text-sm text-ink">
          {abbinaError}
        </p>
      ) : null}
      {esito ? <p className="text-sm text-success">{esito}</p> : null}

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
              comune={edificio?.comune ?? null}
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
  edificio,
}: {
  preventivoId: string;
  orgId: string;
  edificio: Tables<"edifici"> | null;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [addingCiclo, setAddingCiclo] = useState(false);
  const [result, setResult] = useState<
    { livello: number; intervento: string; descrizione: string } | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [superfici, setSuperfici] = useState<{
    superficie_mq: number;
    larghezza_m?: number;
    altezza_m?: number;
    piani_stimati?: number;
    finestre_contate?: number;
    ragionamento: string;
  } | null>(null);
  const [superficiError, setSuperficiError] = useState<string | null>(null);
  const [superficiSaved, setSuperficiSaved] = useState(false);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setResult(null);
    setSavedMsg(null);
    setError(null);
    setSuperfici(null);
    setSuperficiError(null);
    setSuperficiSaved(false);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function stimaSuperfici() {
    if (!file) return;
    setLoading(true);
    setSuperficiError(null);
    setSuperfici(null);
    setSuperficiSaved(false);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result).split(",")[1]);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke("stima-superfici", {
        body: { image_base64: base64, media_type: file.type || "image/jpeg" },
      });
      if (error || data?.error) throw new Error(data?.error ?? "errore");
      setSuperfici(data.stima);
    } catch {
      setSuperficiError("Stima non riuscita (verifica la chiave AI).");
    } finally {
      setLoading(false);
    }
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
        <div className="flex flex-wrap gap-3">
          <Button onClick={analizza} disabled={loading}>
            {loading ? "Analisi in corso…" : "Analizza degrado"}
          </Button>
          <Button variant="secondary" onClick={stimaSuperfici} disabled={loading}>
            {loading ? "Stima in corso…" : "Stima superficie dalla foto"}
          </Button>
        </div>
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
          <a
            href="/guida-degrado"
            target="_blank"
            className="mt-2 block text-xs text-link underline"
          >
            Perché questo livello? Apri la guida
          </a>
        </div>
      ) : null}

      {superficiError ? (
        <p className="border border-hairline-soft bg-surface-soft px-3 py-2 text-sm text-ink">
          {superficiError}
        </p>
      ) : null}

      {superfici ? (
        <div className="rounded-md border border-hairline bg-surface-soft p-4 space-y-3">
          <p className="text-sm font-medium text-ink">Stima superficie facciata</p>
          <p className="text-xs text-body">{superfici.ragionamento}</p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {superfici.piani_stimati != null ? (
              <div>
                <span className="block text-xs text-muted">Piani stimati</span>
                <span className="text-sm text-ink">{superfici.piani_stimati}</span>
              </div>
            ) : null}
            {superfici.finestre_contate != null ? (
              <div>
                <span className="block text-xs text-muted">Finestre contate</span>
                <span className="text-sm text-ink">{superfici.finestre_contate}</span>
              </div>
            ) : null}
            {superfici.larghezza_m != null ? (
              <div>
                <span className="block text-xs text-muted">Larghezza stimata</span>
                <span className="text-sm text-ink">{superfici.larghezza_m} m</span>
              </div>
            ) : null}
            {superfici.altezza_m != null ? (
              <div>
                <span className="block text-xs text-muted">Altezza stimata</span>
                <span className="text-sm text-ink">{superfici.altezza_m} m</span>
              </div>
            ) : null}
          </div>
          <Field label="Superficie facciata (mq)" htmlFor="superficie-mq">
            <Input
              id="superficie-mq"
              type="number"
              step="0.01"
              value={superfici.superficie_mq}
              onChange={(e) => {
                const v = Number(e.target.value);
                setSuperfici((s) => s ? { ...s, superficie_mq: Number.isFinite(v) ? v : 0 } : s);
                setSuperficiSaved(false);
              }}
            />
          </Field>
          {superficiSaved ? (
            <p className="text-sm text-success">Superficie salvata.</p>
          ) : (
            <Button
              variant="secondary"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                try {
                  await saveSuperficie(preventivoId, edificio?.id ?? null, superfici.superficie_mq);
                  setSuperficiSaved(true);
                } finally {
                  setLoading(false);
                }
              }}
            >
              Salva superficie
            </Button>
          )}
        </div>
      ) : null}

      {result && result.livello >= 7 ? (
        <div className="mt-3 rounded-md border border-ink bg-surface-soft p-3 text-sm">
          <p className="font-semibold text-ink">⚠ Degrado livello {result.livello}/9 — pitturazione totale consigliata</p>
          <p className="mt-1 text-graphite">
            Dal livello 7 in su i lavori sono significativamente importanti e l&apos;area è
            certamente estesa: si consiglia la pitturazione totale della superficie e si prevede
            il relativo ciclo di lavorazione.
          </p>
          <button
            type="button"
            disabled={addingCiclo}
            onClick={async () => {
              if (addingCiclo) return;
              setAddingCiclo(true);
              try {
                await addCicloPitturazione(preventivoId, superfici?.superficie_mq ?? null);
              } finally {
                setAddingCiclo(false);
              }
            }}
            className="mt-2 text-link underline disabled:opacity-50"
          >
            {addingCiclo ? "Aggiunta in corso…" : "Aggiungi ciclo pitturazione totale"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

type CicloMappa = {
  titolo: string;
  descrizione_fasi: string;
  unita_default: string;
  prezzo_default: number | null;
};

function FotoDescrizioneTab({
  preventivoId,
  orgId,
  onSuccess,
}: {
  preventivoId: string;
  orgId: string;
  onSuccess: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [storagePath, setStoragePath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [puntiState, setPuntiState] = useState<Punto[]>([]);
  const [mappa, setMappa] = useState<Record<number, string>>({});
  const [mappaCicli, setMappaCicli] = useState<Record<number, CicloMappa>>({});

  // Resolve level→ciclo map on mount
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("degrado_samples")
        .select("livello, intervento, descrizione, org_id, ciclo_id, cicli_lavorazione(titolo, descrizione_fasi, unita_default, prezzo_default)")
        .order("org_id", { ascending: false, nullsFirst: false });

      const byLiv: Record<number, string> = {};
      const byCiclo: Record<number, CicloMappa> = {};
      for (const r of data ?? []) {
        if (byLiv[r.livello] !== undefined) continue; // first row wins (org before global)
        // cicli_lavorazione may come as array or object depending on supabase-js version
        const cicloRaw = r.cicli_lavorazione;
        const c = Array.isArray(cicloRaw) ? cicloRaw[0] : cicloRaw;
        const ciclo = c as { titolo?: string; descrizione_fasi?: string; unita_default?: string; prezzo_default?: number | null } | null;
        byLiv[r.livello] = ciclo?.titolo ?? r.intervento;
        if (ciclo?.titolo) {
          byCiclo[r.livello] = {
            titolo: ciclo.titolo,
            descrizione_fasi: ciclo.descrizione_fasi ?? "",
            unita_default: ciclo.unita_default ?? "corpo",
            prezzo_default: ciclo.prezzo_default ?? null,
          };
        } else {
          byCiclo[r.livello] = {
            titolo: r.intervento,
            descrizione_fasi: r.descrizione ?? "",
            unita_default: "corpo",
            prezzo_default: null,
          };
        }
      }
      setMappa(byLiv);
      setMappaCicli(byCiclo);
    })();
  }, []);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setSignedUrl(null);
    setStoragePath(null);
    setUploadError(null);
    setSuccessMsg(null);
    setGenError(null);
    setPuntiState([]);
    if (!f) return;

    setUploading(true);
    try {
      const supabase = createClient();
      const ext = f.name.split(".").pop() ?? "jpg";
      const path = `${orgId}/${preventivoId}/foto-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("preventivi")
        .upload(path, f, { upsert: true });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage
        .from("preventivi")
        .createSignedUrl(path, 3600);
      if (!signed?.signedUrl) throw new Error("Signed URL non disponibile");
      setStoragePath(path);
      setSignedUrl(signed.signedUrl);
    } catch {
      setUploadError("Upload non riuscito. Riprova.");
    } finally {
      setUploading(false);
    }
  }

  async function onRilevaFoto(punti: Punto[]): Promise<Sospetto[]> {
    if (!signedUrl) return [];
    const supabase = createClient();
    const { data, error } = await supabase.functions.invoke("rileva-punti-mancanti", {
      body: {
        image_url: signedUrl,
        punti: punti.map((p) => ({ x: p.x, y: p.y, livello: p.livello })),
      },
    });
    if (error || !data?.ok) return [];
    return (data.sospetti ?? []) as Sospetto[];
  }

  async function handleSave(punti: Punto[]) {
    setPuntiState(punti);
    if (!storagePath) return;
    await saveAnnotazioni(preventivoId, storagePath, punti);
  }

  async function handleAvvia(punti: Punto[]) {
    if (!signedUrl) return;
    setPuntiState(punti);
    setGenError(null);
    setSuccessMsg(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke("genera-da-foto", {
        body: {
          image_url: signedUrl,
          punti: punti.map((p) => ({ livello: p.livello, nota: p.nota ?? null })),
          mappa: mappaCicli,
        },
      });
      if (error || data?.error) throw new Error(data?.error ?? "errore");
      await generaInterventiDaFoto(preventivoId, data.risultato.interventi);
    } catch {
      setGenError("Generazione non riuscita (verifica la chiave AI).");
      return;
    }
    const ha7 = punti.some((p) => p.livello >= 7);
    const nota7 = ha7
      ? " Rilevato degrado ≥7: aggiunta pitturazione totale della superficie."
      : "";
    try {
      await abbinaVoci(preventivoId, true);
      setSuccessMsg(
        `Preventivo pre-compilato e abbinato al prezzario.${nota7} Rivedi nel tab Interventi.`,
      );
    } catch {
      setSuccessMsg(`Preventivo pre-compilato.${nota7} Rivedi nel tab Interventi.`);
      setGenError(
        "Abbinamento al prezzario non riuscito: usa \"Abbina al prezzario\" nel tab Interventi.",
      );
      return;
    }
    setTimeout(onSuccess, 1500);
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h2 className="title-sm text-ink">Foto descrizione</h2>
        <p className="mt-1 text-sm text-graphite">
          Carica una foto della facciata, posiziona i punti sui danni e assegna
          il livello di degrado. L&apos;AI genera gli interventi nel preventivo.
        </p>
      </div>

      <label className="inline-flex cursor-pointer items-center rounded-md border border-hairline px-4 py-2 text-sm text-ink">
        {uploading ? "Caricamento…" : file ? "Cambia foto" : "Scegli foto"}
        <input type="file" accept="image/*" className="hidden" onChange={onFile} />
      </label>

      {uploadError ? (
        <p className="border border-hairline-soft bg-surface-soft px-3 py-2 text-sm text-ink">
          {uploadError}
        </p>
      ) : null}

      {signedUrl ? (
        <FotoAutopsia
          imageUrl={signedUrl}
          initialPunti={puntiState}
          mappa={mappa}
          onSave={handleSave}
          onAvvia={handleAvvia}
          onRileva={onRilevaFoto}
        />
      ) : null}

      {genError ? (
        <p className="border border-hairline-soft bg-surface-soft px-3 py-2 text-sm text-ink">
          {genError}
        </p>
      ) : null}

      {successMsg ? (
        <p className="text-sm text-success">{successMsg}</p>
      ) : null}
    </div>
  );
}

function CapitolatoTab({
  preventivo,
  onDone,
  onFotoDescrizione,
}: {
  preventivo: Tables<"preventivi">;
  onDone: () => void;
  onFotoDescrizione?: () => void;
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
      try {
        const esito = await abbinaVoci(preventivo.id, false);
        setDone(`Generati ${data.interventi_creati} interventi. ${testoEsitoAbbinamento(esito)}`);
        setTimeout(onDone, 1500);
      } catch (e) {
        setDone(`Generati ${data.interventi_creati} interventi.`);
        setError(
          `${e instanceof Error ? e.message : "Abbinamento al prezzario non riuscito."} Puoi riprovare con "Abbina al prezzario" nel tab Interventi.`,
        );
      }
      router.refresh();
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

      <p className="mb-3 rounded-md border border-hairline bg-surface-soft p-3 text-sm text-graphite">
        Vuoi segnalare un danno sull&apos;edificio che non è presente o valutato diversamente
        nel computo? Usa la{" "}
        <button
          type="button"
          onClick={() => onFotoDescrizione?.()}
          className="text-link underline"
        >
          foto descrizione
        </button>
        !
      </p>

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
  comune,
  pending,
  start,
}: {
  intervento: Intervento;
  preventivoId: string;
  comune: string | null;
  pending: boolean;
  start: (cb: () => void) => void;
}) {
  const [descrizione, setDescrizione] = useState(i.descrizione ?? "");
  const [sugg, setSugg] = useState<{
    prodotto: string;
    marca?: string | null;
    alternativa?: string | null;
    motivazione?: string;
    scheda_tecnica_url?: string;
  } | null>(null);
  const [suggError, setSuggError] = useState<string | null>(null);
  const [suggLoading, setSuggLoading] = useState(false);
  const [mercato, setMercato] = useState<{ prezzo: number; fonte: string } | null>(
    i.prezzo_mercato != null ? { prezzo: Number(i.prezzo_mercato), fonte: i.fonte_mercato ?? "" } : null,
  );
  const [mercatoLoading, setMercatoLoading] = useState(false);
  const [mercatoError, setMercatoError] = useState<string | null>(null);

  async function suggerisci() {
    setSuggLoading(true);
    setSugg(null);
    setSuggError(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke("suggest-materiali", {
        body: { lavorazione: i.titolo },
      });
      if (error || data?.error) throw new Error("errore");
      setSugg(data.suggerimento);
    } catch {
      setSuggError("Suggerimento non disponibile (verifica la chiave AI).");
    } finally {
      setSuggLoading(false);
    }
  }

  async function confrontaMercato() {
    setMercatoLoading(true);
    setMercatoError(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke("estimate-prezzo-mercato", {
        body: { lavorazione: i.titolo, unita: i.unita, comune: comune ?? null },
      });
      if (error || data?.error) throw new Error("errore");
      const stima = data.stima as { prezzo_mercato: number; fonte: string };
      setMercato({ prezzo: stima.prezzo_mercato, fonte: stima.fonte });
      await setPrezzoMercato(i.id, preventivoId, stima.prezzo_mercato, stima.fonte);
    } catch {
      setMercatoError("Stima non disponibile (verifica la chiave AI).");
    } finally {
      setMercatoLoading(false);
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
            <span className="text-xs text-body">
              {(() => {
                const schedaUrl = sugg.scheda_tecnica_url && /^https?:\/\//i.test(sugg.scheda_tecnica_url) ? sugg.scheda_tecnica_url : null;
                return schedaUrl ? (
                  <a
                    href={schedaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-link underline underline-offset-2"
                  >
                    {sugg.prodotto}
                  </a>
                ) : (
                  <span className="text-ink">{sugg.prodotto}</span>
                );
              })()}
              {sugg.marca ? ` (${sugg.marca})` : ""}
              {sugg.alternativa ? ` — alt: ${sugg.alternativa}` : ""}
            </span>
            <button
              type="button"
              onClick={() => {
                const schedaUrl = sugg.scheda_tecnica_url && /^https?:\/\//i.test(sugg.scheda_tecnica_url) ? sugg.scheda_tecnica_url : null;
                const riga = schedaUrl
                  ? `Materiale consigliato: ${sugg.prodotto}${sugg.marca ? ` (${sugg.marca})` : ""} — scheda: ${schedaUrl}`
                  : `Materiale consigliato: ${sugg.prodotto}${sugg.marca ? ` (${sugg.marca})` : ""}`;
                setDescrizione((d) => `${d}${d ? "\n" : ""}${riga}`);
              }}
              className="text-xs text-link"
            >
              + aggiungi
            </button>
          </>
        ) : null}
        {suggError ? (
          <span className="text-xs text-body">{suggError}</span>
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

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={confrontaMercato}
          disabled={mercatoLoading}
          className="text-link underline underline-offset-2 text-xs"
        >
          {mercatoLoading ? "…" : "Confronta col mercato"}
        </button>
        {mercato ? (
          <>
            <span className="text-xs text-body">
              Mercato: <span className="tabular-nums">{formatEuro(mercato.prezzo)}</span>
            </span>
            {(() => {
              const s = scostamento(Number(i.prezzo_unitario), mercato.prezzo);
              return s !== null && s > SOGLIA_SCOSTAMENTO ? (
                <span className="rounded-full border border-ink px-2 py-0.5 text-xs font-semibold text-ink">
                  ⚠ Scostamento elevato
                </span>
              ) : null;
            })()}
          </>
        ) : null}
        {mercatoError ? (
          <span className="text-xs text-body">{mercatoError}</span>
        ) : null}
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
