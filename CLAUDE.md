# Lava Fulfillment Intra — merged internal hub

Context handoff for Claude Code. Read this first. It carries every decision made
so far so you continue in the same shape without re-deriving anything.

_Stack reality: Laravel 13 + Vite shell, React apps, Postgres (hosted on
Supabase) as the data layer. The browser never calls the database directly — it
goes through Laravel `/api/*` endpoints. This supersedes any earlier note that
had React calling Supabase from the browser with the anon key._

## What this is

One internal hub that merges the team's Fulfillment apps into a single React SPA
served by a Laravel + Vite monorepo. It is a proof of concept on a Supabase
project, built to the Lava spine contract so the eventual move to the company
spine is a config swap, not a rewrite. It must be usable internally today.

## Repo facts

- GitHub: `Lava-Automation/Fulfillment_Intra`, default branch `main`.
- Branch-per-app today; the merged hub lives on `main`.
- Laravel serves the page; the React shell renders everything. The only
  per-branch merge points were `app.jsx` and `welcome.blade.php`.
- Vite entry is `resources/js/app.jsx` (fixed mount, stays tiny). The shell is
  `resources/js/mainapp.jsx`.

## The two decisions that govern everything (locked)

**1. React talks to Laravel `/api/*`; Laravel talks to Postgres.** The browser
holds no database client and no keys. Every app fetches JSON from Laravel
endpoints (through `lib/api.js`) and mutates with POST/PATCH/DELETE; the
controller does the DB write and the `activity_log` insert. Access is enforced
server-side in Laravel (and ultimately the spine), not by the browser. Hard line:
no Anthropic key and no service-role secret in the browser, ever. At cutover to
the company spine, the endpoints/connection swap; the app code does not.

**2. The Portal is the host; navigation is in-app.** The Portal owns the home
and embeds every other app as a lazy-loaded page, switching between them in
memory. Laravel serves the same SPA shell for every path (the `/{any?}`
catch-all behind auth), so deep links and refreshes still boot the app. Each app
is a separate chunk that loads on demand.

## Structure: encapsulated apps under a thin shell

The shape is "shell owns the shared floor, apps are strangers to each other."

- `mainapp.jsx` is the shell, slimmed to an auth/host wrapper. It owns the
  session (resolved server-side) and a top-level error boundary, then renders the
  Portal, which hosts every other app. Keep it small. A change here affects
  everyone; that is the one shared single point of failure.
- Each app lives in its own folder `resources/js/apps/<app>/index.jsx`, exports
  one root component, and is **lazy-loaded** so it compiles into its own chunk
  and only loads when its route opens.
- Apps never import each other. They receive `{ session }` as a prop from the
  host and talk only to the host above and the Laravel `/api` below (through
  `lib/api.js`). No app imports a database client.
- Each route is wrapped in `AppErrorBoundary`. An uncaught crash in one app
  shows a fallback in that panel; the side panel and every other app keep
  working. This is the runtime blast-radius isolation.

What each isolation layer actually buys, stated honestly:
- Code isolation: free from the folder-per-app rule. An edit to one app cannot
  change another's behavior, and merges stay conflict-free.
- Crash isolation: from the per-route error boundary.
- Build isolation: from lazy per-route imports. A broken import fails only that
  chunk, not the whole build.
- Data isolation: NOT from the front end. All apps share one database; data
  separation is enforced server-side in Laravel (the controllers/endpoints), and
  on the eventual spine. The front end protects against code/crash leakage; the
  backend protects against data leakage. Both layers must hold.

## File map (scaffold)

```
resources/js/
  app.jsx                     Vite entry; imports and renders mainapp. Stays tiny.
  mainapp.jsx                 The shell: session + top-level error boundary; renders the Portal host.
  lib/
    api.js                    The one client->Laravel helper (GET/POST/PATCH/DELETE, session cookie + CSRF).
    useSession.js             The one identity source. Reads window.__AUTH__ (injected by the server).
    useOptions.js             Cached fetch of the shared option_set dropdown pool (/api/options).
    AppErrorBoundary.jsx      Per-route crash isolation.
  apps/
    registry.js               Declares each app: key, label, path, lazy import.
    portal/index.jsx          The host app; embeds the others as pages.
    devSupport/index.jsx      Example translated app (the pattern to copy).
    <others>/index.jsx        One folder per app.
app/Http/Controllers/         The Laravel API: one controller per app, plus AccountController/OptionController.
routes/web.php + routes/api/  The endpoint map (web.php auto-loads routes/api/*.php).
resources/views/welcome.blade.php   Mount point; injects window.__AUTH__. @viteReactRefresh before @vite.
```

