/*
  Lava Trainer Workload Dashboard
  ────────────────────────────────────────────────────────────────────────────
  App 22 — Training · Fulfillment
  Owner: Guila Rose Rubis (6c082813-9f75-4d3f-a9e7-470e206f1288)
  Pairs with: App 21 — CRM Training Curriculum Tracker (module catalog source)

  Sits on the Lava spine. Does NOT own auth, identity, or directory data —
  those live on the spine and are mirrored here.

  TRACKS: two training tracks share this app —
    crm        CRM Development (Combo - Full Build / Combo - Replacement)
    insurance  Insurance (Insurance - New Hire / Insurance - Cross-Train)

  READS (from spine):
    employees            trainer roster (department = Fulfillment)
    role_grants          access control, enforced by RLS
    training.modules     module/topic catalog (owned by App 21)
    training.enrollments active trainee placements + trainee_type + track
    training.schedule    per-type session templates (day/time/module/trainer)

  WRITES (to spine, activity_log is append-only — no updates, no deletes):
    training.trainer.reassigned    a session moved to another trainer
    training.session.evaluated     a trainer recorded a session evaluation
    training.va.endorsed_qaqc      a Full-Build VA endorsed to QAQC
    training.va.endorsed_insurance a Replacement VA endorsed to the Insurance team

  SECURITY (SOC 2):
    - Supabase anon key only in this bundle. No service-role key.
    - RLS enforces scope. The "Viewing as" switcher is DEV-ONLY preview; in
      production the row-level policies decide what each user sees:
        * Lead: all trainees/trainers on their track, reassign + endorse allowed.
        * Trainer: their own assigned sessions, may record evaluations.
        * VA (employee): ONLY their own schedule (read-only). The client-side
          isVA scoping here mirrors what RLS returns; it is not the enforcement.
    - Endorsement is gated to the final program day (Day 10 Full Build /
      Day 6 Replacement) in the UI; the spine should re-check server-side.
    - No Anthropic/LLM calls from this client. Proxy through the spine.

  INTEGRATION SEAMS:
    TRAINERS / TEMPLATES / TRAINEES below are MOCK data from the uploaded
    Trainer Workload Calendar + employee roster. Replace each with the spine
    queries noted inline (see // SPINE: comments) once wired.
  ────────────────────────────────────────────────────────────────────────────
*/

import { useState, useEffect } from "react";
// SPINE: import { supabase } from "./lib/supabaseClient";
// SPINE: import { useSession } from "./lib/useSession";

// Append-only write to the spine activity_log. Replace the stub body with the
// real insert once the Supabase client is wired. Never updates or deletes.
async function logActivity(action, details) {
  // SPINE:
  // const { data: { user } } = await supabase.auth.getUser();
  // await supabase.from("activity_log").insert({
  //   actor: user?.id, app: "22_trainer_workload", action, ...details,
  // });
  if (typeof console !== "undefined") console.log("[activity_log]", action, details);
}

const B = {
  RED: "#E73835", DARK: "#24242D", TEAL: "#145365",
  WHITE: "#FFFFFF", BLACK: "#1B120B",
  PAPER: "#F4F0EA",
  SURFACE: "#F4F0EA", BORDER: "#E3DDD5", BORDER2: "#CEC5BA", MUTED: "#746D66", INK2: "#463F3A",
  TRACK: "#EFEAE4",
  DONE_BG: "#F1EDE6", DONE_BORDER: "#DCD6CC",
  LIVE_BG: "#FCEAEA",
  SHADOW: "0 10px 26px rgba(27,18,11,.07)", SHADOW_LG: "0 18px 45px rgba(27,18,11,.12)",
  PAGE_BG: "radial-gradient(circle at 92% 0%, rgba(231,56,53,.13), transparent 34%), radial-gradient(circle at 8% 12%, rgba(20,83,101,.08), transparent 26%), linear-gradient(135deg,#FBFAF8 0%,#F3EEE8 100%)",
};

// SPINE: const { data: trainers } = await supabase.from("employees").select("*").eq("department","Fulfillment");
const TRAINERS = {
  guila:  { id: "6c082813-9f75-4d3f-a9e7-470e206f1288", name: "Guila Rose Rubis",     role: "CRM Dev Training Lead", initials: "GR", color: B.WHITE, bg: B.TEAL,  pillBg: "#E1ECEF", pillText: "#0E3D4A" },
  elijah: { id: "3e80abb0-e429-49a4-b00e-7dac131fccbe", name: "Elijah Jan Bautista",  role: "CRM Development Trainer", initials: "EJ", color: B.WHITE, bg: B.DARK,  pillBg: "#E8E8EB", pillText: "#3A3A45" },
  ray:    { id: "2ff636ca-ee99-4d80-ba7d-336473dcfb3c", name: "Ray Patrick Patlonag", role: "CRM Development Trainer", initials: "RP", color: B.WHITE, bg: B.RED,   pillBg: "#FBE3E3", pillText: "#A32420" },
  // Insurance track (test content)
  ins_grace: { id: "ins-0001", name: "Jonas Rosauro", role: "Insurance Training Lead", initials: "JR", color: B.WHITE, bg: B.TEAL, pillBg: "#E1ECEF", pillText: "#0E3D4A" },
  ins_paolo: { id: "ins-0002", name: "Leo Maboloc",  role: "Insurance Trainer",       initials: "LM", color: B.WHITE, bg: B.DARK, pillBg: "#E8E8EB", pillText: "#3A3A45" },
  ins_nadia: { id: "ins-0003", name: "Au Sagarino",    role: "Insurance Trainer",       initials: "AS", color: B.WHITE, bg: B.RED,  pillBg: "#FBE3E3", pillText: "#A32420" },
  any:    { id: null, name: "Any trainer available", role: "", initials: "—", color: B.MUTED, bg: "#EAEAE8", pillBg: "#EAEAE8", pillText: "#444441" },
};

const TRACKS = {
  crm:       { label: "CRM Development", sub: "CRM Development Training · Fulfillment", leadKey: "guila",     trainerKeys: ["guila", "elijah", "ray"],          types: ["Combo - Full Build", "Combo - Replacement"] },
  insurance: { label: "Insurance",       sub: "Insurance Training · Fulfillment",       leadKey: "ins_grace", trainerKeys: ["ins_grace", "ins_paolo", "ins_nadia"], types: ["Insurance - New Hire", "Insurance - Cross-Train"] },
};

