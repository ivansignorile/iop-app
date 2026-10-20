import Link from "next/link";
import type { ReactNode } from "react";

import { ButtonLink } from "@/components/ui/button";

// Struttura dalla bozza di Luigi (docs/clienti/2026-10-20-home-bozza.jpg),
// testi da docs/clienti/2026-10-20-Copy.txt.

const PUBBLICO = [
  {
    eyebrow: "Per il privato",
    titolo: "Trasparenza totale e controllo dei costi",
    intro: "Vuoi ristrutturare o fare dei lavori ma hai paura di ricevere cifre “fuori mercato”?",
    punti: [
      ["Piena consapevolezza", "Ottieni una stima concreta dei costi reali prima ancora di contattare un'impresa."],
      ["Confronto e risparmio", "Valuta i preventivi delle ditte con dati ufficiali alla mano ed evita spese spropositate o brutte sorprese."],
      ["Semplice e immediato", "Genera una stima chiara in autonomia o fatti guidare dai nostri tecnici."],
    ],
  },
  {
    eyebrow: "Per il tecnico",
    titolo: "Meno frustrazione, più tempo libero",
    intro: "Architetti, ingegneri, geometri: basta passare ore dietro alla scrivania ad impaginare computi metrici e ridisegnare preventivi.",
    punti: [
      ["Automazione intelligente", "Carica i tuoi dati/computi e ottieni un documento PDF/Word già impaginato, con logo, carta intestata e pronto all'uso."],
      ["Zero errori di formattazione", "Nessuna perdita di tempo su file spaginati o conversioni lente."],
      ["Format flessibile", "Scegli se stampare in PDF protetto o scaricare in Word completamente editabile per personalizzazioni avanzate."],
    ],
  },
  {
    eyebrow: "Per l'impresa edile",
    titolo: "Velocità di chiusura e prezzari sempre aggiornati",
    intro: "Rispondi alle richieste dei clienti alla velocità della luce e fai vincere la tua professionalità.",
    punti: [
      ["Affidabilità garantita", "Riferimento costante ai prezzari regionali ufficiali e aggiornati."],
      ["Workflow semplificato", "Trasforma le richieste dei clienti in preventivi pronti all'invio in pochi minuti."],
      ["Doppia modalità", "Usa il Self Istantaneo per le stime rapide o l'Elaborazione del Tecnico in 24h per i cantieri più complessi."],
    ],
  },
] as const;

function Icona({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-6 shrink-0 text-ink"
      aria-hidden
    >
      {children}
    </svg>
  );
}

const FORZA = [
  {
    id: "prezzari",
    testo: "Prezzari regionali sempre aggiornati",
    icona: (
      <Icona>
        <path d="M12 21s-7-5.5-7-11a7 7 0 1 1 14 0c0 5.5-7 11-7 11Z" />
        <circle cx="12" cy="10" r="2.5" />
      </Icona>
    ),
  },
  {
    id: undefined,
    testo: "Export editabile (Word / PDF / Excel)",
    icona: (
      <Icona>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
        <path d="M14 3v5h5M9 13h6M9 17h4" />
      </Icona>
    ),
  },
  {
    id: undefined,
    testo: "Modalità self o con validazione tecnica",
    icona: (
      <Icona>
        <path d="M12 3 5 6v5c0 4.5 3 8.5 7 10 4-1.5 7-5.5 7-10V6Z" />
        <path d="m9 12 2 2 4-4" />
      </Icona>
    ),
  },
  {
    id: undefined,
    testo: "Gestione anagrafiche e loghi aziendali",
    icona: (
      <Icona>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="9" cy="11" r="2" />
        <path d="M6 16c.5-1.5 1.7-2.5 3-2.5s2.5 1 3 2.5M15 10h3M15 13h3" />
      </Icona>
    ),
  },
];

const PASSI = [
  "Seleziona lavorazioni e quantità",
  "Scelta regione e prezzario",
  "Scarica il preventivo professionale",
];

const SELF = [
  { titolo: "Componi", href: "/preventivi/nuovo?modalita=manuale" },
  { titolo: "Da foto", href: "/preventivi/nuovo?modalita=foto" },
  { titolo: "Da capitolato", href: "/preventivi/nuovo?modalita=capitolato" },
];

