# Prezzari regionali Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Importare i prezzari ufficiali di 19 regioni + Trento e Bolzano (Toscana per provincia) e far scegliere a ogni preventivo il prezzario dal comune del cantiere.

**Architecture:** Script di import con registro dichiarativo delle fonti e un parser puro per formato (`Buffer → VoceNormalizzata[]`), testato su fixture ridotte. In DB: `prezzari.ambito`, tabella `comuni` ISTAT, `preventivi.prezzario_id`, funzione `prezzario_per_comune` e `cerca_prezzario` v3 per id. L'app fissa il prezzario sul preventivo quando si salva il comune del cantiere.

**Tech Stack:** Next 16.2.6 (leggere `node_modules/next/dist/docs/` prima di toccare codice app), Supabase Postgres, Vitest, tsx. Nuove devDependencies: `xlsx` da tarball SheetJS 0.20.3 (`https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`, non la 0.18.5 di npm: vulnerabile), `fast-xml-parser`, `fflate`.

**Spec:** `docs/superpowers/specs/2026-10-21-prezzari-regionali-design.md`

## Global Constraints

- DB unico = produzione (`ycliptiwnhclfeijlnri`): migrazioni solo additive; la vecchia firma `cerca_prezzario(text, text, int)` resta funzionante.
- Niente account di test, niente login con password reali, niente richieste di prova all'app in produzione.
- File grezzi scaricati: solo in `scripts/prezzario/data/` (git-ignored) o in scratchpad; mai eseguiti; i parser li leggono come dati.
- Fixture di test: estratti piccoli (≤ 50 voci, ≤ 100 KB) in `scripts/prezzario/fixtures/<formato>.*`, committati.
- Liguria e Lombardia: `attivo = false`, `licenza` valorizzata con il motivo. Trento: mai il formato XPWE/PriMus.
- Toscana: `ambito` = sigla provincia (`AR, FI, GR, LI, LU, MS, PI, PO, PT, SI`); tutte le altre fonti `ambito = ''`.
- Codici voce senza prefisso di fonte separato da `_` (`PIE26_`, `BOL26_`, `ABR26_`, `MOL26_`); `LOM261.…` resta intero perché è il codice ufficiale.
- Commit senza alcun riferimento a Claude/AI (istruzione utente, prevale su ogni template).
- Regione slug = minuscolo con trattini: `valle-d-aosta`, `friuli-venezia-giulia`, `emilia-romagna`, `trentino-alto-adige` NON usato: Trento = `trento`, Bolzano = `bolzano`.

## Review Focus

1. Comune scritto con accenti/apostrofi/maiuscole diversi ("Sant'Agata de' Goti", "FORLI'", "Forlì") → deve trovare lo stesso comune. Test in Task 3.
2. Comune omonimo in due regioni ("Calliano" TN e AT, "Samone" TN e TO) → senza provincia non si indovina: fallback alla regione dell'org se una delle candidate è quella regione, altrimenti fallback esplicito. Test in Task 2.
3. Comuni di Trentino-Alto Adige → regione `trento` o `bolzano` in base alla provincia, non "trentino-alto-adige". Test in Task 3.
4. Voce con prezzo con virgola italiana e separatore migliaia ("1 826,34", "1.826,34") → 1826.34. Test in Task 1 (`numeroIt`).
5. Preventivo già con voci quando cambia il comune → le voci restano invariate, cambia solo `prezzario_id`. Test in Task 4.

---

### Task 1: Base comune dei parser, registro fonti e importer generico

**Files:**
- Create: `scripts/prezzario/core.ts`, `scripts/prezzario/core.test.ts`, `scripts/prezzario/fonti.ts`, `scripts/prezzario/formati/api-llpp.ts`
- Modify: `scripts/prezzario/parse.ts` (diventa re-export di `core` + `formati/api-llpp`), `scripts/prezzario/importa.ts`, `package.json`

