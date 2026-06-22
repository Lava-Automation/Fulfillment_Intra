/*
  Lava Client Profile (Company 360)
  ────────────────────────────────────────────────────────────────────
  This app sits on the Lava spine. It does not own auth, identity, or
  directory data. Those live on the spine and are mirrored in.

  Contract this app holds with the rest of the platform:
    • supabase     — shared spine client; session arrives via the intranet shell
    • employees    — read-only mirror, source of truth lives on the spine
    • role_grants  — read-only; drives who can see which client
    • activity_log — append-only, every meaningful action lands here (spine-owned)
    • hubspot_*    — read-only views of HubSpot objects, pulled in by the spine
    • brain.signals() — read pre-computed signals; do not call Anthropic from the client

  v1 scope: shell + Overview + General + Reporting built. Meetings, People,
  Timeline stubbed. Reporting has a Director view and a Client presentation
  mode for monthly and quarterly reviews. All data is mock except the people,
  who are real and resolved from UUID. Fonts: Poppins loads from Google;
  Monument Extended is licensed and gets dropped in as a woff2.
*/

import React, { useState, useEffect, useMemo } from "react";
import {
  Pin, Target, Flag, Sparkles, Lightbulb, TrendingUp, AlertTriangle,
  Users, CalendarDays, Map, Check, Building2, Star, Wrench, ClipboardList,
  Presentation, LayoutDashboard, Briefcase, Headset, Network, UserCog,
  Play, X, ChevronLeft, ChevronRight, Monitor, ListChecks, StickyNote,
  Clock, MessageSquare, Quote, Wallet, Power, Ban, ChevronDown,
  Compass, Gauge, Repeat, Camera, UserPlus, Boxes, CalendarPlus, Pencil, Video, FileText,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
// Hub integration: data layer is Laravel (no browser Supabase). The accounts
// list and the open account's header read /api/client-profiles via lib/api.
// The richer tabs still render the owner's worked-example sample in-session;
// they get wired to the API and persisted in later passes.
import { api } from "../../lib/api";

// Brand floor — Lava Brand Guide 2.0.
const B = { red: "#E73835", darkBlue: "#24242D", teal: "#145365", white: "#FFFFFF", black: "#1B120B" };
const N = {
  line: "rgba(27,18,11,0.10)", fill: "rgba(27,18,11,0.04)",
  muted: "rgba(27,18,11,0.55)", faint: "rgba(27,18,11,0.40)",
};
const FONT_BODY = "'Poppins', system-ui, -apple-system, sans-serif";
const DISPLAY = { fontFamily: FONT_BODY, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" };

// Spine mirror stand-in. Production: import { BY_ID } from spine.employees.
const EMP = {
  "0594b223-6f02-4f8e-9876-7f5af128c4de": { name: "Darek Chojnacki", role: "Fulfillment Director", booking: "https://meetings.hubspot.com/darek-chojnacki", email: "darek@lavaautomation.com" },
  "9ed8884f-5f5c-44ea-a5f3-b7ce05c2235c": { name: "Karla Jardeloza", role: "Insurance Director", booking: "https://meetings.hubspot.com/karla-jardeloza", email: "karla@lavaautomation.com" },
  "e8be31a4-ab3c-4a8c-8e7f-0fe09598d4de": { name: "Niccole Peeler", role: "Customer Success Director", booking: "https://meetings.hubspot.com/niccole-peeler", email: "niccole@lavaautomation.com" },
  "6c082813-9f75-4d3f-a9e7-470e206f1288": { name: "Guila Rose Rubis", role: "CRM Development Training Lead", booking: "", email: "guila@lavaautomation.com" },
  "c7c6d7b5-c646-4361-9412-eac5fc2e2c71": { name: "Marky Pandatu", role: "CRM Development Training Director", booking: "", email: "marky@lavaautomation.com" },
  "3ffd3628-016e-4f12-8bce-9aea543dc094": { name: "Princess Aguilar", role: "Data Analyst", booking: "", email: "princess@lavaautomation.com" },
  "3028f71d-fd5a-496b-86dc-f57ee1bf8fc7": { name: "Edmar Quirante", role: "Team Lead", booking: "https://meetings.hubspot.com/edmar-quirante", email: "edmar@lavaautomation.com" },
  "df43ff45-2eb2-4436-b164-a60cc7ed5da1": { name: "Gio Marchan", role: "Sales Development Representative", booking: "https://meetings.hubspot.com/gio-marchan", email: "gio@lavaautomation.com" },
};
// Real employees loaded from the API populate this at runtime so every nameOf()
// across the tabs resolves real names; falls back to the mock EMP map.
let RUNTIME_EMP = {};
const nameOf = (id) => (RUNTIME_EMP[id]?.name) || (EMP[id] ? EMP[id].name : "Unknown");
const emailFromName = (name) => {
  const parts = name.toLowerCase().replace(/[^a-z\s]/g, "").trim().split(/\s+/);
  return (parts[0] + (parts.length > 1 ? "." + parts[parts.length - 1] : "")) + "@lavaautomation.com";
};

const SESSION = { id: "0594b223-6f02-4f8e-9876-7f5af128c4de", email: "darek@lavaautomation.com" };

const CLIENT = {
  id: "c0000000-0000-4000-8000-000000000001",
  company_name: "Steele Insurance Agency",
  hubspot_company_id: "hs_8841200",
  product_mix: "Combo",
  account_stage: "Active",
  start_date: "March 4, 2026",
  va_start_date: "March 18, 2026",
  go_live_date: "April 1, 2026",
  support_through: "April 1, 2027",
  decision_due_date: "June 30, 2026",
  service_status: "monthly", // from HubSpot: onboarding | monthly | quarterly | ad_hoc | canceled
  ad_hoc_prepaid: 1500,
  platform: "AgencyZoom",
  logo_url: null, photo_url: null, photo_release_signed: false, caricature_url: null,
  primary_contact_ids: ["0594b223-6f02-4f8e-9876-7f5af128c4de", "9ed8884f-5f5c-44ea-a5f3-b7ce05c2235c"],
  team_ids: [
    "9ed8884f-5f5c-44ea-a5f3-b7ce05c2235c", "0594b223-6f02-4f8e-9876-7f5af128c4de",
    "3028f71d-fd5a-496b-86dc-f57ee1bf8fc7", "6c082813-9f75-4d3f-a9e7-470e206f1288",
    "3ffd3628-016e-4f12-8bce-9aea543dc094",
  ],
  // Account team grouped by function (real spine employees).
  roles: {
    Sales: ["df43ff45-2eb2-4436-b164-a60cc7ed5da1"],
    "Customer Success": ["9ed8884f-5f5c-44ea-a5f3-b7ce05c2235c", "e8be31a4-ab3c-4a8c-8e7f-0fe09598d4de"],
    Fulfillment: ["0594b223-6f02-4f8e-9876-7f5af128c4de", "6c082813-9f75-4d3f-a9e7-470e206f1288", "3ffd3628-016e-4f12-8bce-9aea543dc094"],
    "Team Lead": ["3028f71d-fd5a-496b-86dc-f57ee1bf8fc7"],
  },
  va_count: 2,
  tech_tools: ["AgencyZoom", "HawkSoft AMS", "RingCentral", "Zapier", "DocuSign", "Google Workspace"],
};

// Real deployed VAs for Steele Insurance Agency (spine.employees, Client group).
const VAS = [
  { id: "2fb6959f-bb26-4988-8aae-8abf702557b1", name: "Allyza Legaspi", lead: "Edmar Quirante", started: "Mar 18, 2026" },
  { id: "eedb75aa-b778-45eb-841c-35bfc9d31108", name: "Christian Vern Aguilar", lead: "Edmar Quirante", started: "Mar 25, 2026" },
];

// Agency's own org chart. Client-owned data, NOT in the spine. Sample until
// sourced from the agency CRM (AgencyZoom / InsuredMine / HubSpot / GoHighLevel)
// or entered by hand. Roles shown, names withheld until real data lands.
const AGENCY_ORG = {
  title: "Principal", count: null,
  children: [
    { title: "Personal lines lead", children: [{ title: "Personal lines, 4 CSRs" }] },
    { title: "Commercial lines lead", children: [{ title: "Commercial lines, 3 producers" }] },
    { title: "Service lead", children: [{ title: "Service desk, 2 CSRs" }] },
  ],
};

// ── Props for the Tools tab ────────────────────────────────────────
// Two ways agencies organize. Sample until sourced from the agency CRM.
const DEFAULT_POSITIONS = [
  "Principal / Owner", "Operations manager", "Sales manager", "Service manager",
  "Book of business lead", "Support lead", "Personal lines producer", "Commercial producer",
  "Personal lines CSR", "Commercial CSR", "Senior account rep", "Account rep", "Account manager",
  "Service support", "Producer", "CSR", "Marketing coordinator", "Front desk",
];
const AGENCY_MODELS = {
  split: {
    label: "Producers and service reps",
    blurb: "New business and service are separate functions. Producers write new business; service reps keep the existing book.",
    departments: [
      { name: "Leadership", lead: "Principal / Owner", staff: [{ title: "Operations manager", measure: "Team output, data quality", hired: "2019-03-04" }] },
      { name: "Sales", lead: "Sales manager", staff: [
        { title: "Personal lines producer", count: 2, measure: "New business written, close rate", hired: "2025-11-03" },
        { title: "Commercial producer", count: 1, measure: "New business written, pipeline", hired: "2021-06-14" },
      ] },
      { name: "Service", lead: "Service manager", staff: [
        { title: "Personal lines CSR", count: 3, measure: "Retention, service SLAs", hired: "2018-09-10" },
        { title: "Commercial CSR", count: 1, measure: "Retention, endorsements", hired: "2023-01-16" },
      ] },
    ],
  },
  portfolio: {
    label: "Account reps, portfolio",
    blurb: "Each account rep owns a book end to end and is judged on the growth of that portfolio and the sources that feed it.",
    departments: [
      { name: "Leadership", lead: "Principal / Owner", staff: [{ title: "Operations manager", measure: "Team output, data quality", hired: "2019-03-04" }] },
      { name: "Account management", lead: "Book of business lead", staff: [
        { title: "Senior account rep", count: 2, measure: "Portfolio growth, retention, cross-sell, referral volume", hired: "2017-05-02" },
        { title: "Account rep", count: 3, measure: "Portfolio growth, retention, account rounding", hired: "2024-08-19" },
      ] },
      { name: "Support", lead: "Support lead", staff: [
        { title: "Service support", count: 2, measure: "Ticket resolution, data hygiene", hired: "2022-02-07" },
      ] },
    ],
  },
};
// Meeting roster for the Tools tab. The Lava account team is real, resolved
// from the spine the same way the People tab does. Agency seats show roles
// until the agency CRM connector lands and the real names arrive.
const TOOLS_LAVA_ROLE = {
  Sales: "Sales manager",
  "Customer Success": "Account manager",
  Fulfillment: "Project manager",
  "Team Lead": "Managers",
};
const TOOLS_ROSTER = [
  { id: "ag-owner", name: "Agency owner", role: "Owner", side: "Agency" },
  { id: "ag-sales", name: "Sales manager", role: "Sales manager", side: "Agency" },
  { id: "ag-service", name: "Service manager", role: "Service manager", side: "Agency" },
  { id: "ag-am", name: "Account manager", role: "Account manager", side: "Agency" },
  { id: "ag-va", name: "Agency VA", role: "VA", side: "Agency" },
  ...Object.entries(CLIENT.roles).flatMap(([group, ids]) =>
    ids.map((id) => ({ id, name: nameOf(id), role: TOOLS_LAVA_ROLE[group] || "Project manager", side: "Lava" }))
  ),
];

const PINNED_MEETING = {
  meeting_date: "May 28, 2026",
  title: "Second quarter check in and automation scope",
  summary: "Reviewed virtual assistant coverage. Agreed to add lead routing automation. The photo release goes to the kickoff call with Niccole.",
  action_items: [
    { text: "Send the lead routing automation spec", owner_id: "6c082813-9f75-4d3f-a9e7-470e206f1288", done: false },
    { text: "Confirm virtual assistant hours for June", owner_id: "3028f71d-fd5a-496b-86dc-f57ee1bf8fc7", done: false },
    { text: "Pass the photo release to Niccole", owner_id: "0594b223-6f02-4f8e-9876-7f5af128c4de", done: true },
  ],
};
const GOALS = [
  { description: "Cut average response time under two minutes", status: "in_progress" },
  { description: "Onboard three more virtual assistants by July", status: "not_started" },
];
const ROCKS = [
  { title: "Launch the combo automation pilot", status: "on_track", owner_id: "0594b223-6f02-4f8e-9876-7f5af128c4de", quarter: "Q2 2026" },
  { title: "Migrate the CRM data", status: "off_track", owner_id: "c7c6d7b5-c646-4361-9412-eac5fc2e2c71", quarter: "Q2 2026" },
];
const RECS = [
  { icon: TrendingUp, text: "Response times slip in the afternoon. Add one virtual assistant to the second shift." },
  { icon: Lightbulb, text: "The agency runs three manual intake steps that automation can take over. Scope it this quarter." },
  { icon: AlertTriangle, text: "The CRM migration is behind. Raise it at the next one to one before it blocks the pilot." },
];

// ── Reporting data (all mock) ──────────────────────────────────────
const LEADS_BY_LINE = [
  { month: "Jan", personal: 42, commercial: 18 },
  { month: "Feb", personal: 48, commercial: 22 },
  { month: "Mar", personal: 39, commercial: 25 },
  { month: "Apr", personal: 55, commercial: 28 },
  { month: "May", personal: 61, commercial: 31 },
  { month: "Jun", personal: 58, commercial: 34 },
];
const NEW_BUSINESS = [
  { stage: "New", value: 64 }, { stage: "Contacted", value: 41 },
  { stage: "Quoted", value: 28 }, { stage: "Proposal", value: 17 }, { stage: "Won", value: 11 },
];
const SERVICE = [
  { stage: "Request", value: 31 }, { stage: "In progress", value: 19 },
  { stage: "Awaiting client", value: 12 }, { stage: "Resolved", value: 88 },
];
const REVIEWS_BY_MONTH = [
  { month: "Jan", count: 5 }, { month: "Feb", count: 7 }, { month: "Mar", count: 4 },
  { month: "Apr", count: 9 }, { month: "May", count: 11 }, { month: "Jun", count: 12 },
];
const KPIS = {
  customers: { value: "312", delta: "+18" },
  policies: { value: "1,184", delta: "+63" },
  tasks: { value: "47", delta: "-9", note: "open" },
  rating: { value: "4.8", delta: "+0.1", note: "213 reviews" },
};
const LEAD_LOSS = { lost: 23, dead: 14, onboarding: 6, retention: "94%" };

// ── Meeting log + meeting-mode content (mock) ──────────────────────
const MEETINGS = [
  { date: "Jun 25, 2026", type: "Monthly", title: "June review", status: "scheduled", scheduled: 60, actual: null, rating: 0,
    ranBy: "e8be31a4-ab3c-4a8c-8e7f-0fe09598d4de", dept: "Customer Success", recording: null, transcript: null,
    notes: "Agenda set. Confirm attendees the day before.", actionItems: [], wins: [], attendees: [{ name: "Niccole Peeler", side: "Lava", attended: false }, { name: "Robert Steele", side: "Agency", attended: false }] },
  { date: "May 28, 2026", type: "Monthly", title: "Second quarter check in and automation scope", status: "completed", scheduled: 60, actual: 18, rating: 3,
    ranBy: "0594b223-6f02-4f8e-9876-7f5af128c4de", dept: "Fulfillment", recording: "#recording-may28", transcript: "#transcript-may28",
    notes: "Reviewed virtual assistant coverage. Agreed to add lead routing automation. Darek to confirm June virtual assistant hours. Photo release handed to Niccole.",
    actionItems: [
      { text: "Confirm virtual assistant hours for June", owner_id: "3028f71d-fd5a-496b-86dc-f57ee1bf8fc7", due: "Jun 3", done: false },
      { text: "Send the lead routing automation spec", owner_id: "6c082813-9f75-4d3f-a9e7-470e206f1288", due: "Jun 12", done: false },
    ],
    wins: ["Virtual assistant coverage expanded to 15 deployed", "Average response time down under two hours"], attendees: [{ name: "Darek Chojnacki", side: "Lava", attended: true }, { name: "Princess Aguilar", side: "Lava", attended: true }, { name: "Robert Steele", side: "Agency", attended: true }, { name: "Service manager", side: "Agency", attended: false }] },
  { date: "May 14, 2026", type: "Monthly", title: "May project manager meeting", status: "no_show", scheduled: 30, actual: null, rating: 0,
    ranBy: "0594b223-6f02-4f8e-9876-7f5af128c4de", dept: "Fulfillment", recording: null, transcript: null,
    notes: "Owner did not join. Rescheduled to the following week.",
    actionItems: [{ text: "Reschedule the May review", owner_id: "0594b223-6f02-4f8e-9876-7f5af128c4de", due: "May 16", done: true }], wins: [], attendees: [{ name: "Darek Chojnacki", side: "Lava", attended: true }, { name: "Robert Steele", side: "Agency", attended: false }] },
  { date: "May 7, 2026", type: "Monthly", title: "Early May touch base", status: "canceled", scheduled: 30, actual: null, rating: 0,
    ranBy: "e8be31a4-ab3c-4a8c-8e7f-0fe09598d4de", dept: "Customer Success", recording: null, transcript: null,
    notes: "Client canceled the morning of. Rolled into the May review.", actionItems: [], wins: [], attendees: [{ name: "Niccole Peeler", side: "Lava", attended: false }, { name: "Robert Steele", side: "Agency", attended: false }] },
  { date: "Apr 30, 2026", type: "Monthly", title: "April review", status: "completed", scheduled: 60, actual: 22, rating: 3,
    ranBy: "e8be31a4-ab3c-4a8c-8e7f-0fe09598d4de", dept: "Customer Success", recording: "#recording-apr30", transcript: "#transcript-apr30",
    notes: "Onboarding wave one closed out. Response times improving. Asked for a testimonial.",
    actionItems: [{ text: "Send the testimonial request", owner_id: "e8be31a4-ab3c-4a8c-8e7f-0fe09598d4de", due: "May 5", done: true }],
    wins: ["Onboarding wave one closed out", "Response times improving"], attendees: [{ name: "Niccole Peeler", side: "Lava", attended: true }, { name: "Karla Jardeloza", side: "Lava", attended: true }, { name: "Robert Steele", side: "Agency", attended: true }] },
  { date: "Apr 1, 2026", type: "Kickoff", title: "Go live and kickoff", status: "completed", scheduled: 90, actual: 84, rating: 5,
    ranBy: "0594b223-6f02-4f8e-9876-7f5af128c4de", dept: "Fulfillment", recording: "#recording-apr1", transcript: "#transcript-apr1",
    notes: "Build went live. Photo release discussed. Sales and service training scheduled.",
    actionItems: [{ text: "Schedule sales and service training", owner_id: "3028f71d-fd5a-496b-86dc-f57ee1bf8fc7", due: "Apr 8", done: true }],
    wins: ["The build went live on schedule"], attendees: [{ name: "Darek Chojnacki", side: "Lava", attended: true }, { name: "Edmar Quirante", side: "Lava", attended: true }, { name: "Robert Steele", side: "Agency", attended: true }, { name: "Sales manager", side: "Agency", attended: true }, { name: "Service manager", side: "Agency", attended: true }] },
  { date: "Mar 4, 2026", type: "Kickoff", title: "Account start", status: "completed", scheduled: 60, actual: 58, rating: 4,
    ranBy: "9ed8884f-5f5c-44ea-a5f3-b7ce05c2235c", dept: "Insurance", recording: "#recording-mar4", transcript: "#transcript-mar4",
    notes: "Engagement began. Scope, goals, and agency makeup captured.",
    actionItems: [{ text: "Capture scope, goals, and agency makeup", owner_id: "9ed8884f-5f5c-44ea-a5f3-b7ce05c2235c", due: "Mar 4", done: true }],
    wins: ["Engagement kicked off"], attendees: [{ name: "Karla Jardeloza", side: "Lava", attended: true }, { name: "Darek Chojnacki", side: "Lava", attended: true }, { name: "Robert Steele", side: "Agency", attended: true }] },
];

const TOPICS = [
  "Welcome and agenda", "Pending tasks", "Personal and commercial lines",
  "New business and service pipelines", "Producer performance", "Lead sources",
  "Current projects", "Google reviews", "Next twelve months", "Wins and focus",
];
const TOPIC_NOTES = {
  "Welcome and agenda": "Set the frame. We are here to review the agency, not just the numbers. Walk the agenda, then dig in.",
  "Pending tasks": "Three items are open from last month. Lead with the one that blocks the pilot.",
  "Personal and commercial lines": "Personal lines is up three months running. Commercial lines lags. Name it.",
  "New business and service pipelines": "New business is healthy at the top. Service backs up at awaiting client. Flag the follow up gap.",
  "Producer performance": "Producer A carries new business. Producer D is light on quotes. Talk coaching, not blame.",
  "Lead sources": "Referrals convert best. Website volume is high but conversion lags. Shift spend toward what converts.",
  "Current projects": "CRM migration is behind and blocks the automation pilot. Be straight about it and give a date.",
  "Google reviews": "Rating climbed to 4.8. Ask for a steady cadence of review requests.",
  "Next twelve months": "Walk the roadmap. Confirm the next two items and who owns them.",
  "Wins and focus": "Close on wins, then one clear focus for next month.",
};
const PENDING_TASKS = [
  { text: "Send the lead routing automation spec", owner_id: "6c082813-9f75-4d3f-a9e7-470e206f1288", due: "Jun 12", status: "in_progress" },
  { text: "Confirm virtual assistant hours for June", owner_id: "3028f71d-fd5a-496b-86dc-f57ee1bf8fc7", due: "Jun 9", status: "not_started" },
  { text: "Finish the CRM data mapping", owner_id: "c7c6d7b5-c646-4361-9412-eac5fc2e2c71", due: "Jun 20", status: "off_track" },
];
const PROJECTS = [
  { name: "Lead routing automation", status: "in_progress", progress: 65 },
  { name: "CRM data migration", status: "off_track", progress: 40 },
  { name: "Virtual assistant onboarding wave two", status: "on_track", progress: 80 },
];
const ROADMAP = [
  { when: "Jun 2026", item: "Launch the lead routing automation", status: "in_progress" },
  { when: "Jul 2026", item: "Onboard three more virtual assistants", status: "not_started" },
  { when: "Aug 2026", item: "Commercial lines quoting automation", status: "not_started" },
  { when: "Q4 2026", item: "Service pipeline automation", status: "not_started" },
  { when: "Q1 2027", item: "Renewal review and expansion", status: "not_started" },
];

// Producer performance for new business (agency's own producers; sample names).
const PRODUCERS = [
  { name: "Producer A", bound: 18, premium: 142000, quotes: 54, close: 33 },
  { name: "Producer B", bound: 12, premium: 98000, quotes: 41, close: 29 },
  { name: "Producer C", bound: 9, premium: 71000, quotes: 38, close: 24 },
  { name: "Producer D", bound: 6, premium: 44000, quotes: 27, close: 22 },
];
// Performance by lead source.
const LEAD_SOURCES = [
  { source: "Referral", leads: 62, bound: 21, conversion: 34 },
  { source: "Website", leads: 88, bound: 19, conversion: 22 },
  { source: "Google", leads: 41, bound: 11, conversion: 27 },
  { source: "Cold outreach", leads: 53, bound: 7, conversion: 13 },
  { source: "Social", leads: 34, bound: 5, conversion: 15 },
];
const usd = (n) => "$" + (n / 1000).toFixed(0) + "k";

// ── KPI sheet data (Dulles monthly layout; mock figures for Steele) ────
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
const PREMIUM = [58, 71, 64, 88, 112, 124];        // $k per month
const BOOK = [8.7, 9.4, 10.2, 10.8, 11.0, 11.4];   // $M
const PL_LEADS = { created: [120, 134, 128, 145, 152, 149], quotes: [44, 51, 49, 56, 61, 60], automated: 99 };
const CL_LEADS = { created: [18, 22, 25, 28, 31, 34], quotes: [6, 7, 8, 9, 11, 12], automated: 99 };
const CUSTOMERS_M = { count: [3956, 3989, 4012, 4033, 4060, 4088], newBiz: 52, retention: 96 };
const POLICIES_M = { count: [4752, 4681, 4622, 4552, 4526, 4540], newBiz: 84 };
const TASKS_M = { completed: [2104, 2585, 3029, 3638, 3957, 4102], open: [["Rotting", 8440], ["Past due", 27], ["Today", 33], ["This week", 12], ["Next week", 6]] };
const REVIEW_COUNT = [58, 60, 67, 73, 96, 108];
const TOP_SOURCES = [{ source: "Ramsey", count: 17 }, { source: "Customer referral", count: 15 }, { source: "Cross sale", count: 12 }, { source: "Call in", count: 7 }, { source: "Website", count: 6 }];
const FORM_COUNTS = [["Get a quote", 16], ["Fast app, personal lines", 13], ["Life changes survey", 21], ["SMS consent", 5], ["Service request", 2], ["Fast app, commercial lines", 1]];

// ── Tools tab: metrics, agency snapshot, and commitment, from reporting ──
const _last = (a) => a[a.length - 1];
const _prev = (a) => a[a.length - 2];
const _bucket = (k) => (TASKS_M.open.find(([key]) => key === k) || [null, 0])[1];
const _leadsM = _last(PL_LEADS.created) + _last(CL_LEADS.created);
const _quotesM = _last(PL_LEADS.quotes) + _last(CL_LEADS.quotes);

const TOOLS_METRICS = {
  leads: _leadsM,
  conv: Math.round((100 * _quotesM) / _leadsM),
  sources: TOP_SOURCES.length,
  auto: PL_LEADS.automated,
  pipes: 71,
  reviews: _last(REVIEW_COUNT) - _prev(REVIEW_COUNT),
  tasks: _bucket("Past due"),
  forms: 68,
  book: Math.round((100 * (_last(BOOK) - BOOK[0])) / BOOK[0]),
};

const TOOLS_AGENCY = {
  name: CLIENT.company_name,
  stats: [
    { k: "Monthly premium", v: `${_last(PREMIUM)}k` },
    { k: "Book of business", v: `${_last(BOOK)}M` },
    { k: "Customers", v: _last(CUSTOMERS_M.count).toLocaleString() },
    { k: "Policies", v: _last(POLICIES_M.count).toLocaleString() },
  ],
};

const TOOLS_COMMITMENT = {
  plan: CLIENT.service_status === "monthly" ? "Monthly" : CLIENT.service_status === "quarterly" ? "Quarterly" : "Ad hoc",
  tasks: {
    done: _last(TASKS_M.completed) - _prev(TASKS_M.completed),
    open: _bucket("Today") + _bucket("This week") + _bucket("Next week"),
    pastDue: _bucket("Past due"),
  },
};
const sum = (a) => a.reduce((s, n) => s + n, 0);
const leadToQuote = (l) => Math.round((sum(l.quotes) / sum(l.created)) * 100);

// Days-since reference. Production: compute from now().
const TODAY = new Date("2026-06-06");
const daysSince = (iso) => (iso ? Math.round((TODAY - new Date(iso)) / 86400000) : null);

// Last time each Lava role met with the client (derived from meeting attendance).
const CADENCE = [
  { role: "Director", who: "Darek Chojnacki", date: "2026-05-28" },
  { role: "Project manager", who: "Guila Rose Rubis", date: "2026-05-14" },
  { role: "Account manager", who: "Karla Jardeloza", date: "2026-04-30" },
  { role: "Team lead", who: "Edmar Quirante", date: "2026-05-07" },
];

// The closing asks a PM should make. last = last meeting where the ask was made.
const ASKS = [
  { key: "testimonial", label: "Asked for a testimonial", last: "2026-05-14", measured: true, quarter_count: 2 },
  { key: "referral", label: "Asked for a referral", last: "2026-04-30" },
  { key: "cross_sell", label: "Pitched a cross sell on a commercial client", last: "2026-03-18" },
  { key: "expand", label: "Offered more virtual assistant or automation help", last: "2026-05-28" },
  { key: "agency_referral", label: "Asked if they know an agency that needs us", last: null },
];

// Ad hoc time against the $1,500 prepaid. pm_director $150/hr, backend $50/hr.
const TIME_ENTRIES = [
  { date: "May 9", kind: "pm_director", hours: 1.5, rate: 150, note: "Quarterly review prep" },
  { date: "May 16", kind: "backend", hours: 2, rate: 50, note: "Updated lead routing zap" },
  { date: "May 22", kind: "backend", hours: 1, rate: 50, note: "Rebuilt intake form" },
];
const STATUS_LABELS = { onboarding: "Onboarding", monthly: "Monthly", quarterly: "Quarterly", ad_hoc: "Ad hoc", canceled: "Canceled" };
const CANCELLATION_TASKS = [
  "Remove shared passwords from the password manager",
  "Archive and remove client documentation",
  "Disconnect the CRM integration",
  "Disconnect Zapier zaps",
  "Disconnect and hand off forms",
  "Add the account to the cancellation spreadsheet",
  "Confirm no remaining connections to Lava systems",
];

// Spine-owned, append-only.
function logActivity(action, entity_type, entity_id, details = {}) {
  console.log("[activity_log]", {
    app: "client_profile", actor_id: SESSION.id, actor_email: SESSION.email,
    action, entity_type, entity_id, details, created_at: new Date().toISOString(),
  });
}

// ── mono helper components ─────────────────────────────────────────
function Monogram({ name, bg = B.darkBlue, color = B.white, size = 30 }) {
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("");
  return (
    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: size, height: size, borderRadius: "50%", background: bg, color, fontSize: size * 0.4, fontWeight: 500, flexShrink: 0 }}>{initials}</span>
  );
}
// Headshot placeholder. A VA captures a real one from the recording; this is
// the stand-in that fills the slot so you can see the photo workflow.
function svgPortrait(name) {
  const pairs = [["#145365", "#1f6e82"], ["#24242D", "#3a3a47"], ["#0f3d49", "#176173"]];
  const [c1, c2] = pairs[(name.charCodeAt(0) || 0) % pairs.length];
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='${c1}'/><stop offset='1' stop-color='${c2}'/></linearGradient></defs><rect width='80' height='80' fill='url(#g)'/><circle cx='40' cy='33' r='14' fill='rgba(255,255,255,0.9)'/><path d='M17 73c2-15 11-21 23-21s21 6 23 21z' fill='rgba(255,255,255,0.9)'/></svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}
function PhotoAvatar({ name, photo, size = 34, bg = B.darkBlue, onCapture }) {
  return (
    <span style={{ position: "relative", width: size, height: size, flexShrink: 0, display: "inline-block" }}>
      {photo
        ? <img src={photo} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", display: "block" }} />
        : <Monogram name={name} size={size} bg={bg} />}
      {onCapture && (
        <button onClick={onCapture} title={photo ? "Recapture from recording" : "Capture headshot from recording"}
          style={{ position: "absolute", right: -2, bottom: -2, width: Math.max(14, size * 0.42), height: Math.max(14, size * 0.42), borderRadius: "50%", border: `1.5px solid ${B.white}`, background: B.teal, color: B.white, display: "grid", placeItems: "center", cursor: "pointer", padding: 0 }}>
          <Camera size={Math.max(8, size * 0.26)} />
        </button>
      )}
    </span>
  );
}
function UploadAvatar({ name, photo, size = 36, bg = B.darkBlue, onUpload }) {
  const onChange = (e) => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const r = new FileReader(); r.onload = () => onUpload(r.result); r.readAsDataURL(f); e.target.value = "";
  };
  return (
    <label title="Upload a photo" style={{ position: "relative", width: size, height: size, flexShrink: 0, display: "inline-block", cursor: "pointer" }}>
      {photo
        ? <img src={photo} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", display: "block" }} />
        : <Monogram name={name} size={size} bg={bg} />}
      <span style={{ position: "absolute", right: -2, bottom: -2, width: Math.max(14, size * 0.42), height: Math.max(14, size * 0.42), borderRadius: "50%", border: `1.5px solid ${B.white}`, background: B.teal, color: B.white, display: "grid", placeItems: "center" }}>
        <Camera size={Math.max(8, size * 0.26)} />
      </span>
      <input type="file" accept="image/*" onChange={onChange} style={{ display: "none" }} />
    </label>
  );
}
function Card({ children, style }) {
  return <div style={{ background: B.white, border: `1px solid ${N.line}`, borderRadius: 12, padding: "18px 20px", ...style }}>{children}</div>;
}
function Modal({ title, onClose, children, maxWidth = 1000 }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(27,18,11,0.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px", zIndex: 1000, overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: B.white, borderRadius: 14, width: "100%", maxWidth, boxShadow: "0 20px 60px rgba(27,18,11,0.25)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 20px", borderBottom: `1px solid ${N.line}` }}>
          <span style={{ ...DISPLAY, fontSize: 14, color: B.darkBlue }}>{title}</span>
          <button onClick={onClose} title="Close" style={{ marginLeft: "auto", width: 30, height: 30, borderRadius: 8, border: `1px solid ${N.line}`, background: B.white, color: N.muted, cursor: "pointer", display: "grid", placeItems: "center", padding: 0 }}><X size={16} /></button>
        </div>
        <div style={{ padding: 18, maxHeight: "calc(100vh - 170px)", overflowY: "auto" }}>{children}</div>
      </div>
    </div>
  );
}
// Drill-in for a rock, to-do, or issue: notes, dates, assignment, and history.
function ItemDetailModal({ kind, item, onPatch, onClose }) {
  const inp = { width: "100%", boxSizing: "border-box", fontFamily: FONT_BODY, fontSize: 13.5, color: B.black, border: `1px solid ${N.line}`, borderRadius: 8, padding: "8px 10px" };
  const lbl = { ...DISPLAY, fontSize: 9.5, color: N.faint, marginBottom: 5, display: "block" };
  const title = kind === "rock" ? "Project" : kind === "todo" ? "To-do" : "Issue";
  const hist = [];
  hist.push(item.owner ? `Assigned to ${item.owner}` : "Unassigned");
  if (item.due) hist.push(`Due ${item.due}`);
  if (kind === "rock") hist.push(item.status === "off_track" ? "Marked off track" : "On track");
  if (kind === "todo") hist.push(item.done ? "Marked done" : "Open, carries to the next meeting");
  if (kind === "issue") hist.push(item.status === "resolved" ? "Resolved" : "Open, carries to the next meeting");
  return (
    <Modal title={title + " detail"} onClose={onClose} maxWidth={620}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div><span style={lbl}>Title</span><input value={item.title || ""} onChange={(e) => onPatch({ title: e.target.value })} style={inp} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><span style={lbl}>Assigned to</span>
            <select value={item.owner || ""} onChange={(e) => onPatch({ owner: e.target.value })} style={inp}>
              <option value="">Unassigned</option>
              <optgroup label="My team (Lava)">{LAVA_TEAM.map((n) => <option key={n} value={n}>{n}</option>)}</optgroup>
              <optgroup label="Agency team">{AGENCY_TEAM.map((n) => <option key={n} value={n}>{n}</option>)}</optgroup>
            </select>
          </div>
          {kind !== "issue" && <div><span style={lbl}>Due date</span><input type="date" value={item.due || ""} onChange={(e) => onPatch({ due: e.target.value })} style={inp} /></div>}
          {kind === "rock" && <div><span style={lbl}>Status</span><select value={item.status} onChange={(e) => onPatch({ status: e.target.value })} style={inp}><option value="on_track">On-Track</option><option value="off_track">Off-Track</option></select></div>}
        </div>
        {kind === "todo" && <label style={{ display: "inline-flex", alignItems: "center", gap: 9, fontSize: 13.5, color: B.black, cursor: "pointer" }}><input type="checkbox" checked={!!item.done} onChange={() => onPatch({ done: !item.done })} /> Done</label>}
        {kind === "issue" && <label style={{ display: "inline-flex", alignItems: "center", gap: 9, fontSize: 13.5, color: B.black, cursor: "pointer" }}><input type="checkbox" checked={item.status === "resolved"} onChange={() => onPatch({ status: item.status === "resolved" ? "open" : "resolved" })} /> Resolved</label>}
        <div><span style={lbl}>Notes</span><textarea value={item.notes || ""} placeholder="Notes" onChange={(e) => onPatch({ notes: e.target.value })} rows={4} style={{ ...inp, resize: "vertical", fontFamily: FONT_BODY }} /></div>
        <div>
          <span style={lbl}>History</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {hist.map((h, i) => <div key={i} style={{ fontSize: 12.5, color: N.muted }}>• {h}</div>)}
          </div>
          <div style={{ fontSize: 11.5, color: N.faint, marginTop: 8 }}>Full change history reads from the activity log in production.</div>
        </div>
      </div>
    </Modal>
  );
}
// Generic record editor: a table of fields plus notes, save in place.
function RecordModal({ title, fields, values, onPatch, onClose, maxWidth = 620 }) {
  const inp = { width: "100%", boxSizing: "border-box", fontFamily: FONT_BODY, fontSize: 13.5, color: B.black, border: `1px solid ${N.line}`, borderRadius: 8, padding: "8px 10px" };
  const render = (f) => {
    const v = values[f.key];
    if (f.type === "textarea") return <textarea value={v || ""} rows={f.rows || 4} onChange={(e) => onPatch(f.key, e.target.value)} style={{ ...inp, resize: "vertical", fontFamily: FONT_BODY }} />;
    if (f.type === "select") return <select value={v || ""} onChange={(e) => onPatch(f.key, e.target.value)} style={inp}>{f.options.map((o) => (typeof o === "string" ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}</select>;
    if (f.type === "date") return <input type="date" value={v || ""} onChange={(e) => onPatch(f.key, e.target.value)} style={inp} />;
    if (f.type === "number") return <input type="number" value={v == null ? "" : v} onChange={(e) => onPatch(f.key, e.target.value)} style={inp} />;
    return <input value={v || ""} onChange={(e) => onPatch(f.key, e.target.value)} style={inp} />;
  };
  return (
    <Modal title={title} onClose={onClose} maxWidth={maxWidth}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          {fields.map((f) => (
            <tr key={f.key} style={{ borderTop: `1px solid ${N.line}`, verticalAlign: "top" }}>
              <td style={{ padding: "12px 12px 12px 0", width: 130, ...DISPLAY, fontSize: 9.5, color: N.faint }}>{f.label}</td>
              <td style={{ padding: "9px 0" }}>{render(f)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Modal>
  );
}
// Drill-in to edit a person's information as a table.
function PersonModal({ person, fields, onPatch, onClose }) {
  const inp = { width: "100%", boxSizing: "border-box", fontFamily: FONT_BODY, fontSize: 13.5, color: B.black, border: `1px solid ${N.line}`, borderRadius: 8, padding: "8px 10px" };
  return (
    <Modal title={(person.name || "Person") + " details"} onClose={onClose} maxWidth={560}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          {fields.map((f) => (
            <tr key={f.key} style={{ borderTop: `1px solid ${N.line}` }}>
              <td style={{ padding: "10px 12px 10px 0", width: 130, ...DISPLAY, fontSize: 9.5, color: N.faint, verticalAlign: "middle" }}>{f.label}</td>
              <td style={{ padding: "8px 0" }}><input value={person[f.key] || ""} placeholder={f.label} onChange={(e) => onPatch(f.key, e.target.value)} style={inp} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Modal>
  );
}
function SectionHeading({ icon: Icon, children, color = B.darkBlue }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
      {Icon && <Icon size={17} color={color} strokeWidth={2} />}
      <span style={{ ...DISPLAY, fontSize: 13, color }}>{children}</span>
    </div>
  );
}
const STATUS = {
  in_progress: { label: "in progress", bg: "rgba(36,36,45,0.08)", fg: B.darkBlue },
  on_track: { label: "on track", bg: "rgba(36,36,45,0.08)", fg: B.darkBlue },
  at_risk: { label: "at risk", bg: "rgba(231,56,53,0.10)", fg: B.red },
  behind: { label: "behind", bg: B.red, fg: B.white },
  off_track: { label: "off track", bg: "rgba(231,56,53,0.10)", fg: B.red },
  not_started: { label: "not started", bg: N.fill, fg: N.muted },
  done: { label: "done", bg: N.fill, fg: N.muted },
  completed: { label: "completed", bg: N.fill, fg: N.muted },
  scheduled: { label: "scheduled", bg: "rgba(36,36,45,0.08)", fg: B.darkBlue },
  no_show: { label: "no show", bg: "rgba(231,56,53,0.10)", fg: B.red },
  follow_up_needed: { label: "follow up", bg: "rgba(231,56,53,0.10)", fg: B.red },
  rescheduled: { label: "rescheduled", bg: "rgba(36,36,45,0.08)", fg: B.darkBlue },
  canceled: { label: "canceled", bg: N.fill, fg: N.faint },
};
function Pill({ status }) {
  const s = STATUS[status];
  return <span style={{ fontSize: 11, fontWeight: 500, background: s.bg, color: s.fg, padding: "3px 10px", borderRadius: 8, whiteSpace: "nowrap" }}>{s.label}</span>;
}

// ── Tools: the Lava Way client toolkit ─────────────────────────────
// Representative scaffold. The specific levers, the SOP list, and the
// benchmark bands are Lava IP and should be sourced from the conversion
// strategy doc and the agency's own numbers, not these placeholders.
function FixTag({ label }) {
  return <span style={{ fontSize: 11.5, fontWeight: 500, color: B.darkBlue, background: "rgba(36,36,45,0.06)", border: `1px solid ${N.line}`, padding: "3px 9px", borderRadius: 7, whiteSpace: "nowrap" }}>{label}</span>;
}
function SopState({ state }) {
  const map = {
    live: { bg: "rgba(36,36,45,0.08)", fg: B.darkBlue },
    "in review": { bg: N.fill, fg: N.muted },
    drafting: { bg: "rgba(231,56,53,0.10)", fg: B.red },
  };
  const s = map[state] || map["in review"];
  return <span style={{ fontSize: 11, fontWeight: 500, background: s.bg, color: s.fg, padding: "3px 10px", borderRadius: 8 }}>{state}</span>;
}
function BenchmarkRow({ b }) {
  const pos = (v) => Math.max(0, Math.min(100, (v / b.max) * 100));
  const markColor = b.ahead ? B.darkBlue : B.red;
  return (
    <div style={{ padding: "12px 0", borderTop: `1px solid ${N.line}` }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 9 }}>
        <span style={{ fontSize: 14, color: B.black, fontWeight: 500 }}>{b.metric}</span>
        <span style={{ fontSize: 13, color: markColor, fontWeight: 600 }}>{b.you}{b.unit}</span>
        <span style={{ fontSize: 12, color: N.faint, marginLeft: "auto" }}>{b.ahead ? "Ahead of similar agencies" : "Room to grow"}. Next level {b.next}.</span>
      </div>
      <div style={{ position: "relative", height: 8, background: N.fill, borderRadius: 6 }}>
        <div style={{ position: "absolute", left: `${pos(b.lo)}%`, width: `${pos(b.hi) - pos(b.lo)}%`, top: 0, bottom: 0, background: "rgba(36,36,45,0.14)", borderRadius: 6 }} />
        <div style={{ position: "absolute", left: `calc(${pos(b.you)}% - 5px)`, top: -3, width: 10, height: 14, background: markColor, borderRadius: 3 }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: N.faint, marginTop: 5 }}>
        <span>Similar agencies {b.lo}{b.unit} to {b.hi}{b.unit}</span>
        <span>{b.max}{b.unit}</span>
      </div>
    </div>
  );
}

// ── Header ─────────────────────────────────────────────────────────
function photoState(c) {
  if (c.photo_release_signed && c.photo_url) return { kind: "headshot", src: c.photo_url };
  if (c.caricature_url) return { kind: "caricature", src: c.caricature_url };
  return { kind: "logo", src: c.logo_url };
}
function Header({ client, agency, onBack, logo, onLogo }) {
  const photo = photoState(client);
  const contacts = client.primary_contact_ids.map(nameOf);
  const name = agency ? agency.name : client.company_name;
  const product = agency ? agency.product : client.product_mix;
  const st = agency ? STATUS[agency.status] : null;
  const stStyle = agency && agency.status === "on_track" ? { bg: B.white, fg: B.darkBlue } : { bg: B.red, fg: B.white };
  const handleLogo = (e) => { const f = e.target.files && e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => onLogo && onLogo(r.result); r.readAsDataURL(f); e.target.value = ""; };
  const src = logo || photo.src;
  return (
    <div style={{ background: B.darkBlue, padding: "18px 28px" }}>
      {onBack && (
        <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.08)", border: "none", color: "rgba(255,255,255,0.85)", fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, padding: "6px 11px", borderRadius: 8, cursor: "pointer", marginBottom: 14 }}>
          <ChevronLeft size={14} /> All accounts
        </button>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <label title="Upload agency logo" style={{ position: "relative", width: 64, height: 64, borderRadius: 12, flexShrink: 0, background: B.white, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", cursor: "pointer" }}>
          {src
            ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: logo ? "contain" : "cover" }} />
            : <span style={{ ...DISPLAY, fontSize: 22, color: B.darkBlue }}>{name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>}
          <span style={{ position: "absolute", right: 3, bottom: 3, width: 18, height: 18, borderRadius: "50%", border: `1.5px solid ${B.white}`, background: B.teal, color: B.white, display: "grid", placeItems: "center" }}><Camera size={10} /></span>
          <input type="file" accept="image/*" onChange={handleLogo} style={{ display: "none" }} />
        </label>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...DISPLAY, fontSize: 22, color: B.white, lineHeight: 1.1 }}>{name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 9, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 600, background: B.red, color: B.white, padding: "3px 11px", borderRadius: 8 }}>{product}</span>
            {st
              ? <span style={{ fontSize: 12, fontWeight: 600, background: stStyle.bg, color: stStyle.fg, padding: "3px 11px", borderRadius: 8 }}>{st.label}</span>
              : <span style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}>{client.account_stage}</span>}
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>|</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
              <Building2 size={14} color="rgba(255,255,255,0.55)" />
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}>{agency ? "PM: " + agency.pm : contacts.join(", ")}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tabs ───────────────────────────────────────────────────────────
// ── Fulfillment department: all agencies (master list + benchmarking) ──
// Steele is the fully worked profile; the rest populate from their own
// records once connected. Status is the on/off track read for the PM.
const AGENCIES = [
  { id: "steele",  name: "Steele Insurance Agency",   pm: "Darek Chojnacki", product: "Combo",      status: "on_track",  pct: 58, lastMtg: "2026-05-28", bench: { ltq: 33, auto: 98, ret: 96, rev: 65 } },
  { id: "dulles",  name: "Dulles Insurance Services", pm: "Karla Jardeloza", product: "Automation", status: "at_risk",   pct: 44, lastMtg: "2026-05-12", bench: { ltq: 29, auto: 91, ret: 93, rev: 40 } },
  { id: "harbor",  name: "Harbor Risk Partners",      pm: "Niccole Peeler",  product: "VA",         status: "on_track",  pct: 72, lastMtg: "2026-05-26", bench: { ltq: 41, auto: 88, ret: 95, rev: 52 } },
  { id: "summit",  name: "Summit Coverage Group",     pm: "Darek Chojnacki", product: "Combo",      status: "off_track", pct: 31, lastMtg: "2026-03-18", bench: { ltq: 24, auto: 70, ret: 90, rev: 20 } },
  { id: "oakline", name: "Oakline Insurance",         pm: "Karla Jardeloza", product: "MSP",        status: "on_track",  pct: 80, lastMtg: "2026-05-30", bench: { ltq: 45, auto: 96, ret: 97, rev: 60 } },
  { id: "verde",   name: "Verde Agency Group",        pm: "Niccole Peeler",  product: "VA",         status: "at_risk",   pct: 50, lastMtg: "2026-04-30", bench: { ltq: 31, auto: 85, ret: 92, rev: 35 } },
];
const BENCH_METRICS = [
  { key: "ltq",  label: "Lead to quote",     net: 42 },
  { key: "auto", label: "Percent automated", net: 95 },
  { key: "ret",  label: "Retention",         net: 91 },
  { key: "rev",  label: "Review growth",     net: 40 },
];

const TABS = ["Overview", "LAVA OS", "General", "CRM", "Forms", "Reporting", "Meetings", "Requests", "People", "Timeline"];
function TabNav({ active, onChange }) {
  return (
    <div style={{ display: "flex", gap: 24, padding: "0 28px", borderBottom: `1px solid ${N.line}`, background: B.white, flexWrap: "wrap" }}>
      {TABS.map((t) => {
        const on = t === active;
        return (
          <button key={t} onClick={() => onChange(t)} style={{ background: "none", border: "none", cursor: "pointer", padding: "15px 0", fontFamily: FONT_BODY, fontSize: 14, fontWeight: on ? 600 : 400, color: on ? B.darkBlue : N.muted, borderBottom: `2px solid ${on ? B.red : "transparent"}`, marginBottom: -1 }}>{t}</button>
        );
      })}
    </div>
  );
}

// ── Overview ───────────────────────────────────────────────────────
// ── Engagement cadence + asks ──────────────────────────────────────
function DaysBadge({ days }) {
  if (days == null) return <span style={{ fontSize: 12, fontWeight: 600, color: B.red }}>not yet</span>;
  const color = days > 30 ? B.red : days > 14 ? N.muted : B.darkBlue;
  return <span style={{ fontSize: 13, fontWeight: 600, color }}>{days} days</span>;
}
function CadenceCard({ onJump = () => {} }) {
  return (
    <Card>
      <SectionHeading icon={Clock}>Days since last meeting</SectionHeading>
      <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
        {CADENCE.map((c) => (
          <button key={c.role} onClick={() => onJump(c.role === "Director" ? "director" : "all")} title="Open in Meetings" style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", width: "100%" }}>
            <span style={{ flex: 1, color: B.black }}>{c.role}<span style={{ color: N.faint }}> · {c.who.split(" ")[0]}</span></span>
            <DaysBadge days={daysSince(c.date)} />
          </button>
        ))}
      </div>
    </Card>
  );
}
function AsksCard() {
  return (
    <Card>
      <SectionHeading icon={MessageSquare}>Asks, days since last</SectionHeading>
      <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
        {ASKS.map((a) => (
          <div key={a.key} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5 }}>
            <span style={{ flex: 1, color: B.black }}>{a.label}</span>
            <DaysBadge days={daysSince(a.last)} />
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${N.line}`, fontSize: 12, color: N.faint }}>
        Project managers are measured on testimonials asked. This quarter, {ASKS.find((a) => a.key === "testimonial").quarter_count}.
      </div>
    </Card>
  );
}
function AsksPanel({ done, toggle }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Quote size={15} color={B.red} />
        <span style={{ ...DISPLAY, fontSize: 11, color: N.muted }}>Asks to make this meeting</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {ASKS.map((a, i) => (
          <div key={a.key} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
            <span onClick={() => toggle(i)} style={{ width: 17, height: 17, borderRadius: 5, flexShrink: 0, cursor: "pointer", border: done[i] ? "none" : `1.5px solid ${N.faint}`, background: done[i] ? B.darkBlue : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>{done[i] && <Check size={12} color={B.white} strokeWidth={3} />}</span>
            <span style={{ flex: 1, color: done[i] ? N.faint : B.black, textDecoration: done[i] ? "line-through" : "none" }}>{a.label}</span>
            <DaysBadge days={daysSince(a.last)} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Overview({ rocks = [], todos = [], setRocks = () => {}, setTodos = () => {}, photos = {}, onJumpToMeetings = () => {}, vas = VAS, goals = GOALS, recentMeeting = PINNED_MEETING, vaStartDate = CLIENT.va_start_date }) {
  const [detail, setDetail] = useState(null);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.7fr) minmax(0,1fr)", gap: 18 }}>
      {detail && (() => {
        const list = detail.kind === "rock" ? rocks : todos;
        const it = list.find((x) => x.id === detail.id);
        if (!it) return null;
        const patch = (pt) => detail.kind === "rock" ? setRocks((rs) => rs.map((r) => (r.id === detail.id ? { ...r, ...pt } : r))) : setTodos((ts) => ts.map((t) => (t.id === detail.id ? { ...t, ...pt } : t)));
        return <ItemDetailModal kind={detail.kind} item={it} onPatch={patch} onClose={() => setDetail(null)} />;
      })()}
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <Card style={{ borderTop: `3px solid ${B.teal}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: vas.length ? 14 : 0 }}>
            <Headset size={17} color={B.teal} />
            <span style={{ ...DISPLAY, fontSize: 13, color: B.teal }}>Virtual assistant</span>
            <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: vas.length ? B.darkBlue : B.red, background: vas.length ? "rgba(36,36,45,0.07)" : "rgba(231,56,53,0.10)", padding: "4px 12px", borderRadius: 999 }}>{vas.length ? `Yes · ${vas.length} deployed` : "No VA deployed yet"}</span>
          </div>
          {vas.length > 0 && (
            <>
              <div style={{ fontSize: 12.5, color: N.muted, marginBottom: 14 }}>VA support started {vaStartDate}.</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 13 }}>
                {vas.map((v) => (
                  <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    {photos[v.id]
                      ? <img src={photos[v.id]} alt={v.name} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                      : <Monogram name={v.name} size={36} bg={B.teal} />}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: B.black, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.name}</div>
                      <div style={{ fontSize: 11.5, color: N.faint }}>Started {v.started || vaStartDate}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
        <Card style={{ borderTop: `3px solid ${B.red}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: B.red, fontWeight: 500, marginBottom: 10 }}>
            <Pin size={13} /><span>Pinned, most recent meeting</span>
            {recentMeeting && <span style={{ marginLeft: "auto", color: N.muted, fontWeight: 400, display: "inline-flex", alignItems: "center", gap: 5 }}><CalendarDays size={13} />{recentMeeting.meeting_date}</span>}
          </div>
          {recentMeeting ? (
            <>
              <div style={{ fontSize: 16, fontWeight: 600, color: B.black, marginBottom: 8 }}>{recentMeeting.title}</div>
              <div style={{ fontSize: 14, color: N.muted, lineHeight: 1.65, marginBottom: 16 }}>{recentMeeting.summary || "No notes recorded."}</div>
              {(recentMeeting.action_items || []).length > 0 && (
                <>
                  <div style={{ ...DISPLAY, fontSize: 11, color: N.muted, marginBottom: 10 }}>Action items</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                    {recentMeeting.action_items.map((a, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
                        <span style={{ width: 17, height: 17, borderRadius: 5, flexShrink: 0, border: a.done ? "none" : `1.5px solid ${N.faint}`, background: a.done ? B.darkBlue : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>{a.done && <Check size={12} color={B.white} strokeWidth={3} />}</span>
                        <span style={{ color: a.done ? N.faint : B.black, textDecoration: a.done ? "line-through" : "none", flex: 1 }}>{a.text}</span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: N.muted, fontSize: 12.5 }}><Monogram name={nameOf(a.owner_id)} size={22} /> {nameOf(a.owner_id)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : <div style={{ fontSize: 13, color: N.faint }}>No meetings logged for this account yet.</div>}
        </Card>
        <Card>
          <SectionHeading icon={Target}>Client goals</SectionHeading>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {goals.length === 0 && <div style={{ fontSize: 13, color: N.faint }}>No goals set yet.</div>}
            {goals.map((g, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14 }}>
                <span style={{ flex: 1, color: B.black }}>{g.description}</span><Pill status={g.status} />
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <SectionHeading icon={Flag}>Rocks</SectionHeading>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {rocks.length === 0 && <div style={{ fontSize: 13, color: N.faint }}>No rocks yet.</div>}
            {rocks.map((r) => (
              <div key={r.id} onClick={() => setDetail({ kind: "rock", id: r.id })} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14, cursor: "pointer" }}>
                <span style={{ flex: 1, color: B.black }}>{r.title || "Untitled rock"}{r.owner ? <span style={{ color: N.faint }}> · {r.owner}</span> : null}</span>
                {r.due && <span style={{ fontSize: 11.5, color: N.muted }}>{r.due}</span>}
                <Pill status={r.status} />
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <SectionHeading icon={ListChecks}>Open to-dos</SectionHeading>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {todos.filter((t) => !t.done).length === 0 && <div style={{ fontSize: 13, color: N.faint }}>No open to-dos.</div>}
            {todos.filter((t) => !t.done).map((t) => (
              <div key={t.id} onClick={() => setDetail({ kind: "todo", id: t.id })} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, cursor: "pointer" }}>
                <span style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${N.faint}`, flexShrink: 0 }} />
                <span style={{ flex: 1, color: B.black }}>{t.title || "Untitled"}</span>
                {t.owner && <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: N.muted, fontSize: 12.5 }}><Monogram name={t.owner} size={20} /> {t.owner}</span>}
                {t.due && <span style={{ fontSize: 11.5, color: N.muted }}>{t.due}</span>}
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18, alignSelf: "start" }}>
        <CadenceCard onJump={onJumpToMeetings} />
        <div style={{ background: N.fill, border: `1px solid ${N.line}`, borderRadius: 12, padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 16 }}>
            <Sparkles size={17} color={B.darkBlue} />
            <span style={{ ...DISPLAY, fontSize: 13, color: B.darkBlue }}>Recommendations</span>
            <span style={{ marginLeft: "auto", fontSize: 10.5, fontWeight: 500, color: N.muted, background: B.white, border: `1px solid ${N.line}`, padding: "2px 8px", borderRadius: 8 }}>mocked</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
            {RECS.map((r, i) => { const Icon = r.icon; return (
              <div key={i} style={{ display: "flex", gap: 10, fontSize: 13.5, lineHeight: 1.5, color: B.black }}>
                <Icon size={16} color={B.darkBlue} style={{ flexShrink: 0, marginTop: 2 }} /><span>{r.text}</span>
              </div>
            ); })}
          </div>
          <div style={{ marginTop: 16, paddingTop: 13, borderTop: `1px solid ${N.line}`, fontSize: 11.5, color: N.faint }}>Reads brain.signals() once the brain lands.</div>
        </div>
        <AsksCard />
      </div>
    </div>
  );
}

