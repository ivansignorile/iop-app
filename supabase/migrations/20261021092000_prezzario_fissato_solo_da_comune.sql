-- Fix review: il prezzario si fissa sul preventivo solo quando arriva dal comune del
-- cantiere (mai dal ripiego regionale), si azzera quando cambiano comune/provincia
-- dell'edificio (anche da parse-capitolato), usa la provincia per omonimi e nomi non
-- trovati, e i prezzari non attivi (licenza in attesa) non sono leggibili.

drop function public.prezzario_per_comune(text, text);

-- Risolve regione/provincia del cantiere: nome normalizzato (con la provincia per gli
-- omonimi), altrimenti la sola sigla di provincia. Nessuna riga = non risolto.
create or replace function public.luogo_cantiere(p_comune text, p_provincia text, p_regione_fallback text)
returns table (regione text, provincia text)
language sql stable security invoker set search_path = public as $$
  with prov as (select upper(nullif(trim(coalesce(p_provincia, '')), '')) as sigla),
  cand as (
    select c.regione, c.provincia from comuni c
    where c.nome_norm = norm_comune(p_comune) and norm_comune(p_comune) <> ''
  ), filtrati as (
    select * from cand, prov where prov.sigla is not null and cand.provincia = prov.sigla
  ), per_nome as (
    select regione, provincia from filtrati where (select count(*) from filtrati) = 1
    union all
    select regione, provincia from cand where not exists (select 1 from filtrati) and (select count(*) from cand) = 1
    union all
    select regione, provincia from cand
    where not exists (select 1 from filtrati) and (select count(*) from cand) > 1
      and (select count(*) from cand where regione = p_regione_fallback) = 1
      and regione = p_regione_fallback
  )
  select regione, provincia from per_nome
  union all
  select (select c.regione from comuni c where c.provincia = prov.sigla limit 1), prov.sigla from prov
  where not exists (select 1 from per_nome) and exists (select 1 from comuni c where c.provincia = prov.sigla)
  limit 1;
$$;

-- Prezzario attivo per il cantiere (provincia, poi regione); null se il luogo non è risolto
-- o la sua regione non ha prezzari attivi.
create or replace function public.prezzario_per_comune(p_comune text, p_regione_fallback text, p_provincia text default null)
returns uuid
language sql stable security invoker set search_path = public as $$
  select coalesce(
    (select pz.id from prezzari pz, luogo_cantiere(p_comune, p_provincia, p_regione_fallback) l
      where pz.attivo and pz.regione = l.regione and pz.ambito = l.provincia
      order by pz.anno desc limit 1),
    (select pz.id from prezzari pz, luogo_cantiere(p_comune, p_provincia, p_regione_fallback) l
      where pz.attivo and pz.regione = l.regione and pz.ambito = ''
      order by pz.anno desc limit 1)
  );
$$;
revoke execute on function public.prezzario_per_comune(text, text, text) from public, anon;
grant execute on function public.prezzario_per_comune(text, text, text) to authenticated;
revoke execute on function public.luogo_cantiere(text, text, text) from public, anon;
grant execute on function public.luogo_cantiere(text, text, text) to authenticated;

-- Ripiego dell'organizzazione: listino regionale, altrimenti il primo provinciale (Toscana).
create or replace function public.prezzario_ripiego(p_regione text)
returns uuid
language sql stable security invoker set search_path = public as $$
  select pz.id from prezzari pz
  where pz.attivo and pz.regione = p_regione
  order by (pz.ambito = '') desc, pz.anno desc, pz.ambito limit 1;
$$;
revoke execute on function public.prezzario_ripiego(text) from public, anon;
grant execute on function public.prezzario_ripiego(text) to authenticated;

-- Fissa il prezzario solo se viene dal comune; il ripiego si ricalcola a ogni lettura.
-- fallback = si sta usando il ripiego dell'organizzazione con un comune indicato.
create or replace function public.prezzario_del_preventivo(p_preventivo uuid)
returns table (id uuid, titolo text, regione text, ambito text, fallback boolean)
language plpgsql volatile security invoker set search_path = public as $$
declare
  v_id uuid;
  v_comune text;
  v_provincia text;
  v_regione text;
  v_fallback boolean := false;
begin
  select p.prezzario_id, e.comune, e.provincia, o.regione into v_id, v_comune, v_provincia, v_regione
  from preventivi p
  join organizations o on o.id = p.org_id
  left join edifici e on e.id = p.edificio_id
  where p.id = p_preventivo;
  if not found then return; end if;

  if v_id is null then
    v_id := prezzario_per_comune(v_comune, v_regione, v_provincia);
    if v_id is not null then
      update preventivi set prezzario_id = v_id where preventivi.id = p_preventivo;
    else
      v_id := prezzario_ripiego(v_regione);
      v_fallback := norm_comune(v_comune) <> '' or coalesce(trim(v_provincia), '') <> '';
    end if;
  end if;

  return query
  select pz.id, pz.titolo, pz.regione, pz.ambito, v_fallback
  from prezzari pz where pz.id = v_id;
end;
$$;

-- Cambio di comune/provincia dell'edificio (da qualunque punto: form, parse-capitolato):
-- i preventivi collegati ricalcolano il prezzario alla prossima lettura.
create or replace function public.edifici_azzera_prezzario()
returns trigger
language plpgsql security invoker set search_path = public as $$
begin
  if new.comune is distinct from old.comune or new.provincia is distinct from old.provincia then
    update preventivi set prezzario_id = null where edificio_id = new.id and prezzario_id is not null;
  end if;
  return new;
end;
$$;
revoke execute on function public.edifici_azzera_prezzario() from public, anon;
create trigger edifici_azzera_prezzario
  after update of comune, provincia on public.edifici
  for each row execute function public.edifici_azzera_prezzario();

-- Prezzari con licenza in attesa (attivo = false): voci non leggibili dagli utenti.
drop policy prezzario_voci_read on public.prezzario_voci;
create policy prezzario_voci_read on public.prezzario_voci for select to authenticated
  using (exists (select 1 from public.prezzari p where p.id = prezzario_id and p.attivo));

-- Nota: comuni.nome_norm è generata da norm_comune(); se la funzione cambia,
-- ricalcolare con `update comuni set nome = nome`.
