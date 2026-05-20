import { ButtonLink } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="flex h-16 items-center justify-between border-b border-hairline px-6 md:px-12">
        <span className="text-xl font-medium tracking-tight text-ink">IOP</span>
        <nav className="flex items-center gap-2">
          <ButtonLink href="/login" variant="ghost" className="px-4 py-2">
            Accedi
          </ButtonLink>
          <ButtonLink href="/signup" className="px-4 py-2">
            Inizia
          </ButtonLink>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-[1280px] px-6 md:px-12">
        {/* Hero */}
        <section className="py-[var(--spacing-section)] text-center">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.16px] text-muted">
            Io Preventivo
          </p>
          <h1 className="display-lg mx-auto max-w-3xl text-ink md:text-[48px]">
            Il preventivo di ristrutturazione, pronto in minuti.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-body">
            Carica il capitolato e lascia che l&apos;AI compili l&apos;offerta
            tecnico-economica. Oppure parti da zero: dati, lavorazioni e prezzi,
            con un template professionale sempre pronto all&apos;export.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href="/signup">Crea il tuo primo preventivo</ButtonLink>
            <ButtonLink href="/login" variant="secondary">
              Accedi
            </ButtonLink>
          </div>
        </section>

        {/* Due flussi */}
        <section className="grid gap-6 pb-[var(--spacing-section)] md:grid-cols-2">
          <article className="rounded-lg bg-signature-coral p-12 text-on-primary">
            <h2 className="display-md mb-4">Dal capitolato</h2>
            <p className="text-base/relaxed opacity-90">
              Hai un computo metrico o un capitolato? Caricalo: IOP riconosce le
              voci, le traduce in interventi e prezzi e ti restituisce
              l&apos;offerta già compilata e modificabile.
            </p>
          </article>
          <article className="rounded-lg bg-signature-forest p-12 text-on-dark">
            <h2 className="display-md mb-4">Da zero</h2>
            <p className="text-base/relaxed opacity-90">
              Nessun capitolato? Inserisci committente, edificio e lavorazioni:
              attingi alla libreria dei cicli e ai prezzi a corpo, mq o ml, e
              componi il preventivo passo dopo passo.
            </p>
          </article>
        </section>
      </main>

      <footer className="border-t border-hairline px-6 py-8 text-sm text-muted md:px-12">
        IOP — Io Preventivo · Preventivi per ristrutturazioni esterne
      </footer>
    </div>
  );
}
