-- Anti-replay atomico: una cartella di upload puo' generare una sola richiesta.
alter table public.richieste_servizio add column cartella text;
create unique index richieste_servizio_cartella_key on public.richieste_servizio (cartella);
