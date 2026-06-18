# Lava Fulfillment Intra — merged internal hub

Context handoff for Claude Code. Read this first. It carries every decision made
so far so you continue in the same shape without re-deriving anything.

_Stack reality: Laravel 13 + Vite shell, React apps, Supabase Postgres as the
data layer (apps call it directly). This supersedes any earlier note that
assumed Supabase-only with no Laravel._

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

**1. React calls Supabase directly from the browser with the anon key; RLS
enforces access.** Laravel only serves the shell. This is the spine-faithful
shape: anon key in the client is safe because RLS decides what returns, and at
cutover only the Supabase URL/key change. Hard line: no Anthropic key and no
service-role operation in the browser, ever. If a teammate's app needs AI or a
secret-holding call before the spine exists, that one feature waits or gets a
tiny dedicated endpoint; it does not drag the data layer behind Laravel.

**2. The side panel routes by path with React Router.** Each app has a URL
(`/qaqc`, `/training`, ...), so links are shareable, the back button works, and
routes code-split per app. Not an in-memory switch.

## Structure: encapsulated apps under a thin shell

The shape is "shell owns the shared floor, apps are strangers to each other."

- `mainapp.jsx` is the shell. It owns the only genuinely shared things: the
  Supabase client, the session, the router, the side panel, the brand frame,
  and a per-route error boundary. Keep it small. A change here affects everyone;
  that is the one shared single point of failure.
- Each app lives in its own folder `resources/js/apps/<app>/index.jsx`, exports
  one root component, and is **lazy-loaded** so it compiles into its own chunk
  and only loads when its route opens.
- Apps never import each other. They receive `{ session, supabase }` as props
  from the shell and talk only to the shell above and the database below.
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
  separation is whatever RLS enforces. A missing policy is a hole regardless of
  how clean the front end is. Front end protects against code/crash leakage; the
  database protects against data leakage. Both layers must hold.

## File map (scaffold)

```
resources/js/
  app.jsx                     Vite entry; imports and renders mainapp. Stays tiny.
  mainapp.jsx                 The shell: side panel, router, session, error boundaries.
  lib/
    supabase.js               The one client. Knows the project URL + anon key.
    useSession.js             The one identity source. Maps auth user -> spine.employees.
    activity.js               Append-only activity_log writer.
    AppErrorBoundary.jsx      Per-route crash isolation.
  apps/
    registry.js               Declares each app: key, label, path, lazy import.
    devSupport/index.jsx      Example translated app (the pattern to copy).
    <others>/index.jsx        One folder per app.
resources/views/welcome.blade.php   Mount point. @viteReactRefresh before @vite.
```

## Supabase setup

- Project created in Supabase. Project URL + anon (public) key go in `.env` as
  `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Never the service role key.
- Run `fulfillment_schema.sql` once in the SQL editor. It creates `spine.*`
  (employees, role_grants, activity_log, hubspot_companies, current_employee_id,
  current_user_can_see) and `public.*` domain tables, with RLS on every table,
  and seeds 407 employees, 31 grants, 176 companies/accounts, 328 vas, and
  sample builds/tickets.
- npm deps are fixed by the Dependency policy (see that section), not chosen per
  app: `@supabase/supabase-js`, `react-router-dom`, `lucide-react` (icons),
  `recharts` (charts). Do not add a library outside that set without updating the
  policy table.

### Identity and RLS testing

- Today `useSession` maps the magic-link auth user to a `spine.employees` row by
  email. For local RLS testing without auth, set `VITE_DEV_EMPLOYEE_ID` in
  `.env` to a spine UUID and the shell acts as that person.
- Production wiring: add a Supabase access-token hook that puts `employee_id`
  into the JWT claims; then `spine.current_employee_id()` reads the claim. That
  hook is the one production-only piece.

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
3. **Swap arrays for Supabase queries behind a small hook**, keeping the shape
   the component already expects so the JSX barely changes.
4. **Replace their invented current user** with `session.employee` from the
   shell. Map any name they key on (`"Kristel"`, `"Sam"`) to a spine UUID on the
   way in; render the name back out. Their files will ALWAYS do names-not-UUIDs;
   this mapping is permanent, not a one-off.
5. **Turn state mutations into Supabase writes + a matching `activity_log`
   insert**, namespaced `<app>.<entity>.<verb>`.
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
| Routing | `react-router-dom` | shell only (apps get their route from the shell) |
| Data | `@supabase/supabase-js` | shell only (apps receive `supabase` as a prop, never import the client) |
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

## Visibility rules (in spine.current_user_can_see)

Union of a person's grants plus implicit self-grant. owner: everyone. admin:
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

1. Push the shell scaffold (`mainapp.jsx`, `lib/*`, `apps/registry.js`,
   `welcome.blade.php`, the example app) to `main`. Add the npm deps.
2. Put `.env` values in; run `fulfillment_schema.sql` in Supabase.
3. Translate each existing app branch into `apps/<app>/index.jsx` using the
   playbook; register each in `registry.js`.
4. Migrate the domain seed data still living in app arrays (courses/modules/
   lessons from training-tracker; meetings/projects/goals/etc from
   ClientProfile; full builds and tickets sets).
5. Replace every `console.log("[activity_log]", ...)` stub with `logActivity`.
6. Add the Supabase access-token hook; verify each app respects RLS as different
   users.

## Open questions

- VA authentication: do VAs sign in during the POC, or are surfaces staff-only?
- Account-to-HubSpot link: confirm a VA's `client` placement resolves to the
  same company id `accounts` uses, once a real HubSpot mirror exists.