**Interfaces:**
- Produces (`core.ts`): `type VoceNormalizzata` (invariato), `mapUnita(u: string): UnitaMisura` (spostato), `numeroIt(s: string | number | null | undefined): number | null`, `pulisci(s: string | null | undefined): string` (spazi multipli, `_x000D_`, NBSP → spazio, trim), `unisci(...parti: (string | null | undefined)[]): string` (pulisce, scarta vuoti e parti già contenute nella precedente, unisce con " — "), `senzaPrefisso(codice: string): string` (toglie `^[A-Z]{3}\d{2}_`), `finalizza(voci: VoceGrezza[]): VoceNormalizzata[]` dove `VoceGrezza = { codice: string; capitolo?: string | null; descrizione: string; unita_testo?: string | null; prezzo: number | null }` — arrotonda a 2 decimali, scarta prezzo nullo/≤0 o descrizione vuota, dedup per codice (primo vince), unità vuota → `"a corpo"`/`corpo`.
- Produces (`fonti.ts`): `type Fonte = { regione: string; ambito: string; anno: number; titolo: string; formato: Formato; file: string /* path relativo a scripts/prezzario/data */; url: string; licenza: string | null; attivo: boolean }`, `FONTI: Fonte[]`, `type Formato` (unione dei nomi dei file in `formati/`).
- Produces (`formati/*.ts`): ogni formato esporta `parse(buf: Buffer): VoceNormalizzata[]`.
- Produces (`importa.ts`): CLI `pnpm prezzario:import <regione> [ambito]` e `pnpm prezzario:import --tutte`; upsert `prezzari` su `regione,ambito,anno` con `fonte_url`, `licenza`, `attivo`.

- [ ] **Step 1: test di `numeroIt`, `pulisci`, `unisci`, `senzaPrefisso`, `finalizza`** in `core.test.ts`: `numeroIt("1 826,34") === 1826.34`, `numeroIt("1.826,34") === 1826.34`, `numeroIt("81.7345") === 81.7345`, `numeroIt(5.91) === 5.91`, `numeroIt("") === null`; `pulisci("a_x000D_\n  b") === "a b"`; `unisci("Muratura in mattoni", "con malta M5") === "Muratura in mattoni — con malta M5"`; `unisci("Scotico", null, "") === "Scotico"`; `senzaPrefisso("PIE26_01.A01.A05.010") === "01.A01.A05.010"`; `finalizza` su due voci con stesso codice tiene la prima, scarta prezzo 0, arrotonda 81.7345 → 81.73. I 3 test esistenti di `parse.test.ts` devono restare verdi.
- [ ] **Step 2:** `pnpm test scripts/prezzario` → FAIL (modulo `core` mancante).
- [ ] **Step 3:** implementa `core.ts`; sposta `normalizzaPrezzario` in `formati/api-llpp.ts` (wrapper `parse(buf)` che legge `{success, data:{articles, prices}}`); `parse.ts` re-esporta.
- [ ] **Step 4:** `pnpm test scripts/prezzario` → PASS.
- [ ] **Step 5:** `fonti.ts` con la sola voce Campania 2026 (`formato: "api-llpp"`, `file: "campania/2026.json"`), `importa.ts` generico; aggiungi devDependencies (`pnpm add -D https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz fast-xml-parser fflate`) e script `"comuni:import": "tsx --env-file=.env.local scripts/comuni/importa.ts"`. `pnpm exec tsc --noEmit` pulito. L'upsert su `regione,ambito,anno` funziona solo dopo Task 2: non lanciare l'import qui.
- [ ] **Step 6: Commit** `refactor(prezzario): base comune dei parser e registro delle fonti`

### Task 2: Migrazione DB

**Files:**
- Create: `supabase/migrations/20261021090000_prezzari_regionali.sql`
- Modify: `src/lib/supabase/types.ts` (rigenerati)

