-- Modulo richiesta (LANDING E FLUSSO, 20/10/2026): formato del preventivo, titolo progetto,
-- consenso privacy. Colonne nullable: le richieste precedenti restano valide.
create type public.richiesta_formato as enum ('pdf_protetto', 'word', 'carta_intestata');

alter table public.richieste_servizio
  add column formato_output public.richiesta_formato,
  add column titolo_progetto text,
  add column consenso_privacy_at timestamptz;

-- Le note diventano facoltative: basta almeno un file.
alter table public.richieste_servizio alter column descrizione drop not null;

-- files: [{path, nome, mime, size, ruolo}] con ruolo documento | logo | altro (assente nelle righe vecchie).

-- Computo metrico anche in Excel o Zip.
update storage.buckets
set allowed_mime_types = array[
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-zip-compressed'
]
where id = 'richieste';
