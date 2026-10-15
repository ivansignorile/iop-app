import { InviaForm } from "./invia-form";

export const metadata = { title: "Invia file — preventivo in 24 ore | iop" };

export default async function InviaPage({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const { tipo } = await searchParams;
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-[var(--spacing-section)]">
      <p className="eyebrow mb-4 text-stone">Servizio</p>
      <h1 className="display-lg text-ink">Il tuo preventivo in 24 ore, garantito.</h1>
      <p className="mt-4 mb-10 text-graphite">
        Inviaci le foto con una descrizione, oppure le foto con il capitolato. Ci pensiamo noi.
      </p>
      <InviaForm tipoIniziale={tipo === "capitolato" ? "foto_capitolato" : "foto_descrizione"} />
    </main>
  );
}
