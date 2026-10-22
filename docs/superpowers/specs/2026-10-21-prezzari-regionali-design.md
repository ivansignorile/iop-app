# Prezzari regionali — design

Data: 2026-10-21 · Stato: bozza da confermare

## Obiettivo

Caricare i prezzari ufficiali di tutte le 21 amministrazioni (19 regioni + Province autonome di Trento e Bolzano) e scegliere il prezzario di ogni preventivo dal **comune del cantiere**, non più dalla regione dell'organizzazione (decisione Luigi, 21/10: "prezzario preso di volta in volta in base al comune dei lavori").

## Decisioni prese

- **Toscana per provincia**: 10 listini distinti, scelti dalla provincia del comune del cantiere (decisione Ivan, 21/10).
- **Licenze**: si importa tutto. Liguria e Lombardia restano `attivo = false` finché non arriva l'autorizzazione scritta (richiesta a carico di Barikreativa/Luigi). Trento: si usa solo SIX/XLSX, mai il formato PriMus (XPWE) per il disclaimer ACCA.
- **Fallback**: se il comune manca o non è riconosciuto, si usa `organizations.regione` (comportamento attuale).
- **Stabilità**: il prezzario scelto viene fissato sul preventivo (`preventivi.prezzario_id`), così un preventivo non cambia listino quando esce l'edizione dell'anno dopo.

## Fonti (dai report in scratchpad/prezzari)

| Amministrazione | Ed. | Formato | Parser |
|---|---|---|---|
| Campania, Sardegna, Calabria | 2026 / 2026 / 2025 | API "gestione-prezzario" JSON | `api-llpp` (esistente, generalizzato) |
| Piemonte, Bolzano | 2026 | XML `EASY:Prezzario` | `easy-xml` |
| Emilia-Romagna, Friuli VG, Trento | 2026 | XML SIX | `six` |
| Veneto | 2026 | XML proprio | `veneto-xml` |
| Basilicata | 2026 | XML proprio (UTF-16) | `basilicata-xml` |
| Liguria | 2026 | XML proprio | `liguria-xml` |
| Lombardia | 2026 | XML / XLSX descrizione completa | `lombardia` |
| Marche, Puglia | 2026 | XLSX tabellare | `xlsx-tabella` (mappa colonne per fonte) |
| Umbria | 2025 | XLSX, righe `.0` = descrizione madre | `umbria-xlsx` |
| Sicilia | 2024 (prorogato) | XLS, gerarchia dal codice | `sicilia-xls` |
| Valle d'Aosta | 2026 | XLSX da stampa, 2 righe per voce + errata | `vda-xlsx` |
| Lazio | 2023 (prorogato) | CSV `;` senza header | `lazio-csv` |
| Toscana (×10 province) | 2026 | CSV `\|` | `toscana-csv` |
| Abruzzo, Molise | 2026 | solo PDF | `pdf-testo` (pdftotext -layout), ultimi |

Regole comuni a tutti i parser (già in `parse.ts`): descrizione = testo del padre + testo della voce foglia; scarto prezzo nullo/≤0; `mapUnita` per l'unità; codice senza prefisso di fonte; prezzo arrotondato a 2 decimali; codici duplicati → primo vince.

## Modello dati (migrazione)

- `prezzari`: + `ambito text not null default ''` (sigla provincia per Toscana, `''` = intera regione), + `fonte_url text`, + `licenza text`. Vincolo unico da `(regione, anno)` a `(regione, ambito, anno)`.
- Nuova `comuni (codice_istat text pk, nome text, nome_norm text, provincia text /*sigla*/, regione text /*slug*/)`, lettura per `authenticated`, popolata da script dal CSV ISTAT "Elenco comuni italiani". Indice su `nome_norm`.
- `preventivi`: + `prezzario_id uuid references prezzari on delete set null`.
- Funzione `prezzario_per_comune(p_comune text, p_regione_fallback text) returns uuid`: normalizza il nome (minuscolo, senza accenti, apostrofi/spazi uniformati), trova regione+provincia, sceglie il prezzario attivo più recente con `ambito = provincia`, altrimenti `ambito = ''`, altrimenti quello del fallback.
- `cerca_prezzario` v3 con firma `(q text, p_prezzario uuid, p_limit int)`; la vecchia firma resta e delega risolvendo la regione (compatibilità).

## Flusso nell'app

1. Quando si salva il comune del cantiere (edificio del preventivo) o alla prima ricerca senza `prezzario_id`, l'azione calcola `prezzario_per_comune` e lo scrive sul preventivo.
2. `cercaVoci` usa `preventivo.prezzario_id`.
3. Editor e anteprima mostrano il titolo del prezzario in uso (es. "Prezzario Regione Toscana 2026 — Firenze") e, se è stato usato il fallback, un avviso "Comune non riconosciuto: uso il prezzario di <regione>".
4. Impostazioni: la regione dell'org resta come "prezzario predefinito".
5. Cambio comune su un preventivo con voci già inserite: il prezzario si aggiorna per le ricerche successive; le voci già presenti non vengono toccate.

## Import

- `scripts/prezzario/fonti.ts`: registro dichiarativo `{ regione, ambito, anno, titolo, url, formato, licenza, attivo }`.
- `scripts/prezzario/formati/<formato>.ts`: `parse(buf: Buffer): VoceNormalizzata[]`, puro e testato con fixture ridotte in `scripts/prezzario/fixtures/`.
- `pnpm prezzario:import <regione> [ambito]` scarica (o legge il file in `scripts/prezzario/data/`, git-ignored), fa il parse, upsert in blocchi da 500, stampa conteggi.
- `pnpm comuni:import` carica il CSV ISTAT.
- Controllo a campione: per ogni fonte, 3 voci verificate a mano contro il documento ufficiale (codice, prezzo, unità) e annotate nel piano.

## Fuori scope

- Aggiornamento automatico annuale (cron): si rilancia lo script a mano.
- Prezzari provinciali diversi dalla Toscana.
- Ricalcolo dei prezzi sulle voci già inserite quando cambia il prezzario.

## Rischi

- DB: circa 650 MB stimati, entro il piano Pro (8 GB).
- PDF di Abruzzo e Molise: qualità incerta, importati per ultimi e verificati a campione.
- Nomi dei comuni scritti a mano dagli utenti: normalizzazione + match esatto; se non trova, fallback esplicito (non si indovina).
