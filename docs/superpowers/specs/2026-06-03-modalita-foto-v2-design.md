# Modalità 3 (foto) v2 + Guida-Degrado master CRUD — Design

**Data:** 2026-06-03
**Stato:** approvato (utente: "vai")

## Obiettivo
Riprogettare la terza modalità (preventivo da foto) così che i punti sulla foto portino un **valore di degrado 1–9** (non testo libero), e la **Guida-Degrado** diventi la mappa master (editabile, CRUD) che associa ogni livello a un ciclo di lavorazione. Livello ≥7 su un punto → pitturazione dell'intera superficie.

## Decisioni (brainstorming)
1. **Mappa livello→ciclo via FK**: `degrado_samples.ciclo_id` → `cicli_lavorazione`.
2. **Generazione ibrida**: la mappa dà il *tipo* (ciclo); l'AI vision stima le *quantità*/superfici.
3. **CRUD multi-tenant**: globali (`org_id null`) = default sola-lettura; impresa crea/modifica/cancella la propria riga per livello (override). Risoluzione livello L = riga org se esiste, altrimenti globale.
4. **Livello ≥7 → pitturazione totale automatica** sull'intera superficie, con alert.
5. **A)** I punti ≥7 **sostituiscono** le voci singole con un'unica voce pitturazione totale (no doppio conteggio).
6. **B)** Ogni punto ha livello (obbligatorio) + **nota opzionale**.

## Modello dati

### `degrado_samples` (mappa master)
Aggiunta:
```sql
alter table public.degrado_samples
  add column ciclo_id uuid references public.cicli_lavorazione (id) on delete set null;
```
- Una riga "attiva" per (org_id, livello). Le globali restano come default.
- `image_path` già esistente: immagine di riferimento del livello.
- Nessun vincolo unique rigido (più sample globali per livello già possibili); la risoluzione lato app prende **una** riga per livello: prima org (più recente), poi globale.

### `foto_annotazioni.punti` (nuovo shape jsonb)
Da `{ x, y, numero, lavorazione }` a:
```ts
{ x: number; y: number; livello: number /*1-9*/; nota?: string }
```
Il marker sulla foto mostra `livello` (può ripetersi tra punti). Campo `legenda` non più necessario per il testo libero ma mantenuto (compat); può restare vuoto.

## Componenti

### Guida-Degrado — `/guida-degrado` (CRUD)
- Da sola-lettura a editabile. Per ogni livello 1–9:
  - **Select ciclo** da `cicli_lavorazione` (org + global).
  - **Descrizione** (testo).
  - **Immagine** di riferimento (upload bucket `preventivi`, path `{org_id}/degrado/livello-{n}-{timestamp}.{ext}`).
- Azioni (server actions in `guida-degrado/actions.ts`):
  - `saveLivelloMap(livello, cicloId, descrizione, imagePath?)` → upsert riga org per quel livello (se esiste org-row la aggiorna, altrimenti insert con `org_id`).
  - `resetLivello(livello)` → elimina l'override org del livello (torna al default globale).
- UI mostra il default globale quando manca l'override org, con badge "default".

### FotoAutopsia — `foto-autopsia.tsx`
- Click su foto → punto con **selettore livello 1–9** (segmented/select). Il marker mostra il livello.
- Sotto ogni punto: **anteprima del ciclo** risolto live dalla mappa (es. "Livello 5 → Ripristino intonaco"). La risoluzione mappa è passata come prop al componente (lista risolta server-side: `Record<1..9, {cicloTitolo}>`).
- Campo **nota** opzionale per punto.
- `Punto = { x, y, livello, nota? }`. Niente più rinumerazione/cap a 9 punti distinti (i numeri = livelli, ripetibili). Limite punti: nessuno stretto.

