# Prezzari regionali + Libreria personale + Doppia descrizione + INVIA FILE — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementare le richieste di Luigi del 14/10/2026: home con hero "preventivo in un click / in 24 ore garantito" e INVIA FILE pubblico, e un motore prezzi basato su prezzario regionale + libreria personale, con doppia descrizione per voce e selettore della fonte prezzi nelle tre modalità.

**Architecture:** Due blocchi indipendenti. **A (INVIA FILE)** è una pagina pubblica `/invia` con upload diretto su bucket privato tramite signed upload URL generati da server action con service role, tabella `richieste_servizio`, notifica email (Resend via fetch) + WhatsApp (Green API via fetch) e pagina admin. **B (Prezzi)** aggiunge tabelle `prezzari`/`prezzario_voci` (globali, full-text italiano), `documenti_libreria`/`voci_proprie` (per org), le colonne della doppia descrizione su `preventivo_interventi` e `fonte_prezzi` su `preventivi`, più l'edge function `abbina-voci` che associa a ogni intervento la voce di prezzario e la voce propria migliori. `descrizione`/`prezzo_unitario` restano i valori effettivi, quindi anteprima e stampa non cambiano.

**Tech Stack:** Next 16.2.6 (App Router, `proxy.ts`), React 19, Tailwind 4 (`@theme` in `globals.css`), Supabase (Postgres + RLS + Storage + Deno edge functions), Anthropic Messages API via `fetch` con `output_config.format` json_schema, Vitest (nuovo, solo per logica pura), `exceljs` (nuovo, dev, solo per lo script di import).

**Spec:** `docs/superpowers/specs/2026-10-14-prezzari-invia-file-design.md`

## Global Constraints

- Leggere `node_modules/next/dist/docs/` prima di scrivere codice Next (AGENTS.md: "This is NOT the Next.js you know").
- Middleware si chiama `proxy.ts`. Ogni nuova route pubblica va aggiunta a `isPublic` in `src/lib/supabase/proxy.ts:39-44`.
- Commit: mai citare Claude/AI/Anthropic, nessun co-author, nessun footer. Autore = utente.
- Package manager: `pnpm`.
- Verifica base di ogni task: `npx tsc --noEmit && pnpm lint` (+ `pnpm test` dove ci sono test) — `pnpm build` a fine blocco.
- Migrazioni: `supabase/migrations/2026101409xxxx_*.sql`, poi `supabase db push` e `supabase gen types typescript --project-id ycliptiwnhclfeijlnri > src/lib/supabase/types.ts`.
- Edge function: `supabase functions deploy <nome> --project-ref ycliptiwnhclfeijlnri`. Modello: `Deno.env.get("ANTHROPIC_MODEL") ?? "claude-opus-4-7"` come le altre.
- Testi UI in italiano. Stile: componenti esistenti in `src/components/ui/` (`Button`, `ButtonLink`, `Field`, `Input`, `Textarea`, `Select`, `Card`, `PageHeader`), token di `globals.css`. Nessuna nuova libreria UI.
- Copy hero esatta (dal cliente): "Il tuo preventivo in un click oppure inviaci foto + descrizione o foto + capitolato e il tuo preventivo in 24 ore garantito!"
- Enum fonte prezzi: `prezzario | propri | entrambi` (default `entrambi`). Enum fonte scelta per voce: `prezzario | propria | manuale`.
- Nuove env (Vercel + `.env.local`, mai committate): `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RICHIESTE_EMAIL_FROM`, `RICHIESTE_EMAIL_TO`, `GREEN_API_URL`, `GREEN_API_INSTANCE`, `GREEN_API_TOKEN`, `RICHIESTE_WHATSAPP_CHAT_ID`, `IOP_ADMIN_EMAILS`. Documentarle (solo nomi) in `.env.example`.

## Review Focus

1. **Upload pubblico abusato** (bot, file enormi, tipi strani): honeypot + max 10 file + 15 MB ciascuno + MIME whitelist + max 5 richieste/ora per email. Test in Task 2.
2. **Notifica fallita non deve perdere la richiesta**: la richiesta va salvata prima e le notifiche sono best-effort (`Promise.allSettled`) con stato `notifica_ok` salvato. Test in Task 3.
3. **Voce propria mancante con fonte `entrambi`** → si usa il prezzario (requisito esplicito). **Fonte `propri` senza voce propria** → si usa comunque il prezzario, segnalato (non si lascia la voce vuota). Test in Task 11.
4. **Prezzario con righe gerarchiche** (articolo padre senza prezzo + sottovoci): la descrizione della sottovoce deve includere il testo del padre, altrimenti le voci sono "idem c.s." senza senso. Test in Task 7.
5. **Utente che modifica a mano la descrizione dopo aver scelto**: la scelta diventa `manuale` e un ri-abbinamento non deve sovrascriverla. Test in Task 11 + guardia in Task 13.

---

## BLOCCO A — Home + INVIA FILE

### Task 1: Vitest + migrazione `richieste_servizio` + client service role

**Files:**
- Modify: `package.json` (devDep `vitest`, script `test`)
- Create: `vitest.config.ts`
- Create: `supabase/migrations/20261014090000_richieste_servizio.sql`
- Create: `src/lib/supabase/admin.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces: tabella `richieste_servizio`, bucket `richieste`, `createAdminClient(): SupabaseClient<Database>` (solo server).

- [ ] **Step 1: Installare vitest**

```bash
pnpm add -D vitest
```

`package.json` → `"scripts"`: aggiungere `"test": "vitest run"`.

`vitest.config.ts`:
```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { include: ["src/**/*.test.ts", "supabase/functions/_shared/**/*.test.ts", "scripts/**/*.test.ts"] },
});
```

- [ ] **Step 2: Migrazione**

```sql
-- 20261014090000_richieste_servizio.sql
create type public.richiesta_tipo as enum ('foto_descrizione', 'foto_capitolato');
create type public.richiesta_stato as enum ('nuova', 'in_lavorazione', 'evasa', 'scartata');

create table public.richieste_servizio (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nome text not null,
  email text not null,
  telefono text,
  tipo public.richiesta_tipo not null,
  descrizione text not null,
  comune text,
  files jsonb not null default '[]'::jsonb, -- [{path, nome, mime, size}]
  stato public.richiesta_stato not null default 'nuova',
  notifica_email_ok boolean,
  notifica_whatsapp_ok boolean,
  note_interne text
);
create index richieste_servizio_email_created_idx on public.richieste_servizio (email, created_at desc);

-- Nessuna policy: accesso solo via service role (server action / pagina admin).
alter table public.richieste_servizio enable row level security;

insert into storage.buckets (id, name, public, file_size_limit)
values ('richieste', 'richieste', false, 15728640)
on conflict (id) do nothing;
-- Nessuna policy su storage.objects per 'richieste': upload solo via signed upload URL.
```

- [ ] **Step 3: Client service role**

`src/lib/supabase/admin.ts`:
```ts
import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "./types";

/** Client con service role: bypassa RLS. Usare SOLO in server action / route server. */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY mancante");
  return createClient<Database>(url, key, { auth: { persistSession: false } });
}
```
Se `server-only` non è installato: `pnpm add server-only`.

`.env.example` — aggiungere (solo nomi):
```
# Server-only
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
RICHIESTE_EMAIL_FROM=
RICHIESTE_EMAIL_TO=
GREEN_API_URL=
GREEN_API_INSTANCE=
GREEN_API_TOKEN=
RICHIESTE_WHATSAPP_CHAT_ID=
IOP_ADMIN_EMAILS=
```

- [ ] **Step 4: Push + tipi + verifica**

```bash
supabase db push
supabase gen types typescript --project-id ycliptiwnhclfeijlnri > src/lib/supabase/types.ts
npx tsc --noEmit && pnpm lint && pnpm test --passWithNoTests
```
Expected: tutto verde, `Database["public"]["Tables"]["richieste_servizio"]` presente.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts supabase/migrations/20261014090000_richieste_servizio.sql src/lib/supabase/admin.ts src/lib/supabase/types.ts .env.example
git commit -m "Richieste servizio: tabella, bucket privato, client service role, vitest"
```

---

### Task 2: Validazione richiesta (logica pura, TDD)

**Files:**
- Create: `src/lib/richieste/valida.ts`
- Test: `src/lib/richieste/valida.test.ts`

**Interfaces:**
- Produces:
  - `type FileMeta = { nome: string; mime: string; size: number }`
  - `type RichiestaInput = { nome: string; email: string; telefono: string | null; tipo: "foto_descrizione" | "foto_capitolato"; descrizione: string; comune: string | null; files: FileMeta[]; honeypot: string }`
  - `validaRichiesta(raw: Record<string, unknown>): { ok: true; data: RichiestaInput } | { ok: false; errore: string }`
  - `MAX_FILES = 10`, `MAX_FILE_BYTES = 15 * 1024 * 1024`, `MIME_AMMESSI: string[]`, `MAX_RICHIESTE_ORA = 5`

- [ ] **Step 1: Test che falliscono**

