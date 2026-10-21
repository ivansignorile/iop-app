-- Test in transazione (rollback): eseguire con execute_sql. Ogni riga 'ok' deve essere true.
begin;
create temp table esito(caso text, ok boolean);
grant all on esito to authenticated;
do $$
declare
  p uuid; e uuid; org uuid; camp uuid; fi uuid; inatt uuid;
begin
  select pv.id, pv.org_id into p, org from preventivi pv limit 1;
  select id into camp from prezzari where regione = 'campania' and ambito = '' order by anno desc limit 1;
  insert into prezzari (regione, ambito, anno, titolo, attivo) values ('toscana', 'FI', 2099, 'Prova FI', true) returning id into fi;
  insert into prezzari (regione, ambito, anno, titolo, attivo) values ('liguria', '', 2099, 'Prova LIG', false) returning id into inatt;
  insert into prezzario_voci (prezzario_id, codice, descrizione, unita_testo, unita, prezzo) values (inatt, 'X1', 'massetto prova', 'mq', 'mq', 1);
  update organizations set regione = 'campania' where id = org;
  insert into edifici (org_id, comune) values (org, null) returning id into e;
  update preventivi set edificio_id = e, prezzario_id = null where id = p;

  -- 1. comune vuoto: ripiego restituito ma NON fissato
  perform prezzario_del_preventivo(p);
  insert into esito select 'ripiego non fissato', prezzario_id is null from preventivi where id = p;
  insert into esito select 'ripiego = campania', (select id from prezzario_del_preventivo(p)) = camp;

  -- 2. comune impostato dopo (come parse-capitolato): trova Firenze e lo fissa
  update edifici set comune = 'Firenze' where id = e;
  insert into esito select 'firenze -> listino FI', (select id from prezzario_del_preventivo(p)) = fi;
  insert into esito select 'firenze fissato', prezzario_id = fi from preventivi where id = p;

  -- 3. cambio comune: il trigger azzera il prezzario fissato
  update edifici set comune = 'Pozzuoli' where id = e;
  insert into esito select 'trigger azzera', prezzario_id is null from preventivi where id = p;
  insert into esito select 'pozzuoli -> campania', (select id from prezzario_del_preventivo(p)) = camp;

  -- 4. omonimo risolto dalla provincia; nome non trovato ma sigla valida
  insert into esito select 'calliano AT -> piemonte', (select regione from luogo_cantiere('Calliano', 'AT', 'campania')) = 'piemonte';
  insert into esito select 'calliano TN -> trento', (select regione from luogo_cantiere('Calliano', 'tn', 'campania')) = 'trento';
  insert into esito select 'reggio emilia RE', (select regione from luogo_cantiere('Reggio Emilia', 'RE', 'campania')) = 'emilia-romagna';

  -- 5. comune riconosciuto ma regione senza prezzario attivo: ripiego con avviso, non fissato
  update edifici set comune = 'Genova' where id = e;
  insert into esito select 'genova ripiego con avviso', (select id = camp and fallback from prezzario_del_preventivo(p));
  insert into esito select 'genova non fissato', prezzario_id is null from preventivi where id = p;
end $$;
-- 6. voci di prezzari non attivi non leggibili da authenticated
set local role authenticated;
insert into esito select 'voci inattive nascoste', not exists (select 1 from prezzario_voci where codice = 'X1' and descrizione = 'massetto prova');
reset role;
select * from esito;
rollback;
