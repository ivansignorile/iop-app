"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FormError, Input } from "@/components/ui/field";
import { createOrgAction, type OnboardingState } from "./actions";

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState<OnboardingState, FormData>(
    createOrgAction,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormError message={state.error} />
      <Field label="Nome impresa / studio" htmlFor="name">
        <Input
          id="name"
          name="name"
          placeholder="Es. Edil Proxima Srl"
          required
        />
      </Field>
      <Button type="submit" disabled={pending} className="mt-2 w-full">
        {pending ? "Creazione…" : "Crea e continua"}
      </Button>
    </form>
  );
}
