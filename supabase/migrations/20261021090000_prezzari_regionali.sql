-- Prezzari di tutte le regioni: ambito provinciale (Toscana), comuni ISTAT,
-- prezzario fissato sul preventivo e scelto dal comune del cantiere.

alter table public.prezzari
  add column ambito text not null default '',   -- sigla provincia, '' = intera regione
  add column fonte_url text,
  add column licenza text;                      -- note sui vincoli d'uso della fonte
alter table public.prezzari drop constraint prezzari_regione_anno_key;
alter table public.prezzari add constraint prezzari_regione_ambito_anno_key unique (regione, ambito, anno);

-- Normalizza il nome di un comune: minuscolo, senza accenti, apostrofi/trattini come spazi,
-- senza la provincia tra parentesi. "FORLI'" e "Forlì" -> "forli".
create or replace function public.norm_comune(t text)
returns text
language sql immutable parallel safe set search_path = public, extensions as $$
  select trim(regexp_replace(
    regexp_replace(
      lower(extensions.unaccent('extensions.unaccent'::regdictionary, regexp_replace(coalesce(t, ''), '\(.*\)', '', 'g'))),
      '[''’`´\-]', ' ', 'g'),
    '\s+', ' ', 'g'));
$$;

create table public.comuni (
  codice_istat text primary key,
  nome text not null,
  nome_norm text generated always as (public.norm_comune(nome)) stored,
  provincia text not null,   -- sigla automobilistica
  regione text not null      -- slug come prezzari.regione ('trento'/'bolzano' per il Trentino-Alto Adige)
);
create index comuni_nome_norm_idx on public.comuni (nome_norm);
alter table public.comuni enable row level security;
create policy comuni_read on public.comuni for select to authenticated using (true);
-- Scrittura solo via service role (script di import).

alter table public.preventivi
  add column prezzario_id uuid references public.prezzari (id) on delete set null;

-- Prezzario per il comune del cantiere: provincia (listini provinciali), poi regione,
-- poi la regione di fallback dell'organizzazione. Omonimi in più regioni: vale quello
-- della regione di fallback se è l'unico lì, altrimenti nessun indovinello.
create or replace function public.prezzario_per_comune(p_comune text, p_regione_fallback text)
returns uuid
language sql stable security invoker set search_path = public as $$
  with cand as (
    select c.regione, c.provincia from comuni c
    where c.nome_norm = norm_comune(p_comune) and norm_comune(p_comune) <> ''
  ), scelto as (
    select regione, provincia from cand where (select count(*) from cand) = 1
    union all
    select regione, provincia from cand
    where (select count(*) from cand) > 1
      and (select count(*) from cand where regione = p_regione_fallback) = 1
      and regione = p_regione_fallback
  )
  select coalesce(
    (select pz.id from prezzari pz, scelto s
      where pz.attivo and pz.regione = s.regione and pz.ambito = s.provincia
      order by pz.anno desc limit 1),
    (select pz.id from prezzari pz, scelto s
      where pz.attivo and pz.regione = s.regione and pz.ambito = ''
      order by pz.anno desc limit 1),
    (select pz.id from prezzari pz
      where pz.attivo and pz.regione = p_regione_fallback and pz.ambito = ''
      order by pz.anno desc limit 1)
  );
$$;
revoke execute on function public.prezzario_per_comune(text, text) from public, anon;
grant execute on function public.prezzario_per_comune(text, text) to authenticated;

-- Ricerca v3: sul prezzario indicato (fissato sul preventivo).
create or replace function public.cerca_prezzario(q text, p_prezzario uuid, p_limit int default 10)
returns table (id uuid, codice text, descrizione text, unita public.unita_misura, unita_testo text, prezzo numeric, prezzario text, rank real)
language sql stable security invoker set search_path = public, extensions as $$
  with p as (
    select pz.id, pz.titolo from prezzari pz where pz.id = p_prezzario
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

-- Firma per regione: compatibilità, delega alla v3 sul prezzario regionale attivo più recente.
create or replace function public.cerca_prezzario(q text, p_regione text, p_limit int default 10)
returns table (id uuid, codice text, descrizione text, unita public.unita_misura, unita_testo text, prezzo numeric, prezzario text, rank real)
language sql stable security invoker set search_path = public as $$
  select * from cerca_prezzario(q, (
    select pz.id from prezzari pz
    where pz.regione = p_regione and pz.attivo and pz.ambito = ''
    order by pz.anno desc limit 1
  ), p_limit);
$$;