## Backend and database setup

- The app reaches Postgres through Laravel's normal DB config in `.env`
  (host/db/user/password for the Supabase-hosted database). There is no browser
  Supabase client and no `VITE_SUPABASE_*` keys.
- Run `fulfillment_schema.sql` once in the database (Supabase SQL editor). It
  creates `spine.*` (employees, role_grants, activity_log, hubspot_companies) and
  `public.*` domain tables and seeds the data. Apply later schema changes (e.g.
  `option_set` and the universal account columns) as SQL the same way.
- `public/build` is gitignored; the server runs `npm run build` after pulling.
- npm deps are fixed by the Dependency policy (see that section), not chosen per
  app: `lucide-react` (icons), `recharts` (charts), plus `react`/`react-dom`. Do
  not add a library outside that set without updating the policy table.

### Identity

- Auth is a passwordless magic link handled by Laravel (`/login` ->
  `MagicLinkController`). On verify, Laravel logs the user in, maps them to their
  `spine.employees` row, and `welcome.blade.php` injects the identity as
  `window.__AUTH__`, which `lib/useSession.js` reads synchronously.
- The actor for every audit write is taken from the server session
  (`App\Support\ActivityLogger`), never from request input, so the trail cannot
  be spoofed.

## The recurring job: translating a teammate's file (standing playbook)

Teammates vibe-code self-contained apps with hardcoded arrays, no auth, no
persistence, no Supabase. They will keep sending files in the same shape (single
`.jsx` or a project `.zip`). Each time, run the SAME translation pass. The screen
they designed stays intact; only the data source underneath changes.

1. **Locate the static arrays.** People (`TEAM`, `TRAINERS`, `VAS`, `PMS`),
   accounts/clients, and domain seeds (`SEED_TICKETS`, `BUILDS`, `TRAINEES`).
2. **Classify each.** People -> reads from `spine.employees`. Agencies -> reads
   from `spine.hubspot_companies` joined to `public.accounts`. Domain data ->
   reads/writes against that app's own tables.
3. **Swap arrays for Laravel `/api` fetches behind a small hook** (through
   `lib/api.js`), keeping the shape the component already expects so the JSX
   barely changes.
4. **Replace their invented current user** with `session.employee` from the
   shell. Map any name they key on (`"Kristel"`, `"Sam"`) to a spine UUID on the
   way in; render the name back out. Their files will ALWAYS do names-not-UUIDs;
   this mapping is permanent, not a one-off.
5. **Turn state mutations into Laravel `/api` writes.** The controller does the
   DB write and the matching `activity_log` insert, namespaced
   `<app>.<entity>.<verb>`.
6. **Fold into the shell:** new folder under `apps/`, add one entry to
   `registry.js` (key, label, path, lazy import), wrap comes for free via the
   shell's per-route error boundary.
7. **Normalize imports to the approved library set** (see Dependency policy). If
   their file reaches for a non-approved icon/chart/util library, swap it to the
   approved one rather than installing a parallel package.

Put the translated root at `apps/<app>/index.jsx`. Do NOT import the teammate's
raw file directly; the translated version is what the hub runs. See
`apps/devSupport/index.jsx` for the canonical example.

### Encoding rule (carries over, applies to me too)

Always translate from the DOWNLOADED file, never pasted text. Their files are
full of icons and em dashes that corrupt to `â` / `Â·` / `ð` on paste. A file
attachment preserves bytes; pasted text does not. Same rule for the schema and
these docs: take them as files.

## Schema-vs-vision conflicts (standing rule)

When a teammate's data model disagrees with the schema (a status value, a field
that does not exist in the tables), the default is to **bend their app to the
schema**, because the schema is the shared contract every app and the future
spine depend on; a one-off field in one app's vision is not worth fragmenting
it. The exception: when their vision reveals a real gap the schema genuinely
missed, change the schema once, regenerate, and note it. This bias is permanent
and stops the schema drifting app by app.

