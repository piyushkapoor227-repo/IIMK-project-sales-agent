-- Auth bootstrapping: profile creation on signup, org creation RPC.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_org_id uuid := (new.raw_user_meta_data ->> 'org_id')::uuid;
  v_role   text := coalesce(new.raw_user_meta_data ->> 'role', 'rep');
  v_invite uuid := (new.raw_user_meta_data ->> 'invite_id')::uuid;
begin
  insert into public.profiles (id, org_id, role, full_name, onboarding_status)
  values (
    new.id,
    v_org_id,
    v_role::public.user_role,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- First-admin onboarding: atomically create the org and promote the caller.
create or replace function public.create_organization(p_name text, p_org_code citext)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_org_id uuid;
  v_existing_org uuid;
begin
  select org_id into v_existing_org from public.profiles where id = auth.uid();
  if v_existing_org is not null then
    raise exception 'You already belong to an organization';
  end if;

  insert into public.organizations (name, org_code, created_by)
  values (p_name, p_org_code, auth.uid())
  returning id into v_org_id;

  update public.profiles
  set org_id = v_org_id, role = 'admin', onboarding_status = 'active'
  where id = auth.uid();

  return v_org_id;
end;
$$;

revoke all on function public.create_organization(text, citext) from public, anon;
grant execute on function public.create_organization(text, citext) to authenticated;

-- Custom access token hook: injects org_id/role into the JWT so RLS/UI can
-- read them without a DB round-trip. Register under Dashboard > Auth > Hooks
-- (or supabase/config.toml for local dev) after applying this migration.
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql security definer stable
set search_path = ''
as $$
declare
  claims jsonb;
  v_org_id uuid;
  v_role text;
begin
  select org_id, role into v_org_id, v_role
  from public.profiles where id = (event->>'user_id')::uuid;

  claims := event->'claims';
  claims := jsonb_set(claims, '{org_id}', to_jsonb(v_org_id));
  claims := jsonb_set(claims, '{user_role}', to_jsonb(v_role));
  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
grant select on public.profiles to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;