// SPINE: const { data: templates } = await supabase.from("training.schedule").select("*");  // keyed by trainee_type
const TEMPLATES = {
  "Combo - Full Build": [
    { week: 1, day: "Day 1",  weekday: "Monday",    sessions: [
      { time: "9:00am–1:00pm",  module: "Combo Orientation",                                       activity: "",                                              trainers: ["guila"] },
      { time: "1:30–3:00pm",    module: "Pre-training Topics",                                      activity: "",                                              trainers: ["guila"] },
    ]},
    { week: 1, day: "Day 2",  weekday: "Tuesday",   sessions: [
      { time: "2:30–3:30pm",    module: "Module 1: Form Automation & Its Role + Deep Dive: Forms",  activity: "Form template import and adjustments",          trainers: ["guila"] },
    ]},
    { week: 1, day: "Day 3",  weekday: "Wednesday", sessions: [
      { time: "11:00am–12:00pm", module: "Module 2: Setting Up the CRM (AgencyZoom)",               activity: "Pipeline & stage setup, automation import",     trainers: ["elijah"] },
    ]},
    { week: 1, day: "Day 4",  weekday: "Thursday",  sessions: [
      { time: "11:00am–12:00pm", module: "Module 2.1: Updating & Refining CRM Templates",           activity: "Automation updates (hyperlinks), Google Review setup", trainers: ["elijah"] },
    ]},
    { week: 1, day: "Day 5",  weekday: "Friday",    sessions: [
      { time: "1:30–3:30pm",    module: "Deep Dive: Sales and Service",                             activity: "",                                              trainers: ["elijah", "ray"] },
    ]},
    { week: 2, day: "Day 6",  weekday: "Monday",    sessions: [
      { time: "11:00am–12:00pm", module: "Module 3: Creating Zapier Automations",                   activity: "Fast app zap building",                         trainers: ["ray"] },
    ]},
    { week: 2, day: "Day 7",  weekday: "Tuesday",   sessions: [
      { time: "11:00am–12:00pm", module: "Module 3.1: Importing & Updating Zapier Templates",       activity: "Quote and service zaps import and updating",    trainers: ["ray"] },
    ]},
    { week: 2, day: "Day 8",  weekday: "Wednesday", sessions: [
      { time: "11:00am–12:00pm", module: "Module 4: Testing, troubleshooting & final adjustments",  activity: "Full build testing and troubleshooting",        trainers: ["ray"] },
      { time: "1:30–2:30pm",    module: "Tool Build Activity",                                      activity: "Mini build creation",                           trainers: ["ray"] },
    ]},
    { week: 2, day: "Day 9",  weekday: "Thursday",  sessions: [
      { time: "2:30–3:30pm",    module: "Mock Call Training",                                       activity: "Mock call",                                     trainers: ["guila"] },
    ]},
    { week: 2, day: "Day 10", weekday: "Friday",    sessions: [
      { time: "9:30–10:00am",   module: "QAQC / Dev Endorsement",                                   activity: "",                                              trainers: ["guila"] },
      { time: "10:00–10:30am",  module: "Exam Orientation",                                         activity: "Final examination",                             trainers: ["any"] },
    ]},
  ],
  "Combo - Replacement": [
    { week: 1, day: "Day 1", weekday: "Monday",     sessions: [
      { time: "9:00am–1:00pm",  module: "Combo Orientation",                                        activity: "",                                              trainers: ["guila"] },
      { time: "1:30–3:00pm",    module: "Pre-training Topics",                                       activity: "",                                              trainers: ["guila"] },
    ]},
    { week: 1, day: "Day 2", weekday: "Tuesday",    sessions: [
      { time: "2:30–3:30pm",    module: "Module 1: Form Automation & Its Role + Deep Dive: Forms",   activity: "Form template import and adjustments",          trainers: ["guila"] },
    ]},
    { week: 1, day: "Day 3", weekday: "Wednesday",  sessions: [
      { time: "11:00am–12:00pm", module: "Module 2 + Module 2.1: Setting Up & Refining the CRM",     activity: "Pipeline & stage setup, automation import",     trainers: ["elijah"] },
    ]},
    { week: 1, day: "Day 4", weekday: "Thursday",   sessions: [
      { time: "11:00am–12:00pm", module: "Module 3 + Module 3.1: Zapier Automations",               activity: "",                                              trainers: ["ray"] },
      { time: "2:30–3:00pm",    module: "Tool Build Activity",                                       activity: "Mini build creation",                           trainers: ["ray"] },
    ]},
    { week: 1, day: "Day 5", weekday: "Friday",     sessions: [
      { time: "1:30–3:30pm",    module: "Deep Dive: Sales and Service",                              activity: "",                                              trainers: ["elijah", "ray"] },
      { time: "3:30–4:00pm",    module: "Mock Call Training",                                        activity: "Mock call",                                     trainers: ["guila"] },
    ]},
    { week: 2, day: "Day 6", weekday: "Monday",     sessions: [
      { time: "10:00–10:30am",  module: "Exam Orientation",                                          activity: "Final examination",                             trainers: ["any"] },
    ]},
  ],
  "Insurance - New Hire": [
    { week: 1, day: "Day 1", weekday: "Monday",    sessions: [
      { time: "9:00–11:00am",  module: "Insurance Fundamentals + Orientation",            activity: "Industry overview, terminology",        trainers: ["ins_grace"] },
    ]},
    { week: 1, day: "Day 2", weekday: "Tuesday",   sessions: [
      { time: "10:00–11:30am", module: "Policy Types & Coverage Basics",                  activity: "Auto, home, umbrella walkthrough",      trainers: ["ins_paolo"] },
    ]},
    { week: 1, day: "Day 3", weekday: "Wednesday", sessions: [
      { time: "10:00–11:30am", module: "Personal Lines: Auto",                            activity: "Coverage parts, limits",                trainers: ["ins_paolo"] },
    ]},
    { week: 1, day: "Day 4", weekday: "Thursday",  sessions: [
      { time: "10:00–11:30am", module: "Personal Lines: Home & Property",                 activity: "Dwelling, contents, liability",         trainers: ["ins_paolo"] },
    ]},
    { week: 1, day: "Day 5", weekday: "Friday",    sessions: [
      { time: "1:00–3:00pm",   module: "Deep Dive: Personal Lines",                       activity: "",                                      trainers: ["ins_paolo", "ins_nadia"] },
    ]},
    { week: 2, day: "Day 6", weekday: "Monday",    sessions: [
      { time: "10:00–11:30am", module: "Quoting & Rating",                                activity: "Quote build practice",                  trainers: ["ins_paolo"] },
    ]},
    { week: 2, day: "Day 7", weekday: "Tuesday",   sessions: [
      { time: "10:00–11:30am", module: "Carrier Portals & Submissions",                   activity: "Portal navigation, submission flow",    trainers: ["ins_nadia"] },
    ]},
    { week: 2, day: "Day 8", weekday: "Wednesday", sessions: [
      { time: "10:00–11:30am", module: "Endorsements & Renewals",                         activity: "Mid-term changes, renewal processing",  trainers: ["ins_nadia"] },
    ]},
    { week: 2, day: "Day 9", weekday: "Thursday",  sessions: [
      { time: "10:00–11:30am", module: "Claims Intake & FNOL",                            activity: "Claims scenario walk-through",          trainers: ["ins_nadia"] },
    ]},
    { week: 2, day: "Day 10", weekday: "Friday",   sessions: [
      { time: "1:00–3:00pm",   module: "Deep Dive: Commercial Lines",                     activity: "",                                      trainers: ["ins_paolo", "ins_nadia"] },
    ]},
    { week: 3, day: "Day 11", weekday: "Monday",   sessions: [
      { time: "10:00–11:30am", module: "Compliance & E&O",                                activity: "",                                      trainers: ["ins_grace"] },
    ]},
    { week: 3, day: "Day 12", weekday: "Tuesday",  sessions: [
      { time: "10:00–11:30am", module: "Customer Service & Retention",                    activity: "Service standards, retention plays",    trainers: ["ins_grace"] },
    ]},
    { week: 3, day: "Day 13", weekday: "Wednesday", sessions: [
      { time: "10:00–11:30am", module: "Tools & Workflow Automation",                     activity: "Tool build activity",                   trainers: ["ins_nadia"] },
    ]},
    { week: 3, day: "Day 14", weekday: "Thursday",  sessions: [
      { time: "2:00–3:30pm",   module: "Mock Call Training",                              activity: "Mock call",                             trainers: ["ins_grace"] },
    ]},
    { week: 3, day: "Day 15", weekday: "Friday",   sessions: [
      { time: "9:30–10:00am",  module: "QAQC / Dev Endorsement",                          activity: "",                                      trainers: ["ins_grace"] },
      { time: "10:00–10:30am", module: "Exam Orientation",                                activity: "Final examination",                     trainers: ["any"] },
    ]},
  ],
  "Insurance - Cross-Train": [
    { week: 1, day: "Day 1", weekday: "Monday",    sessions: [
      { time: "9:00–10:30am",  module: "Cross-Train Orientation + Policy Refresher",      activity: "",                                      trainers: ["ins_grace"] },
    ]},
    { week: 1, day: "Day 2", weekday: "Tuesday",   sessions: [
      { time: "10:00–11:30am", module: "Quoting & Rating Refresher",                      activity: "Quote build practice",                  trainers: ["ins_paolo"] },
    ]},
    { week: 1, day: "Day 3", weekday: "Wednesday", sessions: [
      { time: "10:00–11:30am", module: "Carrier Portals + Endorsements",                  activity: "",                                      trainers: ["ins_nadia"] },
    ]},
    { week: 1, day: "Day 4", weekday: "Thursday",  sessions: [
      { time: "10:00–11:30am", module: "Claims Intake & FNOL",                            activity: "Claims scenario walk-through",          trainers: ["ins_nadia"] },
      { time: "1:30–2:30pm",   module: "Compliance & E&O",                                activity: "",                                      trainers: ["ins_grace"] },
    ]},
    { week: 1, day: "Day 5", weekday: "Friday",    sessions: [
      { time: "1:00–3:00pm",   module: "Deep Dive: Personal Lines",                       activity: "",                                      trainers: ["ins_paolo", "ins_nadia"] },
      { time: "3:00–3:30pm",   module: "Mock Call Training",                              activity: "Mock call",                             trainers: ["ins_grace"] },
      { time: "3:30–4:00pm",   module: "Exam Orientation",                                activity: "Final examination",                     trainers: ["any"] },
    ]},
  ],
};

