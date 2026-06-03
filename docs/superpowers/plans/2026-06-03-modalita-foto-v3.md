# Modalità foto v3 — Implementation Plan

> REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** Popover sui punti; una voce di preventivo per ogni punto (+ 1 voce superficie su ≥7); rilevamento AI dei punti mancanti con modale + marker fantasma. Spec: `docs/superpowers/specs/2026-06-03-modalita-foto-v3-design.md`.

**Verifica:** `npx tsc --noEmit`, `npm run lint`, `npm run build`; edge fn deploy remoto (ref `ycliptiwnhclfeijlnri`). No test framework. **Commit:** mai citare Claude/AI/Anthropic; autore=utente; no footer.

---

## FASE A — edge fn rileva-punti-mancanti

### Task A.1
**Files:** Create `supabase/functions/rileva-punti-mancanti/index.ts`

- [ ] **Step 1:** Copiare struttura da `supabase/functions/classify-degrado/index.ts` (corsHeaders, createClient auth passthrough, image source base64/url+media_type, fetch Anthropic, output_config json_schema+effort, cache_control ephemeral, json() helper, MODEL env). Specifiche:
  - Input `{ image_base64, media_type, image_url, punti }`; 400 se manca immagine. `punti = [{x,y,livello}]`.
  - SCHEMA:
  ```ts
  const SCHEMA = {
    type: "object",
    additionalProperties: false,
    properties: {
      sospetti: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            x: { type: "number" },
            y: { type: "number" },
            livello_suggerito: { type: "integer" },
            motivo: { type: "string" },
          },
          required: ["x", "y", "livello_suggerito", "motivo"],
        },
      },
    },
    required: ["sospetti"],
  };
  ```
  - System (Italian, cache_control ephemeral): "Sei un tecnico edile esperto di facciate. Analizza la foto e individua le AREE DI DEGRADO visibili che NON sono già coperte dai punti che l'utente ha segnalato. Per ciascuna area mancante restituisci coordinate normalizzate (x,y tra 0 e 1, origine in alto a sinistra), un livello di degrado suggerito 1-9 (1=minimo, 9=severo) e un motivo breve. Considera 'già coperta' un'area entro ~10% di distanza da un punto utente esistente. Se la foto è già ben coperta o non vedi altro degrado, restituisci sospetti vuoto."
  - User content: [ image, { type:"text", text: "Punti già segnalati (JSON, coord normalizzate 0-1):\n" + JSON.stringify(punti ?? []) + "\n\nElenca solo le aree di degrado MANCANTI." } ].
  - effort "low", max_tokens 1500.
  - `if (!textBlock) return json({ error: "Risposta AI non valida" }, 502);` prima del parse.
  - Return `{ ok:true, sospetti: JSON.parse(textBlock.text).sospetti }`.
- [ ] **Step 2:** Deploy `npx supabase functions deploy rileva-punti-mancanti`.
- [ ] **Step 3:** Commit `git add supabase/functions/rileva-punti-mancanti/index.ts && git commit -m "AI: rileva punti di degrado mancanti dalla foto"`

---

## FASE B — genera-da-foto: una voce per punto + voce superficie ≥7

### Task B.1
**Files:** Modify `supabase/functions/genera-da-foto/index.ts`

- [ ] **Step 1:** Sostituire SOLO il testo del system prompt (la parte di istruzioni, mantenendo `MAPPA LIVELLO->CICLO`, `LIBRERIA CICLI`, `LISTINO`):
```
"Sei un computista edile. L'utente ha annotato una foto di facciata con punti, ognuno con un LIVELLO di degrado 1-9. " +
"Per ogni livello è dato il CICLO associato (titolo, fasi, unità, prezzo). REGOLE: " +
"1) Genera UNA voce per OGNI punto (anche se più punti hanno lo stesso livello: voci separate, NON accorpare). Usa il ciclo associato al livello del punto; stima la QUANTITÀ guardando la foto, coerente con l'unità del ciclo; usa il prezzo del ciclo. " +
"2) Se ALMENO UN punto ha livello >= 7: aggiungi UNA SOLA voce ulteriore di 'pitturazione intera superficie' (ciclo associato al livello >=7, quantità = mq totali stimati della facciata: 1 fila di finestre ~ 1 piano ~3 m, finestra larga 1-1,20 m). Questa voce è AGGIUNTIVA: i punti >=7 mantengono comunque la loro voce di porzione. " +
"Le quantità sono stime modificabili." +
"\n\nMAPPA LIVELLO->CICLO:\n" + JSON.stringify(mappa ?? {}) + ...
```
Mantenere lo schema interventi attuale (con `livello` opzionale). Lasciare invariato il resto (input, query, fetch).
- [ ] **Step 2:** Deploy `npx supabase functions deploy genera-da-foto`.
- [ ] **Step 3:** Commit `git add supabase/functions/genera-da-foto/index.ts && git commit -m "AI genera-da-foto: una voce per punto, voce superficie aggiuntiva su >=7"`

