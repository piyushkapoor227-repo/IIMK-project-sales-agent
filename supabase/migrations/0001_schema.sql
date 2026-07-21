-- Core schema for the AI Field Sales Copilot multi-tenant app.
create extension if not exists citext;
create extension if not exists pgcrypto;

create type public.user_role as enum ('admin', 'manager', 'rep');
create type public.onboarding_status as enum ('pending_org', 'active');
create type public.invite_status as enum ('pending', 'accepted', 'revoked');
create type public.visit_status as enum ('draft', 'submitted');
create type public.complaint_status as enum ('open', 'assigned', 'resolved');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  org_code citext not null unique,
  logo_url text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid references public.organizations(id),
  employee_code citext,
  full_name text,
  role public.user_role not null default 'rep',
  manager_id uuid references public.profiles(id) on delete set null,
  onboarding_status public.onboarding_status not null default 'pending_org',
  deactivated_at timestamptz,
  created_at timestamptz not null default now(),
  unique (org_id, employee_code)
);
create index profiles_org_id_idx on public.profiles (org_id);
create index profiles_manager_id_idx on public.profiles (manager_id);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id),
  email citext not null,
  role public.user_role not null default 'rep',
  invited_by uuid not null references public.profiles(id),
  status public.invite_status not null default 'pending',
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_user_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create unique index invites_pending_unique_idx
  on public.invites (org_id, email) where status = 'pending';
create index invites_org_id_idx on public.invites (org_id);

create table public.outlets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id),
  name text not null,
  address text,
  territory text,
  distributor_name text,
  gps_lat double precision,
  gps_lng double precision,
  created_at timestamptz not null default now()
);
create index outlets_org_id_idx on public.outlets (org_id);

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id),
  outlet_id uuid not null references public.outlets(id),
  rep_id uuid not null references public.profiles(id),
  visit_date date not null default current_date,
  status public.visit_status not null default 'draft',
  gps_checkin_lat double precision,
  gps_checkin_lng double precision,
  notes text,
  created_at timestamptz not null default now(),
  unique (outlet_id, rep_id, visit_date)
);
create index visits_org_id_idx on public.visits (org_id);
create index visits_rep_id_idx on public.visits (rep_id);
create index visits_outlet_id_idx on public.visits (outlet_id);

create table public.stock_reports (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id),
  visit_id uuid not null references public.visits(id) on delete cascade,
  sku text not null,
  quantity integer,
  price numeric(12, 2),
  competitor_price numeric(12, 2),
  photo_url text,
  ai_extracted jsonb,
  created_at timestamptz not null default now()
);
create index stock_reports_org_id_idx on public.stock_reports (org_id);
create index stock_reports_visit_id_idx on public.stock_reports (visit_id);
create index stock_reports_sku_idx on public.stock_reports (org_id, sku);

create table public.merchandising_photos (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id),
  visit_id uuid not null references public.visits(id) on delete cascade,
  photo_url text not null,
  ai_analysis jsonb,
  compliance_score numeric(5, 2),
  created_at timestamptz not null default now()
);
create index merchandising_photos_org_id_idx on public.merchandising_photos (org_id);
create index merchandising_photos_visit_id_idx on public.merchandising_photos (visit_id);

create table public.complaints (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id),
  visit_id uuid references public.visits(id) on delete cascade,
  category text,
  description text not null,
  status public.complaint_status not null default 'open',
  assigned_to uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index complaints_org_id_idx on public.complaints (org_id);
create index complaints_status_idx on public.complaints (org_id, status);

create table public.voice_notes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id),
  visit_id uuid not null references public.visits(id) on delete cascade,
  audio_transcript text,
  structured_data jsonb,
  created_at timestamptz not null default now()
);
create index voice_notes_org_id_idx on public.voice_notes (org_id);
create index voice_notes_visit_id_idx on public.voice_notes (visit_id);
