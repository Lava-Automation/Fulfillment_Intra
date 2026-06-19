# Your Lava app — sandbox

This folder is your app's screen, pulled out of the Lava hub as a standalone copy
you can edit freely. It runs on sample data and is not connected to the database.
Make the functionality and design changes you want here, then send the whole
folder back. The hub team reconnects it to the real data.

## What is in here

- `index.jsx` (or `App.jsx`) — your app, with sample data. This is what you edit.
- `CLAUDE.md` — the rules your Claude follows. Do not delete it. It keeps your
  edits consistent with the rest of the hub and flags anything that would cause
  problems when we merge your changes back.
- `CHANGES.md` — your edit log. Your Claude updates it each session.

## How to use it

1. Open this folder in Claude. It reads `CLAUDE.md` automatically and will build
   to the Lava rules (brand colors, Poppins/Monument, approved libraries only,
   real field names, activity-log calls).
2. Tell it what you want to change. Edit functionality and UI as much as you like.
3. When you are done, your Claude appends a `CHANGES.md` entry describing what
   changed and flags anything we need to review.

## Before you send it back (quick checklist)

- [ ] Still self-contained: no database, login, or new network calls added.
- [ ] Only approved libraries used: `lucide-react` for icons, `recharts` for charts.
- [ ] Brand floor kept: the Lava colors and fonts, inline styles, no TypeScript.
- [ ] People referenced by name (no invented login/IDs).
- [ ] New actions call `logActivity(...)`.
- [ ] `CHANGES.md` updated, with any "Schema requests" or "Divergence flags" noted.

## Sending it back

Send the whole folder (your file + `CHANGES.md`) to the hub team in Slack, same as
before. The `CHANGES.md` is what lets us update the live app quickly. If you need a
new field or table, you do not add a database. You just note it under "Schema
requests" and we add it on our side.
