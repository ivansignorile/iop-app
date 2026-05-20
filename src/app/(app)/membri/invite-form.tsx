"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FormError, Input, Select } from "@/components/ui/field";
import { inviteMemberAction, type InviteState } from "./actions";

export function InviteForm() {
  const [state, action, pending] = useActionState<InviteState, FormData>(
    inviteMemberAction,
    {},
  );
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-[220px]">
        <label className="mb-1.5 block text-sm font-medium text-ink">Email</label>
        <Input name="email" type="email" placeholder="collega@impresa.it" required />
      </div>
      <div className="w-40">
        <label className="mb-1.5 block text-sm font-medium text-ink">Ruolo</label>
        <Select name="role" defaultValue="member">
          <option value="member">Membro</option>
          <option value="admin">Admin</option>
        </Select>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Invio…" : "Aggiungi"}
      </Button>
      <div className="w-full">
        {state.message ? (
          <p className="text-sm text-success">{state.message}</p>
        ) : (
          <FormError message={state.error} />
        )}
      </div>
    </form>
  );
}
