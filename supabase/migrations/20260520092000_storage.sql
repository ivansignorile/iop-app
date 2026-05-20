-- Storage: bucket allegati/foto preventivi, isolato per org tramite path.
-- Convenzione path: {org_id}/{preventivo_id}/{filename}

insert into storage.buckets (id, name, public)
values ('preventivi', 'preventivi', false)
on conflict (id) do nothing;

-- RLS su storage.objects: l'utente accede solo agli oggetti delle proprie org.
create policy "preventivi objects select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'preventivi'
    and (storage.foldername(name))[1]::uuid in (select public.user_org_ids())
  );

create policy "preventivi objects insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'preventivi'
    and (storage.foldername(name))[1]::uuid in (select public.user_org_ids())
  );

create policy "preventivi objects update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'preventivi'
    and (storage.foldername(name))[1]::uuid in (select public.user_org_ids())
  );

create policy "preventivi objects delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'preventivi'
    and (storage.foldername(name))[1]::uuid in (select public.user_org_ids())
  );
