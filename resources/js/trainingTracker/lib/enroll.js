// Enrollment actions — ported from the mockup.
import { CATALOG } from "../data/catalog.js";
import { AUTO_ENROLL } from "../data/autoEnroll.js";
import { CURRENT_USER } from "../data/org.js";
import { courseLessons } from "./courses.js";
import { logActivity } from "./events.js";

export function enrollVAInCourse(t, k) {
  if (!t.enrollments) t.enrollments = [];
  if (t.enrollments.some((e) => e.course === k)) return false;
  t.enrollments.push({ course: k, completed: [], active: (courseLessons(k)[0] || {}).id || null });
  logActivity(t.name, CURRENT_USER, "enrolled", CATALOG[k] ? CATALOG[k].name : k);
  return true;
}

export function applyAutoEnroll(t) {
  const set = (AUTO_ENROLL.defaults && AUTO_ENROLL.defaults[t.type]) || [];
  let added = 0;
  set.forEach((k) => {
    if (CATALOG[k] && enrollVAInCourse(t, k)) added++;
  });
  return added;
}

// status badge styling
export function statusBadge(s) {
  const map = {
    "in-training": ["#e6f1fb", "#185fa5", "In Training"],
    deployed: ["#e1f5ee", "#0f6e56", "Deployed"],
    "active-watch": ["#fdf0e6", "#a8650f", "Active Watch"],
    fired: ["#fce8e8", "#a32d2d", "Fired"],
  };
  const [bg, fg, label] = map[s] || map["in-training"];
  return { bg, fg, label };
}
