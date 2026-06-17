# Fulfillment Intra — review guide

A walkthrough for reviewing the unified hub on `main`. Start here, then read
`CLAUDE.md` for the full architecture and the standing playbook.

## What this is

One internal hub that merges the team's Fulfillment apps into a single React SPA,
served by a Laravel + Vite shell. Each teammate's app becomes one folder under
`resources/js/apps/<app>/` and gets its own route. Data lives in **Supabase
Postgres**, called **directly from the browser** with the anon/publishable key;
**Row Level Security (RLS) decides what comes back**. Laravel only serves the page.

This is a proof of concept. It is meant to be usable internally today and to move
to the company spine later as a config swap, not a rewrite.

## What is done (current state of `main`)

- **Shell** (`resources/js/mainapp.jsx`): side panel, path-based routing
  (React Router), session/identity, and a per-route error boundary so one app
  crashing never takes down the others.
- **Portal** (`resources/js/apps/portal/index.jsx`) is fully translated and
  serves the `/` home. Wired to Supabase (RLS-filtered):
  - Accounts list, Dashboard, account-detail tabs
  - Support Tickets (with create)
  - VA Overview
  - LAVA Trainers
  - Meeting Requests (Confirm / Decline write back + log activity)
  - Send Communication + LAVA Docs are still mock (no tables behind them yet).
- **Dev Support** (`resources/js/apps/devSupport/index.jsx`) is the example app
  at `/dev-support` — the canonical pattern to copy when translating the rest.
- Apps still to translate: **clientProfile, qaqcTracker, trainingTracker,
  trainerWorkloadDashboard** (entries are commented out in
  `resources/js/apps/registry.js`).

## Two architecture decisions to keep in mind while reviewing

1. **The browser talks to Supabase directly with the anon key. RLS is the only
   thing protecting data.** No service-role key and no Anthropic key ever live in
   the client. If a feature needs a secret, it waits or gets a tiny dedicated
   endpoint — it does not pull the data layer behind Laravel.
2. **Routing is by URL path** (`/`, `/dev-support`, ...), not an in-memory
   switch, so links are shareable and each app code-splits into its own chunk.

## Important: RLS is temporarily flattened

To unblock review before the org hierarchy is finalized, **every visibility
policy is currently `using (true)`** — any *authenticated* user sees all rows.
RLS is still **on**, so the anon key without a sign-in still sees nothing (no
public exposure). The spine records, `role_grants`, and `current_user_can_see`
are all intact, just bypassed. Rebuilding the real hierarchy later means swapping
those `true`s back to proper predicates. This is marked clearly in the schema SQL
under a "TEMP: flattened visibility" block.

So while reviewing: **do not read the current "everyone sees everything" behavior
as the intended access model.** It is a temporary stage.

## How to run it locally

You will point at the **same Supabase project** (ask Nassim for the URL + anon
key — they are not committed). You should not need to re-run the schema; it is
already applied to that project.

1. Install deps:
   ```
   composer install
   npm install
   ```
2. Create `.env` (copy `.env.example` if present, or ask Nassim) and set:
   ```
   VITE_SUPABASE_URL=...            # the shared Supabase project URL
   VITE_SUPABASE_ANON_KEY=...       # anon / publishable key (NOT service role)
   VITE_DEV_EMPLOYEE_ID=...         # a spine.employees UUID to act as (dev only)
   ```
   `VITE_DEV_EMPLOYEE_ID` lets you browse as a specific employee without real
   auth. The shell does an anonymous Supabase sign-in to get the `authenticated`
   role, then sends that UUID as a header so the database treats you as that
   person. This whole path is dev-only; production uses a real auth session.
3. Run both the Laravel server and Vite:
   ```
   php artisan serve
   npm run dev
   ```
   (On Laragon you can use the Laragon-served host instead of `artisan serve`.)
4. Open the app. `/` is the Portal home; `/dev-support` is the example app.

If a page is blank, hard-refresh once (the dev anonymous sign-in resolves on the
second auth tick).

## Where to look in the code

- `resources/js/mainapp.jsx` — the shell (shared floor; keep small).
- `resources/js/apps/registry.js` — the one place an app is registered
  (key, label, path, lazy import).
- `resources/js/apps/portal/index.jsx` — the translated Portal; the bulk of the
  current work.
- `resources/js/lib/` — `supabase.js` (the one client), `useSession.js`
  (identity), `activity.js` (the append-only activity log writer),
  `AppErrorBoundary.jsx` (per-route crash isolation).
- `CLAUDE.md` — full architecture, the translation playbook, brand rules, and
  the schema/visibility model.

## What feedback is most useful right now

- Does the Portal UI match what the original app authors intended?
- Anything in the translation that changed behavior the team relies on?
- Gaps in the schema you can already see for the apps not yet translated.
- Naming / route structure before more apps get wired in.

## Known empty sections (expected, not bugs)

We deliberately do not fabricate data. Some sections read from tables that are
not seeded yet (e.g. VA metrics, trainers, meetings), so they render empty until
we add test rows. The schema columns exist; the data does not yet. This is by
design — we test by creating real entries once wiring is finished.
