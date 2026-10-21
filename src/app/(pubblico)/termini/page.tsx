export const metadata = { title: "Termini di Servizio | iop" };

// TODO: testo definitivo da Luigi (D7) prima del go-live.
export default function TerminiPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-[var(--spacing-section)]">
      <p className="eyebrow mb-4 text-stone">Condizioni</p>
      <h1 className="display-lg text-ink">Termini di Servizio</h1>
      <div className="mt-8 flex max-w-[65ch] flex-col gap-4 leading-relaxed text-graphite">
        <p>
          IOP genera preventivi edili sulla base dei prezzari regionali ufficiali e delle informazioni fornite
          dall&apos;utente. Le stime sono indicative e vanno verificate prima dell&apos;esecuzione dei lavori.
        </p>
        <p className="text-sm text-stone">Testo provvisorio, in aggiornamento.</p>
      </div>
    </main>
  );
}