### Generazione — `genera-da-foto/index.ts` (ibrido)
Input: immagine + `punti: [{livello, nota?}]` + mappa risolta `livello→{ciclo: {titolo, descrizione_fasi, unita_default, prezzo_default}}` (passata dal client, già risolta org→global) + flag superficie.
1. **AI vision** stima per ogni punto 1–6 la **quantità** (coerente con `unita_default` del ciclo) guardando la foto; usa la nota se presente.
2. Output schema: `interventi: [{ titolo, descrizione, unita, quantita, prezzo_unitario, livello }]`.
3. Per i punti **livello 1–6**: una voce per punto, ciclo dalla mappa, quantità AI, prezzo dal ciclo.
4. Se **almeno un punto ha livello ≥7**: l'AI produce **una sola** voce pitturazione totale (ciclo mappato al livello ≥7) con `quantita` = mq totali stimati della superficie; **i punti ≥7 non generano voci singole**. Prompt istruisce esplicitamente questa regola.
5. effort "medium", max_tokens 4000, pattern classify-degrado (cache, json_schema, textBlock guard).

### Actions preventivo — `preventivi/[id]/actions.ts`
- `saveAnnotazioni(preventivoId, storagePath, punti, legenda)` invariata nella firma; `punti` ora nel nuovo shape (jsonb). Mantiene delete-then-insert per (preventivo_id, storage_path).
- `generaInterventiDaFoto(preventivoId, interventi)` invariata; inserisce gruppo "Da foto", clamp `unita` enum, throw su errore, recompute totale. Aggiunge alert/flag se presente voce ≥7 (gestito lato UI con messaggio).

### Stampa/preview — `preview.tsx` + `stampa/.../page.tsx`
- Marker mostrano `livello`. Legenda elenca "Livello N — {ciclo/intervento}".
- Adatta il type `PreviewFotoDescrizione.punti` al nuovo shape `{x,y,livello,nota?}`. Filtro di validazione per-campo aggiornato (`livello` number).

## Flusso utente
1. Imposta la Guida-Degrado (una volta): per i livelli rilevanti sceglie il ciclo + immagine.
2. Crea preventivo "Da foto" → tab Foto descrizione → carica foto.
3. Clicca punti, assegna livello 1–9 (vede il ciclo associato), nota opzionale.
4. "Avvia" → AI stima quantità; interventi pre-compilati (gruppo "Da foto"); se c'è ≥7, voce pitturazione totale + alert.
5. Rivede/conferma nel tab Interventi.

## File toccati
- Migration: `supabase/migrations/<ts>_degrado_ciclo.sql` (colonna `ciclo_id`).
- `src/app/(app)/guida-degrado/page.tsx` (riscrittura CRUD) + `src/app/(app)/guida-degrado/actions.ts` (nuovo) + componente client form.
- `src/app/(app)/preventivi/[id]/foto-autopsia.tsx` (selettore livello + anteprima ciclo + nota).
- `supabase/functions/genera-da-foto/index.ts` (ibrido mappa+AI, regola ≥7).
- `src/app/(app)/preventivi/[id]/editor.tsx` (passa mappa risolta a FotoAutopsia; messaggio alert ≥7).
- `src/app/(app)/preventivi/[id]/actions.ts` (nuovo shape punti).
- `src/app/(app)/preventivi/[id]/preview.tsx` + `src/app/stampa/preventivo/[id]/page.tsx` (legenda livello, shape punti).
- `src/lib/supabase/types.ts` (rigenerati).

## Compatibilità
- Annotazioni vecchie (shape `{numero,lavorazione}`) ancora in DB: il render stampa filtra per shape; quelle vecchie senza `livello` vengono ignorate dalla nuova legenda (accettabile, nessun dato di produzione critico). Nessuna migrazione dati distruttiva.

## Non incluso (YAGNI)
- Suggerimento AI automatico del livello al click (resta manuale).
- Storia/versioning della mappa degrado.
- Quantità per punto editabile durante l'annotazione (si edita dopo, nel tab Interventi).
