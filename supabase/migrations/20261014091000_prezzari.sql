-- 20261014091000_prezzari.sql
create extension if not exists unaccent with schema extensions;

create table public.prezzari (
  id uuid primary key default gen_random_uuid(),
  regione text not null,          -- slug: 'campania', 'puglia', ...
  anno integer not null,
  titolo text not null,           -- es. 'Prezzario Regione Campania 2025'
  attivo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (regione, anno)
);

create table public.prezzario_voci (
  id uuid primary key default gen_random_uuid(),
  prezzario_id uuid not null references public.prezzari (id) on delete cascade,
  codice text not null,
  capitolo text,
  descrizione text not null,
  unita_testo text not null,                 -- come nel prezzario ('m²', 'cad', ...)
  unita public.unita_misura not null,        -- mappata
  prezzo numeric(12, 2) not null,
  search tsvector generated always as (
    to_tsvector('italian', coalesce(codice, '') || ' ' || coalesce(capitolo, '') || ' ' || descrizione)
  ) stored,
  unique (prezzario_id, codice)
);
create index prezzario_voci_search_idx on public.prezzario_voci using gin (search);

alter table public.organizations add column regione text not null default 'campania';

alter table public.prezzari enable row level security;
alter table public.prezzario_voci enable row level security;
create policy prezzari_read on public.prezzari for select to authenticated using (true);
create policy prezzario_voci_read on public.prezzario_voci for select to authenticated using (true);
-- Scrittura solo via service role (script di import).

-- Ricerca: termini in OR, ordinati per rank, solo prezzario attivo più recente della regione.
create or replace function public.cerca_prezzario(q text, p_regione text, p_limit int default 10)
returns table (id uuid, codice text, descrizione text, unita public.unita_misura, unita_testo text, prezzo numeric, prezzario text, rank real)
language sql stable security invoker set search_path = public, extensions as $$
  with p as (
    select id, titolo from prezzari
    where regione = p_regione and attivo
    order by anno desc limit 1
  ), tq as (
    select to_tsquery('italian', string_agg(w, ' | ')) as query
    from regexp_split_to_table(lower(extensions.unaccent(q)), '[^a-z0-9]+') w
    where length(w) > 2
  )
  select v.id, v.codice, v.descrizione, v.unita, v.unita_testo, v.prezzo, p.titolo, ts_rank(v.search, tq.query)
  from prezzario_voci v join p on v.prezzario_id = p.id, tq
  where tq.query is not null and v.search @@ tq.query
  order by ts_rank(v.search, tq.query) desc
  limit p_limit;
$$;
grant execute on function public.cerca_prezzario(text, text, int) to authenticated;
