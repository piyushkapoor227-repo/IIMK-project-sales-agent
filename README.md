# AI Field Sales Copilot

**Built by Piyush Kapoor** · IIMK Advanced Product Management course project (Group 12).

A mobile-first PWA for consumer-goods field sales teams. Reps capture what they see in
each outlet — stock, pricing, competitor activity, shelf photos, complaints — Claude
turns the messy inputs into structured data, and managers/admins get live dashboards.
It is **multi-tenant**: many companies can share one deployment, each with its own
users, outlets, branding and data, fully isolated by Postgres Row-Level Security.

> **Just want to look around?** `npm install`, `echo "VITE_DEMO_MODE=true" > .env.local`,
> `npm run dev`, open http://localhost:5173, sign in with `admin` / `admin`.
> No backend needed — see [Demo mode](#demo-mode).

---

## Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core concepts](#core-concepts) — tenancy, RLS, the JWT hook, roles
4. [Data model](#data-model)
5. [Authentication](#authentication)
6. [Application sections](#application-sections) — every screen, what it does, how to use it
7. [The dashboard in depth](#the-dashboard-in-depth)
8. [AI features](#ai-features)
9. [Offline mode](#offline-mode)
10. [Demo mode](#demo-mode)
11. [How the pieces connect](#how-the-pieces-connect) — end-to-end call flows
12. [Setup](#setup) — demo and full Supabase
13. [Database migrations](#database-migrations)
14. [Project structure](#project-structure)
15. [Development](#development)
16. [Deployment](#deployment)
17. [Not yet built](#not-yet-built)
18. [Credits](#credits)

---

## Overview

**The job to be done.** A field rep visits 15–30 retail outlets a day. At each one they
need to record: which of our SKUs are on shelf and at what price, what the competitor is
doing, a photo of the shelf, and any complaint the retailer raised. Today that happens
on paper or WhatsApp and never reaches head office in a usable shape.

**What this app does.**

| Persona | What they do here |
| --- | --- |
| **Field rep** | Check in to an outlet, fill a fast structured form (stock rows, prices, photos, a voice/typed note, complaints), submit. Works offline. |
| **Zonal / national manager** | See their team's coverage, pricing and complaint trends on one dashboard; triage complaints; add reps to their team. |
| **Org admin** | Everything a manager sees for the whole org, plus manage the outlet directory, invite any role, and set the company logo/name. |

**What the AI does.** A shelf photo becomes a compliance score + a list of detected SKUs
and merchandising issues. A rambled voice note becomes a summary + structured stock
mentions, competitor activity, complaints and action items. Both are optional — the app
is fully usable with manual entry only.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (React 19 + Vite + Tailwind, installable PWA)           │
│                                                                 │
│  Routes ── AuthContext ── React Query ── lib/offline queue       │
│     │            │             │                │                │
└─────┼────────────┼─────────────┼────────────────┼────────────────┘
      │            │             │                │
      │  supabase-js client (anon key + user JWT) │  localStorage
      ▼            ▼             ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  Supabase project                                               │
│                                                                 │
│  Auth  ──(JWT hook: custom_access_token_hook adds org_id/role)   │
│  Postgres  ── every table has RLS keyed on the JWT's org_id      │
│  Storage   ── org-logos (public) · visit-photos (private)        │
│  Edge Functions (Deno):                                         │
│     employee-login       (no JWT — this IS the login step)       │
│     invite-user          (admin/manager only; sends invite)      │
│     analyze-shelf-photo  ─┐  service-role → Postgres             │
│     structure-voice-note ─┘  + HTTPS → api.anthropic.com         │
└─────────────────────────────────────────────────────────────────┘
```

**Layer responsibilities**

- **Frontend owns the UI and the data-fetching cache.** It never holds secrets beyond
  the public anon key + the signed-in user's JWT. All authorisation is enforced by
  Postgres RLS, not by hiding buttons.
- **Postgres owns the rules.** Tenant isolation, "a rep sees only their own visits",
  "a manager sees direct reports", "only admins update the org row" — all RLS policies.
- **Edge Functions own the things the browser must not do**: resolving an employee code
  to an email (would leak identity), sending invite emails (needs the service-role key),
  and calling the Anthropic API (needs `ANTHROPIC_API_KEY`).
- **`lib/offline`** owns resilience: text captures are queued in `localStorage` when
  offline and replayed on reconnect.
- **`lib/demo`** is a drop-in replacement for the entire Supabase layer so the app runs
  with zero backend.

**Stack**

| Area | Choice |
| --- | --- |
| UI | React 19, React Router 7, Tailwind CSS v4, `vite-plugin-pwa` |
| Data fetching | TanStack Query 5 (`staleTime` 30 s, 1 retry, no refetch-on-focus) |
| Build / lint | Vite 8, TypeScript 6, `oxlint` |
| Backend | Supabase — Postgres 15, Auth, Storage, Edge Functions (Deno) |
| AI | Anthropic Messages API (raw HTTPS from the Edge Function), default model `claude-opus-5` |
| Charts | Hand-rolled, dependency-free (HTML/CSS + a little SVG) |

---

## Core concepts

### Multi-tenancy

One `organizations` row per company. Every other business table carries an `org_id`.
A user belongs to exactly one org (`profiles.org_id`). There is no cross-org anything.

### Row-Level Security (RLS)

Every table has `enable row level security` and policies that compare `org_id` to the
caller's org. The caller's org and role are read from **helper functions** that run
`security definer` (so they can read `profiles` without recursing into RLS):

| Function | Returns |
| --- | --- |
| `private.get_my_org_id()` | the caller's `profiles.org_id` |
| `private.get_my_role()` | `admin` / `manager` / `rep` |
| `private.is_my_report(rep_id)` | true if that rep's `manager_id` is the caller |
| `private.can_access_visit(visit_id)` | true if the caller may see that visit (own / direct report / admin) |
| `private.owns_draft_visit(visit_id)` | true if it is the caller's own `draft` visit |

Representative policies:

- **`organizations`** — select where `id = get_my_org_id()`; update only if also `role = 'admin'`.
- **`visits`** — a rep sees `rep_id = auth.uid()`; a manager also sees `is_my_report(rep_id)`; an admin sees the whole org. Insert/update only for the rep's own rows.
- **`stock_reports` / `merchandising_photos` / `voice_notes`** — select via `can_access_visit`; insert/delete only via `owns_draft_visit` (so a submitted visit is frozen).
- **`complaints`** — everyone in the org can read; reps insert against their own draft visit; only managers/admins update (assign / resolve).
- **`invites`** — admins do everything; managers may read their org's invites (the row itself is written by the `invite-user` function with the service-role key).
- **`login_attempts`** — RLS on, zero policies → only the service-role key (used inside `employee-login`) can touch it.

### The custom access token hook

`public.custom_access_token_hook(event jsonb)` runs on every token issue and injects
`org_id` and `user_role` into the JWT claims. This is why the frontend can render the
right nav instantly and RLS can filter without an extra `profiles` round-trip.
**It must be registered** in Supabase → Auth → Hooks (see [Setup](#setup) step 6);
`supabase/config.toml` wires it for local/CLI use.

### Roles

| Role | Gets | Home route |
| --- | --- | --- |
| `rep` | Their own visit capture + history | `/rep` |
| `manager` | Dashboard + complaints + "add reps to my team", scoped to their direct reports | `/manager` |
| `admin` | Everything for the whole org + outlets + branding + invite any role | `/admin` |

`components/RequireAuth.tsx` gates every route: `RequireAuth` (must be signed in and
onboarded), `RequireRole` (must match the role), `RoleHomeRedirect` (sends `/` to the
right home).

---

## Data model

```
organizations ─┬─< profiles (role, zone, manager_id ─┐ self-ref: rep → manager)
               │        │                            │
               │        └──────────────────┐         │
               ├─< invites (status, expires_at, last_sent_at, zone)
               ├─< outlets
               └─< visits (rep_id → profiles, outlet_id → outlets, status draft|submitted)
                      │
                      ├─< stock_reports        (sku, price, competitor_price, ai_extracted)
                      ├─< merchandising_photos  (photo_url, ai_analysis, compliance_score)
                      ├─< voice_notes           (audio_transcript, structured_data)
                      └─< complaints            (category, description, status, assigned_to → profiles)

login_attempts  (identifier, attempted_at)   — rate-limit store, service-role only
```

| Table | Purpose | Key columns |
| --- | --- | --- |
| `organizations` | one per company | `name`, `org_code` (the login code), `logo_url` |
| `profiles` | one per auth user | `role`, `zone`, `manager_id`, `employee_code`, `onboarding_status`, `last_seen_at` |
| `invites` | pending invitations | `email`, `role`, `zone`, `status`, `expires_at` (now + 30 days), `last_sent_at` |
| `outlets` | the retail-outlet directory | `name`, `territory`, `distributor_name`, `gps_lat/lng` |
| `visits` | one rep × one outlet × one day | `status` (`draft` → `submitted`), `submitted_at`, GPS check-in, `notes` |
| `stock_reports` | a SKU line on a visit | `sku`, `quantity`, `price`, `competitor_price`, `ai_extracted` |
| `merchandising_photos` | a shelf photo on a visit | `photo_url` (storage path), `ai_analysis`, `compliance_score` |
| `voice_notes` | a transcript on a visit | `audio_transcript`, `structured_data` (Claude output) |
| `complaints` | an issue raised at a visit | `category`, `description`, `status` (`open`/`assigned`/`resolved`), `assigned_to` |

Enums: `user_role`, `onboarding_status`, `invite_status`, `visit_status`, `complaint_status`.
TypeScript mirrors live in `src/types/database.types.ts`.

---

## Authentication

Four ways in, all landing on the same Supabase session:

| Method | How it works |
| --- | --- |
| **Email + password** | Standard Supabase Auth (`signInWithPassword`). |
| **Company login** | A 3-field form: company code + employee code + password. Employee codes are only unique *within* an org, so the company code disambiguates. Resolution happens server-side in the **`employee-login`** Edge Function — it looks up the org, then the profile, then the auth user's email, signs in on the caller's behalf and returns the tokens. The browser never learns which email it resolved to. Rate-limited via `login_attempts` (5 tries / 15 min). |
| **Google** | Supabase OAuth provider (`google`). |
| **LinkedIn** | Supabase OAuth provider (`linkedin_oidc`). |

**Onboarding paths**

- **First person at a brand-new company** signs up with no invite → `handle_new_user()`
  creates their profile with `onboarding_status = 'pending_org'` → `RequireAuth` routes
  them to **Create organization** → the `create_organization(name, code)` RPC atomically
  makes the org and promotes them to `admin`.
- **Everyone else** is invited. An admin (any role) or a manager (reps only) sends an
  invite via **`invite-user`**, which writes the `invites` row (service-role) and calls
  `auth.admin.inviteUserByEmail` with metadata (`org_id`, `role`, `manager_id`, `zone`,
  `invite_id`). The invitee clicks the email → lands on **Accept invite** → sets a
  password → `handle_new_user()` reads the metadata, creates an *active* profile in the
  right org/zone/team, and marks the invite `accepted`.

`AuthContext` (`src/lib/auth/AuthContext.tsx`) holds `{ session, profile, organization }`,
subscribes to `onAuthStateChange`, and opportunistically stamps `last_seen_at` (at most
hourly) so the user directory can show "last active".

---

## Application sections

Every screen is under `src/routes/`. Grouped by who sees it.

### Auth screens (`src/routes/auth/`)

| Screen | Route | What it does |
| --- | --- | --- |
| **Login** | `/login` | Email / Company-login tabs + Google/LinkedIn buttons. In demo mode shows a hint and a plain username field. |
| **Signup** | `/signup` | Email/password + name. On success shows "check your email"; the confirmed user then signs in and is routed to Create organization. |
| **Create organization** | `/create-org` | Only reachable while `pending_org`. Name + company code → `create_organization` RPC → you are the admin. |
| **Accept invite** | `/accept-invite` | Reached from the invite email (already has a session). Set full name + password → done. |

---

### Rep (`src/routes/rep/`)

#### Today — `/rep`

The rep's home. Two parts:

1. **Start a visit.** Pick an outlet from the dropdown, or expand **"+ Add a new
   outlet"** to create one inline (name, territory, distributor, address). Either way
   "Check in" grabs a GPS fix (best-effort, optional) and calls `useCreateVisit`, which
   **reuses an existing draft** for that outlet+today if one exists, else inserts a new
   `visits` row (`status = 'draft'`), then navigates to the capture screen.
2. **Today's visits.** The rep's visits with `visit_date = today`, each showing a
   Draft/Submitted badge. Tap one to resume.

#### History — `/rep/history`

Every visit the rep has ever recorded, newest first, with date + status. Tap to open
(read-only if submitted).

#### Visit capture — `/rep/visit/:visitId`

The core data-entry screen. Header shows the outlet, date and a Draft/Submitted badge.
A **submitted visit is entirely read-only** (enforced by RLS via `owns_draft_visit`).
Four sections plus notes plus submit:

| Section | What you do | Writes to | AI |
| --- | --- | --- | --- |
| **Stock & pricing** (`StockSection`) | Add rows: SKU, quantity on shelf, our price, competitor price. Remove rows. | `stock_reports` | — |
| **Merchandising photos** (`PhotoSection`) | Take/upload a shelf photo. It is analysed by Claude, then uploaded to the private `visit-photos` bucket; the card shows a compliance badge + AI summary + issues. Rendered back via short-lived signed URLs. **Online only.** | Storage + `merchandising_photos` | `analyze-shelf-photo` |
| **Voice notes** (`VoiceSection`) | Dictate (browser Speech Recognition where available) or type a transcript. "Analyze with AI" structures it; "Save note" stores transcript + structure. | `voice_notes` | `structure-voice-note` |
| **Complaints** (`ComplaintSection`) | Log a retailer/distributor issue: category + description. | `complaints` (`status = 'open'`) | — |
| **Visit summary notes** | A free-text box, auto-saved to `localStorage` as you type and persisted on blur. | `visits.notes` | — |
| **Submit visit** | Saves notes, flips `status` to `submitted`, sets `submitted_at`, clears the local draft, toasts. The screen becomes read-only. | `visits` | — |

Offline, everything except photos still works — see [Offline mode](#offline-mode).

---

### Manager (`src/routes/manager/`)

Nav: **Dashboard · Users · Complaints**. Dashboard and Users carry a red dot + hover
tooltip ("Restricted — managers & admins only").

| Screen | Route | What it does |
| --- | --- | --- |
| **Dashboard** | `/manager` | The shared team dashboard (see [next section](#the-dashboard-in-depth)), scoped by RLS to the manager's **direct reports**. |
| **Users** | `/manager/users` | Invite **field reps only** — new reps are auto-attached to this manager and inherit their zone. Full roster (filter/search/paginate) + click a member for their profile. Pending invites with resend + expiry. |
| **Complaints** | `/manager/complaints` | Triage board — see below. |

---

### Admin (`src/routes/admin/`)

Nav: **Dashboard · Users · Outlets · Complaints · Branding**. Dashboard, Users and
Branding carry the red dot.

| Screen | Route | What it does |
| --- | --- | --- |
| **Dashboard** | `/admin` | Same dashboard, scoped to the **whole org**. |
| **Users** | `/admin/users` | Invite **any role**. Same roster + profile + invites UI as the manager version (it is one shared component, `UserManagement`). |
| **Outlets** | `/admin/outlets` | The outlet directory. Add outlets (name, territory, distributor, address); list them. Reps also create outlets on the fly from Today. |
| **Complaints** | `/admin/complaints` | Triage board (org-wide). |
| **Branding** | `/admin/branding` | Logo + org name + join code. |

#### Users page (`UserManagement`, shared)

- **Invite form** — email + role (locked to "Field rep" for managers). Goes through
  `invite-user`.
- **Filters** — free-text (name / employee code / email), role, zone, manager. Applied
  to both the roster and the invites list; changing any filter resets pagination.
- **Team members table** — name + code, role badge, zone, "reports to", **Added**
  (`created_at`), **Last active** (`last_seen_at`). Click a row → **profile slide-over**
  with employee code, zone, manager, joined/last-active, status, and (for reps) a
  visits / submitted / outlets activity summary.
- **Pending invites table** — email, role, zone, invited-by, last-sent, and an **expiry
  countdown** (`12d left` / amber `3d left` / red `Expired`). Each row has a **Resend**
  button that re-sends the email and pushes expiry back to +30 days.
- **Pagination** on both tables — 10 / 25 / 50 / 100 / "Show all", default 25.

#### Complaints triage board (`ComplaintsBoard`, shared)

One card per complaint: category, outlet, description, date, status badge. Per card:

- **Assign** — a dropdown of org members; picking one sets `assigned_to` and moves the
  status to `assigned`.
- **Mark resolved / Reopen** — toggles `status` and `resolved_at`.

A **status filter** (All / Open / Assigned / Resolved) sits above the list and is
**synced to the URL** (`?status=open`), which is how the dashboard donut drill-down
lands here pre-filtered. Both actions confirm with a toast. RLS lets only
managers/admins update.

#### Branding page

- **Preview** — light + dark mock header bars showing the logo + name exactly as the
  app renders them.
- **Logo** — drag an image onto the drop zone or click to pick. Validated
  (PNG/JPG/SVG/WebP, < 2 MB). **Replace** and **Remove**. In demo mode the image is
  embedded as a data URL; against Supabase it goes to the public `org-logos` bucket
  (path `<org_id>/logo.<ext>`, RLS restricts writes to that org's admins).
- **Organization** — editable display name; read-only **company login code** with a
  copy button.

All writes go through `useUpdateOrg` → `organizations` (RLS `organizations_admin_update`)
→ `refreshProfile()` so the header updates immediately.

---

## The dashboard in depth

`src/routes/shared/TeamDashboard.tsx` + `src/lib/queries/useTeam.ts` +
`src/components/charts.tsx` + `ChartCard.tsx`. Managers and admins render the **same**
component; the only difference is how many rows RLS returns.

### Filter row

One row, above everything, re-scopes every chart, stat tile and the recent-visits list:

| Control | Options | Effect |
| --- | --- | --- |
| **Date range** | 7d / 30d / 90d / All (default 30d) | filters `visits` by `visit_date`, `complaints` by `created_at` |
| **Zone** | All + each zone present | filters by the rep's `profiles.zone` |
| **Rep** | All + reps (narrowed to the chosen zone) | filters `visits.rep_id` |

`useDashboard(filters)` fetches `team-visits`, `team-stock-reports`, `complaints` and
the member list once, then derives everything client-side from the filtered slices.

### Stat tiles

Visits · Outlets covered · Submitted (+ drafts) · Open complaints — all for the current
filter window.

### The six charts

Each is a `ChartCard`: a title, the chart, and an **ⓘ button** that opens a popover with
a plain-English description **and the underlying numbers as a table** (the accessible
"table-view twin"). Closes on outside-click or Esc.

| Chart | Type | Reads | Drill-down |
| --- | --- | --- | --- |
| Visits — *window* | column, per day | scoped visits | — |
| Visits by rep | horizontal bar (top 12) | scoped visits | **click a bar → filter the dashboard to that rep** |
| Coverage by territory | horizontal bar | distinct outlets per territory | — |
| Complaints by status | donut (Open/Assigned/Resolved) | scoped complaints | **click a slice → Complaints page filtered to that status** |
| Complaints: opened vs resolved | grouped column, last 6 weeks | zone/rep-scoped complaints (not date-limited — it is its own trend window) | — |
| Price vs competitor | grouped horizontal bar, most-checked SKUs | scoped `stock_reports` | — |

Chart colours come from validated `--chart-*` CSS variables in `src/index.css`
(light + dark). Every chart has a follow-cursor hover tooltip.

### Recent visits

The 15 newest visits in scope — outlet, rep, date, status badge.

---

## AI features

Two Deno Edge Functions, both `verify_jwt = true` (only signed-in app users can call
them), both **degrade gracefully**: with no `ANTHROPIC_API_KEY` set they return
`{ ai_disabled: true, …empty… }` and the capture flow continues with manual entry.

| Function | Input | Output |
| --- | --- | --- |
| **`analyze-shelf-photo`** | base64 image + mime type | `compliance_score` (0–100), `summary`, `detected_skus[]` (name + facings), `issues[]` |
| **`structure-voice-note`** | transcript text | `summary`, `stock_mentions[]`, `competitor_activity[]`, `complaints[]`, `action_items[]` |

Both call `api.anthropic.com/v1/messages` over raw HTTPS via
`supabase/functions/_shared/anthropic.ts` (prompts for JSON, parses loosely).
Model = `ANTHROPIC_MODEL` env or `claude-opus-5`. Client callers are in `src/lib/ai.ts`;
in demo mode they return canned but realistic results after a short delay.

The structured output is stored on the row (`stock_reports.ai_extracted`,
`merchandising_photos.ai_analysis` + `compliance_score`, `voice_notes.structured_data`)
so dashboards and later views can use it without re-calling the model.

---

## Offline mode

`src/lib/offline/` + `src/lib/useOnline.ts`. Field reps lose signal constantly, so the
**text** parts of visit capture keep working offline.

**How it works.** When `navigator.onLine` is false, a mutating hook
(`useAddStockReport`, `useAddComplaint`, `useAddVoiceNote`, `useUpdateVisitNotes`,
`useSubmitVisit`) pushes an operation onto a `localStorage` queue
(`offline:visit-queue:v1`) instead of calling Supabase. The matching **query** merges
the queued rows back in, so the entry appears immediately with a **"pending sync"** tag.

**Flushing.** `useOfflineSync()` (mounted in `App`) replays the queue in order on the
`online` event and every 30 s: each op runs its real insert/update, is removed on
success, and stops on the first failure (retry later). A toast reports
*"Synced N offline changes"*. `AppShell` shows a banner — grey "You're offline…" or
blue "Syncing N offline changes…".

**Photos are online-only** (binary, not queued) — the button is disabled offline with a
note. Visit summary notes have always been `localStorage`-backed as a separate draft.

---

## Demo mode

Set `VITE_DEMO_MODE=true` and the entire Supabase layer is replaced by an in-browser
mock, so the app runs with **no backend, no network, no keys**.

- **`src/lib/demo/demoClient.ts`** implements the slice of the `supabase-js` surface the
  app uses — `auth`, a chainable query builder with PostgREST-style embeds and ordering,
  `rpc`, `storage` — backed by an in-memory store.
- **`src/lib/demo/store.ts`** generates a deterministic dataset on first load and
  persists it to `localStorage` (`demo:db:v2`): **1 admin, 5 managers** (a national
  manager + South/East/West/North zonal managers), **100 reps** (25 per zone), ~28
  outlets, ~140 visits with stock/complaints, a seeded AI-annotated photo and voice
  note, and **14 pending invites** with mixed expiry.
- **`src/lib/supabaseClient.ts`** exports the demo client instead of the real one when
  the flag is set; `authActions`, `ai.ts` and `Branding` have demo branches.

**Logins**

| Login | Role |
| --- | --- |
| `admin` / `admin` | Org admin |
| `national` / `national` (or `manager` / `manager`) | National sales manager |
| `south` / `south`, `east`, `west`, `north` | Zonal managers |
| `rep` / `rep` | A field rep (South zone) — has a visit for *today* to resume |

The amber top bar has a **"Reset demo data"** button (clears `localStorage` and
regenerates). Because it is a mock, RLS is *not* enforced and social login / real
sign-up are disabled. Turn it off by removing `VITE_DEMO_MODE`.

---

## How the pieces connect

Two worked examples.

### A rep submits a visit (online)

```
VisitCapture "Submit"
  → useUpdateVisitNotes.mutate   → supabase.from('visits').update({notes})           [RLS: rep owns row]
  → useSubmitVisit.mutate        → supabase.from('visits').update({status,submitted_at})
  → React Query invalidates ['visit', id] and ['my-visits']
  → useVisit refetches → status 'submitted' → screen re-renders read-only
  → toast "Visit submitted."
  ── meanwhile ──
  Manager opens /manager → useTeamVisits → RLS returns this visit (is_my_report) → it appears on the dashboard
```

### A manager invites a rep

```
UserManagement invite form
  → useInviteUser.mutate → authActions.inviteUser → POST /functions/v1/invite-user  (Bearer: manager JWT)
      Edge Function: decode JWT → role 'manager' → force role 'rep', manager_id = caller, zone = caller's zone
        → insert into invites (service-role)
        → auth.admin.inviteUserByEmail(email, { metadata })  → Supabase sends the email
  → invitee clicks link → /accept-invite → set password
  → trigger handle_new_user() reads metadata → creates ACTIVE profile (org, role rep, manager_id, zone)
      → marks the invite 'accepted'
  → rep signs in → RoleHomeRedirect → /rep
  → manager's dashboard & roster now include them (RLS: is_my_report / same org)
```

---

## Setup

### Demo (no backend)

```bash
npm install
echo "VITE_DEMO_MODE=true" > .env.local
npm run dev            # http://localhost:5173, sign in admin / admin
```

### Full backend

**1. Frontend env** — `cp .env.local.example .env.local`, then fill:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon public key>
```

**2. Create a Supabase project** at [supabase.com/dashboard](https://supabase.com/dashboard).
From Settings → API copy the **Project URL** and **anon public** key (above) and the
**service_role** key (Edge Function secrets only — never in the frontend).

**3. Apply the schema** — install the Supabase CLI, then:

```bash
supabase login
supabase link --project-ref <project-ref>
supabase db push          # runs supabase/migrations/*.sql in order
```

**4. Social login (optional)** — both providers' redirect URI must point at Supabase's
callback, `https://<project-ref>.supabase.co/auth/v1/callback`:

- **Google** — Cloud Console → OAuth 2.0 Client (Web) → add the redirect URI → Client
  ID/Secret into Supabase → Auth → Providers → Google.
- **LinkedIn** — Developer Portal → app with **"Sign In with LinkedIn using OpenID
  Connect"** → same redirect URI → Client ID/Secret into Supabase → Auth → Providers →
  LinkedIn (OIDC).

**5. Deploy Edge Functions + secrets**

```bash
supabase functions deploy employee-login --no-verify-jwt
supabase functions deploy invite-user
supabase functions deploy analyze-shelf-photo
supabase functions deploy structure-voice-note

supabase secrets set SITE_URL=https://<your-frontend-domain>
supabase secrets set ANTHROPIC_API_KEY=<console.anthropic.com key>   # optional
supabase secrets set ANTHROPIC_MODEL=claude-sonnet-5                 # optional, defaults to claude-opus-5
```

`SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` are injected
automatically.

**6. Register the JWT hook** — Supabase → Auth → Hooks → "Customize Access Token (JWT)
Claims" → point it at `public.custom_access_token_hook`. Without this the app can't read
`org_id` / `user_role` off the token.

**7. First run** — open the app, sign up (no invite) → you land on Create organization →
you are the admin → invite your team.

---

## Database migrations

`supabase/migrations/`, applied in order by `supabase db push`:

| File | What it adds |
| --- | --- |
| `0001_schema.sql` | All tables + enums + indexes + the two storage buckets. |
| `0002_rls_policies.sql` | The `private.*` helper functions and every table's RLS policies; storage policies. |
| `0003_auth_triggers.sql` | `handle_new_user()` trigger, `create_organization()` RPC, `custom_access_token_hook()`. |
| `0004_login_attempts.sql` | The rate-limit table for `employee-login` (RLS on, no policies). |
| `0005_visit_workflow.sql` | `visits.submitted_at`; `can_access_visit` / `owns_draft_visit` helpers; tightens child-table + complaint RLS. |
| `0006_manager_invites.sql` | Managers may read invites; `handle_new_user` honours `manager_id` from invite metadata. |
| `0007_users_directory.sql` | `profiles.zone`, `profiles.last_seen_at`, `invites.last_sent_at`, invite expiry → 30 days; `handle_new_user` honours `zone`. |

---

## Project structure

```
src/
├── App.tsx                  route table (lazy-loaded screens + <Suspense>) + offline sync
├── main.tsx                 ErrorBoundary → Router → QueryClient → ToastProvider → AuthProvider
├── index.css                Tailwind entry + chart colour tokens (light/dark)
│
├── components/
│   ├── AppShell.tsx         header + role nav (red dots) + demo/offline banners
│   ├── AuthLayout.tsx       centered card for the auth screens
│   ├── Attribution.tsx      fixed "Built by Piyush Kapoor" badge (every page)
│   ├── ErrorBoundary.tsx    catches render crashes
│   ├── Toast.tsx            ToastProvider + useToast()
│   ├── Pagination.tsx       usePagination() + <Pagination>
│   ├── charts.tsx           dependency-free chart primitives
│   ├── ChartCard.tsx        chart tile + ⓘ description/table popover
│   ├── SignedImage.tsx      renders a private-bucket image via a signed URL
│   ├── VoiceRecorder.tsx    browser speech-to-text + textarea fallback
│   └── primitives.tsx / Button / FormField
│
├── routes/
│   ├── auth/                Login, Signup, CreateOrg, AcceptInvite
│   ├── rep/                 Home, History, VisitCapture + visit/{Stock,Photo,Voice,Complaint}Section
│   ├── manager/             Dashboard, Users, Complaints (thin wrappers over shared/)
│   ├── admin/               Dashboard, InviteUsers, Outlets, Complaints, Branding
│   ├── shared/              TeamDashboard, ComplaintsBoard, UserManagement, users/{MemberProfileModal,PendingInvitesList}
│   └── NotFound.tsx
│
├── lib/
│   ├── supabaseClient.ts    real client OR demo client, by VITE_DEMO_MODE
│   ├── auth/                AuthContext, authActions (sign-in/up, invite, resend, create-org)
│   ├── queries/             useVisits, useTeam, useOutlets, useInvites, useOrgMembers, useOrganization
│   ├── offline/             queue.ts (localStorage outbox) + flush.ts (replay/sync hooks)
│   ├── demo/                store.ts (seed + persistence) + demoClient.ts (mock supabase)
│   ├── ai.ts                Edge Function callers (+ demo canned output)
│   ├── storage.ts           visit-photo upload/signed-URL + logo helpers
│   ├── geo.ts               getCurrentPosition()
│   ├── time.ts              timeAgo / shortDate / expiryStatus
│   └── useOnline.ts
│
└── types/database.types.ts  hand-written table/row types

supabase/
├── config.toml              function verify_jwt flags, auth hook, provider env refs
├── migrations/              0001 … 0007 (see above)
└── functions/
    ├── _shared/             cors.ts, anthropic.ts
    ├── employee-login/      company-code → session (no JWT)
    ├── invite-user/         admin/manager → invite (+ resend, zone inheritance)
    ├── analyze-shelf-photo/ Claude vision
    └── structure-voice-note/ Claude text structuring
```

---

## Development

```bash
npm run dev       # Vite dev server (HMR)
npm run build     # tsc -b && vite build   → dist/
npm run preview   # serve the production build
npm run lint      # oxlint
```

- **TypeScript is strict** (`noUnusedLocals`, `erasableSyntaxOnly`, `verbatimModuleSyntax`)
  — use `import type`, no enums, no parameter properties.
- **Data fetching**: every server read is a `useQuery` in `src/lib/queries/`; every write
  is a `useMutation` there. Components don't call `supabase` directly (a few historical
  exceptions in `Branding` / `AcceptInvite`).
- **Styling**: Tailwind utility classes, `dark:` variants throughout (follows the OS
  colour scheme — there is no in-app toggle yet).
- **PWA**: `vite-plugin-pwa` with `registerType: 'autoUpdate'`; manifest in `vite.config.ts`.

---

## Deployment

`vercel.json` builds with `npm run build`, serves `dist/`, and rewrites all paths to
`index.html` (SPA routing). Set `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (or
`VITE_DEMO_MODE=true`) as build env vars. Any static host works — the app is a pure SPA;
all server logic lives in Supabase.

---

## Not yet built

Auto-expiring invites (a scheduled function), member deactivate/edit, CSV import/export,
a real test suite, an in-app light/dark toggle, a full IndexedDB offline store for
photos, and standing the whole thing up against a live Supabase project (everything from
Phase 2 on is currently verified against the demo mock).

---

## Credits

Designed and built by **Piyush Kapoor** for the IIMK Advanced Product Management course
(Group 12). See `AUTHORS.md`.
