"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { StatoBadge } from "@/components/ui/misc";
import { UNITA_LABEL, formatEuro } from "@/lib/format";
import type { Tables } from "@/lib/supabase/types";
import {
  addInterventoBlank,
  addInterventoFromCiclo,
  deleteIntervento,
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
const tabs = ["Anagrafica", "Interventi", "Anteprima"] as const;

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
  const [tab, setTab] = useState<(typeof tabs)[number]>("Anagrafica");
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

      {tab === "Anteprima" && (
        <div>
          <div className="mb-4 flex justify-end print:hidden">
            <Button variant="secondary" onClick={() => window.print()}>
              Stampa / PDF
            </Button>
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
          defaultValue={i.descrizione ?? ""}
          rows={4}
        />
      </Field>

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
          className="px-4 py-2 text-signature-coral"
          disabled={pending}
          onClick={() => start(() => deleteIntervento(i.id, preventivoId))}
        >
          Elimina
        </Button>
      </div>
    </form>
  );
}