// SPINE: const { data: trainees } = await supabase.from("training.enrollments").select("*").eq("status","active");  // includes track + trainee_type
const TRAINEES = [
  { id: "claire", name: "Claire Celeste", initials: "CC", agency: "Ramey King Insurance Agency", startDate: new Date(2026, 5, 1), start: "Mon Jun 1, 2026", type: "Combo - Replacement", track: "crm" },
  { id: "ronald", name: "Ronald Sy Jr.",  initials: "RS", agency: "Reilly Insurance LLC",        startDate: new Date(2026, 5, 8), start: "Mon Jun 8, 2026", type: "Combo - Full Build",  track: "crm" },
  { id: "sofia",  name: "Sofia Lim",      initials: "SL", agency: "Coastal Insurance Group",     startDate: new Date(2026, 5, 1), start: "Mon Jun 1, 2026", type: "Insurance - New Hire",    track: "insurance" },
  { id: "diego",  name: "Diego Cruz",     initials: "DC", agency: "Summit Risk Partners",        startDate: new Date(2026, 5, 8), start: "Mon Jun 8, 2026", type: "Insurance - Cross-Train", track: "insurance" },
];

const TYPE_TOKENS = {
  "Combo - Full Build":  { bg: "#E1ECEF", text: "#0E3D4A" },
  "Combo - Replacement": { bg: "#FBE3E3", text: "#A32420" },
  "Insurance - New Hire":    { bg: "#E1ECEF", text: "#0E3D4A" },
  "Insurance - Cross-Train": { bg: "#FBE3E3", text: "#A32420" },
};

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MO = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
function fmtTime(d) { let h = d.getHours(), m = d.getMinutes(); const ap = h >= 12 ? "PM" : "AM"; h = h % 12; if (h === 0) h = 12; return `${h}:${String(m).padStart(2, "0")} ${ap}`; }
function fmtDate(d) { return `${WD[d.getDay()]}, ${MO[d.getMonth()]} ${d.getDate()}`; }
const pad2 = (n) => String(n).padStart(2, "0");
function dateInputValue(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function timeInputValue(d) { return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; }
// Where a VA is endorsed to after training, by trainee type.
function endorseTarget(type) { return type === "Combo - Replacement" ? "Insurance team" : "QAQC"; }
const RATING_META = { needs_work: { label: "Needs work", tone: "amber" }, on_track: { label: "On track", tone: "teal" }, excellent: { label: "Excellent", tone: "green" } };
function parseClock(str, fb) { const m = str.trim().match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i); let h = +m[1], mn = +m[2]; const mer = (m[3] || fb || "").toLowerCase(); if (mer === "pm" && h < 12) h += 12; if (mer === "am" && h === 12) h = 0; return h * 60 + mn; }
function parseRange(r) { const [a, b] = r.split("–"); const endMer = (b.match(/(am|pm)/i) || [])[0]; const endMin = parseClock(b, endMer); let startMin = parseClock(a, endMer); if (startMin > endMin) startMin = parseClock(a, "am"); return { startMin, endMin }; }
function trainingDate(start, idx) { const d = new Date(start.getFullYear(), start.getMonth(), start.getDate()); let added = 0; while (added < idx) { d.setDate(d.getDate() + 1); const wd = d.getDay(); if (wd !== 0 && wd !== 6) added++; } return d; }

const INSTANCES = [];
let _id = 0;
TRAINEES.forEach(tr => {
  TEMPLATES[tr.type].forEach((d, di) => {
    const dayDate = trainingDate(tr.startDate, di);
    d.sessions.forEach(s => {
      const { startMin, endMin } = parseRange(s.time);
      const start = new Date(dayDate); start.setHours(0, 0, 0, 0); start.setMinutes(startMin);
      const end = new Date(dayDate); end.setHours(0, 0, 0, 0); end.setMinutes(endMin);
      INSTANCES.push({ id: `inst-${_id++}`, trainee: tr.name, traineeId: tr.id, traineeType: tr.type, track: tr.track, baseTrainers: s.trainers, module: s.module, activity: s.activity, week: d.week, dayLabel: d.day, weekday: d.weekday, date: dayDate, start, end, time: s.time });
    });
  });
});
INSTANCES.sort((a, b) => a.start - b.start);
const SCHED_START = new Date(Math.min(...INSTANCES.map(i => i.start.getTime())));
const SCHED_END = new Date(Math.max(...INSTANCES.map(i => i.end.getTime())));
const TOTAL_MIN = Math.round((SCHED_END - SCHED_START) / 60000);

function trainerStatus(key, now, insts) {
  const mine = insts.filter(i => i.trainers.includes(key));
  const live = mine.find(i => now >= i.start && now < i.end);
  if (live) return { state: "in_meeting", live };
  const nextToday = mine.filter(i => sameDay(i.date, now) && i.start > now).sort((a, b) => a.start - b.start)[0];
  return { state: "available", nextToday };
}
function traineeStatus(tr, now, insts) {
  const mine = insts.filter(i => i.traineeId === tr.id).sort((a, b) => a.start - b.start);
  const live = mine.find(i => now >= i.start && now < i.end);
  if (live) return { state: "in_class", live };
  if (now < mine[0].start) return { state: "not_started", next: mine[0] };
  if (now >= mine[mine.length - 1].end) return { state: "done" };
  const todays = mine.filter(i => sameDay(i.date, now));
  const next = todays.find(i => i.start > now);
  if (next) return { state: "today", next };
  if (todays.length) return { state: "done_today" };
  return { state: "break" };
}

function Avatar({ initials, color, bg, size = 32 }) {
  return <div style={{ width: size, height: size, borderRadius: "50%", background: bg, color, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.34, fontWeight: 500 }}>{initials}</div>;
}
const TONES = { red: { bg: "#FBE3E3", c: "#A32420" }, green: { bg: "#E1ECEF", c: "#0E3D4A" }, teal: { bg: "#E1ECEF", c: "#0E3D4A" }, amber: { bg: "#E8E8EB", c: "#3A3A45" }, gray: { bg: "#EAEAE8", c: "#444441" } };
function Pill({ label, tone, dot }) { const t = TONES[tone]; return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", padding: "3px 9px", borderRadius: 999, background: t.bg, color: t.c }}>{dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: t.c }} />}{label}</span>; }
function TrainerPills({ keys }) { return <span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>{keys.map(k => { const t = TRAINERS[k]; return <span key={k} style={{ fontSize: 10, fontWeight: 500, padding: "2px 7px", borderRadius: 10, background: t.pillBg, color: t.pillText }}>{t.name}</span>; })}</span>; }
function TypeBadge({ type }) { const t = TYPE_TOKENS[type]; return <span style={{ fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 10, background: t.bg, color: t.text }}>{type.replace("Combo - ", "")}</span>; }
const IconList = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ display: "block" }}><line x1="8" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="20" y2="12" /><line x1="8" y1="18" x2="20" y2="18" /><line x1="3.5" y1="6" x2="3.51" y2="6" /><line x1="3.5" y1="12" x2="3.51" y2="12" /><line x1="3.5" y1="18" x2="3.51" y2="18" /></svg>);
const IconCalendar = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ display: "block" }}><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>);
const IconX = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ display: "block" }}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>);
function MetricCard({ label, value, sub }) { const str = String(value); const fs = str.length <= 3 ? 30 : str.length <= 6 ? 23 : str.length <= 10 ? 18 : 15; return <div style={{ position: "relative", overflow: "hidden", background: B.WHITE, border: `1px solid ${B.BORDER}`, borderRadius: 16, padding: "20px 18px 16px", flex: 1, minWidth: 0, boxShadow: B.SHADOW }}><div style={{ position: "absolute", left: 0, top: 0, width: "100%", height: 5, background: B.RED }} /><div style={{ fontSize: fs, fontWeight: 800, letterSpacing: "-0.02em", color: B.BLACK, lineHeight: 1.08, wordBreak: "break-word" }}>{value}</div><div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: B.INK2, marginTop: 10 }}>{label}</div>{sub && <div style={{ fontSize: 11, color: B.MUTED, marginTop: 4 }}>{sub}</div>}</div>; }

function SessionTile({ i, now }) {
  const live = now >= i.start && now < i.end;
  const done = now >= i.end;
  const tr = TRAINEES.find(t => t.id === i.traineeId);
  return (
    <div style={{ border: `1px solid ${live ? B.RED : done ? B.DONE_BORDER : B.BORDER}`, background: live ? B.LIVE_BG : done ? B.DONE_BG : B.WHITE, borderRadius: 10, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 500, color: B.BLACK }}>{fmtTime(i.start)} – {fmtTime(i.end)}</span>
        {live ? <Pill label="Live" tone="red" dot /> : done ? <Pill label="Done" tone="gray" /> : <Pill label="Upcoming" tone="teal" />}
      </div>
      <div style={{ fontSize: 10, color: B.MUTED, marginBottom: 6 }}>{i.dayLabel} · {i.weekday}</div>
      <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 6 }}>{i.module}</div>
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <Avatar initials={tr.initials} color={TYPE_TOKENS[i.traineeType].text} bg={TYPE_TOKENS[i.traineeType].bg} size={18} />
        <span style={{ fontSize: 10, color: B.MUTED }}>{i.trainee}</span>
      </div>
      <div style={{ marginTop: 6 }}><TrainerPills keys={i.trainers} /></div>
    </div>
  );
}

