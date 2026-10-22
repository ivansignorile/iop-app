-- Con ~620k voci in 30 prezzari il GIN globale su search trova le voci di tutti i prezzari
-- e filtra prezzario_id dopo: "massetto" arrivava a 3 s. Indice combinato prezzario + testo.
create extension if not exists btree_gin with schema extensions;
create index prezzario_voci_prezzario_search_idx on public.prezzario_voci using gin (prezzario_id, search);
drop index if exists public.prezzario_voci_search_idx;
