// Event log: three streams — activity (clicks), milestone (training journey),
// history (permanent company/HR record). Ported from the mockup's model.
import { TRAINEES, BROAD_TRAINEES } from "../data/trainees.js";
import { CATALOG } from "../data/catalog.js";
import { CURRENT_USER } from "../data/org.js";
import { dateRank, todayShort, shiftDate, startRank } from "./dates.js";
import { courseLessons, enrollDone } from "./courses.js";
import { vaStatus, isDeployed, masterCourse, masterDone } from "./status.js";

let EVENTS = [];
let _seq = 0;

export function getEvents() {
  return EVENTS;
}

function logEvent(va, o) {
  const date = o.date || todayShort();
  EVENTS.push({
    va,
    actor: o.actor || CURRENT_USER,
    channel: o.channel || "activity",
    action: o.action || "",
    detail: o.detail || "",
    title: o.title || "",
    icon: o.icon || "",
    color: o.color || "",
    ...o,
    date,
    rank: dateRank(date),
    seq: _seq++,
  });
}

export const ACT_TYPES = {
  enrolled: { icon: "Book", color: "#5b3b9c", verb: "enrolled in" },
  checked: { icon: "CheckSquare", color: "#145365", verb: "marked done" },
  unchecked: { icon: "Square", color: "#999", verb: "unchecked" },
  skill: { icon: "Award", color: "#a8650f", verb: "granted skill" },
  checklist: { icon: "ListChecks", color: "#0c6b5e", verb: "checked off" },
};

export function logActivity(va, actor, action, detail, date) {
  logEvent(va, { va, actor, channel: "activity", action, detail, date });
}

const MILE_PRESET = {
  started: { color: "#e1f5ee" },
  "to-ins": { color: "#e1f0f5" },
  "dev-complete": { color: "#e1f5ee" },
  "ins-complete": { color: "#e1f5ee" },
  "qaqc-pass": { color: "#e1f5ee" },
  completed: { color: "#e1f5ee" },
  failed: { color: "#fce8e8" },
  certified: { color: "#e1f5ee" },
  quiz: { color: "#e6f1fb" },
  exam: { color: "#e6f1fb" },
};
const HIST_PRESET = {
  certified: { color: "#e1f5ee" },
  deployed: { color: "#e1f5ee" },
  watch: { color: "#fef0e8" },
  fired: { color: "#fce8e8" },
  incident: { color: "#fce8e8" },
  reprofiled: { color: "#fef0e8" },
};

export function milestone(va, type, title, date) {
  const p = MILE_PRESET[type] || { color: "#eef0f2" };
  logEvent(va, { va, channel: "milestone", action: type, title, color: p.color, date, detail: "" });
}
export function historyEntry(va, type, title, date, by) {
  const p = HIST_PRESET[type] || { color: "#eef0f2" };
  logEvent(va, { va, channel: "history", action: type, title, color: p.color, date, actor: by || "", detail: "" });
}

export function eventsFor(va, channel) {
  return EVENTS.filter((e) => e.va === va && e.channel === channel).sort((a, b) => b.rank - a.rank || b.seq - a.seq);
}
export const vaActivity = (va) => eventsFor(va, "activity");
export const vaMilestones = (va) => eventsFor(va, "milestone");
export const vaHistory = (va) => eventsFor(va, "history");
export const allMilestones = () =>
  EVENTS.filter((e) => e.channel === "milestone").sort((a, b) => b.rank - a.rank || b.seq - a.seq);

