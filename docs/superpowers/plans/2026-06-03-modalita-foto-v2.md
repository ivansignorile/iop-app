# Modalità foto v2 + Guida-Degrado CRUD — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Riprogettare la modalità 3 (foto): i punti portano un livello degrado 1–9; la Guida-Degrado diventa mappa master CRUD (livello→ciclo, override impresa su default globali); livello ≥7 → pitturazione totale automatica. Generazione ibrida (mappa dà il ciclo, AI stima quantità).

**Architecture:** Next.js 16 App Router + Supabase (RLS) + edge fn Deno/Anthropic. Spec: `docs/superpowers/specs/2026-06-03-modalita-foto-v2-design.md`.

**Tech Stack:** Next 16.2.6, React 19, Tailwind 4, @supabase/ssr, Deno edge fn, Claude `claude-opus-4-7`.

**Verifica:** `npx tsc --noEmit`, `npm run lint`, `npm run build`; edge fn deploy remoto (autorizzato, project ref `ycliptiwnhclfeijlnri`); `db push` + `gen types --project-id ycliptiwnhclfeijlnri`. No test framework.

**Commit:** mai citare Claude/AI/Anthropic; autore = utente; no footer.

---

## FASE A — Migration: degrado_samples.ciclo_id

### Task A.1
**Files:** Create `supabase/migrations/20260603110000_degrado_ciclo.sql`; Modify `src/lib/supabase/types.ts` (rigen).

- [ ] **Step 1: Migration**
```sql
-- Modalità foto v2: la guida del degrado mappa livello -> ciclo di lavorazione
alter table public.degrado_samples
  add column ciclo_id uuid references public.cicli_lavorazione (id) on delete set null;

comment on column public.degrado_samples.ciclo_id is
  'Ciclo di lavorazione associato al livello di degrado (mappa master Guida-Degrado)';
```
- [ ] **Step 2:** `npx supabase db push` (se drift: `migration list` + reconcile minimo, riportare).
- [ ] **Step 3:** `npx supabase gen types typescript --project-id ycliptiwnhclfeijlnri > src/lib/supabase/types.ts`; confermare `degrado_samples.ciclo_id`.
- [ ] **Step 4:** Commit `git add supabase/migrations/20260603110000_degrado_ciclo.sql src/lib/supabase/types.ts && git commit -m "DB: ciclo_id su degrado_samples (mappa livello-ciclo)"`

---

## FASE B — Guida-Degrado CRUD

La pagina mostra, per ogni livello 1–9, la riga org se esiste (override) altrimenti il default globale (badge "default"). Form per livello: select ciclo, descrizione, immagine. Azioni: salva override, reset (elimina override).

### Task B.1 — Server actions
**Files:** Create `src/app/(app)/guida-degrado/actions.ts`

- [ ] **Step 1:** Creare il file. Pattern come `preventivi/[id]/actions.ts` (`"use server"`, `requireContext`, `createClient`, `revalidatePath`).
```ts
"use server";

import { revalidatePath } from "next/cache";

import { requireContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function s(v: FormDataEntryValue | null): string | null {
  const x = String(v ?? "").trim();
  return x === "" ? null : x;
}

/** Upsert dell'override org per un livello (1-9). */
export async function saveLivelloMap(livello: number, formData: FormData) {
  const { org } = await requireContext();
  const supabase = await createClient();

  const cicloId = s(formData.get("ciclo_id"));
  const descrizione = s(formData.get("descrizione"));
  const imagePath = s(formData.get("image_path")); // caricata lato client, path passato qui
  // intervento: deriva dal ciclo scelto (titolo) per retrocompat con la colonna NOT NULL
  let intervento = s(formData.get("intervento"));
  if (!intervento && cicloId) {
    const { data: c } = await supabase
      .from("cicli_lavorazione")
      .select("titolo")
      .eq("id", cicloId)
      .single();
    intervento = c?.titolo ?? "Intervento";
  }

  // Esiste già una riga org per questo livello?
  const { data: existing } = await supabase
    .from("degrado_samples")
    .select("id")
    .eq("org_id", org.id)
    .eq("livello", livello)
    .limit(1)
    .maybeSingle();

  const patch = {
    org_id: org.id,
    livello,
    intervento: intervento ?? "Intervento",
    descrizione,
    image_path: imagePath ?? undefined,
    ciclo_id: cicloId,
  };

  if (existing?.id) {
    await supabase.from("degrado_samples").update(patch).eq("id", existing.id);
  } else {
    await supabase.from("degrado_samples").insert(patch);
  }
  revalidatePath("/guida-degrado");
}

/** Elimina l'override org del livello (torna al default globale). */
export async function resetLivello(livello: number) {
  const { org } = await requireContext();
  const supabase = await createClient();
  await supabase
    .from("degrado_samples")
    .delete()
    .eq("org_id", org.id)
    .eq("livello", livello);
  revalidatePath("/guida-degrado");
}
```
> Nota: `degrado_samples.intervento` è NOT NULL → manteniamo `intervento` valorizzato (dal titolo ciclo) per compat. La colonna `livello` ha check 1–9.
- [ ] **Step 2:** `npx tsc --noEmit`.
- [ ] **Step 3:** Commit `git add "src/app/(app)/guida-degrado/actions.ts" && git commit -m "Guida-Degrado: server actions CRUD override per livello"`

