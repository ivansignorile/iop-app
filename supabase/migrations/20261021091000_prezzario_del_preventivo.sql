-- Prezzario del preventivo: quello fissato, altrimenti calcolato dal comune del cantiere
-- (edificio) con fallback sulla regione dell'organizzazione, e salvato sul preventivo.

-- Fallback: regioni senza listino regionale (Toscana, solo provinciali) usano il primo
-- listino provinciale attivo, così la ricerca non resta vuota.
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
      where pz.attivo and pz.regione = p_regione_fallback
      order by (pz.ambito = '') desc, pz.anno desc, pz.ambito limit 1)
  );
$$;

-- fallback = il comune è scritto ma non porta a un listino della sua regione.
create or replace function public.prezzario_del_preventivo(p_preventivo uuid)
returns table (id uuid, titolo text, regione text, ambito text, fallback boolean)
language plpgsql volatile security invoker set search_path = public as $$
declare
  v_id uuid;
  v_comune text;
  v_regione text;
begin
  select p.prezzario_id, e.comune, o.regione into v_id, v_comune, v_regione
  from preventivi p
  join organizations o on o.id = p.org_id
  left join edifici e on e.id = p.edificio_id
  where p.id = p_preventivo;
  if not found then return; end if;

  if v_id is null then
    v_id := prezzario_per_comune(v_comune, v_regione);
    if v_id is not null then
      update preventivi set prezzario_id = v_id where preventivi.id = p_preventivo;
    end if;
  end if;

  return query
  select pz.id, pz.titolo, pz.regione, pz.ambito,
    norm_comune(v_comune) <> '' and not exists (
      select 1 from comuni c where c.nome_norm = norm_comune(v_comune) and c.regione = pz.regione
    )
  from prezzari pz where pz.id = v_id;
end;
$$;
revoke execute on function public.prezzario_del_preventivo(uuid) from public, anon;
grant execute on function public.prezzario_del_preventivo(uuid) to authenticated;