// ── General ────────────────────────────────────────────────────────
function Fact({ label, value }) {
  return (
    <div>
      <div style={{ ...DISPLAY, fontSize: 10.5, color: N.faint, marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 15, color: B.black, fontWeight: 500 }}>{value}</div>
    </div>
  );
}
function DateRow({ label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
      <span style={{ width: 130, flexShrink: 0, fontSize: 13, color: N.muted }}>{label}</span>
      <span style={{ fontSize: 14, color: B.black, fontWeight: 500 }}>{value}</span>
    </div>
  );
}
function MeetingLog({ meetings }) {
  const [open, setOpen] = useState(null);
  const [ratings, setRatings] = useState(() => meetings.map((m) => m.rating || 0));
  const setRating = (i, r) => setRatings((rs) => rs.map((x, j) => (j === i ? (x === r ? 0 : r) : x)));

  const [att, setAtt] = useState(() => meetings.map((m) => (m.attendees || []).map((a) => !!a.attended)));
  const toggleAtt = (i, j) => setAtt((prev) => prev.map((row, ri) => (ri === i ? row.map((v, ci) => (ci === j ? !v : v)) : row)));
  const [data, setData] = useState(() => meetings.map((m) => ({ ...m })));
  const [edit, setEdit] = useState(null);

  const timed = meetings.filter((m) => m.actual != null && m.scheduled);
  const avgUtil = timed.length ? Math.round((timed.reduce((a, m) => a + m.actual / m.scheduled, 0) / timed.length) * 100) : null;
  const shortOnes = timed.filter((m) => m.actual / m.scheduled < 0.5);
  const trend = shortOnes.length >= 2;

  const Stars = ({ i }) => (
    <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} onClick={() => setRating(i, n)} title={`${n} of 5`} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 0 }}>
          <Star size={15} color={n <= ratings[i] ? B.red : N.line} fill={n <= ratings[i] ? B.red : "none"} />
        </button>
      ))}
    </div>
  );

  return (
    <div>
      {avgUtil != null && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 9, padding: "11px 14px", borderRadius: 9, marginBottom: 12, background: trend ? "rgba(231,56,53,0.07)" : N.fill, border: `1px solid ${trend ? "rgba(231,56,53,0.25)" : N.line}` }}>
          {trend ? <AlertTriangle size={15} color={B.red} style={{ marginTop: 1, flexShrink: 0 }} /> : <Clock size={15} color={N.muted} style={{ marginTop: 1, flexShrink: 0 }} />}
          <div style={{ fontSize: 13, color: B.black, lineHeight: 1.55 }}>
            {trend
              ? `Heads up. ${shortOnes.length} recent meetings ran under half their scheduled time, and timed meetings average ${avgUtil} percent of what was booked. That reads as a trend, not a one off. Worth raising with the owner or shortening the standing slot.`
              : shortOnes.length === 1
                ? `One meeting ran well short of its slot. Timed meetings average ${avgUtil} percent of scheduled. Keep an eye on whether it repeats.`
                : `Timed meetings run at ${avgUtil} percent of their scheduled time on average.`}
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column" }}>
        {edit != null && (() => {
          const m = data[edit];
          if (!m) return null;
          const patch = (k, v) => setData((d) => d.map((x, j) => (j === edit ? { ...x, [k]: v } : x)));
          return <RecordModal title="Meeting" values={m} onPatch={patch} onClose={() => setEdit(null)} fields={[
            { key: "title", label: "Title" },
            { key: "date", label: "Date" },
            { key: "type", label: "Type" },
            { key: "status", label: "Status", type: "select", options: [{ value: "scheduled", label: "Scheduled" }, { value: "completed", label: "Completed" }, { value: "no_show", label: "No show" }, { value: "canceled", label: "Canceled" }] },
            { key: "notes", label: "Notes", type: "textarea" },
          ]} />;
        })()}
        {data.map((m, i) => {
          const util = m.actual != null && m.scheduled ? m.actual / m.scheduled : null;
          const short = util != null && util < 0.5;
          return (
            <div key={i} style={{ borderBottom: i < meetings.length - 1 ? `1px solid ${N.line}` : "none" }}>
              <div onClick={() => setOpen(open === i ? null : i)} style={{ display: "flex", gap: 14, padding: "12px 0", cursor: "pointer", alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ width: 92, flexShrink: 0 }}>
                  <div style={{ fontSize: 13, color: B.black, fontWeight: 500 }}>{m.date}</div>
                  <div style={{ fontSize: 11.5, color: N.faint }}>{m.type}</div>
                </div>
                <span style={{ flex: 1, minWidth: 150, fontSize: 14, color: B.black, fontWeight: 500 }}>{m.title}</span>
                <div style={{ width: 116, flexShrink: 0 }}>
                  {m.actual != null ? (
                    <>
                      <div style={{ fontSize: 12, color: short ? B.red : B.black, fontWeight: 500 }}>{m.actual} of {m.scheduled} min</div>
                      <div style={{ height: 5, background: N.line, borderRadius: 999, marginTop: 3, overflow: "hidden" }}>
                        <div style={{ width: `${Math.min(100, Math.round(util * 100))}%`, height: "100%", background: short ? B.red : B.darkBlue }} />
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 11.5, color: N.faint }}>{m.status === "scheduled" ? `${m.scheduled} min planned` : "not held"}</div>
                  )}
                </div>
                <Stars i={i} />
                {(m.recording || m.notes || m.transcript) && (
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {m.recording && <Video size={14} color={N.faint} />}
                    {(m.notes || m.transcript) && <FileText size={14} color={N.faint} />}
                  </div>
                )}
                <button onClick={(e) => { e.stopPropagation(); setEdit(i); }} title="Edit" style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${N.line}`, background: B.white, color: N.muted, cursor: "pointer", display: "grid", placeItems: "center", padding: 0 }}><Pencil size={12} /></button>
                <Pill status={m.status} />
                <ChevronDown size={15} color={N.faint} style={{ transform: open === i ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
              </div>
              {open === i && (
                <div style={{ padding: "0 0 16px 106px", display: "flex", flexDirection: "column", gap: 12 }}>
                  {m.ranBy && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                      <Monogram name={nameOf(m.ranBy)} size={24} />
                      <span style={{ color: B.black, fontWeight: 500 }}>{nameOf(m.ranBy)}</span>
                      <span style={{ color: N.faint }}>ran this meeting · {m.dept}</span>
                    </div>
                  )}

                  {m.attendees && m.attendees.length > 0 && (
                    <div>
                      <div style={{ ...DISPLAY, fontSize: 10, color: N.faint, marginBottom: 6 }}>
                        Attendees <span style={{ marginLeft: 6, fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>{att[i].filter(Boolean).length} of {m.attendees.length} attended</span>
                      </div>
                      <div style={{ display: "grid", gap: 6 }}>
                        {m.attendees.map((a, ai) => {
                          const on = att[i][ai];
                          return (
                            <div key={ai} onClick={() => toggleAtt(i, ai)} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, cursor: "pointer" }}>
                              <span style={{ width: 16, height: 16, borderRadius: 5, flexShrink: 0, border: on ? "none" : `1.5px solid ${N.faint}`, background: on ? B.darkBlue : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>{on && <Check size={11} color={B.white} strokeWidth={3} />}</span>
                              <span style={{ color: on ? B.black : N.muted }}>{a.name}</span>
                              <span style={{ fontSize: 10.5, fontWeight: 700, color: a.side === "Lava" ? B.red : N.muted }}>{a.side}</span>
                              <span style={{ marginLeft: "auto", fontSize: 11.5, fontWeight: 600, color: on ? N.faint : B.red }}>{on ? "attended" : "did not attend"}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {(m.recording || m.transcript || m.notes) ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {m.recording && (
                        <a href={m.recording} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, color: B.darkBlue, textDecoration: "none", background: "rgba(36,36,45,0.06)", border: `1px solid ${N.line}`, borderRadius: 8, padding: "6px 11px" }}>
                          <Video size={13} /> Recording
                        </a>
                      )}
                      {m.transcript && (
                        <a href={m.transcript} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, color: B.darkBlue, textDecoration: "none", background: "rgba(36,36,45,0.06)", border: `1px solid ${N.line}`, borderRadius: 8, padding: "6px 11px" }}>
                          <FileText size={13} /> Transcript
                        </a>
                      )}
                      {m.notes && (
                        <a href="#notes" onClick={(e) => e.preventDefault()} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, color: B.darkBlue, textDecoration: "none", background: "rgba(36,36,45,0.06)", border: `1px solid ${N.line}`, borderRadius: 8, padding: "6px 11px" }}>
                          <FileText size={13} /> Notes
                        </a>
                      )}
                    </div>
                  ) : null}

                  {m.wins && m.wins.length > 0 && (
                    <div>
                      <div style={{ ...DISPLAY, fontSize: 10, color: N.faint, marginBottom: 6 }}>Wins</div>
                      <div style={{ display: "grid", gap: 5 }}>
                        {m.wins.map((w, wi) => (
                          <div key={wi} style={{ display: "flex", gap: 8, fontSize: 13, color: B.black, lineHeight: 1.45 }}>
                            <Check size={14} color={B.darkBlue} strokeWidth={3} style={{ marginTop: 2, flexShrink: 0 }} /> {w}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {m.actionItems && m.actionItems.length > 0 && (
                    <div>
                      <div style={{ ...DISPLAY, fontSize: 10, color: N.faint, marginBottom: 6 }}>Action items</div>
                      <div style={{ display: "grid", gap: 7 }}>
                        {m.actionItems.map((a, ai) => (
                          <div key={ai} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13 }}>
                            <span style={{ width: 16, height: 16, borderRadius: 5, flexShrink: 0, border: a.done ? "none" : `1.5px solid ${N.faint}`, background: a.done ? B.darkBlue : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>{a.done && <Check size={11} color={B.white} strokeWidth={3} />}</span>
                            <span style={{ flex: 1, color: a.done ? N.faint : B.black, textDecoration: a.done ? "line-through" : "none" }}>{a.text}</span>
                            <span style={{ fontSize: 12, color: N.faint, whiteSpace: "nowrap" }}>{nameOf(a.owner_id).split(" ")[0]}{a.due ? `, ${a.due}` : ""}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ fontSize: 13.5, color: N.muted, lineHeight: 1.6 }}>
                    <span style={{ ...DISPLAY, fontSize: 10, color: N.faint, marginRight: 8 }}>Notes</span>{m.notes || "No notes recorded."}
                  </div>
                  <div style={{ fontSize: 12, color: N.faint }}>
                    {m.actual != null
                      ? `Ran ${m.actual} of ${m.scheduled} minutes scheduled${short ? ", well under the slot" : ""}. `
                      : m.status === "scheduled" ? `Booked for ${m.scheduled} minutes. ` : ""}
                    {(m.recording || m.transcript)
                      ? "Recording, transcript, and notes come in from the automation after the meeting."
                      : "The recording, transcript, and notes drop in from the automation once the meeting is held."}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, color: N.muted }}>Your rating of this meeting</span>
                    <Stars i={i} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
function StatusBadge({ status }) {
  const canceled = status === "canceled";
  const adhoc = status === "ad_hoc";
  const bg = canceled ? B.red : adhoc ? "rgba(231,56,53,0.10)" : "rgba(36,36,45,0.08)";
  const fg = canceled ? B.white : adhoc ? B.red : B.darkBlue;
  return <span style={{ fontSize: 13, fontWeight: 600, background: bg, color: fg, padding: "3px 11px", borderRadius: 8 }}>{STATUS_LABELS[status]}</span>;
}
const money = (n) => "$" + n.toLocaleString();
function AdHocBalanceCard() {
  const used = TIME_ENTRIES.reduce((s, e) => s + e.hours * e.rate, 0);
  const remaining = CLIENT.ad_hoc_prepaid - used;
  const kindLabel = (k) => (k === "pm_director" ? "Project, director" : "Back end");
  return (
    <Card style={{ gridColumn: "1 / -1", borderTop: `3px solid ${B.red}` }}>
      <SectionHeading icon={Wallet}>Ad hoc balance</SectionHeading>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 18 }}>
        <div><div style={{ fontSize: 24, fontWeight: 600, color: B.darkBlue }}>{money(CLIENT.ad_hoc_prepaid)}</div><div style={{ fontSize: 12.5, color: N.muted }}>Prepaid</div></div>
        <div><div style={{ fontSize: 24, fontWeight: 600, color: B.darkBlue }}>{money(used)}</div><div style={{ fontSize: 12.5, color: N.muted }}>Used</div></div>
        <div><div style={{ fontSize: 24, fontWeight: 600, color: remaining < 300 ? B.red : B.darkBlue }}>{money(remaining)}</div><div style={{ fontSize: 12.5, color: N.muted }}>Remaining</div></div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {TIME_ENTRIES.map((e, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, padding: "8px 0", borderTop: `1px solid ${N.line}` }}>
            <span style={{ width: 56, flexShrink: 0, color: N.muted }}>{e.date}</span>
            <span style={{ flex: 1, color: B.black }}>{e.note}</span>
            <span style={{ color: N.faint }}>{kindLabel(e.kind)}</span>
            <span style={{ width: 70, textAlign: "right", color: N.muted }}>{e.hours}h at ${e.rate}</span>
            <span style={{ width: 56, textAlign: "right", color: B.black, fontWeight: 500 }}>{money(e.hours * e.rate)}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${N.line}`, fontSize: 12, color: N.faint }}>
        Rates: $150 an hour for project manager and director time, $50 an hour for back end work. The dev support team logs time and it draws down the prepaid balance.
      </div>
    </Card>
  );
}
function CancellationRunbook() {
  const [done, setDone] = useState(CANCELLATION_TASKS.map(() => false));
  return (
    <Card style={{ gridColumn: "1 / -1", borderTop: `3px solid ${B.red}` }}>
      <SectionHeading icon={Power} color={B.red}>Cancellation runbook</SectionHeading>
      <div style={{ fontSize: 13.5, color: N.muted, lineHeight: 1.6, marginBottom: 16 }}>
        This account is canceled. Follow the cancellation procedure, add it to the cancellation spreadsheet, and disconnect every system so nothing stays linked to Lava going forward.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {CANCELLATION_TASKS.map((t, i) => (
          <div key={i} onClick={() => setDone(done.map((d, idx) => (idx === i ? !d : d)))} style={{ display: "flex", alignItems: "center", gap: 11, fontSize: 14, cursor: "pointer" }}>
            <span style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, border: done[i] ? "none" : `1.5px solid ${N.faint}`, background: done[i] ? B.red : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>{done[i] && <Check size={13} color={B.white} strokeWidth={3} />}</span>
            <span style={{ color: done[i] ? N.faint : B.black, textDecoration: done[i] ? "line-through" : "none" }}>{t}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
function General({ client, techTools, setTechTools, meetings = MEETINGS, emp = {} }) {
  const [status, setStatus] = useState(client.service_status);
  const [techOpen, setTechOpen] = useState(false);
  const activeTools = techTools && techTools.length ? techTools.map((t) => t.name) : client.tech_tools;
  return (
    <>
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 18 }}>
      <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span style={{ ...DISPLAY, fontSize: 10.5, color: N.faint }}>Preview status, demo</span>
        <SegToggle value={status} onChange={setStatus} options={[
          { value: "onboarding", label: "Onboarding" }, { value: "monthly", label: "Monthly" },
          { value: "quarterly", label: "Quarterly" }, { value: "ad_hoc", label: "Ad hoc" },
          { value: "canceled", label: "Canceled" },
        ]} />
        <span style={{ fontSize: 12, color: N.faint }}>In production this is read-only from HubSpot.</span>
      </div>
      <Card>
        <SectionHeading icon={Building2}>At a glance</SectionHeading>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div>
            <div style={{ ...DISPLAY, fontSize: 10.5, color: N.faint, marginBottom: 5 }}>Client status</div>
            <StatusBadge status={status} />
            {status === "onboarding" && <div style={{ fontSize: 11.5, color: N.muted, marginTop: 6 }}>In the build. Picks a cadence by {client.decision_due_date}.</div>}
          </div>
          <Fact label="Support through" value={client.support_through} />
          <Fact label="Product mix" value={client.product_mix} />
          <Fact label="CRM platform" value={client.platform} />
          <Fact label="Account owner" value={client.primary_contact_ids?.[0] ? nameOf(client.primary_contact_ids[0]) : "—"} />
          <Fact label="Deployed virtual assistants" value={String(client.va_count)} />
        </div>
      </Card>
      <Card>
        <SectionHeading icon={CalendarDays}>Key dates</SectionHeading>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <DateRow label="Client started" value={client.start_date} />
          <DateRow label="VA started" value={client.va_start_date} />
          <DateRow label="Go live" value={client.go_live_date} />
          <DateRow label="Cadence decision due" value={client.decision_due_date} />
          <DateRow label="Support through" value={client.support_through} />
        </div>
      </Card>
      {status === "ad_hoc" && <AdHocBalanceCard />}
      {status === "canceled" && <CancellationRunbook />}
      <Card>
        <button onClick={() => setTechOpen(true)} style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10, background: "none", border: "none", padding: 0, cursor: "pointer" }}>
          <Wrench size={17} color={B.darkBlue} strokeWidth={2} />
          <span style={{ ...DISPLAY, fontSize: 13, color: B.darkBlue }}>Tech tools</span>
          <span style={{ marginLeft: 8, fontSize: 11.5, fontWeight: 600, color: B.teal, display: "inline-flex", alignItems: "center", gap: 4 }}><Pencil size={12} /> Manage</span>
        </button>
        <div style={{ fontSize: 12, color: N.faint, marginBottom: 10 }}>The active tools. Click the heading to manage the stack, usage, start dates, and notes.</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
          {activeTools.map((t) => (
            <span key={t} style={{ fontSize: 13, color: B.darkBlue, background: N.fill, border: `1px solid ${N.line}`, padding: "6px 12px", borderRadius: 8 }}>{t}</span>
          ))}
        </div>
      </Card>
      <Card>
        <SectionHeading icon={Users}>Staff on this account</SectionHeading>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {client.team_ids.length === 0 && <div style={{ fontSize: 13, color: N.faint }}>No staff assigned yet.</div>}
          {client.team_ids.map((id) => (
            <div key={id} style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <Monogram name={nameOf(id)} size={34} />
              <div>
                <div style={{ fontSize: 14, color: B.black, fontWeight: 500 }}>{nameOf(id)}</div>
                <div style={{ fontSize: 12.5, color: N.muted }}>{emp[id]?.role || (EMP[id] ? EMP[id].role : "")}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card style={{ gridColumn: "1 / -1" }}>
        <SectionHeading icon={ClipboardList}>Meetings</SectionHeading>
        {meetings.length ? <MeetingLog meetings={meetings} /> : <div style={{ fontSize: 13, color: N.faint }}>No meetings logged for this account yet.</div>}
      </Card>
    </div>
    {techOpen && (
      <Modal title="Tech stack" onClose={() => setTechOpen(false)}>
        <TechStack tools={techTools} setTools={setTechTools} />
      </Modal>
    )}
    </>
  );
}

// ── Reporting ──────────────────────────────────────────────────────
function Kpi({ label, value, delta, note, danger }) {
  const deltaColor = danger ? B.red : N.muted;
  return (
    <Card style={{ padding: "16px 18px" }}>
      <div style={{ ...DISPLAY, fontSize: 10.5, color: N.faint, marginBottom: 8 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 9 }}>
        <span style={{ fontSize: 28, fontWeight: 600, color: B.darkBlue, lineHeight: 1 }}>{value}</span>
        {delta && <span style={{ fontSize: 13, fontWeight: 500, color: deltaColor }}>{delta}</span>}
      </div>
      {note && <div style={{ fontSize: 12, color: N.faint, marginTop: 6 }}>{note}</div>}
    </Card>
  );
}
function PipelineBars({ data, color }) {
  const max = Math.max(...data.map((d) => d.value));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
      {data.map((d) => (
        <div key={d.stage}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
            <span style={{ color: B.black }}>{d.stage}</span>
            <span style={{ color: N.muted, fontWeight: 500 }}>{d.value}</span>
          </div>
          <div style={{ height: 8, background: N.fill, borderRadius: 5, overflow: "hidden" }}>
            <div style={{ width: `${(d.value / max) * 100}%`, height: "100%", background: color, borderRadius: 5 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
function Stars({ rating }) {
  const full = Math.round(parseFloat(rating));
  return (
    <span style={{ display: "inline-flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={16} color={B.teal} fill={i <= full ? B.teal : "none"} />
      ))}
    </span>
  );
}
const th = { ...DISPLAY, fontSize: 10, color: N.faint, textAlign: "right", padding: "0 0 10px 0", fontWeight: 600 };
const td = { fontSize: 13.5, color: B.black, textAlign: "right", padding: "9px 0" };
function ProducerTable() {
  const maxPrem = Math.max(...PRODUCERS.map((p) => p.premium));
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th style={{ ...th, textAlign: "left" }}>Producer</th>
          <th style={th}>Bound</th>
          <th style={th}>Premium</th>
          <th style={th}>Quotes</th>
          <th style={th}>Close rate</th>
        </tr>
      </thead>
      <tbody>
        {PRODUCERS.map((p) => (
          <tr key={p.name} style={{ borderTop: `1px solid ${N.line}` }}>
            <td style={{ ...td, textAlign: "left" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ flexShrink: 0 }}>{p.name}</span>
                <span style={{ flex: 1, height: 6, background: N.fill, borderRadius: 4, minWidth: 40 }}>
                  <span style={{ display: "block", width: `${(p.premium / maxPrem) * 100}%`, height: "100%", background: B.darkBlue, borderRadius: 4 }} />
                </span>
              </div>
            </td>
            <td style={td}>{p.bound}</td>
            <td style={td}>{usd(p.premium)}</td>
            <td style={td}>{p.quotes}</td>
            <td style={td}>{p.close} percent</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
function LeadSourceTable() {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th style={{ ...th, textAlign: "left" }}>Source</th>
          <th style={th}>Leads</th>
          <th style={th}>Bound</th>
          <th style={th}>Conversion</th>
        </tr>
      </thead>
      <tbody>
        {LEAD_SOURCES.map((s) => (
          <tr key={s.source} style={{ borderTop: `1px solid ${N.line}` }}>
            <td style={{ ...td, textAlign: "left" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ flexShrink: 0 }}>{s.source}</span>
                <span style={{ flex: 1, height: 6, background: N.fill, borderRadius: 4, minWidth: 40 }}>
                  <span style={{ display: "block", width: `${s.conversion * 2.5}%`, height: "100%", background: B.teal, borderRadius: 4 }} />
                </span>
              </div>
            </td>
            <td style={td}>{s.leads}</td>
            <td style={td}>{s.bound}</td>
            <td style={td}>{s.conversion} percent</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const monthData = (arr, key = "value") => MONTHS.map((m, i) => ({ month: m, [key]: arr[i] }));
function LineMini({ data, color = B.darkBlue, height = 150, name = "value" }) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 4, right: 8, left: -14, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={N.line} vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: N.muted }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: N.muted }} axisLine={false} tickLine={false} width={44} />
          <Tooltip />
          <Line type="monotone" dataKey={name} stroke={color} strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
function BarsMini({ data, color = B.darkBlue, height = 150, name = "value" }) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -14, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={N.line} vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: N.muted }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: N.muted }} axisLine={false} tickLine={false} width={44} />
          <Tooltip cursor={{ fill: N.fill }} />
          <Bar dataKey={name} fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
function Big({ value, label, color = B.darkBlue }) {
  return <div><div style={{ fontSize: 24, fontWeight: 600, color }}>{value}</div><div style={{ fontSize: 12, color: N.muted }}>{label}</div></div>;
}
function LeadCard({ title, leads }) {
  const data = MONTHS.map((m, i) => ({ month: m, leads: leads.created[i], quotes: leads.quotes[i] }));
  return (
    <Card>
      <SectionHeading icon={TrendingUp}>{title}</SectionHeading>
      <div style={{ display: "flex", gap: 22, marginBottom: 14, flexWrap: "wrap" }}>
        <Big value={`${leads.automated}%`} label="Leads automated" color={B.teal} />
        <Big value={`${leadToQuote(leads)}%`} label="Lead to quote" />
        <Big value={sum(leads.created)} label="Leads, year to date" />
      </div>
      <div style={{ width: "100%", height: 170 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={N.line} vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: N.muted }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: N.muted }} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: N.fill }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="leads" name="Leads" fill={B.darkBlue} radius={[4, 4, 0, 0]} />
            <Bar dataKey="quotes" name="Quotes" fill={B.teal} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function ReportingDirector() {
  const last = (a) => a[a.length - 1];
  const prev = (a) => a[a.length - 2];
  const d = (a) => { const x = last(a) - prev(a); return (x >= 0 ? "+" : "") + x; };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
        <Kpi label="Premium" value={usd(last(PREMIUM) * 1000)} delta={"+" + usd((last(PREMIUM) - prev(PREMIUM)) * 1000)} />
        <Kpi label="Book of business" value={`$${last(BOOK)}M`} delta="+31%" />
        <Kpi label="Customers" value={last(CUSTOMERS_M.count).toLocaleString()} delta={d(CUSTOMERS_M.count)} />
        <Kpi label="Policies" value={last(POLICIES_M.count).toLocaleString()} delta={d(POLICIES_M.count)} />
        <Kpi label="Reviews" value={last(REVIEW_COUNT)} delta={d(REVIEW_COUNT)} />
        <Kpi label="Leads automated" value={`${PL_LEADS.automated}%`} note="personal lines" />
      </div>

      <Card>
        <SectionHeading icon={TrendingUp}>Monthly premium</SectionHeading>
        <BarsMini data={monthData(PREMIUM)} color={B.darkBlue} height={210} />
        <div style={{ marginTop: 10, fontSize: 12.5, color: N.muted }}>Year to date {usd(sum(PREMIUM) * 1000)}. Average {usd(Math.round(sum(PREMIUM) / PREMIUM.length) * 1000)} a month.</div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <LeadCard title="Personal lines" leads={PL_LEADS} />
        <LeadCard title="Commercial lines" leads={CL_LEADS} />
      </div>

      <Card>
        <SectionHeading icon={TrendingUp}>Agency book of business</SectionHeading>
        <LineMini data={monthData(BOOK)} color={B.teal} height={200} />
        <div style={{ marginTop: 10, fontSize: 12.5, color: N.muted }}>Net growth plus ${(last(BOOK) - BOOK[0]).toFixed(1)}M this year, up 31 percent.</div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <Card>
          <SectionHeading icon={Users}>Customers</SectionHeading>
          <div style={{ display: "flex", gap: 22, marginBottom: 12, flexWrap: "wrap" }}>
            <Big value={last(CUSTOMERS_M.count).toLocaleString()} label="Total" />
            <Big value={CUSTOMERS_M.newBiz} label="New this month" />
            <Big value={`${CUSTOMERS_M.retention}%`} label="Retention" />
          </div>
          <LineMini data={monthData(CUSTOMERS_M.count)} color={B.darkBlue} height={130} />
        </Card>
        <Card>
          <SectionHeading icon={ClipboardList}>Policies</SectionHeading>
          <div style={{ display: "flex", gap: 22, marginBottom: 12, flexWrap: "wrap" }}>
            <Big value={last(POLICIES_M.count).toLocaleString()} label="In force" />
            <Big value={POLICIES_M.newBiz} label="New this month" />
          </div>
          <LineMini data={monthData(POLICIES_M.count)} color={B.darkBlue} height={130} />
        </Card>
      </div>

      <Card>
        <SectionHeading icon={ClipboardList}>Tasks</SectionHeading>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 24 }}>
          <div>
            <div style={{ ...DISPLAY, fontSize: 10.5, color: N.faint, marginBottom: 8 }}>Completed per month</div>
            <BarsMini data={monthData(TASKS_M.completed)} color={B.teal} height={150} />
          </div>
          <div>
            <div style={{ ...DISPLAY, fontSize: 10.5, color: N.faint, marginBottom: 10 }}>Open now</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {TASKS_M.open.map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
                  <span style={{ color: B.black }}>{k}</span>
                  <span style={{ color: k === "Past due" && v > 0 ? B.red : N.muted, fontWeight: 500 }}>{v.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <Card><SectionHeading icon={Target}>New business pipeline</SectionHeading><PipelineBars data={NEW_BUSINESS} color={B.darkBlue} /></Card>
        <Card><SectionHeading icon={ClipboardList}>Service pipeline</SectionHeading><PipelineBars data={SERVICE} color={B.teal} /></Card>
      </div>

      <Card><SectionHeading icon={Briefcase}>Producer performance, new business</SectionHeading><ProducerTable /></Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <Card>
          <SectionHeading icon={TrendingUp}>Top lead sources</SectionHeading>
          <PipelineBars data={TOP_SOURCES.map((s) => ({ stage: s.source, value: s.count }))} color={B.darkBlue} />
        </Card>
        <Card>
          <SectionHeading icon={ClipboardList}>Form submissions</SectionHeading>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {FORM_COUNTS.map(([f, n]) => (
              <div key={f} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
                <span style={{ color: B.black }}>{f}</span><span style={{ color: N.muted, fontWeight: 500 }}>{n}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <SectionHeading icon={Star}>Google reviews</SectionHeading>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <span style={{ fontSize: 28, fontWeight: 600, color: B.darkBlue }}>{KPIS.rating.value}</span>
          <Stars rating={KPIS.rating.value} />
          <span style={{ fontSize: 12.5, color: N.muted, marginLeft: "auto" }}>{last(REVIEW_COUNT)} reviews, {d(REVIEW_COUNT)} this month</span>
        </div>
        <LineMini data={monthData(REVIEW_COUNT)} color={B.teal} height={150} />
      </Card>
    </div>
  );
}

function ReportingPresentation({ period }) {
  const periodWord = period === "Monthly" ? "month" : "quarter";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ background: B.darkBlue, borderRadius: 14, padding: "30px 34px", color: B.white }}>
        <div style={{ ...DISPLAY, fontSize: 13, color: B.red, marginBottom: 10 }}>{period} business review</div>
        <div style={{ ...DISPLAY, fontSize: 30, color: B.white, lineHeight: 1.1 }}>{CLIENT.company_name}</div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", marginTop: 10 }}>Second quarter 2026. Prepared by Lava.</div>
      </div>

      <Card>
        <SectionHeading icon={ClipboardList}>Agenda</SectionHeading>
        <ol style={{ margin: 0, paddingLeft: 20, fontSize: 15, color: B.black, lineHeight: 2 }}>
          <li>Where the agency stands today</li>
          <li>New business this {periodWord}</li>
          <li>Service and retention</li>
          <li>Reviews and reputation</li>
          <li>Where we focus next {periodWord}</li>
        </ol>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <Kpi label="Customers" value={KPIS.customers.value} delta={KPIS.customers.delta} />
        <Kpi label="Active policies" value={KPIS.policies.value} delta={KPIS.policies.delta} />
        <Kpi label="New business won" value="11" delta={`this ${periodWord}`} />
        <Kpi label="Google rating" value={KPIS.rating.value} note={KPIS.rating.note} />
      </div>

      <Card>
        <SectionHeading icon={TrendingUp}>Leads by line</SectionHeading>
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={LEADS_BY_LINE} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={N.line} vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 13, fill: N.muted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 13, fill: N.muted }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: N.fill }} />
              <Legend wrapperStyle={{ fontSize: 13 }} />
              <Bar dataKey="personal" name="Personal lines" fill={B.darkBlue} radius={[4, 4, 0, 0]} />
              <Bar dataKey="commercial" name="Commercial lines" fill={B.teal} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <Card>
          <SectionHeading icon={Check} color={B.teal}>Wins this {periodWord}</SectionHeading>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14.5, color: B.black, lineHeight: 1.9 }}>
            <li>Personal lines leads grew for the third month running.</li>
            <li>Retention held at 94 percent.</li>
            <li>The Google rating climbed to 4.8 across 213 reviews.</li>
          </ul>
        </Card>
        <Card>
          <SectionHeading icon={Target}>Where we focus next {periodWord}</SectionHeading>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14.5, color: B.black, lineHeight: 1.9 }}>
            <li>Commercial lines lag personal lines. Put two virtual assistants on commercial quoting.</li>
            <li>The service pipeline backs up at awaiting client. Tighten the follow up cadence.</li>
            <li>The CRM migration is behind and blocks the automation pilot. Close it out first.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

function SegToggle({ value, options, onChange }) {
  return (
    <div style={{ display: "inline-flex", background: N.fill, border: `1px solid ${N.line}`, borderRadius: 9, padding: 3 }}>
      {options.map((o) => {
        const on = o.value === value;
        const Icon = o.icon;
        return (
          <button key={o.value} onClick={() => onChange(o.value)} style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "none", cursor: "pointer", fontFamily: FONT_BODY, fontSize: 13, fontWeight: on ? 600 : 400, padding: "6px 13px", borderRadius: 7, background: on ? B.white : "transparent", color: on ? B.darkBlue : N.muted, boxShadow: on ? "0 1px 2px rgba(27,18,11,0.08)" : "none" }}>
            {Icon && <Icon size={14} />}{o.label}
          </button>
        );
      })}
    </div>
  );
}

function Reporting() {
  const [mode, setMode] = useState("director");
  const [period, setPeriod] = useState("Quarterly");
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
        <SegToggle
          value={mode}
          onChange={setMode}
          options={[
            { value: "director", label: "Director view", icon: LayoutDashboard },
            { value: "presentation", label: "Presentation mode", icon: Presentation },
          ]}
        />
        {mode === "presentation" && (
          <SegToggle value={period} onChange={setPeriod} options={[{ value: "Monthly", label: "Monthly" }, { value: "Quarterly", label: "Quarterly" }]} />
        )}
        {mode === "presentation" && (
          <span style={{ marginLeft: "auto", fontSize: 12.5, color: N.faint }}>Share this view on the call.</span>
        )}
      </div>
      {mode === "director" ? <ReportingDirector /> : <ReportingPresentation period={period} />}
    </div>
  );
}

// ── People ─────────────────────────────────────────────────────────
const ROLE_ICON = { Sales: Briefcase, "Customer Success": Headset, Fulfillment: Wrench, "Team Lead": UserCog };

function PersonRow({ name, role, email, photo, onCapture }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
      <PhotoAvatar name={name} photo={photo} size={34} onCapture={onCapture} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, color: B.black, fontWeight: 500 }}>{name}</div>
        {role && <div style={{ fontSize: 12.5, color: N.muted }}>{role}</div>}
        {email && <div style={{ fontSize: 11.5, color: N.faint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</div>}
      </div>
    </div>
  );
}

function OrgBox({ name, sub, accent = B.darkBlue }) {
  return (
    <div style={{ border: `1px solid ${N.line}`, borderTop: `3px solid ${accent}`, borderRadius: 10, background: B.white, padding: "10px 14px", minWidth: 140, textAlign: "center" }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: B.black }}>{name}</div>
      {sub && <div style={{ fontSize: 11.5, color: N.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// Generic CSS org tree. node: { box:{name,sub,accent}, children:[node] }
function OrgNode({ node }) {
  const kids = node.children || [];
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center" }}>
      <OrgBox {...node.box} />
      {kids.length > 0 && (
        <>
          <div style={{ width: 2, height: 16, background: N.line }} />
          <div style={{ display: "flex" }}>
            {kids.map((k, i) => (
              <div key={i} style={{ padding: "0 12px", display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                <div style={{ position: "absolute", top: 0, height: 2, background: N.line, left: kids.length === 1 ? "50%" : i === 0 ? "50%" : 0, right: kids.length === 1 ? "50%" : i === kids.length - 1 ? "50%" : 0 }} />
                <div style={{ width: 2, height: 16, background: N.line }} />
                <OrgNode node={k} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function OrgChartWrap({ children }) {
  return <div style={{ overflowX: "auto", paddingBottom: 6, display: "flex", justifyContent: "center" }}><div style={{ padding: "4px 8px" }}>{children}</div></div>;
}

function buildAgencyTree(model) {
  const lead = model.departments.find((d) => d.name === "Leadership");
  const others = model.departments.filter((d) => d.name !== "Leadership");
  const owner = { box: { name: lead.lead, accent: B.red }, children: [] };
  (lead.staff || []).forEach((s) => owner.children.push({ box: { name: s.title, accent: B.darkBlue } }));
  others.forEach((d) => {
    owner.children.push({
      box: { name: d.lead, sub: d.name, accent: B.darkBlue },
      children: d.staff.map((s) => ({ box: { name: s.name || s.title, sub: s.name ? s.title : (s.count > 1 ? `${s.count} people` : null), accent: B.teal } })),
    });
  });
  return owner;
}

function clone(x) { return JSON.parse(JSON.stringify(x)); }
function tenure(hired) {
  if (!hired) return null;
  const d = new Date(hired); if (isNaN(d.getTime())) return null;
  const months = Math.max(0, Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
  const years = Math.floor(months / 12);
  const label = years >= 1 ? `${years} yr${years > 1 ? "s" : ""}${months % 12 ? `, ${months % 12} mo` : ""}` : `${months} mo`;
  return { isNew: months < 12, label };
}
function withIds(depts) {
  return depts.map((d) => ({ ...d, staff: d.staff.map((st, i) => ({ id: st.id || `${d.name}-${i}-${Math.random().toString(36).slice(2, 7)}`, name: st.name || "", title: st.title || "", measure: st.measure || "", email: st.email || "", hired: st.hired || "", notes: st.notes || "", count: st.count })) }));
}
function AgencyStaff() {
  const seedP = { name: "Robert Steele", title: "Agency owner / principal", email: "robert@steeleinsurance.com" };
  const [principal, setPrincipal] = useState({ ...seedP, committed: { ...seedP } });
  const [people, setPeople] = useState([
    { id: "a1", name: "Maria L.", title: "Service lead", reportsTo: "principal", email: "maria@steeleinsurance.com", committed: { name: "Maria L.", title: "Service lead", reportsTo: "principal", email: "maria@steeleinsurance.com" } },
    { id: "a2", name: "Dev P.", title: "Account manager", reportsTo: "a1", email: "dev@steeleinsurance.com", committed: { name: "Dev P.", title: "Account manager", reportsTo: "a1", email: "dev@steeleinsurance.com" } },
    { id: "a3", name: "Tom R.", title: "Producer", reportsTo: "principal", email: "tom@steeleinsurance.com", committed: { name: "Tom R.", title: "Producer", reportsTo: "principal", email: "tom@steeleinsurance.com" } },
  ]);

  const inputStyle = { fontFamily: FONT_BODY, fontSize: 13, color: B.black, border: `1px solid ${N.line}`, borderRadius: 7, padding: "7px 9px", width: "100%", boxSizing: "border-box" };
  const lbl = { ...DISPLAY, fontSize: 9, color: N.faint, marginBottom: 4, display: "block" };

  const setP = (f, v) => setPrincipal((p) => ({ ...p, [f]: v }));
  const savePrincipal = () => setPrincipal((p) => ({ ...p, committed: { name: p.name, title: p.title, email: p.email } }));
  const pDirty = !principal.committed || principal.committed.name !== principal.name || principal.committed.title !== principal.title || principal.committed.email !== principal.email;

  const setField = (id, f, v) => setPeople((ps) => ps.map((p) => (p.id === id ? { ...p, [f]: v } : p)));
  const savePerson = (id) => setPeople((ps) => ps.map((p) => (p.id === id ? { ...p, committed: { name: p.name, title: p.title, reportsTo: p.reportsTo, email: p.email } } : p)));
  const addPerson = () => setPeople((ps) => [...ps, { id: "a" + Math.random().toString(36).slice(2, 7), name: "", title: "", reportsTo: "principal", email: "", committed: null }]);
  const removePerson = (id) => setPeople((ps) => ps.filter((p) => p.id !== id));
  const isDirty = (p) => !p.committed || p.committed.name !== p.name || p.committed.title !== p.title || p.committed.reportsTo !== p.reportsTo || p.committed.email !== p.email;

  const committed = people.filter((p) => p.committed);
  const byId = {}; committed.forEach((p) => { byId[p.id] = p; });
  const childrenOf = (mgr, seen) => committed
    .filter((p) => {
      const rt = p.committed.reportsTo;
      const here = rt === mgr || (mgr === "principal" && (!rt || (rt !== "principal" && !byId[rt])));
      return here && !seen.has(p.id);
    })
    .map((p) => { const ns = new Set(seen); ns.add(p.id); return { box: { name: p.committed.name || "Unnamed", sub: p.committed.title, accent: B.teal }, children: childrenOf(p.id, ns) }; });
  const tree = { box: { name: (principal.committed && principal.committed.name) || "Principal", sub: (principal.committed && principal.committed.title) || "Agency owner", accent: B.red }, children: childrenOf("principal", new Set()) };
  const mgrOptions = [{ value: "principal", label: (principal.committed && principal.committed.name) ? principal.committed.name + " (principal)" : "Principal" }].concat(committed.map((p) => ({ value: p.id, label: p.committed.name || "Unnamed" })));

  const SaveBtn = ({ dirty, onClick }) => (
    <button onClick={onClick} disabled={!dirty} style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, color: dirty ? B.white : N.muted, background: dirty ? B.darkBlue : N.fill, border: "none", borderRadius: 7, padding: "7px 13px", cursor: dirty ? "pointer" : "default", whiteSpace: "nowrap" }}>{dirty ? "Save" : "Saved"}</button>
  );

  return (
    <Card>
      <SectionHeading icon={Network} color={B.teal}>Agency org chart</SectionHeading>
      <div style={{ fontSize: 12.5, color: N.faint, lineHeight: 1.55, marginBottom: 16 }}>
        Enter the principal and the agency team. Each person shows on the chart once you save them. Set who each person reports to to shape the chart.
      </div>

      <div style={{ marginBottom: 20 }}>
        <OrgChartWrap><OrgNode node={tree} /></OrgChartWrap>
      </div>

      <div style={{ ...DISPLAY, fontSize: 10.5, color: B.darkBlue, marginBottom: 8 }}>Principal</div>
      <div style={{ border: `1px solid ${pDirty ? B.teal : N.line}`, borderRadius: 10, padding: "13px 14px", marginBottom: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1.1fr 1.3fr auto", gap: 10, alignItems: "end" }}>
          <div><span style={lbl}>Name</span><input value={principal.name} placeholder="Principal name" onChange={(e) => setP("name", e.target.value)} style={inputStyle} /></div>
          <div><span style={lbl}>Title</span><input value={principal.title} onChange={(e) => setP("title", e.target.value)} style={inputStyle} /></div>
          <div><span style={lbl}>Email</span><input value={principal.email} onChange={(e) => setP("email", e.target.value)} style={inputStyle} /></div>
          <SaveBtn dirty={pDirty} onClick={savePrincipal} />
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ ...DISPLAY, fontSize: 10.5, color: B.darkBlue }}>Agency team</span>
        <span style={{ fontSize: 11.5, color: N.faint }}>{committed.length} on the chart</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
        {people.map((p) => {
          const dirty = isDirty(p);
          return (
            <div key={p.id} style={{ border: `1px solid ${dirty ? B.teal : N.line}`, borderRadius: 10, padding: "13px 14px", display: "flex", flexDirection: "column", gap: 9 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Monogram name={p.name || "?"} size={34} bg={B.teal} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <input value={p.name} placeholder="Name" onChange={(e) => setField(p.id, "name", e.target.value)} style={{ ...inputStyle, fontWeight: 600 }} />
                </div>
                <button onClick={() => removePerson(p.id)} title="Remove" style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${N.line}`, background: B.white, color: N.muted, cursor: "pointer", display: "grid", placeItems: "center", padding: 0 }}><X size={13} /></button>
              </div>
              <div><span style={lbl}>Position</span><input value={p.title} placeholder="Position" onChange={(e) => setField(p.id, "title", e.target.value)} style={inputStyle} /></div>
              <div><span style={lbl}>Reports to</span>
                <select value={p.reportsTo} onChange={(e) => setField(p.id, "reportsTo", e.target.value)} style={inputStyle}>
                  {mgrOptions.filter((o) => o.value !== p.id).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div><span style={lbl}>Email</span><input value={p.email} placeholder="Email" onChange={(e) => setField(p.id, "email", e.target.value)} style={inputStyle} /></div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <SaveBtn dirty={dirty} onClick={() => savePerson(p.id)} />
                {!p.committed && <span style={{ fontSize: 11, color: N.faint }}>Not on the chart yet</span>}
                {p.committed && dirty && <span style={{ fontSize: 11, color: B.teal }}>Unsaved changes</span>}
              </div>
            </div>
          );
        })}
      </div>
      <button onClick={addPerson} style={{ marginTop: 12, fontFamily: FONT_BODY, fontSize: 12.5, fontWeight: 600, color: B.darkBlue, background: B.white, border: `1px dashed ${N.line}`, borderRadius: 8, padding: "8px 14px", cursor: "pointer" }}>+ Add team member</button>
    </Card>
  );
}

function People({ client, photos = {}, setPhoto = () => {}, team: teamProp, vas: vasProp }) {
  const team = teamProp || Object.entries(EMP).map(([id, e]) => ({ id, ...e }));
  const vas = vasProp || VAS;
  const linkStyle = { display: "inline-flex", alignItems: "center", gap: 5, fontFamily: FONT_BODY, fontSize: 11.5, fontWeight: 600, color: B.darkBlue, textDecoration: "none", marginTop: 4 };
  const newHires = [
    { id: "nh1", name: "Jordan Pierce", email: "jordan.pierce@steeleinsurance.com", role: "Personal lines CSR", added: "June 2, 2026", done: 4, modules: 9, sops: ["New client onboarding", "Service request handling"] },
  ];
  const [edits, setEdits] = useState({});
  const [editing, setEditing] = useState(null);
  const merge = (o) => ({ ...o, ...(edits[o.id] || {}) });
  const patch = (id, key, val) => setEdits((e) => ({ ...e, [id]: { ...(e[id] || {}), [key]: val } }));
  const LAVA_FIELDS = [{ key: "name", label: "Name" }, { key: "role", label: "Role" }, { key: "email", label: "Email" }, { key: "booking", label: "Scheduling link" }];
  const VA_FIELDS = [{ key: "name", label: "Name" }, { key: "lead", label: "Team lead" }, { key: "email", label: "Email" }, { key: "started", label: "Start date" }];
  const HIRE_FIELDS = [{ key: "name", label: "Name" }, { key: "role", label: "Role" }, { key: "email", label: "Email" }, { key: "added", label: "Added" }];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {editing && (() => {
        const all = [...team, ...vas.map((v) => ({ ...v, email: emailFromName(v.name) })), ...newHires];
        const base = all.find((x) => x.id === editing.id);
        if (!base) return null;
        const person = { ...base, ...(edits[base.id] || {}) };
        return <PersonModal person={person} fields={editing.fields} onPatch={(k, val) => patch(base.id, k, val)} onClose={() => setEditing(null)} />;
      })()}
      <Card>
        <SectionHeading icon={Users}>Lava team</SectionHeading>
        <div style={{ fontSize: 12.5, color: N.faint, marginBottom: 14 }}>The Lava people on this account, from the company directory.</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 12 }}>
          {team.map((p0) => { const p = merge(p0); return (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 11, border: `1px solid ${N.line}`, borderRadius: 10, padding: "11px 13px" }}>
              <UploadAvatar name={p.name} size={36} photo={photos[p.id]} onUpload={(src) => setPhoto(p.id, src)} />
              <div onClick={() => setEditing({ id: p.id, fields: LAVA_FIELDS })} style={{ minWidth: 0, cursor: "pointer" }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: B.black }}>{p.name}</div>
                <div style={{ fontSize: 12, color: N.muted }}>{p.role}</div>
                <div style={{ fontSize: 11.5, color: N.faint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.email}</div>
                {p.booking && <a href={p.booking} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={linkStyle}><CalendarPlus size={12} /> Schedule</a>}
              </div>
            </div>
          ); })}
        </div>
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${N.line}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
            <Headset size={14} color={B.teal} />
            <span style={{ ...DISPLAY, fontSize: 11, color: N.muted }}>Virtual assistants ({vas.length})</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 10 }}>
            {vas.map((v0) => { const v = { ...v0, email: emailFromName(v0.name), ...(edits[v0.id] || {}) }; return (
              <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                <UploadAvatar name={v.name} size={28} bg={B.teal} photo={photos[v.id]} onUpload={(src) => setPhoto(v.id, src)} />
                <div onClick={() => setEditing({ id: v.id, fields: VA_FIELDS })} style={{ minWidth: 0, cursor: "pointer" }}>
                  <div style={{ fontSize: 12.5, color: B.black }}>{v.name}</div>
                  <div style={{ fontSize: 11, color: N.faint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.email}</div>
                </div>
              </div>
            ); })}
          </div>
        </div>
      </Card>

      <Card>
        <SectionHeading icon={UserPlus} color={B.teal}>New staff onboarding</SectionHeading>
        <div style={{ fontSize: 12.5, color: N.faint, marginBottom: 14 }}>
          When the agency adds a team member, they run our onboarding before touching the system. A Teachable course tuned to this agency's SOPs, the role views set in the CRM, and the SOPs for their seat.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {newHires.map((h) => (
            <div key={h.id} style={{ border: `1px solid ${N.line}`, borderRadius: 10, padding: "13px 15px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <UploadAvatar name={h.name} size={36} photo={photos[h.id]} onUpload={(src) => setPhoto(h.id, src)} />
                <div onClick={() => setEditing({ id: h.id, fields: HIRE_FIELDS })} style={{ flex: 1, minWidth: 0, cursor: "pointer" }}>
                  <div style={{ fontSize: 14, color: B.black, fontWeight: 600 }}>{h.name}</div>
                  <div style={{ fontSize: 12, color: N.muted }}>{h.role}. Added {h.added}.</div>
                  {h.email && <div style={{ fontSize: 11.5, color: N.faint }}>{h.email}</div>}
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, background: "rgba(20,83,101,0.10)", color: B.teal, padding: "3px 10px", borderRadius: 8, whiteSpace: "nowrap" }}>In onboarding</span>
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: N.muted, marginBottom: 5 }}>
                  <span>Teachable course</span>
                  <span>{h.done} of {h.modules} modules</span>
                </div>
                <div style={{ height: 7, background: N.line, borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ width: `${(h.done / h.modules) * 100}%`, height: "100%", background: B.teal, borderRadius: 999 }} />
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                <span style={{ fontSize: 11, color: N.faint, fontWeight: 600, marginRight: 2 }}>SOPs for the seat</span>
                {h.sops.map((sop) => (
                  <span key={sop} style={{ fontSize: 11.5, fontWeight: 600, color: B.darkBlue, background: N.fill, border: `1px solid ${N.line}`, borderRadius: 999, padding: "3px 10px" }}>{sop}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <AgencyStaff />
      <RightSeats />
    </div>
  );
}

// ── Meeting mode (presenter + presented) ───────────────────────────
function ProgressBar({ value, color }) {
  return <div style={{ height: 8, background: N.fill, borderRadius: 5, overflow: "hidden" }}><div style={{ width: `${value}%`, height: "100%", background: color, borderRadius: 5 }} /></div>;
}

function PresentedSlide({ topic }) {
  const Title = ({ children }) => <div style={{ ...DISPLAY, fontSize: 20, color: B.darkBlue, marginBottom: 22 }}>{children}</div>;
  let body = null;
  if (topic === "Welcome and agenda") {
    body = <ol style={{ margin: 0, paddingLeft: 22, fontSize: 16, color: B.black, lineHeight: 2.1 }}>{TOPICS.slice(1).map((t) => <li key={t}>{t}</li>)}</ol>;
  } else if (topic === "Pending tasks") {
    body = (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {PENDING_TASKS.map((t, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 15 }}>
            <span style={{ flex: 1, color: B.black }}>{t.text}</span>
            <span style={{ fontSize: 12.5, color: N.muted }}>due {t.due}</span>
            <Pill status={t.status} />
          </div>
        ))}
      </div>
    );
  } else if (topic === "Personal and commercial lines") {
    body = (
      <div style={{ width: "100%", height: 320 }}>
        <ResponsiveContainer>
          <BarChart data={LEADS_BY_LINE} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={N.line} vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 13, fill: N.muted }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 13, fill: N.muted }} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: N.fill }} />
            <Legend wrapperStyle={{ fontSize: 13 }} />
            <Bar dataKey="personal" name="Personal lines" fill={B.darkBlue} radius={[4, 4, 0, 0]} />
            <Bar dataKey="commercial" name="Commercial lines" fill={B.teal} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  } else if (topic === "New business and service pipelines") {
    body = (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
        <div><div style={{ ...DISPLAY, fontSize: 11, color: N.muted, marginBottom: 14 }}>New business</div><PipelineBars data={NEW_BUSINESS} color={B.darkBlue} /></div>
        <div><div style={{ ...DISPLAY, fontSize: 11, color: N.muted, marginBottom: 14 }}>Service</div><PipelineBars data={SERVICE} color={B.teal} /></div>
      </div>
    );
  } else if (topic === "Producer performance") {
    body = <ProducerTable />;
  } else if (topic === "Lead sources") {
    body = <LeadSourceTable />;
  } else if (topic === "Current projects") {
    body = (
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {PROJECTS.map((p, i) => (
          <div key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, marginBottom: 7 }}>
              <span style={{ color: B.black }}>{p.name}</span>
              <span style={{ color: N.muted }}>{p.progress} percent</span>
            </div>
            <ProgressBar value={p.progress} color={p.status === "off_track" ? B.red : B.darkBlue} />
          </div>
        ))}
      </div>
    );
  } else if (topic === "Google reviews") {
    body = (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
          <span style={{ fontSize: 34, fontWeight: 600, color: B.darkBlue }}>{KPIS.rating.value}</span>
          <Stars rating={KPIS.rating.value} />
          <span style={{ fontSize: 14, color: N.muted, marginLeft: "auto" }}>213 reviews, 12 new this quarter</span>
        </div>
        <div style={{ width: "100%", height: 200 }}>
          <ResponsiveContainer>
            <LineChart data={REVIEWS_BY_MONTH} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={N.line} vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 13, fill: N.muted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 13, fill: N.muted }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" name="New reviews" stroke={B.teal} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  } else if (topic === "Next twelve months") {
    body = (
      <div style={{ display: "flex", flexDirection: "column" }}>
        {ROADMAP.map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderBottom: i < ROADMAP.length - 1 ? `1px solid ${N.line}` : "none" }}>
            <span style={{ width: 78, flexShrink: 0, fontSize: 13, color: N.muted }}>{r.when}</span>
            <span style={{ flex: 1, fontSize: 15, color: B.black }}>{r.item}</span>
            <Pill status={r.status} />
          </div>
        ))}
      </div>
    );
  } else if (topic === "Wins and focus") {
    body = (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div>
          <div style={{ ...DISPLAY, fontSize: 11, color: B.teal, marginBottom: 12 }}>Wins this month</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 15, color: B.black, lineHeight: 1.9 }}>
            <li>Personal lines leads grew for the third month running.</li>
            <li>Retention held at 94 percent.</li>
            <li>The Google rating climbed to 4.8.</li>
          </ul>
        </div>
        <div>
          <div style={{ ...DISPLAY, fontSize: 11, color: B.darkBlue, marginBottom: 12 }}>Focus next month</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 15, color: B.black, lineHeight: 1.9 }}>
            <li>Put two virtual assistants on commercial quoting.</li>
            <li>Tighten the follow up cadence on service.</li>
            <li>Close out the CRM migration.</li>
          </ul>
        </div>
      </div>
    );
  }
  return <div style={{ minHeight: 360 }}><Title>{topic}</Title>{body}</div>;
}

function PresenterPanel({ current, setCurrent, checked, toggle, notes, setNotes, asksDone, toggleAsk }) {
  const topic = TOPICS[current];
  const next = current < TOPICS.length - 1 ? TOPICS[current + 1] : null;
  const doneCount = checked.filter(Boolean).length;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ background: B.darkBlue, borderRadius: 10, padding: "14px 16px", color: B.white }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
          <span style={{ ...DISPLAY, fontSize: 10, color: "rgba(255,255,255,0.6)" }}>Now, topic {current + 1} of {TOPICS.length}</span>
          <span style={{ marginLeft: "auto", fontSize: 11, color: "rgba(255,255,255,0.6)" }}>{doneCount} covered</span>
        </div>
        <div style={{ fontSize: 15, fontWeight: 600 }}>{topic}</div>
        {next && <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>Next, {next}</div>}
        <div style={{ height: 4, background: "rgba(255,255,255,0.18)", borderRadius: 3, marginTop: 12, overflow: "hidden" }}>
          <div style={{ width: `${((current + 1) / TOPICS.length) * 100}%`, height: "100%", background: B.red, borderRadius: 3 }} />
        </div>
      </div>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <ListChecks size={15} color={B.red} />
          <span style={{ ...DISPLAY, fontSize: 11, color: N.muted }}>Topics to cover</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {TOPICS.map((t, i) => {
            const on = i === current;
            return (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, background: on ? "rgba(231,56,53,0.07)" : "transparent", cursor: "pointer" }} onClick={() => setCurrent(i)}>
                <span onClick={(e) => { e.stopPropagation(); toggle(i); }} style={{ width: 17, height: 17, borderRadius: 5, flexShrink: 0, border: checked[i] ? "none" : `1.5px solid ${N.faint}`, background: checked[i] ? B.darkBlue : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>{checked[i] && <Check size={12} color={B.white} strokeWidth={3} />}</span>
                <span style={{ fontSize: 13.5, color: on ? B.black : N.muted, fontWeight: on ? 500 : 400, textDecoration: checked[i] ? "line-through" : "none" }}>{t}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <StickyNote size={15} color={B.red} />
          <span style={{ ...DISPLAY, fontSize: 11, color: N.muted }}>Notes, {topic}</span>
          <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            <button onClick={() => setCurrent(Math.max(0, current - 1))} style={navBtn}><ChevronLeft size={15} /></button>
            <button onClick={() => setCurrent(Math.min(TOPICS.length - 1, current + 1))} style={navBtn}><ChevronRight size={15} /></button>
          </span>
        </div>
        <textarea value={notes[topic] || ""} onChange={(e) => setNotes({ ...notes, [topic]: e.target.value })} style={{ width: "100%", minHeight: 90, resize: "vertical", border: `1px solid ${N.line}`, borderRadius: 8, padding: "10px 12px", fontFamily: FONT_BODY, fontSize: 13.5, color: B.black, lineHeight: 1.55, boxSizing: "border-box" }} />
      </div>

      <AsksPanel done={asksDone} toggle={toggleAsk} />

      <div>
        <div style={{ ...DISPLAY, fontSize: 11, color: N.muted, marginBottom: 10 }}>Pending tasks</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {PENDING_TASKS.map((t, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13 }}>
              <span style={{ flex: 1, color: B.black }}>{t.text}</span>
              <span style={{ color: N.faint, fontSize: 12 }}>{nameOf(t.owner_id).split(" ")[0]}, {t.due}</span>
              <Pill status={t.status} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <div style={{ ...DISPLAY, fontSize: 11, color: N.muted, marginBottom: 10 }}>Current projects</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {PROJECTS.map((p, i) => (
            <div key={i}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}><span style={{ color: B.black }}>{p.name}</span><span style={{ color: N.muted }}>{p.progress}%</span></div>
              <ProgressBar value={p.progress} color={p.status === "off_track" ? B.red : B.darkBlue} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <div style={{ ...DISPLAY, fontSize: 11, color: N.muted, marginBottom: 10 }}>Next twelve months</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ROADMAP.map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
              <span style={{ width: 64, flexShrink: 0, color: N.muted }}>{r.when}</span>
              <span style={{ flex: 1, color: B.black }}>{r.item}</span>
              <Pill status={r.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
const navBtn = { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 7, border: `1px solid ${N.line}`, background: B.white, cursor: "pointer", color: B.darkBlue };

function ScreenLabel({ icon: Icon, children, accent }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
      <Icon size={14} color={accent} />
      <span style={{ ...DISPLAY, fontSize: 10.5, color: N.muted }}>{children}</span>
    </div>
  );
}

function MeetingMode({ period, onExit }) {
  const [current, setCurrent] = useState(0);
  const [view, setView] = useState("split");
  const [checked, setChecked] = useState(TOPICS.map(() => false));
  const [asksDone, setAsksDone] = useState(ASKS.map(() => false));
  const [notes, setNotes] = useState({ ...TOPIC_NOTES });
  const toggle = (i) => setChecked(checked.map((c, idx) => (idx === i ? !c : c)));
  const toggleAsk = (i) => setAsksDone(asksDone.map((c, idx) => (idx === i ? !c : c)));
  const topic = TOPICS[current];

  const slideFrame = (child, label) => (
    <div>
      <ScreenLabel icon={Monitor} accent={B.darkBlue}>{label}</ScreenLabel>
      <div style={{ border: `1px solid ${N.line}`, borderRadius: 12, background: B.white, padding: "28px 30px" }}>{child}</div>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18, flexWrap: "wrap" }}>
        <div>
          <div style={{ ...DISPLAY, fontSize: 15, color: B.darkBlue }}>{period} meeting</div>
          <div style={{ fontSize: 12.5, color: N.muted, marginTop: 2 }}>{CLIENT.company_name}, June 2026</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <SegToggle value={view} onChange={setView} options={[
            { value: "presenter", label: "Presenter", icon: StickyNote },
            { value: "presented", label: "Presented", icon: Monitor },
            { value: "split", label: "Side by side", icon: LayoutDashboard },
          ]} />
          <button onClick={onExit} style={{ display: "inline-flex", alignItems: "center", gap: 6, border: `1px solid ${N.line}`, background: B.white, color: B.red, fontFamily: FONT_BODY, fontSize: 13, fontWeight: 500, padding: "7px 13px", borderRadius: 9, cursor: "pointer" }}><X size={14} />End meeting</button>
        </div>
      </div>

      {view === "split" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.25fr)", gap: 20, alignItems: "start" }}>
            <div>
              <ScreenLabel icon={StickyNote} accent={B.red}>Your screen, notes</ScreenLabel>
              <div style={{ border: `1px solid ${N.line}`, borderRadius: 12, background: B.white, padding: "18px 20px", maxHeight: 560, overflowY: "auto" }}>
                <PresenterPanel current={current} setCurrent={setCurrent} checked={checked} toggle={toggle} notes={notes} setNotes={setNotes} asksDone={asksDone} toggleAsk={toggleAsk} />
              </div>
            </div>
            {slideFrame(<PresentedSlide topic={topic} />, "Shared screen")}
          </div>
          <div style={{ marginTop: 14, fontSize: 12.5, color: N.faint, textAlign: "center" }}>
            On a call these open on two monitors. The shared screen goes to Zoom, your notes stay in front of the camera. Here they sit side by side.
          </div>
        </>
      )}
      {view === "presenter" && (
        <div style={{ border: `1px solid ${N.line}`, borderRadius: 12, background: B.white, padding: "18px 20px", maxWidth: 760, margin: "0 auto" }}>
          <PresenterPanel current={current} setCurrent={setCurrent} checked={checked} toggle={toggle} notes={notes} setNotes={setNotes} asksDone={asksDone} toggleAsk={toggleAsk} />
        </div>
      )}
      {view === "presented" && (
        <div style={{ maxWidth: 800, margin: "0 auto" }}>{slideFrame(<PresentedSlide topic={topic} />, "Shared screen")}</div>
      )}
    </div>
  );
}

function StartMeetingButton({ label, period, onStart }) {
  return (
    <button onClick={() => onStart(period)} style={{ display: "inline-flex", alignItems: "center", gap: 8, border: "none", background: B.red, color: B.white, fontFamily: FONT_BODY, fontSize: 13.5, fontWeight: 500, padding: "9px 16px", borderRadius: 9, cursor: "pointer" }}>
      <Play size={15} />{label}
    </button>
  );
}

function MeetingRecap({ meetings = MEETINGS, showPending = true }) {
  const items = useMemo(() => {
    const fromMeetings = meetings.flatMap((m) => (m.actionItems || []).map((a, idx) => ({
      id: m.date + "-" + idx, text: a.text, owner_id: a.owner_id, due: a.due, done: !!a.done, source: m.type + " · " + m.date,
    })));
    const fromPending = showPending ? PENDING_TASKS.map((t, idx) => ({
      id: "pending-" + idx, text: t.text, owner_id: t.owner_id, due: t.due, done: t.status === "done", source: "Open task list",
    })) : [];
    return [...fromMeetings, ...fromPending];
  }, [meetings, showPending]);
  const [done, setDone] = useState(() => { const m = {}; items.forEach((it) => { m[it.id] = it.done; }); return m; });
  const toggle = (id) => setDone((d) => ({ ...d, [id]: !d[id] }));
  const openCount = items.filter((it) => !done[it.id]).length;
  const ordered = [...items].sort((a, b) => (done[a.id] === done[b.id] ? 0 : done[a.id] ? 1 : -1));
  const recentNotes = meetings.filter((m) => m.notes && m.actual != null).slice(0, 4);

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <SectionHeading icon={ListChecks}>Recap, open items from past meetings</SectionHeading>
        <span style={{ marginLeft: "auto", fontSize: 12, color: N.muted, marginBottom: 14 }}>{openCount} open · {items.length - openCount} done</span>
      </div>
      <div style={{ fontSize: 13, color: N.muted, lineHeight: 1.6, marginBottom: 14 }}>
        Every task and action item carried in from previous meetings, in one place. Walk it at the top of the call and check off what got done so the status stays current.
      </div>
      <div style={{ display: "grid", gap: 7 }}>
        {ordered.map((it) => {
          const on = done[it.id];
          return (
            <div key={it.id} onClick={() => toggle(it.id)} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", borderRadius: 9, border: `1px solid ${N.line}`, background: on ? N.fill : B.white, cursor: "pointer" }}>
              <span style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, border: on ? "none" : `1.5px solid ${N.faint}`, background: on ? B.darkBlue : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>{on && <Check size={12} color={B.white} strokeWidth={3} />}</span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: on ? N.faint : B.black, textDecoration: on ? "line-through" : "none" }}>{it.text}</span>
              <span style={{ fontSize: 11.5, color: N.faint, whiteSpace: "nowrap" }}>{nameOf(it.owner_id).split(" ")[0]}{it.due ? ", " + it.due : ""}</span>
              <span style={{ fontSize: 10.5, color: N.faint, whiteSpace: "nowrap" }}>· {it.source}</span>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${N.line}` }}>
        <div style={{ ...DISPLAY, fontSize: 10.5, color: N.faint, marginBottom: 10 }}>Recall, recent meeting notes</div>
        <div style={{ display: "grid", gap: 8 }}>
          {recentNotes.map((m, i) => (
            <div key={i} style={{ fontSize: 13, color: N.muted, lineHeight: 1.55 }}>
              <span style={{ color: B.black, fontWeight: 500 }}>{m.date}</span>, {m.title}. <span>{m.notes}</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11.5, color: N.faint, marginTop: 10 }}>Full notes, recording, transcript, wins, and attendance for each meeting are in the history below.</div>
      </div>
    </Card>
  );
}

function MeetingsTab({ tickets, onUpdate, rocks = [], todos = [], issues = [], setRocks = () => {}, setTodos = () => {}, setIssues = () => {}, typeView = "all", setTypeView = () => {}, meetings = MEETINGS }) {
  const [detail, setDetail] = useState(null);
  const [cadence, setCadence] = useState("Monthly");
  const [confirmed, setConfirmed] = useState({});
  const [editId, setEditId] = useState(null);
  const windowDays = cadence === "Quarterly" ? 92 : 31;
  const periodWord = cadence === "Quarterly" ? "quarter" : "month";
  const [deptView, setDeptView] = useState("all");
  const meetingsView = useMemo(() => meetings.filter((m) => {
    const deptOk = deptView === "all" ? true : deptView === "fulfillment" ? m.dept === "Fulfillment" : m.dept !== "Fulfillment";
    const isDir = EMP[m.ranBy] && /Director/i.test(EMP[m.ranBy].role || "");
    const typeOk = typeView === "director" ? isDir : true;
    return deptOk && typeOk;
  }), [deptView, typeView, meetings]);
  const openTix = tickets.filter((t) => t.status === "open");
  const recentClosed = tickets.filter((t) => t.status === "closed" && daysSince(t.closed) != null && daysSince(t.closed) <= windowDays);
  const toggleConf = (id) => setConfirmed((c) => ({ ...c, [id]: !c[id] }));
  const setStatus = (t, v) => onUpdate(t.id, { status: v, closed: v === "closed" ? (t.closed || importDateStr()) : null });

  const inp = { width: "100%", boxSizing: "border-box", fontFamily: FONT_BODY, fontSize: 13, color: B.black, border: `1px solid ${N.line}`, borderRadius: 7, padding: "7px 9px" };
  const lbl = { ...DISPLAY, fontSize: 9.5, color: N.faint, marginBottom: 4, display: "block" };

  const renderRow = (t, confirmable) => {
    const editing = editId === t.id;
    const on = confirmed[t.id];
    return (
      <div key={t.id} style={{ border: `1px solid ${N.line}`, borderRadius: 9, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 12px", background: confirmable && on ? N.fill : B.white }}>
          {confirmable && (
            <span onClick={() => toggleConf(t.id)} title="Confirm functioning" style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, cursor: "pointer", border: on ? "none" : `1.5px solid ${N.faint}`, background: on ? B.darkBlue : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>{on && <Check size={12} color={B.white} strokeWidth={3} />}</span>
          )}
          <button onClick={() => setEditId(editing ? null : t.id)} style={{ flex: 1, minWidth: 0, textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <span style={{ fontSize: 13.5, color: on ? N.faint : B.black, textDecoration: on ? "line-through" : "none" }}>{t.subject} <span style={{ color: N.faint }}>· {t.topic}</span></span>
          </button>
          <span style={{ fontSize: 11.5, color: N.faint, whiteSpace: "nowrap" }}>{t.owner.split(" ")[0]}</span>
          {confirmable
            ? <span style={{ fontSize: 11.5, color: N.faint, whiteSpace: "nowrap" }}>closed {t.closed}</span>
            : <span style={{ fontSize: 11.5, fontWeight: 600, color: B.red, whiteSpace: "nowrap" }}>{daysSince(t.opened)}d open</span>}
          <button onClick={() => setEditId(editing ? null : t.id)} title="Edit" style={{ width: 26, height: 26, borderRadius: 7, border: `1px solid ${N.line}`, background: B.white, color: editing ? B.darkBlue : N.muted, cursor: "pointer", display: "grid", placeItems: "center", padding: 0 }}><Pencil size={12} /></button>
        </div>
        {editing && (
          <div style={{ padding: "12px", borderTop: `1px solid ${N.line}`, display: "flex", flexDirection: "column", gap: 10 }}>
            <div><span style={lbl}>Subject</span><input value={t.subject} onChange={(e) => onUpdate(t.id, { subject: e.target.value })} style={inp} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><span style={lbl}>Topic</span><input value={t.topic} onChange={(e) => onUpdate(t.id, { topic: e.target.value })} style={inp} /></div>
              <div><span style={lbl}>Owner</span><input value={t.owner} onChange={(e) => onUpdate(t.id, { owner: e.target.value })} style={inp} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><span style={lbl}>Status</span>
                <select value={t.status} onChange={(e) => setStatus(t, e.target.value)} style={inp}>
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div><span style={lbl}>Closed date</span><input value={t.closed || ""} placeholder="Open" onChange={(e) => onUpdate(t.id, { closed: e.target.value || null })} style={inp} /></div>
            </div>
            <div><span style={lbl}>Note</span><input value={t.note || ""} placeholder="Add a note for the meeting" onChange={(e) => onUpdate(t.id, { note: e.target.value })} style={inp} /></div>
            <button onClick={() => setEditId(null)} style={{ alignSelf: "flex-start", fontFamily: FONT_BODY, fontSize: 12.5, fontWeight: 600, color: B.white, background: B.darkBlue, border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer" }}>Done</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {detail && (() => {
        const map = { rock: [rocks, setRocks], todo: [todos, setTodos], issue: [issues, setIssues] }[detail.kind];
        const it = map[0].find((x) => x.id === detail.id);
        if (!it) return null;
        const patch = (pt) => map[1]((arr) => arr.map((x) => (x.id === detail.id ? { ...x, ...pt } : x)));
        return <ItemDetailModal kind={detail.kind} item={it} onPatch={patch} onClose={() => setDetail(null)} />;
      })()}
      <Card>
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <SectionHeading icon={CalendarDays}>Meeting prep</SectionHeading>
          <div style={{ marginLeft: "auto", marginBottom: 14 }}>
            <SegToggle value={cadence} onChange={setCadence} options={[{ value: "Monthly", label: "Monthly" }, { value: "Quarterly", label: "Quarterly" }]} />
          </div>
        </div>
        <div style={{ fontSize: 13.5, color: N.muted, lineHeight: 1.6 }}>
          Use the {periodWord} meeting to populate and work the projects, tasks, and issues. Everything still open carries to the next meeting, along with the open requests and the ones completed in the last {periodWord}, so nothing gets dropped.
        </div>
      </Card>

      <Card>
        <SectionHeading icon={ListChecks}>Carries to the next meeting</SectionHeading>
        <div style={{ fontSize: 12.5, color: N.faint, marginBottom: 14 }}>The open projects, tasks, and issues are always referenced when a new meeting is scheduled. Populate and update them on the LAVA OS tab.</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          {[
            { label: "Projects", icon: Flag, items: rocks.map((r) => ({ title: r.title, meta: r.owner, flag: r.status === "off_track", kind: "rock", id: r.id })) },
            { label: "Tasks", icon: ListChecks, items: todos.filter((t) => !t.done).map((t) => ({ title: t.title, meta: t.owner, kind: "todo", id: t.id })) },
            { label: "Issues", icon: AlertTriangle, items: issues.filter((x) => x.status !== "resolved").map((x) => ({ title: x.title, meta: x.owner, kind: "issue", id: x.id })) },
          ].map((g) => (
            <div key={g.label} style={{ border: `1px solid ${N.line}`, borderRadius: 11, padding: "13px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                <g.icon size={14} color={B.darkBlue} />
                <span style={{ ...DISPLAY, fontSize: 10.5, color: B.darkBlue }}>{g.label}</span>
                <span style={{ marginLeft: "auto", fontSize: 11.5, fontWeight: 700, color: N.muted }}>{g.items.length}</span>
              </div>
              {g.items.length === 0
                ? <div style={{ fontSize: 12.5, color: N.faint }}>Nothing open.</div>
                : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {g.items.map((it, i) => (
                      <div key={i} onClick={() => setDetail({ kind: it.kind, id: it.id })} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: it.flag ? B.red : B.teal, flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 13, color: B.black, minWidth: 0 }}>{it.title || "Untitled"}</span>
                        {it.meta && <span style={{ fontSize: 11, color: N.faint, whiteSpace: "nowrap" }}>{it.meta.split(" ")[0]}</span>}
                      </div>
                    ))}
                  </div>}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionHeading icon={ClipboardList}>Requests on the agenda</SectionHeading>
        <div style={{ ...DISPLAY, fontSize: 10.5, color: N.faint, margin: "2px 0 8px" }}>Open requests to review ({openTix.length})</div>
        {openTix.length === 0 ? (
          <div style={{ fontSize: 13, color: N.faint }}>No open requests.</div>
        ) : (
          <div style={{ display: "grid", gap: 7 }}>{openTix.map((t) => renderRow(t, false))}</div>
        )}

        <div style={{ ...DISPLAY, fontSize: 10.5, color: N.faint, margin: "18px 0 8px" }}>Completed in the last {periodWord} ({recentClosed.length}), confirm functioning</div>
        {recentClosed.length === 0 ? (
          <div style={{ fontSize: 13, color: N.faint }}>Nothing completed in this window.</div>
        ) : (
          <div style={{ display: "grid", gap: 7 }}>{recentClosed.map((t) => renderRow(t, true))}</div>
        )}
        <div style={{ fontSize: 11.5, color: N.faint, marginTop: 12, lineHeight: 1.55 }}>Tick the box to confirm a completed request is working. Click a request to edit its subject, owner, status, or add a note. Edits show on the Requests tab too.</div>
      </Card>

      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <SectionHeading icon={Network}>Notes and meetings</SectionHeading>
          <div style={{ marginLeft: "auto", display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
            <SegToggle value={typeView} onChange={setTypeView} options={[{ value: "all", label: "All meetings" }, { value: "director", label: "Director" }]} />
            <SegToggle value={deptView} onChange={setDeptView} options={[{ value: "all", label: "All" }, { value: "fulfillment", label: "Fulfillment" }, { value: "other", label: "Other departments" }]} />
          </div>
        </div>
        <div style={{ fontSize: 13, color: N.muted, lineHeight: 1.55 }}>Filter the recap notes and the meeting history by department. Fulfillment is your team. Other departments covers the meetings run by sales, customer success, and insurance.</div>
      </Card>

      <MeetingRecap key={deptView} meetings={meetingsView} showPending={deptView === "all"} />

      <Card>
        <SectionHeading icon={CalendarDays}>Meeting history</SectionHeading>
        <MeetingLog key={deptView} meetings={meetingsView} />
      </Card>
    </div>
  );
}

// ── Tools, the Lava Way ────────────────────────────────────────────
const CADENCE_RHYTHM = [
  { rhythm: "Weekly accountability", who: "Sales manager and service manager", focus: "Numbers, blockers, and who owns what this week" },
  { rhythm: "Monthly", who: "Project manager and account manager with the owner", focus: "Build performance, virtual assistant work, and support needed" },
  { rhythm: "Quarterly", who: "Fulfillment director with the owner", focus: "KPI review, goals, new tools, and strategy" },
];
const VITAL_FEW = [
  { lever: "Lead response under five minutes", impact: "high" },
  { lever: "Quote follow up cadence", impact: "high" },
  { lever: "Retention calls before every renewal", impact: "high" },
  { lever: "Review requests after every bind", impact: "medium" },
  { lever: "Pipeline hygiene, no stale deals", impact: "medium" },
];
const PROCESS_HEALTH = [
  { process: "New lead intake", health: "on_track", fix: "Virtual assistant owns it, SOP in place" },
  { process: "Quote follow up", health: "off_track", fix: "Assign a virtual assistant, add an automation reminder" },
  { process: "Renewal review", health: "in_progress", fix: "Build the SOP, automate the survey" },
  { process: "Service requests", health: "on_track", fix: "Automated routing is live" },
  { process: "Lost deal win back", health: "off_track", fix: "Automate the smart cycle, virtual assistant works the list" },
];
const PEOPLE_ANALYZER = [
  { role: "Sales manager", values: true, gets: true, wants: true, capacity: true },
  { role: "Sales producer", values: true, gets: true, wants: true, capacity: false },
  { role: "Service CSR", values: true, gets: true, wants: false, capacity: true },
];
const BENCHMARKS = [
  { metric: "Lead to quote rate", agency: 33, benchmark: 42 },
  { metric: "Percent automated", agency: 98, benchmark: 95 },
  { metric: "Retention", agency: 94, benchmark: 91 },
  { metric: "Review growth", agency: 65, benchmark: 40 },
];

function ImpactPill({ impact }) {
  const high = impact === "high";
  return <span style={{ fontSize: 11, fontWeight: 500, background: high ? "rgba(231,56,53,0.10)" : "rgba(36,36,45,0.08)", color: high ? B.red : B.darkBlue, padding: "2px 9px", borderRadius: 8 }}>{impact}</span>;
}
function YesNo({ on }) {
  return on
    ? <Check size={15} color={B.darkBlue} strokeWidth={3} />
    : <span style={{ color: N.faint, fontSize: 15 }}>–</span>;
}

// ── Stubs ──────────────────────────────────────────────────────────
function Stub({ icon: Icon, title, body, accent = B.darkBlue }) {
  return (
    <div style={{ border: `1px dashed ${N.line}`, borderRadius: 12, padding: "44px 32px", textAlign: "center", maxWidth: 560, margin: "0 auto" }}>
      <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 46, height: 46, borderRadius: 12, background: N.fill, marginBottom: 16 }}><Icon size={22} color={accent} /></div>
      <div style={{ ...DISPLAY, fontSize: 14, color: B.darkBlue, marginBottom: 10 }}>{title}</div>
      <div style={{ fontSize: 14, color: N.muted, lineHeight: 1.65 }}>{body}</div>
    </div>
  );
}

// ── App ────────────────────────────────────────────────────────────
const TECH_PRESETS = {
  AMS: ["HawkSoft", "Applied Epic", "EZLynx", "AMS360", "NowCerts", "QQ Catalyst"],
  CRM: ["AgencyZoom", "HubSpot", "GoHighLevel", "InsuredMine", "Salesforce", "Zoho"],
  Email: ["Gmail", "Outlook", "Google Workspace", "Microsoft 365"],
  "Form software": ["Cognito Forms", "Jotform", "Typeform", "Google Forms"],
  "AI tools": ["ChatGPT", "Claude", "Copilot", "Jasper"],
  Integrators: ["Zapier", "Make", "Risk Advisor", "Sembly", "Canopy Connect", "Gaya"],
  "Phone systems": ["RingCentral", "Aircall", "Dialpad", "JustCall", "CallRail"],
  Prospecting: ["Meet Leo", "Apollo", "ZoomInfo", "Smartlead"],
  "E-signature": ["DocuSign", "Dropbox Sign", "Adobe Sign"],
  Other: [],
};
const TECH_CATS = Object.keys(TECH_PRESETS);
const TECH_SEED = [
  { name: "HawkSoft", category: "AMS", usage: "high", pct: 95, eff: "high", sentiment: "good", start: "Mar 18, 2026", notes: "System of record for policies and the book." },
  { name: "AgencyZoom", category: "CRM", usage: "high", pct: 92, eff: "high", sentiment: "good", start: "Mar 18, 2026", notes: "Pipelines and automations run here. Heavily used." },
  { name: "Google Workspace", category: "Email", usage: "high", pct: 90, eff: "medium", sentiment: "good", start: "Mar 18, 2026", notes: "Email, docs, and shared drives." },
  { name: "Cognito Forms", category: "Form software", usage: "high", pct: 80, eff: "high", sentiment: "good", start: "Mar 25, 2026", notes: "Intake forms feed the CRM." },
  { name: "ChatGPT", category: "AI tools", usage: "medium", pct: 55, eff: "high", sentiment: "good", start: "Apr 1, 2026", notes: "Drafting follow ups and summaries." },
  { name: "Zapier", category: "Integrators", usage: "high", pct: 85, eff: "high", sentiment: "good", start: "Mar 25, 2026", notes: "Moves form data into the CRM and AMS." },
  { name: "Risk Advisor", category: "Integrators", usage: "medium", pct: 60, eff: "high", sentiment: "good", start: "Apr 8, 2026", notes: "Prefills carrier quotes." },
  { name: "Sembly", category: "Integrators", usage: "high", pct: 75, eff: "high", sentiment: "good", start: "Apr 15, 2026", notes: "Commercial form filling for ACORDs and supplementals." },
  { name: "RingCentral", category: "Phone systems", usage: "medium", pct: 65, eff: "medium", sentiment: "mixed", start: "Mar 18, 2026", notes: "Phone and SMS. Call logging into the CRM is inconsistent." },
  { name: "Meet Leo", category: "Prospecting", usage: "low", pct: 30, eff: "medium", sentiment: "mixed", start: "May 6, 2026", notes: "On trial for cold prospecting. Team adoption is low so far." },
  { name: "DocuSign", category: "E-signature", usage: "medium", pct: 60, eff: "high", sentiment: "good", start: "Apr 1, 2026", notes: "E-signature on applications and forms." },
];

function DotRating({ value, onSet, label }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: N.muted, fontWeight: 600, marginBottom: 5 }}>{label}</div>
      <div style={{ display: "flex", gap: 4 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => onSet(value === n ? 0 : n)} title={`${n} of 5`} style={{ width: 16, height: 16, borderRadius: "50%", border: "none", cursor: "pointer", padding: 0, background: n <= value ? B.darkBlue : N.line }} />
        ))}
      </div>
    </div>
  );
}

function TechStack({ tools, setTools }) {
  const [otherCat, setOtherCat] = useState(null);
  const [otherText, setOtherText] = useState("");

  const has = (cat, name) => tools.find((t) => t.category === cat && t.name === name);
  const toggle = (cat, name) => setTools((ts) => {
    const ex = ts.find((t) => t.category === cat && t.name === name);
    return ex ? ts.filter((t) => t !== ex) : [...ts, { id: cat + ":" + name, name, category: cat, usage: "medium", pct: 50, eff: "medium", sentiment: "good", start: "", notes: "" }];
  });
  const addOther = (cat) => { const n = otherText.trim(); if (n && !has(cat, n)) setTools((ts) => [...ts, { id: cat + ":" + n, name: n, category: cat, usage: "medium", pct: 50, eff: "medium", sentiment: "good", start: "", notes: "" }]); setOtherText(""); setOtherCat(null); };
  const setField = (id, f, v) => setTools((ts) => ts.map((t) => (t.id === id ? { ...t, [f]: v } : t)));
  const removeTool = (id) => setTools((ts) => ts.filter((t) => t.id !== id));

  const watch = tools.filter((t) => t.sentiment === "poor" || t.usage === "low");
  const SENT_OPTS = [["good", "Working well"], ["mixed", "Mixed"], ["poor", "Not working"]];
  const LEVEL_OPTS = [["high", "High"], ["medium", "Medium"], ["low", "Low"]];
  const selStyle = { fontFamily: FONT_BODY, fontSize: 12.5, color: B.black, border: `1px solid ${N.line}`, borderRadius: 6, padding: "5px 7px", background: B.white, width: "100%", boxSizing: "border-box" };
  const cellTd = { padding: "8px 10px", verticalAlign: "middle" };
  const headTh = { ...DISPLAY, fontSize: 10, color: N.faint, textAlign: "left", padding: "0 10px 9px", whiteSpace: "nowrap" };

  const chipStyle = (on) => ({
    display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", fontFamily: FONT_BODY,
    fontSize: 12.5, fontWeight: 600, borderRadius: 999, padding: "7px 13px",
    border: `1px solid ${on ? B.darkBlue : N.line}`, background: on ? B.darkBlue : B.white, color: on ? B.white : B.darkBlue,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Card>
        <SectionHeading icon={Boxes}>Tech stack</SectionHeading>
        <div style={{ fontSize: 13.5, color: N.muted, lineHeight: 1.6, marginBottom: 14 }}>
          Tap the tools the agency uses in each category. Then rate how much the team uses each one and whether it saves time and effort, so the stack stays lean and the team works the most streamlined way.
        </div>
        {watch.length > 0 && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 9, padding: "11px 14px", borderRadius: 9, background: "rgba(231,56,53,0.07)", border: "1px solid rgba(231,56,53,0.25)" }}>
            <AlertTriangle size={15} color={B.red} style={{ marginTop: 1, flexShrink: 0 }} />
            <div style={{ fontSize: 13, color: B.black, lineHeight: 1.55 }}>
              Streamline watch. {watch.map((t) => t.name).join(", ")} {watch.length === 1 ? "is" : "are"} low usage or not landing. The leanest stack is the one the team actually uses, so flag these next meeting to keep, replace, or drop.
            </div>
          </div>
        )}
      </Card>

      <Card>
        <SectionHeading icon={Boxes}>Select your tools</SectionHeading>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 4 }}>
          {TECH_CATS.map((cat) => {
            const names = Array.from(new Set([...TECH_PRESETS[cat], ...tools.filter((t) => t.category === cat).map((t) => t.name)]));
            return (
              <div key={cat}>
                <div style={{ ...DISPLAY, fontSize: 11, color: B.darkBlue, marginBottom: 8 }}>{cat}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {names.map((name) => {
                    const on = !!has(cat, name);
                    return (
                      <button key={name} onClick={() => toggle(cat, name)} style={chipStyle(on)}>
                        {on && <Check size={13} />}{name}
                      </button>
                    );
                  })}
                  {otherCat === cat ? (
                    <span style={{ display: "inline-flex", gap: 6 }}>
                      <input value={otherText} autoFocus placeholder="Tool name" onChange={(e) => setOtherText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addOther(cat)} style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: B.black, border: `1px solid ${N.line}`, borderRadius: 999, padding: "6px 12px", minWidth: 130 }} />
                      <button onClick={() => addOther(cat)} style={{ fontFamily: FONT_BODY, fontSize: 12.5, fontWeight: 600, color: B.white, background: B.teal, border: "none", borderRadius: 999, padding: "0 13px", cursor: "pointer" }}>Add</button>
                    </span>
                  ) : (
                    <button onClick={() => { setOtherCat(cat); setOtherText(""); }} style={{ ...chipStyle(false), borderStyle: "dashed", color: N.muted }}>+ Other</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <SectionHeading icon={Gauge}>How the tools are landing</SectionHeading>
        <div style={{ fontSize: 12.5, color: N.faint, lineHeight: 1.55, marginBottom: 14 }}>
          One row per selected tool. Set how the agency feels it is going, the team usage, the percent of usage, and the tool effectiveness. Fill this in together in a meeting.
        </div>
        {tools.length === 0 ? (
          <div style={{ fontSize: 13, color: N.faint }}>Select tools above to rate them.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
              <thead>
                <tr>
                  <th style={headTh}>Tool</th>
                  <th style={headTh}>Category</th>
                  <th style={headTh}>How it is going</th>
                  <th style={headTh}>Team usage</th>
                  <th style={headTh}>Usage %</th>
                  <th style={headTh}>Effectiveness</th>
                  <th style={headTh}>Start date</th>
                  <th style={headTh}>Notes</th>
                  <th style={headTh}></th>
                </tr>
              </thead>
              <tbody>
                {tools.map((t) => (
                  <tr key={t.id} onClick={() => setDetailId(t.id)} style={{ borderTop: `1px solid ${N.line}`, cursor: "pointer" }}>
                    <td style={{ ...cellTd, minWidth: 130 }}><span style={{ fontSize: 13.5, fontWeight: 600, color: B.black }}>{t.name}</span></td>
                    <td style={cellTd}><span style={{ fontSize: 12, color: N.muted, whiteSpace: "nowrap" }}>{t.category}</span></td>
                    <td style={{ ...cellTd, minWidth: 130 }}>
                      <select value={t.sentiment} onChange={(e) => setField(t.id, "sentiment", e.target.value)} style={{ ...selStyle, color: t.sentiment === "poor" ? B.red : B.black }}>
                        {SENT_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </td>
                    <td style={{ ...cellTd, minWidth: 96 }}>
                      <select value={t.usage} onChange={(e) => setField(t.id, "usage", e.target.value)} style={selStyle}>
                        {LEVEL_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </td>
                    <td style={{ ...cellTd, minWidth: 90 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <input type="number" min="0" max="100" value={t.pct} onChange={(e) => { const n = Math.max(0, Math.min(100, parseInt(e.target.value || "0", 10) || 0)); setField(t.id, "pct", n); }} style={{ ...selStyle, width: 58 }} />
                        <span style={{ fontSize: 12, color: N.muted }}>%</span>
                      </span>
                    </td>
                    <td style={{ ...cellTd, minWidth: 96 }}>
                      <select value={t.eff} onChange={(e) => setField(t.id, "eff", e.target.value)} style={selStyle}>
                        {LEVEL_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </td>
                    <td style={{ ...cellTd, minWidth: 140 }}><input type="date" value={t.start || ""} onChange={(e) => setField(t.id, "start", e.target.value)} style={selStyle} /></td>
                    <td style={{ ...cellTd, minWidth: 220 }}><textarea value={t.notes} placeholder="Notes to review" onChange={(e) => setField(t.id, "notes", e.target.value)} rows={2} style={{ ...selStyle, resize: "vertical", fontFamily: FONT_BODY }} /></td>
                    <td style={cellTd}><button onClick={() => removeTool(t.id)} title="Remove" style={{ width: 26, height: 26, borderRadius: 7, border: `1px solid ${N.line}`, background: B.white, color: N.muted, cursor: "pointer", display: "grid", placeItems: "center", padding: 0 }}><X size={13} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

const TIMELINE_PHASES = [
  { name: "Onboarding", start: "2026-03-04", end: "2026-04-01" },
  { name: "Automation build", start: "2026-04-01", end: "2026-05-28" },
  { name: "Optimization", start: "2026-05-28", end: "2026-08-31" },
];
const TIMELINE_TASKS = [
  { name: "QAQC data cleanup", start: "2026-04-20", end: "2026-05-10", status: "done" },
  { name: "Renewal prep SOP", start: "2026-05-15", end: "2026-06-10", status: "in_progress" },
  { name: "Lead routing automation", start: "2026-06-01", end: "2026-06-24", status: "in_progress" },
  { name: "Quarterly review prep", start: "2026-06-18", end: "2026-06-25", status: "not_started" },
];
const TL_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// Recurring quarterly reviews and content re-reviews plotted on the timeline.
const REVIEWS = [
  { date: "2026-06-30", label: "Quarterly big picture review" },
  { date: "2026-07-15", label: "Content review" },
  { date: "2026-09-30", label: "Quarterly big picture review" },
  { date: "2026-10-15", label: "Content review" },
  { date: "2026-12-31", label: "Quarterly big picture review" },
  { date: "2027-01-15", label: "Content review" },
  { date: "2027-03-31", label: "Quarterly big picture review" },
];

function TimelineGantt({ rocks = [], todos = [] }) {
  const dayMs = 86400000;
  const D = (s) => new Date(s);
  const missed = (st) => ["no_show", "canceled", "off_track", "behind"].includes(st);

  const allDates = [
    ...TIMELINE_PHASES.flatMap((p) => [D(p.start), D(p.end)]),
    ...TIMELINE_TASKS.flatMap((t) => [D(t.start), D(t.end)]),
    ...MEETINGS.map((m) => D(m.date)),
    ...REVIEWS.map((r) => D(r.date)),
    ...rocks.filter((r) => r.due).map((r) => D(r.due)),
    ...todos.filter((t) => t.due).map((t) => D(t.due)),
  ];
  const minT = new Date(Math.min(...allDates));
  const maxT = new Date(Math.max(...allDates));
  const winStart = new Date(minT.getFullYear(), minT.getMonth(), 1);
  const winEnd = new Date(maxT.getFullYear(), maxT.getMonth() + 1, 0);
  const totalDays = Math.round((winEnd - winStart) / dayMs) + 1;
  const pxPerDay = 5.2;
  const trackW = Math.round(totalDays * pxPerDay);
  const xFor = (d) => ((D(d) - winStart) / dayMs) * pxPerDay;

  const months = [];
  let cur = new Date(winStart);
  while (cur <= winEnd) { months.push(new Date(cur)); cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1); }
  // Demo "today". In production this is the real current date.
  const TODAY = new Date("2026-06-06");

  const labelW = 152, rowH = 30, headerH = 26;
  const rows = [
    { kind: "group", label: "Roadmap" },
    ...TIMELINE_PHASES.map((p) => ({ kind: "bar", label: p.name, start: p.start, end: p.end, color: B.teal })),
    { kind: "group", label: "Tasks" },
    ...TIMELINE_TASKS.map((t) => ({ kind: "bar", label: t.name, start: t.start, end: t.end, color: B.darkBlue, done: t.status === "done" })),
    { kind: "group", label: "Meetings" },
    { kind: "meetings", label: "Reviews and kickoffs" },
    { kind: "group", label: "Recurring reviews" },
    { kind: "reviews", label: "Quarterly reviews" },
    { kind: "group", label: "Rocks and to-dos" },
    { kind: "rocks", label: "Rocks" },
    { kind: "todos", label: "To-dos" },
  ];

  const Swatch = ({ color, outline, label }) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: N.muted }}>
      <span style={{ width: 12, height: 12, borderRadius: 3, background: outline ? B.white : color, border: `1.5px solid ${color}` }} />{label}
    </span>
  );

  return (
    <Card>
      <SectionHeading icon={CalendarDays} color={B.teal}>Timeline</SectionHeading>
      <div style={{ fontSize: 12.5, color: N.faint, lineHeight: 1.55, marginBottom: 12 }}>
        Roadmap phases, tasks, and meetings on one time axis. Meetings that were canceled or no showed are flagged in red.
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 14 }}>
        <Swatch color={B.teal} label="Roadmap phase" />
        <Swatch color={B.darkBlue} label="Task" />
        <Swatch color={B.darkBlue} outline label="Task done" />
        <Swatch color={B.darkBlue} label="Meeting held" />
        <Swatch color={B.red} label="Canceled or no show" />
        <Swatch color={B.darkBlue} outline label="Upcoming meeting" />
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: N.muted }}><span style={{ width: 11, height: 11, background: B.teal, transform: "rotate(45deg)", borderRadius: 2 }} /> Quarterly review</span>
        <Swatch color={B.darkBlue} label="Rock" />
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: N.muted }}><span style={{ width: 11, height: 11, borderRadius: "50%", background: B.white, border: `1.5px solid ${B.darkBlue}` }} /> To-do</span>
      </div>

      <div style={{ display: "flex", border: `1px solid ${N.line}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ width: labelW, flexShrink: 0, borderRight: `1px solid ${N.line}`, background: N.fill }}>
          <div style={{ height: headerH }} />
          {rows.map((r, i) => (
            <div key={i} style={{ height: rowH, display: "flex", alignItems: "center", padding: "0 12px", borderTop: `1px solid ${N.line}` }}>
              {r.kind === "group"
                ? <span style={{ ...DISPLAY, fontSize: 10, color: B.darkBlue }}>{r.label}</span>
                : <span style={{ fontSize: 12, color: B.black, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.label}</span>}
            </div>
          ))}
        </div>

        <div style={{ overflowX: "auto", flex: 1 }}>
          <div style={{ width: trackW, position: "relative" }}>
            <div style={{ height: headerH, position: "relative", borderBottom: `1px solid ${N.line}` }}>
              {months.map((m, i) => (
                <div key={i} style={{ position: "absolute", left: xFor(m), top: 0, bottom: 0, paddingLeft: 6, fontSize: 10.5, color: N.muted, display: "flex", alignItems: "center", borderLeft: i ? `1px solid ${N.line}` : "none" }}>
                  {TL_MONTHS[m.getMonth()]}
                </div>
              ))}
            </div>
            <div style={{ position: "relative" }}>
              {months.map((m, i) => (i ? <div key={i} style={{ position: "absolute", left: xFor(m), top: 0, bottom: 0, width: 1, background: N.line, opacity: 0.6 }} /> : null))}
              {TODAY >= winStart && TODAY <= winEnd && (
                <div style={{ position: "absolute", left: xFor(TODAY), top: 0, bottom: 0, borderLeft: `2px dashed ${B.darkBlue}`, opacity: 0.45 }} />
              )}
              {rows.map((r, i) => (
                <div key={i} style={{ height: rowH, position: "relative", borderTop: `1px solid ${N.line}` }}>
                  {r.kind === "bar" && (
                    <div style={{ position: "absolute", left: xFor(r.start), width: Math.max(10, xFor(r.end) - xFor(r.start)), top: (rowH - 16) / 2, height: 16, borderRadius: 5, background: r.done ? "transparent" : r.color, border: r.done ? `1.5px solid ${r.color}` : "none", opacity: r.done ? 0.7 : 1, display: "flex", alignItems: "center", paddingLeft: 7, overflow: "hidden" }}>
                      {!r.done && <span style={{ fontSize: 10, color: B.white, whiteSpace: "nowrap" }}>{r.label}</span>}
                    </div>
                  )}
                  {r.kind === "meetings" && MEETINGS.map((m, mi) => {
                    const red = missed(m.status);
                    const upcoming = m.status === "scheduled";
                    return (
                      <div key={mi} title={`${m.date}  ${m.title}  ${STATUS[m.status] ? STATUS[m.status].label : m.status}`}
                        style={{ position: "absolute", left: xFor(m.date) - 5, top: (rowH - 15) / 2, width: 10, height: 15, borderRadius: 3, background: upcoming ? B.white : (red ? B.red : B.darkBlue), border: `1.5px solid ${red ? B.red : B.darkBlue}`, cursor: "default" }} />
                    );
                  })}
                  {r.kind === "reviews" && REVIEWS.map((rv, ri) => (
                    <div key={ri} title={`${rv.date}  ${rv.label}`}
                      style={{ position: "absolute", left: xFor(rv.date) - 6, top: (rowH - 12) / 2, width: 12, height: 12, background: B.teal, transform: "rotate(45deg)", borderRadius: 2, cursor: "default" }} />
                  ))}
                  {r.kind === "rocks" && rocks.filter((x) => x.due).map((x, xi) => (
                    <div key={xi} title={`${x.due}  ${x.title || "Rock"}  ${x.status === "off_track" ? "Off-Track" : "On-Track"}`}
                      style={{ position: "absolute", left: xFor(x.due) - 6, top: (rowH - 12) / 2, width: 12, height: 12, borderRadius: 3, background: x.status === "off_track" ? B.red : B.darkBlue, cursor: "default" }} />
                  ))}
                  {r.kind === "todos" && todos.filter((x) => x.due).map((x, xi) => (
                    <div key={xi} title={`${x.due}  ${x.title || "To-do"}${x.done ? "  done" : ""}`}
                      style={{ position: "absolute", left: xFor(x.due) - 5, top: (rowH - 11) / 2, width: 11, height: 11, borderRadius: "50%", background: x.done ? N.faint : B.white, border: `1.5px solid ${B.darkBlue}`, cursor: "default" }} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div style={{ fontSize: 12, color: N.faint, marginTop: 12, lineHeight: 1.55 }}>
        Hover a meeting marker for the date and status. Phases and tasks read from the roadmap, meetings from the meeting log. Wires to the implementation tracker as it lands.
      </div>
    </Card>
  );
}

// ── Department shell: all accounts, benchmarking, drill into a profile ──
function AccountsNav({ view, setView }) {
  const items = [["accounts", "All accounts", LayoutDashboard], ["benchmark", "Benchmarking", TrendingUp]];
  return (
    <div style={{ display: "flex", gap: 6, padding: "12px 28px", borderBottom: `1px solid ${N.line}`, background: B.white }}>
      {items.map(([id, label, Icon]) => {
        const on = view === id;
        return (
          <button key={id} onClick={() => setView(id)} style={{ display: "inline-flex", alignItems: "center", gap: 7, border: "none", cursor: "pointer", fontFamily: FONT_BODY, fontSize: 13, fontWeight: on ? 600 : 500, padding: "8px 13px", borderRadius: 8, background: on ? B.darkBlue : "transparent", color: on ? B.white : N.muted }}>
            <Icon size={15} /> {label}
          </button>
        );
      })}
    </div>
  );
}

function AccountsList({ onOpen, accounts }) {
  const [filter, setFilter] = useState("all");
  const all = accounts || [];
  const order = { off_track: 0, at_risk: 1, on_track: 2 };
  const rows = all.filter((a) => filter === "all" || a.status === filter).sort((a, b) => order[a.status] - order[b.status]);
  const count = (s) => all.filter((a) => a.status === s).length;
  const filters = [["all", "All " + all.length], ["on_track", "On track " + count("on_track")], ["at_risk", "At risk " + count("at_risk")], ["off_track", "Off track " + count("off_track")]];
  const colHead = { ...DISPLAY, fontSize: 10, color: N.faint };
  return (
    <div style={{ padding: 28 }}>
      <SectionHeading icon={Building2}>Fulfillment accounts</SectionHeading>
      <div style={{ fontSize: 13.5, color: N.muted, lineHeight: 1.6, marginBottom: 16, maxWidth: 720 }}>
        Every client agency the fulfillment department runs, ordered so the ones off track sit on top. Click an agency to open its profile.
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {filters.map(([k, label]) => {
          const on = filter === k;
          return (
            <button key={k} onClick={() => setFilter(k)} style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, cursor: "pointer", borderRadius: 8, padding: "6px 12px", border: `1px solid ${on ? B.darkBlue : N.line}`, background: on ? B.darkBlue : B.white, color: on ? B.white : B.darkBlue }}>{label}</button>
          );
        })}
      </div>
      <Card style={{ padding: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1.3fr 1fr 1fr 1.2fr 1fr", gap: 12, padding: "12px 16px", borderBottom: `1px solid ${N.line}` }}>
          <span style={colHead}>Agency</span><span style={colHead}>Project manager</span><span style={colHead}>Product</span><span style={colHead}>Status</span><span style={colHead}>Progress</span><span style={colHead}>Last meeting</span>
        </div>
        {rows.map((a) => (
          <div key={a.id} onClick={() => onOpen(a.id)} style={{ display: "grid", gridTemplateColumns: "2fr 1.3fr 1fr 1fr 1.2fr 1fr", gap: 12, alignItems: "center", padding: "13px 16px", borderBottom: `1px solid ${N.line}`, cursor: "pointer" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = N.fill; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: B.black }}>{a.name}</span>
            <span style={{ fontSize: 13, color: N.muted }}>{a.pm}</span>
            <span style={{ fontSize: 12.5, color: N.muted }}>{a.product}</span>
            <span><Pill status={a.status} /></span>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ flex: 1, height: 6, background: N.fill, borderRadius: 4, minWidth: 40 }}><span style={{ display: "block", width: `${a.pct}%`, height: "100%", background: a.status === "off_track" ? B.red : B.darkBlue, borderRadius: 4 }} /></span>
              <span style={{ fontSize: 12, color: N.muted }}>{a.pct}%</span>
            </span>
            <DaysBadge days={daysSince(a.lastMtg)} />
          </div>
        ))}
      </Card>
    </div>
  );
}

function Benchmarking() {
  const cell = (v, net) => {
    const ahead = v >= net;
    return <td style={{ ...td, color: ahead ? B.darkBlue : B.red, fontWeight: 600 }}>{v}%{ahead ? " ▲" : " ▼"}</td>;
  };
  return (
    <div style={{ padding: 28 }}>
      <SectionHeading icon={TrendingUp}>Benchmarking</SectionHeading>
      <div style={{ fontSize: 13.5, color: N.muted, lineHeight: 1.6, marginBottom: 16, maxWidth: 760 }}>
        How each agency compares to the Lava network on the metrics that prove the value of the work. Dark blue is at or above the network, red is below. These are the two numbers we lead with, lead to quote and percent automated.
      </div>
      <Card style={{ padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: "left", padding: "14px 16px" }}>Agency</th>
              {BENCH_METRICS.map((m) => <th key={m.key} style={{ ...th, padding: "14px 16px" }}>{m.label}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderTop: `1px solid ${N.line}`, background: N.fill }}>
              <td style={{ ...td, textAlign: "left", padding: "10px 16px", fontWeight: 600, color: N.muted }}>Network benchmark</td>
              {BENCH_METRICS.map((m) => <td key={m.key} style={{ ...td, padding: "10px 16px", color: N.muted }}>{m.net}%</td>)}
            </tr>
            {AGENCIES.map((a) => (
              <tr key={a.id} style={{ borderTop: `1px solid ${N.line}` }}>
                <td style={{ ...td, textAlign: "left", padding: "12px 16px" }}><span style={{ fontWeight: 600, color: B.black }}>{a.name}</span></td>
                {BENCH_METRICS.map((m) => <React.Fragment key={m.key}>{cell(a.bench[m.key], m.net)}</React.Fragment>)}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <div style={{ fontSize: 12, color: N.faint, marginTop: 12, lineHeight: 1.55 }}>
        Benchmark bands are estimates from the Lava network. Each agency's numbers read from its monthly report once the import lands.
      </div>
    </div>
  );
}

// ── CRM: the hub of the build. Platform varies by agency. ──
const CRM_PLATFORMS = [
  { key: "agencyzoom", name: "AgencyZoom", note: "The default for most Lava agencies. Pipelines and automations are native and the team already knows it." },
  { key: "hubspot", name: "HubSpot", note: "Used where the agency wants a heavier marketing and reporting layer on top of the pipeline." },
  { key: "insuredmine", name: "InsuredMine", note: "Insurance native CRM, used by a few agencies." },
  { key: "gohighlevel", name: "GoHighLevel", note: "Some custom builds run here for funnels and follow up." },
  { key: "other", name: "Other", note: "Capture the platform and the build in the notes below." },
];
const CRM_SEED = {
  platform: "agencyzoom",
  pipelines: [
    { name: "Sales pipeline", stages: 6, status: "live", note: "New lead to bound. Drives the lead to quote number." },
    { name: "Service pipeline", stages: 4, status: "building", note: "Service requests and endorsements. Automation in progress." },
    { name: "Renewals pipeline", stages: 5, status: "live", note: "Ninety and sixty day renewal prep." },
  ],
  automations: [
    { name: "New lead routing", status: "live" },
    { name: "Quote follow up sequence", status: "live" },
    { name: "Renewal reminders", status: "live" },
    { name: "Service request intake", status: "building" },
    { name: "Lost lead nurture", status: "planned" },
  ],
  integrations: ["Cognito Forms", "HawkSoft AMS", "RingCentral", "Zapier", "DocuSign"],
  notes: "AgencyZoom is the hub. Forms flow in through Zapier, policies sync from HawkSoft. The service pipeline automation is the current build.",
};

// ── CRM report data, seeded from the agency's monthly report card ──
// Pipelines, the new business funnel, and the email and unsubscribe numbers.
// A quarterly JSON export from the CRM identifies what changed period to
// period; the monthly export feeds the email and unsubscribe metrics.
const CRM_REPORT = {
  source: "Priority Risk Management monthly report card",
  period: "June 2026",
  funnel: {
    leads: 117, quotes: 38, soldNew: 4, smartCycle: 5734,
    ltqPL: "27.8%", ltqCL: "48.2%", autoPL: "77.8%", autoCL: "88.9%",
    premium: "$60,628", book: "$12.35M", zapierTasks: 901,
  },
  email: { sent: null, openRate: null, emailUnsub: null, textUnsub: null, velocity: null },
  groups: [
    { name: "New business and leads", pipelines: [
      { name: "PL New Business", stages: [["New Lead", 12, -4], ["Send Canopy Connect", 5, 4], ["Canopy Connect Received", 1, -3], ["Missing info", 2, 1], ["Ready to Quote", 9, 0], ["Quote Ready to Review", 3, -1], ["Quote Ready", 1, 1], ["Video Quote Sent", 7, 7], ["Quote Sent", 3, -1], ["Holding", 11, 0], ["Verbal Agreement", 2, 0], ["Sold", 3, -2]] },
      { name: "CL New Business", stages: [["New Lead", 3, 1], ["Send Canopy Connect", 0, 0], ["Missing Info", 1, 0], ["Working On Quotes", 8, 0], ["Quote Sent", 4, 2], ["Video Quote Sent", 0, 0], ["Holding", 1, 1], ["Verbal Agreement", 3, 1], ["Sold", 1, 0]] },
      { name: "Life Insurance", stages: [["To Be Assigned", 1, 1], ["Leads", 2, -1], ["Life Simple Received", 3, 0], ["Appts", 0, 0], ["Quoted", 9, 1], ["Submitted to Carrier", 2, 0], ["Offer Received", 0, 0], ["Sold", 0, 0]] },
      { name: "Medicare and Health", stages: [["Leads", 17, 1], ["Appts", 1, 0], ["Quoted", 16, -1], ["Submitted", 0, 0], ["Sold", 1, 0]] },
      { name: "Flood Prospects", stages: [["New", 0, 0], ["Contacted", 7, 5], ["Verbal Agreement", 1, 0], ["Sold", 0, 0]] },
    ] },
    { name: "Service", pipelines: [
      { name: "PL Service", stages: [["New", 3, 2], ["In Progress", 5, 1], ["Needs Reviewed", 13, 4], ["Waiting on UW/Carrier", 16, 8], ["Waiting on Client", 18, 1], ["Google Review Ask", 0, 0], ["Completed", 30, -79]] },
      { name: "CL Service", stages: [["New Ticket", 1, 0], ["In Progress", 10, 4], ["Review/Saved to Drive", 1, -1], ["Waiting on UW", 15, 2], ["Waiting on Client", 15, -8], ["Completed", 17, -41]] },
    ] },
    { name: "Renewals and retention", pipelines: [
      { name: "PL Renewals", stages: [["To Do", 96, 37], ["Renewal Review", 12, -11], ["In Progress/Holding", 20, 9], ["Remarketing", 10, 8], ["Quotes Ready", 7, 5], ["Agent Actively Reviewing", 3, -1], ["Competitive Stay", 0, 0], ["Savings Found", 1, -3], ["Corresponding with Clients", 13, -6], ["Waiting on Docs/Payments", 0, -1], ["Google Review Ask", 0, 0], ["Completed", 11, 11]] },
      { name: "CL Renewals", stages: [["Start CL Renewals", 19, 7], ["Renewal Questionnaire", 17, -6], ["Producer Check up", 8, 3], ["Remarket", 3, 2], ["Waiting on Quotes", 18, -3], ["Quote Review", 6, -1], ["Responded Missing Info", 0, 0], ["Quote Sent/WOD", 1, -1], ["Waiting on Apps/pmt", 27, 10], ["Waiting on Binder", 0, 0], ["Completed", 1, -14]] },
      { name: "Health Renewals", stages: [["Annual Review", 22, 1], ["Requote/Holding", 0, 0], ["Propose", 0, 0], ["Completed", 1, -1]] },
    ] },
    { name: "Smart Cycle", pipelines: [
      { name: "Smart Cycle totals", stages: [["Total In Smart Cycle", 5734, 12], ["XDate", 3810, 1], ["Winback", 98, 1], ["LTFU", 3705, 79], ["Untagged", 207, -6]] },
      { name: "Recycled and prospecting", stages: [["CL Cold Calls", 346, 8], ["Top CL Prospects", 35, 0], ["Smart Cycle Recycled", 70, 0], ["Cole Holding", 1705, 0], ["Cole X Date Leads", 2, 0], ["WC X-Date", 88, 0], ["LTFU", 19, 0]] },
    ] },
    { name: "Claims and non-pay", pipelines: [
      { name: "PL Claims", stages: [["Potential", 7, 6], ["Adjusting", 65, 5], ["Completed", 1, -23]] },
      { name: "CL Claims", stages: [["Potential", 2, 2], ["Adjusting", 39, 6], ["Completed", 0, -3]] },
      { name: "Non-Pay", stages: [["Notice Received", 1, 1], ["Client Contact", 15, 8], ["Cancelled", 4, 2], ["Completed", 5, -1]] },
    ] },
  ],
};

function StatTile({ label, value, sub, accent }) {
  return (
    <div style={{ border: `1px solid ${N.line}`, borderRadius: 10, padding: "12px 14px" }}>
      <div style={{ ...DISPLAY, fontSize: 9.5, color: N.faint, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: value === "—" ? N.faint : (accent || B.darkBlue) }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: N.muted, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function MoM({ v }) {
  if (v == null || v === 0) return <span style={{ fontSize: 11.5, color: N.faint, minWidth: 46, textAlign: "right" }}>0</span>;
  const up = v > 0;
  return <span style={{ fontSize: 11.5, fontWeight: 600, color: up ? B.darkBlue : B.red, minWidth: 46, textAlign: "right" }}>{up ? "+" : ""}{v}</span>;
}

function PipelineCard({ p, onOpen }) {
  const total = p.stages.reduce((s, st) => s + (st[1] || 0), 0);
  return (
    <button onClick={() => onOpen(p)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 13px", background: B.white, border: `1px solid ${N.line}`, borderRadius: 10, cursor: "pointer", textAlign: "left" }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = B.darkBlue; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = N.line; }}>
      <span style={{ fontSize: 14, fontWeight: 600, color: B.black, flex: 1 }}>{p.name}</span>
      <span style={{ fontSize: 12.5, color: N.muted }}>{total} active</span>
      <ChevronRight size={16} color={N.faint} />
    </button>
  );
}

function CrmStatusChip({ status, onClick }) {
  const map = {
    live: { label: "Live", bg: B.darkBlue, fg: B.white, border: B.darkBlue },
    building: { label: "Building", bg: N.fill, fg: B.darkBlue, border: N.line },
    planned: { label: "Planned", bg: "transparent", fg: N.faint, border: N.line },
  };
  const s = map[status] || map.planned;
  return (
    <button onClick={onClick} style={{ fontFamily: FONT_BODY, fontSize: 11.5, fontWeight: 600, cursor: onClick ? "pointer" : "default", borderRadius: 7, padding: "3px 10px", background: s.bg, color: s.fg, border: `1px solid ${s.border}`, borderStyle: status === "planned" ? "dashed" : "solid", whiteSpace: "nowrap" }}>{s.label}</button>
  );
}

// ── Per pipeline detail: automations with shot clocks, the stage flow with
// call scripts, and a JSON import. PL New Business is the worked example;
// other pipelines render their flow from the report stages until imported. ──
const PIPELINE_DETAIL = {
  "PL New Business": {
    automations: [
      { name: "New lead welcome text and email", trigger: "Lead enters New Lead", shotclock: { hours: 0.25, stage: "New Lead", action: "First call due in five minutes, then a task to the rep." } },
      { name: "Canopy Connect request", trigger: "Moved to Send Canopy Connect", shotclock: { hours: 24, stage: "Send Canopy Connect", action: "Reminder to the rep at 24 hours, then escalate to the team lead." } },
      { name: "Quote follow up sequence", trigger: "Moved to Quote Sent", shotclock: { hours: 48, stage: "Quote Sent", action: "Auto follow up and a call task if there is no movement in 48 hours." } },
      { name: "Holding nurture", trigger: "Moved to Holding", shotclock: { hours: 72, stage: "Holding", action: "Nurture drip with a weekly check in task." } },
      { name: "Stalled to smart cycle", trigger: "No movement for 30 days", shotclock: { hours: 720, stage: "Any stage", action: "Move the record to Smart Cycle as nurtured." } },
    ],
    flow: [
      { name: "New Lead", call: true, script: "Call within five minutes. Confirm contact info and the lines they need. Set the expectation that you will send a secure link to pull current coverage.", tips: "Speed to lead is the number. The five minute first call wins the deal." },
      { name: "Send Canopy Connect", tips: "Send the Canopy Connect link by text and email. The automation reminds you at 24 hours." },
      { name: "Canopy Connect Received", tips: "Coverage is pulled. Review it before you quote." },
      { name: "Missing info", call: true, script: "Call to collect the one missing item. Keep it to a single ask and confirm the best number.", tips: "Do not let it sit. This is the most common stall." },
      { name: "Ready to Quote" },
      { name: "Quote Ready to Review" },
      { name: "Quote Ready" },
      { name: "Video Quote Sent", tips: "A short recorded walkthrough lifts the close rate. Keep it under three minutes." },
      { name: "Quote Sent", call: true, script: "Call to confirm they got it and walk the coverage. Ask for the sale on this call. The 48 hour shot clock fires if there is no movement.", tips: "Always ask for the sale here." },
      { name: "Holding", call: true, script: "Check in, handle the objection, and set a specific next step with a date.", tips: "Holding without a next step becomes dead. Always set a date." },
      { name: "Verbal Agreement", tips: "Lock the bind date and collect what you need to issue." },
      { name: "Sold", tips: "Trigger the onboarding bundle and the Google review ask." },
    ],
  },
};
function pipeDetail(name) { return PIPELINE_DETAIL[name] || null; }
function pipeFlow(p) {
  const d = pipeDetail(p.name);
  if (d && d.flow) return d.flow.map((f) => ({ ...f, count: (p.stages.find((s) => s[0] === f.name) || [])[1] }));
  return p.stages.map((s) => ({ name: s[0], count: s[1] }));
}
function importDateStr() { return new Date().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }); }
function parsePipelineJson(json, fallbackStages) {
  let count = 0, stages = null;
  if (Array.isArray(json)) {
    count = json.length;
    const by = {};
    json.forEach((r) => { const s = r && (r.stage || r.Stage || r.status || r.stageName); if (s) by[s] = (by[s] || 0) + 1; });
    if (Object.keys(by).length) {
      stages = fallbackStages.map((s) => [s[0], by[s[0]] || 0, 0]);
      Object.keys(by).forEach((s) => { if (!fallbackStages.some((f) => f[0] === s)) stages.push([s, by[s], 0]); });
    }
  } else if (json && Array.isArray(json.stages)) {
    stages = json.stages.map((s) => [s.name || s.stage, (s.count != null ? s.count : (Array.isArray(s.records) ? s.records.length : 0)), 0]);
    count = stages.reduce((a, b) => a + (b[1] || 0), 0);
  } else if (json && typeof json === "object") {
    count = Object.keys(json).length;
  }
  return { date: importDateStr(), count, stages };
}

function PipelineDetail({ pipeline, imp, onImport, onBack }) {
  const [mode, setMode] = useState("workflow");
  const [step, setStep] = useState(0);
  const [err, setErr] = useState("");
  const detail = pipeDetail(pipeline.name);
  const base = pipeFlow(pipeline);
  const flow = imp && imp.stages ? base.map((f) => { const o = imp.stages.find((s) => s[0] === f.name); return o ? { ...f, count: o[1] } : f; }) : base;
  const automations = (detail && detail.automations) || [];

  const handleFile = (e) => {
    const file = e.target.files && e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { try { onImport(parsePipelineJson(JSON.parse(reader.result), pipeline.stages)); setErr(""); } catch (x) { setErr("That file is not valid JSON."); } };
    reader.readAsText(file);
    e.target.value = "";
  };
  const cur = flow[step] || {};

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Card>
        <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: N.fill, border: `1px solid ${N.line}`, color: N.muted, fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, padding: "6px 11px", borderRadius: 8, cursor: "pointer" }}>
          <ChevronLeft size={14} /> All pipelines
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 14 }}>
          <span style={{ ...DISPLAY, fontSize: 18, color: B.darkBlue }}>{pipeline.name}</span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: N.faint }}>Last import: {imp ? imp.date + " · " + imp.count + " records" : "Never"}</span>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer", fontFamily: FONT_BODY, fontSize: 12.5, fontWeight: 600, color: B.white, background: B.darkBlue, borderRadius: 8, padding: "8px 13px" }}>
              <FileText size={14} /> Upload JSON
              <input type="file" accept="application/json,.json" onChange={handleFile} style={{ display: "none" }} />
            </label>
          </div>
        </div>
        {err && <div style={{ color: B.red, fontSize: 12.5, marginTop: 8 }}>{err}</div>}
        <div style={{ fontSize: 12.5, color: N.muted, marginTop: 10, lineHeight: 1.55 }}>
          Upload this pipeline's export from the CRM to load its current content. A quarterly JSON import shows what changed since last time.
        </div>
        <div style={{ marginTop: 14 }}>
          <SegToggle value={mode} onChange={setMode} options={[{ value: "workflow", label: "Workflow" }, { value: "training", label: "Training mode" }]} />
        </div>
      </Card>

      {mode === "workflow" ? (
        <>
          <Card>
            <SectionHeading icon={Network}>Workflow, new lead to sold</SectionHeading>
            <div style={{ fontSize: 12.5, color: N.faint, lineHeight: 1.55, marginBottom: 14 }}>
              The path a record takes through the pipeline. Stages with a headset are call tasks, with the script and what to keep in mind beneath.
            </div>
            <div style={{ overflowX: "auto", paddingBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 6, minWidth: "min-content" }}>
                {flow.map((f, i) => (
                  <React.Fragment key={i}>
                    <div style={{ width: 156, flexShrink: 0 }}>
                      <div style={{ border: `1px solid ${f.call ? B.red : N.line}`, borderTop: `3px solid ${f.call ? B.red : B.darkBlue}`, borderRadius: 9, padding: "10px 11px", background: B.white }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {f.call && <Headset size={13} color={B.red} />}
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: B.black, lineHeight: 1.2 }}>{f.name}</span>
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: B.darkBlue, marginTop: 5 }}>{f.count != null ? f.count : "—"}</div>
                      </div>
                      {(f.script || f.tips) && (
                        <div style={{ marginTop: 6, border: `1px solid ${N.line}`, borderRadius: 8, padding: "8px 10px", background: N.fill }}>
                          {f.call && f.script && <div style={{ fontSize: 11.5, color: B.black, lineHeight: 1.5 }}><strong>Script.</strong> {f.script}</div>}
                          {f.tips && <div style={{ fontSize: 11.5, color: N.muted, lineHeight: 1.5, marginTop: f.script && f.call ? 6 : 0 }}>{f.tips}</div>}
                        </div>
                      )}
                    </div>
                    {i < flow.length - 1 && <ChevronRight size={18} color={N.faint} style={{ marginTop: 16, flexShrink: 0 }} />}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <SectionHeading icon={Repeat}>Automations and shot clocks</SectionHeading>
            {automations.length === 0 ? (
              <div style={{ fontSize: 13, color: N.faint }}>No automations recorded for this pipeline yet. They load from the pipeline export or get added in a meeting.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {automations.map((a, i) => (
                  <div key={i} style={{ border: `1px solid ${N.line}`, borderRadius: 10, padding: "11px 13px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: B.black, flex: 1, minWidth: 160 }}>{a.name}</span>
                      {a.shotclock
                        ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 600, color: B.white, background: B.red, borderRadius: 7, padding: "3px 9px" }}><Clock size={12} /> Shot clock {a.shotclock.hours >= 1 ? a.shotclock.hours + "h" : "5 min"} · {a.shotclock.stage}</span>
                        : <span style={{ fontSize: 11.5, color: N.faint }}>No shot clock</span>}
                    </div>
                    <div style={{ fontSize: 12.5, color: N.muted, marginTop: 5, lineHeight: 1.5 }}>Trigger: {a.trigger}.{a.shotclock ? " " + a.shotclock.action : ""}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      ) : (
        <Card>
          <SectionHeading icon={Play}>Training and scenario mode</SectionHeading>
          <div style={{ fontSize: 13, color: N.muted, lineHeight: 1.6, marginBottom: 14 }}>
            Walk a sample lead through this agency's own pipeline to learn the stages and the content. Scenario: a new lead, Jordan Avery, wants an auto and home quote. Step through as the rep.
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            {flow.map((f, i) => (
              <span key={i} title={f.name} style={{ width: 22, height: 6, borderRadius: 3, background: i <= step ? B.darkBlue : N.line }} />
            ))}
          </div>
          <div style={{ border: `1px solid ${N.line}`, borderRadius: 12, padding: "16px 18px" }}>
            <div style={{ fontSize: 11.5, color: N.faint, fontWeight: 600 }}>Step {step + 1} of {flow.length}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
              {cur.call && <Headset size={16} color={B.red} />}
              <span style={{ ...DISPLAY, fontSize: 17, color: B.black }}>{cur.name}</span>
              {cur.call && <span style={{ fontSize: 11, fontWeight: 700, color: B.red }}>CALL TASK</span>}
            </div>
            {cur.call && cur.script && <div style={{ fontSize: 13.5, color: B.black, lineHeight: 1.6, marginTop: 10 }}><strong>On the call.</strong> {cur.script}</div>}
            <div style={{ fontSize: 13.5, color: N.muted, lineHeight: 1.6, marginTop: 10 }}>{cur.tips || "Complete this stage's actions, then advance the record to the next stage."}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
            <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, padding: "9px 15px", borderRadius: 9, border: `1px solid ${N.line}`, background: B.white, color: step === 0 ? N.faint : B.darkBlue, cursor: step === 0 ? "default" : "pointer" }}>Back</button>
            {step < flow.length - 1
              ? <button onClick={() => setStep((s) => Math.min(flow.length - 1, s + 1))} style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, padding: "9px 15px", borderRadius: 9, border: "none", background: B.darkBlue, color: B.white, cursor: "pointer" }}>Next stage</button>
              : <span style={{ fontSize: 13, fontWeight: 600, color: B.darkBlue }}>Scenario complete. The record is sold.</span>}
            <button onClick={() => setStep(0)} style={{ marginLeft: "auto", fontFamily: FONT_BODY, fontSize: 12.5, color: N.muted, background: "none", border: "none", cursor: "pointer" }}>Restart</button>
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Editable, importable metric groups: tasks, email and messaging, onboarding ──
const TASK_METRICS = [
  { key: "rotting", label: "Rotting", accent: "#E73835" },
  { key: "pastDue", label: "Past due", accent: "#E73835" },
  { key: "today", label: "Due today" },
  { key: "week", label: "Rest of week" },
  { key: "nextWeek", label: "Next week" },
  { key: "completed", label: "Completed" },
];
const TASK_SEED = { rotting: 545, pastDue: 113, today: 62, week: 49, nextWeek: 24, completed: 74147 };
const EMAIL_METRICS = [
  { key: "sent", label: "Emails sent" },
  { key: "openRate", label: "Open rate", suffix: "%" },
  { key: "textSent", label: "Texts sent" },
  { key: "emailUnsub", label: "Email unsubscribes", accent: "#E73835" },
  { key: "textUnsub", label: "Text unsubscribes", accent: "#E73835" },
  { key: "velocity", label: "Deal velocity", suffix: " days" },
];
const EMAIL_SEED = { sent: 4820, openRate: 38, textSent: 1240, emailUnsub: 12, textUnsub: 5, velocity: 21 };
const ONBOARD_METRICS = [
  { key: "onboardBundle", label: "Onboarding bundle tags" },
  { key: "lifecycle", label: "Lifecycle automation enrolled" },
  { key: "renewalsDone", label: "Renewals completed" },
  { key: "reviews", label: "Google reviews" },
  { key: "customers", label: "Customers" },
  { key: "policies", label: "Policies" },
];
const ONBOARD_SEED = { onboardBundle: 1789, lifecycle: 1811, renewalsDone: 13, reviews: 422, customers: 3468, policies: 6069 };

function parseMetricsJson(json, metrics) {
  const out = {};
  if (json && typeof json === "object" && !Array.isArray(json)) {
    metrics.forEach((m) => {
      if (json[m.key] != null && !isNaN(parseFloat(json[m.key]))) { out[m.key] = parseFloat(json[m.key]); return; }
      const lk = Object.keys(json).find((k) => k.toLowerCase() === m.label.toLowerCase());
      if (lk && !isNaN(parseFloat(json[lk]))) out[m.key] = parseFloat(json[lk]);
    });
  }
  return { values: out, date: importDateStr() };
}

function EditableStat({ label, value, suffix, accent, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const start = () => { setDraft(value == null ? "" : String(value)); setEditing(true); };
  const commit = () => { const n = parseFloat(draft); onSave(draft.trim() === "" || isNaN(n) ? null : n); setEditing(false); };
  return (
    <div style={{ border: `1px solid ${N.line}`, borderRadius: 10, padding: "12px 14px" }}>
      <div style={{ ...DISPLAY, fontSize: 9.5, color: N.faint, marginBottom: 6 }}>{label}</div>
      {editing ? (
        <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
          style={{ width: "100%", boxSizing: "border-box", fontFamily: FONT_BODY, fontSize: 19, fontWeight: 700, color: B.darkBlue, border: `1px solid ${B.darkBlue}`, borderRadius: 7, padding: "2px 6px" }} />
      ) : (
        <div onClick={start} title="Click to edit" style={{ fontSize: 20, fontWeight: 700, color: value == null ? N.faint : (accent || B.darkBlue), cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
          {value == null ? "—" : value.toLocaleString()}{value != null && (suffix || "")}
          <Pencil size={11} color={N.faint} />
        </div>
      )}
    </div>
  );
}

function MetricGroup({ icon, title, metrics, values, onChange, onImport, lastImport, note }) {
  const [err, setErr] = useState("");
  const handleFile = (e) => {
    const file = e.target.files && e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { try { onImport(parseMetricsJson(JSON.parse(reader.result), metrics)); setErr(""); } catch (x) { setErr("That file is not valid JSON."); } };
    reader.readAsText(file);
    e.target.value = "";
  };
  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <SectionHeading icon={icon}>{title}</SectionHeading>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
          <span style={{ fontSize: 11.5, color: N.faint }}>Last import: {lastImport ? lastImport : "Never"}</span>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer", fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, color: B.darkBlue, background: B.white, border: `1px solid ${N.line}`, borderRadius: 8, padding: "6px 11px" }}>
            <FileText size={13} /> Upload JSON
            <input type="file" accept="application/json,.json" onChange={handleFile} style={{ display: "none" }} />
          </label>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
        {metrics.map((m) => <EditableStat key={m.key} label={m.label} value={values[m.key]} suffix={m.suffix} accent={m.accent} onSave={(v) => onChange(m.key, v)} />)}
      </div>
      {(err || note) && <div style={{ fontSize: 12, color: err ? B.red : N.faint, marginTop: 12, lineHeight: 1.55 }}>{err || note}</div>}
    </Card>
  );
}

function CrmSection() {
  const [crm, setCrm] = useState(() => ({ ...CRM_SEED }));
  const [openPipe, setOpenPipe] = useState(null);
  const [imports, setImports] = useState({});
  const [taskVals, setTaskVals] = useState({ ...TASK_SEED });
  const [taskImp, setTaskImp] = useState(null);
  const [emailVals, setEmailVals] = useState({ ...EMAIL_SEED });
  const [emailImp, setEmailImp] = useState(null);
  const [onbVals, setOnbVals] = useState({ ...ONBOARD_SEED });
  const [onbImp, setOnbImp] = useState(null);
  const applyImport = (setVals, setImp) => (res) => { setVals((v) => ({ ...v, ...res.values })); setImp(res.date); };
  const platMeta = CRM_PLATFORMS.find((p) => p.key === crm.platform) || CRM_PLATFORMS[0];
  const cycle = (i) => setCrm((c) => {
    const order = ["live", "building", "planned"];
    return { ...c, automations: c.automations.map((a, idx) => (idx === i ? { ...a, status: order[(order.indexOf(a.status) + 1) % order.length] } : a)) };
  });
  if (openPipe) {
    return <PipelineDetail pipeline={openPipe} imp={imports[openPipe.name]} onImport={(meta) => setImports((s) => ({ ...s, [openPipe.name]: meta }))} onBack={() => setOpenPipe(null)} />;
  }
  const R = CRM_REPORT;
  const tileGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Card>
        <SectionHeading icon={Network}>CRM platform</SectionHeading>
        <div style={{ fontSize: 13.5, color: N.muted, lineHeight: 1.6, marginBottom: 14 }}>
          The CRM is the hub of the build. Pick the platform this agency runs on. Most run AgencyZoom, some run HubSpot or InsuredMine, and a few custom builds run on GoHighLevel.
        </div>
        <SegToggle value={crm.platform} onChange={(v) => setCrm((c) => ({ ...c, platform: v }))} options={CRM_PLATFORMS.map((p) => ({ value: p.key, label: p.name }))} />
        <div style={{ fontSize: 13, color: N.muted, marginTop: 12, lineHeight: 1.55 }}>{platMeta.note}</div>
      </Card>

      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <SectionHeading icon={TrendingUp}>New business funnel</SectionHeading>
          <span style={{ marginLeft: "auto", fontSize: 11.5, color: N.faint, marginBottom: 14 }}>{R.period} · from the monthly report</span>
        </div>
        <div style={tileGrid}>
          <StatTile label="New leads" value={R.funnel.leads} sub="PL and CL this month" />
          <StatTile label="Quotes" value={R.funnel.quotes} />
          <StatTile label="Sold, new business" value={R.funnel.soldNew} />
          <StatTile label="In smart cycle" value={R.funnel.smartCycle} sub="dead or nurtured" />
          <StatTile label="Lead to quote, PL" value={R.funnel.ltqPL} accent={B.red} />
          <StatTile label="Lead to quote, CL" value={R.funnel.ltqCL} />
          <StatTile label="Automated, PL" value={R.funnel.autoPL} />
          <StatTile label="Automated, CL" value={R.funnel.autoCL} />
          <StatTile label="Monthly premium" value={R.funnel.premium} />
          <StatTile label="Book of business" value={R.funnel.book} />
          <StatTile label="Tasks automated" value={R.funnel.zapierTasks} sub="Zapier this month" />
        </div>
        <div style={{ fontSize: 12, color: N.faint, marginTop: 12, lineHeight: 1.55 }}>
          Lead to quote and percent automated are the two we lead with. The goal is more sold, fewer dead, and a faster path from lead to sold.
        </div>
      </Card>

      <MetricGroup icon={ListChecks} title="Tasks" metrics={TASK_METRICS} values={taskVals} lastImport={taskImp}
        onChange={(k, v) => setTaskVals((s) => ({ ...s, [k]: v }))} onImport={applyImport(setTaskVals, setTaskImp)}
        note="Task health across the agency. Click any number to edit and save, or import the task export. Rotting and past due are the ones to clear in the meeting." />

      <MetricGroup icon={MessageSquare} title="Email and messaging" metrics={EMAIL_METRICS} values={emailVals} lastImport={emailImp}
        onChange={(k, v) => setEmailVals((s) => ({ ...s, [k]: v }))} onImport={applyImport(setEmailVals, setEmailImp)}
        note="Send volume, open rate, texts sent, and the email and text unsubscribe counts. Import the monthly AgencyZoom export, or click a number to edit and save it by hand." />

      <MetricGroup icon={UserPlus} title="Onboarding and retention" metrics={ONBOARD_METRICS} values={onbVals} lastImport={onbImp}
        onChange={(k, v) => setOnbVals((s) => ({ ...s, [k]: v }))} onImport={applyImport(setOnbVals, setOnbImp)}
        note="Onboarding bundle tags, lifecycle automation, renewals completed, reviews, customers, and policies. Import or edit any number inline." />

      <Card>
        <SectionHeading icon={ListChecks}>Pipelines</SectionHeading>
        <div style={{ fontSize: 12.5, color: N.faint, lineHeight: 1.55, marginBottom: 14 }}>
          Every pipeline in the CRM with its current stage counts and the change from last month. Tap a pipeline to open its stages. A quarterly JSON export identifies what moved.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {R.groups.map((g) => (
            <div key={g.name}>
              <div style={{ ...DISPLAY, fontSize: 11, color: B.darkBlue, marginBottom: 8 }}>{g.name}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {g.pipelines.map((p) => <PipelineCard key={p.name} p={p} onOpen={setOpenPipe} />)}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionHeading icon={Repeat}>Automations</SectionHeading>
        <div style={{ fontSize: 12.5, color: N.faint, marginBottom: 12 }}>Tap a status to cycle it as the build progresses.</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
          {crm.automations.map((a, i) => (
            <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "7px 11px", border: `1px solid ${N.line}`, borderRadius: 9 }}>
              <span style={{ fontSize: 13, color: B.black }}>{a.name}</span>
              <CrmStatusChip status={a.status} onClick={() => cycle(i)} />
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionHeading icon={Boxes}>Connected to the CRM</SectionHeading>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
          {crm.integrations.map((t) => (
            <span key={t} style={{ fontSize: 13, color: B.darkBlue, background: N.fill, border: `1px solid ${N.line}`, padding: "6px 12px", borderRadius: 8 }}>{t}</span>
          ))}
        </div>
        <div style={{ ...DISPLAY, fontSize: 10.5, color: N.faint, margin: "16px 0 8px" }}>Build notes</div>
        <textarea value={crm.notes} onChange={(e) => setCrm((c) => ({ ...c, notes: e.target.value }))} rows={3} style={{ width: "100%", boxSizing: "border-box", fontFamily: FONT_BODY, fontSize: 13, color: B.black, border: `1px solid ${N.line}`, borderRadius: 8, padding: "9px 11px", resize: "vertical", lineHeight: 1.5 }} />
      </Card>
    </div>
  );
}

// ── Customer requests, from the HubSpot ticket pipeline. Every rollup number
// here filters to the raw tickets behind it. Connects to the client and the
// assigned owner; topics are meant to plot on the timeline once connected. ──
const TICKETS = [
  { id: "T-1049", subject: "Add endorsement to GL", topic: "Policy change", status: "closed", opened: "2026-04-29", closed: "2026-05-06", owner: "Edmar Quirante", requester: "Forge Mfg" },
  { id: "T-1051", subject: "Add a driver to auto policy", topic: "Policy change", status: "closed", opened: "2026-05-02", closed: "2026-05-03", owner: "Maika (VA)", requester: "J. Alvarez" },
  { id: "T-1053", subject: "COI for a new lease", topic: "COI request", status: "closed", opened: "2026-05-05", closed: "2026-05-05", owner: "Allyza (VA)", requester: "Northside LLC" },
  { id: "T-1057", subject: "Billing question on renewal", topic: "Billing", status: "closed", opened: "2026-05-08", closed: "2026-05-12", owner: "Maika (VA)", requester: "D. Cho" },
  { id: "T-1060", subject: "Update mailing address", topic: "Address change", status: "closed", opened: "2026-05-10", closed: "2026-05-11", owner: "Diane (VA)", requester: "P. Nguyen" },
  { id: "T-1063", subject: "Auto claim, glass damage", topic: "Claims", status: "closed", opened: "2026-05-12", closed: "2026-05-19", owner: "Niccole Peeler", requester: "S. Patel" },
  { id: "T-1066", subject: "Set up autopay", topic: "Billing", status: "closed", opened: "2026-05-18", closed: "2026-05-20", owner: "Maika (VA)", requester: "T. Brooks" },
  { id: "T-1068", subject: "Remove a vehicle from policy", topic: "Policy change", status: "open", opened: "2026-05-22", closed: null, owner: "Maika (VA)", requester: "L. Romero" },
  { id: "T-1071", subject: "COI for an event vendor", topic: "COI request", status: "open", opened: "2026-05-26", closed: null, owner: "Allyza (VA)", requester: "Bright Events" },
  { id: "T-1072", subject: "Cancel a home policy", topic: "Cancellation", status: "open", opened: "2026-05-27", closed: null, owner: "Diane (VA)", requester: "K. Webb" },
  { id: "T-1074", subject: "New commercial auto quote", topic: "New quote", status: "open", opened: "2026-05-29", closed: null, owner: "Edmar Quirante", requester: "Haul Co" },
  { id: "T-1075", subject: "Send declarations page", topic: "Document request", status: "open", opened: "2026-05-30", closed: null, owner: "Diane (VA)", requester: "M. Ortiz" },
];
const daysBetween = (a, b) => Math.max(0, Math.round((new Date(b) - new Date(a)) / 86400000));

function RequestsTab({ tickets, onUpdate = () => {} }) {
  const [detailId, setDetailId] = useState(null);
  const ALL = tickets || TICKETS;
  const [filter, setFilter] = useState({ type: "all", value: null });
  const closed = ALL.filter((t) => t.status === "closed");
  const open = ALL.filter((t) => t.status === "open");
  const avgDays = closed.length ? Math.round(closed.reduce((a, t) => a + daysBetween(t.opened, t.closed), 0) / closed.length) : 0;
  const topics = Array.from(new Set(ALL.map((t) => t.topic))).map((topic) => ({ topic, count: ALL.filter((t) => t.topic === topic).length })).sort((a, b) => b.count - a.count);
  const topicMax = Math.max(...topics.map((t) => t.count));

  const isActive = (type, value) => filter.type === type && filter.value === value;
  const shown = ALL.filter((t) => {
    if (filter.type === "all") return true;
    if (filter.type === "status") return t.status === filter.value;
    if (filter.type === "topic") return t.topic === filter.value;
    return true;
  });
  const tStatus = (s) => (s === "open" ? { bg: "rgba(231,56,53,0.10)", fg: B.red, label: "Open" } : { bg: N.fill, fg: N.muted, label: "Closed" });

  const MetricButton = ({ label, value, sub, accent, type, fval }) => {
    const active = isActive(type, fval);
    return (
      <button onClick={() => setFilter(active ? { type: "all", value: null } : { type, value: fval })} style={{ textAlign: "left", border: `1px solid ${active ? B.darkBlue : N.line}`, background: active ? "rgba(36,36,45,0.04)" : B.white, borderRadius: 10, padding: "12px 14px", cursor: "pointer" }}>
        <div style={{ ...DISPLAY, fontSize: 9.5, color: N.faint, marginBottom: 6 }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: accent || B.darkBlue }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: N.muted, marginTop: 3 }}>{sub}</div>}
      </button>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Card>
        <SectionHeading icon={ClipboardList}>Customer requests</SectionHeading>
        <div style={{ fontSize: 13.5, color: N.muted, lineHeight: 1.6, marginBottom: 14 }}>
          Service requests the agency's clients send in, tracked in the HubSpot ticket pipeline. Tap any number or topic to see the exact tickets behind it.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
          <MetricButton label="All requests" value={ALL.length} type="all" fval={null} />
          <MetricButton label="Open" value={open.length} accent={B.red} type="status" fval="open" />
          <MetricButton label="Closed" value={closed.length} type="status" fval="closed" />
          <MetricButton label="Avg time to close" value={avgDays + "d"} sub="across closed tickets" type="status" fval="closed" />
        </div>
      </Card>

      <Card>
        <SectionHeading icon={TrendingUp}>Topics</SectionHeading>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {topics.map((t) => {
            const active = isActive("topic", t.topic);
            return (
              <button key={t.topic} onClick={() => setFilter(active ? { type: "all", value: null } : { type: "topic", value: t.topic })} style={{ display: "flex", alignItems: "center", gap: 12, background: "none", border: "none", padding: "4px 0", cursor: "pointer", textAlign: "left" }}>
                <span style={{ width: 150, flexShrink: 0, fontSize: 13, color: active ? B.darkBlue : B.black, fontWeight: active ? 600 : 400 }}>{t.topic}</span>
                <span style={{ flex: 1, height: 10, background: N.fill, borderRadius: 5, overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: `${(t.count / topicMax) * 100}%`, background: active ? B.red : B.darkBlue, borderRadius: 5 }} /></span>
                <span style={{ width: 28, textAlign: "right", fontSize: 13, fontWeight: 600, color: B.black }}>{t.count}</span>
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 12, color: N.faint, marginTop: 12, lineHeight: 1.55 }}>Once connected, these topics also plot on the Timeline as request markers so you see when volume spikes.</div>
      </Card>

      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
{detailId && (() => {
            const tk = ALL.find((x) => x.id === detailId);
            if (!tk) return null;
            return <RecordModal title="Service ticket" values={tk} onPatch={(k, v) => onUpdate(detailId, k === "status" ? { status: v, closed: v === "closed" ? (tk.closed || importDateStr()) : null } : { [k]: v })} onClose={() => setDetailId(null)} fields={[
              { key: "subject", label: "Subject" },
              { key: "topic", label: "Topic" },
              { key: "owner", label: "Owner" },
              { key: "status", label: "Status", type: "select", options: [{ value: "open", label: "Open" }, { value: "closed", label: "Closed" }] },
              { key: "opened", label: "Opened" },
              { key: "closed", label: "Closed" },
              { key: "note", label: "Notes", type: "textarea" },
            ]} />;
          })()}
          <SectionHeading icon={ListChecks}>{filter.type === "all" ? "All tickets" : "Tickets behind that number"}</SectionHeading>
          <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 12.5, color: N.muted }}>Showing {shown.length} of {ALL.length}</span>
            {filter.type !== "all" && <button onClick={() => setFilter({ type: "all", value: null })} style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, color: B.darkBlue, background: B.white, border: `1px solid ${N.line}`, borderRadius: 8, padding: "5px 11px", cursor: "pointer" }}>Clear</button>}
          </span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
            <thead>
              <tr>
                {["Ticket", "Topic", "Status", "Opened", "Closed", "Days", "Owner"].map((h) => (
                  <th key={h} style={{ ...DISPLAY, fontSize: 10, color: N.faint, textAlign: "left", padding: "0 10px 9px", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((t) => {
                const st = tStatus(t.status);
                return (
                  <tr key={t.id} style={{ borderTop: `1px solid ${N.line}` }}>
                    <td style={{ padding: "10px", verticalAlign: "top" }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: B.black }}>{t.subject}</div>
                      <div style={{ fontSize: 11.5, color: N.faint }}>{t.id} · {t.requester}</div>
                    </td>
                    <td style={{ padding: "10px", verticalAlign: "top" }}><span style={{ fontSize: 12, color: N.muted, whiteSpace: "nowrap" }}>{t.topic}</span></td>
                    <td style={{ padding: "10px", verticalAlign: "top" }}><span style={{ fontSize: 11.5, fontWeight: 600, color: st.fg, background: st.bg, borderRadius: 7, padding: "3px 9px", whiteSpace: "nowrap" }}>{st.label}</span></td>
                    <td style={{ padding: "10px", verticalAlign: "top", fontSize: 12.5, color: N.muted, whiteSpace: "nowrap" }}>{t.opened}</td>
                    <td style={{ padding: "10px", verticalAlign: "top", fontSize: 12.5, color: N.muted, whiteSpace: "nowrap" }}>{t.closed || "—"}</td>
                    <td style={{ padding: "10px", verticalAlign: "top", fontSize: 12.5, fontWeight: 600, color: t.closed ? B.darkBlue : N.faint }}>{t.closed ? daysBetween(t.opened, t.closed) : "—"}</td>
                    <td style={{ padding: "10px", verticalAlign: "top", fontSize: 12.5, color: N.muted, whiteSpace: "nowrap" }}>{t.owner}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: 12, color: N.faint, marginTop: 12, lineHeight: 1.55 }}>
          This is the raw pipeline behind the counts. In the app it reads live from the HubSpot ticket pipeline, linked to the client and the assigned owner, so any reported number opens its tickets here.
        </div>
      </Card>
    </div>
  );
}

// ── Peer benchmarking for a single agency vs the others, by pipeline,
// producer, and lead source. Per-agency pipeline numbers seed the peer set. ──
const PIPE_BENCH = {
  steele: { plLtq: 28, clLtq: 48, plClose: 31, clClose: 25, svcDays: 4, renRet: 96, auto: 98 },
  dulles: { plLtq: 29, clLtq: 40, plClose: 27, clClose: 22, svcDays: 6, renRet: 93, auto: 91 },
  harbor: { plLtq: 41, clLtq: 52, plClose: 35, clClose: 30, svcDays: 3, renRet: 95, auto: 88 },
  summit: { plLtq: 24, clLtq: 30, plClose: 20, clClose: 18, svcDays: 9, renRet: 90, auto: 70 },
  oakline: { plLtq: 45, clLtq: 55, plClose: 38, clClose: 33, svcDays: 3, renRet: 97, auto: 96 },
  verde: { plLtq: 31, clLtq: 44, plClose: 26, clClose: 24, svcDays: 5, renRet: 92, auto: 85 },
};
const PIPE_METRICS = [
  { key: "plLtq", label: "Lead to quote", pipeline: "New business, personal", unit: "%", higher: true },
  { key: "plClose", label: "Close rate", pipeline: "New business, personal", unit: "%", higher: true },
  { key: "clLtq", label: "Lead to quote", pipeline: "New business, commercial", unit: "%", higher: true },
  { key: "clClose", label: "Close rate", pipeline: "New business, commercial", unit: "%", higher: true },
  { key: "svcDays", label: "Avg completion", pipeline: "Service", unit: "d", higher: false },
  { key: "renRet", label: "Retention", pipeline: "Renewals", unit: "%", higher: true },
  { key: "auto", label: "Percent automated", pipeline: "Automation", unit: "%", higher: true },
];
const PRODUCER_BENCH = 27; // network average close rate
const LEADSRC_BENCH = { Referral: 30, Website: 20, Google: 25, "Cold outreach": 12, Social: 14 };

function BenchmarkTab({ agency }) {
  const me = PIPE_BENCH[agency.id] || PIPE_BENCH.steele;
  const peerAvg = (key) => {
    const others = AGENCIES.filter((a) => a.id !== agency.id).map((a) => (PIPE_BENCH[a.id] || {})[key]).filter((v) => v != null);
    return others.length ? Math.round((others.reduce((x, y) => x + y, 0) / others.length) * 10) / 10 : null;
  };
  const rankOf = (key, higher) => {
    const vals = AGENCIES.map((a) => ({ id: a.id, v: (PIPE_BENCH[a.id] || {})[key] })).filter((o) => o.v != null);
    vals.sort((x, y) => (higher ? y.v - x.v : x.v - y.v));
    const idx = vals.findIndex((o) => o.id === agency.id);
    return idx >= 0 ? idx + 1 + " of " + vals.length : "—";
  };
  const cellL = { textAlign: "left", padding: "11px 12px", fontSize: 13 };
  const cellR = { textAlign: "right", padding: "11px 12px", fontSize: 13 };
  const headL = { ...DISPLAY, fontSize: 10, color: N.faint, textAlign: "left", padding: "0 12px 9px" };
  const headR = { ...headL, textAlign: "right" };

  const prodAvg = Math.round(PRODUCERS.reduce((a, p) => a + p.close, 0) / PRODUCERS.length);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Card>
        <SectionHeading icon={TrendingUp}>Benchmarking</SectionHeading>
        <div style={{ fontSize: 13.5, color: N.muted, lineHeight: 1.6 }}>
          How {agency.name} compares to the other {AGENCIES.length - 1} agencies in the department, by pipeline, by producer, and by lead source. Dark blue is at or ahead of the peer average, red is behind. Peer figures fill in as agencies are added.
        </div>
      </Card>

      <Card>
        <SectionHeading icon={TrendingUp}>By pipeline</SectionHeading>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
            <thead><tr>
              <th style={headL}>Pipeline</th><th style={headL}>Metric</th>
              <th style={headR}>This agency</th><th style={headR}>Peers</th><th style={headR}>Rank</th>
            </tr></thead>
            <tbody>
              {PIPE_METRICS.map((m) => {
                const mine = me[m.key], avg = peerAvg(m.key);
                const ahead = avg == null ? true : (m.higher ? mine >= avg : mine <= avg);
                return (
                  <tr key={m.key} style={{ borderTop: `1px solid ${N.line}` }}>
                    <td style={{ ...cellL, color: N.muted }}>{m.pipeline}</td>
                    <td style={{ ...cellL, color: B.black }}>{m.label}</td>
                    <td style={{ ...cellR, fontWeight: 700, color: ahead ? B.darkBlue : B.red }}>{mine}{m.unit}{avg != null ? (ahead ? " ▲" : " ▼") : ""}</td>
                    <td style={{ ...cellR, color: N.muted }}>{avg == null ? "—" : avg + m.unit}</td>
                    <td style={{ ...cellR, color: N.muted }}>{rankOf(m.key, m.higher)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <SectionHeading icon={Briefcase}>Producers</SectionHeading>
          <span style={{ marginLeft: "auto", fontSize: 11.5, color: N.faint, marginBottom: 14 }}>Network close rate {PRODUCER_BENCH}% · this agency {prodAvg}%</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {PRODUCERS.map((p) => {
            const ahead = p.close >= PRODUCER_BENCH;
            return (
              <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", border: `1px solid ${N.line}`, borderRadius: 9 }}>
                <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: B.black }}>{p.name}</span>
                <span style={{ fontSize: 12, color: N.faint, whiteSpace: "nowrap" }}>{p.bound} bound · {p.quotes} quotes</span>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: ahead ? B.darkBlue : B.red, minWidth: 64, textAlign: "right" }}>{p.close}% {ahead ? "▲" : "▼"}</span>
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 12, color: N.faint, marginTop: 12, lineHeight: 1.55 }}>Close rate against the network producer benchmark. The same data drives producer coaching in the meeting.</div>
      </Card>

      <Card>
        <SectionHeading icon={Compass}>Lead sources</SectionHeading>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {LEAD_SOURCES.map((s) => {
            const bench = LEADSRC_BENCH[s.source];
            const ahead = bench == null ? true : s.conversion >= bench;
            return (
              <div key={s.source} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", border: `1px solid ${N.line}`, borderRadius: 9 }}>
                <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: B.black }}>{s.source}</span>
                <span style={{ fontSize: 12, color: N.faint, whiteSpace: "nowrap" }}>{s.leads} leads · {s.bound} bound</span>
                <span style={{ fontSize: 12, color: N.faint, whiteSpace: "nowrap" }}>peers {bench != null ? bench + "%" : "—"}</span>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: ahead ? B.darkBlue : B.red, minWidth: 58, textAlign: "right" }}>{s.conversion}% {ahead ? "▲" : "▼"}</span>
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 12, color: N.faint, marginTop: 12, lineHeight: 1.55 }}>Conversion by source against the network average for that source, so you see which channels are over or under performing for this agency.</div>
      </Card>
    </div>
  );
}

// ── Big picture: EOS style goals, quarterly projects, issues, and a record
// of topics covered and when they were last revisited, for accountability. ──
function addMonthsLabel(n) {
  const d = new Date(); d.setMonth(d.getMonth() + n);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
const LAVA_TEAM = Object.values(EMP).map((e) => e.name);
const AGENCY_TEAM = ["Robert Steele", "Maria L.", "Dev P.", "Tom R."];
const ROCKS_SEED = [
  { id: "r1", title: "Launch the combo automation pilot", scope: "company", owner: "Darek Chojnacki", status: "on_track", due: "2026-08-18", notes: "" },
  { id: "r2", title: "Migrate the CRM data", scope: "department", owner: "Karla Jardeloza", status: "off_track", due: "2026-08-18", notes: "CRM migration is behind. Raise it before it blocks the pilot." },
  { id: "r3", title: "Stand up the producer coaching cadence", scope: "department", owner: "Karla Jardeloza", status: "on_track", due: "2026-09-30", notes: "" },
];
const TODOS_SEED = [
  { id: "d1", title: "2FA on Zapier", owner: "Darek Chojnacki", due: "2026-06-21", notes: "Currently there is no 2FA and the password is shared. Need to get it fixed.", done: false },
  { id: "d2", title: "VA personal device agreement sign off", owner: "Niccole Peeler", due: "2026-06-16", notes: "", done: false },
  { id: "d3", title: "Confirm VA hours for June", owner: "Edmar Quirante", due: "2026-07-09", notes: "", done: false },
];
const ISSUES_SEED = [
  { id: "i1", title: "Commercial pipeline is built but mostly empty", owner: "Gio Marchan", notes: "", status: "open" },
  { id: "i2", title: "RingCentral call logging into the CRM is inconsistent", owner: "Edmar Quirante", notes: "", status: "open" },
];
function rid(pre) { return pre + Math.random().toString(36).slice(2, 7); }

// ── LAVA OS: the operating system view. Big picture goals, rocks, to-dos,
// and an IDS issues list. Every rock, to-do, and issue takes notes and an
// owner from the Lava team or the agency team. Rocks and to-dos also show
// on the Timeline and the Overview. ──
function LavaOS({ rocks, setRocks, todos, setTodos, issues, setIssues }) {
  const [threeYr, setThreeYr] = useState([{ id: "g1", text: "Grow the book to 20M", notes: "" }, { id: "g2", text: "Three locations fully staffed and self sufficient", notes: "" }, { id: "g3", text: "Commercial lines is 40 percent of new business", notes: "" }]);
  const [oneYr, setOneYr] = useState([{ id: "o1", text: "Lead to quote at 45 percent on personal lines", notes: "" }, { id: "o2", text: "Hire and ramp two producers", notes: "" }, { id: "o3", text: "Service handled by VAs and automation, not licensed staff", notes: "" }]);
  const [goalEdit, setGoalEdit] = useState(null);
  const [topics, setTopics] = useState([
    { id: "t1", topic: "Big picture and goals", cadence: "Quarterly", last: "Mar 31, 2026", next: "Jun 30, 2026" },
    { id: "t2", topic: "Content review", cadence: "Quarterly", last: "Mar 15, 2026", next: "Jun 15, 2026" },
    { id: "t3", topic: "Rocks and to-dos", cadence: "Quarterly", last: "Apr 2, 2026", next: "Jul 2, 2026" },
    { id: "t4", topic: "Scorecard", cadence: "Monthly", last: "May 28, 2026", next: "Jun 28, 2026" },
  ]);

  const inp = { width: "100%", boxSizing: "border-box", fontFamily: FONT_BODY, fontSize: 13.5, color: B.black, border: `1px solid ${N.line}`, borderRadius: 8, padding: "8px 10px" };
  const sel = { fontFamily: FONT_BODY, fontSize: 13, color: B.black, border: `1px solid ${N.line}`, borderRadius: 7, padding: "6px 8px", background: B.white };
  const ghostBtn = { fontFamily: FONT_BODY, fontSize: 12.5, fontWeight: 600, color: B.darkBlue, background: B.white, border: `1px dashed ${N.line}`, borderRadius: 8, padding: "8px 14px", cursor: "pointer", alignSelf: "flex-start" };
  const xBtn = { width: 28, height: 28, flexShrink: 0, borderRadius: 7, border: `1px solid ${N.line}`, background: B.white, color: N.muted, cursor: "pointer", display: "grid", placeItems: "center", padding: 0 };
  const lbl = { ...DISPLAY, fontSize: 10.5, color: N.faint, marginBottom: 8 };

  const editList = (items, setItems) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input value={it} onChange={(e) => setItems(items.map((x, j) => (j === i ? e.target.value : x)))} style={inp} />
          <button onClick={() => setItems(items.filter((_, j) => j !== i))} title="Remove" style={xBtn}><X size={13} /></button>
        </div>
      ))}
      <button onClick={() => setItems([...items, ""])} style={ghostBtn}>+ Add</button>
    </div>
  );
  const goalList = (items, setItems, which) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((g) => (
        <div key={g.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => setGoalEdit({ which, id: g.id })} style={{ flex: 1, textAlign: "left", fontFamily: FONT_BODY, fontSize: 13.5, color: g.text ? B.black : N.faint, background: B.white, border: `1px solid ${N.line}`, borderRadius: 8, padding: "8px 10px", cursor: "pointer" }}>{g.text || "Untitled goal"}{g.notes ? <span style={{ color: N.faint, fontWeight: 400 }}> · note</span> : null}</button>
          <button onClick={() => setItems(items.filter((x) => x.id !== g.id))} title="Remove" style={xBtn}><X size={13} /></button>
        </div>
      ))}
      <button onClick={() => { const id = "g" + Math.random().toString(36).slice(2, 6); setItems([...items, { id, text: "", notes: "" }]); setGoalEdit({ which, id }); }} style={ghostBtn}>+ Add</button>
    </div>
  );

  const Owner = ({ value, onChange }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {value ? <Monogram name={value} size={22} /> : <span style={{ width: 22, height: 22, borderRadius: "50%", background: N.fill, flexShrink: 0 }} />}
      <select value={value || ""} onChange={(e) => onChange(e.target.value)} style={sel}>
        <option value="">Unassigned</option>
        <optgroup label="My team (Lava)">{LAVA_TEAM.map((n) => <option key={n} value={n}>{n}</option>)}</optgroup>
        <optgroup label="Agency team">{AGENCY_TEAM.map((n) => <option key={n} value={n}>{n}</option>)}</optgroup>
      </select>
    </div>
  );
  const DueField = ({ value, onChange }) => (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: N.faint }}>
      <CalendarDays size={13} />
      <input type="date" value={value || ""} onChange={(e) => onChange(e.target.value)} style={{ ...sel, padding: "5px 8px" }} />
    </label>
  );

  const setRock = (id, f, v) => setRocks((rs) => rs.map((r) => (r.id === id ? { ...r, [f]: v } : r)));
  const addRock = () => setRocks((rs) => [...rs, { id: rid("r"), title: "", scope: "company", owner: "", status: "on_track", due: "", notes: "" }]);
  const removeRock = (id) => setRocks((rs) => rs.filter((r) => r.id !== id));
  const setTodo = (id, f, v) => setTodos((ts) => ts.map((t) => (t.id === id ? { ...t, [f]: v } : t)));
  const addTodo = () => setTodos((ts) => [...ts, { id: rid("d"), title: "", owner: "", due: "", notes: "", done: false }]);
  const removeTodo = (id) => setTodos((ts) => ts.filter((t) => t.id !== id));
  const setIssue = (id, f, v) => setIssues((is) => is.map((x) => (x.id === id ? { ...x, [f]: v } : x)));
  const addIssue = () => setIssues((is) => [...is, { id: rid("i"), title: "", owner: "", notes: "", status: "open" }]);
  const removeIssue = (id) => setIssues((is) => is.filter((x) => x.id !== id));
  const toIssue = (title, owner) => setIssues((is) => [...is, { id: rid("i"), title: title || "Untitled", owner: owner || "", notes: "", status: "open" }]);

  const scopeChip = (r) => (
    <button onClick={() => setRock(r.id, "scope", r.scope === "company" ? "department" : "company")} title="Toggle scope"
      style={{ fontFamily: FONT_BODY, fontSize: 10, fontWeight: 700, letterSpacing: 0.4, cursor: "pointer", color: r.scope === "company" ? B.darkBlue : B.red, background: "none", border: `1px solid ${r.scope === "company" ? "rgba(36,36,45,0.3)" : "rgba(231,56,53,0.4)"}`, borderRadius: 6, padding: "3px 8px", textTransform: "uppercase", whiteSpace: "nowrap" }}>{r.scope === "company" ? "Company" : "Department"}</button>
  );
  const statusSel = (value, onChange) => (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, cursor: "pointer", borderRadius: 8, padding: "5px 9px", border: "none", color: value === "off_track" ? B.red : B.darkBlue, background: value === "off_track" ? "rgba(231,56,53,0.08)" : "rgba(36,36,45,0.06)" }}>
      <option value="on_track">On-Track</option>
      <option value="off_track">Off-Track</option>
    </select>
  );
  const addIssueBtn = (title, owner) => (
    <button onClick={() => toIssue(title, owner)} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, color: B.teal, background: "none", border: "none", cursor: "pointer", padding: 0, marginLeft: "auto" }}><AlertTriangle size={13} /> Add issue</button>
  );
  const notesField = (value, onChange) => (
    <textarea value={value} placeholder="Notes" onChange={(e) => onChange(e.target.value)} rows={2} style={{ ...inp, resize: "vertical", fontFamily: FONT_BODY }} />
  );
  const check = (on, onClick) => (
    <span onClick={onClick} style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, cursor: "pointer", border: on ? "none" : `1.5px solid ${N.faint}`, background: on ? B.darkBlue : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>{on && <Check size={12} color={B.white} strokeWidth={3} />}</span>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {goalEdit && (() => {
        const [items, setItems] = goalEdit.which === "three" ? [threeYr, setThreeYr] : [oneYr, setOneYr];
        const g = items.find((x) => x.id === goalEdit.id);
        if (!g) return null;
        const patch = (k, v) => setItems(items.map((x) => (x.id === goalEdit.id ? { ...x, [k]: v } : x)));
        return <RecordModal title="Goal" values={g} onPatch={patch} onClose={() => setGoalEdit(null)} maxWidth={560} fields={[{ key: "text", label: "Goal" }, { key: "notes", label: "Notes", type: "textarea" }]} />;
      })()}
      <Card>
        <SectionHeading icon={Compass}>The big picture</SectionHeading>
        <div style={{ fontSize: 13.5, color: N.muted, lineHeight: 1.6, marginBottom: 16 }}>The agency long term goals, reviewed every quarter so the work stays pointed at where they want to go.</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div><div style={lbl}>Three year goals</div>{goalList(threeYr, setThreeYr, "three")}</div>
          <div><div style={lbl}>One year goals</div>{goalList(oneYr, setOneYr, "one")}</div>
        </div>
      </Card>

      <Card>
        <SectionHeading icon={Flag}>Rock review</SectionHeading>
        <div style={{ fontSize: 12.5, color: N.faint, marginBottom: 14 }}>Are the 90 day goals on track to be done by the end of the quarter. Assign an owner from your team or the agency team, set the status and due date, and add notes.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rocks.map((r) => (
            <div key={r.id} style={{ border: `1px solid ${N.line}`, borderRadius: 11, padding: "13px 15px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                {scopeChip(r)}
                <input value={r.title} placeholder="Rock title" onChange={(e) => setRock(r.id, "title", e.target.value)} style={{ ...inp, flex: 1, minWidth: 160, fontWeight: 600 }} />
                {statusSel(r.status, (v) => setRock(r.id, "status", v))}
                <button onClick={() => removeRock(r.id)} title="Remove" style={xBtn}><X size={13} /></button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <Owner value={r.owner} onChange={(v) => setRock(r.id, "owner", v)} />
                <DueField value={r.due} onChange={(v) => setRock(r.id, "due", v)} />
                {addIssueBtn(r.title, r.owner)}
              </div>
              {notesField(r.notes, (v) => setRock(r.id, "notes", v))}
            </div>
          ))}
          <button onClick={addRock} style={ghostBtn}>+ Add rock</button>
        </div>
      </Card>

      <Card>
        <SectionHeading icon={ListChecks}>To-do list</SectionHeading>
        <div style={{ fontSize: 12.5, color: N.faint, marginBottom: 14 }}>Seven day action items. Weekly commitments that should drop off as they get done. Assign an owner and add notes.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {todos.map((t) => (
            <div key={t.id} style={{ border: `1px solid ${N.line}`, borderRadius: 11, padding: "13px 15px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {check(t.done, () => setTodo(t.id, "done", !t.done))}
                <input value={t.title} placeholder="To-do" onChange={(e) => setTodo(t.id, "title", e.target.value)} style={{ ...inp, flex: 1, color: t.done ? N.faint : B.black, textDecoration: t.done ? "line-through" : "none" }} />
                <button onClick={() => removeTodo(t.id)} title="Remove" style={xBtn}><X size={13} /></button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <Owner value={t.owner} onChange={(v) => setTodo(t.id, "owner", v)} />
                <DueField value={t.due} onChange={(v) => setTodo(t.id, "due", v)} />
                {addIssueBtn(t.title, t.owner)}
              </div>
              {notesField(t.notes, (v) => setTodo(t.id, "notes", v))}
            </div>
          ))}
          <button onClick={addTodo} style={ghostBtn}>+ Add to-do</button>
        </div>
      </Card>

      <Card>
        <SectionHeading icon={AlertTriangle}>IDS, issues list</SectionHeading>
        <div style={{ fontSize: 12.5, color: N.faint, marginBottom: 14 }}>Problems and obstacles to identify, discuss, and solve. Assign an owner and add notes, or resolve them in the meeting.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {issues.map((x) => {
            const done = x.status === "resolved";
            return (
              <div key={x.id} style={{ border: `1px solid ${N.line}`, borderRadius: 11, padding: "13px 15px", display: "flex", flexDirection: "column", gap: 10, background: done ? N.fill : B.white }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {check(done, () => setIssue(x.id, "status", done ? "open" : "resolved"))}
                  <input value={x.title} placeholder="Issue" onChange={(e) => setIssue(x.id, "title", e.target.value)} style={{ ...inp, flex: 1, color: done ? N.faint : B.black, textDecoration: done ? "line-through" : "none" }} />
                  <button onClick={() => removeIssue(x.id)} title="Remove" style={xBtn}><X size={13} /></button>
                </div>
                <Owner value={x.owner} onChange={(v) => setIssue(x.id, "owner", v)} />
                {notesField(x.notes, (v) => setIssue(x.id, "notes", v))}
              </div>
            );
          })}
          <button onClick={addIssue} style={ghostBtn}>+ Add issue</button>
        </div>
      </Card>

      <Card>
        <SectionHeading icon={Repeat}>Topics covered and when we revisit</SectionHeading>
        <div style={{ fontSize: 12.5, color: N.faint, marginBottom: 14 }}>The recurring topics, when each was last reviewed, and when it is due again. Mark a topic reviewed to stamp today and schedule the next.</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620 }}>
            <thead><tr>
              {["Topic", "Cadence", "Last reviewed", "Next due", ""].map((h) => <th key={h} style={{ ...DISPLAY, fontSize: 10, color: N.faint, textAlign: "left", padding: "0 10px 9px", whiteSpace: "nowrap" }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {topics.map((t) => (
                <tr key={t.id} style={{ borderTop: `1px solid ${N.line}` }}>
                  <td style={{ padding: "9px 10px", fontSize: 13.5, color: B.black }}>{t.topic}</td>
                  <td style={{ padding: "9px 10px" }}>
                    <select value={t.cadence} onChange={(e) => setTopics((ts) => ts.map((z) => (z.id === t.id ? { ...z, cadence: e.target.value } : z)))} style={{ fontFamily: FONT_BODY, fontSize: 12.5, border: `1px solid ${N.line}`, borderRadius: 6, padding: "4px 7px" }}>
                      <option value="Monthly">Monthly</option><option value="Quarterly">Quarterly</option>
                    </select>
                  </td>
                  <td style={{ padding: "9px 10px", fontSize: 12.5, color: N.muted, whiteSpace: "nowrap" }}>{t.last}</td>
                  <td style={{ padding: "9px 10px", fontSize: 12.5, fontWeight: 600, color: N.muted, whiteSpace: "nowrap" }}>{t.next}</td>
                  <td style={{ padding: "9px 10px" }}><button onClick={() => setTopics((ts) => ts.map((z) => (z.id === t.id ? { ...z, last: importDateStr(), next: addMonthsLabel(z.cadence === "Quarterly" ? 3 : 1) } : z)))} style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, color: B.darkBlue, background: B.white, border: `1px solid ${N.line}`, borderRadius: 7, padding: "5px 11px", cursor: "pointer", whiteSpace: "nowrap" }}>Mark reviewed</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: 12, color: N.faint, marginTop: 12 }}>These recurring reviews also show on the Timeline so you can see when content is due to be revisited.</div>
      </Card>
    </div>
  );
}

// ── Reporting and benchmarking, combined on one tab ──
function PerformanceTab({ agency }) {
  const [view, setView] = useState("reporting");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <SectionHeading icon={TrendingUp}>Reporting and benchmarking</SectionHeading>
          <div style={{ marginLeft: "auto", marginBottom: 14 }}>
            <SegToggle value={view} onChange={setView} options={[{ value: "reporting", label: "Our numbers" }, { value: "benchmark", label: "Versus peers" }]} />
          </div>
        </div>
        <div style={{ fontSize: 13, color: N.muted, lineHeight: 1.55 }}>
          {view === "reporting" ? "The agency's own numbers from the monthly report." : "How this agency compares to its peers by pipeline, producer, and lead source."}
        </div>
      </Card>
      {view === "reporting" ? <Reporting /> : <BenchmarkTab agency={agency} />}
    </div>
  );
}

// ── Right people, right seats (EOS style GWC) ──
const SEATS = [
  { seat: "Agency owner, vision and growth", person: "Robert Steele", rightPerson: true, gets: true, wants: true, capacity: true },
  { seat: "Lead producer", person: "Open seat", rightPerson: true, gets: true, wants: true, capacity: false },
  { seat: "Service lead", person: "Maria L.", rightPerson: true, gets: true, wants: true, capacity: true },
  { seat: "Account manager", person: "Dev P.", rightPerson: true, gets: true, wants: false, capacity: true },
];
function RightSeats() {
  const [seats, setSeats] = useState(SEATS.map((s) => ({ ...s })));
  const toggle = (i, f) => setSeats((ss) => ss.map((s, j) => (j === i ? { ...s, [f]: !s[f] } : s)));
  const Box = ({ on, onClick }) => (
    <span onClick={onClick} style={{ width: 18, height: 18, borderRadius: 5, cursor: "pointer", border: on ? "none" : `1.5px solid ${N.faint}`, background: on ? B.darkBlue : "transparent", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{on && <Check size={12} color={B.white} strokeWidth={3} />}</span>
  );
  const head = { ...DISPLAY, fontSize: 9.5, color: N.faint, padding: "0 8px 9px", textAlign: "center", whiteSpace: "nowrap" };
  return (
    <Card>
      <SectionHeading icon={UserCog}>Right people, right seats</SectionHeading>
      <div style={{ fontSize: 12.5, color: N.faint, lineHeight: 1.55, marginBottom: 14 }}>
        For each seat, is it the right person, and do they get it, want it, and have the capacity to do it. A seat is right when all three are checked.
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620 }}>
          <thead><tr>
            <th style={{ ...head, textAlign: "left", padding: "0 10px 9px" }}>Seat</th>
            <th style={{ ...head, textAlign: "left", padding: "0 10px 9px" }}>Person</th>
            <th style={head}>Right person</th><th style={head}>Gets it</th><th style={head}>Wants it</th><th style={head}>Capacity</th><th style={head}>Right seat</th>
          </tr></thead>
          <tbody>
            {seats.map((s, i) => {
              const rightSeat = s.gets && s.wants && s.capacity;
              return (
                <tr key={i} style={{ borderTop: `1px solid ${N.line}` }}>
                  <td style={{ padding: "10px", fontSize: 13.5, fontWeight: 600, color: B.black }}>{s.seat}</td>
                  <td style={{ padding: "10px", fontSize: 13, color: s.person === "Open seat" ? B.red : N.muted }}>{s.person}</td>
                  <td style={{ padding: "10px", textAlign: "center" }}><Box on={s.rightPerson} onClick={() => toggle(i, "rightPerson")} /></td>
                  <td style={{ padding: "10px", textAlign: "center" }}><Box on={s.gets} onClick={() => toggle(i, "gets")} /></td>
                  <td style={{ padding: "10px", textAlign: "center" }}><Box on={s.wants} onClick={() => toggle(i, "wants")} /></td>
                  <td style={{ padding: "10px", textAlign: "center" }}><Box on={s.capacity} onClick={() => toggle(i, "capacity")} /></td>
                  <td style={{ padding: "10px", textAlign: "center" }}><span style={{ fontSize: 11.5, fontWeight: 700, color: rightSeat ? B.darkBlue : B.red }}>{rightSeat ? "Yes" : "Review"}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ── Forms: monthly submission history plus the links and routing for each
// form. Embedded forms carry the slug URL on the agency site. Agent entered
// forms are not embedded, so they carry the direct Cognito or Jotform link. ──
const FORMS = [
  { id: "f1", name: "Get A Quote", embedded: true, builder: "Cognito", siteUrl: "steeleinsurance.com/quote", formUrl: "cognitoforms.com/SteeleInsurance/GetAQuote", notify: "intake@steeleinsurance.com", pipeline: "PL New Business", assignType: "group", assignee: "Intake team", history: [["Jan", 0], ["Feb", 0], ["Mar", 0], ["Apr", 0], ["May", 0], ["Jun", 0]] },
  { id: "f2", name: "Personal Lines Application", embedded: true, builder: "Cognito", siteUrl: "steeleinsurance.com/plapp", formUrl: "cognitoforms.com/SteeleInsurance/PersonalLinesApplication", notify: "pl@steeleinsurance.com", pipeline: "PL New Business", assignType: "group", assignee: "PL producers", history: [["Jan", 0], ["Feb", 0], ["Mar", 0], ["Apr", 0], ["May", 0], ["Jun", 0]] },
  { id: "f3", name: "Commercial Lines Application", embedded: true, builder: "Cognito", siteUrl: "steeleinsurance.com/clapp", formUrl: "cognitoforms.com/SteeleInsurance/CommercialLinesApplication", notify: "cl@steeleinsurance.com", pipeline: "CL New Business", assignType: "group", assignee: "CL producers", history: [["Jan", 0], ["Feb", 0], ["Mar", 0], ["Apr", 0], ["May", 0], ["Jun", 0]] },
  { id: "f4", name: "Service Request", embedded: true, builder: "Cognito", siteUrl: "steeleinsurance.com/service", formUrl: "cognitoforms.com/SteeleInsurance/ServiceRequest", notify: "service@steeleinsurance.com", pipeline: "PL Service", assignType: "group", assignee: "Service team", history: [["Jan", 3], ["Feb", 2], ["Mar", 0], ["Apr", 3], ["May", 0], ["Jun", 0]] },
  { id: "f5", name: "Life", embedded: true, builder: "Jotform", siteUrl: "steeleinsurance.com/life", formUrl: "form.jotform.com/251234567890", notify: "life@steeleinsurance.com", pipeline: "Life Insurance", assignType: "person", assignee: "Tom R.", history: [["Jan", 0], ["Feb", 0], ["Mar", 1], ["Apr", 0], ["May", 2], ["Jun", 1]] },
  { id: "f6", name: "Life Changes Survey", embedded: true, builder: "Cognito", siteUrl: "steeleinsurance.com/lcs", formUrl: "cognitoforms.com/SteeleInsurance/LifeChangesSurvey", notify: "life@steeleinsurance.com", pipeline: "Life Insurance", assignType: "person", assignee: "Tom R.", history: [["Jan", 0], ["Feb", 13], ["Mar", 6], ["Apr", 5], ["May", 4], ["Jun", 4]] },
  { id: "f7", name: "Commercial Lines Renewal", embedded: true, builder: "Cognito", siteUrl: "steeleinsurance.com/clrnw", formUrl: "cognitoforms.com/SteeleInsurance/CommercialLinesRenewal", notify: "renewals@steeleinsurance.com", pipeline: "CL Renewals", assignType: "group", assignee: "Account managers", history: [["Jan", 1], ["Feb", 3], ["Mar", 7], ["Apr", 3], ["May", 3], ["Jun", 3]] },
  { id: "f8", name: "SMS Consent", embedded: true, builder: "Cognito", siteUrl: "steeleinsurance.com/sms", formUrl: "cognitoforms.com/SteeleInsurance/SMSConsent", notify: "admin@steeleinsurance.com", pipeline: "", assignType: "none", assignee: "", history: [["Jan", 12], ["Feb", 7], ["Mar", 9], ["Apr", 0], ["May", 14], ["Jun", 14]] },
  { id: "f9", name: "Referral", embedded: true, builder: "Cognito", siteUrl: "steeleinsurance.com/referral", formUrl: "cognitoforms.com/SteeleInsurance/Referral", notify: "referrals@steeleinsurance.com", pipeline: "Smart Cycle", assignType: "person", assignee: "Gio Marchan", history: [["Jan", 0], ["Feb", 0], ["Mar", 0], ["Apr", 0], ["May", 0], ["Jun", 0]] },
  { id: "f10", name: "Agent Entered, Personal Lines App", embedded: false, builder: "Cognito", siteUrl: "", formUrl: "cognitoforms.com/SteeleInsurance/AgentPersonalLinesApp", notify: "pl@steeleinsurance.com", pipeline: "PL New Business", assignType: "group", assignee: "PL producers", history: [["Jan", 0], ["Feb", 0], ["Mar", 0], ["Apr", 0], ["May", 0], ["Jun", 0]] },
  { id: "f11", name: "Agent Entered, Commercial Lines App", embedded: false, builder: "Cognito", siteUrl: "", formUrl: "cognitoforms.com/SteeleInsurance/AgentCommercialLinesApp", notify: "cl@steeleinsurance.com", pipeline: "CL New Business", assignType: "group", assignee: "CL producers", history: [["Jan", 13], ["Feb", 14], ["Mar", 4], ["Apr", 5], ["May", 6], ["Jun", 6]] },
];
function FormsTab() {
  const [forms, setForms] = useState(FORMS.map((f) => ({ ...f, history: f.history.map((h) => [...h]) })));
  const [open, setOpen] = useState(null);
  const setField = (id, f, v) => setForms((fs) => fs.map((x) => (x.id === id ? { ...x, [f]: v } : x)));
  const addForm = () => setForms((fs) => [...fs, { id: "f" + Math.random().toString(36).slice(2, 6), name: "New form", embedded: true, builder: "Cognito", siteUrl: "", formUrl: "", notify: "", pipeline: "", assignType: "none", assignee: "", history: [["Jan", 0], ["Feb", 0], ["Mar", 0], ["Apr", 0], ["May", 0], ["Jun", 0]] }]);
  const removeForm = (id) => setForms((fs) => fs.filter((x) => x.id !== id));
  const monthTotal = forms.reduce((a, f) => a + (f.history[f.history.length - 1] ? f.history[f.history.length - 1][1] : 0), 0);
  const inp = { width: "100%", boxSizing: "border-box", fontFamily: FONT_BODY, fontSize: 13, color: B.black, border: `1px solid ${N.line}`, borderRadius: 7, padding: "7px 9px" };
  const lbl = { ...DISPLAY, fontSize: 9.5, color: N.faint, marginBottom: 4, display: "block" };
  const mono = { fontFamily: "ui-monospace, monospace" };
  const assignLabel = (f) => (f.assignType === "group" ? "Group" : f.assignType === "person" ? "Person" : "");
  const href = (u) => (u ? (u.startsWith("http") ? u : "https://" + u) : null);
  const openLink = (u) => (u ? <a href={href(u)} target="_blank" rel="noreferrer" style={{ fontSize: 11.5, fontWeight: 600, color: B.teal, textDecoration: "none", whiteSpace: "nowrap" }}>Open</a> : null);
  const tag = (text, color, bg) => <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.3, color, background: bg, borderRadius: 6, padding: "2px 7px", textTransform: "uppercase", whiteSpace: "nowrap" }}>{text}</span>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <SectionHeading icon={FileText}>Forms</SectionHeading>
          <span style={{ marginLeft: "auto", fontSize: 12.5, color: N.muted, marginBottom: 14 }}>{monthTotal} submissions this month</span>
        </div>
        <div style={{ fontSize: 13.5, color: N.muted, lineHeight: 1.6 }}>
          Every intake and service form, with its monthly submission history and its links. Embedded forms show the URL on the agency site. Agent entered forms are not embedded, so they show the direct Cognito or Jotform link. Tap a form to see and edit the detail.
        </div>
        <button onClick={addForm} style={{ marginTop: 14, fontFamily: FONT_BODY, fontSize: 12.5, fontWeight: 600, color: B.darkBlue, background: B.white, border: `1px dashed ${N.line}`, borderRadius: 8, padding: "8px 14px", cursor: "pointer" }}>+ Add form</button>
      </Card>

      {forms.map((f) => {
        const opened = open === f.id;
        const last = f.history[f.history.length - 1] ? f.history[f.history.length - 1][1] : 0;
        const max = Math.max(1, ...f.history.map((h) => h[1]));
        const shownUrl = f.embedded ? (f.siteUrl || "no site URL set") : (f.formUrl || "no form link set");
        return (
          <Card key={f.id} style={{ padding: 0 }}>
            <button onClick={() => setOpen(opened ? null : f.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: B.white, border: "none", cursor: "pointer", textAlign: "left", flexWrap: "wrap" }}>
              {opened ? <ChevronDown size={15} color={N.muted} /> : <ChevronRight size={15} color={N.muted} />}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600, color: B.black }}>{f.name}</div>
                <div style={{ fontSize: 11.5, color: N.faint, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
                  <span style={mono}>{shownUrl}</span>
                  {f.embedded ? tag("Embedded", B.teal, "rgba(20,83,101,0.10)") : tag(f.builder + " direct", N.muted, N.fill)}
                </div>
              </div>
              {f.pipeline
                ? <span style={{ fontSize: 11.5, fontWeight: 600, color: B.darkBlue, background: "rgba(36,36,45,0.06)", border: `1px solid ${N.line}`, borderRadius: 8, padding: "4px 10px", whiteSpace: "nowrap" }}>{f.pipeline}</span>
                : <span style={{ fontSize: 11.5, color: N.faint, whiteSpace: "nowrap" }}>No pipeline</span>}
              {f.assignType !== "none"
                ? <span style={{ fontSize: 11.5, color: N.muted, whiteSpace: "nowrap" }}>{assignLabel(f)}: <span style={{ fontWeight: 600, color: B.black }}>{f.assignee}</span></span>
                : <span style={{ fontSize: 11.5, color: N.faint, whiteSpace: "nowrap" }}>Unassigned</span>}
              <span style={{ fontSize: 12.5, fontWeight: 700, color: B.darkBlue, whiteSpace: "nowrap" }}>{last} this month</span>
            </button>
            {opened && (
              <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${N.line}` }}>
                <div style={{ ...DISPLAY, fontSize: 10, color: B.darkBlue, margin: "14px 0 8px" }}>Form</div>
                <div><span style={lbl}>Form name</span><input value={f.name} onChange={(e) => setField(f.id, "name", e.target.value)} style={inp} /></div>
                <div style={{ ...DISPLAY, fontSize: 10, color: B.darkBlue, margin: "16px 0 8px" }}>Links</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <span style={lbl}>Embedded on the site</span>
                    <select value={f.embedded ? "yes" : "no"} onChange={(e) => setField(f.id, "embedded", e.target.value === "yes")} style={{ ...inp, width: "auto" }}>
                      <option value="yes">Yes, embedded</option>
                      <option value="no">No, agent entered</option>
                    </select>
                  </div>
                  <div>
                    <span style={lbl}>Form builder</span>
                    <select value={f.builder} onChange={(e) => setField(f.id, "builder", e.target.value)} style={{ ...inp, width: "auto" }}>
                      <option value="Cognito">Cognito Forms</option>
                      <option value="Jotform">Jotform</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <span style={lbl}>Embedded URL on the agency site</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <input value={f.siteUrl} disabled={!f.embedded} placeholder={f.embedded ? "agencysite.com/quote" : "Not embedded"} onChange={(e) => setField(f.id, "siteUrl", e.target.value)} style={{ ...inp, ...mono, opacity: f.embedded ? 1 : 0.5 }} />
                      {f.embedded && openLink(f.siteUrl)}
                    </div>
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <span style={lbl}>Direct form link ({f.builder})</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <input value={f.formUrl} placeholder="cognitoforms.com/Agency/FormName" onChange={(e) => setField(f.id, "formUrl", e.target.value)} style={{ ...inp, ...mono }} />
                      {openLink(f.formUrl)}
                    </div>
                  </div>
                </div>

                <div style={{ ...DISPLAY, fontSize: 10, color: B.darkBlue, margin: "18px 0 8px" }}>Routing</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><span style={lbl}>Email notification to</span><input value={f.notify} onChange={(e) => setField(f.id, "notify", e.target.value)} style={inp} /></div>
                  <div><span style={lbl}>Pipeline</span><input value={f.pipeline} placeholder="Does not route to a pipeline" onChange={(e) => setField(f.id, "pipeline", e.target.value)} style={inp} /></div>
                  <div>
                    <span style={lbl}>Assigned to</span>
                    <select value={f.assignType} onChange={(e) => setField(f.id, "assignType", e.target.value)} style={{ ...inp, width: "auto" }}>
                      <option value="none">Not assigned</option>
                      <option value="person">A person</option>
                      <option value="group">Assignment group</option>
                    </select>
                  </div>
                  <div><span style={lbl}>{f.assignType === "group" ? "Group name" : "Person"}</span><input value={f.assignee} disabled={f.assignType === "none"} placeholder={f.assignType === "none" ? "—" : "Name"} onChange={(e) => setField(f.id, "assignee", e.target.value)} style={{ ...inp, opacity: f.assignType === "none" ? 0.5 : 1 }} /></div>
                </div>

                <div style={{ ...DISPLAY, fontSize: 10, color: B.darkBlue, margin: "18px 0 10px" }}>Monthly submissions</div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 76 }}>
                  {f.history.map(([m, n], i) => (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: n ? B.black : N.faint }}>{n}</span>
                      <div style={{ width: "100%", maxWidth: 36, height: Math.round((n / max) * 46) + 2, background: n ? B.darkBlue : N.line, borderRadius: 4 }} />
                      <span style={{ fontSize: 10, color: N.faint }}>{m}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => removeForm(f.id)} style={{ marginTop: 16, fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, color: B.red, background: "none", border: "none", cursor: "pointer", padding: 0 }}>Remove form</button>
              </div>
            )}
          </Card>
        );
      })}
      <div style={{ fontSize: 12, color: N.faint, lineHeight: 1.55 }}>
        Submission counts come from the monthly report. The links, notification, pipeline, and assignment read from the form and CRM setup, and edits here save to the form record.
      </div>
    </div>
  );
}

export default function ClientProfileApp({ session, accountId }) {
  const [view, setView] = useState(accountId ? "profile" : "accounts"); // accounts | benchmark | profile
  const [accounts, setAccounts] = useState([]); // real rows from the Laravel API
  const [agencyId, setAgencyId] = useState(accountId || null);
  const [tab, setTab] = useState("Overview");
  const [meetingsFilter, setMeetingsFilter] = useState("all");
  const jumpMeetings = (f) => { setMeetingsFilter(f || "all"); setTab("Meetings"); };
  const [techTools, setTechTools] = useState(() => TECH_SEED.map((t, i) => ({ id: "t" + i, ...t })));
  const [tickets, setTickets] = useState(() => TICKETS.map((t) => ({ ...t })));
  const updateTicket = (id, patch) => setTickets((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const [logos, setLogos] = useState({});
  const [photos, setPhotos] = useState({});
  const setPhoto = (id, src) => setPhotos((p) => ({ ...p, [id]: src }));
  const [rocks, setRocks] = useState(() => ROCKS_SEED.map((r) => ({ ...r })));
  const [todos, setTodos] = useState(() => TODOS_SEED.map((t) => ({ ...t })));
  const [issues, setIssues] = useState(() => ISSUES_SEED.map((x) => ({ ...x })));

  // Real accounts list from Laravel. No Supabase in the browser.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await api.get("/api/client-profiles");
        const emp = Object.fromEntries((data.employees || []).map((e) => [e.id, e.name]));
        const comp = Object.fromEntries((data.companies || []).map((c) => [c.id, c.name]));
        const statusOf = (cs) => { const s = (cs || "").toLowerCase(); return s.includes("risk") ? "at_risk" : s === "healthy" ? "on_track" : "on_track"; };
        const rows = (data.accounts || []).map((a) => ({
          id: a.account_id, name: comp[a.hubspot_company_id] || "(no agency)",
          pm: emp[a.pm_id] || "—", product: a.plan || "—", status: statusOf(a.cs_status), pct: 0, lastMtg: null,
        })).sort((x, y) => x.name.localeCompare(y.name));
        if (alive) setAccounts(rows);
      } catch (e) { if (alive) alert("Could not load accounts: " + e.message); }
    })();
    return () => { alive = false; };
  }, []);

  const selected = accounts.find((a) => a.id === agencyId) || null;

  // Load the opened account's real 360 data from Laravel.
  const [profile, setProfile] = useState(null);
  useEffect(() => {
    if (!agencyId) { setProfile(null); return; }
    let alive = true;
    setProfile(null);
    (async () => {
      try {
        const p = await api.get(`/api/client-profiles/${agencyId}`);
        RUNTIME_EMP = Object.fromEntries((p.employees || []).map((e) => [e.id, { name: e.name }]));
        if (alive) setProfile(p);
      } catch (e) { if (alive) alert("Could not load profile: " + e.message); }
    })();
    return () => { alive = false; };
  }, [agencyId]);

  // Shape the real account data into what the backed tabs expect.
  const fmtD = (d) => d ? new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—";
  const realClient = useMemo(() => {
    if (!profile) return null;
    const a = profile.account || {};
    const team = profile.account_team || [];
    const teamIds = [a.pm_id, ...team.map((t) => t.employee_id)].filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i);
    const roles = {};
    team.forEach((t) => { (roles[t.role_group] = roles[t.role_group] || []).push(t.employee_id); });
    return {
      company_name: profile.company?.name || selected?.name || "(no agency)",
      product_mix: a.plan || "—", account_stage: a.stage || "—", service_status: a.service_status || "monthly",
      start_date: fmtD(a.since_date), va_start_date: fmtD(a.va_start_date), go_live_date: fmtD(a.go_live_date),
      support_through: fmtD(a.support_through), decision_due_date: fmtD(a.decision_due_date),
      ad_hoc_prepaid: a.ad_hoc_prepaid || 0, platform: a.crm || a.ams || "—",
      va_count: (profile.vas || []).filter((v) => v.account_id === agencyId).length,
      team_ids: teamIds, primary_contact_ids: [a.pm_id].filter(Boolean), roles,
      tech_tools: a.tech_tools || [], logo_url: null, photo_url: null, photo_release_signed: false, caricature_url: null,
    };
  }, [profile, selected, agencyId]);
  const realMeetings = useMemo(() => (profile?.meetings || []).map((m) => ({
    date: fmtD(m.meeting_date), type: m.type || "Meeting", title: m.title || "—", status: m.status || "completed",
    scheduled: null, actual: null, rating: m.rating || 0, notes: m.notes || "",
    ranBy: null, dept: "", recording: null, transcript: null, attendees: [], wins: [], actionItems: [],
  })), [profile]);
  const empMap = useMemo(() => Object.fromEntries((profile?.employees || []).map((e) => [e.id, { name: e.name }])), [profile]);
  const realVAs = useMemo(() => (profile?.vas || []).filter((v) => v.account_id === agencyId)
    .map((v) => ({ id: v.employee_id, name: empMap[v.employee_id]?.name || nameOf(v.employee_id), lead: "", title: v.title, started: null })), [profile, empMap, agencyId]);
  const realTeam = useMemo(() => {
    if (!profile) return null;
    const a = profile.account || {}; const team = profile.account_team || [];
    const ids = [a.pm_id, ...team.map((t) => t.employee_id)].filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i);
    const roleOf = (id) => id === a.pm_id ? "Project Manager" : (team.find((t) => t.employee_id === id)?.role_group || "");
    return ids.map((id) => ({ id, name: empMap[id]?.name || nameOf(id), role: roleOf(id), email: "", booking: "" }));
  }, [profile, empMap]);
  const realGoals = useMemo(() => (profile?.goals || []).map((g) => ({ description: g.title, status: g.status || "not_started" })), [profile]);
  const recentMeeting = useMemo(() => {
    const m = (profile?.meetings || [])[0];
    return m ? { meeting_date: fmtD(m.meeting_date), title: m.title || "Meeting", summary: m.notes || "", action_items: [] } : null;
  }, [profile]);

  const openAgency = (id) => { setAgencyId(id); setTab("Overview"); setView("profile"); logActivity("client.viewed", "client", id); };
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap";
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  return (
    <div style={{ fontFamily: FONT_BODY, background: "#F4F3F1", minHeight: "100vh", color: B.black }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", background: B.white, minHeight: "100vh", border: `1px solid ${N.line}` }}>
        {view === "profile" ? (
          (!selected || !profile || !realClient) ? (
            <div style={{ padding: 28, color: N.muted }}>Loading profile…</div>
          ) : (
          <>
            <Header client={realClient} agency={selected} onBack={accountId ? undefined : () => setView("accounts")} logo={logos[selected.id]} onLogo={(src) => setLogos((l) => ({ ...l, [selected.id]: src }))} />
            <div style={{ padding: "10px 28px", background: N.fill, borderBottom: `1px solid ${N.line}`, fontSize: 12.5, color: N.muted }}>
              {selected.name} is connected. Overview, General, People, and Meetings show live data; the remaining tabs still show the worked example while we wire them in.
            </div>
            <>
                <TabNav active={tab} onChange={setTab} />
                <div style={{ padding: 28 }}>
                  {tab === "Overview" && <Overview rocks={rocks} todos={todos} setRocks={setRocks} setTodos={setTodos} photos={photos} onJumpToMeetings={jumpMeetings} vas={realVAs} goals={realGoals} recentMeeting={recentMeeting} vaStartDate={realClient.va_start_date} />}
                  {tab === "LAVA OS" && <LavaOS rocks={rocks} setRocks={setRocks} todos={todos} setTodos={setTodos} issues={issues} setIssues={setIssues} />}
                  {tab === "General" && <General client={realClient} techTools={techTools} setTechTools={setTechTools} meetings={realMeetings} emp={empMap} />}
                  {tab === "CRM" && <CrmSection />}
                  {tab === "Forms" && <FormsTab />}
                  {tab === "Reporting" && <PerformanceTab agency={selected} />}
                  {tab === "Benchmarking" && <PerformanceTab agency={selected} />}
                  {tab === "Meetings" && <MeetingsTab tickets={tickets} onUpdate={updateTicket} rocks={rocks} todos={todos} issues={issues} setRocks={setRocks} setTodos={setTodos} setIssues={setIssues} typeView={meetingsFilter} setTypeView={setMeetingsFilter} meetings={realMeetings} />}
                  {tab === "Requests" && <RequestsTab tickets={tickets} onUpdate={updateTicket} />}
                  {tab === "People" && <People client={realClient} photos={photos} setPhoto={setPhoto} team={realTeam} vas={realVAs} />}
                  {tab === "Timeline" && <TimelineGantt rocks={rocks} todos={todos} />}
                </div>
              </>
          </>
          )
        ) : (
          <>
            <AccountsNav view={view} setView={setView} />
            {view === "accounts" && <AccountsList onOpen={openAgency} accounts={accounts} />}
            {view === "benchmark" && <Benchmarking />}
          </>
        )}
      </div>
    </div>
  );
}
