"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FormError, Input, Textarea } from "@/components/ui/field";
import type { FormatoOutput, RuoloFile } from "@/lib/richieste/valida";
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
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  zip: "application/zip",
};

function mimeDaEstensione(nome: string) {
  return MIME_ESTENSIONI[nome.split(".").pop()?.toLowerCase() ?? ""] ?? "";
}

const FORMATI: { value: FormatoOutput; titolo: string; testo: string }[] = [
  {
    value: "pdf_protetto",
    titolo: "Preventivo Base (PDF Standard)",
    testo: "Formato PDF non editabile, protetto da copia e completo di watermark aziendale",
  },
  {
    value: "word",
    titolo: "Preventivo Editabile (Microsoft Word)",
    testo: "Formato .docx personalizzabile e liberamente modificabile",
  },
  {
    value: "carta_intestata",
    titolo: "Preventivo su Carta Intestata",
    testo: "Predisposto direttamente sul layout della tua intestazione aziendale",
  },
];

const ZONE: { ruolo: RuoloFile; label: string; hint: string; accept: string }[] = [
  {
    ruolo: "documento",
    label: "Computo metrico / documentazione tecnica",
    hint: "PDF, Excel, Zip, Word o foto.",
    accept: "image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.zip",
  },
  {
    ruolo: "logo",
    label: "Carta intestata / logo",
    hint: "PNG, JPG o PDF. Obbligatorio per il preventivo su carta intestata.",
    accept: ".png,.jpg,.jpeg,.pdf",
  },
  {
    ruolo: "altro",
    label: "Altri allegati",
    hint: "Planimetrie, capitolati, foto o richieste particolari.",
    accept: "image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.zip",
  },
];

function Sezione({ numero, titolo, children }: { numero: string; titolo: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-t border-hairline pt-6">
      <legend className="sr-only">{titolo}</legend>
      <p className="eyebrow mb-5 text-stone" aria-hidden>
        {numero} · {titolo}
      </p>
      <div className="flex flex-col gap-5">{children}</div>
    </fieldset>
  );
}

