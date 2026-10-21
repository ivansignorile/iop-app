import {
  ArrowRight,
  Buildings,
  CheckCircle,
  Compass,
  DownloadSimple,
  FileDoc,
  FilePdf,
  FileXls,
  HardHat,
  Lightbulb,
  ListChecks,
  MapPin,
  Stack,
  Stamp,
  ThumbsUp,
  UploadSimple,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Carosello, Evidenzia, type Slide } from "@/components/home/carosello";
import { homeFonts } from "@/components/home/fonts";
import { MockPreventivo } from "@/components/home/mock-preventivo";
import { HomeNav } from "@/components/home/nav";
import { ParallaxIcone } from "@/components/home/parallax-icone";
import { PubblicoTabs } from "@/components/home/pubblico-tabs";
import { AnteprimaDocumento, SchemaSelf, SchemaTecnico } from "@/components/home/visuals";

// Struttura e stile ricalcati sulla home fibery.io (Refero 31499fee-8bea-4726-a27c-08ca0e674bc5),
// testi da docs/clienti/2026-10-20-Copy.txt e -landing-e-flusso.txt.

const FORMATI: { icona: Icon; testo: string }[] = [
  { icona: FilePdf, testo: "PDF protetto" },
  { icona: FileDoc, testo: "Word editabile" },
  { icona: Stamp, testo: "Carta intestata" },
  { icona: FileXls, testo: "Computo Excel" },
  { icona: MapPin, testo: "Prezzari regionali" },
  { icona: HardHat, testo: "Verifica tecnica" },
];

const SLIDE_MODALITA: Slide[] = [
  {
    id: "self",
    testo: (
      <p>
        Con il <Evidenzia>Self istantaneo</Evidenzia> componi il preventivo da solo: parti da zero, dalle{" "}
        <Evidenzia forte>foto del cantiere</Evidenzia> o da un <Evidenzia>capitolato</Evidenzia>.
      </p>
    ),
    visual: <SchemaSelf />,
  },
  {
    id: "tecnico",
    testo: (
      <p>
        Preferisci delegare? Con <Evidenzia>Elaborato dal tecnico</Evidenzia> invii i file e ricevi il preventivo{" "}
        <Evidenzia forte>entro 24 ore</Evidenzia>, <Evidenzia>senza registrarti</Evidenzia>.
      </p>
    ),
    visual: <SchemaTecnico />,
  },
];

const SLIDE_FORMATI: Slide[] = [
  {
    id: "pdf",
    testo: (
      <p>
        Per il cliente finale IOP genera un <Evidenzia forte>PDF protetto</Evidenzia> — nello{" "}
        <Evidenzia>stesso stile</Evidenzia> per ogni preventivo che invii.
      </p>
    ),
    visual: <AnteprimaDocumento formato="pdf" />,
  },
  {
    id: "word",
    testo: (
      <p>
        Devi ritoccare qualcosa? Scarica il <Evidenzia forte>Word editabile</Evidenzia> e personalizza{" "}
        <Evidenzia>ogni voce</Evidenzia> prima di firmare.
      </p>
    ),
    visual: <AnteprimaDocumento formato="word" />,
  },
  {
    id: "carta",
    testo: (
      <p>
        Carica il tuo <Evidenzia>logo</Evidenzia> e il preventivo esce sulla{" "}
        <Evidenzia forte>tua carta intestata</Evidenzia>, pronto da inviare.
      </p>
    ),
    visual: <AnteprimaDocumento formato="carta" />,
  },
];

const PASSI = [
  {
    n: "1",
    colore: "text-[#5b4bdb]",
    icona: UploadSimple,
    titolo: "Registrati o invia i file",
    testo: "Crea un account per il Self, oppure manda computo e foto al tecnico senza registrarti.",
  },
  {
    n: "2",
    colore: "text-[#e2723b]",
    icona: Compass,
    titolo: "Scegli regione e prezzario",
    testo: "Il preventivo usa il prezzario ufficiale della regione del cantiere.",
  },
  {
    n: "3",
    colore: "text-[#f1b52c]",
    icona: ListChecks,
    titolo: "Lavorazioni e quantità",
    testo: "Seleziona le voci e inserisci le misure: gli importi si calcolano da soli.",
  },
  {
    n: "4",
    colore: "text-home-mint",
    icona: DownloadSimple,
    titolo: "Scarica il preventivo professionale",
    testo: "PDF protetto, Word o carta intestata. Poi goditi la faccia del cliente.",
  },
];

