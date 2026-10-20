export const metadata = { title: "Privacy Policy | iop" };

// TODO: testo definitivo da Luigi (D6) prima del go-live.
export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-[var(--spacing-section)]">
      <p className="eyebrow mb-4 text-stone">Informativa</p>
      <h1 className="display-lg text-ink">Privacy Policy</h1>
      <div className="mt-8 flex max-w-[65ch] flex-col gap-4 leading-relaxed text-graphite">
        <p>
          I dati inviati con il modulo di richiesta (nome, email, telefono, comune, note e file allegati) sono usati
          solo per preparare e inviarti il preventivo richiesto e per ricontattarti in merito.
        </p>
        <p>
          I file sono conservati in uno spazio privato, accessibile solo al nostro team. Non cediamo i tuoi dati a
          terzi per finalità commerciali.
        </p>
        <p>Per chiedere la modifica o la cancellazione dei tuoi dati scrivi all&apos;indirizzo indicato nel preventivo.</p>
        <p className="text-sm text-stone">Testo provvisorio, in aggiornamento.</p>
      </div>
    </main>
  );
}
