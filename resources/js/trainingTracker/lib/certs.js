// Certificates registry + endorsement flags — ported from the mockup.
import { TRAINEES, BROAD_TRAINEES } from "../data/trainees.js";
import { CATALOG } from "../data/catalog.js";
import { CURRENT_USER } from "../data/org.js";
import { enrollDone, enrollPct } from "./courses.js";

// Course certs: cert-flagged courses a VA has completed (final exam = last lesson).
export function allCerts() {
  const out = [];
  TRAINEES.forEach((t) => {
    (t.enrollments || []).forEach((en) => {
      const c = CATALOG[en.course];
      if (!c || !c.cert) return;
      if (!enrollDone(en)) return;
      const revoked = (t.revokedCerts || []).includes(en.course);
      out.push({
        va: t.name,
        type: "course",
        label: c.name,
        course: en.course,
        date: t.certifiedDate || "—",
        by: c.category === "insurance" ? "Insurance Trainer" : "CRM Trainer",
        status: revoked ? "revoked" : "active",
      });
    });
  });
  BROAD_TRAINEES.forEach((b) => {
    (b.enrollments || []).forEach((en) => {
      const c = CATALOG[en.course];
      if (!c || !c.cert) return;
      if (!enrollDone(en)) return;
      out.push({ va: b.name, type: "course", label: c.name, course: en.course, date: "—", by: b.trainer, status: "active" });
    });
  });
  return out;
}

// Per-course enrollee roster (combo/gen + broad), with progress + status.
export function courseRoster(courseKey) {
  const out = [];
  const co = CATALOG[courseKey];
  const isCert = co && co.cert;
  TRAINEES.forEach((t) => {
    const en = (t.enrollments || []).find((e) => e.course === courseKey);
    if (!en) return;
    const done = enrollDone(en);
    const revoked = (t.revokedCerts || []).includes(courseKey);
    out.push({
      name: t.name,
      type: t.type,
      pct: enrollPct(en),
      status: done ? (isCert ? (revoked ? "revoked" : "certified") : "completed") : "in-progress",
      broad: false,
    });
  });
  BROAD_TRAINEES.forEach((b) => {
    const en = (b.enrollments || []).find((e) => e.course === courseKey);
    if (!en) return;
    const done = enrollDone(en);
    out.push({
      name: b.name,
      type: "broad",
      pct: enrollPct(en),
      status: done ? (isCert ? "certified" : "completed") : "in-progress",
      broad: true,
    });
  });
  return out;
}
export function courseCertCount(courseKey) {
  const co = CATALOG[courseKey];
  if (!co || !co.cert) return 0;
  return courseRoster(courseKey).filter((r) => r.status === "certified").length;
}

// ----- Endorsements (per-team flags) -----
export function isEndorsed(t) {
  return !!(t.endorse && ((t.endorse.crm && t.endorse.crm.on) || (t.endorse.ins && t.endorse.ins.on)));
}
export function isEndorsedTo(t, team) {
  return !!(t.endorse && t.endorse[team] && t.endorse[team].on);
}
export function endorseTeams(t) {
  const o = [];
  if (isEndorsedTo(t, "crm")) o.push("crm");
  if (isEndorsedTo(t, "ins")) o.push("ins");
  return o;
}
export function endorsedList(team) {
  return TRAINEES.filter((t) => isEndorsedTo(t, team));
}
export function setEndorse(t, team, by, synced) {
  if (!t.endorse) t.endorse = {};
  t.endorse[team] = {
    on: true,
    by: by || CURRENT_USER,
    date: "Jun 11",
    synced: !!synced,
    items: (t.endorse[team] && t.endorse[team].items) || [],
  };
}
export function endorseItems(t, team) {
  return (t.endorse && t.endorse[team] && t.endorse[team].items) || [];
}

// Seed the few endorsements (some synced from another dept, incl. deployed VAs).
let _endSeeded = false;
export function seedEndorsements() {
  if (_endSeeded) return;
  _endSeeded = true;
  const set = (name, team, by, synced, items) => {
    const t = TRAINEES.find((x) => x.name === name);
    if (!t) return;
    setEndorse(t, team, by, synced);
    t.endorse[team].items = items;
  };
  set("Parker Trainee", "ins", "Account Management", true, [
    { t: "New carrier appetite training", done: true },
    { t: "Endorsement workflow refresher", done: false },
    { t: "Shadow 5 renewals on new book", done: false },
  ]);
  set("Morgan Trainee", "crm", "Marky Pandatu", false, [
    { t: "Custom automation for client migration", done: true },
    { t: "Zapier multi-step rebuild", done: false },
  ]);
  set("Indigo Trainee", "ins", "Jonas Rosauro", false, [
    { t: "Retraining: policy servicing basics", done: false },
    { t: "Quoting tool one-off course", done: true },
  ]);
  set("Hayden Trainee", "crm", "Fulfillment Ops", true, [{ t: "CRM cleanup project", done: false }]);
}
