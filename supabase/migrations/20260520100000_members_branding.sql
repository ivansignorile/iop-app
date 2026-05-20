-- Inviti membri (RPC admin-only) + bucket pubblico per i loghi

create or replace function public.invite_member(
  target_org uuid,
  member_email text,
  member_role membership_role default 'member'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid;
begin
  if not public.is_org_admin(target_org) then
    raise exception 'Non autorizzato';
  end if;
  select id into uid from auth.users where lower(email) = lower(member_email);
  if uid is null then
    raise exception 'Utente non trovato: deve prima registrarsi su IOP';
  end if;
  insert into public.memberships (org_id, user_id, role)
  values (target_org, uid, member_role)
  on conflict (org_id, user_id) do update set role = excluded.role;
  return uid;
end;
$$;
revoke execute on function public.invite_member(uuid, text, membership_role) from anon;

-- Bucket pubblico per loghi/branding (lettura pubblica, scrittura per org)
insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do nothing;

create policy "branding write insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'branding'
    and (storage.foldername(name))[1]::uuid in (select public.user_org_ids())
  );
create policy "branding write update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'branding'
    and (storage.foldername(name))[1]::uuid in (select public.user_org_ids())
  );
create policy "branding write delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'branding'
    and (storage.foldername(name))[1]::uuid in (select public.user_org_ids())
  );
