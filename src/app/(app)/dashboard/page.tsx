import { ButtonLink } from "@/components/ui/button";
import { requireContext } from "@/lib/auth";

export default async function DashboardPage() {
  const { org } = await requireContext();

  return (
    <div>
      <div className="mb-8">
        <h1 className="display-md text-ink">Ciao, {org.name}</h1>
        <p className="mt-2 text-sm text-muted">
          Crea un nuovo preventivo, dal capitolato o partendo da zero.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <article className="rounded-lg bg-signature-coral p-12 text-on-primary">
          <h2 className="display-md mb-3">Dal capitolato</h2>
          <p className="mb-8 text-sm/relaxed opacity-90">
            Carica un computo metrico o un capitolato: l&apos;AI compila il
            preventivo, pronto da rivedere ed esportare.
          </p>
          <ButtonLink
            href="/preventivi/nuovo?modalita=capitolato"
            variant="secondary"
          >
            Carica capitolato
          </ButtonLink>
        </article>

        <article className="rounded-lg bg-signature-forest p-12 text-on-dark">
          <h2 className="display-md mb-3">Da zero</h2>
          <p className="mb-8 text-sm/relaxed opacity-90">
            Inserisci committente, edificio e lavorazioni attingendo alla
            libreria dei cicli e ai prezzi di riferimento.
          </p>
          <ButtonLink
            href="/preventivi/nuovo?modalita=manuale"
            variant="secondary"
          >
            Inizia da zero
          </ButtonLink>
        </article>
      </div>
    </div>
  );
}