---

## FASE C — FotoAutopsia: popover + marker fantasma + modale (con wiring editor)

C e D insieme (callback `onRileva`). Mantenere progetto verde.

### Task C.1 — FotoAutopsia
**Files:** Modify `src/app/(app)/preventivi/[id]/foto-autopsia.tsx`

Stato attuale: lista `<ol>` sotto la foto, marker cliccabile. Riscrivere il corpo mantenendo `Punto`, `mappa`, `onSave`, `onAvvia` e aggiungendo prop `onRileva`.

- [ ] **Step 1: Tipi + prop**
```ts
export type Punto = { x: number; y: number; livello: number; nota?: string };
export type Sospetto = { x: number; y: number; livello_suggerito: number; motivo: string };
```
Aggiungere prop `onRileva?: (punti: Punto[]) => Promise<Sospetto[]>` alla firma.

- [ ] **Step 2: Stato popover + sospetti + modale**
```ts
const [openIdx, setOpenIdx] = useState<number | null>(null);
const [sospetti, setSospetti] = useState<Sospetto[]>([]);
const [modale, setModale] = useState(false);
```

- [ ] **Step 3: addPunto apre il popover sul nuovo punto**
```ts
function addPunto(e: React.MouseEvent<HTMLDivElement>) {
  const rect = e.currentTarget.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width;
  const y = (e.clientY - rect.top) / rect.height;
  setPunti((p) => { const next = [...p, { x, y, livello: 5 }]; setOpenIdx(next.length - 1); return next; });
}
```
`removePunto` chiude il popover se rimuove l'aperto (`setOpenIdx(null)`). Mantenere `setLivello`/`setNota`.

- [ ] **Step 4: Rendering — RIMUOVERE la `<ol>` sotto; marker apre popover; popover ancorato; marker fantasma**
```tsx
<div onClick={addPunto} className="relative cursor-crosshair overflow-hidden rounded-md border border-hairline">
  {/* eslint-disable-next-line @next/next/no-img-element */}
  <img ref={imgRef} src={imageUrl} alt="Facciata" className="w-full select-none" />

  {/* marker reali */}
  {punti.map((pt, i) => (
    <span key={i}
      onClick={(e) => { e.stopPropagation(); setOpenIdx(i); }}
      className="absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-2 border-canvas bg-ink text-xs font-semibold text-canvas"
      style={{ left: `${pt.x * 100}%`, top: `${pt.y * 100}%` }}>
      {pt.livello}
    </span>
  ))}

  {/* marker fantasma (sospetti) */}
  {sospetti.map((s, i) => (
    <span key={`s${i}`}
      onClick={(e) => { e.stopPropagation(); acceptSospetto(i); }}
      title={s.motivo}
      className="absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-ink bg-canvas text-xs font-semibold text-ink"
      style={{ left: `${s.x * 100}%`, top: `${s.y * 100}%` }}>
      ?
    </span>
  ))}

  {/* popover punto aperto */}
  {openIdx !== null && punti[openIdx] ? (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute z-10 w-56 -translate-x-1/2 translate-y-2 rounded-md border border-hairline bg-canvas p-3 shadow-lg"
      style={{ left: `${punti[openIdx].x * 100}%`, top: `${punti[openIdx].y * 100}%` }}>
      <p className="mb-2 text-xs text-stone">Punto · livello degrado</p>
      <select value={punti[openIdx].livello} onChange={(e) => setLivello(openIdx, Number(e.target.value))}
        className="w-full rounded-md border border-hairline px-2 py-1 text-sm">
        {Array.from({ length: 9 }, (_, k) => k + 1).map((n) => (<option key={n} value={n}>Livello {n}</option>))}
      </select>
      <p className="mt-1 text-xs text-graphite">
        {mappa?.[punti[openIdx].livello] ? `→ ${mappa[punti[openIdx].livello]}` : "→ (nessun ciclo mappato)"}
        {punti[openIdx].livello >= 7 ? " · pitturazione totale" : ""}
      </p>
      <Input className="mt-2" value={punti[openIdx].nota ?? ""} placeholder="Nota (facoltativa)" onChange={(e) => setNota(openIdx, e.target.value)} />
      <div className="mt-2 flex justify-between">
        <button type="button" onClick={() => removePunto(openIdx)} className="text-xs text-stone underline">Rimuovi</button>
        <button type="button" onClick={() => setOpenIdx(null)} className="text-xs text-link underline">Chiudi</button>
      </div>
    </div>
  ) : null}
</div>
```
> Verificare che `Input` accetti `className`; se no, wrappare in un div.