**Interfaces:**
- Produces (SQL): `prezzari.ambito text not null default ''`, `prezzari.fonte_url text`, `prezzari.licenza text`, unique `(regione, ambito, anno)` al posto di `(regione, anno)`; tabella `comuni (codice_istat text pk, nome text not null, nome_norm text not null, provincia text not null, regione text not null)` con indice su `nome_norm`, RLS lettura `authenticated`; `preventivi.prezzario_id uuid references prezzari(id) on delete set null`; `norm_comune(t text) returns text` (immutable: `lower(unaccent)`, apostrofi/trattini → spazio, spazi multipli → uno, trim, toglie apostrofo finale); `prezzario_per_comune(p_comune text, p_regione_fallback text) returns uuid`; `cerca_prezzario(q text, p_prezzario uuid, p_limit int)`; la firma `(text, text, int)` diventa wrapper che risolve il prezzario attivo più recente con `ambito = ''` della regione e chiama la v3.
- Regola `prezzario_per_comune`: candidati = comuni con `nome_norm = norm_comune(p_comune)`; se 1 candidato → sua regione/provincia; se più candidati → quello con `regione = p_regione_fallback` se unico, altrimenti nessuno; dato regione/provincia → prezzario `attivo` con `ambito = provincia`, poi `ambito = ''`, `order by anno desc`; se nulla → prezzario attivo `ambito = ''` più recente di `p_regione_fallback`; altrimenti null.

- [ ] **Step 1:** scrivi la migrazione; applicala con `mcp__claude_ai_Supabase__apply_migration` (nome `prezzari_regionali`).
- [ ] **Step 2: verifica SQL** (via `execute_sql`, solo select/transazione con rollback): inserisci in transazione 2 comuni finti omonimi (`'zzprova'` in `campania`/NA e `puglia`/BA) e verifica `prezzario_per_comune('ZZProva', 'campania')` = id Campania 2026, `prezzario_per_comune('zzprova', 'lazio')` = null (lazio senza prezzario ancora → null); `prezzario_per_comune('', 'campania')` = id Campania; `select count(*) from cerca_prezzario('massetto', 'campania', 5)` > 0; `cerca_prezzario('massetto', <id campania>, 5)` stessi risultati. Chiudi con `rollback`.
- [ ] **Step 3:** rigenera tipi (`generate_typescript_types`) in `src/lib/supabase/types.ts`; `pnpm exec tsc --noEmit` e `pnpm test` verdi.
- [ ] **Step 4: Commit** `feat(prezzari): ambito provinciale, comuni ISTAT e prezzario per comune`

### Task 3: Import comuni ISTAT

**Files:**
- Create: `scripts/comuni/importa.ts`, `scripts/comuni/parse.ts`, `scripts/comuni/parse.test.ts`, `scripts/comuni/fixtures/comuni.csv` (8 righe reali: Napoli, Firenze, Prato, Trento, Bolzano, Forlì, Sant'Agata de' Goti, Aosta), `src/lib/comuni.ts`, `src/lib/comuni.test.ts`

**Interfaces:**
- Produces: `parseComuni(buf: Buffer): { codice_istat: string; nome: string; nome_norm: string; provincia: string; regione: string }[]` (CSV ISTAT `;`, cp1252/latin1, colonne "Codice Comune formato alfanumerico", "Denominazione in italiano", "Sigla automobilistica", "Denominazione Regione"); `slugRegione(denominazione: string, provincia: string): string`; `normComune(t: string): string` in `src/lib/comuni.ts` con la stessa regola di `norm_comune` SQL.
- Fonte: `https://www.istat.it/storage/codici-unita-amministrative/Elenco-comuni-italiani.csv` → `scripts/prezzario/data/comuni/elenco.csv`.

