# Modalità foto v3 — Design (popover + voce per punto + punti mancanti)

**Data:** 2026-06-03 · **Stato:** approvato (utente: "vai")

## Obiettivo
Tre raffinamenti alla modalità foto:
1. Annotazione punti via **popover** ancorato al punto (niente lista sotto).
2. **Una voce di preventivo per ogni punto** (no accorpamento); se ≥1 punto ≥7, una voce extra "pitturazione intera superficie".
3. Su "Avvia", **rilevamento AI dei punti mancanti**: se l'AI vede degrado non segnalato, modale di avviso + marker fantasma per aggiunta manuale.

## Decisioni (brainstorming)
1. **Punto→voce + 1 voce superficie**: ogni punto (anche ≥7) genera la sua voce col ciclo del livello (quantità AI sulla porzione); se ≥1 punto ≥7 → IN PIÙ una sola voce "pitturazione intera superficie" (mq totali).
2. Modale punti-mancanti: azione **"Aggiungo io manualmente"** + escape **"Procedi comunque"** (warning non bloccante).
3. Sospetti mostrati come **marker fantasma** sulla foto (tratteggio + "?").

## Req 1 — Popover sui punti
`FotoAutopsia`:
- Click su area vuota → crea punto `{x,y,livello:5}` e apre il popover su quel punto.
- Popover ancorato (absolute) vicino alle coordinate: select livello 1–9, anteprima ciclo (`mappa[livello]`) con "· pitturazione totale" se ≥7, campo nota, bottone Rimuovi, bottone Chiudi/Conferma.
- Click su marker esistente → riapre popover per modifica. Click fuori → chiude.
- Rimossa la `<ol>` lista sotto la foto. Stato `openIdx: number | null`.
- Marker mostra il livello.

## Req 2 — Una voce per punto + voce superficie ≥7
`genera-da-foto` (prompt rivisto):
- Genera **una voce per OGNI punto** (anche più punti con lo stesso livello → voci separate; **vietato accorpare**), col ciclo associato al livello, quantità stimata AI sulla porzione, prezzo dal ciclo.
- Se **almeno un punto ha livello ≥7**: aggiungi **UNA sola** voce extra "pitturazione intera superficie" (ciclo del livello ≥7, qty = mq totali stimati). I punti ≥7 mantengono comunque la loro voce di porzione.
- Schema interventi flat invariato; ogni item porta `livello` (opzionale). Regola nel prompt.

## Req 3 — Rilevamento punti mancanti
Nuova edge fn **`rileva-punti-mancanti`** (vision, pattern classify-degrado):
- Input: `{ image_base64|image_url, media_type, punti }` (punti = `[{x,y,livello}]` già messi dall'utente).
- Output SCHEMA: `{ sospetti: [{ x:number /*0-1*/, y:number /*0-1*/, livello_suggerito:integer, motivo:string }] }`.
- System prompt: tecnico edile; individua aree di degrado visibili in foto NON già coperte dai punti utente (confronto per prossimità); restituisci coordinate normalizzate 0–1, livello suggerito 1–9, motivo breve. Se la foto è già ben coperta restituisci lista vuota.
- effort "low", max_tokens 1500, textBlock guard.

Flusso su "Avvia" (in `FotoAutopsia`/editor):
1. Chiama `rileva-punti-mancanti` con foto + punti utente.
2. `sospetti.length > 0` → **modale**:
   - testo "Sembra che tu abbia saltato N punti di degrado."
   - **"Aggiungo io manualmente"** → chiude modale, disegna i sospetti come **marker fantasma** (tratteggio, "?") nelle posizioni rilevate. Click su fantasma → diventa punto reale `{x,y,livello:livello_suggerito}` + apre popover per conferma/modifica; il fantasma sparisce.
   - **"Procedi comunque"** → procede alla generazione coi soli punti utente.
3. `sospetti.length == 0` → genera direttamente.

Marker fantasma: stato separato `sospetti: Sospetto[]`; non inclusi nella generazione finché non accettati. Stile distinto (`border-dashed`, contenuto "?").

## File toccati
- Create `supabase/functions/rileva-punti-mancanti/index.ts`.
- Modify `src/app/(app)/preventivi/[id]/foto-autopsia.tsx` (popover, marker fantasma, modale, hook rileva-su-Avvia).
- Modify `supabase/functions/genera-da-foto/index.ts` (prompt una-voce-per-punto + voce superficie ≥7).
- Modify `src/app/(app)/preventivi/[id]/editor.tsx` (passa funzione di rilevamento / invoke; o `FotoAutopsia` invoca direttamente via supabase client passato — vedi piano).
- preview/stampa: invariati (già per livello).

## Architettura invoke
`FotoAutopsia` è client e non ha il client supabase. Due opzioni (decisa: B):
- B) `FotoAutopsia` riceve due callback dall'editor: `onRileva(punti) => Promise<Sospetto[]>` e `onAvvia(punti) => Promise<void>`. L'editor implementa `onRileva` invocando `rileva-punti-mancanti`. Così la logica di rete resta nell'editor (coerente con `onAvvia`/`onSave` attuali), e il componente gestisce solo modale/marker/popover.

## Non incluso (YAGNI)
- Path "AI genera direttamente i mancanti" (non selezionato): i sospetti si accettano manualmente.
- Drag dei punti per riposizionarli.
- Persistenza dei sospetti (solo in memoria durante la sessione di annotazione).

## Compatibilità
- `Punto` resta `{x,y,livello,nota?}`. Nessun cambio schema DB. Nessuna migrazione.
