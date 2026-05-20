-- Hardening sicurezza funzioni (advisor Supabase)

-- Fix search_path mutabile sul trigger updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql
set search_path = public
as $$
begin new.updated_at = now(); return new; end; $$;

-- Riduci superficie API: niente esecuzione da ruolo anonimo
revoke execute on function public.user_org_ids() from anon;
revoke execute on function public.is_org_admin(uuid) from anon;
revoke execute on function public.create_organization(text) from anon;
revoke execute on function public.handle_new_user() from anon, public;
