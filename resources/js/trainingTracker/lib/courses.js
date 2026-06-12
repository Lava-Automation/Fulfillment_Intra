// Course / module / lesson / enrollment helpers — ported from the mockup.
import { CATALOG } from "../data/catalog.js";

export function courseLessons(courseKey) {
  const c = CATALOG[courseKey];
  if (!c) return [];
  const out = [];
  c.modules.forEach((m) =>
    (m.lessons || []).forEach((l) => out.push({ moduleId: m.id, moduleName: m.name, ...l }))
  );
  return out;
}
export function courseLessonCount(courseKey) {
  return courseLessons(courseKey).length;
}
export function enrollPct(en) {
  const ls = courseLessons(en.course);
  if (!ls.length) return 0;
  const valid = en.completed.filter((id) => ls.some((l) => l.id === id));
  return Math.round((valid.length / ls.length) * 100);
}
export function enrollDone(en) {
  const ls = courseLessons(en.course);
  if (!ls.length) return false;
  return ls.every((l) => en.completed.includes(l.id));
}
export function enrollDoneCount(en) {
  const ls = courseLessons(en.course);
  return ls.filter((l) => en.completed.includes(l.id)).length;
}
export function moduleDone(en, m) {
  return m.lessons.length > 0 && m.lessons.every((l) => en.completed.includes(l.id));
}
export function moduleDoneCount(en, m) {
  return m.lessons.filter((l) => en.completed.includes(l.id)).length;
}
export function mainEnrollment(t) {
  return (t.enrollments || []).find((e) => CATALOG[e.course] && CATALOG[e.course].category === "crm");
}
export function insEnrollment(t) {
  return (t.enrollments || []).find((e) => CATALOG[e.course] && CATALOG[e.course].category === "insurance");
}
export function enrollmentsByCat(t, cat) {
  return (t.enrollments || []).filter((e) => CATALOG[e.course] && CATALOG[e.course].category === cat);
}
export function enrollCount(courseKey, trainees) {
  return trainees.filter((t) => (t.enrollments || []).some((e) => e.course === courseKey)).length;
}

import { CAT_META } from "../data/catalog.js";
// course chips for a card (own-category courses + "+N more" for general/oneoff)
export function courseChips(t, side) {
  const sideCats = side === "crm" ? ["crm"] : ["insurance"];
  const own = (t.enrollments || []).filter((e) => CATALOG[e.course] && sideCats.includes(CATALOG[e.course].category));
  const others = (t.enrollments || []).filter((e) => CATALOG[e.course] && ["general", "oneoff"].includes(CATALOG[e.course].category));
  const chips = own.map((e) => {
    const c = CATALOG[e.course];
    const m = CAT_META[c.category] || {};
    return { name: c.name, pct: enrollPct(e), done: enrollDone(e), bg: m.chipBg || "#eef0f2", fg: m.chipFg || "#555" };
  });
  return { chips, moreCount: others.length };
}
