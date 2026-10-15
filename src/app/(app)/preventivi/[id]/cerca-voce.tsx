"use client";

import { useEffect, useId, useRef, useState, useTransition, type KeyboardEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { formatEuro } from "@/lib/format";
import { etichettaRegione } from "@/lib/scelta-fonte";
import type { FontePrezzi } from "../../../../../supabase/functions/_shared/risolvi-voce";
import { unitaDaVoci } from "../../../../../supabase/functions/_shared/unita-voce";
import { addInterventoDaVoce, cercaVoci, type VocePrezzario, type VocePropria } from "./actions";

const MIN_CARATTERI = 2;
const DEBOUNCE_MS = 300;

type Risultati = { prezzario: VocePrezzario[]; proprie: VocePropria[] };
type Stato = "idle" | "loading" | "ok" | "error";

function norm(s: string) {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function unitaPropria(unita: VocePropria["unita"]) {
  return unita === "corpo" ? "a corpo" : `/${unita}`;
}

/** Frecce su/giù per muoversi tra i risultati di una colonna. */
function navigaConFrecce(e: KeyboardEvent<HTMLUListElement>) {
  if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
  const bottoni = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>("button[data-voce]"));
  const i = bottoni.indexOf(document.activeElement as HTMLButtonElement);
  if (i < 0) return;
  e.preventDefault();
  const j = e.key === "ArrowDown" ? Math.min(i + 1, bottoni.length - 1) : Math.max(i - 1, 0);
  bottoni[j]?.focus();
}

export function CercaVoce({
  preventivoId,
  fontePrezzi,
  regione,
}: {
  preventivoId: string;
  fontePrezzi: FontePrezzi;
  regione: string;
}) {
  const inputId = useId();
  const [q, setQ] = useState("");
  // Ultima risposta ricevuta, legata alla chiave (fonte + testo) che l'ha prodotta.
  const [risposta, setRisposta] = useState<{ chiave: string; ok: boolean; risultati: Risultati } | null>(null);
  const [selPrezzario, setSelPrezzario] = useState<VocePrezzario | null>(null);
  const [selPropria, setSelPropria] = useState<VocePropria | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [aggiunta, setAggiunta] = useState<string | null>(null);
  const [adding, startAdd] = useTransition();
  const ultimaRichiesta = useRef(0);

  const mostraLibreria = fontePrezzi !== "prezzario";
  const testo = q.trim();

  const chiave = `${fontePrezzi}|${testo}`;
  const cercabile = testo.length >= MIN_CARATTERI;
  const stato: Stato = !cercabile
    ? "idle"
    : risposta?.chiave !== chiave
      ? "loading"
      : risposta.ok
        ? "ok"
        : "error";
  const risultati: Risultati =
    cercabile && risposta?.chiave === chiave ? risposta.risultati : { prezzario: [], proprie: [] };

  // Ricerca con debounce: solo l'ultima richiesta aggiorna i risultati.
  useEffect(() => {
    const id = ++ultimaRichiesta.current;
    if (testo.length < MIN_CARATTERI) return;
    const k = `${fontePrezzi}|${testo}`;
    const t = setTimeout(async () => {
      try {
        const r = await cercaVoci(testo, fontePrezzi);
        if (id === ultimaRichiesta.current) setRisposta({ chiave: k, ok: true, risultati: r });
      } catch {
        if (id === ultimaRichiesta.current) {
          setRisposta({ chiave: k, ok: false, risultati: { prezzario: [], proprie: [] } });
        }
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [testo, fontePrezzi]);

  // Con fonte 'prezzario' una voce propria già scelta non conta più.
  const propriaEffettiva = mostraLibreria ? selPropria : null;

  function scegliPrezzario(v: VocePrezzario) {
    setAggiunta(null);
    if (selPrezzario?.id === v.id) {
      setSelPrezzario(null);
      return;
    }
    setSelPrezzario(v);
    // Preseleziona la voce propria con lo stesso titolo, se presente tra i risultati.
    if (mostraLibreria && !selPropria) {
      const d = norm(v.descrizione);
      const gemella = risultati.proprie.find(
        (p) => norm(p.descrizione) === d || (norm(p.titolo).length >= 3 && d.startsWith(norm(p.titolo))),
      );
      if (gemella) setSelPropria(gemella);
    }
  }

  function scegliPropria(v: VocePropria) {
    setAggiunta(null);
    setSelPropria(selPropria?.id === v.id ? null : v);
  }

  function aggiungi() {
    setErrore(null);
    setAggiunta(null);
    const sel = {
      prezzarioVoceId: selPrezzario?.id ?? null,
      vocePropriaId: propriaEffettiva?.id ?? null,
    };
    startAdd(async () => {
      try {
        await addInterventoDaVoce(preventivoId, sel);
        setSelPrezzario(null);
        setSelPropria(null);
        setAggiunta("Voce aggiunta agli interventi.");
      } catch {
        setErrore("Non è stato possibile aggiungere la voce. Riprova.");
      }
    });
  }

  const nessunaSelezione = !selPrezzario && !propriaEffettiva;
  const anteprima = nessunaSelezione ? null : unitaDaVoci(selPrezzario, propriaEffettiva);
  const usata =
    propriaEffettiva ? "la tua voce" : selPrezzario ? "la voce del prezzario" : null;

  const nomePrezzario =
    risultati.prezzario[0]?.prezzario || `Prezzario ${etichettaRegione(regione)}`.trim();

  // Il prezzario c'è sempre: con 'propri' resta come ripiego.
  const colonnaPrezzario = (
    <Colonna
      key="prezzario"
      titolo={fontePrezzi === "propri" ? "Se manca nella tua libreria" : nomePrezzario}
      sottotitolo={fontePrezzi === "propri" ? nomePrezzario : null}
      stato={stato}
      vuoto={risultati.prezzario.length === 0}
    >
      {risultati.prezzario.map((v) => (
        <RigaRisultato
          key={v.id}
          selezionata={selPrezzario?.id === v.id}
          onClick={() => scegliPrezzario(v)}
          testa={
            <>
              <span className="font-mono text-xs text-graphite">{v.codice}</span>
              <span className="font-mono text-xs text-ink tabular-nums">
                {formatEuro(v.prezzo)}/{v.unita_testo}
              </span>
            </>
          }
          descrizione={v.descrizione}
        />
      ))}
    </Colonna>
  );

  const colonnaLibreria = mostraLibreria ? (
    <Colonna
      key="libreria"
      titolo="La tua libreria"
      sottotitolo={null}
      stato={stato}
      vuoto={risultati.proprie.length === 0}
    >
      {risultati.proprie.map((v) => (
        <RigaRisultato
          key={v.id}
          selezionata={selPropria?.id === v.id}
          onClick={() => scegliPropria(v)}
          testa={
            <>
              <span className="truncate text-sm font-medium text-ink">{v.titolo}</span>
              <span className="shrink-0 font-mono text-xs text-ink tabular-nums">
                {formatEuro(v.prezzo)} {unitaPropria(v.unita)}
              </span>
            </>
          }
          descrizione={v.descrizione}
        />
      ))}
    </Colonna>
  ) : null;

  const colonne =
    fontePrezzi === "propri" ? [colonnaLibreria, colonnaPrezzario] : [colonnaPrezzario, colonnaLibreria];

  return (
    <section aria-labelledby={`${inputId}-titolo`} className="border border-hairline bg-canvas p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={`${inputId}-titolo`} className="text-sm font-semibold text-ink">
          Cerca voce
        </h2>
        <p className="text-xs text-muted">
          {fontePrezzi === "prezzario"
            ? "Solo prezzario regionale"
            : fontePrezzi === "propri"
              ? "Prima la tua libreria, il prezzario come ripiego"
              : "Scegli una voce per colonna: la descrizione usata è la tua"}
        </p>
      </div>

      <label htmlFor={inputId} className="sr-only">
        Cerca una voce
      </label>
      <Input
        id={inputId}
        type="search"
        autoComplete="off"
        maxLength={200}
        placeholder="Es. intonaco, ponteggio, guaina…"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setErrore(null);
          setAggiunta(null);
        }}
        className="mt-2"
      />

      {testo.length > 0 && testo.length < MIN_CARATTERI ? (
        <p className="mt-2 text-xs text-muted">Scrivi almeno {MIN_CARATTERI} caratteri.</p>
      ) : null}

      {stato === "error" ? (
        <p role="alert" className="mt-3 border border-hairline-soft bg-surface-soft px-3 py-2 text-sm text-ink">
          Ricerca non riuscita. Riprova tra poco.
        </p>
      ) : null}

      {stato === "loading" || stato === "ok" ? (
        <div
          className={`mt-4 grid grid-cols-1 gap-6 ${colonne.filter(Boolean).length > 1 ? "md:grid-cols-2" : ""}`}
          aria-busy={stato === "loading"}
        >
          {colonne}
        </div>
      ) : null}

      {!nessunaSelezione || aggiunta || errore ? (
        <div className="mt-4 flex flex-col gap-3 border-t border-hairline pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 text-sm" aria-live="polite">
            {anteprima ? (
              <>
                <p className="text-graphite">
                  {selPrezzario && propriaEffettiva ? "Doppia descrizione" : "Una descrizione"} · verrà usata{" "}
                  <span className="font-medium text-ink">{usata}</span>
                </p>
                <ul className="mt-1 space-y-0.5 text-xs text-graphite">
                  {selPrezzario ? (
                    <li className="truncate">
                      Prezzario: <span className="font-mono">{selPrezzario.codice}</span> · {selPrezzario.descrizione}
                    </li>
                  ) : null}
                  {propriaEffettiva ? <li className="truncate">Tua voce: {propriaEffettiva.titolo}</li> : null}
                </ul>
                {anteprima.avviso ? <p className="mt-1 text-xs text-ink">{anteprima.avviso}</p> : null}
              </>
            ) : null}
            {aggiunta ? <p className="text-success">{aggiunta}</p> : null}
            {errore ? (
              <p role="alert" className="text-ink">
                <span className="font-semibold">Errore.</span> {errore}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 gap-2">
            {!nessunaSelezione ? (
              <Button
                type="button"
                variant="ghost"
                disabled={adding}
                onClick={() => {
                  setSelPrezzario(null);
                  setSelPropria(null);
                }}
              >
                Annulla
              </Button>
            ) : null}
            <Button
              type="button"
              disabled={nessunaSelezione || adding}
              onClick={aggiungi}
              className="active:scale-[0.98]"
            >
              {adding ? "Aggiunta…" : "Aggiungi voce"}
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Colonna({
  titolo,
  sottotitolo,
  stato,
  vuoto,
  children,
}: {
  titolo: string;
  sottotitolo: string | null;
  stato: Stato;
  vuoto: boolean;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-baseline justify-between gap-2 border-b border-hairline pb-2">
        <h3 className="eyebrow text-stone">{titolo}</h3>
        {sottotitolo ? <span className="truncate text-xs text-muted">{sottotitolo}</span> : null}
      </div>
      {stato === "loading" ? (
        <ul aria-hidden className="space-y-3">
          {[0, 1, 2].map((i) => (
            <li key={i} className="space-y-2 py-1">
              <div className="h-3 w-2/5 animate-pulse bg-surface-strong" />
              <div className="h-3 w-full animate-pulse bg-surface-soft" />
              <div className="h-3 w-4/5 animate-pulse bg-surface-soft" />
            </li>
          ))}
        </ul>
      ) : vuoto ? (
        <p className="py-6 text-sm text-muted">Nessuna voce trovata</p>
      ) : (
        <ul className="max-h-80 divide-y divide-hairline overflow-y-auto" onKeyDown={navigaConFrecce}>
          {children}
        </ul>
      )}
    </div>
  );
}

function RigaRisultato({
  selezionata,
  onClick,
  testa,
  descrizione,
}: {
  selezionata: boolean;
  onClick: () => void;
  testa: ReactNode;
  descrizione: string;
}) {
  return (
    <li>
      <button
        type="button"
        data-voce
        aria-pressed={selezionata}
        onClick={onClick}
        className={`block w-full border-l-2 px-3 py-2.5 text-left transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink ${
          selezionata ? "border-ink bg-surface-strong" : "border-transparent hover:bg-surface-soft"
        }`}
      >
        <span className="flex items-baseline justify-between gap-3">{testa}</span>
        <span className="mt-1 line-clamp-2 block text-sm leading-snug text-graphite">{descrizione}</span>
      </button>
    </li>
  );
}