```ts
// src/lib/richieste/valida.test.ts
import { describe, expect, it } from "vitest";

import { MAX_FILES, validaRichiesta } from "./valida";

const base = {
  nome: "Mario Rossi",
  email: "mario@example.com",
  telefono: "3331234567",
  tipo: "foto_descrizione",
  descrizione: "Facciata con distacchi di intonaco al secondo piano",
  comune: "Benevento",
  files: [{ nome: "facciata.jpg", mime: "image/jpeg", size: 2_000_000 }],
  honeypot: "",
};

describe("validaRichiesta", () => {
  it("accetta una richiesta valida", () => {
    const r = validaRichiesta(base);
    expect(r.ok).toBe(true);
  });
  it("rifiuta se l'honeypot è compilato (bot)", () => {
    expect(validaRichiesta({ ...base, honeypot: "x" })).toEqual({ ok: false, errore: "Richiesta non valida." });
  });
  it("rifiuta email non valida", () => {
    expect(validaRichiesta({ ...base, email: "mario" }).ok).toBe(false);
  });
  it("richiede almeno una foto", () => {
    expect(validaRichiesta({ ...base, files: [] }).ok).toBe(false);
    expect(
      validaRichiesta({ ...base, files: [{ nome: "a.pdf", mime: "application/pdf", size: 10 }] }).ok,
    ).toBe(false);
  });
  it("con foto_capitolato richiede anche un PDF/documento", () => {
    expect(validaRichiesta({ ...base, tipo: "foto_capitolato" }).ok).toBe(false);
    expect(
      validaRichiesta({
        ...base,
        tipo: "foto_capitolato",
        files: [...base.files, { nome: "cap.pdf", mime: "application/pdf", size: 100 }],
      }).ok,
    ).toBe(true);
  });
  it("rifiuta troppi file, file troppo grandi, MIME non ammessi", () => {
    const tanti = Array.from({ length: MAX_FILES + 1 }, () => base.files[0]);
    expect(validaRichiesta({ ...base, files: tanti }).ok).toBe(false);
    expect(validaRichiesta({ ...base, files: [{ nome: "x.jpg", mime: "image/jpeg", size: 16 * 1024 * 1024 }] }).ok).toBe(false);
    expect(validaRichiesta({ ...base, files: [{ nome: "x.exe", mime: "application/x-msdownload", size: 10 }] }).ok).toBe(false);
  });
  it("normalizza: trim, email minuscola, telefono vuoto → null", () => {
    const r = validaRichiesta({ ...base, nome: "  Mario ", email: " Mario@Example.com ", telefono: " " });
    expect(r.ok && r.data).toMatchObject({ nome: "Mario", email: "mario@example.com", telefono: null });
  });
  it("descrizione minima 10 caratteri", () => {
    expect(validaRichiesta({ ...base, descrizione: "corto" }).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run → FAIL**

Run: `pnpm test src/lib/richieste/valida.test.ts`
Expected: FAIL "Cannot find module './valida'".

- [ ] **Step 3: Implementazione**

```ts
// src/lib/richieste/valida.ts
export const MAX_FILES = 10;
export const MAX_FILE_BYTES = 15 * 1024 * 1024;
export const MAX_RICHIESTE_ORA = 5;
export const MIME_IMMAGINI = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
export const MIME_DOCUMENTI = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];
export const MIME_AMMESSI = [...MIME_IMMAGINI, ...MIME_DOCUMENTI];

export type FileMeta = { nome: string; mime: string; size: number };
export type RichiestaTipo = "foto_descrizione" | "foto_capitolato";
export type RichiestaInput = {
  nome: string;
  email: string;
  telefono: string | null;
  tipo: RichiestaTipo;
  descrizione: string;
  comune: string | null;
  files: FileMeta[];
  honeypot: string;
};

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const opt = (v: unknown) => str(v) || null;

export function validaRichiesta(
  raw: Record<string, unknown>,
): { ok: true; data: RichiestaInput } | { ok: false; errore: string } {
  if (str(raw.honeypot)) return { ok: false, errore: "Richiesta non valida." };

  const nome = str(raw.nome);
  const email = str(raw.email).toLowerCase();
  const descrizione = str(raw.descrizione);
  const tipo = raw.tipo === "foto_capitolato" ? "foto_capitolato" : raw.tipo === "foto_descrizione" ? "foto_descrizione" : null;
  const files = Array.isArray(raw.files) ? (raw.files as FileMeta[]) : [];

  if (nome.length < 2) return { ok: false, errore: "Inserisci il tuo nome." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, errore: "Email non valida." };
  if (!tipo) return { ok: false, errore: "Scegli il tipo di richiesta." };
  if (descrizione.length < 10) return { ok: false, errore: "Descrivi il lavoro (almeno 10 caratteri)." };
  if (files.length > MAX_FILES) return { ok: false, errore: `Massimo ${MAX_FILES} file.` };
  for (const f of files) {
    if (!MIME_AMMESSI.includes(f.mime)) return { ok: false, errore: `Formato non ammesso: ${f.nome}` };
    if (f.size > MAX_FILE_BYTES) return { ok: false, errore: `File troppo grande (max 15 MB): ${f.nome}` };
  }
  if (!files.some((f) => MIME_IMMAGINI.includes(f.mime))) return { ok: false, errore: "Carica almeno una foto." };
  if (tipo === "foto_capitolato" && !files.some((f) => MIME_DOCUMENTI.includes(f.mime))) {
    return { ok: false, errore: "Carica anche il capitolato (PDF, Word o testo)." };
  }

  return {
    ok: true,
    data: { nome, email, telefono: opt(raw.telefono), tipo, descrizione, comune: opt(raw.comune), files, honeypot: "" },
  };
}
```

- [ ] **Step 4: Run → PASS**

Run: `pnpm test src/lib/richieste/valida.test.ts` — Expected: 8 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/richieste
git commit -m "Richieste servizio: validazione input con limiti su file e anti-bot"
```

---

### Task 3: Notifiche email + WhatsApp (best-effort)

**Files:**
- Create: `src/lib/notifiche/messaggio-richiesta.ts` (puro)
- Test: `src/lib/notifiche/messaggio-richiesta.test.ts`
- Create: `src/lib/notifiche/invia.ts` (fetch Resend + Green API)

**Interfaces:**
- Consumes: `RichiestaInput` (Task 2).
- Produces:
  - `testoRichiesta(r: RichiestaInput & { id: string }, adminUrl: string): { oggetto: string; testo: string }`
  - `notificaRichiesta(r: RichiestaInput & { id: string }): Promise<{ email: boolean; whatsapp: boolean }>` — non lancia mai.

- [ ] **Step 1: Test che falliscono**

```ts
// src/lib/notifiche/messaggio-richiesta.test.ts
import { describe, expect, it } from "vitest";

import { testoRichiesta } from "./messaggio-richiesta";

const r = {
  id: "abc",
  nome: "Mario Rossi",
  email: "mario@example.com",
  telefono: "3331234567",
  tipo: "foto_capitolato" as const,
  descrizione: "Rifacimento facciata",
  comune: "Benevento",
  files: [
    { nome: "f.jpg", mime: "image/jpeg", size: 1 },
    { nome: "c.pdf", mime: "application/pdf", size: 1 },
  ],
  honeypot: "",
};

describe("testoRichiesta", () => {
  it("contiene dati di contatto, tipo, conteggio file e link admin", () => {
    const { oggetto, testo } = testoRichiesta(r, "https://iop.example/admin/richieste/abc");
    expect(oggetto).toBe("Nuova richiesta preventivo 24h — Mario Rossi (Benevento)");
    expect(testo).toContain("Foto + capitolato");
    expect(testo).toContain("mario@example.com");
    expect(testo).toContain("3331234567");
    expect(testo).toContain("2 file");
    expect(testo).toContain("https://iop.example/admin/richieste/abc");
  });
  it("senza comune/telefono non stampa 'null'", () => {
    const { oggetto, testo } = testoRichiesta({ ...r, comune: null, telefono: null }, "u");
    expect(oggetto).toBe("Nuova richiesta preventivo 24h — Mario Rossi");
    expect(testo).not.toContain("null");
  });
});
```

- [ ] **Step 2: Run → FAIL** (`pnpm test src/lib/notifiche`)

- [ ] **Step 3: Implementazione**

```ts
// src/lib/notifiche/messaggio-richiesta.ts
import type { RichiestaInput } from "@/lib/richieste/valida";

const TIPO_LABEL = { foto_descrizione: "Foto + descrizione", foto_capitolato: "Foto + capitolato" } as const;

export function testoRichiesta(r: RichiestaInput & { id: string }, adminUrl: string) {
  const oggetto = `Nuova richiesta preventivo 24h — ${r.nome}${r.comune ? ` (${r.comune})` : ""}`;
  const righe = [
    `Tipo: ${TIPO_LABEL[r.tipo]}`,
    `Nome: ${r.nome}`,
    `Email: ${r.email}`,
    r.telefono ? `Telefono: ${r.telefono}` : null,
    r.comune ? `Comune: ${r.comune}` : null,
    `Allegati: ${r.files.length} file`,
    "",
    r.descrizione,
    "",
    `Apri: ${adminUrl}`,
  ].filter((x): x is string => x !== null);
  return { oggetto, testo: righe.join("\n") };
}
```

```ts
// src/lib/notifiche/invia.ts
import "server-only";

import type { RichiestaInput } from "@/lib/richieste/valida";

import { testoRichiesta } from "./messaggio-richiesta";

async function inviaEmail(oggetto: string, testo: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.RICHIESTE_EMAIL_FROM,
      to: (process.env.RICHIESTE_EMAIL_TO ?? "").split(",").map((s) => s.trim()).filter(Boolean),
      subject: oggetto,
      text: testo,
    }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}`);
}

