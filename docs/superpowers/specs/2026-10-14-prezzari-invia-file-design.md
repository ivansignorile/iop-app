# IOP — Prezzari regionali, libreria personale, doppia descrizione, INVIA FILE

Fonte: richiesta di Luigi De Simone su WhatsApp, 14/10/2026 ("Materiale per IOP — metti questo in lavorazione"),
documenti `FONDAMENTALE.docx` e `in home + servizio.docx`.

## Requisiti (testo cliente)

### FONDAMENTALE
1. Di base il sistema prende descrizioni e prezzi dai **prezzari regionali**.
2. Possibilità di **caricare vecchi propri preventivi** per creare **librerie personali** di descrizioni e prezzi.
3. Nel preventivo generato ogni voce ha la **doppia descrizione** (prezzario + propria). Se manca la propria, si usa la voce del prezzario.
4. L'utente sceglie **quale delle due tenere** e quale eliminare nel preventivo finale.
5. Nelle **tre modalità** (componi, da foto, da capitolato) all'inizio c'è sempre il selettore: **solo prezzario / solo prezzi propri / entrambi**.

### Home + servizio
6. Hero: "IL TUO PREVENTIVO IN UN CLICK OPPURE INVIACI FOTO + DESCRIZIONE O FOTO + CAPITOLATO E IL TUO PREVENTIVO IN 24 ORE GARANTITO!"
7. Prendere sia chi smanetta col digitale sia chi vuole il servizio.
8. Bottone grande **INVIA FILE** subito sotto il titolo, poi la parte autogestita con le tre possibilità: componi, genera da foto, genera da capitolato.

## Decisioni (Ivan, 14/10/2026)
- Prezzario: schema **multi-regione**, regione scelta nelle impostazioni dell'organizzazione. Import iniziale **Prezzario Regione Campania** (ultima edizione disponibile).
- INVIA FILE: **pubblico, senza login**. Form: nome, email, telefono, tipo (foto+descrizione | foto+capitolato), descrizione, file.
- Notifica al team: **email (Resend)** + **WhatsApp (Green API)**. Pagina admin con la lista richieste.

## Scelte tecniche
- `prezzari` + `prezzario_voci` globali (no `org_id`), ricerca full-text italiano (`tsvector`) via RPC.
- `voci_proprie` per-org, estratte da preventivi caricati (`documenti_libreria`), stessa ricerca full-text.
- `preventivi.fonte_prezzi` enum `prezzario | propri | entrambi` (default `entrambi`).
- `preventivo_interventi`: colonne `codice_prezzario`, `descrizione_prezzario`, `prezzo_prezzario`, `voce_propria_id`, `descrizione_propria`, `prezzo_proprio`, `fonte_scelta` (`prezzario | propria | manuale`).
  `descrizione` e `prezzo_unitario` restano i **valori effettivi** stampati: anteprima e stampa non cambiano.
- Abbinamento voci → nuova edge function `abbina-voci`: per ogni intervento prende i candidati dalle due ricerche full-text e fa scegliere a Claude il codice / la voce propria migliore. Chiamata dopo `genera-da-foto`, dopo `parse-capitolato` e da un bottone "Abbina prezzario" nella tab Interventi.
- Modalità Componi: picker "Cerca voce" che aggiunge l'intervento direttamente da prezzario/libreria.
- Upload pubblico: signed upload URL generati server-side con service role nel bucket privato `richieste`.
