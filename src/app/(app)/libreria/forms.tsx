"use client";

import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/field";
import type { Tables } from "@/lib/supabase/types";
import {
  addCiclo,
  addPrezzo,
  deleteCiclo,
  deletePrezzo,
  updateCiclo,
  updatePrezzo,
} from "./actions";

const UNITA = ["corpo", "mq", "ml", "mc", "giorno", "cad", "kg"] as const;

function UnitaSelect({ name, value }: { name: string; value?: string }) {
  return (
    <Select name={name} defaultValue={value ?? "mq"} className="w-24">
      {UNITA.map((u) => (
        <option key={u} value={u}>
          {u}
        </option>
      ))}
    </Select>
  );
}

/* ---------------- Prezzi ---------------- */

export function AddPrezzoForm() {
  return (
    <form
      action={addPrezzo}
      className="flex flex-wrap items-end gap-3 border border-hairline bg-surface-soft p-4"
    >
      <div className="flex-1 min-w-[200px]">
        <label className="mb-1 block text-sm font-medium text-ink">Voce</label>
        <Input name="voce" placeholder="Es. Ripristino frontalini balconi" required />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-ink">Unità</label>
        <UnitaSelect name="unita" />
      </div>
      <div className="w-28">
        <label className="mb-1 block text-sm font-medium text-ink">Prezzo €</label>
        <Input name="prezzo" type="number" step="0.01" required />
      </div>
      <div className="w-36">
        <label className="mb-1 block text-sm font-medium text-ink">Categoria</label>
        <Input name="categoria" placeholder="facciate" />
      </div>
      <Button type="submit">Aggiungi</Button>
    </form>
  );
}

export function PrezzoRow({
  prezzo,
}: {
  prezzo: Pick<Tables<"prezzi_unitari">, "id" | "voce" | "unita" | "prezzo">;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3 border-b border-hairline py-3">
      <form
        action={updatePrezzo.bind(null, prezzo.id)}
        className="flex flex-1 flex-wrap items-end gap-3"
      >
        <Input name="voce" defaultValue={prezzo.voce} className="flex-1 min-w-[200px]" />
        <UnitaSelect name="unita" value={prezzo.unita} />
        <Input name="prezzo" type="number" step="0.01" defaultValue={prezzo.prezzo} className="w-28" />
        <Button type="submit" variant="secondary">
          Salva
        </Button>
      </form>
      <form action={deletePrezzo}>
        <input type="hidden" name="id" value={prezzo.id} />
        <button type="submit" className="pb-2 text-sm text-ink underline underline-offset-2">
          Elimina
        </button>
      </form>
    </div>
  );
}

/* ---------------- Cicli ---------------- */

export function AddCicloForm() {
  return (
    <form action={addCiclo} className="space-y-3 border border-hairline bg-surface-soft p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <label className="mb-1 block text-sm font-medium text-ink">Titolo</label>
          <Input name="titolo" placeholder="Es. Ripristino cornicione" required />
        </div>
        <div className="w-36">
          <label className="mb-1 block text-sm font-medium text-ink">Categoria</label>
          <Input name="categoria" placeholder="facciate" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">Unità</label>
          <UnitaSelect name="unita_default" />
        </div>
        <div className="w-28">
          <label className="mb-1 block text-sm font-medium text-ink">Prezzo €</label>
          <Input name="prezzo_default" type="number" step="0.01" />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-ink">Descrizione / fasi</label>
        <Textarea name="descrizione_fasi" rows={4} placeholder="Elenco delle fasi del ciclo…" required />
      </div>
      <Button type="submit">Aggiungi ciclo</Button>
    </form>
  );
}

export function CicloRow({
  ciclo,
}: {
  ciclo: Pick<
    Tables<"cicli_lavorazione">,
    "id" | "titolo" | "categoria" | "unita_default" | "prezzo_default" | "descrizione_fasi"
  >;
}) {
  return (
    <div className="border-b border-hairline py-3">
      <form action={updateCiclo.bind(null, ciclo.id)} className="space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <Input name="titolo" defaultValue={ciclo.titolo} className="flex-1 min-w-[200px]" />
          <Input name="categoria" defaultValue={ciclo.categoria ?? ""} className="w-36" />
          <UnitaSelect name="unita_default" value={ciclo.unita_default} />
          <Input
            name="prezzo_default"
            type="number"
            step="0.01"
            defaultValue={ciclo.prezzo_default ?? ""}
            className="w-28"
          />
        </div>
        <Textarea name="descrizione_fasi" rows={3} defaultValue={ciclo.descrizione_fasi} />
        <div className="flex items-center gap-3">
          <Button type="submit" variant="secondary">
            Salva
          </Button>
        </div>
      </form>
      <form action={deleteCiclo} className="mt-1">
        <input type="hidden" name="id" value={ciclo.id} />
        <button type="submit" className="text-sm text-ink underline underline-offset-2">
          Elimina ciclo
        </button>
      </form>
    </div>
  );
}