// Seed the log from current VA state (runs once).
let _seeded = false;
export function seedLogs() {
  if (_seeded) return;
  _seeded = true;
  TRAINEES.forEach((t) => {
    const tr = t.devTrainer && t.devTrainer !== "—" ? t.devTrainer : (t.insTrainer && t.insTrainer !== "—" ? t.insTrainer : "Trainer");
    const itr = t.insTrainer && t.insTrainer !== "—" ? t.insTrainer : "Insurance Trainer";
    milestone(t.name, "started", `Started onsite training (${t.type === "combo" ? "Combo" : "Gen"})`, t.started);
    (t.enrollments || []).forEach((en) => {
      const c = CATALOG[en.course];
      if (!c) return;
      const who = c.category === "insurance" ? itr : tr;
      logActivity(t.name, who, "enrolled", c.name, shiftDate(t.started, 7));
      const lessons = courseLessons(en.course);
      en.completed.slice(0, 2).forEach((lid, li) => {
        const l = lessons.find((x) => x.id === lid);
        if (l) logActivity(t.name, who, "checked", l.name + " · " + c.name, shiftDate(t.started, 10 + li * 3));
      });
      if (enrollDone(en)) {
        const passed = t.type !== "combo" || t.quiz !== "failed";
        const doneDate = shiftDate(t.started, c.category === "crm" ? 42 : 28);
        milestone(t.name, passed ? "completed" : "failed", `${passed ? "Completed" : "Did not pass"} ${c.name}`, doneDate);
      }
    });
    if (t.type === "combo" && t.meetingsDone) {
      milestone(t.name, "quiz", `Post-meeting quiz · ${Math.min(85 + (startRank(t.started) % 12), 98)}%`, shiftDate(t.started, 20));
    }
    if (t.devComplete) milestone(t.name, "exam", "CRM module exam passed", shiftDate(t.started, 38));
    if (t.type === "combo") {
      if (t.devComplete) milestone(t.name, "dev-complete", "Dev side complete", shiftDate(t.started, 40));
      if (t.qaqcStage === "completed") milestone(t.name, "qaqc-pass", "Passed QAQC review", shiftDate(t.started, 48));
      if (t.devComplete) milestone(t.name, "to-ins", "Moved to Insurance training", shiftDate(t.started, 50));
    }
    if (t.insComplete) milestone(t.name, "ins-complete", "Insurance training complete", shiftDate(t.started, 70));
    if (masterDone(t)) {
      const cd = t.certifiedDate || shiftDate(t.started, 44);
      const mc = CATALOG[masterCourse(t)];
      milestone(t.name, "certified", `${mc ? mc.name : "Master course"} certified`, cd);
      historyEntry(t.name, "certified", `${mc ? mc.name : "Master course"} certification issued`, cd, "Training");
    }
    const st = vaStatus(t);
    if (st === "deployed") historyEntry(t.name, "deployed", `Deployed to ${t.agency}`, shiftDate(t.started, 80), "Fulfillment");
    if (st === "active-watch") historyEntry(t.name, "watch", "Placed on Active Watch", shiftDate(t.started, 60), t.tl);
    if (st === "fired") historyEntry(t.name, "fired", "Separated from company", shiftDate(t.started, 85), "HR");
    (t.manualSkills || []).forEach((s) => logActivity(t.name, s.by || CURRENT_USER, "skill", s.label, s.date || todayShort()));
  });
  const inc1 = TRAINEES.find((t) => vaStatus(t) === "active-watch");
  if (inc1) historyEntry(inc1.name, "incident", "Incident report filed · Attendance", shiftDate(inc1.started, 58), "HR");
  BROAD_TRAINEES.forEach((b) => {
    milestone(b.name, "started", "Started broad market training", b.started);
    (b.enrollments || []).forEach((en) => {
      const c = CATALOG[en.course];
      if (!c) return;
      logActivity(b.name, b.trainer, "enrolled", c.name, shiftDate(b.started, 5));
      if (enrollDone(en)) milestone(b.name, "completed", `Completed ${c.name}`, shiftDate(b.started, 30));
    });
    (b.checklist || []).filter((x) => x.done).forEach((x) => logActivity(b.name, b.trainer, "checklist", x.t, shiftDate(b.started, 10)));
  });
}