- [ ] **Step 1: test:** `normComune("FORLI'") === normComune("Forlì") === "forli"`; `normComune("Sant'Agata de' Goti") === "sant agata de goti"`; `slugRegione("Trentino-Alto Adige/Südtirol", "TN") === "trento"`, `("…", "BZ") === "bolzano"`, `slugRegione("Valle d'Aosta/Vallée d'Aoste", "AO") === "valle-d-aosta"`, `slugRegione("Friuli-Venezia Giulia", "UD") === "friuli-venezia-giulia"`, `slugRegione("Emilia-Romagna", "FC") === "emilia-romagna"`; `parseComuni(fixture)` → 8 righe, Prato con `provincia === "PO"` e `regione === "toscana"`.
- [ ] **Step 2:** `pnpm test scripts/comuni src/lib/comuni` → FAIL.
- [ ] **Step 3:** implementa; `importa.ts` scarica se manca il file, upsert su `comuni` in blocchi da 1000.
- [ ] **Step 4:** test PASS; `pnpm comuni:import` → circa 7.900 righe; `select count(*), count(distinct regione) from comuni` → ~7.900 e 21; `select norm_comune('Forlì') = norm_comune('FORLI''')` → true (parità TS/SQL).
- [ ] **Step 5: Commit** `feat(comuni): import dell'elenco comuni ISTAT`

### Task 4: Prezzario del preventivo dal comune del cantiere

**Files:**
- Create: `src/lib/prezzario-preventivo.ts`, `src/lib/prezzario-preventivo.test.ts`
- Modify: `src/app/(app)/preventivi/[id]/actions.ts` (salvataggio edificio ~riga 90, `cercaVoci` ~riga 470), `src/app/(app)/preventivi/[id]/page.tsx`, `editor.tsx`, `cerca-voce.tsx`, `preview.tsx`, `src/lib/scelta-fonte.ts` (`riferimentoPrezzario`)

**Interfaces:**
- Consumes: `prezzario_per_comune`, `cerca_prezzario(q, p_prezzario uuid, p_limit)`, `preventivi.prezzario_id` (Task 2).
- Produces: `etichettaPrezzario(p: { titolo: string; ambito: string } | null, fallback: boolean, regioneOrg: string): { titolo: string; avviso: string | null }` — avviso esatto: `"Comune non riconosciuto: uso il prezzario di ${etichettaRegione(regioneOrg)}."` quando `fallback`; titolo con provincia: `"${titolo} — ${NOMI_PROVINCIA[ambito]}"` per ambito non vuoto (mappa delle 10 province toscane). `fallback` = il comune è valorizzato ma nessun prezzario trovato per lui.
- Nell'azione di salvataggio dell'edificio: dopo l'update, `rpc("prezzario_per_comune", { p_comune, p_regione_fallback: org.regione })` → `update preventivi set prezzario_id`. Le righe `preventivo_interventi` non si toccano.
- `cercaVoci`: legge `prezzario_id` del preventivo (richiede `preventivoId` come parametro in più); se null lo risolve come sopra e lo salva; poi `rpc("cerca_prezzario", { q, p_prezzario, p_limit })`.

- [ ] **Step 1: test** di `etichettaPrezzario`: ambito `"FI"` → titolo `"Prezzario Regione Toscana 2026 — Firenze"`, avviso null; `fallback=true`, regioneOrg `"campania"` → avviso `"Comune non riconosciuto: uso il prezzario di Campania."`; `p=null` → titolo `"Prezzario Campania"` (stessa resa attuale di `cerca-voce.tsx` riga 141).
- [ ] **Step 2:** FAIL → **Step 3:** implementa lib + collegamenti app (leggere prima `node_modules/next/dist/docs/` per server actions) → **Step 4:** `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm lint` verdi.
- [ ] **Step 5: verifica Review Focus 5** con SQL in transazione+rollback: preventivo esistente con voci → update `prezzario_id` → `count(*)` di `preventivo_interventi` invariato e prezzi invariati.
- [ ] **Step 6:** verifica visiva su `localhost:3007` solo delle pagine pubbliche (nessun login); le pagine autenticate le verifica l'utente.
- [ ] **Step 7: Commit** `feat(preventivi): prezzario scelto dal comune del cantiere`

### Tasks 5–12: parser per formato

Stesso schema per ogni task: **(1)** ispeziona il file grezzo (in scratchpad `prezzari/<regione>/`, copiato in `scripts/prezzario/data/<regione>/`) con script esterni alla cartella; **(2)** crea la fixture ridotta; **(3)** test con 3 voci reali attese (codice, descrizione che inizia con…, unità, prezzo) + conteggio voci della fixture; **(4)** FAIL; **(5)** implementa `formati/<formato>.ts`; **(6)** PASS; **(7)** aggiungi le fonti in `fonti.ts`; parse del file completo con uno script dry-run (`pnpm prezzario:import <regione> --dry`) che stampa voci totali, scartate e 3 a caso; **(8)** commit `feat(prezzario): parser <formato> (<regioni>)`.

