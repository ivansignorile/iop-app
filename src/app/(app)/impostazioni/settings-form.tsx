"use client";

import Image from "next/image";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/types";
import { saveOrgAction } from "./actions";

export function SettingsForm({ org }: { org: Tables<"organizations"> }) {
  const [logoUrl, setLogoUrl] = useState(org.logo_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "png";
      const path = `${org.id}/logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("branding")
        .upload(path, file, { upsert: true });
      if (!error) {
        const { data } = supabase.storage.from("branding").getPublicUrl(path);
        setLogoUrl(data.publicUrl);
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <form
      action={async (fd) => {
        await saveOrgAction(fd);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }}
      className="max-w-2xl space-y-6"
    >
      <input type="hidden" name="logo_url" value={logoUrl} />

      <section className="flex items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-md border border-hairline bg-surface-soft">
          {logoUrl ? (
            <Image src={logoUrl} alt="Logo" width={80} height={80} className="object-contain" />
          ) : (
            <span className="text-xs text-muted">Logo</span>
          )}
        </div>
        <div>
          <label className="inline-flex cursor-pointer items-center rounded-md border border-hairline px-4 py-2 text-sm text-ink">
            {uploading ? "Caricamento…" : "Carica logo"}
            <input type="file" accept="image/*" className="hidden" onChange={onLogo} />
          </label>
          {logoUrl ? (
            <button
              type="button"
              onClick={() => setLogoUrl("")}
              className="ml-3 text-sm text-ink underline underline-offset-2"
            >
              Rimuovi
            </button>
          ) : null}
        </div>
      </section>

      <Field label="Nome workspace" htmlFor="name">
        <Input id="name" name="name" defaultValue={org.name} />
      </Field>
      <Field label="Ragione sociale" htmlFor="ragione_sociale">
        <Input id="ragione_sociale" name="ragione_sociale" defaultValue={org.ragione_sociale ?? ""} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Partita IVA" htmlFor="partita_iva">
          <Input id="partita_iva" name="partita_iva" defaultValue={org.partita_iva ?? ""} />
        </Field>
        <Field label="Telefono" htmlFor="telefono">
          <Input id="telefono" name="telefono" defaultValue={org.telefono ?? ""} />
        </Field>
      </div>
      <Field label="Indirizzo" htmlFor="indirizzo">
        <Input id="indirizzo" name="indirizzo" defaultValue={org.indirizzo ?? ""} />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Comune" htmlFor="comune">
          <Input id="comune" name="comune" defaultValue={org.comune ?? ""} />
        </Field>
        <Field label="CAP" htmlFor="cap">
          <Input id="cap" name="cap" defaultValue={org.cap ?? ""} />
        </Field>
        <Field label="Prov." htmlFor="provincia">
          <Input id="provincia" name="provincia" defaultValue={org.provincia ?? ""} />
        </Field>
      </div>
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" defaultValue={org.email ?? ""} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="IVA predefinita %" htmlFor="default_iva">
          <Input id="default_iva" name="default_iva" type="number" step="0.01" defaultValue={org.default_iva} />
        </Field>
        <Field label="Costo giornaliero su corda (€)" htmlFor="costo_giornaliero">
          <Input
            id="costo_giornaliero"
            name="costo_giornaliero"
            type="number"
            step="0.01"
            defaultValue={org.costo_giornaliero ?? ""}
          />
        </Field>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit">Salva impostazioni</Button>
        {saved ? <span className="text-sm text-success">Salvato</span> : null}
      </div>
    </form>
  );
}