export default function Home() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="flex h-16 items-center justify-between gap-4 px-6 md:px-12">
        <span className="text-xl font-medium tracking-tight text-ink">iop</span>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link href="#funzionalita" className="hidden px-3 text-sm text-graphite hover:text-ink sm:block">
            Funzionalità
          </Link>
          <Link href="#prezzari" className="hidden px-3 text-sm text-graphite hover:text-ink sm:block">
            Prezzari
          </Link>
          <ButtonLink href="/login" variant="secondary">
            Accedi / Registrati
          </ButtonLink>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-[1280px] px-6 md:px-12">
        {/* Hero */}
        <section className="py-[var(--spacing-section)]">
          <p className="eyebrow mb-4 text-stone">Io Preventivo</p>
          <h1 className="display-xl max-w-4xl text-ink md:text-[64px] md:leading-[0.98]">
            IOP. Il preventivo facile, trasparente e veloce.
          </h1>
          <p className="mt-6 max-w-2xl text-xl leading-snug text-graphite">
            Ottieni preventivi edili professionali basati su prezzari regionali ufficiali.{" "}
            <strong className="font-semibold text-ink">Semplice per i privati, potente per i professionisti.</strong>
          </p>
          <div className="mt-10">
            <ButtonLink href="#modalita" className="h-12 px-8 text-base active:scale-[0.98]">
              Genera il tuo preventivo ora
            </ButtonLink>
          </div>
        </section>

        {/* Per chi */}
        <section className="pb-[var(--spacing-section)]">
          <div className="grid gap-px overflow-hidden border border-hairline bg-hairline lg:grid-cols-3">
            {PUBBLICO.map((p) => (
              <article key={p.eyebrow} className="flex flex-col bg-canvas p-8 md:p-10">
                <p className="eyebrow mb-4 text-stone">{p.eyebrow}</p>
                <h2 className="display-md mb-4 text-ink">{p.titolo}</h2>
                <p className="mb-6 text-base leading-relaxed text-graphite">{p.intro}</p>
                <ul className="mt-auto flex flex-col gap-4 border-t border-hairline pt-6">
                  {p.punti.map(([titolo, testo]) => (
                    <li key={titolo} className="text-sm leading-relaxed text-graphite">
                      <span className="font-semibold text-ink">{titolo}.</span> {testo}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        {/* Punti di forza */}
        <section id="funzionalita" className="scroll-mt-8 pb-[var(--spacing-section)]">
          <ul className="grid gap-x-8 gap-y-6 border-y border-hairline py-8 sm:grid-cols-2 lg:grid-cols-4">
            {FORZA.map((f) => (
              <li key={f.testo} id={f.id} className="flex scroll-mt-8 items-center gap-4">
                {f.icona}
                <span className="text-sm font-medium text-ink">{f.testo}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Come funziona */}
        <section className="pb-[var(--spacing-section)]">
          <p className="eyebrow mb-4 text-stone">Come funziona</p>
          <ol className="grid gap-8 md:grid-cols-3">
            {PASSI.map((passo, i) => (
              <li key={passo} className="flex items-baseline gap-4 border-t border-ink pt-5">
                <span className="display-md tabular-nums text-stone">{i + 1}.</span>
                <span className="text-lg text-ink">{passo}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Modalità */}
        <section id="modalita" className="scroll-mt-8 pb-[var(--spacing-section)]">
          <p className="eyebrow mb-4 text-stone">Scegli la tua modalità</p>
          <div className="grid gap-px overflow-hidden border border-hairline bg-hairline md:grid-cols-2">
            <article className="flex flex-col bg-canvas p-8 md:p-12">
              <p className="eyebrow mb-4 text-stone">Self istantaneo</p>
              <h2 className="display-md mb-4 text-ink">Lo fai tu, subito.</h2>
              <p className="flex-1 text-base leading-relaxed text-graphite">
                Carica le specifiche, seleziona i dettagli e scarica subito il tuo documento PDF/Word pre-impostato.
              </p>
              <div className="mt-8 flex flex-wrap gap-2">
                {SELF.map((s) => (
                  <ButtonLink key={s.titolo} href={s.href} variant="secondary">
                    {s.titolo}
                  </ButtonLink>
                ))}
              </div>
            </article>
            <article className="flex flex-col bg-scrim p-8 text-on-primary md:p-12">
              <p className="eyebrow mb-4 opacity-60">Elaborato dal tecnico · 24 ore</p>
              <h2 className="display-md mb-4">Ci pensiamo noi.</h2>
              <p className="flex-1 text-base leading-relaxed opacity-80">
                Vuoi una revisione professionale? Un nostro tecnico verificherà e affinerà il preventivo inviandotelo
                pronto entro 24 ore.
              </p>
              <div className="mt-8 flex flex-col items-start gap-3">
                <ButtonLink href="/invia" variant="secondary" className="h-12 px-10 text-base active:scale-[0.98]">
                  Invia file
                </ButtonLink>
                <p className="text-sm opacity-60">Nessuna registrazione.</p>
              </div>
            </article>
          </div>
        </section>
      </main>

      <footer className="bg-footer px-6 py-12 text-sm text-on-primary md:px-12">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <p>
            <span className="lowercase">iop</span> — La Nuova Era della Preventivazione Edile
          </p>
          <nav className="flex gap-6">
            <Link href="/termini" className="opacity-80 hover:opacity-100">
              Termini di Servizio
            </Link>
            <Link href="/privacy" className="opacity-80 hover:opacity-100">
              Privacy Policy
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
