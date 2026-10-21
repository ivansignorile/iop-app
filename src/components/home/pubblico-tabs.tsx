"use client";

import {
  Books,
  CaretDown,
  CaretUp,
  FileText,
  Gear,
  MagnifyingGlass,
  PlayCircle,
  UsersThree,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";

// Testi da docs/clienti/2026-10-20-Copy.txt (sezioni per pubblico).
const PUBBLICO = [
  {
    titolo: "Privati",
    testo:
      "Ottieni una stima concreta dei costi reali prima ancora di contattare un'impresa, e valuta i preventivi delle ditte con dati ufficiali alla mano.",
    vista: "Confronto preventivi",
    sottotitolo: "Stima IOP e offerte ricevute",
    colonne: [
      { titolo: "Stima IOP", carte: [["Bagno completo", "€ 1.591"], ["Tinteggiatura", "€ 640"]] },
      { titolo: "Ditta A", carte: [["Bagno completo", "€ 2.380"], ["Tinteggiatura", "€ 910"]] },
      { titolo: "Ditta B", carte: [["Bagno completo", "€ 1.720"]] },
    ],
  },
  {
    titolo: "Tecnici",
    testo:
      "Architetti, ingegneri, geometri: carica computi e dati e ottieni un documento già impaginato, con logo e carta intestata, in PDF protetto o Word.",
    vista: "Computi metrici",
    sottotitolo: "Pronti da impaginare",
    colonne: [
      { titolo: "Caricati", carte: [["Computo villa", "xlsx"], ["Capitolato scuola", "pdf"]] },
      { titolo: "In revisione", carte: [["Rifacimento facciata", "Word"]] },
      { titolo: "Consegnati", carte: [["Bagno via Roma", "PDF"], ["Cucina", "Carta int."]] },
    ],
  },
  {
    titolo: "Imprese edili",
    testo:
      "Rispondi alle richieste dei clienti in pochi minuti, con il riferimento costante ai prezzari regionali ufficiali e aggiornati.",
    vista: "Richieste clienti",
    sottotitolo: "Dal sopralluogo all'invio",
    colonne: [
      { titolo: "Nuove", carte: [["Sopralluogo bagno", "oggi"], ["Cappotto termico", "ieri"]] },
      { titolo: "In lavorazione", carte: [["Rifacimento tetto", "Self"]] },
      { titolo: "Inviati", carte: [["Cucina e bagno", "€ 8.410"], ["Infissi", "€ 3.120"]] },
    ],
  },
] as const;

const MENU_APP = [
  { icona: FileText, testo: "Preventivi" },
  { icona: UsersThree, testo: "Clienti" },
  { icona: Books, testo: "Libreria" },
  { icona: Gear, testo: "Impostazioni" },
];

export function PubblicoTabs() {
  const [attiva, setAttiva] = useState(0);
  const p = PUBBLICO[attiva];
  const vai = (delta: number) => setAttiva((i) => (i + delta + PUBBLICO.length) % PUBBLICO.length);

  return (
    <div className="overflow-hidden rounded-md bg-home-panel md:mr-[calc(50%-50vw)] md:rounded-r-none">
      <div className="grid md:grid-cols-[260px_1fr]">
        <div className="flex flex-col gap-7 px-6 py-8 md:px-8 md:py-10" role="tablist" aria-label="Per chi è IOP">
          {PUBBLICO.map((x, i) => {
            const on = i === attiva;
            return (
              <button
                key={x.titolo}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setAttiva(i)}
                className={`text-left transition-opacity duration-300 ${on ? "opacity-100" : "opacity-35 hover:opacity-60"}`}
              >
                <span className="flex items-center gap-2 text-[17px] font-medium text-home-ink">
                  {x.titolo}
                  {on ? <PlayCircle size={20} weight="regular" /> : null}
                </span>
                <span className="mt-1.5 block text-[14px] leading-relaxed text-home-text">{x.testo}</span>
              </button>
            );
          })}
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Precedente"
              onClick={() => vai(-1)}
              className="grid size-[18px] place-items-center rounded-full border border-home-line bg-white text-home-muted shadow-[0_2px_6px_rgba(38,43,56,0.12)] hover:text-home-ink"
            >
              <CaretUp size={11} weight="bold" />
            </button>
            <button
              type="button"
              aria-label="Successiva"
              onClick={() => vai(1)}
              className="grid size-[18px] place-items-center rounded-full border border-home-line bg-white text-home-muted shadow-[0_2px_6px_rgba(38,43,56,0.12)] hover:text-home-ink"
            >
              <CaretDown size={11} weight="bold" />
            </button>
          </div>
        </div>

        <div className="min-w-0 px-6 pb-8 md:py-10 md:pl-4 md:pr-0" role="tabpanel" aria-label={p.titolo}>
          <div className="relative overflow-hidden rounded-l-md rounded-r-md border border-home-line bg-[#eceef1] md:rounded-r-none">
            <div className="grid min-h-[340px] grid-cols-[150px_1fr] text-[11px] sm:grid-cols-[170px_1fr] md:min-h-[400px]">
              <aside className="hidden flex-col gap-0.5 border-r border-home-line bg-[#f3f4f6] p-2.5 sm:flex">
                <p className="mb-2 flex items-center gap-2 px-1.5 font-semibold text-home-ink">
                  <span className="grid size-4 place-items-center rounded-[3px] bg-home-ink font-home-display text-[9px] text-white">
                    i
                  </span>
                  Il mio studio
                </p>
                <p className="flex items-center gap-2 px-1.5 py-1 text-home-muted">
                  <MagnifyingGlass size={12} /> Cerca
                </p>
                {MENU_APP.map(({ icona: Icona, testo }, i) => (
                  <p
                    key={testo}
                    className={`flex items-center gap-2 rounded-[3px] px-1.5 py-1 ${
                      i === 0 ? "bg-[#e3d4dc] text-home-ink" : "text-home-text"
                    }`}
                  >
                    <Icona size={12} /> {testo}
                  </p>
                ))}
              </aside>

              <div key={attiva} className="col-span-2 min-w-0 animate-[comparsa_0.5s_cubic-bezier(0.16,1,0.3,1)] p-4 sm:col-span-1">
                <p className="text-[16px] font-semibold text-home-ink">{p.vista}</p>
                <p className="mb-4 text-home-muted">{p.sottotitolo}</p>
                <div className="grid min-w-[420px] grid-cols-3 gap-2">
                  {p.colonne.map((c) => (
                    <div key={c.titolo}>
                      <p className="mb-2 flex items-center justify-between border-b-2 border-[#e2a4a4] pb-1 font-medium text-home-ink">
                        {c.titolo}
                        <span className="text-home-muted">···</span>
                      </p>
                      <div className="flex flex-col gap-2">
                        {c.carte.map(([t, v]) => (
                          <div key={t} className="rounded-[4px] bg-white p-2 shadow-[0_1px_2px_rgba(38,43,56,0.08)]">
                            <span className="mb-1 inline-block rounded-[2px] bg-[#5aa454] px-1 text-[8px] font-semibold uppercase tracking-wide text-white">
                              Preventivo
                            </span>
                            <p className="font-medium text-home-ink">{t}</p>
                            <p className="text-home-muted">{v}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Link
              href="/signup"
              className="absolute left-1/2 top-[62%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-home-mint-btn bg-white px-5 py-2.5 text-[13px] font-medium text-home-mint shadow-[0_8px_24px_-8px_rgba(16,206,171,0.45)] transition-transform hover:scale-[1.03] active:scale-[0.98]"
            >
              Provalo dal vivo
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
