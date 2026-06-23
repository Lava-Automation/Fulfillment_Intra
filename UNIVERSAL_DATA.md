# Universal data layer — decisions and contract

The standard company-view fields (plan, statuses, CRM/AMS/forms, the role people,
address) live on **one `accounts` row that every app reads and writes**, so a
change made anywhere shows up everywhere. This file records the decisions behind
that layer — especially the ones you cannot read off the code — plus the API
contract and the standing rules that keep future apps consistent.

Built 2026-06-24. Companion files: `CLAUDE.md` (project handoff), and the
reference `fulfillment_schema.sql` / `lava-hub-schema.sql` / `lava-hub-data-model.md`.

---

## 1. The goal, in the team's words

> "I want a universal db where everything will just be pulled from. If it's
> changed in any part of the app, it should be reflected to the others. For
> example if the CRM is updated in the accounts under the Portal app, it should
> also reflect on the Client Profile, Dev Support..."

So the unit of truth is the **account** (the agency engagement). Company identity,
the assigned people, and the engagement fields all hang off it, and one API edits
them. Because every app already reads the same `accounts` row through Laravel,
"edit-anywhere-reflects-everywhere" is mostly free — the work was consolidating
fields, fixing the dropdown source, and normalizing the existing values.

---

## 2. Architecture context (why this shape)

The hub runs **React → Laravel `/api/*` → Postgres (Supabase DB)**. The browser
holds no Supabase client or key; identity is server-side. This supersedes the
older note in `CLAUDE.md` about the browser calling Supabase directly with the
anon key.

Consequence for this layer: the place to enforce "valid dropdown value" and
"real employee" is the **Laravel controller**, not browser code and not database
constraints. That single choice is why the design below is lean.

---

## 3. The decisions that are NOT derivable from the code

These are the judgment calls. The code reflects them but does not explain them.

### 3.1 Lean `option_set`: TEXT value + controller validation (NOT FK columns)
An earlier plan (`option_set_migration_gameplan.md`) modeled dropdowns as foreign
keys: each account column would point at an `option_set` row id, with category-
pinned constraints and column drops. **We deliberately did not do that.**

- Account columns keep the chosen value as **TEXT** (e.g. `accounts.crm = 'AgencyZoom'`).
- `option_set` is only the **source** of the dropdown and the **allow-list**.
- The Laravel controller validates an incoming value against the active values
  for that category (`Rule::in(OptionSet::activeValues($category))`).

Why: the FK approach required irreversible migration steps (backfill every row,
add NOT-NULL FKs, drop the text columns) on a live POC, for no real gain once the
gatekeeper is already a Laravel controller. The lean approach is additive and
reversible, and it matches the patterns already in the schema (`skills_catalog`,
`tech_stack`). The bar to revisit this is real database-level integrity needs that
the controller cannot meet — not present today.

### 3.2 Retire, never delete (`is_active`)
Removing a dropdown choice sets `is_active = false`; it is never hard-deleted.
Why: historical rows may still reference a value you are retiring. Deactivating
removes it from new dropdowns while leaving old records readable and valid. The
read endpoint hides inactive values; the admin endpoint shows them.

### 3.3 Company identity mirrors from HubSpot and is read-only
Company **name, phone, website, city, state** are NOT stored on the account and
are NOT editable here. They mirror from `spine.hubspot_companies` and are shown
read-only. **HubSpot supersedes any edit.** Why: HubSpot is the system of record
for company identity; duplicating it editable here would create two sources that
drift. The account owns the *engagement* fields; HubSpot owns *who the company is*.

### 3.4 People are single-FK role slots, filtered by position; VAs are multi
The role people — Project Manager (`pm_id`), Account Manager (`am_id`), Dev
Support (`dev_support_id`), Team Lead (`tl_id`) — are **single** foreign keys to
`spine.employees`. The role dropdowns filter employees by their `position` text
(e.g. "Project Manager"), falling back to the full list if no position matches.
VAs are **not** a single slot: they remain many-per-account via `vas.account_id`.
Why: an account has one PM/AM/etc. but any number of VAs; the data model already
reflected the VA side, so only the single-role slots were added.

