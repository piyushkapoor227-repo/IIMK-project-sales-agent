-- Rate-limiting store for the employee-code login Edge Function.
-- No policies defined: RLS-enabled with zero grants means anon/authenticated
-- clients get nothing; only the service-role key (used server-side in the
-- Edge Function) can read/write, since service role always bypasses RLS.
create table public.login_attempts (
  id uuid primary key default gen_random_uuid(),
  identifier text not null,
  attempted_at timestamptz not null default now()
);
create index login_attempts_identifier_idx on public.login_attempts (identifier, attempted_at desc);

alter table public.login_attempts enable row level security;
