# IOP — Landing, flusso richieste, formati di output, prezzari per regione

Fonte: Luigi De Simone su WhatsApp.
- 16/10/2026: "I prezzari devono essere di tutta la nazione: se il cliente scrive da Roma bisogna utilizzare il prezzario aggiornato Lazio, regionale. Modifica essenziale."
- 20/10/2026: documenti `LANDING E FLUSSO.docx`, `Copy.docx`, `📊 Analisi SWOT.docx`.

Questo documento confronta le richieste con lo stato attuale (main @ `020362a`) e divide il lavoro in fasi.
Ogni fase avrà un suo piano; il piano della Fase 1 è `docs/superpowers/plans/2026-10-20-fase1-landing-modulo.md`.

## Requisiti (testo cliente, sintesi fedele)

### LANDING E FLUSSO
- R1. Landing che spiega il servizio con due modalità: **Self istantaneo** ed **Elaborato dal tecnico (consegna in 24 ore)**. Moduli e campi **identici** per le due modalità.
- R2. All'invio dal sito il sistema genera un **PDF completo di ogni dettaglio** e lo invia **via email al team**.
- R3. Se il cliente carica allegati (computo metrico, richieste particolari), il PDF **li integra**.
- R4. Il PDF arriva **pronto per essere caricato nel gestionale** senza interventi manuali; il software elabora e genera il preventivo con tutte le opzioni e gli allegati.
- R5. Nel PDF sono riportate tutte le scelte del cliente, incluso il formato di output scelto.
- R6. Formati di output del preventivo:
  - **Base**: PDF non modificabile, con filigrana aziendale e protetto da copia.
  - **Editabile**: Word (.docx).
  - **Personalizzato**: su carta intestata del cliente.
- R7. Campi del modulo:
  1. modalità;
  2. nome/ragione sociale, email, telefono;
  3. formato;
  4. titolo/riferimento del progetto, note e indicazioni particolari;
  5. upload di computo metrico o documentazione tecnica (PDF, Excel, Zip), di carta intestata o logo (PNG, PDF, JPG; obbligatorio solo se il formato è "carta intestata") e di altri allegati;
  6. consenso privacy, pulsante "INVIA E GENERA RICHIESTA".

### Copy
- R8. Testi della landing:
  - Titolo: "Il Preventivo Edile Perfetto in Pochi Clic. Senza Frustrazioni, Senza Incertezze."
  - Sottotitolo sui prezzari regionali ufficiali, CTA.
  - Tre sezioni per pubblico: Privati, Tecnici, Imprese.
  - Sezione modalità: Self / Tecnico 24h.

### Analisi SWOT (suggerimenti, non requisiti vincolanti)
- R9. Campi guidati con tooltip ("Cos'è un computo metrico?") e una spinta verso il Tecnico 24h per i privati.
- R10. Nel preventivo, dicitura chiara del **prezzario di riferimento e dell'anno**.
- R11. Soglia di complessità: per i casi fuori standard, il Self suggerisce di passare al Tecnico 24h.
- R12. Export anche in **Excel**; **primo preventivo gratis**.

### Bozza grafica della home (20/10, 20:22, "Solo una primissima bozza")
Immagine `bozza-20-10.jpg` (1408×768, mockup generato). Elementi:
- **Nav:** logo IOP, link Funzionalità / Prezzari / Prezzi, pulsante "Accedi / Registrati".
- **Hero:**
  - titolo "**IOP. IL PREVENTIVO FACILE, TRASPARENTE E VELOCE**";
  - sottotitolo "Ottieni preventivi edili professionali basati su prezzari regionali ufficiali. **Semplice per i privati, potente per i professionisti.**";
  - una sola CTA "**GENERA IL TUO PREVENTIVO ORA**".
- **Tre card:**
  - Per il privato: "Preventivi chiari in minuti", "Trasparenza garantita dai prezzari regionali".
  - Per il tecnico: "Risparmia ore di lavoro non retribuito".
  - Per l'impresa edile: "Riduzione tempi di preventivazione".
- **Quattro punti di forza:** "Prezzari regionali sempre aggiornati", "Export editabile (Word/PDF/Excel)", "Modalità self o con validazione tecnica", "Gestione anagrafiche e loghi aziendali".
- **Come funziona:** 1. Seleziona lavorazioni e quantità → 2. **Scelta regione e prezzario** → 3. Scarica il preventivo professionale.
- **Footer:** Termini di Servizio, Privacy Policy, logo con "La Nuova Era della Preventivazione Edile", Facebook, Instagram.

