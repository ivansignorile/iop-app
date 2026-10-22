-- Con la policy RLS su prezzario_voci, `search @@ q` (non leakproof) non può entrare
-- nell'indice prima del controllo di sicurezza: la ricerca scorreva tutte le voci del
-- prezzario (fino a 3 s). La ricerca diventa security definer e applica da sé la stessa
-- regola della policy (solo prezzari attivi); la policy resta per le letture dirette.
create or replace function public.cerca_prezzario(q text, p_prezzario uuid, p_limit int default 10)
returns table (id uuid, codice text, descrizione text, unita public.unita_misura, unita_testo text, prezzo numeric, prezzario text, rank real)
language sql stable security definer set search_path = public, extensions as $$
  with p as (
    select pz.id, pz.titolo from prezzari pz where pz.id = p_prezzario and pz.attivo
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
revoke execute on function public.cerca_prezzario(text, uuid, int) from public, anon;
grant execute on function public.cerca_prezzario(text, uuid, int) to authenticated;