### Task B.2 — Pagina + form client
**Files:** Modify `src/app/(app)/guida-degrado/page.tsx`; Create `src/app/(app)/guida-degrado/livello-card.tsx`

- [ ] **Step 1: Page (server) carica override org + default globali + cicli**
Riscrivere `page.tsx` per:
- Query `degrado_samples` org (`org_id = org.id`) e globali (`org_id is null`) separatamente, select `id, livello, intervento, descrizione, image_path, ciclo_id`.
- Query `cicli_lavorazione` select `id, titolo` (org+global, RLS) per popolare il select.
- Per ogni livello 1–9 costruire `{ livello, override (riga org|null), globale (riga global|null), signedUrl }`.
- Rendere una `<LivelloCard>` per livello passando i cicli e i dati risolti.
```tsx
import { PageHeader } from "@/components/ui/misc";
import { requireContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LivelloCard } from "./livello-card";

export default async function GuidaDegradoPage() {
  const { org } = await requireContext();
  const supabase = await createClient();

  const [{ data: orgRows }, { data: globalRows }, { data: cicli }] = await Promise.all([
    supabase.from("degrado_samples").select("id, livello, intervento, descrizione, image_path, ciclo_id").eq("org_id", org.id),
    supabase.from("degrado_samples").select("id, livello, intervento, descrizione, image_path, ciclo_id").is("org_id", null),
    supabase.from("cicli_lavorazione").select("id, titolo").order("titolo"),
  ]);

  const orgByLivello = new Map((orgRows ?? []).map((r) => [r.livello, r]));
  const globalByLivello = new Map<number, (typeof globalRows extends (infer T)[] ? T : never)>();
  for (const r of globalRows ?? []) if (!globalByLivello.has(r.livello)) globalByLivello.set(r.livello, r);

  const livelli = await Promise.all(
    Array.from({ length: 9 }, (_, k) => k + 1).map(async (livello) => {
      const override = orgByLivello.get(livello) ?? null;
      const globale = globalByLivello.get(livello) ?? null;
      const active = override ?? globale;
      let url: string | null = null;
      if (active?.image_path) {
        const { data } = await supabase.storage.from("preventivi").createSignedUrl(active.image_path, 3600);
        url = data?.signedUrl ?? null;
      }
      return { livello, override, globale, url };
    }),
  );

  return (
    <div>
      <PageHeader
        eyebrow="Mappa master"
        title="Guida alla scala del degrado"
        description="Definisci, per ogni livello 1–9, il ciclo di lavorazione associato. Questa mappa guida la compilazione del preventivo da foto."
      />
      <div className="grid gap-4 md:grid-cols-3">
        {livelli.map((l) => (
          <LivelloCard
            key={l.livello}
            livello={l.livello}
            cicli={cicli ?? []}
            override={l.override}
            globale={l.globale}
            imageUrl={l.url}
          />
        ))}
      </div>
    </div>
  );
}
```
> Adattare i tipi alle righe generate (`Tables<"degrado_samples">` Pick). Se la sintassi `typeof globalRows extends...` dà problemi, dichiarare un alias di tipo esplicito `type Row = Pick<Tables<"degrado_samples">, "id"|"livello"|"intervento"|"descrizione"|"image_path"|"ciclo_id">;`.

