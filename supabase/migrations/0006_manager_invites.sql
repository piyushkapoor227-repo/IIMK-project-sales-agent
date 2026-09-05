-- Let managers invite field reps (who then report to the inviting manager).
-- Author: Piyush Kapoor.

-- 1. handle_new_user: also honour manager_id from the invite metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_org_id     uuid := (new.raw_user_meta_data ->> 'org_id')::uuid;
  v_role       text := coalesce(new.raw_user_meta_data ->> 'role', 'rep');
  v_invite     uuid := (new.raw_user_meta_data ->> 'invite_id')::uuid;
  v_manager_id uuid := nullif(new.raw_user_meta_data ->> 'manager_id', '')::uuid;
begin
  insert into public.profiles (id, org_id, role, full_name, manager_id, onboarding_status)
  values (
    new.id,
    v_org_id,
    v_role::public.user_role,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    v_manager_id,
    case when v_org_id is not null then 'active' else 'pending_org' end
  );

  if v_invite is not null then
    update public.invites
    set status = 'accepted', accepted_at = now(), accepted_user_id = new.id
    where id = v_invite and status = 'pending';
  end if;

  return new;
end;
$$;

-- 2. invites RLS: admins keep full control; managers may read their org's
--    invites (so the pending list renders on /manager/users). The invite row
--    itself is still written by the Edge Function with the service-role key.
drop policy if exists "invites_admin_all" on public.invites;

create policy "invites_admin_all" on public.invites
for all using (
  org_id = (select private.get_my_org_id())
  and (select private.get_my_role()) = 'admin'
)
with check (
  org_id = (select private.get_my_org_id())
  and (select private.get_my_role()) = 'admin'
);

create policy "invites_manager_select" on public.invites
for select using (
  org_id = (select private.get_my_org_id())
  and (select private.get_my_role()) = 'manager'
);