function SessionRow({ i, now, load, recommended, assignable, avail, isReassigning, onToggle, onPick, readOnly, evaluation, onSaveEval, hideDay }) {
  const live = now >= i.start && now < i.end;
  const done = now >= i.end;
  const tr = TRAINEES.find(t => t.id === i.traineeId);
  const [evalOpen, setEvalOpen] = useState(false);
  const [draftRating, setDraftRating] = useState(evaluation ? evaluation.rating : "");
  const [draftNote, setDraftNote] = useState(evaluation ? evaluation.note : "");
  const RATINGS = [
    { key: "needs_work", label: "Needs work", tone: "amber" },
    { key: "on_track",   label: "On track",   tone: "teal" },
    { key: "excellent",  label: "Excellent",  tone: "green" },
  ];
  const canEval = !readOnly && !!onSaveEval;
  function openEval() { setDraftRating(evaluation ? evaluation.rating : ""); setDraftNote(evaluation ? evaluation.note : ""); setEvalOpen(o => !o); }
  function saveEval() { onSaveEval(i, { rating: draftRating, note: draftNote.trim() }); setEvalOpen(false); }
  return (
    <div style={{ border: `1px solid ${live ? B.RED : done ? B.DONE_BORDER : B.BORDER}`, background: live ? B.LIVE_BG : done ? B.DONE_BG : B.WHITE, borderRadius: 10, marginBottom: 8, padding: "12px 14px" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div onClick={canEval ? openEval : undefined} style={{ minWidth: 124, fontSize: 11, color: B.MUTED, cursor: canEval ? "pointer" : "default" }}>
          <div style={{ fontWeight: 500, color: B.BLACK, fontSize: 12 }}>{fmtTime(i.start)} – {fmtTime(i.end)}</div>
          {!hideDay && <div>{i.dayLabel} · {i.weekday}</div>}
        </div>
        <div onClick={canEval ? openEval : undefined} style={{ flex: 1, cursor: canEval ? "pointer" : "default" }}>
          <div style={{ fontSize: 13, marginBottom: 4 }}>{i.module}</div>
          {i.activity && <div style={{ fontSize: 10, color: B.MUTED, marginBottom: 6 }}>{i.activity}</div>}
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <Avatar initials={tr.initials} color={TYPE_TOKENS[i.traineeType].text} bg={TYPE_TOKENS[i.traineeType].bg} size={20} />
            <span style={{ fontSize: 11, color: B.MUTED }}>{i.trainee}</span>
            <span style={{ color: B.BORDER }}>·</span>
            <TrainerPills keys={i.trainers} />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          {live ? <Pill label="Live now" tone="red" dot /> : done ? <Pill label="Done" tone="gray" /> : <Pill label="Upcoming" tone="teal" />}
          {canEval && <button onClick={openEval} style={{ fontSize: 11, padding: "3px 9px", border: `1px solid ${evalOpen ? "#145365" : B.BORDER}`, borderRadius: 6, background: evalOpen ? "#E1ECEF" : B.WHITE, color: evalOpen ? "#0E3D4A" : B.MUTED, cursor: "pointer", whiteSpace: "nowrap" }}>{evalOpen ? "Cancel" : evaluation ? "Edit evaluation" : "Add evaluation"}</button>}
          {!readOnly && !done && <button onClick={() => onToggle(i.id)} style={{ fontSize: 11, padding: "3px 9px", border: `1px solid ${isReassigning ? B.TEAL : B.BORDER}`, borderRadius: 6, background: isReassigning ? "#E1ECEF" : B.WHITE, color: isReassigning ? "#0E3D4A" : B.MUTED, cursor: "pointer", whiteSpace: "nowrap" }}>{isReassigning ? "Cancel" : "Reassign"}</button>}
        </div>
      </div>

      {evaluation && !evalOpen && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${B.BORDER}`, display: "flex", alignItems: "flex-start", gap: 8 }}>
          <span style={{ fontSize: 10, color: B.MUTED, marginTop: 2 }}>Evaluation</span>
          {evaluation.rating && <Pill label={(RATINGS.find(r => r.key === evaluation.rating) || {}).label || evaluation.rating} tone={(RATINGS.find(r => r.key === evaluation.rating) || {}).tone || "gray"} />}
          {evaluation.note && <span style={{ fontSize: 12, color: B.BLACK }}>{evaluation.note}</span>}
        </div>
      )}

      {canEval && evalOpen && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${B.BORDER}` }}>
          <div style={{ fontSize: 11, color: B.MUTED, marginBottom: 6 }}>Session evaluation for {i.trainee}</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
            {RATINGS.map(r => {
              const sel = draftRating === r.key; const tk = { amber: { bg: "#E8E8EB", c: "#3A3A45" }, teal: { bg: "#E1ECEF", c: "#0E3D4A" }, green: { bg: "#E1ECEF", c: "#0E3D4A" } }[r.tone];
              return <button key={r.key} onClick={() => setDraftRating(r.key)} style={{ fontSize: 11, fontWeight: 500, padding: "4px 10px", borderRadius: 8, cursor: "pointer", border: `1px solid ${sel ? tk.c : B.BORDER}`, background: sel ? tk.bg : B.WHITE, color: sel ? tk.c : B.MUTED }}>{r.label}</button>;
            })}
          </div>
          <textarea value={draftNote} onChange={e => setDraftNote(e.target.value)} placeholder="Notes on performance, areas to reinforce, blockers…" rows={3} style={{ width: "100%", boxSizing: "border-box", fontFamily: "Poppins, sans-serif", fontSize: 12, padding: "8px 10px", borderRadius: 8, border: `1px solid ${B.BORDER}`, resize: "vertical", color: B.BLACK }} />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={saveEval} disabled={!draftRating && !draftNote.trim()} style={{ fontSize: 11, fontWeight: 500, padding: "5px 14px", borderRadius: 8, cursor: (!draftRating && !draftNote.trim()) ? "default" : "pointer", border: "1px solid #145365", background: (!draftRating && !draftNote.trim()) ? B.SURFACE : "#145365", color: (!draftRating && !draftNote.trim()) ? B.MUTED : B.WHITE }}>Save evaluation</button>
            <button onClick={() => setEvalOpen(false)} style={{ fontSize: 11, padding: "5px 12px", borderRadius: 8, cursor: "pointer", border: `1px solid ${B.BORDER}`, background: B.WHITE, color: B.MUTED }}>Cancel</button>
          </div>
        </div>
      )}

      {isReassigning && !readOnly && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${B.BORDER}` }}>
          <div style={{ fontSize: 11, color: B.MUTED, marginBottom: 6 }}>Reassign to — <span style={{ color: "#0E3D4A" }}>green</span> is the most available (free at this time, lightest load):</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {assignable.map(k => {
              const t = TRAINERS[k];
              const isCurrent = i.trainers.includes(k);
              const busy = avail && avail[k];
              const isRec = k === recommended;
              const disabled = isCurrent || busy;
              return (
                <button key={k} onClick={() => !disabled && onPick(i, k)} disabled={disabled} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8, cursor: disabled ? "default" : "pointer",
                  border: `1px solid ${isRec ? "#145365" : B.BORDER}`, background: isRec ? "#E1ECEF" : B.WHITE, opacity: disabled ? 0.5 : 1,
                }}>
                  <Avatar initials={t.initials} color={t.color} bg={t.bg} size={22} />
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: B.BLACK }}>{t.name}</div>
                    <div style={{ fontSize: 10, color: B.MUTED }}>{load[k]} sessions{isCurrent ? " · current" : busy ? " · busy now" : ""}</div>
                  </div>
                  {isRec && <span style={{ fontSize: 9, fontWeight: 500, padding: "2px 6px", borderRadius: 8, background: "#145365", color: B.WHITE }}>Most available</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TrainerWorkloadApp() {
  const realNow = new Date();
  const inWindow = realNow >= SCHED_START && realNow <= SCHED_END;
  const demoNow = new Date(2026, 5, 4, 11, 15);
  const [now, setNow] = useState(demoNow);
  const [simulated, setSimulated] = useState(true);
  const [navOpen, setNavOpen] = useState(false);
  const [view, setView] = useState("live");
  const [selDate, setSelDate] = useState(new Date(2026, 5, 4));
  const [assignments, setAssignments] = useState({});
  const [reassignId, setReassignId] = useState(null);
  const [openTrainer, setOpenTrainer] = useState(null);
  const [openVA, setOpenVA] = useState("claire");
  const [viewer, setViewer] = useState("lead");
  const [track, setTrack] = useState("crm");
  const [endorsed, setEndorsed] = useState({});
  const [evaluations, setEvaluations] = useState({});
  const [sessionView, setSessionView] = useState("list");
  const [panelVA, setPanelVA] = useState(null);
  const [toast, setToast] = useState({ msg: "", show: false });

  useEffect(() => { if (simulated) return; const id = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(id); }, [simulated]);

  const ASSIGNABLE = TRACKS[track].trainerKeys;
  const trackTrainees = TRAINEES.filter(t => t.track === track);
  const trackTypes = TRACKS[track].types;

  const insts = INSTANCES.filter(i => i.track === track).map(i => ({ ...i, trainers: assignments[i.id] || i.baseTrainers }));
  const load = {};
  ASSIGNABLE.forEach(k => { load[k] = 0; });
  insts.forEach(i => i.trainers.forEach(k => { if (load[k] != null) load[k]++; }));
  const recommend = (exclude) => { const pool = ASSIGNABLE.filter(k => !exclude.includes(k)); const list = pool.length ? pool : ASSIGNABLE; return [...list].sort((a, b) => load[a] - load[b])[0]; };
  const busyAt = (k, i) => insts.some(s => s.id !== i.id && s.trainers.includes(k) && s.start < i.end && s.end > i.start);
  const availFor = (i) => { const m = {}; ASSIGNABLE.forEach(k => { m[k] = busyAt(k, i); }); return m; };
  const recommendFor = (i) => {
    const candidates = ASSIGNABLE.filter(k => !i.trainers.includes(k));
    const free = candidates.filter(k => !busyAt(k, i));
    const pool = free.length ? free : (candidates.length ? candidates : ASSIGNABLE);
    return [...pool].sort((a, b) => load[a] - load[b])[0];
  };

  function showToast(msg) { setToast({ msg, show: true }); setTimeout(() => setToast(t => ({ ...t, show: false })), 3200); }
  function pick(i, key) {
    setAssignments(a => ({ ...a, [i.id]: [key] }));
    setReassignId(null);
    // SPINE: persist the assignment, e.g. supabase.from("training.enrollment_sessions")
    //   .update({ trainer_id: TRAINERS[key].id }).eq("id", i.id);
    logActivity("training.trainer.reassigned", { entity_type: "session", entity_id: i.id, track, details: { module: i.module, trainee: i.trainee, from: i.trainers, to: key } });
    showToast(`training.trainer.reassigned — ${i.module} → ${TRAINERS[key].name}`);
  }
  function switchTrack(t) { setTrack(t); setViewer("lead"); setView("live"); setOpenTrainer(null); setPanelVA(null); setOpenVA(TRAINEES.find(x => x.track === t).id); }
  function endorse(va) {
    const target = endorseTarget(va.type);
    const action = target === "QAQC" ? "training.va.endorsed_qaqc" : "training.va.endorsed_insurance";
    const next = !endorsed[va.id];
    setEndorsed(e => ({ ...e, [va.id]: next }));
    // SPINE: also flip the enrollment stage, e.g. supabase.from("training.enrollments")
    //   .update({ stage: next ? target : "in_training" }).eq("id", va.id);
    if (next) logActivity(action, { entity_type: "enrollment", entity_id: va.id, track, details: { trainee: va.name, target, type: va.type } });
    showToast(next ? `${action} — ${va.name} endorsed to ${target}` : `endorsement removed — ${va.name}`);
  }
  function saveEval(i, payload) {
    setEvaluations(e => ({ ...e, [i.id]: payload }));
    // SPINE: persist, e.g. supabase.from("training.session_evaluations")
    //   .upsert({ session_id: i.id, rating: payload.rating, note: payload.note });
    logActivity("training.session.evaluated", { entity_type: "session", entity_id: i.id, track, details: { module: i.module, trainee: i.trainee, rating: payload.rating } });
    showToast(`training.session.evaluated — ${i.module} (${i.trainee})`);
  }

  const offset = Math.max(0, Math.min(TOTAL_MIN, Math.round((now - SCHED_START) / 60000)));
  const todays = insts.filter(i => sameDay(i.date, now)).sort((a, b) => a.start - b.start);
  const upcoming = insts.filter(i => i.start > now).sort((a, b) => a.start - b.start);
  const rowProps = (i) => ({ load, assignable: ASSIGNABLE, avail: availFor(i), recommended: recommendFor(i), isReassigning: reassignId === i.id, onToggle: (id) => setReassignId(p => p === id ? null : id), onPick: pick, evaluation: evaluations[i.id], onSaveEval: saveEval });


  const isVA = viewer !== "lead";
  const viewerVA = isVA ? TRAINEES.find(t => t.id === viewer) : null;
  const NAV = isVA
    ? [{ id: "vas", label: "My Schedule" }, { id: "calendar", label: "My Calendar" }]
    : [
        { id: "live", label: "Live Status" },
        { id: "trainers", label: "Trainers" },
        { id: "today", label: "Today" },
        { id: "upcoming", label: "Upcoming" },
        { id: "calendar", label: "Calendar" },
      ];
  const VA_VIEWS = ["vas", "calendar"];
  const effView = isVA ? (VA_VIEWS.includes(view) ? view : "vas") : view;

  const labelMap = { in_class: ["In class", "red"], today: ["Up next", "teal"], not_started: ["Not started", "gray"], done: ["Completed", "gray"], done_today: ["Done for today", "green"], break: ["No class today", "gray"] };

  function TrainerTile({ k, selectable, onClick }) {
    const t = TRAINERS[k]; const st = trainerStatus(k, now, insts);
    const sel = selectable && openTrainer === k;
    return (
      <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", border: `${sel ? 2 : 1}px solid ${sel ? B.TEAL : st.state === "in_meeting" ? "#E73835" : B.BORDER}`, background: st.state === "in_meeting" ? "#FCEAEA" : B.WHITE, borderRadius: 10, padding: "8px 10px" }}>
        <Avatar initials={t.initials} color={t.color} bg={t.bg} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</div>
          <div style={{ fontSize: 10, color: B.MUTED, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{st.state === "in_meeting" ? `${st.live.trainee} · ${fmtTime(st.live.start)}–${fmtTime(st.live.end)}` : `${st.nextToday ? `Next ${fmtTime(st.nextToday.start)}` : "No sessions today"} · ${load[k]} total`}</div>
        </div>
        {st.state === "in_meeting" ? <Pill label="In meeting" tone="red" dot /> : <Pill label="Available" tone="green" />}
      </div>
    );
  }

  function trainerStats(k) {
    const mine = insts.filter(i => i.trainers.includes(k));
    const trainees = new Set(mine.map(i => i.traineeId)).size;
    const hours = mine.reduce((a, i) => a + (i.end - i.start) / 3600000, 0);
    const modules = new Set(mine.map(i => i.module)).size;
    return { sessions: mine.length, trainees, hours, modules };
  }

  const CAP_CEILING = 12;
  function capacity(k) {
    const pct = Math.min(100, Math.round((load[k] / CAP_CEILING) * 100));
    const status = pct >= 80 ? "full" : pct >= 45 ? "partial" : "open";
    const tok = status === "full" ? { bar: B.RED, bg: "#FBE3E3", text: "#A32420" }
      : status === "partial" ? { bar: B.MUTED, bg: "#E8E8EB", text: "#3A3A45" }
        : { bar: B.TEAL, bg: "#E1ECEF", text: "#0E3D4A" };
    return { pct, status, tok };
  }

  function TrainerStatCard({ k, selected, onClick }) {
    const t = TRAINERS[k];
    if (!selected) {
      return (
        <div onClick={onClick} style={{ cursor: "pointer", background: B.WHITE, border: `1px solid ${B.BORDER}`, borderRadius: 16, padding: 16, display: "flex", alignItems: "center", gap: 10, boxShadow: B.SHADOW }}>
          <Avatar initials={t.initials} color={t.color} bg={t.bg} size={36} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</div>
            <div style={{ fontSize: 11, color: B.MUTED }}>{t.role}</div>
          </div>
          <span style={{ fontSize: 11, color: B.MUTED, whiteSpace: "nowrap" }}>View ›</span>
        </div>
      );
    }
    const s = trainerStats(k);
    const c = capacity(k);
    const hrs = Number.isInteger(s.hours) ? s.hours : s.hours.toFixed(1);
    return (
      <div onClick={onClick} style={{ cursor: "pointer", background: B.WHITE, border: `2px solid ${B.TEAL}`, borderRadius: 16, padding: 16, boxShadow: B.SHADOW }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <Avatar initials={t.initials} color={t.color} bg={t.bg} size={36} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</div>
            <div style={{ fontSize: 11, color: B.MUTED }}>{t.role}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div style={{ flex: 1, height: 6, borderRadius: 3, background: "#EAEAE8", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 3, width: `${c.pct}%`, background: c.tok.bar }} />
          </div>
          <span style={{ fontSize: 11, color: B.MUTED, minWidth: 32, textAlign: "right" }}>{c.pct}%</span>
          <span style={{ fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 10, background: c.tok.bg, color: c.tok.text }}>{c.status.toUpperCase()}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
          {[{ n: s.trainees, l: "trainees" }, { n: hrs, l: "hrs total" }, { n: s.modules, l: "modules" }].map(({ n, l }) => (
            <div key={l} style={{ background: B.SURFACE, borderRadius: 8, padding: "8px 6px", textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 500, color: B.BLACK }}>{n}</div>
              <div style={{ fontSize: 10, color: B.MUTED }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function VAGroups({ onSelect }) {
    return trackTypes.map(type => {
      const list = trackTrainees.filter(t => t.type === type);
      if (!list.length) return null;
      const tk = TYPE_TOKENS[type];
      return (
        <div key={type} style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: tk.text }} />
            <span style={{ fontSize: 11, fontWeight: 500, color: tk.text }}>{type}</span>
            <span style={{ fontSize: 10, color: B.MUTED }}>· {list.length} {list.length === 1 ? "trainee" : "trainees"}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
            {list.map(tr => {
              const st = traineeStatus(tr, now, insts);
              const [lbl, tone] = labelMap[st.state];
              const sub = st.state === "in_class" ? `${st.live.module}` : st.state === "today" ? `${fmtTime(st.next.start)} · ${st.next.module}` : st.state === "not_started" ? `Starts ${fmtDate(st.next.start)}` : tr.agency;
              return (
                <div key={tr.id} onClick={() => onSelect && onSelect(tr.id)} style={{ display: "flex", alignItems: "center", gap: 8, cursor: onSelect ? "pointer" : "default", border: `1px solid ${st.state === "in_class" ? "#E73835" : B.BORDER}`, background: st.state === "in_class" ? "#FCEAEA" : B.WHITE, borderRadius: 10, padding: "8px 10px" }}>
                  <Avatar initials={tr.initials} color={tk.text} bg={tk.bg} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tr.name}</div>
                    <div style={{ fontSize: 10, color: B.MUTED, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>
                  </div>
                  <Pill label={lbl} tone={tone} dot={st.state === "in_class"} />
                </div>
              );
            })}
          </div>
        </div>
      );
    });
  }

  function VACard({ tr, selected, onClick }) {
    const tk = TYPE_TOKENS[tr.type];
    const mine = insts.filter(i => i.traineeId === tr.id).sort((a, b) => a.start - b.start);
    const total = mine.length;
    const done = mine.filter(i => now >= i.end).length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const hours = mine.reduce((a, i) => a + (i.end - i.start) / 3600000, 0);
    const hrs = Number.isInteger(hours) ? hours : hours.toFixed(1);
    const days = new Set(mine.map(i => i.date.toDateString())).size;
    const st = traineeStatus(tr, now, insts);
    const [lbl, tone] = labelMap[st.state];
    return (
      <div onClick={onClick} style={{ cursor: "pointer", background: B.WHITE, border: `${selected ? 2 : 1}px solid ${selected ? B.TEAL : st.state === "in_class" ? "#E73835" : B.BORDER}`, borderRadius: 16, padding: 16, boxShadow: B.SHADOW }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
          <Avatar initials={tr.initials} color={tk.text} bg={tk.bg} size={36} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tr.name}</div>
            <div style={{ fontSize: 11, color: B.MUTED, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tr.agency}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            <Pill label={lbl} tone={tone} dot={st.state === "in_class"} />
            {endorsed[tr.id] && <Pill label={endorseTarget(tr.type) === "QAQC" ? "QAQC" : "Insurance"} tone="green" dot />}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div style={{ flex: 1, height: 6, borderRadius: 3, background: "#EAEAE8", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 3, width: `${pct}%`, background: tk.text }} />
          </div>
          <span style={{ fontSize: 11, color: B.MUTED, minWidth: 64, textAlign: "right" }}>{done}/{total} done</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
          {[{ n: total, l: "sessions" }, { n: hrs, l: "hrs total" }, { n: days, l: "days" }].map(({ n, l }) => (
            <div key={l} style={{ background: B.SURFACE, borderRadius: 8, padding: "8px 6px", textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 500, color: B.BLACK }}>{n}</div>
              <div style={{ fontSize: 10, color: B.MUTED }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const SubHead = ({ children }) => <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 800, color: B.BLACK, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 14 }}><span style={{ width: 14, height: 14, background: B.RED, clipPath: "polygon(0 0,100% 0,100% 100%,62% 100%,62% 38%,0 38%)" }} />{children}</div>;

  const selTrainer = (openTrainer && ASSIGNABLE.includes(openTrainer)) ? openTrainer : ASSIGNABLE[0];
  const selVA = (openVA && trackTrainees.some(t => t.id === openVA)) ? openVA : trackTrainees[0].id;

  return (
    <div style={{ fontFamily: "Poppins, sans-serif", background: B.PAGE_BG, backgroundAttachment: "fixed", minHeight: "100vh", color: B.BLACK, position: "relative" }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, backgroundImage: "linear-gradient(rgba(36,36,45,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(36,36,45,.045) 1px,transparent 1px)", backgroundSize: "72px 72px", WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,.5), transparent 76%)", maskImage: "linear-gradient(to bottom, rgba(0,0,0,.5), transparent 76%)" }} />
      <div style={{ position: "relative", zIndex: 1 }}>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", height: 70, background: "rgba(255,255,255,0.88)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", borderBottom: `1px solid rgba(27,18,11,0.10)`, boxShadow: "0 8px 26px rgba(27,18,11,.05)", position: "sticky", top: 0, zIndex: 40, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ background: B.RED, color: B.WHITE, fontSize: 13, fontWeight: 800, padding: "5px 10px", borderRadius: 8, letterSpacing: "0.06em" }}>LAVA</span>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: B.TEAL }}>Fulfillment · Training Ops</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 3, background: B.WHITE, border: `1px solid ${B.BORDER}`, borderRadius: 999, padding: 3 }}>
            {Object.keys(TRACKS).map(tk => (
              <button key={tk} onClick={() => switchTrack(tk)} style={{ fontSize: 12, fontWeight: 700, padding: "6px 14px", border: "none", borderRadius: 999, cursor: "pointer", background: track === tk ? B.RED : "transparent", color: track === tk ? B.WHITE : B.MUTED, letterSpacing: "0.02em" }}>{TRACKS[tk].label}</button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: B.MUTED }}>Viewing as</span>
            <select value={viewer} onChange={e => { const v = e.target.value; setViewer(v); if (v === "lead") setView("live"); else { setView("vas"); setOpenVA(v); const va = TRAINEES.find(t => t.id === v); if (va) setSelDate(new Date(va.startDate)); } }} style={{ fontSize: 12, fontWeight: 600, padding: "7px 10px", borderRadius: 10, border: `1px solid ${B.BLACK}`, background: B.WHITE, color: B.BLACK, cursor: "pointer", fontFamily: "Poppins, sans-serif" }}>
              <option value="lead">{TRAINERS[TRACKS[track].leadKey].name} · Lead</option>
              {trackTrainees.map(t => <option key={t.id} value={t.id}>{t.name} · VA</option>)}
            </select>
          </div>
        </div>
      </div>

      <div style={{ padding: "28px 28px 0" }}>
        <div style={{ position: "relative", overflow: "hidden", background: B.DARK, color: B.WHITE, borderRadius: 22, padding: "30px 32px", boxShadow: B.SHADOW_LG }}>
          <div style={{ position: "absolute", right: 26, top: 22, width: 92, height: 92, background: B.RED, opacity: 0.18, clipPath: "polygon(0 0,100% 0,100% 100%,72% 100%,72% 28%,0 28%)" }} />
          <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1, textTransform: "uppercase" }}>Trainer Workload</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.78)", marginTop: 12, letterSpacing: "0.01em" }}>{TRACKS[track].sub}</div>
        </div>
      </div>

      {/* Summary metrics */}
      {isVA ? (() => {
        const mine = insts.filter(i => i.traineeId === viewerVA.id);
        const upcomingCount = mine.filter(i => i.end > now).length;
        const hours = mine.reduce((a, i) => a + (i.end - i.start) / 3600000, 0);
        const hrs = Number.isInteger(hours) ? hours : hours.toFixed(1);
        const days = new Set(mine.map(i => i.date.toDateString())).size;
        return (
          <div style={{ display: "flex", gap: 16, padding: "20px 28px 0", flexWrap: "wrap" }}>
            <MetricCard label="My Sessions" value={mine.length} sub={`${upcomingCount} upcoming`} />
            <MetricCard label="Program" value={viewerVA.type.replace("Combo - ", "")} sub={`${days}-day program`} />
            <MetricCard label="Total Hours" value={hrs} sub="across program" />
            <MetricCard label="Starts" value={viewerVA.start.replace("Mon ", "")} sub={viewerVA.agency} />
          </div>
        );
      })() : (
        <div style={{ display: "flex", gap: 16, padding: "20px 28px 0", flexWrap: "wrap" }}>
          <MetricCard label="Active Trainees" value={trackTrainees.length} sub="in training pipeline" />
          <MetricCard label="Active Trainers" value={ASSIGNABLE.length} sub={`${TRACKS[track].label} team`} />
          <MetricCard label="Scheduled Sessions" value={insts.length} sub="across trainees" />
          <MetricCard label="Trainee Types" value={trackTypes.length} sub={trackTypes.map(t => t.replace("Combo - ", "").replace("Insurance - ", "")).join(" · ")} />
        </div>
      )}

      {/* Time control — pick the moment via calendar + time */}
      <div style={{ padding: "20px 28px 0" }}>
        <div style={{ background: B.WHITE, border: `1px solid ${B.BORDER}`, borderRadius: 16, padding: "14px 18px", boxShadow: B.SHADOW }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{fmtDate(now)} · {fmtTime(now)}</span>
            {simulated ? <Pill label="Simulated time" tone="amber" dot /> : <Pill label="Live" tone="green" dot />}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 12 }}>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: B.MUTED }}>Preview</span>
              <input type="date" value={dateInputValue(now)} min={dateInputValue(SCHED_START)} max={dateInputValue(SCHED_END)}
                onChange={e => { const [y, m, d] = e.target.value.split("-").map(Number); if (y) { setNow(new Date(y, m - 1, d, now.getHours(), now.getMinutes())); setSimulated(true); } }}
                style={{ fontSize: 12, padding: "6px 9px", borderRadius: 10, border: `1px solid ${B.BORDER}`, background: B.WHITE, color: B.BLACK, fontFamily: "Poppins, sans-serif" }} />
              <input type="time" step={900} value={timeInputValue(now)}
                onChange={e => { const [hh, mm] = e.target.value.split(":").map(Number); if (!isNaN(hh)) { setNow(new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm)); setSimulated(true); } }}
                style={{ fontSize: 12, padding: "6px 9px", borderRadius: 10, border: `1px solid ${B.BORDER}`, background: B.WHITE, color: B.BLACK, fontFamily: "Poppins, sans-serif" }} />
            </div>
            <button onClick={() => { setNow(new Date()); setSimulated(false); }} style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, padding: "6px 12px", border: `1px solid ${B.BLACK}`, borderRadius: 999, background: B.WHITE, color: B.BLACK, cursor: "pointer" }}>Reset to now</button>
          </div>
          <div style={{ fontSize: 11, color: B.MUTED, marginTop: 8 }}>Pick a date and time to preview live status across the program ({fmtDate(SCHED_START)} – {fmtDate(SCHED_END)}).</div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "16px 20px 28px" }}>

        {isVA ? (() => {
          const tr = viewerVA;
          const tkk = TYPE_TOKENS[tr.type];
          const all = insts.filter(i => i.traineeId === tr.id).sort((a, b) => a.start - b.start);
          const total = all.length;
          const done = all.filter(i => now >= i.end).length;
          const pct = total ? Math.round((done / total) * 100) : 0;
          const mine = all.filter(i => i.end > now);
          return (
            <>
              {endorsed[tr.id] && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid #145365", background: "#E1ECEF", borderRadius: 10, padding: "10px 14px", marginBottom: 16 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#0E3D4A" }} />
                  <span style={{ fontSize: 12, color: "#0E3D4A", fontWeight: 500 }}>You've been endorsed to {endorseTarget(tr.type)}</span>
                  <span style={{ fontSize: 11, color: "#0E3D4A" }}>— your training lead has cleared you.</span>
                </div>
              )}
              <div style={{ border: `1px solid ${B.BORDER}`, borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>Training progress</span>
                  <span style={{ fontSize: 12, color: B.MUTED }}>{done} of {total} sessions complete · {pct}%</span>
                </div>
                <div style={{ height: 10, borderRadius: 5, background: "#EAEAE8", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: B.TEAL, borderRadius: 5, transition: "width 0.4s ease" }} />
                </div>
                <div style={{ fontSize: 10, color: B.MUTED, marginTop: 6 }}>{tr.type.replace("Combo - ", "")} program · started {tr.start.replace("Mon ", "")}</div>
              </div>
              <SubHead>My upcoming schedule</SubHead>
              <div style={{ border: `1px solid ${B.BORDER}`, borderRadius: 10, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: B.SURFACE, borderBottom: `1px solid ${B.BORDER}`, flexWrap: "wrap" }}>
                  <Avatar initials={tr.initials} color={tkk.text} bg={tkk.bg} size={24} />
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{tr.name}</span>
                  <TypeBadge type={tr.type} />
                  <span style={{ fontSize: 11, color: B.MUTED }}>· {mine.length} upcoming {mine.length === 1 ? "session" : "sessions"}</span>
                </div>
                <div style={{ padding: "12px 14px" }}>
                  {mine.length === 0 ? <div style={{ fontSize: 12, color: B.MUTED }}>No upcoming sessions — your program is complete.</div> : mine.map(i => <SessionRow key={i.id} i={i} now={now} readOnly />)}
                </div>
              </div>
            </>
          );
        })() : (() => {
          const trainerSel = (openTrainer && ASSIGNABLE.includes(openTrainer)) ? openTrainer : null;
          const t = trainerSel ? TRAINERS[trainerSel] : null;
          const mine = trainerSel ? insts.filter(i => i.trainers.includes(trainerSel)).sort((a, b) => a.start - b.start) : [];
          const ViewToggle = () => (
            <div style={{ display: "flex", border: `1px solid ${B.BORDER}`, borderRadius: 8, overflow: "hidden" }}>
              {[["list", IconList], ["calendar", IconCalendar]].map(([v, Icon]) => (
                <button key={v} onClick={() => setSessionView(v)} title={v === "list" ? "List view" : "Calendar view"} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 28, border: "none", cursor: "pointer", background: sessionView === v ? B.DARK : B.WHITE, color: sessionView === v ? B.WHITE : B.MUTED }}><Icon /></button>
              ))}
            </div>
          );
          const year = 2026, month = 5;
          const startWd = new Date(year, month, 1).getDay();
          const days = new Date(year, month + 1, 0).getDate();
          const cells = []; for (let z = 0; z < startWd; z++) cells.push(null); for (let d = 1; d <= days; d++) cells.push(d);
          const daySessions = mine.filter(i => sameDay(i.date, selDate)).sort((a, b) => a.start - b.start);
          return (
            <>
              <SubHead>Trainers — select to view assigned sessions</SubHead>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginBottom: 16 }}>
                {ASSIGNABLE.map(k => <TrainerStatCard key={k} k={k} selected={openTrainer === k} onClick={() => setOpenTrainer(p => p === k ? null : k)} />)}
              </div>

              {trainerSel ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Avatar initials={t.initials} color={t.color} bg={t.bg} size={24} />
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{t.name} — assigned sessions</span>
                      <span style={{ fontSize: 11, color: B.MUTED }}>· {mine.length} total</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <ViewToggle />
                      <button onClick={() => setOpenTrainer(null)} title="Close" aria-label="Close" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, border: `1px solid ${B.BORDER}`, borderRadius: 8, background: B.WHITE, color: B.MUTED, cursor: "pointer" }}><IconX /></button>
                    </div>
                  </div>

                  {mine.length === 0 ? (
                    <div style={{ fontSize: 12, color: B.MUTED, padding: "8px 0" }}>No sessions currently assigned.</div>
                  ) : sessionView === "calendar" ? (
                    <>
                      <div style={{ fontSize: 12, fontWeight: 500, color: B.MUTED, marginBottom: 8 }}>June 2026</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>{WD.map(w => <div key={w} style={{ fontSize: 10, color: B.MUTED, textAlign: "center", padding: "2px 0" }}>{w}</div>)}</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
                        {cells.map((d, idx) => {
                          if (d === null) return <div key={idx} />;
                          const cellDate = new Date(year, month, d);
                          const sess = mine.filter(i => sameDay(i.date, cellDate));
                          const isToday = sameDay(cellDate, now); const isSel = sameDay(cellDate, selDate);
                          return (
                            <div key={idx} onClick={() => setSelDate(cellDate)} style={{ minHeight: 50, border: `${isSel || isToday ? 2 : 1}px solid ${isSel ? B.TEAL : isToday ? "#E73835" : B.BORDER}`, borderRadius: 8, padding: 5, cursor: "pointer", background: sess.length ? B.WHITE : B.SURFACE }}>
                              <div style={{ fontSize: 11, fontWeight: isToday ? 500 : 400, color: isToday ? "#A32420" : B.BLACK, textAlign: "right" }}>{d}</div>
                              {sess.length > 0 && <div style={{ marginTop: 2 }}><span style={{ fontSize: 9, fontWeight: 500, padding: "1px 5px", borderRadius: 6, background: "#EDEDEB", color: B.MUTED }}>{sess.length} {sess.length === 1 ? "session" : "sessions"}</span></div>}
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ marginTop: 14 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: B.MUTED, marginBottom: 8 }}>{fmtDate(selDate)}</div>
                        {daySessions.length === 0 ? <div style={{ fontSize: 12, color: B.MUTED, padding: "8px 0" }}>No sessions this day. Click a highlighted date above.</div> : daySessions.map(i => <SessionRow key={i.id} i={i} now={now} {...rowProps(i)} hideDay />)}
                      </div>
                    </>
                  ) : (
                    <div>
                      {(() => {
                        const groups = {};
                        mine.forEach(i => { const key = i.date.toDateString(); (groups[key] = groups[key] || []).push(i); });
                        return Object.keys(groups).map(key => (
                          <div key={key} style={{ marginBottom: 14 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 0 8px", borderBottom: `2px solid ${B.DARK}`, marginBottom: 10 }}>
                              <span style={{ width: 4, height: 16, borderRadius: 2, background: B.TEAL }} />
                              <span style={{ fontSize: 14, fontWeight: 500, color: B.BLACK }}>{fmtDate(new Date(key))}</span>
                              <span style={{ fontSize: 11, color: B.MUTED }}>{groups[key][0].dayLabel} · {groups[key][0].weekday}</span>
                            </div>
                            {groups[key].map(i => <SessionRow key={i.id} i={i} now={now} {...rowProps(i)} hideDay />)}
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ borderTop: `1px solid ${B.BORDER}`, paddingTop: 16 }}>
                  <SubHead>Virtual Assistants — select to view progress</SubHead>
                  <VAGroups onSelect={(id) => setPanelVA(id)} />
                </div>
              )}
            </>
          );
        })()}

      </div>

      {panelVA && (() => {
        const va = TRAINEES.find(t => t.id === panelVA);
        if (!va) return null;
        const tk = TYPE_TOKENS[va.type];
        const all = insts.filter(i => i.traineeId === va.id).sort((a, b) => a.start - b.start);
        const total = all.length;
        const done = all.filter(i => now >= i.end).length;
        const pct = total ? Math.round((done / total) * 100) : 0;
        const finalDate = all.length ? all.reduce((m, i) => (i.date > m ? i.date : m), all[0].date) : now;
        const finalDayStart = new Date(finalDate.getFullYear(), finalDate.getMonth(), finalDate.getDate());
        const finalLabel = all.length ? (all.find(i => sameDay(i.date, finalDate)) || {}).dayLabel : "";
        const canEndorse = now >= finalDayStart;
        const target = endorseTarget(va.type);
        const taken = all.filter(i => now >= i.end);
        return (
          <>
            <div onClick={() => setPanelVA(null)} style={{ position: "fixed", inset: 0, background: "rgba(27,18,11,0.28)", zIndex: 60 }} />
            <div style={{ position: "fixed", top: 0, right: 0, height: "100%", width: 380, maxWidth: "92vw", background: B.WHITE, borderLeft: `1px solid ${B.BORDER}`, boxShadow: "-2px 0 14px rgba(27,18,11,0.14)", zIndex: 70, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: `1px solid ${B.BORDER}` }}>
                <Avatar initials={va.initials} color={tk.text} bg={tk.bg} size={34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{va.name}</div>
                  <div style={{ fontSize: 11, color: B.MUTED, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{va.agency}</div>
                </div>
                <button onClick={() => setPanelVA(null)} aria-label="Close" title="Close" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, border: `1px solid ${B.BORDER}`, borderRadius: 8, background: B.WHITE, color: B.MUTED, cursor: "pointer" }}><IconX /></button>
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <TypeBadge type={va.type} />
                  {endorsed[va.id] && <Pill label={`Endorsed to ${target}`} tone="green" dot />}
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 500 }}>Current progress</span>
                    <span style={{ fontSize: 12, color: B.MUTED }}>{done}/{total} sessions · {pct}%</span>
                  </div>
                  <div style={{ height: 10, borderRadius: 5, background: "#EAEAE8", overflow: "hidden" }}><div style={{ height: "100%", width: `${pct}%`, background: B.TEAL, borderRadius: 5, transition: "width 0.4s ease" }} /></div>
                </div>

                <div style={{ background: B.SURFACE, borderRadius: 10, padding: "10px 12px", marginBottom: 18, fontSize: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}><span style={{ color: B.MUTED }}>Started training</span><span style={{ fontWeight: 500 }}>{va.start}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}><span style={{ color: B.MUTED }}>Program</span><span style={{ fontWeight: 500 }}>{va.type.replace("Combo - ", "").replace("Insurance - ", "")}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: B.MUTED }}>Final day</span><span style={{ fontWeight: 500 }}>{finalLabel} · {fmtDate(finalDate)}</span></div>
                </div>

                <SubHead>Courses taken & evaluations</SubHead>
                {taken.length === 0 ? (
                  <div style={{ fontSize: 12, color: B.MUTED, marginBottom: 12 }}>No courses completed yet.</div>
                ) : taken.map(i => {
                  const ev = evaluations[i.id];
                  const meta = ev && ev.rating ? RATING_META[ev.rating] : null;
                  return (
                    <div key={i.id} style={{ border: `1px solid ${B.BORDER}`, borderRadius: 8, padding: "8px 10px", marginBottom: 6 }}>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{i.module}</div>
                      <div style={{ fontSize: 10, color: B.MUTED, marginBottom: ev ? 6 : 0 }}>{i.dayLabel} · {fmtDate(i.date)}</div>
                      {ev ? (
                        <div style={{ display: "flex", gap: 6, alignItems: "flex-start", flexWrap: "wrap" }}>
                          {meta && <Pill label={meta.label} tone={meta.tone} />}
                          {ev.note && <span style={{ fontSize: 11, color: B.BLACK }}>{ev.note}</span>}
                        </div>
                      ) : <div style={{ fontSize: 10, color: B.MUTED }}>Not yet evaluated</div>}
                    </div>
                  );
                })}
              </div>

              <div style={{ borderTop: `1px solid ${B.BORDER}`, padding: "12px 16px" }}>
                <button onClick={() => canEndorse && endorse(va)} disabled={!canEndorse} style={{ width: "100%", fontSize: 12, fontWeight: 500, padding: "10px", borderRadius: 8, cursor: canEndorse ? "pointer" : "default", border: `1px solid ${!canEndorse ? B.BORDER : endorsed[va.id] ? B.BORDER : "#145365"}`, background: !canEndorse ? B.SURFACE : endorsed[va.id] ? B.WHITE : "#145365", color: !canEndorse ? B.MUTED : endorsed[va.id] ? B.MUTED : B.WHITE }}>{endorsed[va.id] ? "Undo endorsement" : `Endorse to ${target}`}</button>
                {!canEndorse && <div style={{ fontSize: 10, color: B.MUTED, textAlign: "center", marginTop: 6 }}>Available on {finalLabel} ({fmtDate(finalDate)}) — the final training day.</div>}
              </div>
            </div>
          </>
        );
      })()}

      <div style={{ position: "fixed", bottom: 20, right: 20, background: B.DARK, color: B.WHITE, fontSize: 12, padding: "8px 14px", borderRadius: 8, opacity: toast.show ? 1 : 0, transition: "opacity 0.3s", pointerEvents: "none", maxWidth: 340, zIndex: 99 }}>{toast.msg}</div>
      </div>
    </div>
  );
}
