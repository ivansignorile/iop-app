-- Modalità foto v2: la guida del degrado mappa livello -> ciclo di lavorazione
alter table public.degrado_samples
  add column ciclo_id uuid references public.cicli_lavorazione (id) on delete set null;

comment on column public.degrado_samples.ciclo_id is
  'Ciclo di lavorazione associato al livello di degrado (mappa master Guida-Degrado)';
