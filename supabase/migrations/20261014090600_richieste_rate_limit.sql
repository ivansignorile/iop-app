-- Log anonimo (hash dell'IP) per limitare prepara/invio delle richieste pubbliche.
create table public.richieste_rate_log (
  id bigserial primary key,
  ip_hash text not null,
  azione text not null check (azione in ('prepara', 'invia')),
  created_at timestamptz not null default now()
);

create index richieste_rate_log_idx on public.richieste_rate_log (ip_hash, azione, created_at desc);

alter table public.richieste_rate_log enable row level security;
