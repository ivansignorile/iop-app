# Fase 1 — Landing e modulo richiesta Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Riscrivere la home con il copy di Luigi e portare il modulo `/invia` ai campi del documento "LANDING E FLUSSO" (formato di output, titolo progetto, upload per ruolo con Excel/Zip/logo, consenso privacy).

**Architecture:** Si estende il flusso `/invia` esistente: validazione pura in `src/lib/richieste/valida.ts`, upload firmati sul bucket `richieste`, insert su `richieste_servizio`, notifiche email + WhatsApp. Nessuna libreria nuova. Il Self istantaneo pubblico è escluso (Fase 5): la CTA Self porta all'app con login.

**Tech Stack:** Next 16.2.6 (leggere `node_modules/next/dist/docs/` prima di scrivere codice, vedi `AGENTS.md`), React 19, Supabase (migrazioni SQL, Storage), Tailwind 4, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-20-landing-flusso-design.md` (requisiti R1, R7, R8, R9; decisioni D4, D5, D6).

## Global Constraints
- Testi UI in italiano. Copy della home **verbatim** da `Copy.docx` (riportato nella Task 5).
- Il lavoro frontend usa la skill `design-taste-frontend` prima di scrivere codice.
- Nessuna nuova dipendenza runtime.
- Limiti esistenti invariati: `MAX_FILES = 10`, `MAX_FILE_BYTES = 15 MB`, rate limit IP/email.
- Verifica a fine task: `pnpm test`, `pnpm lint`, `pnpm exec tsc --noEmit`.
- Commit senza riferimenti a Claude/AI (regola utente).

## Review Focus
1. **Richieste vecchie in admin:** le righe create prima della migrazione hanno `formato_output`, `titolo_progetto` e `consenso_privacy_at` a null. Admin e notifiche non devono rompersi. Test in Task 3 e Task 4.
2. **Logo con il formato sbagliato:** se il formato è `carta_intestata`, serve un file con ruolo `logo`; se il formato è un altro, un logo caricato è accettato e ignorato. Test in Task 2.
3. **MIME dichiarato diverso dal reale:** `verifica-file.ts` controlla i metadati reali di storage; un `.xlsx` o `.zip` deve passare anche lì e il bucket deve accettarli. Task 1 (bucket) + test in Task 2.
4. **MIME Zip variabili tra browser:** Windows/Chrome può mandare `application/x-zip-compressed`. Entrambi accettati. Test in Task 2.
5. **Privacy non spuntata lato server:** il controllo non può stare solo nell'HTML (`required`): va rifiutato in `validaRichiesta`. Test in Task 2.

---

### Task 1: Migrazione `richieste_servizio` + bucket

**Files:**
- Create: `supabase/migrations/20261020090000_richieste_formato_privacy.sql`
- Modify: `src/lib/supabase/types.ts` (rigenerato)

**Interfaces:**
- Produces:
  - enum `richiesta_formato` = `'pdf_protetto' | 'word' | 'carta_intestata'`;
  - colonne `richieste_servizio.formato_output richiesta_formato null`, `titolo_progetto text null`, `consenso_privacy_at timestamptz null`;
  - `descrizione` diventa nullable (D4);
  - `files` jsonb resta un array, e ogni elemento guadagna la chiave `ruolo` (`'documento' | 'logo' | 'altro'`; le righe vecchie non l'hanno).

- [ ] **Step 1:** scrivere la migrazione:
  - enum `richiesta_formato`;
  - le tre colonne nullable (le righe storiche restano valide);
  - `alter column descrizione drop not null`;
  - aggiornamento di `storage.buckets.allowed_mime_types` per `richieste`: valori attuali più `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `application/zip`, `application/x-zip-compressed`.
  - Copiare l'elenco attuale da `20261014090500_richieste_bucket_mime.sql`.
- [ ] **Step 2:** applicare su Supabase (`ycliptiwnhclfeijlnri`) con il tool `apply_migration`, poi verificare con `select column_name, is_nullable from information_schema.columns where table_name='richieste_servizio'`.
  - Atteso: 3 colonne nuove nullable, `descrizione` nullable.