### 3.5 Edit surface = Client Profile "General" tab (today)
The editable "Company essentials" card lives on the **Client Profile General
tab**. Portal Accounts stays a read-only triage list (and reflects changes
automatically, since it reads the same row). Why: the General tab is the
"look into a company" view that already displays these fields, so people edit
where they read — one design system, lowest risk. The team's canonical example
named Portal Accounts, but that screen is a sorted triage table, not a detail
editor; making it editable was awkward by comparison. Any other app can adopt the
same universal endpoint later without changing the data model.

### 3.6 Apps adhere to the universal rule; they only add features
Standing rule from the team:

> "This is now going to be one big app, so the data should be consistent across
> all of them. The only individual thing they will add are features. If a feature
> needs a new table, edit the values inside the db, then we discuss it before
> implementing."

So an app does not keep its own copy of a universal field. The first application
of this rule is QAQC's CRM (see 3.7). A new app being translated reads the shared
fields from the account and the shared dropdowns from `option_set`; anything that
would need a new table is discussed before it is built.

### 3.7 QAQC CRM is read-only, from the account
QAQC used to carry its own per-build CRM (`builds.crm`), edited inline, with its
own spellings ("Agency Zoom", "Insured Mine"). Now each build shows its
**account's** CRM (`accounts.crm`, canonical spelling), read-only; the inline
editor is gone and the "BY CRM" filter reads the shared pool. The legacy
`builds.crm` column is kept in the table but is no longer the source (the API
overrides it with the account value on read). Why: CRM is a property of the
agency, not of an individual build — keeping a second editable copy is exactly the
drift this layer exists to remove. To change a build's CRM you change the
account's CRM (in the Client Profile), and it updates everywhere.

---

## 4. The canonical dropdown values (authoritative)

Seven categories in `option_set`. These are the agreed values; this list wins over
any older draft.

| Category | Values |
|---|---|
| `plan` | Elite, Platinum, Group, Ad Hoc |
| `fulfillment_status` | Monthly Recurring, Quarterly Recurring, Ad-hoc, Build in Progress, Active, Not Active |
| `account_status` | Active Watch, Stable, No VA, Concerns, Active, Closed |
| `cs_status` | Pending Start, Active, Retention, Cancelled |
| `crm` | AgencyZoom, InsuredMine, GoHighLevel, Hubspot |
| `ams` | Hawksoft, EZLynx, QQCatalyst, AMS360, Nowcerts |
| `form_software` | Jotforms, Gravityforms, Cognitoforms |

Free text (no dropdown): `owner_name` (agency owner), `address_street`,
`address_zip`, `google_review_link`.

---

## 5. The re-vocabulary applied to existing data (one-time migration)

The live data used older spellings and status words. The migration normalized
them. The mappings and the decisions behind them:

**Customer success (`cs_status`)** — confirmed all three:
- New → **Pending Start**
- Healthy → **Active**
- At Risk → **Retention**

**Fulfillment (`fulfillment`)**:
- Active → **Active**
- Paused → **Not Active**  _(decision: Paused reads as Not Active. In practice no
  Paused rows existed — all 176 were Active.)_

**Plan (`plan`)** — decision: the old tiers are gone, not remapped.
- Ad Hoc → **Ad Hoc** (kept)
- Starter / Growth / Scale (and any non-canonical value) → **blanked to null**,
  to be re-set per account from the new pool. _(All 176 accounts were old tiers,
  so plan is currently null everywhere until staff set it.)_

**CRM / AMS** — collapsed spacing/spelling variants onto the canonical spelling
(e.g. "Agency Zoom" → "AgencyZoom", "QQ Catalyst" → "QQCatalyst"). Unrecognized
values were left untouched rather than guessed.

