-- Libreria personale: documenti caricati e voci proprie con ricerca full-text.
create type public.documento_stato as enum ('caricato', 'in_elaborazione', 'elaborato', 'errore');

create table public.documenti_libreria (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  storage_path text not null,       -- bucket 'preventivi': {org_id}/libreria/{uuid}-{nome}
  nome_file text not null,
  stato public.documento_stato not null default 'caricato',
  voci_estratte integer not null default 0,
  errore text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create table public.voci_proprie (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  documento_id uuid references public.documenti_libreria (id) on delete set null,
  titolo text not null,
  descrizione text not null,
  unita public.unita_misura not null default 'corpo',
  prezzo numeric(12, 2) not null,
  categoria text,
  search tsvector generated always as (
    setweight(to_tsvector('italian', titolo), 'A')
    || setweight(to_tsvector('italian', descrizione), 'B')
    || setweight(to_tsvector('italian', coalesce(categoria, '')), 'C')
  ) stored,
  created_at timestamptz not null default now()
);
create index voci_proprie_search_idx on public.voci_proprie using gin (search);
create index voci_proprie_org_idx on public.voci_proprie (org_id);

alter table public.documenti_libreria enable row level security;
alter table public.voci_proprie enable row level security;
create policy documenti_libreria_org on public.documenti_libreria for all to authenticated
  using (org_id in (select public.user_org_ids()))
  with check (org_id in (select public.user_org_ids()));
create policy voci_proprie_org on public.voci_proprie for all to authenticated
  using (org_id in (select public.user_org_ids()))
  with check (org_id in (select public.user_org_ids()));

create or replace function public.cerca_voci_proprie(q text, p_org uuid, p_limit int default 5)
returns table (id uuid, titolo text, descrizione text, unita public.unita_misura, prezzo numeric, rank real)
language sql stable security invoker set search_path = public, extensions as $$
  with words as (
    select w, n, max(n) over () as last_n
    from regexp_split_to_table(lower(extensions.unaccent(coalesce(q, ''))), '[^a-z0-9]+') with ordinality as t(w, n)
    where length(w) > 1
  ), terms as (
    select string_agg(case when n = last_n then w || ':*' else w end, ' & ' order by n) as and_s,
           string_agg(case when n = last_n then w || ':*' else w end, ' | ' order by n) as or_s
    from words
  ), tq as (
    select to_tsquery('italian', and_s) as and_q, to_tsquery('italian', or_s) as or_q
    from terms where and_s is not null
  ), hits_and as (
    select v.id, v.titolo, v.descrizione, v.unita, v.prezzo, ts_rank(v.search, tq.and_q) as r
    from voci_proprie v, tq
    where v.org_id = p_org and numnode(tq.and_q) > 0 and v.search @@ tq.and_q
    order by r desc, v.titolo asc
    limit least(greatest(coalesce(p_limit, 5), 1), 50)
  ), hits_or as (
    select v.id, v.titolo, v.descrizione, v.unita, v.prezzo, ts_rank(v.search, tq.or_q) as r
    from voci_proprie v, tq
    where v.org_id = p_org and numnode(tq.or_q) > 0 and v.search @@ tq.or_q
      and not exists (select 1 from hits_and)
    order by r desc, v.titolo asc
    limit least(greatest(coalesce(p_limit, 5), 1), 50)
  )
  select h.id, h.titolo, h.descrizione, h.unita, h.prezzo, h.r
  from (select * from hits_and union all select * from hits_or) h
  order by h.r desc, h.titolo asc;
$$;

revoke execute on function public.cerca_voci_proprie(text, uuid, int) from public, anon;
grant execute on function public.cerca_voci_proprie(text, uuid, int) to authenticated;
