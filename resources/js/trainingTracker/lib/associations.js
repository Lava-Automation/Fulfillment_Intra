// Synced-in association fields (Sales Rep, AM, TL, PM). In the real app these
// come from another system and are read-only here. Seeded once for the mock.
import { TRAINEES, BROAD_TRAINEES } from "../data/trainees.js";
import { TLS, PMS, DEV_TRAINERS, INS_TRAINERS } from "../data/org.js";

export const SALES_REPS = ["Johnny", "Celina", "Mike"];
const AMS = ["Cathy Reyes", "Mark Lim", "Dana Cruz", "Paolo Tan"];

let _done = false;
export function seedAssociations() {
  if (_done) return;
  _done = true;
  const pick = (arr, i) => arr[i % arr.length];

  TRAINEES.forEach((t, i) => {
    if (!t.salesRep) t.salesRep = pick(SALES_REPS, i);
    if (!t.am) t.am = pick(AMS, i + 1);
    if (!t.tl) t.tl = pick(TLS, i);
    // PM only on combos; strip from gens
    if (t.type === "gen") t.pm = null;
    else if (!t.pm) t.pm = pick(PMS, i);
  });

  BROAD_TRAINEES.forEach((b, i) => {
    if (!b.salesRep) b.salesRep = pick(SALES_REPS, i + 2);
    if (!b.am) b.am = pick(AMS, i);
    if (!b.tl) b.tl = pick(TLS, i + 2);
    b.pm = null; // no PM on broad
    // some broad VAs have a dev and/or ins trainer assigned; others left unassigned
    if (b.devTrainer === undefined) b.devTrainer = (i % 2 === 0) ? pick(DEV_TRAINERS, i) : "—";
    if (b.insTrainer === undefined) b.insTrainer = (i % 3 !== 0) ? pick(INS_TRAINERS, i) : "—";
  });
}

// distinct values present (for filter dropdowns), across trainees + broad
export function assocValues(field) {
  const s = new Set();
  [...TRAINEES, ...BROAD_TRAINEES].forEach((t) => {
    const v = t[field];
    if (v && v !== "—") s.add(v);
  });
  return [...s].sort();
}

// run immediately on import so association fields exist before first render
seedAssociations();

import { startRank } from "./dates.js";
import { allSkills } from "./panelData.js";

// generic filter: f is {field:value,...,sort}. Drops VAs lacking a filtered field.
export function passesAssoc(t, f) {
  const checks = ["tl", "am", "salesRep", "pm", "devTrainer", "insTrainer", "agency", "vtype"];
  for (const k of checks) {
    if (f[k] && f[k] !== "all") {
      if (k === "vtype") { if (t.type !== f[k]) return false; }
      else if ((t[k] || "—") !== f[k]) return false;
    }
  }
  if (f.skill && f.skill !== "all") {
    const s = allSkills(t);
    const has = Object.values(s).some((arr) => arr.some((x) => x.label === f.skill));
    if (!has) return false;
  }
  return true;
}

export function sortList(list, sort, pctFn) {
  const a = [...list];
  if (sort === "start") a.sort((x, y) => startRank(x.started) - startRank(y.started));
  else if (sort === "start-desc") a.sort((x, y) => startRank(y.started) - startRank(x.started));
  else if (sort === "name") a.sort((x, y) => x.name.localeCompare(y.name));
  else if (sort === "progress" && pctFn) a.sort((x, y) => pctFn(y) - pctFn(x));
  return a;
}
