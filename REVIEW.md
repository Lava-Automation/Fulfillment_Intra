# Fulfillment Intra — review guide

A walkthrough for reviewing the unified hub on `main`. Start here, then read
`CLAUDE.md` for the full architecture and the standing playbook, and
`UNIVERSAL_DATA.md` for the shared-data layer.

## What this is

One internal hub that merges the team's Fulfillment apps into a single React SPA,
served by a Laravel + Vite monorepo. Each teammate's app becomes one folder under
`resources/js/apps/<app>/`. Data lives in **Postgres (hosted on Supabase)**,
reached through **Laravel `/api/*` endpoints** — the browser never queries the
database directly and holds no keys. Laravel serves the SPA shell and the API.

This is a proof of concept. It is meant to be usable internally today and to move
to the company spine later as a config/endpoint swap, not a rewrite.

## What is done (current state of `main`)

- **Shell** (`resources/js/mainapp.jsx`): slimmed to an auth/host wrapper —
  session (resolved server-side) + a top-level error boundary. It renders the
  Portal, which hosts the other apps.
- **Portal** (`apps/portal/index.jsx`) serves `/` and embeds the other apps as
  lazy-loaded pages (in-memory page switch; Laravel's catch-all serves deep
  links). Includes Dashboard, Accounts list + detail, Tickets, Meetings,
  Trainers, VA Overview.
- **All apps are translated and live:** Client Profiles, Training Tracker,
  Trainer Workload, QAQC, Dev Support. Each fetches its own `/api/*` endpoints;
  every mutation writes the `activity_log` server-side.
- **Universal data layer** (see `UNIVERSAL_DATA.md`): a shared `option_set`
  dropdown pool (`/api/options`) and the standard company fields on the one
  `accounts` row, edited through `/api/accounts/{id}/universal`. Edit surface is
  the Client Profile General tab; QAQC reads CRM from the account.

## Two architecture decisions to keep in mind while reviewing

1. **React talks to Laravel `/api/*`; Laravel talks to Postgres.** No database
   client and no keys in the browser. No service-role secret and no Anthropic key
   in the client, ever — a feature needing a secret gets a dedicated endpoint.
2. **The Portal is the host.** It embeds every app as a lazy-loaded page, so each
   app code-splits into its own chunk and loads on demand.

## Access / visibility

Access is gated **server-side in Laravel** today. On the POC database, RLS is
flattened (every visibility policy is `using (true)`) and Laravel connects as the
table owner, so RLS is not the access boundary right now. The spine records
(`role_grants`, the intended visibility model in `CLAUDE.md`) are intact and are
the target to implement on cutover. So while reviewing: **do not read the current
"authenticated users see everything" behavior as the intended access model.** It
is a temporary stage.

## How to run it locally

1. Install deps:
   ```
   composer install
   npm install
   ```
2. Create `.env` (copy `.env.example`, or ask Nassim) and set Laravel's database
   connection to the shared Supabase-hosted Postgres (`DB_HOST`, `DB_DATABASE`,
   `DB_USERNAME`, `DB_PASSWORD`, ...). There are no `VITE_SUPABASE_*` keys. You
   should not need to re-run the schema; it is already applied to that database.
3. Run the Laravel server and Vite:
   ```
   php artisan serve
   npm run dev
   ```
   (On Laragon you can use the Laragon-served host instead of `artisan serve`.)
4. Open the app and sign in at `/login` with your Lava email (passwordless magic
   link). `/` is the Portal home.

For a production-style build, `npm run build` (the server must rebuild after
pulling, since `public/build` is gitignored).

## Where to look in the code

- `resources/js/mainapp.jsx` — the shell (shared floor; keep small).
- `resources/js/apps/registry.js` — the one place an app is registered
  (key, label, path, lazy import).
- `resources/js/apps/portal/index.jsx` — the host app; the bulk of the UI.
- `resources/js/lib/` — `api.js` (the one client->Laravel helper), `useSession.js`
  (identity from `window.__AUTH__`), `useOptions.js` (shared dropdown pool),
  `AppErrorBoundary.jsx` (per-route crash isolation).
- `app/Http/Controllers/` — the Laravel API: one controller per app, plus
  `AccountController` (universal fields) and `OptionController` (dropdown pool).
- `routes/web.php` + `routes/api/*.php` — the endpoint map.
- `CLAUDE.md` — full architecture, the translation playbook, brand rules, schema
  and visibility model. `UNIVERSAL_DATA.md` — the shared-data layer.

## What feedback is most useful right now

- Does each app's UI match what the original authors intended?
- Anything in the translation that changed behavior the team relies on?
- Gaps in the schema or the universal fields.
- Naming / route structure before more is wired in.

## Known empty sections (expected, not bugs)

We deliberately do not fabricate data. Some sections read from tables that are not
seeded yet, so they render empty until we add real rows. The columns exist; the
data does not yet. Several Client Profile tabs (CRM, Forms, Reporting,
Benchmarking, Requests, Timeline) still show the designer's in-session sample
while we wire them to the API.
