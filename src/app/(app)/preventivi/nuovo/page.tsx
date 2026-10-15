import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Card, PageHeader } from "@/components/ui/misc";
import Link from "next/link";

import { requireContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createPreventivoAction } from "./actions";

export default async function NuovoPreventivoPage({
  searchParams,
}: {
  searchParams: Promise<{ modalita?: string }>;
}) {
  const { org } = await requireContext();
  const supabase = await createClient();
  const { count: vociProprie } = await supabase
    .from("voci_proprie")
    .select("id", { count: "exact", head: true })
    .eq("org_id", org.id);
  const { modalita } = await searchParams;
  const isCapitolato = modalita === "capitolato";
  const isFoto = modalita === "foto";

  const title = isCapitolato
    ? "Nuovo preventivo dal capitolato"
    : isFoto
      ? "Nuovo preventivo da foto"
      : "Nuovo preventivo";
  const description = isCapitolato
    ? "Crea la bozza, poi carica il capitolato per la compilazione assistita."
    : isFoto
      ? "Crea la bozza, poi scatta una foto e posiziona i punti per la compilazione assistita."
      : "Crea la bozza e componi il preventivo passo dopo passo.";
  const modalitaValue = isCapitolato ? "capitolato" : isFoto ? "foto" : "manuale";

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title={title} description={description} />
      <Card>
        <form action={createPreventivoAction} className="flex flex-col gap-4">
          <input
            type="hidden"
            name="modalita"
            value={modalitaValue}
          />
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 text-sm font-medium text-ink">
              Da dove prendo descrizioni e prezzi?
            </legend>
            {[
              { v: "entrambi", t: "Entrambi", d: "Prezzario regionale + i tuoi prezzi: per ogni voce scegli quale tenere." },
              { v: "prezzario", t: "Solo prezzario regionale", d: "Descrizioni e prezzi ufficiali della tua regione." },
              { v: "propri", t: "Solo i miei prezzi", d: "Dalla tua libreria personale. Se manca una voce, si usa il prezzario." },
            ].map((o) => (
              <label
                key={o.v}
                className="flex cursor-pointer gap-3 rounded-md border border-hairline p-3 has-[:checked]:border-ink"
              >
                <input
                  type="radio"
                  name="fonte_prezzi"
                  value={o.v}
                  defaultChecked={o.v === "entrambi"}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-medium text-ink">{o.t}</span>
                  <span className="block text-sm text-graphite">{o.d}</span>
                </span>
              </label>
            ))}
            {(vociProprie ?? 0) === 0 && (
              <p className="text-sm text-graphite">
                La tua libreria è vuota:{" "}
                <Link href="/libreria" className="underline">
                  carica i tuoi vecchi preventivi
                </Link>
                .
              </p>
            )}
          </fieldset>
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
