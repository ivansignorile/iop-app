-- Ricerca prezzario v2: colonna search pesata (descrizione > codice > capitolo),
-- AND con fallback OR, prefisso sull'ultima parola, limite e permessi.
drop index if exists public.prezzario_voci_search_idx;
alter table public.prezzario_voci drop column search;
alter table public.prezzario_voci add column search tsvector generated always as (
  setweight(to_tsvector('italian', descrizione), 'A')
  || setweight(to_tsvector('italian', coalesce(codice, '')), 'B')
  || setweight(to_tsvector('italian', coalesce(capitolo, '')), 'C')
) stored;
create index prezzario_voci_search_idx on public.prezzario_voci using gin (search);

create or replace function public.cerca_prezzario(q text, p_regione text, p_limit int default 10)
returns table (id uuid, codice text, descrizione text, unita public.unita_misura, unita_testo text, prezzo numeric, prezzario text, rank real)
language sql stable security invoker set search_path = public, extensions as $$
  with p as (
    select pz.id, pz.titolo from prezzari pz
    where pz.regione = p_regione and pz.attivo
    order by pz.anno desc limit 1
  ), words as (
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
    select v.id, v.codice, v.descrizione, v.unita, v.unita_testo, v.prezzo, p.titolo, ts_rank(v.search, tq.and_q) as r
    from prezzario_voci v join p on v.prezzario_id = p.id, tq
    where numnode(tq.and_q) > 0 and v.search @@ tq.and_q
    order by r desc, v.codice asc
    limit least(greatest(coalesce(p_limit, 10), 1), 50)
  ), hits_or as (
    select v.id, v.codice, v.descrizione, v.unita, v.unita_testo, v.prezzo, p.titolo, ts_rank(v.search, tq.or_q) as r
    from prezzario_voci v join p on v.prezzario_id = p.id, tq
    where numnode(tq.or_q) > 0 and v.search @@ tq.or_q
      and not exists (select 1 from hits_and)
    order by r desc, v.codice asc
    limit least(greatest(coalesce(p_limit, 10), 1), 50)
  )
  select h.id, h.codice, h.descrizione, h.unita, h.unita_testo, h.prezzo, h.titolo, h.r
  from (select * from hits_and union all select * from hits_or) h
  order by h.r desc, h.codice asc;
$$;

revoke execute on function public.cerca_prezzario(text, text, int) from public, anon;
grant execute on function public.cerca_prezzario(text, text, int) to authenticated;