- [ ] **Step 2: `LivelloCard` (client) — form upload + select + salva/reset**
```tsx
"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/field";
import { Card } from "@/components/ui/misc";
import { createClient } from "@/lib/supabase/client";
import { saveLivelloMap, resetLivello } from "./actions";

type Row = {
  id: string;
  livello: number;
  intervento: string;
  descrizione: string | null;
  image_path: string | null;
  ciclo_id: string | null;
};

export function LivelloCard({
  livello,
  cicli,
  override,
  globale,
  imageUrl,
}: {
  livello: number;
  cicli: { id: string; titolo: string }[];
  override: Row | null;
  globale: Row | null;
  imageUrl: string | null;
}) {
  const active = override ?? globale;
  const [cicloId, setCicloId] = useState(active?.ciclo_id ?? "");
  const [descrizione, setDescrizione] = useState(active?.descrizione ?? "");
  const [imagePath, setImagePath] = useState<string | null>(active?.image_path ?? null);
  const [preview, setPreview] = useState<string | null>(imageUrl);
  const [busy, setBusy] = useState(false);
  const supabase = createClient();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `degrado/livello-${livello}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("preventivi").upload(path, file, { upsert: true });
      if (!error) {
        setImagePath(path);
        const { data } = await supabase.storage.from("preventivi").createSignedUrl(path, 3600);
        setPreview(data?.signedUrl ?? null);
      }
    } finally {
      setBusy(false);
    }
  }

  async function onSave() {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("ciclo_id", cicloId);
      fd.set("descrizione", descrizione);
      if (imagePath) fd.set("image_path", imagePath);
      await saveLivelloMap(livello, fd);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <span className="display-md text-ink">{livello}</span>
        <span className="eyebrow text-stone">{override ? "Personalizzato" : globale ? "Default" : "Vuoto"}</span>
      </div>
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt={`Livello ${livello}`} className="mt-3 aspect-[4/3] w-full rounded-md border border-hairline object-cover" />
      ) : (
        <div className="mt-3 flex aspect-[4/3] items-center justify-center rounded-md border border-dashed border-hairline text-xs text-stone">Nessuna immagine</div>
      )}
      <div className="mt-3 space-y-3">
        <Field label="Ciclo associato">
          <Select value={cicloId} onChange={(e) => setCicloId(e.target.value)}>
            <option value="">— nessuno —</option>
            {cicli.map((c) => (<option key={c.id} value={c.id}>{c.titolo}</option>))}
          </Select>
        </Field>
        <Field label="Descrizione">
          <Textarea value={descrizione} onChange={(e) => setDescrizione(e.target.value)} rows={2} />
        </Field>
        <label className="block text-xs text-stone">
          Immagine di riferimento
          <input type="file" accept="image/*" onChange={onFile} className="mt-1 block w-full text-xs" />
        </label>
        <div className="flex gap-2">
          <Button disabled={busy} onClick={onSave}>{busy ? "Salvataggio…" : "Salva"}</Button>
          {override ? (
            <Button variant="secondary" disabled={busy} onClick={() => resetLivello(livello)}>Reset al default</Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
```
> Verificare le firme reali di `Field`/`Select`/`Textarea` in `src/components/ui/field.tsx` e di `createClient` client in `src/lib/supabase/client.ts`; adattare. Se `Select`/`Textarea` non esistono, usare `<select>`/`<textarea>` con classi del design system.

- [ ] **Step 3:** `npx tsc --noEmit && npm run lint && npm run build`.
- [ ] **Step 4:** Commit `git add "src/app/(app)/guida-degrado/page.tsx" "src/app/(app)/guida-degrado/livello-card.tsx" && git commit -m "Guida-Degrado: CRUD per livello con ciclo e immagine"`

---

## FASE C — FotoAutopsia: livello 1–9 + anteprima ciclo

### Task C.1
**Files:** Modify `src/app/(app)/preventivi/[id]/foto-autopsia.tsx`

- [ ] **Step 1: Nuovo shape Punto + prop mappa**
```ts
export type Punto = { x: number; y: number; livello: number; nota?: string };

// nuova prop: mappa risolta livello -> titolo ciclo (per anteprima)
mappa?: Record<number, string>; // es. {5: "Ripristino intonaco"}
```
Aggiornare la firma del componente per accettare `mappa?: Record<number, string>` e cambiare `onAvvia`/`onSave` a `(punti: Punto[]) => Promise<void>` (rimuovere il parametro `legenda`/`Record<string,string>`).

- [ ] **Step 2: Click → punto con livello default + selettore 1–9**
```tsx
function addPunto(e: React.MouseEvent<HTMLDivElement>) {
  const rect = e.currentTarget.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width;
  const y = (e.clientY - rect.top) / rect.height;
  setPunti((p) => [...p, { x, y, livello: 5 }]); // default 5, editabile
}
function setLivello(idx: number, value: number) {
  setPunti((p) => p.map((pt, i) => (i === idx ? { ...pt, livello: value } : pt)));
}
function setNota(idx: number, value: string) {
  setPunti((p) => p.map((pt, i) => (i === idx ? { ...pt, nota: value } : pt)));
}
function removePunto(idx: number) {
  setPunti((p) => p.filter((_, i) => i !== idx));
}
```
Rimuovere `legendaFrom` e il cap a 9 punti (i numeri sono livelli ripetibili).

- [ ] **Step 3: Marker mostra livello; lista con select livello + anteprima ciclo + nota**
```tsx
{punti.map((pt, i) => (
  <span key={i} className="absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-canvas bg-ink text-xs font-semibold text-canvas" style={{ left: `${pt.x * 100}%`, top: `${pt.y * 100}%` }}>{pt.livello}</span>
))}
```
```tsx
<ol className="space-y-2">
  {punti.map((pt, i) => (
    <li key={i} className="flex flex-wrap items-center gap-2">
      <select
        value={pt.livello}
        onChange={(e) => setLivello(i, Number(e.target.value))}
        className="rounded-md border border-hairline px-2 py-1 text-sm"
      >
        {Array.from({ length: 9 }, (_, k) => k + 1).map((n) => (
          <option key={n} value={n}>Livello {n}</option>
        ))}
      </select>
      <span className="text-sm text-graphite">
        {mappa?.[pt.livello] ? `→ ${mappa[pt.livello]}` : "→ (nessun ciclo mappato)"}
        {pt.livello >= 7 ? " · pitturazione totale" : ""}
      </span>
      <Input value={pt.nota ?? ""} placeholder="Nota (facoltativa)" onChange={(e) => setNota(i, e.target.value)} />
      <button type="button" onClick={() => removePunto(i)} className="text-xs text-stone underline">Rimuovi</button>
    </li>
  ))}
  {punti.length === 0 ? <li className="text-sm text-stone">Clicca sulla foto per posizionare i punti e assegnare il livello.</li> : null}
</ol>
```

- [ ] **Step 4: Bottoni passano solo `punti`**
```tsx
{onSave ? <Button variant="secondary" disabled={saving} onClick={async () => { setSaving(true); try { await onSave(punti); } finally { setSaving(false); } }}>{saving ? "Salvataggio…" : "Salva annotazioni"}</Button> : null}
<Button disabled={loading || punti.length === 0} onClick={async () => { setLoading(true); try { await onAvvia(punti); } finally { setLoading(false); } }}>{loading ? "Generazione…" : "Avvia"}</Button>
```

- [ ] **Step 5:** `npx tsc --noEmit` (atteso: errori nei chiamanti in editor.tsx — risolti in Fase D).
- [ ] **Step 6:** Commit `git add "src/app/(app)/preventivi/[id]/foto-autopsia.tsx" && git commit -m "FotoAutopsia: punti con livello 1-9 e anteprima ciclo"`

---

## FASE D — Generazione ibrida + wiring editor

### Task D.1 — edge fn genera-da-foto (mappa + AI qty + ≥7)
**Files:** Modify `supabase/functions/genera-da-foto/index.ts`

- [ ] **Step 1: Input + schema con `livello`**
Cambiare input a `{ image_base64, media_type, image_url, punti, mappa }` dove `punti: [{livello, nota?}]` e `mappa: Record<number, {titolo, descrizione_fasi, unita_default, prezzo_default}>` (risolta dal client org→global). Aggiungere `livello` allo schema interventi (integer, opzionale).
```ts
properties: {
  interventi: {
    type: "array",
    items: {
      type: "object",
      additionalProperties: false,
      properties: {
        titolo: { type: "string" },
        descrizione: { type: "string" },
        unita: { type: "string", enum: ["corpo","mq","ml","mc","giorno","cad","kg"] },
        quantita: { type: "number" },
        prezzo_unitario: { type: "number" },
        livello: { type: "integer" },
      },
      required: ["titolo","descrizione","unita","quantita","prezzo_unitario"],
    },
  },
},
required: ["interventi"],
```
- [ ] **Step 2: System prompt nuova logica**
Sostituire il testo del system con:
```
"Sei un computista edile. L'utente ha annotato una foto di facciata con punti, ognuno con un LIVELLO di degrado 1-9. " +
"Per ogni livello è dato il CICLO associato (titolo, fasi, unità, prezzo). Genera gli interventi così: " +
"1) Per ogni punto con livello da 1 a 6: una voce con il ciclo associato a quel livello; stima la QUANTITÀ guardando la foto, coerente con l'unità del ciclo; usa il prezzo del ciclo. " +
"2) Se ALMENO UN punto ha livello >= 7: genera UNA SOLA voce di pitturazione totale dell'intera superficie usando il ciclo associato al livello >=7; stima i mq totali della facciata dalla foto (1 fila di finestre ~ 1 piano ~3 m, finestra larga 1-1,20 m); NON generare voci singole per i punti >=7. " +
"Le quantità sono stime modificabili.\n\nMAPPA LIVELLO->CICLO:\n" + <json mappa>
```
Mantieni le query a `cicli_lavorazione`/`prezzi_unitari` come fallback contesto (lasciale o rimuovile; preferibile lasciarle come contesto extra). Passa nel messaggio user `JSON.stringify({ punti })` invece di `{punti, legenda}`.
- [ ] **Step 3:** Deploy `npx supabase functions deploy genera-da-foto`.
- [ ] **Step 4:** Commit `git add supabase/functions/genera-da-foto/index.ts && git commit -m "AI genera-da-foto: mappa livello-ciclo, quantita stimate, pitturazione totale >=7"`

### Task D.2 — actions shape punti
**Files:** Modify `src/app/(app)/preventivi/[id]/actions.ts`

- [ ] **Step 1:** `saveAnnotazioni` — cambiare firma a `(preventivoId, storagePath, punti)` (rimuovere `legenda`), inserire `punti: punti as Json` e `legenda: {} as Json` (compat colonna NOT NULL default). `generaInterventiDaFoto` resta invariata (già clampa unita, throw su errore).
```ts
export async function saveAnnotazioni(
  preventivoId: string,
  storagePath: string,
  punti: unknown,
) {
  const { org } = await requireContext();
  const supabase = await createClient();
  await supabase.from("foto_annotazioni").delete()
    .eq("preventivo_id", preventivoId).eq("storage_path", storagePath);
  await supabase.from("foto_annotazioni").insert({
    org_id: org.id,
    preventivo_id: preventivoId,
    storage_path: storagePath,
    punti: punti as Json,
    legenda: {} as Json,
  });
  revalidatePath(`/preventivi/${preventivoId}`);
}
```
- [ ] **Step 2:** `npx tsc --noEmit`.
- [ ] **Step 3:** Commit `git add "src/app/(app)/preventivi/[id]/actions.ts" && git commit -m "Action saveAnnotazioni: nuovo shape punti con livello"`

### Task D.3 — editor: risolvi mappa, passa a FotoAutopsia, alert ≥7
**Files:** Modify `src/app/(app)/preventivi/[id]/editor.tsx`

- [ ] **Step 1: Risolvere la mappa livello→ciclo**
Il componente editor è client. Caricare la mappa via `supabase` client al mount del FotoDescrizioneTab (o passarla come prop dal server component `page.tsx` dell'editor — preferibile lato server). Opzione semplice client:
```ts
// dentro FotoDescrizioneTab
const [mappa, setMappa] = useState<Record<number, string>>({});
const [mappaCicli, setMappaCicli] = useState<Record<number, { titolo: string; descrizione_fasi: string; unita_default: string; prezzo_default: number | null }>>({});
useEffect(() => {
  (async () => {
    const { data } = await supabase
      .from("degrado_samples")
      .select("livello, intervento, descrizione, ciclo_id, org_id, cicli_lavorazione(titolo, descrizione_fasi, unita_default, prezzo_default)")
      .order("org_id", { ascending: false, nullsFirst: false });
    const byLiv: Record<number, string> = {};
    const byCiclo: typeof mappaCicli = {};
    for (const r of data ?? []) {
      if (byLiv[r.livello]) continue; // prima org (org_id desc), poi globale
      const c = r.cicli_lavorazione as { titolo?: string; descrizione_fasi?: string; unita_default?: string; prezzo_default?: number | null } | null;
      byLiv[r.livello] = c?.titolo ?? r.intervento;
      if (c?.titolo) byCiclo[r.livello] = { titolo: c.titolo, descrizione_fasi: c.descrizione_fasi ?? "", unita_default: c.unita_default ?? "corpo", prezzo_default: c.prezzo_default ?? null };
    }
    setMappa(byLiv); setMappaCicli(byCiclo);
  })();
}, []);
```
> Verificare che l'embed `cicli_lavorazione(...)` via FK funzioni; in alternativa fare due query e join in JS. Adattare ai nomi reali.

- [ ] **Step 2: Passare mappa a FotoAutopsia e adattare onSave/onAvvia (no legenda)**
```tsx
<FotoAutopsia
  imageUrl={signedUrl}
  mappa={mappa}
  onSave={(punti) => saveAnnotazioni(preventivoId, path, punti)}
  onAvvia={onAvviaFoto}
/>
```
- [ ] **Step 3: onAvvia passa `mappa` (cicli) e punti livello all'edge fn, poi inserisce; alert ≥7**
```ts
async function onAvviaFoto(punti: Punto[]) {
  const { data, error } = await supabase.functions.invoke("genera-da-foto", {
    body: {
      image_url: signedUrl,
      punti: punti.map((p) => ({ livello: p.livello, nota: p.nota ?? null })),
      mappa: mappaCicli,
    },
  });
  if (error || !data?.ok) return; // gestione errore come altre invoke
  await generaInterventiDaFoto(preventivoId, data.risultato.interventi);
  const ha7 = punti.some((p) => p.livello >= 7);
  setFotoMsg(ha7
    ? "Preventivo pre-compilato. Rilevato degrado ≥7: aggiunta pitturazione totale della superficie. Rivedi nel tab Interventi."
    : "Preventivo pre-compilato. Rivedi nel tab Interventi.");
}
```
- [ ] **Step 4:** `npx tsc --noEmit && npm run lint && npm run build`.
- [ ] **Step 5:** Commit `git add "src/app/(app)/preventivi/[id]/editor.tsx" && git commit -m "Editor foto: mappa livello-ciclo, generazione ibrida, alert pitturazione >=7"`

---

## FASE E — Stampa/preview: legenda livello

### Task E.1
**Files:** Modify `src/app/(app)/preventivi/[id]/preview.tsx`; Modify `src/app/stampa/preventivo/[id]/page.tsx`

- [ ] **Step 1: preview.tsx — shape punti `{x,y,livello,nota?}`**
Aggiornare `PreviewFotoDescrizione.punti` a `{ x:number; y:number; livello:number; nota?:string }[]`. Marker mostra `p.livello`. Legenda elenca `Livello {p.livello}{p.nota ? " — " + p.nota : ""}`.
```tsx
{f.punti.map((p, j) => (
  <span key={j} className="absolute flex h-6 w-6 ... bg-ink text-canvas" style={{ left: `${p.x*100}%`, top: `${p.y*100}%` }}>{p.livello}</span>
))}
...
{f.punti.map((p, j) => (<li key={j}><span className="font-semibold text-ink">Livello {p.livello}.</span> {p.nota ?? ""}</li>))}
```
- [ ] **Step 2: stampa page — filtro per-campo aggiornato (`livello` number)**
Aggiornare il type-guard che filtra `punti` per validare `x`,`y`,`livello` come `number` (al posto di `numero`/`lavorazione`).
- [ ] **Step 3:** `npx tsc --noEmit && npm run build`.
- [ ] **Step 4:** Commit `git add "src/app/(app)/preventivi/[id]/preview.tsx" "src/app/stampa/preventivo/[id]/page.tsx" && git commit -m "Stampa: legenda punti per livello degrado"`

---

## Self-Review (copertura spec)
| Requisito | Task |
|---|---|
| degrado_samples.ciclo_id (mappa FK) | A.1 |
| Guida-Degrado CRUD override + default globali | B.1, B.2 |
| Punti = livello 1–9 + anteprima ciclo + nota | C.1 |
| Generazione ibrida (mappa + AI qty) | D.1, D.3 |
| Livello ≥7 → pitturazione totale (no doppio conteggio) | D.1 (prompt), D.3 (alert) |
| saveAnnotazioni nuovo shape | D.2 |
| Stampa legenda livello | E.1 |

**Dipendenze:** A → B (cicli select usa ciclo_id), A → D (mappa). C va prima di D (shape Punto). Ordine: A, B, C, D, E. Le fasi B e C sono indipendenti tra loro.

**Compat:** annotazioni vecchie `{numero,lavorazione}` ignorate dal nuovo render (filtro `livello` number). Nessuna migrazione dati distruttiva.
