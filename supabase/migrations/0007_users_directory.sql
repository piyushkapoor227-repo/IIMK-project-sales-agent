-- Richer user directory: sales zones, last-active tracking, 30-day invites
-- with resend. Author: Piyush Kapoor.

alter table public.profiles add column if not exists zone text;
alter table public.profiles add column if not exists last_seen_at timestamptz;
create index if not exists profiles_zone_idx on public.profiles (org_id, zone);

alter table public.invites add column if not exists last_sent_at timestamptz not null default now();
alter table public.invites alter column expires_at set default (now() + interval '30 days');

-- handle_new_user: also carry zone through from the invite metadata.
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
  v_zone       text := nullif(new.raw_user_meta_data ->> 'zone', '');
begin
  insert into public.profiles (id, org_id, role, full_name, manager_id, zone, last_seen_at, onboarding_status)
  values (
    new.id,
    v_org_id,
    v_role::public.user_role,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    v_manager_id,
    v_zone,
    now(),
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