- [ ] **Step 3:** rigenerare `src/lib/supabase/types.ts` (`generate_typescript_types`), poi `pnpm exec tsc --noEmit` → nessun errore.
- [ ] **Step 4:** commit `feat(richieste): formato di output, titolo progetto e consenso privacy`.

### Task 2: Validazione del modulo

**Files:**
- Modify: `src/lib/richieste/valida.ts`
- Test: `src/lib/richieste/valida.test.ts`

**Interfaces:**
- Produces:
  - `export type RuoloFile = "documento" | "logo" | "altro"`
  - `export type FormatoOutput = "pdf_protetto" | "word" | "carta_intestata"`
  - `FileMeta = { nome: string; mime: string; size: number; ruolo: RuoloFile }`
  - `export const MIME_FOGLI` (i due MIME Excel) e `MIME_ARCHIVI` (i due MIME Zip). `MIME_AMMESSI` li include.
  - `export const MIME_LOGO = ["image/png", "image/jpeg", "application/pdf"]`
  - `export const MAX_TITOLO = 150`
  - `RichiestaInput` aggiunge `formato: FormatoOutput`, `titolo: string | null`, `consensoPrivacy: true`. `descrizione` diventa `string | null`.
  - `tipo: RichiestaTipo` **resta** e viene derivato, così admin ed enum non cambiano:
    - `"foto_capitolato"` se c'è almeno un file con ruolo `documento` e MIME in `MIME_DOCUMENTI ∪ MIME_FOGLI ∪ MIME_ARCHIVI`;
    - altrimenti `"foto_descrizione"`.
  - Input raw: `formato`, `titolo`, `privacy` (`"on"` | `true`), `files[].ruolo`.

- [ ] **Step 1: test che falliscono.** Si parte da un `base` aggiornato con `formato: "pdf_protetto"`, `privacy: true` e `ruolo: "documento"` sui file. Casi:
  - accetta senza foto se c'è un computo: `files: [{nome:"computo.xlsx", mime: <xlsx>, size: 1000, ruolo:"documento"}]` → `ok: true`, `data.tipo === "foto_capitolato"`;
  - accetta Zip con `application/x-zip-compressed`;
  - rifiuta senza file: `files: []` → `errore: "Carica almeno un file."`;
  - rifiuta senza privacy: `privacy: undefined` → `errore: "Devi accettare l'informativa privacy."`;
  - rifiuta un formato sconosciuto: `formato: "pdf"` → `errore: "Scegli il formato del preventivo."`;
  - `carta_intestata` senza logo → `errore: "Carica la carta intestata o il logo."`;
  - `carta_intestata` con logo `image/png` → `ok: true`;
  - logo con MIME non in `MIME_LOGO` (es. `image/webp`) → `errore: "Logo: formato ammesso PNG, JPG o PDF."`;
  - ruolo sconosciuto → `"File non valido."`;
  - titolo di 151 caratteri → `errore: "Titolo troppo lungo (max 150 caratteri)."`;
  - descrizione vuota con almeno un file → `ok: true`, `data.descrizione === null`;
  - solo foto, nessun documento → `data.tipo === "foto_descrizione"`.
- [ ] **Step 2:** `pnpm test src/lib/richieste/valida.test.ts` → FAIL.
- [ ] **Step 3: implementare `validaRichiesta`** con le regole sopra.
  - Rimuovere "Carica almeno una foto", "Carica anche il capitolato" e il minimo di 10 caratteri sulla descrizione. Il massimo di 5000 resta.
  - Aggiornare i test esistenti che verificavano quelle regole: oggi le contraddicono per decisione D4.
- [ ] **Step 4:** `pnpm test` → PASS su tutta la suite, compreso `verifica-file.test.ts`.
  - Se `verifica-file.ts` confronta `mime` con una lista sua, allinearla a `MIME_AMMESSI`.
- [ ] **Step 5:** commit `feat(richieste): validazione formato, privacy e upload per ruolo`.

### Task 3: Server action e salvataggio