export default function Home() {
  return (
    <div className={`${homeFonts} relative min-h-full overflow-x-clip bg-white font-home-body text-home-ink`}>
      <ParallaxIcone />

      {/* Sfondo hero: grigio chiaro con fondo ad arco (radius 100% sugli angoli inferiori) */}
      <div className="rounded-b-[100%] bg-home-grey">
        <HomeNav />

        <section className="relative z-[2] mx-auto max-w-[1100px] px-5 pb-48 pt-14 md:px-6 md:pb-56 md:pt-24">
          <div className="relative">
            <h1 className="font-home-display text-[44px] font-normal leading-[1.02] tracking-[-0.035em] sm:text-[60px] md:text-[84px]">
              Il preventivo edile
              <br />
              facile e trasparente
            </h1>
            <p className="mt-7 max-w-[600px] text-[21px] leading-[1.55] text-home-ink md:text-[28px]">
              Se sei stanco di computi rifatti a mano e di cifre &ldquo;fuori mercato&rdquo; — e vuoi un preventivo
              serio in pochi minuti
            </p>

            <form action="/signup" method="get" className="mt-10 flex max-w-[520px] flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
              <label className="flex-1">
                <span className="sr-only">La tua email</span>
                <input
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  placeholder="Inserisci la tua email"
                  className="h-11 w-full border-0 border-b-[1.5px] border-home-ink bg-transparent px-2 text-[16px] text-home-ink outline-none placeholder:text-home-muted focus:border-home-mint"
                />
              </label>
              <button
                type="submit"
                className="h-11 rounded-[3px] bg-home-mint-btn px-5 text-[16px] font-medium text-white transition-colors hover:bg-home-mint active:scale-[0.98]"
              >
                Inizia gratis
              </button>
            </form>
            <Link
              href="/invia"
              className="mt-3 inline-block font-home-hand text-[17px] font-medium uppercase tracking-[0.04em] text-home-muted hover:text-home-mint"
            >
              Oppure invia i file al tecnico, senza registrarti
            </Link>

            <Cartello />
          </div>
        </section>
      </div>

      <main className="relative z-[2]">
        {/* Riga loghi del riferimento → formati e garanzie del servizio */}
        <section className="mx-auto max-w-[1100px] px-5 pt-16 md:px-6 md:pt-20">
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <p className="text-[17px] text-home-muted">Il tuo preventivo, nel formato che ti serve</p>
              <Link
                href="#come-funziona"
                className="font-home-hand text-[17px] font-bold uppercase tracking-[0.04em] text-home-mint hover:underline"
              >
                Guarda come funziona →
              </Link>
            </div>
            <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-3 lg:grid-cols-6">
              {FORMATI.map(({ icona: Icona, testo }) => (
                <li key={testo} className="flex items-center gap-2 text-home-ink">
                  <Icona size={26} weight="duotone" className="shrink-0" />
                  <span className="font-home-display text-[17px] font-medium leading-tight tracking-[-0.02em]">{testo}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Sezione 1 */}
        <Sezione
          id="prezzari"
          titolo={
            <>
              Prezzario e preventivo
              <br />
              sotto lo stesso tetto
            </>
          }
          icona={Buildings}
          testi={[
            <>Un file per il computo, un altro per impaginare e un terzo per il prezzario regionale. Il risultato? Ore perse e numeri da ricontrollare.</>,
            <>
              Collega le <strong>voci del prezzario</strong> alle <strong>quantità del tuo cantiere</strong> e ottieni un{" "}
              <strong>documento pronto</strong> da inviare.
            </>,
          ]}
        >
          <div className="mx-auto mt-14 max-w-[1100px] px-5 md:px-6">
            <div className="rounded-md bg-home-panel px-3 pt-3 sm:px-8 sm:pt-8">
              <MockPreventivo />
              <div className="h-8 sm:h-8" />
            </div>
          </div>
        </Sezione>

        <Avvertenza tono="bg-home-rose" reazioni={["Giusto", "Chiaro"]}>
          Le stime sono indicative: non sostituiscono il sopralluogo né il computo firmato da un professionista
          abilitato.
        </Avvertenza>

        <InPratica
          sfondo="bg-[#eef0f3]"
          etichetta="Elaborato dal tecnico · bagno di 6 mq"
          cta={{ testo: "Invia la tua richiesta", href: "/invia" }}
        >
          Carichi le foto del bagno e il computo in Excel. Il giorno dopo ricevi il preventivo sulla carta intestata,
          con le voci del prezzario regionale.
        </InPratica>

        {/* Sezione 2 */}
        <Sezione
          id="modalita"
          titolo={
            <>
              Due modalità,
              <br />
              scegli il tuo ritmo
            </>
          }
          icona={Stack}
          testi={[<>Non tutti i lavori sono uguali: a volte serve una stima subito, a volte una revisione professionale.</>]}
        >
          <div className="mx-auto mt-14 max-w-[1100px] px-5 md:px-6">
            <Carosello slides={SLIDE_MODALITA} etichetta="Le due modalità di IOP" />
          </div>
        </Sezione>

        <Avvertenza tono="bg-home-lilac" reazioni={["Ci sta", "Ok"]}>
          Ti diamo prezzario, voci, quantità ed export. Le misure del cantiere però le conosci tu: prendile bene.
        </Avvertenza>

        <InPratica
          sfondo="bg-home-panel"
          etichetta="Self istantaneo · da capitolato"
          cta={{ testo: "Prova il Self", href: "/signup" }}
        >
          Il computo ce l&apos;hai già, ti manca il tempo di impaginarlo. Lo carichi e lo riscarichi in Word, con il tuo
          logo, pronto da firmare.
        </InPratica>

        {/* Sezione 3 */}
        <Sezione
          id="formati"
          titolo={
            <>
              Il documento giusto
              <br />
              per ogni cliente
            </>
          }
          icona={Lightbulb}
          testi={[<>Ogni cliente vuole il suo formato. Rifare lo stesso preventivo tre volte non deve essere un lavoro.</>]}
        >
          <div className="mx-auto mt-14 max-w-[1100px] px-5 md:px-6">
            <Carosello slides={SLIDE_FORMATI} etichetta="I formati del preventivo" />
          </div>
        </Sezione>

        <Avvertenza tono="bg-home-sage" reazioni={["Giusto", "Chiaro"]}>
          Non facciamo magie: se i file sono incompleti o le foto illeggibili, il tecnico ti ricontatta prima di
          preparare il preventivo.
        </Avvertenza>

        <InPratica
          sfondo="bg-[#eef0f3]"
          etichetta="Impresa edile · dopo il sopralluogo"
          cta={{ testo: "Inizia gratis", href: "/signup" }}
        >
          Il cliente chiede un prezzo al sopralluogo. Glielo mandi la sera stessa, con le voci ufficiali: non si discute
          più sul perché.
        </InPratica>

        {/* Per chi */}
        <section id="per-chi" className="scroll-mt-6 pt-28 md:pt-36">
          <div className="mx-auto max-w-[1100px] px-5 md:px-6">
            <h2 className="px-0 font-home-display text-[38px] leading-[1.05] tracking-[-0.035em] md:px-12 md:text-[60px]">
              Come ti aiuta IOP…
            </h2>
            <div className="mt-12">
              <PubblicoTabs />
            </div>
          </div>
        </section>

        {/* Come funziona */}
        <section id="come-funziona" className="scroll-mt-6 pt-28 md:pt-40">
          <div className="mx-auto max-w-[1100px] px-5 md:px-6">
            <h2 className="font-home-display text-[38px] leading-[1.05] tracking-[-0.035em] md:px-12 md:text-[60px]">
              Come funziona
            </h2>
            <ol className="mt-14 grid gap-12 sm:grid-cols-2 md:px-12 lg:grid-cols-4 lg:gap-8">
              {PASSI.map((p) => (
                <li key={p.n}>
                  <div className="relative h-[92px] w-[96px]">
                    <span
                      className={`absolute -left-1 -top-4 font-home-display text-[112px] font-medium leading-none tracking-[-0.06em] ${p.colore}`}
                      aria-hidden
                    >
                      {p.n}
                    </span>
                    <span className="absolute bottom-0 right-0 grid size-16 place-items-center rounded-full bg-home-ink text-white shadow-[0_10px_24px_-10px_rgba(38,43,56,0.6)]">
                      <p.icona size={28} weight="regular" />
                    </span>
                  </div>
                  <h3 className="mt-6 text-[19px] font-semibold leading-tight">{p.titolo}</h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-home-text">{p.testo}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* CTA finale */}
        <section className="relative mx-auto mt-32 max-w-[1100px] px-5 pb-36 pt-12 md:mt-44 md:px-6">
          <svg
            viewBox="0 0 520 300"
            aria-hidden
            className="pointer-events-none absolute left-[18%] top-0 hidden w-[520px] md:block"
          >
            <defs>
              <linearGradient id="sfuma" x1="0" x2="1">
                <stop offset="0.55" stopColor="#a3e9d8" stopOpacity="0.75" />
                <stop offset="1" stopColor="#a3e9d8" stopOpacity="0.12" />
              </linearGradient>
            </defs>
            <path
              d="M40 20 L250 250 L330 20 M330 20 L470 230"
              fill="none"
              stroke="url(#sfuma)"
              strokeWidth="64"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="relative md:px-12">
            <div className="flex flex-wrap items-start gap-x-4">
              <h2 className="font-home-display text-[44px] leading-none tracking-[-0.035em] md:text-[60px]">
                Inizia gratis
              </h2>
              <span className="mt-2 font-home-hand text-[16px] font-bold uppercase tracking-[0.04em] text-home-mint">
                * oppure invia i file al tecnico
              </span>
            </div>
            <p className="mt-6 text-[17px] text-home-text">Crea il tuo primo preventivo sul prezzario della tua regione</p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="flex h-12 items-center rounded-[3px] bg-home-ink px-6 text-[16px] font-medium text-white transition-colors hover:bg-[#1a1e28] active:scale-[0.98]"
              >
                Registrati
              </Link>
              <Link
                href="/invia"
                className="flex h-12 items-center rounded-[3px] border-[1.5px] border-home-ink bg-white/70 px-6 text-[16px] font-medium transition-colors hover:bg-home-ink hover:text-white active:scale-[0.98]"
              >
                Invia al tecnico
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function Sezione({
  id,
  titolo,
  icona: Icona,
  testi,
  children,
}: {
  id: string;
  titolo: ReactNode;
  icona: Icon;
  testi: ReactNode[];
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6 pt-24 md:pt-36">
      <div className="mx-auto max-w-[1100px] px-5 md:px-6">
        <div className="relative md:px-12">
          <h2 className="max-w-[760px] pr-20 font-home-display text-[38px] leading-[1.05] tracking-[-0.035em] md:pr-0 md:text-[60px]">
            {titolo}
          </h2>
          <span className="absolute right-0 top-0 md:right-12" aria-hidden>
            <span className="absolute -right-2 -top-1 size-[68px] rounded-full bg-home-mint-soft md:size-[90px]" />
            <span className="relative grid size-[60px] place-items-center text-home-ink md:size-[80px]">
              <Icona size={44} weight="duotone" className="md:hidden" />
              <Icona size={58} weight="duotone" className="hidden md:block" />
            </span>
          </span>
          <div className="mt-6 flex max-w-[520px] flex-col gap-4 text-[17px] leading-[1.6] text-home-ink [&_strong]:font-semibold">
            {testi.map((t, i) => (
              <p key={i}>{t}</p>
            ))}
          </div>
        </div>
      </div>
      {children}
    </section>
  );
}

function Avvertenza({ tono, reazioni, children }: { tono: string; reazioni: [string, string]; children: ReactNode }) {
  return (
    <section className="mx-auto max-w-[1100px] px-5 pt-24 md:px-6 md:pt-32">
      <h3 className="text-[22px] font-semibold md:px-12 md:text-[26px]">Avvertenza onesta:</h3>
      <div className="relative mt-10 md:mr-[100px]">
        <div className={`rounded-2xl ${tono} px-7 py-8 md:px-12 md:py-10`}>
          <p className="max-w-[640px] text-[21px] leading-[1.45] md:text-[27px]">{children}</p>
          <div className="mt-6 flex gap-3">
            <Reazione icona={ThumbsUp} testo={reazioni[0]} />
            <Reazione icona={CheckCircle} testo={reazioni[1]} />
          </div>
        </div>
        <span
          className="absolute -right-[84px] bottom-0 hidden size-14 place-items-center rounded-full bg-home-mint-soft text-home-ink md:grid"
          aria-hidden
        >
          <HardHat size={30} weight="duotone" />
        </span>
      </div>
    </section>
  );
}

function Reazione({ icona: Icona, testo }: { icona: Icon; testo: string }) {
  return (
    <span className="flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-[14px] text-home-ink shadow-[0_6px_16px_-8px_rgba(38,43,56,0.25)]">
      <Icona size={16} weight="duotone" className="text-[#d39a2b]" />
      {testo}
    </span>
  );
}

function InPratica({
  sfondo,
  etichetta,
  cta,
  children,
}: {
  sfondo: string;
  etichetta: string;
  cta: { testo: string; href: string };
  children: ReactNode;
}) {
  return (
    <section className="mx-auto max-w-[1100px] px-5 pt-24 md:px-6 md:pt-32">
      <h3 className="text-[22px] font-semibold md:px-12 md:text-[26px]">Come va, in pratica:</h3>
      <div className="relative mt-10 md:mt-14">
        <div className={`absolute inset-y-[-28px] left-[25%] right-0 hidden rounded-xl ${sfondo} md:block`} aria-hidden />
        <div className={`relative rounded-xl ${sfondo} p-7 md:bg-transparent md:p-0 md:px-12 md:pb-2`}>
          <p className="max-w-[860px] text-[21px] leading-[1.5] tracking-[0.005em] md:text-[27px]">
            &ldquo;{children}&rdquo;
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-full bg-home-ink text-white">
                <HardHat size={22} weight="duotone" />
              </span>
              <div className="leading-tight">
                <p className="text-[14px] font-medium">Esempio d&apos;uso</p>
                <p className="text-[13px] text-home-muted">{etichetta}</p>
              </div>
            </div>
            <Link
              href={cta.href}
              className="flex h-10 items-center gap-2 rounded-[3px] bg-home-ink px-4 text-[14px] font-medium text-white transition-colors hover:bg-[#1a1e28] active:scale-[0.98] md:mr-8"
            >
              {cta.testo}
              <ArrowRight size={14} weight="bold" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// Cartello a mano del riferimento (personaggio con il cartello "No code required").
function Cartello() {
  return (
    <div className="absolute right-4 top-[52%] hidden flex-col items-center lg:flex" aria-hidden>
      <span className="rotate-[8deg] rounded-[3px] border-[1.5px] border-home-ink bg-white px-2.5 py-1.5 text-center font-home-hand text-[14px] font-bold uppercase leading-[1.05] text-home-ink shadow-[2px_2px_0_#262b38]">
        Niente
        <br />
        Excel!
      </span>
      <span className="h-6 w-[1.5px] rotate-[8deg] bg-home-ink" />
      <span className="grid size-16 place-items-center rounded-full bg-home-mint-soft text-home-ink">
        <HardHat size={36} weight="duotone" />
      </span>
    </div>
  );
}

const FOOTER = [
  {
    titolo: "Modalità",
    voci: [
      ["Self istantaneo", "#modalita"],
      ["Elaborato dal tecnico", "/invia"],
    ],
  },
  {
    titolo: "Per chi",
    voci: [
      ["Privati", "#per-chi"],
      ["Tecnici", "#per-chi"],
      ["Imprese edili", "#per-chi"],
    ],
  },
  {
    titolo: "Prodotto",
    voci: [
      ["Come funziona", "#come-funziona"],
      ["Formati", "#formati"],
      ["Prezzari", "#prezzari"],
    ],
  },
  {
    titolo: "Account",
    voci: [
      ["Accedi", "/login"],
      ["Registrati", "/signup"],
    ],
  },
] as const;

function Footer() {
  return (
    <footer className="relative z-[2] overflow-hidden bg-[#0a7d68] text-white">
      <div className="mx-auto max-w-[1280px] px-5 pt-20 md:px-10 md:pt-24">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          <div>
            <p className="font-home-display text-[30px] font-semibold leading-none tracking-[-0.03em]">iop</p>
            <p className="mt-5 max-w-[240px] text-[16px] font-semibold leading-snug">
              Preventivi edili sui prezzari regionali ufficiali
            </p>
          </div>
          {FOOTER.map((c) => (
            <div key={c.titolo}>
              <p className="text-[15px] font-bold uppercase tracking-[0.08em] text-white/60">{c.titolo}</p>
              <ul className="mt-6 flex flex-col gap-4 text-[16px] font-semibold">
                {c.voci.map(([t, h]) => (
                  <li key={t}>
                    <Link href={h} className="underline-offset-4 transition-colors hover:text-home-mint-soft hover:underline">
                      {t}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-20 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-white/20 pt-8 text-[14px] font-semibold">
          <p>© {new Date().getFullYear()} iop</p>
          <Link href="/termini" className="text-white/75 transition-colors hover:text-white">
            Termini di Servizio
          </Link>
          <Link href="/privacy" className="text-white/75 transition-colors hover:text-white">
            Privacy Policy
          </Link>
        </div>
      </div>

      {/* Logo enorme a tutta larghezza, tagliato dal bordo inferiore */}
      <p
        aria-hidden
        className="mt-16 select-none text-center font-home-display text-[44vw] font-semibold leading-[0.74] tracking-normal text-white/10"
      >
        iop
      </p>
    </footer>
  );
}
