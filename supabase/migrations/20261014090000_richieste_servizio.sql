-- 20261014090000_richieste_servizio.sql
create type public.richiesta_tipo as enum ('foto_descrizione', 'foto_capitolato');
create type public.richiesta_stato as enum ('nuova', 'in_lavorazione', 'evasa', 'scartata');

create table public.richieste_servizio (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nome text not null,
  email text not null,
  telefono text,
  tipo public.richiesta_tipo not null,
  descrizione text not null,
  comune text,
  files jsonb not null default '[]'::jsonb, -- [{path, nome, mime, size}]
  stato public.richiesta_stato not null default 'nuova',
  notifica_email_ok boolean,
  notifica_whatsapp_ok boolean,
  note_interne text
);
create index richieste_servizio_email_created_idx on public.richieste_servizio (email, created_at desc);

-- Nessuna policy: accesso solo via service role (server action / pagina admin).
alter table public.richieste_servizio enable row level security;

insert into storage.buckets (id, name, public, file_size_limit)
values ('richieste', 'richieste', false, 15728640)
on conflict (id) do nothing;
-- Nessuna policy su storage.objects per 'richieste': upload solo via signed upload URL.
