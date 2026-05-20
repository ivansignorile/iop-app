import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Card, PageHeader } from "@/components/ui/misc";
import { requireContext } from "@/lib/auth";
import { createPreventivoAction } from "./actions";

export default async function NuovoPreventivoPage({
  searchParams,
}: {
  searchParams: Promise<{ modalita?: string }>;
}) {
  await requireContext();
  const { modalita } = await searchParams;
  const isCapitolato = modalita === "capitolato";

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title={isCapitolato ? "Nuovo preventivo dal capitolato" : "Nuovo preventivo"}
        description={
          isCapitolato
            ? "Crea la bozza, poi carica il capitolato per la compilazione assistita."
            : "Crea la bozza e componi il preventivo passo dopo passo."
        }
      />
      <Card>
        <form action={createPreventivoAction} className="flex flex-col gap-4">
          <input
            type="hidden"
            name="modalita"
            value={isCapitolato ? "capitolato" : "manuale"}
          />
          <Field
            label="Oggetto (facoltativo)"
            htmlFor="oggetto"
            hint="Es. Ripristino facciate e balconi"
          >
            <Input id="oggetto" name="oggetto" />
          </Field>
          <Button type="submit" className="mt-2 self-start">
            Crea bozza
          </Button>
        </form>
      </Card>
    </div>
  );
}
