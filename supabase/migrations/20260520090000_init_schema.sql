-- IOP — schema iniziale multi-tenant
-- Org/membership/profili, entità dominio, libreria condivisa, RLS, onboarding.

-- =========================================================================
-- Enums
-- =========================================================================
create type membership_role as enum ('owner', 'admin', 'member');
create type cliente_tipo as enum ('condominio', 'privato', 'azienda');
create type preventivo_stato as enum ('bozza', 'inviato', 'accettato', 'rifiutato');
create type preventivo_modalita as enum ('capitolato', 'manuale');
create type unita_misura as enum ('corpo', 'mq', 'ml', 'mc', 'giorno', 'cad', 'kg');

-- =========================================================================
-- Helper: updated_at
-- =========================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================================
-- Organizations / Memberships / Profiles
-- =========================================================================
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  ragione_sociale text,
  partita_iva text,
  indirizzo text,
  comune text,
  cap text,
  provincia text,
  email text,
  telefono text,
  logo_url text,
  default_iva numeric(5, 2) not null default 10,
  costo_giornaliero numeric(10, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role membership_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);
create index memberships_user_id_idx on public.memberships (user_id);
create index memberships_org_id_idx on public.memberships (org_id);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  current_org_id uuid references public.organizations (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================================
-- RLS helper functions (SECURITY DEFINER per evitare ricorsione su RLS)
-- =========================================================================
create or replace function public.user_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from public.memberships where user_id = auth.uid();
$$;

create or replace function public.is_org_admin(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships
    where org_id = target_org
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

-- =========================================================================
-- Onboarding: crea org + membership owner + imposta current_org
-- =========================================================================
create or replace function public.create_organization(org_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Non autenticato';
  end if;

  insert into public.organizations (name)
  values (org_name)
  returning id into new_org_id;

  insert into public.memberships (org_id, user_id, role)
  values (new_org_id, auth.uid(), 'owner');

  update public.profiles
  set current_org_id = new_org_id, updated_at = now()
  where id = auth.uid();

  return new_org_id;
end;
$$;

-- =========================================================================
-- Trigger: profilo automatico alla registrazione
-- =========================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- =========================================================================
-- Dominio
-- =========================================================================
create table public.clienti (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  tipo cliente_tipo not null default 'condominio',
  nome text not null,
  codice_fiscale text,
  partita_iva text,
  indirizzo text,
  comune text,
  cap text,
  provincia text,
  amministratore text,
  email text,
  telefono text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index clienti_org_idx on public.clienti (org_id);

create table public.edifici (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  cliente_id uuid references public.clienti (id) on delete set null,
  indirizzo text,
  comune text,
  cap text,
  provincia text,
  lat double precision,
  lng double precision,
  piani integer,
  facciate integer,
  balconi integer,
  porzione text,
  tipo_copertura text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index edifici_org_idx on public.edifici (org_id);

create table public.preventivi (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  cliente_id uuid references public.clienti (id) on delete set null,
  edificio_id uuid references public.edifici (id) on delete set null,
  numero_protocollo text,
  data date not null default current_date,
  stato preventivo_stato not null default 'bozza',
  modalita preventivo_modalita not null default 'manuale',
  oggetto text,
  iva numeric(5, 2) not null default 10,
  totale_imponibile numeric(12, 2) not null default 0,
  note text,
  capitolato_testo text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index preventivi_org_idx on public.preventivi (org_id);
create index preventivi_cliente_idx on public.preventivi (cliente_id);

create table public.preventivo_interventi (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  preventivo_id uuid not null references public.preventivi (id) on delete cascade,
  ordine integer not null default 0,
  gruppo text,
  titolo text not null,
  descrizione text,
  unita unita_misura not null default 'corpo',
  quantita numeric(12, 3) not null default 1,
  prezzo_unitario numeric(12, 2) not null default 0,
  sconto numeric(12, 2) not null default 0,
  importo numeric(12, 2) generated always as (
    round(quantita * prezzo_unitario - sconto, 2)
  ) stored,
  ciclo_id uuid,
  created_at timestamptz not null default now()
);
create index interventi_preventivo_idx on public.preventivo_interventi (preventivo_id);
create index interventi_org_idx on public.preventivo_interventi (org_id);

create table public.preventivo_allegati (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  preventivo_id uuid not null references public.preventivi (id) on delete cascade,
  storage_path text not null,
  tipo text,
  caption text,
  livello_degrado integer,
  created_at timestamptz not null default now()
);
create index allegati_preventivo_idx on public.preventivo_allegati (preventivo_id);

-- =========================================================================
-- Libreria condivisa (org_id null = template globale disponibile a tutti)
-- =========================================================================
create table public.cicli_lavorazione (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations (id) on delete cascade,
  codice text,
  titolo text not null,
  categoria text,
  descrizione_fasi text not null,
  unita_default unita_misura not null default 'corpo',
  prezzo_default numeric(12, 2),
  tags text[] default '{}',
  created_at timestamptz not null default now()
);
create index cicli_org_idx on public.cicli_lavorazione (org_id);

create table public.prezzi_unitari (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations (id) on delete cascade,
  voce text not null,
  unita unita_misura not null,
  prezzo numeric(12, 2) not null,
  categoria text,
  note text,
  created_at timestamptz not null default now()
);
create index prezzi_org_idx on public.prezzi_unitari (org_id);

create table public.materiali_prodotti (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations (id) on delete cascade,
  lavorazione_keyword text not null,
  prodotto text not null,
  marca text,
  alternativa text,
  scheda_tecnica_url text,
  note text,
  created_at timestamptz not null default now()
);
create index materiali_org_idx on public.materiali_prodotti (org_id);

create table public.degrado_samples (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations (id) on delete cascade,
  livello integer not null check (livello between 1 and 9),
  intervento text not null,
  descrizione text,
  image_path text,
  created_at timestamptz not null default now()
);
create index degrado_org_idx on public.degrado_samples (org_id);

-- =========================================================================
-- Triggers updated_at
-- =========================================================================
create trigger trg_org_updated before update on public.organizations
  for each row execute function public.set_updated_at();
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger trg_clienti_updated before update on public.clienti
  for each row execute function public.set_updated_at();
create trigger trg_edifici_updated before update on public.edifici
  for each row execute function public.set_updated_at();
create trigger trg_preventivi_updated before update on public.preventivi
  for each row execute function public.set_updated_at();

-- =========================================================================
-- RLS
-- =========================================================================
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.profiles enable row level security;
alter table public.clienti enable row level security;
alter table public.edifici enable row level security;
alter table public.preventivi enable row level security;
alter table public.preventivo_interventi enable row level security;
alter table public.preventivo_allegati enable row level security;
alter table public.cicli_lavorazione enable row level security;
alter table public.prezzi_unitari enable row level security;
alter table public.materiali_prodotti enable row level security;
alter table public.degrado_samples enable row level security;

-- profiles: solo il proprio
create policy "profiles self select" on public.profiles
  for select using (id = auth.uid());
create policy "profiles self update" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles self insert" on public.profiles
  for insert with check (id = auth.uid());

-- organizations: membri vedono, admin/owner modificano
create policy "org member select" on public.organizations
  for select using (id in (select public.user_org_ids()));
create policy "org admin update" on public.organizations
  for update using (public.is_org_admin(id)) with check (public.is_org_admin(id));

-- memberships: membri dell'org vedono; admin gestiscono
create policy "memberships select" on public.memberships
  for select using (org_id in (select public.user_org_ids()));
create policy "memberships admin insert" on public.memberships
  for insert with check (public.is_org_admin(org_id));
create policy "memberships admin update" on public.memberships
  for update using (public.is_org_admin(org_id)) with check (public.is_org_admin(org_id));
create policy "memberships admin delete" on public.memberships
  for delete using (public.is_org_admin(org_id));

-- tabelle dominio: tutto se membro dell'org
do $$
declare t text;
begin
  foreach t in array array[
    'clienti', 'edifici', 'preventivi', 'preventivo_interventi', 'preventivo_allegati'
  ] loop
    execute format(
      'create policy %1$I on public.%2$I for all
         using (org_id in (select public.user_org_ids()))
         with check (org_id in (select public.user_org_ids()));',
      t || '_org_all', t
    );
  end loop;
end $$;

-- libreria: lettura template globali + propri; scrittura solo propri
do $$
declare t text;
begin
  foreach t in array array[
    'cicli_lavorazione', 'prezzi_unitari', 'materiali_prodotti', 'degrado_samples'
  ] loop
    execute format(
      'create policy %1$I on public.%2$I for select
         using (org_id is null or org_id in (select public.user_org_ids()));',
      t || '_select', t
    );
    execute format(
      'create policy %1$I on public.%2$I for insert
         with check (org_id in (select public.user_org_ids()));',
      t || '_insert', t
    );
    execute format(
      'create policy %1$I on public.%2$I for update
         using (org_id in (select public.user_org_ids()))
         with check (org_id in (select public.user_org_ids()));',
      t || '_update', t
    );
    execute format(
      'create policy %1$I on public.%2$I for delete
         using (org_id in (select public.user_org_ids()));',
      t || '_delete', t
    );
  end loop;
end $$;
