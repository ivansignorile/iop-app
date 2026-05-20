import { ButtonLink } from "@/components/ui/button";
import { requireContext } from "@/lib/auth";

export default async function DashboardPage() {
  const { org } = await requireContext();

  return (
    <div>
      <div className="mb-10 border-b border-hairline pb-6">
        <p className="eyebrow mb-2 text-stone">Workspace</p>
        <h1 className="display-md text-ink">Ciao, {org.name}</h1>
        <p className="mt-2 text-base text-graphite">
          Crea un nuovo preventivo, dal capitolato o partendo da zero.
        </p>
      </div>

      <div className="grid gap-px overflow-hidden border border-hairline md:grid-cols-2">
        <article className="bg-scrim p-12 text-on-primary">
          <p className="eyebrow mb-4 text-on-primary/60">Dal capitolato</p>
          <h2 className="display-md mb-3">Compila con l&apos;AI</h2>
          <p className="mb-8 text-base leading-relaxed text-on-primary/80">
            Carica un computo metrico o un capitolato: l&apos;AI compila il
            preventivo, pronto da rivedere ed esportare.
          </p>
          <ButtonLink
            href="/preventivi/nuovo?modalita=capitolato"
            variant="primary"
            className="bg-on-primary text-primary active:bg-hairline"
          >
            Carica capitolato
          </ButtonLink>
        </article>

        <article className="bg-canvas p-12 text-ink">
          <p className="eyebrow mb-4 text-stone">Da zero</p>
          <h2 className="display-md mb-3">Componi a mano</h2>
          <p className="mb-8 text-base leading-relaxed text-graphite">
            Inserisci committente, edificio e lavorazioni attingendo alla
            libreria dei cicli e ai prezzi di riferimento.
          </p>
          <ButtonLink href="/preventivi/nuovo?modalita=manuale">
            Inizia da zero
          </ButtonLink>
        </article>
      </div>
    </div>
  );
}