## Dependency policy (standing rule)

One `package.json`, one `node_modules`, shared by every app. The standing rule is
the library twin of bend-to-the-schema: **bend the app to the approved library
set.** A library is approved for ONE job, and that is the only library for that
job. The complete approved set:

| Job | Library | Imported by |
|-----|---------|-------------|
| UI framework | `react`, `react-dom` | everything |
| Routing | (none in use) | the Portal host switches pages in memory; Laravel's catch-all serves deep links. `react-router-dom` is installed but currently unused. |
| Data | `lib/api.js` -> Laravel `/api` | every app (apps fetch JSON; no browser database client) |
| Icons | `lucide-react` | any app |
| Charts | `recharts` | any app |

Build tooling (`vite`, `laravel-vite-plugin`, `tailwindcss`, `@tailwindcss/vite`,
`@vitejs/plugin-react`, `concurrently`) is infrastructure, fixed once, not part
of this list.

Rules:
- Teammates' files will reach for whatever they happened to use (a different icon
  pack, `chart.js`, `victory`, a date lib). During translation, **swap it to the
  approved library**, never install a parallel one. This is the same chokepoint
  that maps names to UUIDs; the normalization happens once, in the translation
  pass.
- Adding a genuinely new library is a deliberate decision that **updates this
  table**, not something that arrives per app. The bar: no approved library can
  do the job, and the need is real (not one screen's nice-to-have).
- Per-route code-splitting means an app's libraries load only on its route, so
  `recharts` never weighs on the Portal or Dev Support. Cost is isolated; that is
  not a reason to fragment, but it is why the list staying small is cheap to keep.
- Charts: standardize on `recharts`. When the first chart app is translated
  (Client Profile), introduce a thin brand-themed wrapper in `lib/` (brand colors
  + Poppins baked in) so every chart is on-brand by default and the underlying
  library is swappable in one file. The Training apps reuse that wrapper.

## Identity model (correction baked into the schema)

- No `users` table. Staff are `spine.employees`. Role FKs (`pm_id`,
  `trainer_id`, `qa_reviewer_id`, `owner_id`, `author_id`, `assigned_to`)
  reference `spine.employees(id)`.
- `public.vas` is a thin extension keyed by the VA's spine employee UUID; name
  and title render from `spine.employees`.
- `public.accounts` is a fulfillment extension on a `spine.hubspot_companies`
  row; agency name/phone/website come from the company mirror.

## Visibility rules (the spine's target model)

This is the intended visibility model for the spine, not what is enforced today.
Today access is gated in Laravel (and RLS is flattened on the POC database); these
predicates are the target to implement on cutover. Union of a person's grants
plus implicit self-grant. owner: everyone. admin:
country-wide, or department-wide across both countries (this is how a director
is expressed), or both. payroll: their country, comp fields only. team lead: one
hop down the reporting line, including Client-group VAs (blank department, so not
dept-bounded). manager: two hops, intermediate team lead bounded by grant
country+dept, leaf not. Reporting line is `reports_to` (a name today; UUID on the
spine).

## Brand floor

Two colors per screen: Red #E73835 (CTAs), Dark Blue #24242D (structure), Teal
#145365 (supporting), White #FFFFFF, Black #1B120B. Monument Extended display,
Poppins body. Inline styles, no CSS framework, no TypeScript. Voice: calm,
direct, capable. No em dashes, no buzzwords.

## Next steps (in order)

1. Wire the remaining Client Profile tabs (CRM, Forms, Reporting, Benchmarking,
   Requests, Timeline) to real data and persist them.
2. Build the in-app admin UI to manage `option_set` values (today edited in the DB).
3. Adopt the universal account endpoint (`/api/accounts/{id}/universal`) on more
   surfaces (e.g. Portal Accounts editing, Dev Support).
4. Replace the remaining sample/in-session data in apps with API-backed data.
5. Optionally record before->after values in the audit log for field edits.

## Open questions

- VA authentication: do VAs sign in during the POC, or are surfaces staff-only?
- Account-to-HubSpot link: confirm a VA's `client` placement resolves to the
  same company id `accounts` uses, once a real HubSpot mirror exists.