async function inviaWhatsApp(testo: string) {
  const { GREEN_API_URL, GREEN_API_INSTANCE, GREEN_API_TOKEN, RICHIESTE_WHATSAPP_CHAT_ID } = process.env;
  const res = await fetch(`${GREEN_API_URL}/waInstance${GREEN_API_INSTANCE}/sendMessage/${GREEN_API_TOKEN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId: RICHIESTE_WHATSAPP_CHAT_ID, message: testo }),
  });
  if (!res.ok) throw new Error(`greenapi ${res.status}`);
}

export async function notificaRichiesta(r: RichiestaInput & { id: string }) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const { oggetto, testo } = testoRichiesta(r, `${base}/admin/richieste/${r.id}`);
  const [email, whatsapp] = await Promise.allSettled([inviaEmail(oggetto, testo), inviaWhatsApp(`*${oggetto}*\n\n${testo}`)]);
  return { email: email.status === "fulfilled", whatsapp: whatsapp.status === "fulfilled" };
}
```
Aggiungere `NEXT_PUBLIC_SITE_URL=` a `.env.example`.

- [ ] **Step 4: Run → PASS** (`pnpm test src/lib/notifiche` — 2 passed) + `npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add src/lib/notifiche .env.example
git commit -m "Richieste servizio: notifica email (Resend) e WhatsApp (Green API)"
```

---

### Task 4: Server actions INVIA FILE + pagina pubblica `/invia`

**Files:**
- Create: `src/app/invia/actions.ts`
- Create: `src/app/invia/page.tsx`
- Create: `src/app/invia/invia-form.tsx` (client)
- Modify: `src/lib/supabase/proxy.ts:39-44` (aggiungere `/invia`)

**Interfaces:**
- Consumes: `createAdminClient` (T1), `validaRichiesta`, `MAX_RICHIESTE_ORA` (T2), `notificaRichiesta` (T3).
- Produces:
  - `preparaUpload(files: FileMeta[]): Promise<{ ok: true; cartella: string; uploads: { path: string; token: string }[] } | { ok: false; errore: string }>`
  - `inviaRichiesta(input: Record<string, unknown> & { cartella: string; paths: string[] }): Promise<{ ok: true } | { ok: false; errore: string }>`

Flusso: il client chiama `preparaUpload` con i metadati → riceve signed upload token → carica ogni file con `supabase.storage.from("richieste").uploadToSignedUrl(path, token, file)` (client anon) → chiama `inviaRichiesta`. Così i file non passano dalla server action (limite body 4.5 MB su Vercel).

- [ ] **Step 1: Leggere doc Next 16** su server actions e forms: `ls node_modules/next/dist/docs/` e aprire le guide "server actions"/"forms". Annotare differenze rispetto a Next 15 se presenti.

- [ ] **Step 2: Rendere pubblica la route**

`src/lib/supabase/proxy.ts`:
```ts
  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/invia") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/auth");
```

- [ ] **Step 3: Server actions**

```ts
// src/app/invia/actions.ts
"use server";

import { randomUUID } from "node:crypto";

import { notificaRichiesta } from "@/lib/notifiche/invia";
import { MAX_RICHIESTE_ORA, validaRichiesta, type FileMeta } from "@/lib/richieste/valida";
import { createAdminClient } from "@/lib/supabase/admin";

const safe = (nome: string) => nome.normalize("NFKD").replace(/[^\w.-]+/g, "_").slice(-80);

export async function preparaUpload(files: FileMeta[]) {
  // Valida solo i file (con dati fittizi per il resto): stessi limiti del submit.
  const check = validaRichiesta({
    nome: "xx", email: "a@b.it", tipo: "foto_descrizione", descrizione: "x".repeat(10), files, honeypot: "",
  });
  if (!check.ok && !check.errore.startsWith("Carica")) return { ok: false as const, errore: check.errore };

  const supabase = createAdminClient();
  const cartella = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}`;
  const uploads = [];
  for (const [i, f] of files.entries()) {
    const path = `${cartella}/${i}-${safe(f.nome)}`;
    const { data, error } = await supabase.storage.from("richieste").createSignedUploadUrl(path);
    if (error || !data) return { ok: false as const, errore: "Upload non disponibile, riprova." };
    uploads.push({ path, token: data.token });
  }
  return { ok: true as const, cartella, uploads };
}

export async function inviaRichiesta(input: Record<string, unknown> & { cartella: string; paths: string[] }) {
  const v = validaRichiesta(input);
  if (!v.ok) return v;
  const r = v.data;
  // I path devono stare nella cartella firmata, uno per file.
  if (input.paths.length !== r.files.length || input.paths.some((p) => !p.startsWith(`${input.cartella}/`))) {
    return { ok: false as const, errore: "Richiesta non valida." };
  }

  const supabase = createAdminClient();
  const unOraFa = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await supabase
    .from("richieste_servizio")
    .select("id", { count: "exact", head: true })
    .eq("email", r.email)
    .gte("created_at", unOraFa);
  if ((count ?? 0) >= MAX_RICHIESTE_ORA) return { ok: false as const, errore: "Troppe richieste, riprova più tardi." };

  const files = r.files.map((f, i) => ({ ...f, path: input.paths[i] }));
  const { data, error } = await supabase
    .from("richieste_servizio")
    .insert({ nome: r.nome, email: r.email, telefono: r.telefono, tipo: r.tipo, descrizione: r.descrizione, comune: r.comune, files })
    .select("id")
    .single();
  if (error || !data) return { ok: false as const, errore: "Invio non riuscito, riprova." };

  // Prima salvo, poi notifico: una notifica fallita non perde la richiesta.
  const esito = await notificaRichiesta({ ...r, id: data.id });
  await supabase
    .from("richieste_servizio")
    .update({ notifica_email_ok: esito.email, notifica_whatsapp_ok: esito.whatsapp })
    .eq("id", data.id);

  return { ok: true as const };
}
```

- [ ] **Step 4: Form client**

```tsx
// src/app/invia/invia-form.tsx
"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/client";

import { inviaRichiesta, preparaUpload } from "./actions";

export function InviaForm({ tipoIniziale }: { tipoIniziale: "foto_descrizione" | "foto_capitolato" }) {
  const [files, setFiles] = useState<File[]>([]);
  const [stato, setStato] = useState<"idle" | "invio" | "ok">("idle");
  const [errore, setErrore] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrore(null);
    setStato("invio");
    const fd = new FormData(e.currentTarget);
    const meta = files.map((f) => ({ nome: f.name, mime: f.type, size: f.size }));
    const prep = await preparaUpload(meta);
    if (!prep.ok) return fail(prep.errore);

    const supabase = createClient();
    for (const [i, u] of prep.uploads.entries()) {
      const { error } = await supabase.storage.from("richieste").uploadToSignedUrl(u.path, u.token, files[i]);
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
      {errore ? <p className="text-sm text-[color:var(--color-error,#b00020)]">{errore}</p> : null}
      <Button type="submit" disabled={stato === "invio"} className="self-start">
        {stato === "invio" ? "Invio in corso…" : "Invia file"}
      </Button>
    </form>
  );
}
```
(Se in `globals.css` esiste già un token errore, usarlo al posto del fallback.)

```tsx
// src/app/invia/page.tsx
import { InviaForm } from "./invia-form";

export const metadata = { title: "Invia file — preventivo in 24 ore | iop" };

export default async function InviaPage({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const { tipo } = await searchParams;
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-[var(--spacing-section)]">
      <p className="eyebrow mb-4 text-stone">Servizio</p>
      <h1 className="display-lg text-ink">Il tuo preventivo in 24 ore, garantito.</h1>
      <p className="mt-4 mb-10 text-graphite">
        Inviaci le foto con una descrizione, oppure le foto con il capitolato. Ci pensiamo noi.
      </p>
      <InviaForm tipoIniziale={tipo === "capitolato" ? "foto_capitolato" : "foto_descrizione"} />
    </main>
  );
}
```

- [ ] **Step 5: Verifica manuale**

```bash
npx tsc --noEmit && pnpm lint && pnpm dev
```
Da browser **non loggato** su `http://localhost:3000/invia`: inviare 1 foto + descrizione. Expected: messaggio "Richiesta ricevuta", riga in `richieste_servizio` con `files[0].path`, file presente nel bucket `richieste`, email e WhatsApp arrivati (`notifica_email_ok = true`, `notifica_whatsapp_ok = true`). Provare honeypot compilato da devtools → errore. Provare `foto_capitolato` senza PDF → "Carica anche il capitolato".

- [ ] **Step 6: Commit**

```bash
git add src/app/invia src/lib/supabase/proxy.ts
git commit -m "INVIA FILE: pagina pubblica con upload diretto e notifica al team"
```

---

### Task 5: Nuova home (hero + INVIA FILE + tre modalità)

**Files:**
- Modify: `src/app/page.tsx` (riscrittura hero + sezione modalità)

**Interfaces:**
- Consumes: route `/invia` (T4).

- [ ] **Step 1: Invocare skill `design-taste-frontend`** (obbligatoria per lavoro frontend) e rileggere `DESIGN.md`.

- [ ] **Step 2: Hero nuovo** — sostituire la `<section>` hero (`src/app/page.tsx:18-36`):

```tsx
<section className="py-[var(--spacing-section)]">
  <p className="eyebrow mb-4 text-stone">Io Preventivo</p>
  <h1 className="display-xl max-w-4xl text-ink md:text-[64px] md:leading-[0.98]">
    Il tuo preventivo in un click.
  </h1>
  <p className="mt-6 max-w-2xl text-xl leading-snug text-graphite">
    Oppure inviaci foto + descrizione o foto + capitolato e il tuo preventivo
    arriva in <strong className="text-ink">24 ore, garantito</strong>.
  </p>
  <div className="mt-10 flex flex-col items-start gap-3">
    <ButtonLink href="/invia" className="px-10 py-4 text-base">
      Invia file
    </ButtonLink>
    <span className="text-sm text-muted">Nessuna registrazione. Ci pensiamo noi.</span>
  </div>
</section>
```
(Se `ButtonLink` non accetta `className`, aggiungerlo in `src/components/ui/button.tsx` facendo merge con le classi di variante.)

- [ ] **Step 3: Sezione "Fai da te"** — sostituire la griglia (`src/app/page.tsx:39-72`) con titolo di sezione + 3 card, ognuna con CTA:

```tsx
<section className="pb-[var(--spacing-section)]">
  <p className="eyebrow mb-4 text-stone">Fai da te</p>
  <h2 className="display-md mb-10 max-w-2xl text-ink">Preferisci farlo tu? Tre modi, pronti in minuti.</h2>
  <div className="grid gap-px overflow-hidden border border-hairline md:grid-cols-3">
    {[
      { eyebrow: "Componi", titolo: "Componi il tuo preventivo", testo: "Scegli le voci dal prezzario regionale o dalla tua libreria prezzi, quantità e misure: il preventivo si compone da sé.", href: "/signup?next=/preventivi/nuovo?modalita=manuale", cta: "Componi", cls: "bg-canvas text-ink" },
      { eyebrow: "Da foto", titolo: "Genera da foto", testo: "Fotografa la facciata, segna i danni con i punti numerati: l'AI genera le voci con descrizioni e prezzi.", href: "/signup?next=/preventivi/nuovo?modalita=foto", cta: "Genera da foto", cls: "bg-surface-soft text-ink" },
      { eyebrow: "Da capitolato", titolo: "Genera da capitolato", testo: "Carica capitolato o computo metrico: IOP riconosce le voci e le abbina al prezzario e ai tuoi prezzi.", href: "/signup?next=/preventivi/nuovo?modalita=capitolato", cta: "Genera da capitolato", cls: "bg-scrim text-on-primary" },
    ].map((m) => (
      <article key={m.eyebrow} className={`flex flex-col p-12 ${m.cls}`}>
        <p className="eyebrow mb-4 opacity-60">{m.eyebrow}</p>
        <h3 className="display-md mb-4">{m.titolo}</h3>
        <p className="flex-1 text-base leading-relaxed opacity-80">{m.testo}</p>
        <div className="mt-8">
          <ButtonLink href={m.href} variant={m.cls.includes("scrim") ? "secondary" : "primary"}>{m.cta}</ButtonLink>
        </div>
      </article>
    ))}
  </div>
</section>
```
Verificare che `signup` gestisca `?next=` (`src/app/(auth)/auth-form.tsx`); se non lo fa, usare `?redirect=` come fa il proxy, o aggiungere il redirect post-login in quel file.

- [ ] **Step 4: Verifica** — `pnpm lint && pnpm dev`, controllare `/` a 375px e 1280px: nessuno scroll orizzontale, "Invia file" è il primo elemento cliccabile sotto il titolo, le tre CTA portano a signup → nuovo preventivo con la modalità giusta.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/components/ui/button.tsx
git commit -m "Home: hero preventivo in un click / 24 ore con INVIA FILE e tre modalità fai da te"
```

---

### Task 6: Admin richieste

**Files:**
- Create: `src/lib/admin.ts`
- Create: `src/app/(app)/admin/richieste/page.tsx`
- Create: `src/app/(app)/admin/richieste/[id]/page.tsx`
- Create: `src/app/(app)/admin/richieste/actions.ts`
- Modify: `src/app/(app)/nav.tsx` (voce "Richieste" solo per admin)

**Interfaces:**
- Consumes: `createAdminClient` (T1), `requireContext` (`src/lib/auth.ts`).
- Produces: `isPlatformAdmin(email: string | null | undefined): boolean`, `requirePlatformAdmin(): Promise<{ email: string }>`, `setStatoRichiesta(id: string, stato: RichiestaStato): Promise<void>`.

- [ ] **Step 1: Guard**

```ts
// src/lib/admin.ts
import "server-only";

import { notFound } from "next/navigation";

import { requireContext } from "@/lib/auth";

export function isPlatformAdmin(email: string | null | undefined) {
  const list = (process.env.IOP_ADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return !!email && list.includes(email.toLowerCase());
}

export async function requirePlatformAdmin() {
  const ctx = await requireContext();
  if (!isPlatformAdmin(ctx.email)) notFound();
  return { email: ctx.email! };
}
```

- [ ] **Step 2: Lista** — `page.tsx` server: `await requirePlatformAdmin()`, `createAdminClient().from("richieste_servizio").select("*").order("created_at", { ascending: false }).limit(200)`. Tabella: data (`formatDate`), nome, comune, tipo, n. file, stato (badge), icone notifiche fallite (`notifica_email_ok === false` → "email ✗"). Riga → `/admin/richieste/[id]`.

- [ ] **Step 3: Dettaglio** — dati contatto (link `mailto:` e `tel:`), descrizione, per ogni file `createSignedUrl(path, 3600)` → anteprima `<img>` per immagini, link per documenti; `<form>` con `<Select name="stato">` + `note_interne` → `setStatoRichiesta`.

```ts
// src/app/(app)/admin/richieste/actions.ts
"use server";

import { revalidatePath } from "next/cache";

import { requirePlatformAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

type Stato = Database["public"]["Enums"]["richiesta_stato"];

export async function setStatoRichiesta(id: string, formData: FormData) {
  await requirePlatformAdmin();
  const stato = String(formData.get("stato")) as Stato;
  const note = String(formData.get("note_interne") ?? "").trim() || null;
  await createAdminClient().from("richieste_servizio").update({ stato, note_interne: note }).eq("id", id);
  revalidatePath(`/admin/richieste/${id}`);
  revalidatePath("/admin/richieste");
}
```

- [ ] **Step 4: Nav** — in `src/app/(app)/layout.tsx` calcolare `isPlatformAdmin(ctx.email)` e passarlo ad `AppNav` come prop; in `nav.tsx` aggiungere il link "Richieste" solo se `true`.

- [ ] **Step 5: Verifica** — con email in `IOP_ADMIN_EMAILS` la pagina mostra la richiesta del Task 4 con le foto; con un altro utente `/admin/richieste` → 404. `npx tsc --noEmit && pnpm lint && pnpm build`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/admin.ts "src/app/(app)/admin" "src/app/(app)/nav.tsx" "src/app/(app)/layout.tsx"
git commit -m "Admin: lista e dettaglio richieste preventivo 24h"
```

---

## BLOCCO B — Prezzario regionale

### Task 7: Schema prezzari + ricerca full-text

**Files:**
- Create: `supabase/migrations/20261014091000_prezzari.sql`

**Interfaces:**
- Produces: tabelle `prezzari`, `prezzario_voci`; colonna `organizations.regione`; RPC `cerca_prezzario(q text, p_regione text, p_limit int default 10)` → `setof prezzario_voci` (con `rank`).

- [ ] **Step 1: Migrazione**

```sql
-- 20261014091000_prezzari.sql
create extension if not exists unaccent;

create table public.prezzari (
  id uuid primary key default gen_random_uuid(),
  regione text not null,          -- slug: 'campania', 'puglia', ...
  anno integer not null,
  titolo text not null,           -- es. 'Prezzario Regione Campania 2025'
  attivo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (regione, anno)
);

create table public.prezzario_voci (
  id uuid primary key default gen_random_uuid(),
  prezzario_id uuid not null references public.prezzari (id) on delete cascade,
  codice text not null,
  capitolo text,
  descrizione text not null,
  unita_testo text not null,                 -- come nel prezzario ('m²', 'cad', ...)
  unita public.unita_misura not null,        -- mappata
  prezzo numeric(12, 2) not null,
  search tsvector generated always as (
    to_tsvector('italian', coalesce(codice, '') || ' ' || coalesce(capitolo, '') || ' ' || descrizione)
  ) stored,
  unique (prezzario_id, codice)
);
create index prezzario_voci_search_idx on public.prezzario_voci using gin (search);

alter table public.organizations add column regione text not null default 'campania';

alter table public.prezzari enable row level security;
alter table public.prezzario_voci enable row level security;
create policy prezzari_read on public.prezzari for select to authenticated using (true);
create policy prezzario_voci_read on public.prezzario_voci for select to authenticated using (true);
-- Scrittura solo via service role (script di import).

-- Ricerca: termini in OR, ordinati per rank, solo prezzario attivo più recente della regione.
create or replace function public.cerca_prezzario(q text, p_regione text, p_limit int default 10)
returns table (id uuid, codice text, descrizione text, unita public.unita_misura, unita_testo text, prezzo numeric, prezzario text, rank real)
language sql stable security invoker set search_path = public as $$
  with p as (
    select id, titolo from prezzari
    where regione = p_regione and attivo
    order by anno desc limit 1
  ), tq as (
    select to_tsquery('italian', string_agg(w, ' | ')) as query
    from regexp_split_to_table(lower(unaccent(q)), '[^a-z0-9]+') w
    where length(w) > 2
  )
  select v.id, v.codice, v.descrizione, v.unita, v.unita_testo, v.prezzo, p.titolo, ts_rank(v.search, tq.query)
  from prezzario_voci v join p on v.prezzario_id = p.id, tq
  where tq.query is not null and v.search @@ tq.query
  order by ts_rank(v.search, tq.query) desc
  limit p_limit;
$$;
grant execute on function public.cerca_prezzario(text, text, int) to authenticated;
```

- [ ] **Step 2: Push + tipi** (`supabase db push`, `gen types`), `npx tsc --noEmit`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20261014091000_prezzari.sql src/lib/supabase/types.ts
git commit -m "Prezzari regionali: schema multi-regione e ricerca full-text"
```

---

### Task 8: Import Prezzario Regione Campania

**Files:**
- Create: `scripts/prezzario/parse.ts` (puro)
- Test: `scripts/prezzario/parse.test.ts`
- Create: `scripts/prezzario/importa.ts` (CLI)
- Modify: `package.json` (devDep `exceljs`, `tsx`; script `prezzario:import`)

**Interfaces:**
- Produces:
  - `mapUnita(u: string): UnitaMisura` (`"corpo"|"mq"|"ml"|"mc"|"giorno"|"cad"|"kg"`)
  - `type RigaGrezza = { codice: string; descrizione: string; unita: string; prezzo: string | number | null }`
  - `normalizzaRighe(righe: RigaGrezza[]): { codice: string; capitolo: string | null; descrizione: string; unita_testo: string; unita: UnitaMisura; prezzo: number }[]`

- [ ] **Step 1: Procurarsi il file** — scaricare dal sito Regione Campania (Lavori Pubblici → Prezzario regionale) l'ultima edizione in **Excel**. Salvarlo in `scripts/prezzario/data/campania-<anno>.xlsx` (aggiungere `scripts/prezzario/data/` a `.gitignore`). Aprirlo e annotare nomi colonne e nome del foglio; se il formato è solo PDF, fermarsi e chiedere a Ivan.

- [ ] **Step 2: Test che falliscono**

```ts
// scripts/prezzario/parse.test.ts
import { describe, expect, it } from "vitest";

import { mapUnita, normalizzaRighe } from "./parse";

describe("mapUnita", () => {
  it.each([
    ["m²", "mq"], ["mq", "mq"], ["m2", "mq"], ["m", "ml"], ["ml", "ml"], ["m³", "mc"], ["mc", "mc"],
    ["cad", "cad"], ["cadauno", "cad"], ["n.", "cad"], ["kg", "kg"], ["giorno", "giorno"], ["h", "corpo"], ["a corpo", "corpo"],
  ])("%s → %s", (u, atteso) => expect(mapUnita(u)).toBe(atteso));
});

describe("normalizzaRighe", () => {
  it("le sottovoci ereditano il testo dell'articolo padre senza prezzo", () => {
    const out = normalizzaRighe([
      { codice: "E.08", descrizione: "INTONACI", unita: "", prezzo: null },
      { codice: "E.08.010", descrizione: "Intonaco civile per esterni composto da rinzaffo e arriccio", unita: "", prezzo: null },
      { codice: "E.08.010.a", descrizione: "su pareti verticali", unita: "m²", prezzo: "24,50" },
      { codice: "E.08.010.b", descrizione: "su soffitti", unita: "m²", prezzo: 27.1 },
    ]);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({
      codice: "E.08.010.a",
      capitolo: "INTONACI",
      descrizione: "Intonaco civile per esterni composto da rinzaffo e arriccio - su pareti verticali",
      unita_testo: "m²",
      unita: "mq",
      prezzo: 24.5,
    });
    expect(out[1].prezzo).toBe(27.1);
  });
  it("scarta righe senza codice o con prezzo non numerico/≤0 e deduplica il codice", () => {
    const out = normalizzaRighe([
      { codice: "", descrizione: "x", unita: "m²", prezzo: 1 },
      { codice: "A.1", descrizione: "voce", unita: "m²", prezzo: "n.d." },
      { codice: "A.2", descrizione: "voce", unita: "m²", prezzo: 0 },
      { codice: "A.3", descrizione: "voce", unita: "m²", prezzo: 5 },
      { codice: "A.3", descrizione: "voce bis", unita: "m²", prezzo: 6 },
    ]);
    expect(out.map((r) => r.codice)).toEqual(["A.3"]);
  });
});
```

- [ ] **Step 3: Run → FAIL** (`pnpm test scripts/prezzario`)

- [ ] **Step 4: Implementazione**

```ts
// scripts/prezzario/parse.ts
export type UnitaMisura = "corpo" | "mq" | "ml" | "mc" | "giorno" | "cad" | "kg";
export type RigaGrezza = { codice: string; descrizione: string; unita: string; prezzo: string | number | null };

export function mapUnita(u: string): UnitaMisura {
  const s = u.toLowerCase().replace(/\s+/g, "").replace("³", "3").replace("²", "2");
  if (["mq", "m2"].includes(s)) return "mq";
  if (["mc", "m3"].includes(s)) return "mc";
  if (["m", "ml"].includes(s)) return "ml";
  if (["cad", "cadauno", "n", "n.", "nr", "nr."].includes(s)) return "cad";
  if (["kg"].includes(s)) return "kg";
  if (["giorno", "gg", "g"].includes(s)) return "giorno";
  return "corpo";
}

function prezzoNum(p: RigaGrezza["prezzo"]): number | null {
  if (p == null || p === "") return null;
  const n = typeof p === "number" ? p : Number(String(p).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

export function normalizzaRighe(righe: RigaGrezza[]) {
  const padri = new Map<string, string>(); // codice → descrizione, per righe senza prezzo
  const out: { codice: string; capitolo: string | null; descrizione: string; unita_testo: string; unita: UnitaMisura; prezzo: number }[] = [];
  const visti = new Set<string>();
  for (const r of righe) {
    const codice = r.codice?.trim();
    const desc = r.descrizione?.trim().replace(/\s+/g, " ");
    if (!codice || !desc) continue;
    const prezzo = prezzoNum(r.prezzo);
    if (prezzo == null) {
      if (!r.unita?.trim()) padri.set(codice, desc);
      continue;
    }
    if (visti.has(codice)) continue;
    visti.add(codice);
    // antenati = codici padre che sono prefisso del codice corrente
    const antenati = [...padri.keys()].filter((c) => codice.startsWith(`${c}.`)).sort((a, b) => a.length - b.length);
    const capitolo = antenati.length ? padri.get(antenati[0])! : null;
    const prefissi = antenati.slice(1).map((c) => padri.get(c)!);
    out.push({
      codice,
      capitolo,
      descrizione: [...prefissi, desc].join(" - "),
      unita_testo: r.unita.trim(),
      unita: mapUnita(r.unita),
      prezzo,
    });
  }
  return out;
}
```

- [ ] **Step 5: Run → PASS**

- [ ] **Step 6: CLI di import**

```bash
pnpm add -D exceljs tsx
```
`package.json` → `"prezzario:import": "tsx --env-file=.env.local scripts/prezzario/importa.ts"`.

```ts
// scripts/prezzario/importa.ts
// Uso: pnpm prezzario:import <file.xlsx> <regione> <anno> "<titolo>" <foglio> <colCodice> <colDescrizione> <colUnita> <colPrezzo>
// Esempio: pnpm prezzario:import scripts/prezzario/data/campania-2025.xlsx campania 2025 "Prezzario Regione Campania 2025" 1 A B C D
import ExcelJS from "exceljs";
import { createClient } from "@supabase/supabase-js";

import { normalizzaRighe, type RigaGrezza } from "./parse";

const [file, regione, anno, titolo, foglio, cCod, cDesc, cUm, cPrezzo] = process.argv.slice(2);
const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(file);
const ws = wb.worksheets[Number(foglio) - 1];
const cell = (row: ExcelJS.Row, col: string) => {
  const v = row.getCell(col).value;
  return v && typeof v === "object" && "result" in v ? (v.result as string | number) : (v as string | number | null);
};
const righe: RigaGrezza[] = [];
ws.eachRow((row) =>
  righe.push({ codice: String(cell(row, cCod) ?? ""), descrizione: String(cell(row, cDesc) ?? ""), unita: String(cell(row, cUm) ?? ""), prezzo: cell(row, cPrezzo) }),
);
const voci = normalizzaRighe(righe);
console.log(`Righe lette: ${righe.length}, voci valide: ${voci.length}`);

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const { data: p, error } = await sb.from("prezzari").upsert({ regione, anno: Number(anno), titolo, attivo: true }, { onConflict: "regione,anno" }).select("id").single();
if (error || !p) throw error;
for (let i = 0; i < voci.length; i += 500) {
  const { error: e } = await sb.from("prezzario_voci").upsert(voci.slice(i, i + 500).map((v) => ({ ...v, prezzario_id: p.id })), { onConflict: "prezzario_id,codice" });
  if (e) throw e;
  process.stdout.write(`\r${Math.min(i + 500, voci.length)}/${voci.length}`);
}
console.log("\nOK");
```

- [ ] **Step 7: Eseguire import Campania** e verificare in SQL:

```sql
select count(*) from prezzario_voci;  -- atteso: migliaia
select * from cerca_prezzario('intonaco civile esterni', 'campania', 5);  -- atteso: voci intonaco con prezzo €/m²
select * from cerca_prezzario('ponteggio tubolare', 'campania', 5);
```
Controllare a campione 5 voci contro il PDF ufficiale (codice, prezzo, unità).

- [ ] **Step 8: Commit**

```bash
git add scripts/prezzario package.json pnpm-lock.yaml .gitignore
git commit -m "Prezzario: import da Excel con voci gerarchiche, caricato Campania"
```

---

### Task 9: Regione nelle impostazioni

**Files:**
- Modify: `src/app/(app)/impostazioni/settings-form.tsx`
- Modify: `src/app/(app)/impostazioni/actions.ts` (salva `regione`)
- Modify: `src/app/(app)/impostazioni/page.tsx` (carica `prezzari` attivi per la select)

- [ ] **Step 1:** In `page.tsx` leggere `supabase.from("prezzari").select("regione, titolo").eq("attivo", true).order("anno", { ascending: false })`, deduplicare per regione, passare `regioni: { regione: string; titolo: string }[]` al form.
- [ ] **Step 2:** Nel form: `<Field label="Prezzario regionale" hint="Base per descrizioni e prezzi delle voci"><Select name="regione" defaultValue={org.regione}>…</Select></Field>`. Option `value={r.regione}` con testo `r.titolo`.
- [ ] **Step 3:** Nell'action di salvataggio aggiungere `regione: String(formData.get("regione") ?? "campania")` all'update di `organizations`.
- [ ] **Step 4:** Verifica: cambiare e salvare, ricaricare, valore persistito. `npx tsc --noEmit && pnpm lint`.
- [ ] **Step 5: Commit** — `git commit -m "Impostazioni: scelta del prezzario regionale"`

---

## BLOCCO C — Libreria personale da vecchi preventivi

### Task 10: Schema `documenti_libreria` + `voci_proprie`

**Files:**
- Create: `supabase/migrations/20261014092000_libreria_personale.sql`

**Interfaces:**
- Produces: tabelle `documenti_libreria`, `voci_proprie`; RPC `cerca_voci_proprie(q text, p_org uuid, p_limit int default 5)`.

- [ ] **Step 1: Migrazione**

```sql
-- 20261014092000_libreria_personale.sql
create type public.documento_stato as enum ('caricato', 'in_elaborazione', 'elaborato', 'errore');

create table public.documenti_libreria (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  storage_path text not null,       -- bucket 'preventivi': {org_id}/libreria/{uuid}-{nome}
  nome_file text not null,
  stato public.documento_stato not null default 'caricato',
  voci_estratte integer not null default 0,
  errore text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create table public.voci_proprie (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  documento_id uuid references public.documenti_libreria (id) on delete set null,
  titolo text not null,
  descrizione text not null,
  unita public.unita_misura not null default 'corpo',
  prezzo numeric(12, 2) not null,
  categoria text,
  search tsvector generated always as (
    to_tsvector('italian', titolo || ' ' || coalesce(categoria, '') || ' ' || descrizione)
  ) stored,
  created_at timestamptz not null default now()
);
create index voci_proprie_search_idx on public.voci_proprie using gin (search);
create index voci_proprie_org_idx on public.voci_proprie (org_id);

alter table public.documenti_libreria enable row level security;
alter table public.voci_proprie enable row level security;
create policy documenti_libreria_org on public.documenti_libreria for all to authenticated
  using (org_id in (select public.user_org_ids())) with check (org_id in (select public.user_org_ids()));
create policy voci_proprie_org on public.voci_proprie for all to authenticated
  using (org_id in (select public.user_org_ids())) with check (org_id in (select public.user_org_ids()));

create or replace function public.cerca_voci_proprie(q text, p_org uuid, p_limit int default 5)
returns table (id uuid, titolo text, descrizione text, unita public.unita_misura, prezzo numeric, rank real)
language sql stable security invoker set search_path = public as $$
  with tq as (
    select to_tsquery('italian', string_agg(w, ' | ')) as query
    from regexp_split_to_table(lower(unaccent(q)), '[^a-z0-9]+') w
    where length(w) > 2
  )
  select v.id, v.titolo, v.descrizione, v.unita, v.prezzo, ts_rank(v.search, tq.query)
  from voci_proprie v, tq
  where v.org_id = p_org and tq.query is not null and v.search @@ tq.query
  order by ts_rank(v.search, tq.query) desc
  limit p_limit;
$$;
grant execute on function public.cerca_voci_proprie(text, uuid, int) to authenticated;
```
Nota: `security invoker` + RLS garantiscono che `p_org` di un'altra org non restituisca nulla.

- [ ] **Step 2:** Push + tipi + `npx tsc --noEmit`.
- [ ] **Step 3: Commit** — `git commit -m "Libreria personale: documenti caricati e voci proprie con ricerca"`

---

### Task 11: Edge function `importa-preventivi` + UI libreria

**Files:**
- Create: `supabase/functions/importa-preventivi/index.ts` (basata su `extract-listino/index.ts`)
- Create: `src/app/(app)/libreria/import-preventivi.tsx` (client)
- Create: `src/app/(app)/libreria/voci-proprie.tsx` (lista + modifica/elimina)
- Modify: `src/app/(app)/libreria/page.tsx` (montare i due componenti sopra `import-listino`)
- Modify: `src/app/(app)/libreria/actions.ts` (`updateVocePropria`, `deleteVocePropria`, `deleteDocumentoLibreria`)

**Interfaces:**
- Produces: invoke `importa-preventivi` con body `{ documento_id: string }` → `{ voci: number }`. La funzione legge il file da Storage (non base64 dal client), aggiorna `documenti_libreria.stato`.

- [ ] **Step 1: Edge function** — copiare struttura, CORS, auth e chiamata Anthropic da `supabase/functions/extract-listino/index.ts`. Differenze:
  - Input `{ documento_id }`; con il client utente leggere `documenti_libreria` (RLS), `update stato='in_elaborazione'`, `storage.from("preventivi").download(storage_path)` → base64 → blocco `document` (PDF) o `image`.
  - Schema output:
    ```ts
    const SCHEMA = {
      type: "object",
      additionalProperties: false,
      required: ["voci"],
      properties: {
        voci: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["titolo", "descrizione", "unita", "prezzo", "categoria"],
            properties: {
              titolo: { type: "string", description: "Nome breve della lavorazione" },
              descrizione: { type: "string", description: "Descrizione COMPLETA come scritta nel preventivo, senza riassumere" },
              unita: { type: "string", enum: ["corpo", "mq", "ml", "mc", "giorno", "cad", "kg"] },
              prezzo: { type: "number", description: "Prezzo UNITARIO in euro (non l'importo totale)" },
              categoria: { type: "string" },
            },
          },
        },
      },
    };
    ```
  - System prompt: "Estrai da questo preventivo edile tutte le voci di lavorazione con prezzo unitario. Mantieni il testo della descrizione così come scritto dalla ditta: è la sua libreria personale. Ignora totali, IVA, condizioni di pagamento. Se una voce ha solo l'importo a corpo, unita='corpo' e prezzo=importo."
  - Scrittura: scarta voci con `prezzo <= 0`; dedup con voci esistenti dell'org per `lower(titolo)+unita` (aggiorna prezzo e descrizione se cambiano, altrimenti salta); insert con `documento_id`; `update documenti_libreria set stato='elaborato', voci_estratte=n`. In `catch`: `stato='errore', errore=msg`.
- [ ] **Step 2: Deploy** — `supabase functions deploy importa-preventivi --project-ref ycliptiwnhclfeijlnri`.
- [ ] **Step 3: UI upload** — `import-preventivi.tsx`: input multiplo PDF/immagini; per ogni file: upload su `preventivi/{org_id}/libreria/{uuid}-{nome}`, insert `documenti_libreria` (client Supabase, RLS), `functions.invoke("importa-preventivi", { body: { documento_id } })` in sequenza, progress "2/5 — 34 voci estratte". Testo: "Carica i tuoi vecchi preventivi: IOP ne estrae descrizioni e prezzi e li usa come tua libreria personale."
- [ ] **Step 4: UI lista** — `voci-proprie.tsx`: tabella voci (titolo, descrizione troncata espandibile, unità, prezzo, documento di origine), ricerca testuale client-side, modifica inline (form → `updateVocePropria`), elimina. Sezione documenti: nome, stato, voci estratte, elimina (cancella anche il file).
- [ ] **Step 5: Verifica** — caricare 2 PDF da `docs/VOCI edilizia corde/`. Expected: documenti `elaborato`, voci con descrizione completa e prezzo unitario. `select * from cerca_voci_proprie('intonaco', '<org_id>')` restituisce risultati.
- [ ] **Step 6: Commit** — `git commit -m "Libreria personale: import vecchi preventivi con estrazione voci"`

---

## BLOCCO D — Doppia descrizione + fonte prezzi nelle tre modalità

### Task 12: Logica pura di risoluzione voce (TDD)

**Files:**
- Create: `supabase/functions/_shared/risolvi-voce.ts`
- Test: `supabase/functions/_shared/risolvi-voce.test.ts`

Il file è puro (niente Deno/Node API) e viene importato sia dalle edge function (`../_shared/risolvi-voce.ts`) sia da Next (import relativo da `src/`).

**Interfaces:**
- Produces:
  - `type FontePrezzi = "prezzario" | "propri" | "entrambi"`
  - `type FonteScelta = "prezzario" | "propria" | "manuale"`
  - `type VoceCandidata = { descrizione: string; prezzo: number } | null`
  - `risolviVoce(fonte: FontePrezzi, prezzario: VoceCandidata, propria: VoceCandidata): { scelta: FonteScelta | null; descrizione: string | null; prezzo: number | null; avviso: string | null }`
  - `applicaScelta(scelta: "prezzario" | "propria", row: { descrizione_prezzario: string | null; prezzo_prezzario: number | null; descrizione_propria: string | null; prezzo_proprio: number | null }): { descrizione: string; prezzo_unitario: number; fonte_scelta: FonteScelta } | null`

- [ ] **Step 1: Test che falliscono**

```ts
// supabase/functions/_shared/risolvi-voce.test.ts
import { describe, expect, it } from "vitest";

import { applicaScelta, risolviVoce } from "./risolvi-voce";

const P = { descrizione: "Intonaco civile (prezzario)", prezzo: 24.5 };
const M = { descrizione: "Intonaco come lo facciamo noi", prezzo: 22 };

describe("risolviVoce", () => {
  it("entrambi + propria presente → propria come default", () => {
    expect(risolviVoce("entrambi", P, M)).toEqual({ scelta: "propria", descrizione: M.descrizione, prezzo: 22, avviso: null });
  });
  it("entrambi + propria mancante → prezzario (requisito cliente)", () => {
    expect(risolviVoce("entrambi", P, null)).toEqual({ scelta: "prezzario", descrizione: P.descrizione, prezzo: 24.5, avviso: null });
  });
  it("solo prezzario → prezzario anche se esiste la propria", () => {
    expect(risolviVoce("prezzario", P, M).scelta).toBe("prezzario");
  });
  it("solo propri senza propria → ricade sul prezzario con avviso", () => {
    expect(risolviVoce("propri", P, null)).toEqual({
      scelta: "prezzario", descrizione: P.descrizione, prezzo: 24.5,
      avviso: "Nessuna voce nella tua libreria: usata la voce del prezzario.",
    });
  });
  it("nessuna delle due → nulla da applicare", () => {
    expect(risolviVoce("entrambi", null, null)).toEqual({ scelta: null, descrizione: null, prezzo: null, avviso: null });
  });
});

describe("applicaScelta", () => {
  const row = { descrizione_prezzario: P.descrizione, prezzo_prezzario: 24.5, descrizione_propria: M.descrizione, prezzo_proprio: 22 };
  it("copia descrizione e prezzo della fonte scelta", () => {
    expect(applicaScelta("prezzario", row)).toEqual({ descrizione: P.descrizione, prezzo_unitario: 24.5, fonte_scelta: "prezzario" });
    expect(applicaScelta("propria", row)).toEqual({ descrizione: M.descrizione, prezzo_unitario: 22, fonte_scelta: "propria" });
  });
  it("fonte non disponibile → null", () => {
    expect(applicaScelta("propria", { ...row, descrizione_propria: null, prezzo_proprio: null })).toBeNull();
  });
});
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Implementazione**

```ts
// supabase/functions/_shared/risolvi-voce.ts
export type FontePrezzi = "prezzario" | "propri" | "entrambi";
export type FonteScelta = "prezzario" | "propria" | "manuale";
export type VoceCandidata = { descrizione: string; prezzo: number } | null;

export function risolviVoce(fonte: FontePrezzi, prezzario: VoceCandidata, propria: VoceCandidata) {
  const da = (scelta: "prezzario" | "propria", v: NonNullable<VoceCandidata>, avviso: string | null = null) => ({
    scelta, descrizione: v.descrizione, prezzo: v.prezzo, avviso,
  });
  if (fonte !== "prezzario" && propria) return da("propria", propria);
  if (prezzario) {
    return da("prezzario", prezzario, fonte === "propri" ? "Nessuna voce nella tua libreria: usata la voce del prezzario." : null);
  }
  return { scelta: null, descrizione: null, prezzo: null, avviso: null };
}

export function applicaScelta(
  scelta: "prezzario" | "propria",
  row: { descrizione_prezzario: string | null; prezzo_prezzario: number | null; descrizione_propria: string | null; prezzo_proprio: number | null },
) {
  const descrizione = scelta === "prezzario" ? row.descrizione_prezzario : row.descrizione_propria;
  const prezzo = scelta === "prezzario" ? row.prezzo_prezzario : row.prezzo_proprio;
  if (descrizione == null || prezzo == null) return null;
  return { descrizione, prezzo_unitario: Number(prezzo), fonte_scelta: scelta as FonteScelta };
}
```

- [ ] **Step 4: Run → PASS** (7 test)
- [ ] **Step 5: Commit** — `git commit -m "Doppia descrizione: regole di scelta tra prezzario e voce propria"`

---

### Task 13: Schema doppia descrizione + `fonte_prezzi` + selettore iniziale

**Files:**
- Create: `supabase/migrations/20261014093000_doppia_descrizione.sql`
- Modify: `src/app/(app)/preventivi/nuovo/page.tsx`
- Modify: `src/app/(app)/preventivi/nuovo/actions.ts`
- Modify: `src/app/(app)/preventivi/[id]/actions.ts` (`updateIntervento`)

**Interfaces:**
- Produces: `preventivi.fonte_prezzi`, colonne su `preventivo_interventi` (vedi SQL). `updateIntervento` imposta `fonte_scelta='manuale'` se la descrizione salvata differisce da quella della fonte scelta.

- [ ] **Step 1: Migrazione**

```sql
-- 20261014093000_doppia_descrizione.sql
create type public.fonte_prezzi as enum ('prezzario', 'propri', 'entrambi');
create type public.fonte_scelta as enum ('prezzario', 'propria', 'manuale');

alter table public.preventivi add column fonte_prezzi public.fonte_prezzi not null default 'entrambi';

alter table public.preventivo_interventi
  add column prezzario_voce_id uuid references public.prezzario_voci (id) on delete set null,
  add column codice_prezzario text,
  add column descrizione_prezzario text,
  add column prezzo_prezzario numeric(12, 2),
  add column voce_propria_id uuid references public.voci_proprie (id) on delete set null,
  add column descrizione_propria text,
  add column prezzo_proprio numeric(12, 2),
  add column fonte_scelta public.fonte_scelta,
  add column abbinamento_avviso text;
```

- [ ] **Step 2: Push + tipi.**

- [ ] **Step 3: Selettore nella pagina "nuovo"** — in `nuovo/page.tsx`, dentro il form prima di "Oggetto":

```tsx
<fieldset className="flex flex-col gap-2">
  <legend className="mb-1.5 text-sm font-medium text-ink">Da dove prendo descrizioni e prezzi?</legend>
  {[
    { v: "entrambi", t: "Entrambi", d: "Prezzario regionale + i tuoi prezzi: per ogni voce scegli quale tenere." },
    { v: "prezzario", t: "Solo prezzario regionale", d: "Descrizioni e prezzi ufficiali della tua regione." },
    { v: "propri", t: "Solo i miei prezzi", d: "Dalla tua libreria personale. Se manca una voce, si usa il prezzario." },
  ].map((o) => (
    <label key={o.v} className="flex cursor-pointer gap-3 rounded-md border border-hairline p-3 has-[:checked]:border-ink">
      <input type="radio" name="fonte_prezzi" value={o.v} defaultChecked={o.v === "entrambi"} className="mt-1" />
      <span>
        <span className="block text-sm font-medium text-ink">{o.t}</span>
        <span className="block text-sm text-graphite">{o.d}</span>
      </span>
    </label>
  ))}
</fieldset>
```
Se l'org non ha voci proprie (`count` su `voci_proprie` = 0), mostrare sotto un avviso con link a `/libreria`: "La tua libreria è vuota: carica i tuoi vecchi preventivi."

- [ ] **Step 4: Action** — in `createPreventivoAction`:

```ts
type FontePrezzi = Database["public"]["Enums"]["fonte_prezzi"];
const rawFonte = String(formData.get("fonte_prezzi") ?? "entrambi");
const fonte_prezzi = (["prezzario", "propri", "entrambi"].includes(rawFonte) ? rawFonte : "entrambi") as FontePrezzi;
```
e aggiungere `fonte_prezzi` all'insert.

- [ ] **Step 5: Modifica manuale = scelta "manuale"** — in `updateIntervento` (`[id]/actions.ts:173-196`), prima dell'update leggere `descrizione_prezzario, descrizione_propria, fonte_scelta` dell'intervento; se la nuova `descrizione` è diversa dalla descrizione della fonte attuale, aggiungere `fonte_scelta: "manuale"` all'update.

```ts
const { data: cur } = await supabase
  .from("preventivo_interventi")
  .select("descrizione_prezzario, descrizione_propria, fonte_scelta")
  .eq("id", interventoId)
  .single();
const nuovaDesc = s(formData.get("descrizione"));
const descFonte =
  cur?.fonte_scelta === "prezzario" ? cur.descrizione_prezzario : cur?.fonte_scelta === "propria" ? cur.descrizione_propria : null;
const fonte_scelta = cur?.fonte_scelta && cur.fonte_scelta !== "manuale" && nuovaDesc !== descFonte ? "manuale" : cur?.fonte_scelta ?? null;
```
→ includere `fonte_scelta` nell'oggetto `.update({...})`.

- [ ] **Step 6: Mostrare la fonte nell'editor** — in `[id]/editor.tsx`, in testa al preventivo, badge "Prezzi: Entrambi / Solo prezzario / Solo miei prezzi" con `Select` per cambiarla (server action `setFontePrezzi(preventivoId, fonte)` in `[id]/actions.ts`: update + `revalidatePath`). Cambiarla non tocca le voci già scelte, serve per i prossimi abbinamenti.

- [ ] **Step 7: Verifica** — creare 3 bozze (una per modalità) con fonti diverse; `select modalita, fonte_prezzi from preventivi order by created_at desc limit 3`. `npx tsc --noEmit && pnpm lint`.

- [ ] **Step 8: Commit** — `git commit -m "Preventivi: scelta fonte prezzi all'avvio e colonne doppia descrizione"`

---

### Task 14: Edge function `abbina-voci` + aggancio a foto e capitolato

**Files:**
- Create: `supabase/functions/abbina-voci/index.ts`
- Modify: `src/app/(app)/preventivi/[id]/editor.tsx` (`FotoDescrizioneTab.handleAvvia`, `CapitolatoTab`, `InterventiTab`)
- Modify: `supabase/functions/genera-da-foto/index.ts:56-99` e `supabase/functions/parse-capitolato/index.ts:108-139` (prompt: segnalare che descrizioni/prezzi definitivi arrivano dall'abbinamento)

**Interfaces:**
- Consumes: `cerca_prezzario`, `cerca_voci_proprie` (T7, T10), `risolviVoce` (T12), colonne T13.
- Produces: invoke `abbina-voci` body `{ preventivo_id: string; solo_nuovi?: boolean }` → `{ abbinati: number; senza_corrispondenza: number }`.

- [ ] **Step 1: Funzione**

Struttura (CORS/auth/Anthropic copiati da `genera-da-foto/index.ts`):

```ts
import { risolviVoce, type FontePrezzi } from "../_shared/risolvi-voce.ts";

// 1. carica preventivo (fonte_prezzi, org_id) + organizations.regione
// 2. carica interventi: se solo_nuovi → where fonte_scelta is null; mai toccare fonte_scelta='manuale'
// 3. per ogni intervento, query = `${titolo} ${descrizione ?? ""}`.slice(0, 300):
//    prez = rpc("cerca_prezzario", { q, p_regione, p_limit: 8 })   // sempre, anche con fonte 'propri': è il fallback
//    prop = fonte !== "prezzario" ? rpc("cerca_voci_proprie", { q, p_org, p_limit: 5 }) : []
// 4. UNA chiamata Claude con tutti gli interventi e i loro candidati:
const SCHEMA = {
  type: "object", additionalProperties: false, required: ["abbinamenti"],
  properties: {
    abbinamenti: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        required: ["intervento_id", "prezzario_voce_id", "voce_propria_id"],
        properties: {
          intervento_id: { type: "string" },
          prezzario_voce_id: { type: ["string", "null"], description: "id del candidato prezzario equivalente, null se nessuno è la stessa lavorazione" },
          voce_propria_id: { type: ["string", "null"] },
        },
      },
    },
  },
};
// system: "Per ogni intervento scegli tra i candidati la voce che descrive LA STESSA lavorazione
//  (stesso materiale, stessa tecnica, unità di misura compatibile). Se nessun candidato è equivalente
//  rispondi null: meglio null che una voce sbagliata. Usa solo id presenti tra i candidati."
// 5. per ogni abbinamento: valida che gli id siano tra i candidati di quell'intervento (scarta altrimenti),
//    poi r = risolviVoce(fonte, prezCand ? {descrizione, prezzo} : null, propCand ? {...} : null) e update:
//    { prezzario_voce_id, codice_prezzario, descrizione_prezzario, prezzo_prezzario,
//      voce_propria_id, descrizione_propria, prezzo_proprio,
//      abbinamento_avviso: r.avviso,
//      ...(r.scelta ? { fonte_scelta: r.scelta, descrizione: r.descrizione, prezzo_unitario: r.prezzo } : {}) }
//    Se l'unità del candidato differisce da quella dell'intervento: NON sovrascrivere prezzo_unitario,
//    salva comunque le descrizioni e metti abbinamento_avviso = "Unità diversa nel prezzario (m² vs corpo): verifica il prezzo."
// 6. ricalcola totale_imponibile (somma importo) come fa parse-capitolato:217-220.
```

Il percorso vuoto (0 interventi) restituisce `{ abbinati: 0, senza_corrispondenza: 0 }` senza chiamare Claude.

- [ ] **Step 2: Deploy** — `supabase functions deploy abbina-voci --project-ref ycliptiwnhclfeijlnri`.

- [ ] **Step 3: Aggancio Da foto** — in `FotoDescrizioneTab.handleAvvia` (`editor.tsx` ~771-790), dopo `await generaInterventiDaFoto(...)`:

```ts
await supabase.functions.invoke("abbina-voci", { body: { preventivo_id: preventivoId, solo_nuovi: true } });
```
e messaggio di successo: "Preventivo pre-compilato e abbinato al prezzario. Rivedi nel tab Interventi."

- [ ] **Step 4: Aggancio Da capitolato** — in `CapitolatoTab`, dopo il successo di `parse-capitolato`, stessa chiamata con `solo_nuovi: false` (parse-capitolato ricrea tutte le righe).

- [ ] **Step 5: Bottone in Interventi** — in `InterventiTab`, accanto a "+ Intervento vuoto": `Button variant="secondary"` "Abbina al prezzario" → invoke con `solo_nuovi: true`, poi `router.refresh()`. Mostrare l'esito "12 voci abbinate, 2 senza corrispondenza".

- [ ] **Step 6: Prompt generatori** — in `genera-da-foto` e `parse-capitolato` lasciare la generazione com'è (titolo/descrizione/quantità/unità/prezzo stimati) e aggiungere al system prompt: "Usa titoli che nominano chiaramente lavorazione e materiale (es. 'Intonaco civile per esterni', 'Ponteggio tubolare'): servono per l'abbinamento automatico al prezzario regionale." Redeploy entrambe.

- [ ] **Step 7: Verifica** — Da foto con 3 punti → ogni intervento ha `codice_prezzario` valorizzato o `abbinamento_avviso`; Da capitolato con `docs/LIVELLO BASE/*` → idem. Con `fonte_prezzi='prezzario'` nessuna voce ha `fonte_scelta='propria'`. Una voce modificata a mano (`manuale`) resta invariata dopo "Abbina al prezzario".

- [ ] **Step 8: Commit** — `git commit -m "Abbinamento automatico delle voci a prezzario e libreria personale"`

---

### Task 15: Componi — "Cerca voce" da prezzario e libreria

**Files:**
- Modify: `src/app/(app)/preventivi/[id]/actions.ts` (nuove `cercaVoci`, `addInterventoDaVoce`)
- Create: `src/app/(app)/preventivi/[id]/cerca-voce.tsx` (client)
- Modify: `src/app/(app)/preventivi/[id]/editor.tsx` (`InterventiTab`: montare `CercaVoce` sopra la select dei cicli, passando `fontePrezzi`)

**Interfaces:**
- Consumes: RPC T7/T10, `risolviVoce` (T12, import `../../../../../supabase/functions/_shared/risolvi-voce`).
- Produces:
  - `cercaVoci(q: string, fonte: FontePrezzi): Promise<{ prezzario: VocePrezzario[]; proprie: VocePropria[] }>`
  - `addInterventoDaVoce(preventivoId: string, sel: { prezzarioVoceId: string | null; vocePropriaId: string | null }): Promise<void>`

- [ ] **Step 1: Actions**

```ts
export async function cercaVoci(q: string, fonte: FontePrezzi) {
  const { org } = await requireContext();
  if (q.trim().length < 3) return { prezzario: [], proprie: [] };
  const supabase = await createClient();
  const [p, m] = await Promise.all([
    fonte !== "propri" ? supabase.rpc("cerca_prezzario", { q, p_regione: org.regione, p_limit: 10 }) : Promise.resolve({ data: [] }),
    fonte !== "prezzario" ? supabase.rpc("cerca_voci_proprie", { q, p_org: org.id, p_limit: 10 }) : Promise.resolve({ data: [] }),
  ]);
  return { prezzario: p.data ?? [], proprie: m.data ?? [] };
}

export async function addInterventoDaVoce(
  preventivoId: string,
  sel: { prezzarioVoceId: string | null; vocePropriaId: string | null },
) {
  const { org } = await requireContext();
  const supabase = await createClient();
  const [{ data: prev }, { data: pv }, { data: vp }, { count }] = await Promise.all([
    supabase.from("preventivi").select("fonte_prezzi").eq("id", preventivoId).single(),
    sel.prezzarioVoceId ? supabase.from("prezzario_voci").select("*").eq("id", sel.prezzarioVoceId).single() : Promise.resolve({ data: null }),
    sel.vocePropriaId ? supabase.from("voci_proprie").select("*").eq("id", sel.vocePropriaId).single() : Promise.resolve({ data: null }),
    supabase.from("preventivo_interventi").select("id", { count: "exact", head: true }).eq("preventivo_id", preventivoId),
  ]);
  const r = risolviVoce(
    prev?.fonte_prezzi ?? "entrambi",
    pv ? { descrizione: pv.descrizione, prezzo: Number(pv.prezzo) } : null,
    vp ? { descrizione: vp.descrizione, prezzo: Number(vp.prezzo) } : null,
  );
  await supabase.from("preventivo_interventi").insert({
    org_id: org.id,
    preventivo_id: preventivoId,
    ordine: count ?? 0,
    titolo: vp?.titolo ?? pv?.descrizione.slice(0, 80) ?? "Intervento",
    unita: vp?.unita ?? pv?.unita ?? "corpo",
    quantita: 1,
    descrizione: r.descrizione,
    prezzo_unitario: r.prezzo ?? 0,
    fonte_scelta: r.scelta,
    abbinamento_avviso: r.avviso,
    prezzario_voce_id: pv?.id ?? null,
    codice_prezzario: pv?.codice ?? null,
    descrizione_prezzario: pv?.descrizione ?? null,
    prezzo_prezzario: pv?.prezzo ?? null,
    voce_propria_id: vp?.id ?? null,
    descrizione_propria: vp?.descrizione ?? null,
    prezzo_proprio: vp?.prezzo ?? null,
  });
  await recomputeTotale(preventivoId);
  revalidatePath(`/preventivi/${preventivoId}`);
}
```
(`requireContext().org` deve esporre `regione`: verificare la select in `src/lib/auth.ts` e aggiungerla se manca.)

- [ ] **Step 2: Componente `CercaVoce`** — input con debounce 300 ms → `cercaVoci`. Risultati in due colonne (o una, a seconda della fonte): "Prezzario {regione}" con `codice · prezzo €/unità_testo · descrizione (2 righe)`, "La tua libreria" con `titolo · prezzo · descrizione`. Selezione: un click seleziona un risultato per colonna (con `entrambi` si possono selezionare entrambe → doppia descrizione); bottone "Aggiungi voce" → `addInterventoDaVoce`. Se dopo la selezione del prezzario c'è una voce propria con lo stesso titolo nei risultati, preselezionarla.
- [ ] **Step 3: Verifica** — in un preventivo "Componi" con `entrambi`: cercare "intonaco", selezionare una voce per colonna, aggiungere → l'intervento ha le due descrizioni e quella effettiva è la propria. Con `prezzario` la colonna libreria non appare.
- [ ] **Step 4: Commit** — `git commit -m "Componi: ricerca voci da prezzario regionale e libreria personale"`

---

### Task 16: Editor — doppia descrizione e scelta per voce

**Files:**
- Modify: `src/app/(app)/preventivi/[id]/actions.ts` (`scegliFonte`, `scegliFonteTutti`)
- Create: `src/app/(app)/preventivi/[id]/doppia-descrizione.tsx`
- Modify: `src/app/(app)/preventivi/[id]/editor.tsx` (`InterventoRow` ~1031-1040, `InterventiTab` header)

**Interfaces:**
- Consumes: `applicaScelta` (T12), colonne T13.
- Produces: `scegliFonte(interventoId: string, preventivoId: string, scelta: "prezzario" | "propria"): Promise<void>`, `scegliFonteTutti(preventivoId: string, scelta: "prezzario" | "propria"): Promise<{ aggiornati: number; saltati: number }>`.

- [ ] **Step 1: Actions**

```ts
export async function scegliFonte(interventoId: string, preventivoId: string, scelta: "prezzario" | "propria") {
  await requireContext();
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("preventivo_interventi")
    .select("descrizione_prezzario, prezzo_prezzario, descrizione_propria, prezzo_proprio")
    .eq("id", interventoId)
    .single();
  const patch = row ? applicaScelta(scelta, row) : null;
  if (!patch) return;
  await supabase.from("preventivo_interventi").update(patch).eq("id", interventoId);
  await recomputeTotale(preventivoId);
  revalidatePath(`/preventivi/${preventivoId}`);
}

export async function scegliFonteTutti(preventivoId: string, scelta: "prezzario" | "propria") {
  await requireContext();
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("preventivo_interventi")
    .select("id, descrizione_prezzario, prezzo_prezzario, descrizione_propria, prezzo_proprio, fonte_scelta")
    .eq("preventivo_id", preventivoId);
  let aggiornati = 0;
  let saltati = 0;
  for (const r of rows ?? []) {
    const patch = r.fonte_scelta === "manuale" ? null : applicaScelta(scelta, r);
    if (!patch) { saltati++; continue; }
    await supabase.from("preventivo_interventi").update(patch).eq("id", r.id);
    aggiornati++;
  }
  await recomputeTotale(preventivoId);
  revalidatePath(`/preventivi/${preventivoId}`);
  return { aggiornati, saltati };
}
```

- [ ] **Step 2: Componente** `doppia-descrizione.tsx` — riceve l'intervento; se `descrizione_prezzario` **o** `descrizione_propria` è valorizzata, mostra due card affiancate (impilate su mobile):
  - "Prezzario regionale · {codice_prezzario}" — testo, `formatEuro(prezzo_prezzario)`.
  - "La tua descrizione" — testo, `formatEuro(prezzo_proprio)`; se assente: "Nessuna voce nella tua libreria per questa lavorazione."
  - Card scelta: bordo `ink` + etichetta "Nel preventivo"; l'altra: bottone "Usa questa" → `scegliFonte`. Nel preventivo finale finisce solo la descrizione scelta (requisito 4).
  - Se `fonte_scelta === "manuale"`: etichetta "Modificata a mano" e due bottoni "Ripristina prezzario" / "Ripristina mia".
  - `abbinamento_avviso` in evidenza sopra le card.

- [ ] **Step 3: Montaggio** — in `InterventoRow`, sopra il `Field` "Descrizione" (`editor.tsx` ~1031), `<DoppiaDescrizione intervento={i} preventivoId={preventivoId} />`. La textarea resta: è la descrizione effettiva modificabile. Dopo `scegliFonte` sincronizzare lo state `descrizione` con `useEffect(() => setDescrizione(i.descrizione ?? ""), [i.descrizione])`.
  Nel header di `InterventiTab`, quando almeno una voce ha entrambe le descrizioni: "Per tutte le voci usa: [Prezzario] [Le mie]" → `scegliFonteTutti`, con esito "18 aggiornate, 2 modificate a mano lasciate invariate".

- [ ] **Step 4: Anteprima e stampa** — verificare che `[id]/preview.tsx` e `src/app/stampa/preventivo/[id]/page.tsx` mostrino solo `descrizione` (valore effettivo) e mai `descrizione_prezzario`/`descrizione_propria`. Se il prezzario è la fonte, mostrare in piccolo il codice (`Rif. prezzario Campania {codice_prezzario}`), che in un preventivo è utile al committente.

- [ ] **Step 5: Verifica** — preventivo `entrambi` con voci abbinate: switch su una voce → descrizione e prezzo cambiano e il totale si ricalcola; "Per tutte: Prezzario" non tocca le voci manuali; l'anteprima mostra una sola descrizione per voce. `npx tsc --noEmit && pnpm lint && pnpm test && pnpm build`.

- [ ] **Step 6: Commit** — `git commit -m "Editor: doppia descrizione per voce con scelta singola e massiva"`

---

### Task 17: Verifica finale end-to-end

- [ ] `pnpm test && npx tsc --noEmit && pnpm lint && pnpm build` → tutto verde.
- [ ] Da utente non loggato: home → "Invia file" → richiesta con foto+capitolato → email + WhatsApp ricevuti → visibile in `/admin/richieste`.
- [ ] Da utente loggato, una volta per modalità (Componi, Da foto, Da capitolato) × fonte (`entrambi`, `prezzario`, `propri`): il selettore appare all'avvio, le voci hanno le descrizioni attese, la scelta funziona, la stampa PDF mostra una sola descrizione per voce.
- [ ] `get_advisors` Supabase (security): nessun warning nuovo sulle tabelle create (RLS attivo ovunque, nessuna policy anon).
- [ ] Aggiornare la guida in-app/README con: impostazione regione, import libreria, significato di "Entrambi".
- [ ] Mostrare a Luigi: screenshot home + video breve del flusso doppia descrizione.
