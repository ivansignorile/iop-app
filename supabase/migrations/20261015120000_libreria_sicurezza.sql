-- Libreria personale: sicurezza dell'elaborazione dei vecchi preventivi.
-- 1. Il client non può più modificare i documenti (stato, lock, contatori, path):
--    l'avvio passa dall'RPC avvia_elaborazione_documento, le scritture dalla
--    edge function con service role.
-- 2. Gli insert del client sono vincolati: path nella cartella dell'org, stato iniziale forzato.
-- 3. Quota giornaliera di elaborazioni per org (costi del modello).
-- 4. Vincoli sui dati di voci_proprie allineati a validaVoce (src/lib/libreria/voce.ts).

/* ---------- Privilegi su documenti_libreria ---------- */

-- Nessuna colonna è modificata dagli utenti: la UI non fa update, solo insert e delete.
revoke update on public.documenti_libreria from authenticated, anon;

-- Insert solo delle colonne che il client scrive davvero.
revoke insert on public.documenti_libreria from authenticated, anon;
grant insert (org_id, storage_path, nome_file, created_by) on public.documenti_libreria to authenticated;

/* ---------- Trigger BEFORE INSERT ---------- */

create or replace function public.documenti_libreria_before_insert()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Formato esatto generato dal client: {org_id}/libreria/{uuid}-{nome con soli [A-Za-z0-9._-]}.
  -- Whitelist stretta: niente %, \, // o segmenti extra che lo storage potrebbe interpretare diversamente.
  if new.storage_path is null
     or new.storage_path !~ ('^' || new.org_id::text || '/libreria/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-[A-Za-z0-9_-][A-Za-z0-9._-]{0,119}$')
     or position('..' in new.storage_path) > 0 then
    raise exception 'storage_path non valido' using errcode = '22023';
  end if;

  new.stato := 'caricato';
  new.elaborazione_at := null;
  new.voci_estratte := 0;
  new.errore := null;
  -- Da sessione utente l'autore è sempre chi inserisce.
  if auth.uid() is not null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;

create trigger documenti_libreria_before_insert
  before insert on public.documenti_libreria
  for each row execute function public.documenti_libreria_before_insert();

/* ---------- Log delle elaborazioni (quota) ---------- */

create table public.libreria_elaborazioni_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  documento_id uuid references public.documenti_libreria (id) on delete set null,
  created_at timestamptz not null default now()
);
create index libreria_elaborazioni_log_org_idx
  on public.libreria_elaborazioni_log (org_id, created_at desc);

-- RLS attivo e nessuna policy: lo scrive solo l'RPC (security definer) o il service role.
alter table public.libreria_elaborazioni_log enable row level security;
revoke all on public.libreria_elaborazioni_log from anon, authenticated;

/* ---------- RPC di avvio ---------- */

-- Errori (message riconoscibile dalla edge function):
--   DOC_NON_TROVATO, DOC_GIA_ELABORATO, DOC_IN_CORSO, QUOTA_SUPERATA.
create or replace function public.avvia_elaborazione_documento(p_doc uuid)
returns public.documenti_libreria
language plpgsql
security definer
set search_path = public
as $$
declare
  v_doc public.documenti_libreria;
  v_stale constant interval := interval '10 minutes';
  v_quota constant int := 30;
  v_usate int;
begin
  if auth.uid() is null then
    raise exception 'NON_AUTENTICATO' using errcode = '28000';
  end if;

  select * into v_doc
  from public.documenti_libreria
  where id = p_doc and org_id in (select public.user_org_ids());
  if not found then
    raise exception 'DOC_NON_TROVATO' using errcode = 'P0002';
  end if;

  if v_doc.stato = 'elaborato' then
    raise exception 'DOC_GIA_ELABORATO' using errcode = 'P0001';
  end if;
  if v_doc.stato = 'in_elaborazione'
     and v_doc.elaborazione_at is not null
     and v_doc.elaborazione_at >= now() - v_stale then
    raise exception 'DOC_IN_CORSO' using errcode = 'P0001';
  end if;

  -- Serializza gli avvii della stessa org: il conteggio della quota non ha race.
  perform pg_advisory_xact_lock(hashtextextended('libreria_quota:' || v_doc.org_id::text, 0));

  select count(*) into v_usate
  from public.libreria_elaborazioni_log
  where org_id = v_doc.org_id and created_at > now() - interval '24 hours';
  if v_usate >= v_quota then
    raise exception 'QUOTA_SUPERATA' using errcode = 'P0001';
  end if;

  -- Claim atomico: ripete le condizioni per battere un avvio concorrente.
  update public.documenti_libreria
  set stato = 'in_elaborazione', elaborazione_at = now(), errore = null
  where id = v_doc.id
    and stato <> 'elaborato'
    and (stato <> 'in_elaborazione'
         or elaborazione_at is null
         or elaborazione_at < now() - v_stale)
  returning * into v_doc;
  if not found then
    raise exception 'DOC_IN_CORSO' using errcode = 'P0001';
  end if;

  insert into public.libreria_elaborazioni_log (org_id, documento_id)
  values (v_doc.org_id, v_doc.id);

  return v_doc;
end;
$$;

revoke execute on function public.avvia_elaborazione_documento(uuid) from public, anon;
grant execute on function public.avvia_elaborazione_documento(uuid) to authenticated;

/* ---------- Vincoli su voci_proprie ---------- */

alter table public.voci_proprie
  add constraint voci_proprie_prezzo_positivo check (prezzo > 0),
  add constraint voci_proprie_titolo_len check (char_length(titolo) between 1 and 300),
  add constraint voci_proprie_descrizione_len check (char_length(descrizione) between 1 and 10000),
  add constraint voci_proprie_categoria_len check (categoria is null or char_length(categoria) <= 100);
