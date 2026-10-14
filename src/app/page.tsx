import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";

const MODALITA = [
  {
    eyebrow: "Componi",
    titolo: "Componi il tuo preventivo",
    testo:
      "Scegli le voci dal prezzario regionale o dalla tua libreria prezzi, quantità e misure: il preventivo si compone da sé.",
    href: "/preventivi/nuovo?modalita=manuale",
    cta: "Componi",
    cls: "bg-canvas text-ink",
    dark: false,
  },
  {
    eyebrow: "Da foto",
    titolo: "Genera da foto",
    testo:
      "Fotografa la facciata, segna i danni con i punti numerati: l'AI genera le voci con descrizioni e prezzi.",
    href: "/preventivi/nuovo?modalita=foto",
    cta: "Genera da foto",
    cls: "bg-surface-soft text-ink",
    dark: false,
  },
  {
    eyebrow: "Da capitolato",
    titolo: "Genera da capitolato",
    testo:
      "Carica capitolato o computo metrico: IOP riconosce le voci e le abbina al prezzario e ai tuoi prezzi.",
    href: "/preventivi/nuovo?modalita=capitolato",
    cta: "Genera da capitolato",
    cls: "bg-scrim text-on-primary",
    dark: true,
  },
];

export default function Home() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="flex h-16 items-center justify-between px-6 md:px-12">
        <span className="text-xl font-medium tracking-tight text-ink">iop</span>
        <nav className="flex items-center gap-2">
          <ButtonLink href="/login" variant="ghost">
            Accedi
          </ButtonLink>
          <ButtonLink href="/signup">Inizia</ButtonLink>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-[1280px] px-6 md:px-12">
        {/* Hero */}
        <section className="py-[var(--spacing-section)]">
          <p className="eyebrow mb-4 text-stone">Io Preventivo</p>
          <h1 className="display-xl max-w-4xl text-ink md:text-[64px] md:leading-[0.98]">
            Il tuo preventivo in un click.
          </h1>
          <p className="mt-6 max-w-2xl text-xl leading-snug text-graphite">
            Oppure inviaci foto + descrizione o foto + capitolato e il tuo
            preventivo arriva in{" "}
            <strong className="font-semibold text-ink">24 ore, garantito</strong>.
          </p>
          <div className="mt-10 flex flex-col items-start gap-3">
            <ButtonLink href="/invia" className="px-10 py-4 text-base">
              Invia file
            </ButtonLink>
            <p className="text-sm text-muted">
              Nessuna registrazione. Ci pensiamo noi.
            </p>
            <Link href="/invia?tipo=capitolato" className="block text-sm text-link">
              Hai un capitolato? Invialo qui
            </Link>
          </div>
        </section>

        {/* Fai da te */}
        <section className="pb-[var(--spacing-section)]">
          <p className="eyebrow mb-4 text-stone">Fai da te</p>
          <h2 className="display-md mb-10 max-w-2xl text-ink">
            Preferisci farlo tu? Tre modi, pronti in minuti.
          </h2>
          <div className="grid gap-px overflow-hidden border border-hairline md:grid-cols-3">
            {MODALITA.map((m) => (
              <article key={m.eyebrow} className={`flex flex-col p-8 md:p-12 ${m.cls}`}>
                <p className="eyebrow mb-4 opacity-60">{m.eyebrow}</p>
                <h3 className="display-md mb-4">{m.titolo}</h3>
                <p className="flex-1 text-base leading-relaxed opacity-80">{m.testo}</p>
                <div className="mt-8">
                  <ButtonLink href={m.href} variant={m.dark ? "secondary" : "primary"}>
                    {m.cta}
                  </ButtonLink>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="bg-footer px-6 py-12 text-sm text-on-primary md:px-12">
        <span className="lowercase">iop</span> — io preventivo · preventivi per
        ristrutturazioni esterne
      </footer>
    </div>
  );
}