export function InviaForm() {
  const [files, setFiles] = useState<Record<RuoloFile, File[]>>({ documento: [], logo: [], altro: [] });
  const [formato, setFormato] = useState<FormatoOutput>("pdf_protetto");
  const [stato, setStato] = useState<"idle" | "invio" | "ok">("idle");
  const [errore, setErrore] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      setErrore(null);
      setStato("invio");
      const fd = new FormData(e.currentTarget);
      const scelti = ZONE.flatMap(({ ruolo }) => (ruolo === "logo" && formato !== "carta_intestata" ? [] : files[ruolo]).map((file) => ({ file, ruolo })));
      const meta = scelti.map(({ file, ruolo }) => ({
        nome: file.name,
        mime: file.type || mimeDaEstensione(file.name),
        size: file.size,
        ruolo,
      }));
      const prep = await preparaUpload(meta, String(fd.get("honeypot") ?? ""));
      if (!prep.ok) return fail(prep.errore);

      const supabase = createClient();
      for (const [i, u] of prep.uploads.entries()) {
        const { error } = await supabase.storage.from("richieste").uploadToSignedUrl(u.path, u.token, scelti[i].file, { contentType: meta[i].mime });
        if (error) return fail(`Caricamento non riuscito: ${scelti[i].file.name}`);
      }
      const res = await inviaRichiesta({
        ...Object.fromEntries(fd),
        files: meta,
        cartella: prep.cartella,
        paths: prep.uploads.map((u) => u.path),
      });
      if (!res.ok) return fail(res.errore);
      setStato("ok");
    } catch {
      fail("Invio non riuscito, riprova.");
    }
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
    <form onSubmit={onSubmit} className="flex flex-col gap-10">
      <input type="text" name="honeypot" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

      <Sezione numero="01" titolo="Dati di contatto">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Nome e cognome / Ragione sociale" htmlFor="nome"><Input id="nome" name="nome" required /></Field>
          <Field label="Email" htmlFor="email" hint="Dove inviamo il preventivo."><Input id="email" name="email" type="email" required /></Field>
          <Field label="Telefono (facoltativo)" htmlFor="telefono"><Input id="telefono" name="telefono" type="tel" /></Field>
          <Field label="Comune del cantiere" htmlFor="comune" hint="Serve a usare il prezzario della regione giusta."><Input id="comune" name="comune" /></Field>
        </div>
      </Sezione>

      <Sezione numero="02" titolo="Formato del preventivo">
        <div className="grid gap-px overflow-hidden border border-hairline">
          {FORMATI.map((f) => (
            <label
              key={f.value}
              className="flex cursor-pointer items-start gap-4 bg-canvas p-5 transition-colors has-[:checked]:bg-surface-soft"
            >
              <input
                type="radio"
                name="formato"
                value={f.value}
                checked={formato === f.value}
                onChange={() => setFormato(f.value)}
                className="mt-1 accent-ink"
              />
              <span>
                <span className="block font-medium text-ink">{f.titolo}</span>
                <span className="mt-1 block text-sm text-graphite">{f.testo}</span>
              </span>
            </label>
          ))}
        </div>
      </Sezione>

      <Sezione numero="03" titolo="Progetto">
        <Field label="Titolo / riferimento del progetto (facoltativo)" htmlFor="titolo">
          <Input id="titolo" name="titolo" maxLength={150} placeholder="Es. Condominio Via Roma 12 — facciate" />
        </Field>
        <Field
          label="Note e indicazioni particolari (facoltativo)"
          htmlFor="descrizione"
          hint="Esigenze particolari, clausole da inserire, note per il tecnico."
        >
          <Textarea id="descrizione" name="descrizione" rows={5} maxLength={5000} />
        </Field>
      </Sezione>

      <Sezione numero="04" titolo="Documenti e allegati">
        <details className="text-sm text-graphite">
          <summary className="cursor-pointer text-link">Cos&apos;è un computo metrico?</summary>
          <p className="mt-2 max-w-[65ch] leading-relaxed">
            È l&apos;elenco delle lavorazioni da eseguire, ciascuna con la sua quantità (metri quadri, metri lineari,
            pezzi). Se non ce l&apos;hai, carica le foto e descrivi il lavoro nelle note: ci pensa il tecnico.
          </p>
        </details>
        {ZONE.filter((z) => z.ruolo !== "logo" || formato === "carta_intestata").map((z) => (
          <Field
            key={z.ruolo}
            label={z.ruolo === "logo" ? `${z.label} (obbligatorio)` : z.label}
            htmlFor={`files-${z.ruolo}`}
            hint={z.hint}
          >
            <Input
              id={`files-${z.ruolo}`}
              type="file"
              multiple={z.ruolo !== "logo"}
              accept={z.accept}
              required={z.ruolo === "logo"}
              onChange={(e) => {
                const scelti = Array.from(e.target.files ?? []);
                setFiles((prev) => ({ ...prev, [z.ruolo]: scelti }));
              }}
            />
          </Field>
        ))}
        <p className="text-xs text-stone">Fino a 10 file in tutto, max 15 MB ciascuno.</p>
      </Sezione>

      <div className="flex flex-col gap-5 border-t border-hairline pt-6">
        <label className="flex items-start gap-3 text-sm text-graphite">
          <input type="checkbox" name="privacy" required className="mt-0.5 accent-ink" />
          <span>
            Accetto la{" "}
            <Link href="/privacy" target="_blank" className="text-link">
              Privacy Policy
            </Link>{" "}
            e il trattamento dei dati personali.
          </span>
        </label>
        <FormError message={errore} />
        <Button type="submit" disabled={stato === "invio"} className="h-12 self-start px-8 text-base active:scale-[0.98]">
          {stato === "invio" ? "Invio in corso…" : "Invia e genera richiesta"}
        </Button>
      </div>
    </form>
  );
}
