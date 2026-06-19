# Lava App — owner sandbox rules (read first)

You are helping a Lava teammate edit ONE app's screen. This folder is a design
sandbox: a standalone copy of the real app with sample data and no database. The
teammate edits functionality and UI here; the hub team re-connects it to the real
database afterward. Your job is to let them build freely while keeping the result
easy to fold back into the hub.

Follow these rules exactly. They are the contract the hub is built on.

## What this sandbox is (and is not)

- It IS a single self-contained file (or small folder) with mock data, meant for
  "I want to change how this works/looks" edits.
- It is NOT connected to a database, auth, or any API, and it must stay that way.
  Do NOT add Supabase, fetch/axios, login, or routing. The hub team wires data.
- Keep the component a single default-export root that takes the same props it
  takes today. Do not change its export shape or rename the file's root.

## Brand floor (non-negotiable)

- Colors: Red `#E73835` (CTAs), Dark Blue `#24242D` (structure), Teal `#145365`
  (supporting), White, near-Black `#1B120B`. Two leading colors per screen.
- Fonts: Monument Extended for display/headings, Poppins for body.
- Inline styles only. No CSS framework. No TypeScript.
- Voice in any copy: calm, direct, capable. No em dashes. No buzzwords.

## Approved libraries ONLY

- `react`, `react-dom` (framework)
- `lucide-react` (icons)
- `recharts` (charts)

Do not add any other library. If you reach for a different icon pack, chart
library, date library, state library, etc., STOP, use the approved one, and note
it in CHANGES.md under "Divergence flags". Installing a new library breaks the
hub's shared dependency policy.

## Keep the data SHAPE

The sample data in this file mirrors the real database fields by name and shape.
When you add or change functionality:

- Reuse the existing field names and shapes. Do not rename or remove existing
  fields. Adding a field is fine.
- If your feature needs a field or list that does not exist yet, add it to the
  mock data AND record it in CHANGES.md under "Schema requests" so the hub team
  can add it to the real database.
- People are referenced by NAME in the UI. Do not invent your own user/login
  system or IDs. The hub maps names to real records on integration.

## Activity log (so we can read your changes)

Every meaningful action (create, update, delete, status change, assign, etc.)
must call the provided `logActivity(action, details)` stub. Namespace the action
`<app>.<entity>.<verb>`, for example `qa.build.status_changed` or
`devsupport.ticket.assigned`. Keep these calls when you add new actions. They are
how the hub team sees what your feature does and wires the real writes.

## Before you finish: divergence check (warn the teammate)

Before you wrap up, review your changes. If ANY of the following are true, list
them clearly at the top of your reply to the teammate AND in CHANGES.md, because
they will cause integration problems and the hub team needs to decide:

1. You added an npm library outside the approved set.
2. You added a database call, auth, routing, or any network request.
3. You renamed or removed an existing data field (adding is fine).
4. You introduced a color or font outside the brand floor.
5. You changed the root component's props or export shape.
6. You added a feature that clearly needs a new table or a secret/API key.

If none are true, say so. The goal is no surprises when the hub team re-translates.

## Always update CHANGES.md

At the end of every editing session, append an entry to CHANGES.md (newest on
top) using the template already in that file. This is the single most useful
thing you do for the hub team: it tells them exactly what changed.

## Data contract for THIS app

<!-- The hub team fills this in per app: the real tables/columns this screen maps
to, so edits stay aligned. Until filled, follow the field names already present
in the sample data. -->

- App namespace: `<app>`
- Real tables this screen maps to: `<table(s)>`
- Key fields: `<list the columns and types>`
- People fields (rendered by name, stored as employee IDs in the hub): `<list>`
