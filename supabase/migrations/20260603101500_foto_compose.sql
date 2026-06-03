-- Annotazioni a punti su una foto (autopsia)
create table public.foto_annotazioni (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  preventivo_id uuid not null references public.preventivi (id) on delete cascade,
  storage_path text not null,
  punti jsonb not null default '[]'::jsonb,
  legenda jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index foto_annotazioni_preventivo_idx on public.foto_annotazioni (preventivo_id);

alter table public.foto_annotazioni enable row level security;
create policy foto_annotazioni_org_all on public.foto_annotazioni for all
  using (org_id in (select public.user_org_ids()))
  with check (org_id in (select public.user_org_ids()));