- [ ] **Step 5: acceptSospetto — fantasma → punto reale**
```ts
function acceptSospetto(i: number) {
  const s = sospetti[i];
  setPunti((p) => { const next = [...p, { x: s.x, y: s.y, livello: s.livello_suggerito }]; setOpenIdx(next.length - 1); return next; });
  setSospetti((arr) => arr.filter((_, j) => j !== i));
}
```

- [ ] **Step 6: Avvia con pre-rilevamento + modale**
Sostituire l'onClick del bottone Avvia:
```tsx
<Button disabled={loading || punti.length === 0} onClick={onAvviaClick}>{loading ? "Generazione…" : "Avvia"}</Button>
```
```ts
async function onAvviaClick() {
  setLoading(true);
  try {
    if (onRileva) {
      const found = await onRileva(punti);
      if (found.length > 0) { setSospetti(found); setModale(true); return; } // ferma: l'utente decide nella modale
    }
    await onAvvia(punti);
  } finally { setLoading(false); }
}
```
> Nota: quando si apre la modale si esce dalla funzione con `loading` rimesso a false dal `finally`.

- [ ] **Step 7: Modale punti mancanti**
Dopo il blocco foto, aggiungere:
```tsx
{modale ? (
  <div className="fixed inset-0 z-20 flex items-center justify-center bg-scrim/40 p-4">
    <div className="w-full max-w-md rounded-md border border-hairline bg-canvas p-5">
      <p className="title-sm text-ink">Punti forse saltati</p>
      <p className="mt-1 text-sm text-graphite">Dalla foto sembrano esserci {sospetti.length} aree di degrado non segnalate. Sono evidenziate con un punto tratteggiato “?”: cliccale per aggiungerle e assegnare il livello.</p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={() => setModale(false)}>Aggiungo io manualmente</Button>
        <Button onClick={async () => { setModale(false); setSospetti([]); setLoading(true); try { await onAvvia(punti); } finally { setLoading(false); } }}>Procedi comunque</Button>
      </div>
    </div>
  </div>
) : null}
```

- [ ] **Step 8:** `npx tsc --noEmit` (atteso: errore nel chiamante editor finché Task C.2 non passa la prop — fixato in C.2; tenere C.1+C.2 nello stesso dispatch).

### Task C.2 — editor: onRileva
**Files:** Modify `src/app/(app)/preventivi/[id]/editor.tsx`

- [ ] **Step 1:** In `FotoDescrizioneTab`, aggiungere `onRileva` passato a `<FotoAutopsia>`:
```ts
async function onRilevaFoto(punti: Punto[]) {
  const { data, error } = await supabase.functions.invoke("rileva-punti-mancanti", {
    body: { image_url: signedUrl, punti: punti.map((p) => ({ x: p.x, y: p.y, livello: p.livello })) },
  });
  if (error || !data?.ok) return [];
  return data.sospetti as { x: number; y: number; livello_suggerito: number; motivo: string }[];
}
```
```tsx
<FotoAutopsia imageUrl={signedUrl} mappa={mappa} onRileva={onRilevaFoto} onSave={(punti) => saveAnnotazioni(preventivoId, path, punti)} onAvvia={onAvviaFoto} />
```
Adattare a `signedUrl`/`path`/`supabase`/`mappa` reali. Importare il tipo `Sospetto` se serve (oppure inline come sopra).
- [ ] **Step 2:** `npx tsc --noEmit && npm run lint && npm run build` (verde).
- [ ] **Step 3:** Commit `git add "src/app/(app)/preventivi/[id]/foto-autopsia.tsx" "src/app/(app)/preventivi/[id]/editor.tsx" && git commit -m "Foto: popover sui punti, marker fantasma e modale punti mancanti"`

---

## Self-Review (copertura)
| Requisito | Task |
|---|---|
| Popover ancorato al punto (no lista) | C.1 |
| Una voce per ogni punto (no accorpamento) | B.1 |
| +1 voce superficie su ≥7 | B.1 |
| Rilevamento AI punti mancanti | A.1 |
| Modale avviso + "Procedi comunque" | C.1 |
| Marker fantasma + accetta→punto | C.1 |
| Wiring invoke editor | C.2 |

**Dipendenze:** A indip. B indip. C.2 dipende da A (invoke). Ordine: A, B, C(=C.1+C.2). Nessuna migrazione DB.
