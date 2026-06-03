-- Feature 5: superficie facciata stimata da foto (modificabile)
alter table public.edifici
  add column superficie_stimata_mq numeric(12, 2);

comment on column public.edifici.superficie_stimata_mq is
  'Superficie facciata stimata da foto (modificabile manualmente)';