**`accounts.stage`** — decision: **left as-is**, not retired. It is a separate
lifecycle field and was out of scope for this pass.

### Migration outcome (verified clean, 2026-06-24)
Post-migration inventory across 176 accounts:
- crm: AgencyZoom 84, InsuredMine 92
- ams: EZLynx 45, Hawksoft 39, QQCatalyst 58, null 34
- cs_status: Active 65, Pending Start 56, Retention 55
- fulfillment: Active 176
- plan: null 176 (old tiers cleared)

No stragglers; every value is canonical or null.

---

## 6. What was built (the map)

**Database** (`public` schema):
- `option_set` (id, category, value, label, sort_order, is_active) — the pool,
  seeded with the values in §4.
- New `accounts` columns: `account_status`, `form_software`, `owner_name`,
  `address_street`, `address_zip`, `google_review_link`, `am_id`,
  `dev_support_id`, `tl_id`. (`pm_id` already existed.)

**Backend** (Laravel):
- `OptionSet` model + `OptionController` — the pool and its admin CRUD.
- `AccountController` — the universal read/write bundle.
- `ClientProfileController::show` extended to return the new fields, the full
  company mirror, and employee `position`.
- `QaqcController` — CRM derived from the account on read; CRM dropped from all
  build writes.
- Routes auto-loaded from `routes/api/options.php` and `routes/api/accounts.php`.

**Frontend** (React):
- `resources/js/lib/useOptions.js` — one cached `GET /api/options`; every dropdown
  reads it. `invalidateOptions()` to refetch after an admin edit.
- Client Profile General tab: the editable "Company essentials" card.
- QAQC: CRM read-only chip, filter reads the pool, no CRM editor.

---

## 7. API contract

| Method + path | Purpose |
|---|---|
| `GET /api/options` | All **active** values grouped by category. The one call the SPA caches. |
| `GET /api/options/{category}` | One category **including inactive** rows (admin manage view). |
| `POST /api/options` | Add a value `{category, value, label?, sort_order?}`. Re-activates a retired value. |
| `PATCH /api/options/{option}` | Edit `label` / `sort_order` / `is_active`. |
| `DELETE /api/options/{option}` | **Retire** (sets `is_active=false`), never hard-delete. |
| `GET /api/accounts/{id}/universal` | Standard fields + resolved people (`{id,name}`) + company mirror (read-only) + assigned VAs + employee candidates. |
| `PATCH /api/accounts/{id}/universal` | Partial update. Dropdown fields validated against active `option_set`; people against `employees`. Logs `accounts.universal.updated`. |

`PATCH .../universal` is a **partial** patch: only the fields present in the body
are touched, so a single-field edit from any app works. Sending `""` for a field
clears it to null.

---

## 8. Deferred / open

- **Options admin UI** — managing dropdown values in-app (wired to the
  OptionController CRUD). Decided "Later"; today values are seeded and editable in
  the DB.
- **Other apps adopting the universal endpoint** — Dev Support, Portal Accounts
  editing, etc. The endpoint is ready; the UI per app is incremental.
- **Plan is null on all accounts** — staff set it from the pool as they open
  profiles.
- **VPS rebuild required** — `public/build` is gitignored, so the server must
  `npm run build` after pulling.
- **Commit status** — backend + frontend changes for this layer are, as of
  writing, not yet committed.

---

## 9. For the next app translation

When folding a teammate's app into the hub, on top of the existing playbook in
`CLAUDE.md`:
1. Do not let the app keep its own copy of a universal field (plan, the statuses,
   CRM/AMS/form software, the role people). Read them from the account.
2. Point every dropdown at `useOptions()` / `option_set`, not a hardcoded array.
   Swap the app's spellings to the canonical values in §4.
3. If the app needs to edit a universal field, call
   `PATCH /api/accounts/{id}/universal` — do not write the column directly.
4. If a feature genuinely needs a new table or a new dropdown category, change the
   DB and discuss it before building, per the standing rule (§3.6).
