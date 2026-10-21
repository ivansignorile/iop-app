"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FormError, Input } from "@/components/ui/field";
import {
  signInAction,
  signUpAction,
  type AuthState,
} from "@/app/auth/actions";

export function AuthForm({
  mode,
  redirectTo,
  defaultEmail,
}: {
  mode: "login" | "signup";
  redirectTo?: string;
  defaultEmail?: string;
}) {
  const action = mode === "login" ? signInAction : signUpAction;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    action,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {mode === "login" && redirectTo ? (
        <input type="hidden" name="redirect" value={redirectTo} />
      ) : null}

      {state.message ? (
        <p className="rounded-sm border border-success-border/40 bg-success/5 px-3 py-2 text-sm text-success">
          {state.message}
        </p>
      ) : (
        <FormError message={state.error} />
      )}

      {mode === "signup" && (
        <Field label="Nome e cognome" htmlFor="full_name">
          <Input id="full_name" name="full_name" autoComplete="name" required />
        </Field>
      )}

      <Field label="Email" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={defaultEmail}
          required
        />
      </Field>

      <Field
        label="Password"
        htmlFor="password"
        hint={mode === "signup" ? "Almeno 8 caratteri." : undefined}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
        />
      </Field>

      <Button type="submit" disabled={pending} className="mt-2 w-full">
        {pending
          ? "Attendere…"
          : mode === "login"
            ? "Accedi"
            : "Crea account"}
      </Button>

      <p className="text-center text-sm text-muted">
        {mode === "login" ? (
          <>
            Non hai un account?{" "}
            <Link href="/signup" className="text-link">
              Registrati
            </Link>
          </>
        ) : (
          <>
            Hai già un account?{" "}
            <Link href="/login" className="text-link">
              Accedi
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