**Files:**
- Modify: `src/app/invia/actions.ts`, `src/lib/richieste/esito-insert.ts` (se mappa le colonne)
- Test: `src/lib/richieste/esito-insert.test.ts` (estendere se l'insert è costruito lì; altrimenti estrarre `rigaRichiesta(data: RichiestaInput, cartella: string)` in `src/lib/richieste/riga.ts` con test)

**Interfaces:**
- Consumes: `RichiestaInput` dalla Task 2.
- Produces: `rigaRichiesta(data, cartella)` → oggetto insert con:
  - `formato_output`, `titolo_progetto`, `consenso_privacy_at` (ISO di adesso);
  - `files` con `ruolo`;
  - `tipo` derivato, `descrizione` eventualmente null.

- [ ] **Step 1: test** — `rigaRichiesta(dataValida, "2026-10-20/uuid")`:
  - contiene `formato_output: "carta_intestata"` e `titolo_progetto: "Villa Rossi"`;
  - `consenso_privacy_at` è una data ISO valida;
  - `files[0].ruolo === "logo"`.
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3:** implementare `rigaRichiesta` e usarla in `inviaRichiesta`. `preparaUpload` riceve `ruolo` per ogni file e lo mette nel path: `richieste/{data}/{uuid}/{i}-{ruolo}-{nome}`.
- [ ] **Step 4:** `pnpm test` → PASS.
- [ ] **Step 5:** commit `feat(invia): salva formato, titolo, privacy e ruolo dei file`.

### Task 4: Notifiche e admin

**Files:**
- Modify: `src/lib/notifiche/messaggio-richiesta.ts`, `src/app/(app)/admin/richieste/page.tsx`, `src/app/(app)/admin/richieste/[id]/page.tsx`
- Test: `src/lib/notifiche/messaggio-richiesta.test.ts`

**Interfaces:**
- Consumes: `RichiestaInput` (Task 2).
- Produces: `testoRichiesta` con le righe:
  - `Formato: PDF protetto | Word | Carta intestata`
  - `Progetto: {titolo}` (solo se presente)
  - `Allegati: N documenti, N loghi, N altri` al posto di `Allegati: N file`

- [ ] **Step 1: test**
  - formato `word` → il testo contiene `"Formato: Word"`;
  - con titolo → `"Progetto: Villa Rossi"`;
  - descrizione null → nessuna riga `"null"`;
  - conteggio per ruolo → `"Allegati: 1 documenti, 1 loghi, 0 altri"`.
- [ ] **Step 2:** run → FAIL. **Step 3:** implementare. **Step 4:** run → PASS.
- [ ] **Step 5: admin.** Nel dettaglio aggiungere formato, titolo, data del consenso privacy e file raggruppati per ruolo; i file senza `ruolo` (richieste vecchie) vanno in "Allegati". Nella lista aggiungere la colonna Formato (`—` se null).
  - Verifica manuale: `pnpm dev`, aprire `/admin/richieste/<id>` di una richiesta vecchia e di una nuova → nessun errore.
- [ ] **Step 6:** commit `feat(admin): formato, progetto e privacy nelle richieste`.

### Task 5: Modulo `/invia` (UI) + pagina privacy

**Files:**
- Modify: `src/app/invia/invia-form.tsx`, `src/app/invia/page.tsx`, `src/lib/supabase/proxy.ts:40-46` (`/privacy` pubblica)
- Create: `src/app/privacy/page.tsx`

**Interfaces:**
- Consumes: `preparaUpload` / `inviaRichiesta` (Task 3), costanti MIME (Task 2).

- [ ] **Step 1:** invocare la skill `design-taste-frontend`; leggere `DESIGN.md`.
- [ ] **Step 2: sezioni del modulo**, nell'ordine di Luigi:
  1. *Dati*: nome/ragione sociale, email, telefono, comune (resta: serve alla Fase 6).
  2. *Formato*: radio con le tre opzioni e i sottotesti verbatim dal documento:
     - "Formato PDF non editabile, protetto da copia e completo di watermark aziendale";
     - "Formato .docx personalizzabile e liberamente modificabile";
     - "Predisposto direttamente sul layout della tua intestazione aziendale".
  3. *Progetto*: titolo/riferimento, "Note e indicazioni particolari" (textarea facoltativa).
  4. *Documenti*: tre zone di upload con ruolo.
     - Computo/documentazione: `accept` PDF, Excel, Zip, immagini, Word. Tooltip "Cos'è un computo metrico?" con una frase che lo spiega (R9).
     - Carta intestata/logo: visibile ed **obbligatoria** solo con formato `carta_intestata`.
     - Altri allegati.
  5. Checkbox privacy con link a `/privacy`; pulsante "INVIA E GENERA RICHIESTA".
  - Rimuovere il select `tipo`: ora è derivato. `?tipo=capitolato` resta compatibile e apre la zona Documenti.
- [ ] **Step 3:** `/privacy` con un testo provvisorio marcato `{/* TODO: testo definitivo da Luigi (D6) */}`, aggiunta alla lista pubblica del proxy.
- [ ] **Step 4: verifica nel browser** (`pnpm dev`):
  - invio con un solo `.xlsx` → riga in DB con `tipo = foto_capitolato` e il file nel bucket;
  - formato carta intestata senza logo → errore mostrato;
  - `/privacy` raggiungibile senza login.
- [ ] **Step 5:** `pnpm lint && pnpm exec tsc --noEmit && pnpm test` → tutto verde. Commit `feat(invia): nuovo modulo richiesta e pagina privacy`.

### Task 6: Home con il copy di Luigi

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1:** invocare `design-taste-frontend` (se non è già attiva dalla Task 5).
- [ ] **Step 2: struttura** — segue la bozza grafica di Luigi (spec, sezione "Bozza grafica della home"; immagine `bozza-20-10.jpg`). Testi verbatim dalla bozza; dove la bozza non ha testo lungo, dal `Copy.docx`.
  - **Nav:**
    - logo IOP;
    - "Funzionalità" e "Prezzari": ancore alle sezioni;
    - "Prezzi" esclusa (D7);
    - "Accedi / Registrati" → `/login`.
  - **Hero:**
    - titolo "IOP. Il preventivo facile, trasparente e veloce";
    - sottotitolo della bozza;
    - CTA "Genera il tuo preventivo ora" → ancora alla sezione modalità (D5).
  - **Tre card per pubblico:** titolo e punti della bozza; sotto, espandibili o in seconda riga, i punti di `Copy.docx`.
  - **Quattro punti di forza** della bozza (Prezzari regionali, Export Word/PDF/Excel, Self o validazione tecnica, Anagrafiche e loghi).
  - **Come funziona:** i 3 passi della bozza.
  - **Due modalità** (dal copy):
    - ⚡ "Self Istantaneo: Carica le specifiche, seleziona i dettagli e scarica subito il tuo documento PDF/Word pre-impostato." → `/signup` per gli ospiti, `/preventivi/nuovo` per gli utenti loggati (D1, fino alla Fase 5);
    - 🛠️ "Elaborato dal Tecnico (in 24 ore): …" → `/invia`.
    - Le tre card esistenti (Componi / Da foto / Da capitolato) restano come dettaglio del Self.
  - **Tre sezioni per pubblico** (Privati, Tecnici, Imprese): titoli e punti verbatim da `Copy.docx`.
    - Testo sorgente: `/private/tmp/claude-502/-Users-ivansignorile-barikreativa-iop/88cb2895-7d83-4dc7-86c6-323ef275ab9b/scratchpad/luigi-docs/Copy.txt`.
    - Copiarlo in `docs/clienti/2026-10-20-Copy.txt` nella stessa commit, perché lo scratchpad è temporaneo.
  - **Footer:**
    - Termini di Servizio → `/termini` (pagina provvisoria, D7, pubblica nel proxy);
    - Privacy Policy → `/privacy`;
    - tagline "La Nuova Era della Preventivazione Edile";
    - icone social solo se Luigi manda gli URL, altrimenti omesse.
  - Copiare anche la bozza in `docs/clienti/2026-10-20-home-bozza.jpg`.
- [ ] **Step 3: verifica nel browser** a 375 px e a 1440 px: nessuno scroll orizzontale, CTA funzionanti da ospite e da utente loggato.
- [ ] **Step 4:** lint + typecheck. Commit `feat(home): nuovo copy, due modalità e sezioni per pubblico`.

### Task 7: Chiusura branch
- [ ] `pnpm test && pnpm lint && pnpm exec tsc --noEmit`, poi PR verso `main` con la skill `superpowers:finishing-a-development-branch`. Descrizione PR senza riferimenti a Claude.
