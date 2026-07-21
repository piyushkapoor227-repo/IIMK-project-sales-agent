-- Multi-tenant RLS: helper functions (SECURITY DEFINER, owned by table owner so they
-- bypass RLS internally without recursing) + per-table policies.
create schema if not exists private;

create or replace function private.get_my_org_id()
returns uuid
language sql security definer stable
set search_path = ''
as $$
  select org_id from public.profiles where id = auth.uid()
$$;

create or replace function private.get_my_role()
returns public.user_role
language sql security definer stable
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function private.is_my_report(p_rep_id uuid)
returns boolean
language sql security definer stable
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = p_rep_id and manager_id = auth.uid()
  )
$$;

revoke all on function private.get_my_org_id() from public, anon;
revoke all on function private.get_my_role() from public, anon;
revoke all on function private.is_my_report(uuid) from public, anon;
grant execute on function private.get_my_org_id() to authenticated;
grant execute on function private.get_my_role() to authenticated;
grant execute on function private.is_my_report(uuid) to authenticated;

-- organizations --------------------------------------------------------
alter table public.organizations enable row level security;

create policy "organizations_select" on public.organizations
for select using (id = (select private.get_my_org_id()));

create policy "organizations_admin_update" on public.organizations
for update using (
  id = (select private.get_my_org_id())
  and (select private.get_my_role()) = 'admin'
);

-- profiles ---------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles_org_select" on public.profiles
for select using (org_id = (select private.get_my_org_id()));

create policy "profiles_self_update" on public.profiles
for update using (id = auth.uid())
with check (id = auth.uid());

create policy "profiles_admin_update" on public.profiles
for update using (
  org_id = (select private.get_my_org_id())
  and (select private.get_my_role()) = 'admin'
);

-- invites ------------------------------------------------------------------
alter table public.invites enable row level security;

create policy "invites_admin_all" on public.invites
for all using (
  org_id = (select private.get_my_org_id())
  and (select private.get_my_role()) = 'admin'
)
with check (
  org_id = (select private.get_my_org_id())
  and (select private.get_my_role()) = 'admin'
);

-- generic tenant-isolation policy for the remaining tables ------------------
alter table public.outlets enable row level security;
create policy "outlets_tenant_isolation" on public.outlets
for all using (org_id = (select private.get_my_org_id()))
with check (org_id = (select private.get_my_org_id()));

alter table public.stock_reports enable row level security;
create policy "stock_reports_tenant_isolation" on public.stock_reports
for all using (org_id = (select private.get_my_org_id()))
with check (org_id = (select private.get_my_org_id()));

alter table public.merchandising_photos enable row level security;
create policy "merchandising_photos_tenant_isolation" on public.merchandising_photos
for all using (org_id = (select private.get_my_org_id()))
with check (org_id = (select private.get_my_org_id()));

alter table public.voice_notes enable row level security;
create policy "voice_notes_tenant_isolation" on public.voice_notes
for all using (org_id = (select private.get_my_org_id()))
with check (org_id = (select private.get_my_org_id()));

alter table public.complaints enable row level security;
create policy "complaints_tenant_isolation" on public.complaints
for all using (org_id = (select private.get_my_org_id()))
with check (org_id = (select private.get_my_org_id()));

-- visits: rep sees own, manager sees direct reports, admin sees all in org --
alter table public.visits enable row level security;

create policy "visits_select" on public.visits
for select using (
  org_id = (select private.get_my_org_id())
  and (
    rep_id = auth.uid()
    or (select private.get_my_role()) = 'admin'
    or ((select private.get_my_role()) = 'manager' and private.is_my_report(rep_id))
  )
);

create policy "visits_insert" on public.visits
for insert with check (
  org_id = (select private.get_my_org_id())
  and rep_id = auth.uid()
);

create policy "visits_update" on public.visits
for update using (
  org_id = (select private.get_my_org_id())
  and rep_id = auth.uid()
);

-- storage: org-scoped logo + visit photo buckets ----------------------------
insert into storage.buckets (id, name, public)
values ('org-logos', 'org-logos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('visit-photos', 'visit-photos', false)
on conflict (id) do nothing;

create policy "org_logos_read" on storage.objects
for select using (bucket_id = 'org-logos');

create policy "org_logos_admin_write" on storage.objects
for all using (
  bucket_id = 'org-logos'
  and (storage.foldername(name))[1] = (select private.get_my_org_id())::text
  and (select private.get_my_role()) = 'admin'
)
with check (
  bucket_id = 'org-logos'
  and (storage.foldername(name))[1] = (select private.get_my_org_id())::text
  and (select private.get_my_role()) = 'admin'
);

create policy "visit_photos_org_scoped" on storage.objects
for all using (
  bucket_id = 'visit-photos'
  and (storage.foldername(name))[1] = (select private.get_my_org_id())::text
)
with check (
  bucket_id = 'visit-photos'
  and (storage.foldername(name))[1] = (select private.get_my_org_id())::text
);