| Task | Formato | Fonti | Voci attese nei test (dai report) |
|---|---|---|---|
| 5 | `easy-xml` (piattaforma gestione-prezzario, XML `EASY:Prezzario` negli zip `*_XML.zip`) | Piemonte 2026, Bolzano 2026, Sardegna 2026, Calabria 2025 | `01.A01.A05.010` m³ 5.91 (PIE); `02.07.01.01.B` m3 751.15 (BOL) |
| 6 | `six` (XML SIX) | Emilia-Romagna 2026 (iso-8859-1, `&#191;` → `'`), Friuli VG 2026.1, Trento 2026 | `B.02.10.0010.007` 12.00 €/m³ (TN) |
| 7 | `veneto-xml`, `basilicata-xml` (UTF-16 dichiarato UTF-8: decodifica dal BOM), `liguria-xml` | Veneto, Basilicata, Liguria (`attivo:false`) | `20.A05.A10.015` m³vpp 44.22 (LIG) |
| 8 | `lombardia-xml` (unità con quantità "1 m²" → `m²`; prezzo 0 scartato) | Lombardia (`attivo:false`) | `LOM261.OC.EEA.Pa02.C0100.H0002.0005.-` 1 m² 43.14 |
| 9 | `xlsx-tabella` con mappa colonne per fonte | Marche (`codice` vuoto = capitolo), Puglia (foglio lavorazioni, descrizione = voce + articolo, prezzo = TOTALE_GENERALE), Umbria (righe `.0` = descrizione madre) | dai file |
| 10 | `sicilia-xls`, `vda-xlsx` (2 righe per voce; errata corrige applicata da tabella `fonti.ts`→`correzioni`) | Sicilia 2024, Valle d'Aosta 2026 | `S01.A50.010` m 81.73 (VDA) |
| 11 | `csv-gerarchico` (`;` senza header, gerarchia dal codice, numeri "1 826,34", cp1252) e `toscana-csv` (`\|`) | Lazio 2023, Toscana 2026 ×10 province (scaricare le 9 mancanti da `https://dati.toscana.it/dataset/prezzario-lavori-2026`) | dai file |
| 12 | `pdf-testo` (`pdftotext -layout`, righe codice `^\d+\.\d+…` + prezzo finale) | Abruzzo 2026 (prefisso `ABR26_`), Molise 2026 + refusi 20/05 (prefisso `MOL26_`) | dai file; in più ≥ 3 voci a campione confrontate a mano col PDF e annotate nel ledger |

Regola condivisa: se un file non rispetta la struttura attesa, il parser lancia `Error("<formato>: <cosa manca>")` invece di restituire una lista vuota (test: buffer vuoto → throw).

### Task 13: Import in produzione e verifica

- [ ] **Step 1:** `pnpm prezzario:import --tutte` (le fonti già presenti vengono aggiornate per upsert).
- [ ] **Step 2:** `select regione, ambito, anno, attivo, count(v.*) from prezzari p left join prezzario_voci v on v.prezzario_id = p.id group by 1,2,3,4 order by 1,2` → 21 regioni/province + 10 ambiti Toscana, nessuna con 0 voci; `pg_database_size` < 2 GB.
- [ ] **Step 3:** `prezzario_per_comune` su 1 comune per regione (Napoli, Bari, Prato → ambito PO, Trento, Bolzano, Aosta, Forlì, …) → prezzario atteso.
- [ ] **Step 4:** `cerca_prezzario('massetto', <id>, 3)` restituisce risultati per ogni prezzario attivo.
- [ ] **Step 5:** `pnpm test`, `tsc`, `lint` verdi; review finale del branch; commit `chore(prezzario): import di tutte le regioni`.
