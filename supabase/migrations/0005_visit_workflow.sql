-- Phase 2-4 support: submitted-visit workflow + child-record RLS refinement.
-- Author: Piyush Kapoor.

alter table public.visits
  add column if not exists submitted_at timestamptz;

create index if not exists visits_org_date_idx on public.visits (org_id, visit_date desc);

-- Refine child-record visibility. The generic 0002 policies only checked the
-- tenant (org_id); a rep could therefore read another rep's stock rows even
-- though they cannot see that rep's visit. Scope reads to visits the caller can
-- actually access (own / direct reports / whole org for admin), and scope
-- writes to the caller's own draft visits.

create or replace function private.can_access_visit(p_visit_id uuid)
returns boolean
language sql security definer stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.visits v
    join public.profiles me on me.id = auth.uid()
    where v.id = p_visit_id
      and v.org_id = me.org_id
      and (
        v.rep_id = auth.uid()
        or me.role = 'admin'
        or (me.role = 'manager' and exists (
          select 1 from public.profiles r where r.id = v.rep_id and r.manager_id = auth.uid()
        ))
      )
  )
$$;

create or replace function private.owns_draft_visit(p_visit_id uuid)
returns boolean
language sql security definer stable
set search_path = ''
as $$
  select exists (
    select 1 from public.visits v
    where v.id = p_visit_id and v.rep_id = auth.uid() and v.status = 'draft'
  )
$$;

revoke all on function private.can_access_visit(uuid) from public, anon;
revoke all on function private.owns_draft_visit(uuid) from public, anon;
grant execute on function private.can_access_visit(uuid) to authenticated;
grant execute on function private.owns_draft_visit(uuid) to authenticated;

-- stock_reports / merchandising_photos / voice_notes: replace the blanket
-- tenant policy with read = can_access_visit, write = owns_draft_visit.
do $$
declare t text;
begin
  foreach t in array array['stock_reports', 'merchandising_photos', 'voice_notes']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_tenant_isolation', t);

    execute format($f$
      create policy %I on public.%I
      for select using (
        org_id = (select private.get_my_org_id())
        and (select private.can_access_visit(visit_id))
      )
    $f$, t || '_select', t);

    execute format($f$
      create policy %I on public.%I
      for insert with check (
        org_id = (select private.get_my_org_id())
        and (select private.owns_draft_visit(visit_id))
      )
    $f$, t || '_insert', t);

    execute format($f$
      create policy %I on public.%I
      for delete using (
        org_id = (select private.get_my_org_id())
        and (select private.owns_draft_visit(visit_id))
      )
    $f$, t || '_delete', t);
  end loop;
end $$;

-- complaints: reps log complaints on their own visits; managers/admins triage
-- (assign / resolve) anything in the org.
drop policy if exists "complaints_tenant_isolation" on public.complaints;

create policy "complaints_select" on public.complaints
for select using (org_id = (select private.get_my_org_id()));

create policy "complaints_rep_insert" on public.complaints
for insert with check (
  org_id = (select private.get_my_org_id())
  and (visit_id is null or (select private.owns_draft_visit(visit_id)))
);

create policy "complaints_triage_update" on public.complaints
for update using (
  org_id = (select private.get_my_org_id())
  and (select private.get_my_role()) in ('manager', 'admin')
)
with check (org_id = (select private.get_my_org_id()));
