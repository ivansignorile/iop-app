-- Elenco membri di un'org con email (auth.users non è accessibile via RLS)
create or replace function public.list_org_members(target_org uuid)
returns table (
  user_id uuid,
  email text,
  full_name text,
  role membership_role,
  joined_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select m.user_id, u.email::text, p.full_name, m.role, m.created_at
  from public.memberships m
  join auth.users u on u.id = m.user_id
  left join public.profiles p on p.id = m.user_id
  where m.org_id = target_org
    and target_org in (select public.user_org_ids())
  order by m.created_at asc;
$$;
revoke execute on function public.list_org_members(uuid) from anon;
