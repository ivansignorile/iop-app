-- 20261015130000_doppia_descrizione.sql
create type public.fonte_prezzi as enum ('prezzario', 'propri', 'entrambi');
create type public.fonte_scelta as enum ('prezzario', 'propria', 'manuale');

alter table public.preventivi add column fonte_prezzi public.fonte_prezzi not null default 'entrambi';

alter table public.preventivo_interventi
  add column prezzario_voce_id uuid references public.prezzario_voci (id) on delete set null,
  add column codice_prezzario text,
  add column descrizione_prezzario text,
  add column prezzo_prezzario numeric(12, 2),
  add column voce_propria_id uuid references public.voci_proprie (id) on delete set null,
  add column descrizione_propria text,
  add column prezzo_proprio numeric(12, 2),
  add column fonte_scelta public.fonte_scelta,
  add column abbinamento_avviso text;
