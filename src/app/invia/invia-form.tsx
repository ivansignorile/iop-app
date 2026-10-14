"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/client";

import { inviaRichiesta, preparaUpload } from "./actions";

const MIME_ESTENSIONI: Record<string, string> = {
  heic: "image/heic",
  heif: "image/heif",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
};

function mimeDaEstensione(nome: string) {
  return MIME_ESTENSIONI[nome.split(".").pop()?.toLowerCase() ?? ""] ?? "";
}

export function InviaForm({ tipoIniziale }: { tipoIniziale: "foto_descrizione" | "foto_capitolato" }) {
  const [files, setFiles] = useState<File[]>([]);
  const [stato, setStato] = useState<"idle" | "invio" | "ok">("idle");
  const [errore, setErrore] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrore(null);
    setStato("invio");
    const fd = new FormData(e.currentTarget);
    const meta = files.map((f) => ({ nome: f.name, mime: f.type || mimeDaEstensione(f.name), size: f.size }));
    const prep = await preparaUpload(meta, String(fd.get("honeypot") ?? ""));
    if (!prep.ok) return fail(prep.errore);

    const supabase = createClient();
    for (const [i, u] of prep.uploads.entries()) {
      const { error } = await supabase.storage.from("richieste").uploadToSignedUrl(u.path, u.token, files[i], { contentType: meta[i].mime });
      if (error) return fail(`Caricamento non riuscito: ${files[i].name}`);
    }
    const res = await inviaRichiesta({
      ...Object.fromEntries(fd),
      files: meta,
      cartella: prep.cartella,
      paths: prep.uploads.map((u) => u.path),
    });
    if (!res.ok) return fail(res.errore);
    setStato("ok");
  }
  function fail(msg: string) {
    setErrore(msg);
    setStato("idle");
  }

  if (stato === "ok") {
    return (
      <div className="rounded-md border border-hairline bg-surface-soft p-8">
        <h2 className="title-lg text-ink">Richiesta ricevuta.</h2>
        <p className="mt-2 text-graphite">Entro 24 ore ricevi il preventivo all&apos;email indicata.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <input type="text" name="honeypot" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <Field label="Cosa ci invii" htmlFor="tipo">
        <Select id="tipo" name="tipo" defaultValue={tipoIniziale}>
          <option value="foto_descrizione">Foto + descrizione</option>
          <option value="foto_capitolato">Foto + capitolato</option>
        </Select>
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nome e cognome" htmlFor="nome"><Input id="nome" name="nome" required /></Field>
        <Field label="Email" htmlFor="email"><Input id="email" name="email" type="email" required /></Field>
        <Field label="Telefono (facoltativo)" htmlFor="telefono"><Input id="telefono" name="telefono" type="tel" /></Field>
        <Field label="Comune dell'immobile" htmlFor="comune"><Input id="comune" name="comune" /></Field>
      </div>
      <Field label="Descrivi il lavoro" htmlFor="descrizione" hint="Es. facciata con distacchi di intonaco, 3 piani, balconi da ripristinare">
        <Textarea id="descrizione" name="descrizione" rows={5} required minLength={10} />
      </Field>
      <Field label="Foto e capitolato" htmlFor="files" hint="Fino a 10 file, max 15 MB ciascuno. Foto JPG/PNG/HEIC, capitolato PDF/Word.">
        <Input
          id="files"
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.txt"
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
        />
      </Field>
      <FormError message={errore} />
      <Button type="submit" disabled={stato === "invio"} className="self-start">
        {stato === "invio" ? "Invio in corso…" : "Invia file"}
      </Button>
    </form>
  );
}
