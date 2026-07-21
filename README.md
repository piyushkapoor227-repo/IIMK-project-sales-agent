# AI Field Sales Copilot

IIMK Advanced Product Management course project (Group 12) — a mobile-first PWA where
field sales reps capture outlet visit data (stock, pricing, competitor activity,
merchandising photos, complaints), AI validates and structures it, and managers/admins
get real-time dashboards. Multi-tenant: multiple companies can use the same deployment,
each with its own branding, users, and data (fully isolated via Postgres RLS).

Stack: React + Vite + TypeScript + Tailwind (PWA) · Supabase (Postgres, Auth, Storage,
Edge Functions) · Claude (Anthropic) API for AI features.

See `.claude/plans` (or ask Claude) for the full architecture writeup. This README covers
day-to-day setup.

## 1. Local frontend setup

```bash
npm install
cp .env.local.example .env.local   # fill in the two Supabase values below
npm run dev
```

## 2. Create a Supabase project

1. Sign up / log in at [supabase.com/dashboard](https://supabase.com/dashboard) and create a new project.
2. Project Settings → API → copy the **Project URL** and **anon public** key into `.env.local`.
3. Project Settings → API → copy the **service_role** key — this goes into Edge Function secrets only (step 5), **never** into `.env.local` or any frontend code.

## 3. Apply the database schema

Install the Supabase CLI once (`brew install supabase/tap/supabase`), then from the repo root:

```bash
supabase login                          # opens your browser
supabase link --project-ref <project-ref>
supabase db push                        # applies supabase/migrations/*.sql
```

(No local Docker/`supabase start` is used in this project — migrations are written against a hosted project directly.)

## 4. Configure social login providers

Both providers' redirect URI must point at **Supabase's** callback, not the app:
`https://<project-ref>.supabase.co/auth/v1/callback`.

- **Google**: Google Cloud Console → Create OAuth 2.0 Client (Web application) → add the redirect URI above → copy Client ID/Secret into Supabase Dashboard → Auth → Providers → Google.
- **LinkedIn**: LinkedIn Developer Portal → create an app with the **"Sign In with LinkedIn using OpenID Connect"** product (not the legacy one) → same redirect URI → Client ID/Secret into Supabase Dashboard → Auth → Providers → LinkedIn (OIDC).

## 5. Deploy Edge Functions + secrets

```bash
supabase functions deploy employee-login --no-verify-jwt
supabase functions deploy invite-user
supabase secrets set SITE_URL=https://<your-deployed-frontend-domain>
```

`SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` are auto-injected into Edge Functions by Supabase — no need to set them manually.

Once AI features land (Phase 3), you'll also run:
```bash
supabase secrets set ANTHROPIC_API_KEY=<key from console.anthropic.com>
```

## 6. Register the custom access token hook

The migrations create `public.custom_access_token_hook`, but Supabase requires it to also be
registered in Dashboard → Auth → Hooks → "Customize Access Token (JWT) Claims" (point it at
`public.custom_access_token_hook`). This is what lets the app read `org_id`/`user_role` off
the JWT without an extra DB round-trip.

## How auth works here

- **Email/password** — standard Supabase Auth.
- **Company login** — a 3-field form (company code + employee code + password). The company
  code disambiguates which org an employee code belongs to (employee codes are only unique
  *within* an org). Resolution happens server-side in the `employee-login` Edge Function —
  the browser never sees which email it resolved to.
- **Google / LinkedIn** — standard Supabase OAuth providers.
- **First login for a brand-new company**: whoever signs up first (no invite) lands on
  "Create your organization" and becomes that org's admin.
- **Everyone else** joins via an admin-sent invite (Supabase's built-in invite email).

## Build phases

1. ✅ Auth (4 methods) + multi-tenant org/RLS foundation + admin invite & branding screens — this build.
2. Rep visit capture: outlets, smart form, photo upload, voice recording (manual entry, no AI yet).
3. AI integration: Claude vision for photo analysis, Claude for structuring voice transcripts, anomaly validation.
4. Manager dashboard: outlet/territory/SKU rollups, escalation alerts, issue assignment workflow.
5. Polish + deploy: PWA icons/manifest, offline draft queue, Vercel deploy, demo data.
