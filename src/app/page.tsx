import { ButtonLink } from "@/components/ui/button";

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
          <h1 className="display-xl max-w-3xl text-ink md:text-[64px] md:leading-[0.98]">
            Il preventivo di ristrutturazione, pronto in minuti.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-graphite">
            Carica il capitolato e lascia che l&apos;AI compili l&apos;offerta
            tecnico-economica. Oppure parti da zero: dati, lavorazioni e prezzi,
            con un template professionale sempre pronto all&apos;export.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/signup">Crea il tuo primo preventivo</ButtonLink>
            <ButtonLink href="/login" variant="secondary">
              Accedi
            </ButtonLink>
          </div>
        </section>

        {/* Tre flussi */}
        <section className="grid gap-px overflow-hidden border border-hairline pb-0 md:grid-cols-3">
          <article className="bg-scrim p-12 text-on-primary">
            <p className="eyebrow mb-4 text-on-primary/60">Dal capitolato</p>
            <h2 className="display-md mb-4">La magia, dal computo all&apos;offerta</h2>
            <p className="text-base leading-relaxed text-on-primary/80">
              Hai un computo metrico o un capitolato? Caricalo: IOP riconosce le
              voci, le traduce in interventi e prezzi e ti restituisce
              l&apos;offerta già compilata e modificabile.
            </p>
          </article>
          <article className="bg-canvas p-12 text-ink">
            <p className="eyebrow mb-4 text-stone">Da zero</p>
            <h2 className="display-md mb-4">Componi passo dopo passo</h2>
            <p className="text-base leading-relaxed text-graphite">
              Nessun capitolato? Inserisci committente, edificio e lavorazioni:
              attingi alla libreria dei cicli e ai prezzi a corpo, mq o ml, e
              costruisci il preventivo nel tuo standard.
            </p>
          </article>
          <article className="bg-surface-soft p-12 text-ink">
            <p className="eyebrow mb-4 text-stone">Da foto</p>
            <h2 className="display-md mb-4">Scatta, posiziona, avvia</h2>
            <p className="text-base leading-relaxed text-graphite">
              Fotografi la facciata, segna i danni con i punti numerati e
              descrivi ogni lavorazione: l&apos;AI genera automaticamente il
              preventivo pre-compilato, pronto da rivedere.
            </p>
            <div className="mt-8">
              <ButtonLink href="/signup?modalita=foto">Prova da foto</ButtonLink>
            </div>
          </article>
        </section>
        <div className="h-[var(--spacing-section)]" />
      </main>

      <footer className="bg-footer px-6 py-12 text-sm text-on-primary md:px-12">
        <span className="lowercase">iop</span> — io preventivo · preventivi per
        ristrutturazioni esterne
      </footer>
    </div>
  );
}
