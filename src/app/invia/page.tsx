import { InviaForm } from "./invia-form";

export const metadata = { title: "Elaborato dal tecnico — preventivo in 24 ore | iop" };

export default function InviaPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-[var(--spacing-section)]">
      <p className="eyebrow mb-4 text-stone">Elaborato dal tecnico</p>
      <h1 className="display-lg text-ink">Il tuo preventivo in 24 ore, garantito.</h1>
      <p className="mt-4 mb-10 text-graphite">
        Carica le specifiche e scegli il formato: un nostro tecnico verifica e affina il preventivo e te lo invia
        pronto entro 24 ore.
      </p>
      <InviaForm />
    </main>
  );
}