Note di Luigi alla bozza: non ha ancora guardato IOP in funzione ("andrò a vedere quando inizierò a fare i test"). Quindi nessun feedback sull'app attuale.

- R14. La home segue la bozza (layout, sezioni) e prende i testi lunghi da `Copy.docx`, dove la bozza non li ha.

### Prezzari (16/10)
- R13. Prezzario della **regione del cliente/cantiere** (Roma → Lazio), su tutta Italia.

## Stato attuale e gap

| Req | Stato | Cosa c'è oggi | Gap |
|---|---|---|---|
| R1 landing | Parziale | `src/app/page.tsx`: hero 14/10, bottone INVIA FILE → `/invia`, tre card "Fai da te" che portano a `/preventivi/nuovo` (richiede login) | Nuovo copy, sezioni target, due modalità esplicite |
| R1 modulo unico | Manca | `/invia` copre solo il flusso 24h; il Self è l'app con login | Self pubblico senza login (Fase 5) |
| R2 PDF al team | Manca | `src/lib/notifiche/invia.ts`: email Resend in solo testo, nessun allegato; WhatsApp Green API | PDF di riepilogo generato lato server e allegato all'email |
| R3 allegati nel PDF | Manca | I file stanno nel bucket `richieste`, visibili solo da `/admin/richieste/[id]` | Unione di PDF e immagini nel riepilogo; Excel e Zip allegati a parte |
| R4 import nel gestionale | Manca | Una richiesta non è collegata a un preventivo | "Crea preventivo da richiesta" in admin, che lancia `parse-capitolato` / `genera-da-foto` + `abbina-voci` |
| R5 scelte nel PDF | Manca | — | Segue R2 + R7 |
| R6 PDF protetto + filigrana | Manca | Stampa dal browser (`/stampa/preventivo/[id]`, `window.print()`) | PDF generato lato server, filigrana, cifratura con permessi |
| R6 Word | Manca | Nessuna libreria docx | Export `.docx` |
| R6 carta intestata | Parziale | Solo `organizations.logo_url` (logo dell'org IOP) | Logo/intestazione **del cliente** caricati dal modulo, usati nell'export |
| R7 campi | Parziale | nome, email, telefono, comune, tipo, descrizione, file (immagini, PDF, Word, txt); almeno 1 foto obbligatoria; **nessun consenso privacy** | Formato, titolo progetto, upload per ruolo, Excel/Zip, logo, privacy + pagina `/privacy` |
| R8 copy | Manca | — | Riscrittura della home |
| R9 tooltip | Manca | — | Nella Fase 1, sui campi upload |
| R10 prezzario e anno | Parziale | `preview.tsx` stampa "Rif. Prezzario Regione X – codice" per voce | Riga in intestazione/riepilogo: "Prezzario di riferimento: Regione X, anno N" |
| R11 soglia complessità | Manca | — | Fase 5 |
| R12 Excel / primo gratis | Manca | — | Excel in Fase 4; "primo gratis" richiede la parte di pagamento: fuori scope finché non esiste un listino |
| R13 regione per preventivo | Parziale | Schema multi-regione pronto (`prezzari.regione`, `cerca_prezzario(q, p_regione)`), ma la regione è dell'**organizzazione** (`organizations.regione`); dati solo Campania 2026; importer solo per il JSON API Campania | Regione sul preventivo, derivata dal comune/CAP; importer per le altre regioni |

## Decisioni aperte (per Luigi o Ivan)

- **D1 — Self istantaneo senza login?** Luigi vuole lo stesso modulo per le due modalità. Oggi il Self è l'app con account.
  - *Proposta:* Fase 1: la CTA "Self" porta all'app (signup/login). Fase 5: Self pubblico dal modulo, con limiti d'uso, perché ogni generazione costa chiamate a Claude.
- **D2 — "Gestionale".** Si intende IOP stesso?
  - *Proposta:* sì. R4 diventa il pulsante "Crea preventivo da richiesta" in admin. Il PDF via email resta come riepilogo e archivio.
- **D3 — Regione: cantiere o cliente?** Domanda già fatta il 16/10, senza risposta. Stesso per "20 regioni subito o a fasi".
  - *Proposta:* cantiere, quindi il campo `comune` del modulo e dell'anagrafica. A fasi: Campania, Lazio, Lombardia.
- **D4 — Foto obbligatoria?** Oggi `/invia` richiede almeno una foto. Il modulo di Luigi non la chiede (un tecnico può mandare solo il computo).
  - *Proposta:* almeno 1 file qualsiasi. Le note restano facoltative se c'è almeno un file.
- **D5 — Hero.** Tre versioni in conflitto:
  - 14/10: "Il tuo preventivo in un click" + bottone grande INVIA FILE;
  - `Copy.docx`: "Il Preventivo Edile Perfetto in Pochi Clic…";
  - bozza grafica: "IOP. Il preventivo facile, trasparente e veloce" + una sola CTA "Genera il tuo preventivo ora".
  - *Proposta:* titolo e CTA della bozza, l'ultima arrivata. La CTA porta a una scelta Self / Tecnico 24h (`/invia` per il tecnico). Il bottone INVIA FILE non è più in hero ma resta nella sezione modalità. **Da confermare con Luigi.**
- **D7 — Nav "Prezzi" e Termini di Servizio.** Nella bozza ci sono una pagina prezzi e i termini, ma non esistono né listino né testo.
  - *Proposta:* in Fase 1 la voce "Prezzi" non c'è (manca il listino), "Prezzari" è un'ancora alla sezione prezzari, "Termini" è una pagina provvisoria come la privacy.
- **D3 (indizio dalla bozza):** il passo 2 "Scelta regione e prezzario" fa pensare a una **scelta esplicita** dell'utente. Coerente con la proposta: regione derivata dal comune ma modificabile.
- **D6 — Testo privacy.** Già chiesto a Luigi il 16/10.
  - Fase 1 pubblica `/privacy` con un testo provvisorio, da sostituire prima del go-live.

## Fasi

| Fase | Contenuto | Requisiti | Dipende da |
|---|---|---|---|
| **1** | Landing con nuovo copy + modulo `/invia` con i campi di Luigi + privacy | R1 (parte), R7, R8, R9 | D4, D5, D6 (provvisorio ok) |
| **2** | PDF di riepilogo della richiesta (scelte + allegati uniti) allegato all'email del team | R2, R3, R5 | Fase 1 |
| **3** | "Crea preventivo da richiesta" in admin (anagrafica + allegati → pipeline AI esistente) | R4 | Fase 1, D2 |
| **4** | Export del preventivo: PDF lato server con filigrana e protezione, Word, carta intestata del cliente, Excel; riga prezzario + anno | R6, R10, R12 (Excel) | Fase 3 per la carta intestata da richiesta |
| **5** | Self istantaneo pubblico dallo stesso modulo + soglia di complessità | R1, R11 | D1, Fase 4 |
| **6** | Prezzario per preventivo da comune/CAP + import di altre regioni | R13 | D3 |

La Fase 6 è indipendente dalle altre e Luigi la considera essenziale: può partire in parallelo appena arriva la risposta su D3.

## Scelte tecniche (proposte, da confermare nei piani di fase)
- **PDF lato server:** `pdf-lib` per il riepilogo, l'unione degli allegati PDF e l'inserimento delle immagini (Fase 2). La filigrana sul preventivo (Fase 4) si fa con `pdf-lib` sopra il PDF già generato.
  - Rendering del preventivo: verificare in Fase 4 `@react-pdf/renderer` (riscrive il layout) contro Chromium headless (riusa `preview.tsx`, più pesante su Vercel).
- **Protezione da copia:** pdf-lib non cifra. Serve una libreria di cifratura con permessi (niente copia/modifica) da scegliere in Fase 4.
  - Da dire al cliente: la protezione PDF scoraggia, ma non impedisce, la copia.
- **Word:** libreria `docx`. **Excel:** `exceljs`.
- **Email con allegati:** Resend accetta `attachments` (base64), con un limite totale di 40 MB per email. Oltre il limite si manda il link firmato all'admin invece dell'allegato.
- **Comune → regione:** dataset ISTAT dei comuni (tabella `comuni`: nome, provincia, regione, cap), caricato da uno script come per il prezzario.
