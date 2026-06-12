// Per-VA notes & uploads stores + skill derivation. In-memory for the mock.
import { CATALOG, SKILL_GROUPS } from "../data/catalog.js";
import { enrollDone } from "./courses.js";

const NOTES = {};
const UPLOADS = {};

export function getNotes(name) {
  return NOTES[name] || [];
}
export function addNote(name, note) {
  if (!NOTES[name]) NOTES[name] = [];
  NOTES[name].unshift(note);
}
export function getUploads(name) {
  return UPLOADS[name] || [];
}
export function addUpload(name, up) {
  if (!UPLOADS[name]) UPLOADS[name] = [];
  UPLOADS[name].unshift(up);
}

export function skillGroup(catId) {
  return SKILL_GROUPS.find((g) => g.id === catId) || SKILL_GROUPS[0];
}
export function skillsInGroup(catId) {
  const g = skillGroup(catId);
  return g.skills || [];
}

// Derive auto skills — matches the mockup (legacy crm/ins arrays + course.skill).
export function deriveSkills(t) {
  const buckets = {};
  SKILL_GROUPS.forEach((g) => (buckets[g.id] = []));
  const push = (gid, label) => {
    if (!buckets[gid]) buckets[gid] = [];
    buckets[gid].push(label);
  };
  if (t.crm) {
    if (t.crm.includes(1) || t.crm.includes(2)) push("crm", "Cognito Forms");
    if (t.crm.includes(3) || t.crm.includes(4)) push("crm", "AgencyZoom");
    if (t.crm.includes(5) || t.crm.includes(6)) push("crm", "Zapier");
  }
  if (t.ins) {
    if (t.ins.includes(1)) push("ins", "Policy Basics");
    if (t.ins.includes(2)) push("ins", "Servicing");
    if (t.ins.includes(3)) push("ins", "Client Comms");
  }
  (t.enrollments || []).forEach((en) => {
    const c = CATALOG[en.course];
    if (!c) return;
    if (c.category === "oneoff" && (en.completed || []).length) {
      if (en.course === "ams-ezlynx") push("ams", "EZLynx");
      else if (en.course === "ams-hawksoft") push("ams", "Hawksoft");
    }
    if (c.skill && c.skill.name && enrollDone(en)) push(c.skill.cat, c.skill.name);
  });
  const out = {};
  Object.keys(buckets).forEach((gid) => {
    out[gid] = [...new Set(buckets[gid])].map((s) => ({ label: s, auto: true }));
  });
  return out;
}
export function allSkills(t) {
  const d = deriveSkills(t);
  (t.manualSkills || []).forEach((m) => {
    if (!d[m.cat]) d[m.cat] = [];
    d[m.cat].push({ label: m.label, auto: false, by: m.by || null, date: m.date || null });
  });
  return d;
}
