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
const nameOf = (id) => (EMP[id] ? EMP[id].name : "Unknown");
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
  va_count: 15,
  tech_tools: ["AgencyZoom", "HawkSoft AMS", "RingCentral", "Zapier", "DocuSign", "Google Workspace"],
};

// Real deployed VAs for Steele Insurance Agency (spine.employees, Client group).
const VAS = [
  { id: "2fb6959f-bb26-4988-8aae-8abf702557b1", name: "Allyza Legaspi", lead: "Edmar Quirante" },
  { id: "eedb75aa-b778-45eb-841c-35bfc9d31108", name: "Christian Vern Aguilar", lead: "Edmar Quirante" },
  { id: "cd536de6-a63a-42a7-87f3-d6a17eb77abf", name: "Diane Layne Fernandez", lead: "Edmar Quirante" },
  { id: "bb40dd32-8a45-41a2-b4cf-7885ba28bf18", name: "Dyniela Buhia", lead: "Edmar Quirante" },
  { id: "f0205bca-247e-460f-b95b-45d002ee240f", name: "Frederick Fedee", lead: "Edmar Quirante" },
  { id: "38517a5c-9413-4a63-9ede-56ceee920bbf", name: "Ira Mae Basalan", lead: "Edmar Quirante" },
  { id: "997f53a4-d89d-491a-8d95-9a7012f1f52b", name: "Jacky Arado", lead: "Edmar Quirante" },
  { id: "5246a174-dc7d-493d-914a-8547c07cd6aa", name: "Jason Gulanes", lead: "Edmar Quirante" },
  { id: "d1aca1f0-067b-4137-9532-2566e561d956", name: "Jefryle Jude Rivero", lead: "Edmar Quirante" },
  { id: "ed99de55-7c13-45bb-b83f-74ea1f6e560e", name: "Jesselyn Xena Paronda", lead: "Edmar Quirante" },
  { id: "154fdef9-7473-4f8a-80ef-33247baf16d4", name: "Jose Lorenzo Ponce de Leon", lead: "Edmar Quirante" },
  { id: "65cd614e-7b69-466b-810e-cccfa6969f94", name: "Leah Mae Abella", lead: "Edmar Quirante" },
  { id: "ad52249e-d5ab-4b48-a8a2-75fb9ee6140f", name: "Louie Jay Elio", lead: "Martin Salcedo" },
  { id: "3e74bc55-528b-45a1-b1c0-64aa2c741fb2", name: "Maika Silagan", lead: "Edmar Quirante" },
  { id: "0f200cfa-ed40-4fba-98a9-b4e6185cf327", name: "Mariah Nicole Seville", lead: "Edmar Quirante" },
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
function Card({ children, style }) {
  return <div style={{ background: B.white, border: `1px solid ${N.line}`, borderRadius: 12, padding: "18px 20px", ...style }}>{children}</div>;
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
function Header({ client, agency, onBack }) {
  const photo = photoState(client);
  const contacts = client.primary_contact_ids.map(nameOf);
  const name = agency ? agency.name : client.company_name;
  const product = agency ? agency.product : client.product_mix;
  const st = agency ? STATUS[agency.status] : null;
  const stStyle = agency && agency.status === "on_track" ? { bg: B.white, fg: B.darkBlue } : { bg: B.red, fg: B.white };
  return (
    <div style={{ background: B.darkBlue, padding: "18px 28px" }}>
      {onBack && (
        <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.08)", border: "none", color: "rgba(255,255,255,0.85)", fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, padding: "6px 11px", borderRadius: 8, cursor: "pointer", marginBottom: 14 }}>
          <ChevronLeft size={14} /> All accounts
        </button>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{ width: 64, height: 64, borderRadius: 12, flexShrink: 0, background: photo.kind === "logo" ? B.white : N.fill, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          {photo.src
            ? <img src={photo.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ ...DISPLAY, fontSize: 22, color: B.darkBlue }}>{name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>}
        </div>
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

const TABS = ["Overview", "General", "Reporting", "Meetings", "People", "Tech stack", "Timeline"];
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
function CadenceCard() {
  return (
    <Card>
      <SectionHeading icon={Clock}>Days since last meeting</SectionHeading>
      <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
        {CADENCE.map((c) => (
          <div key={c.role} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5 }}>
            <span style={{ flex: 1, color: B.black }}>{c.role}<span style={{ color: N.faint }}> · {c.who.split(" ")[0]}</span></span>
            <DaysBadge days={daysSince(c.date)} />
          </div>
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

function Overview() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.7fr) minmax(0,1fr)", gap: 18 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <Card style={{ borderTop: `3px solid ${B.red}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: B.red, fontWeight: 500, marginBottom: 10 }}>
            <Pin size={13} /><span>Pinned, most recent meeting</span>
            <span style={{ marginLeft: "auto", color: N.muted, fontWeight: 400, display: "inline-flex", alignItems: "center", gap: 5 }}><CalendarDays size={13} />{PINNED_MEETING.meeting_date}</span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: B.black, marginBottom: 8 }}>{PINNED_MEETING.title}</div>
          <div style={{ fontSize: 14, color: N.muted, lineHeight: 1.65, marginBottom: 16 }}>{PINNED_MEETING.summary}</div>
          <div style={{ ...DISPLAY, fontSize: 11, color: N.muted, marginBottom: 10 }}>Action items</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {PINNED_MEETING.action_items.map((a, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
                <span style={{ width: 17, height: 17, borderRadius: 5, flexShrink: 0, border: a.done ? "none" : `1.5px solid ${N.faint}`, background: a.done ? B.darkBlue : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>{a.done && <Check size={12} color={B.white} strokeWidth={3} />}</span>
                <span style={{ color: a.done ? N.faint : B.black, textDecoration: a.done ? "line-through" : "none", flex: 1 }}>{a.text}</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: N.muted, fontSize: 12.5 }}><Monogram name={nameOf(a.owner_id)} size={22} /> {nameOf(a.owner_id)}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <SectionHeading icon={Target}>Client goals</SectionHeading>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {GOALS.map((g, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14 }}>
                <span style={{ flex: 1, color: B.black }}>{g.description}</span><Pill status={g.status} />
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <SectionHeading icon={Flag}>Client rocks</SectionHeading>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {ROCKS.map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14 }}>
                <span style={{ flex: 1, color: B.black }}>{r.title}<span style={{ color: N.faint }}> · {nameOf(r.owner_id)}</span></span>
                <span style={{ fontSize: 11, color: N.muted, background: N.fill, padding: "3px 8px", borderRadius: 8 }}>{r.quarter}</span>
                <Pill status={r.status} />
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18, alignSelf: "start" }}>
        <CadenceCard />
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
        {meetings.map((m, i) => {
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
function General({ client, techTools }) {
  const [status, setStatus] = useState(client.service_status);
  const activeTools = techTools && techTools.length ? techTools.map((t) => t.name) : client.tech_tools;
  return (
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
          <Fact label="Account owner" value={nameOf("0594b223-6f02-4f8e-9876-7f5af128c4de")} />
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
        <SectionHeading icon={Wrench}>Tech tools</SectionHeading>
        <div style={{ fontSize: 12, color: N.faint, marginBottom: 10 }}>The active tools selected in the Tech stack tab.</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
          {activeTools.map((t) => (
            <span key={t} style={{ fontSize: 13, color: B.darkBlue, background: N.fill, border: `1px solid ${N.line}`, padding: "6px 12px", borderRadius: 8 }}>{t}</span>
          ))}
        </div>
      </Card>
      <Card>
        <SectionHeading icon={Users}>Staff on this account</SectionHeading>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {client.team_ids.map((id) => (
            <div key={id} style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <Monogram name={nameOf(id)} size={34} />
              <div>
                <div style={{ fontSize: 14, color: B.black, fontWeight: 500 }}>{nameOf(id)}</div>
                <div style={{ fontSize: 12.5, color: N.muted }}>{EMP[id] ? EMP[id].role : ""}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card style={{ gridColumn: "1 / -1" }}>
        <SectionHeading icon={ClipboardList}>Meetings</SectionHeading>
        <MeetingLog meetings={MEETINGS} />
      </Card>
    </div>
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
  const [modelKey, setModelKey] = useState("split");
  const [depts, setDepts] = useState(() => withIds(clone(AGENCY_MODELS.split.departments)));
  const loadModel = (k) => { setModelKey(k); setDepts(withIds(clone(AGENCY_MODELS[k].departments))); };
  const setLead = (di, v) => setDepts((ds) => ds.map((d, i) => i === di ? { ...d, lead: v } : d));
  const setField = (di, sid, field, v) => setDepts((ds) => ds.map((d, i) => i === di ? { ...d, staff: d.staff.map((st) => st.id === sid ? { ...st, [field]: v } : st) } : d));
  const addStaff = (di) => setDepts((ds) => ds.map((d, i) => i === di ? { ...d, staff: [...d.staff, { id: `new-${Math.random().toString(36).slice(2, 7)}`, name: "", title: "", measure: "", email: "", hired: "", notes: "", count: 1 }] } : d));
  const removeStaff = (di, sid) => setDepts((ds) => ds.map((d, i) => i === di ? { ...d, staff: d.staff.filter((st) => st.id !== sid) } : d));

  // positions dropdown. "Other" lets you type a new title that is added to
  // the list for future rows.
  const [positions, setPositions] = useState(DEFAULT_POSITIONS);
  const [otherFor, setOtherFor] = useState(null);
  const [otherText, setOtherText] = useState("");
  const commitOther = (apply) => { const v = otherText.trim(); if (v) { setPositions((ps) => ps.includes(v) ? ps : [...ps, v]); apply(v); } setOtherFor(null); setOtherText(""); };
  const positionField = (value, okey, apply) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <select value={positions.includes(value) ? value : (value ? "__custom__" : "")}
        onChange={(e) => { const v = e.target.value; if (v === "__other__") { setOtherFor(okey); setOtherText(""); } else if (v !== "__custom__") { apply(v); } }}
        style={inputStyle}>
        <option value="">Select position</option>
        {value && !positions.includes(value) && <option value="__custom__">{value}</option>}
        {positions.map((pos) => <option key={pos} value={pos}>{pos}</option>)}
        <option value="__other__">Other, add new</option>
      </select>
      {otherFor === okey && (
        <div style={{ display: "flex", gap: 6 }}>
          <input value={otherText} placeholder="New position" onChange={(e) => setOtherText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") commitOther(apply); }} style={inputStyle} />
          <button onClick={() => commitOther(apply)} style={{ fontFamily: FONT_BODY, fontSize: 12.5, fontWeight: 600, color: B.white, background: B.teal, border: "none", borderRadius: 7, padding: "0 12px", cursor: "pointer", whiteSpace: "nowrap" }}>Add</button>
        </div>
      )}
    </div>
  );

  const inputStyle = { fontFamily: FONT_BODY, fontSize: 13, color: B.black, border: `1px solid ${N.line}`, borderRadius: 7, padding: "7px 9px", width: "100%", boxSizing: "border-box" };
  const Toggle = ({ value, set, options }) => (
    <div style={{ display: "inline-flex", background: N.fill, borderRadius: 9, padding: 3, gap: 2 }}>
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button key={o.value} onClick={() => set(o.value)} style={{
            border: "none", cursor: "pointer", fontFamily: FONT_BODY, fontSize: 12.5, fontWeight: on ? 600 : 400,
            padding: "6px 12px", borderRadius: 7, background: on ? B.white : "transparent",
            color: on ? B.darkBlue : N.muted, boxShadow: on ? "0 1px 2px rgba(27,18,11,0.08)" : "none",
          }}>{o.label}</button>
        );
      })}
    </div>
  );

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 10 }}>
        <SectionHeading icon={Network} color={B.teal}>Agency staff</SectionHeading>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Toggle value={modelKey} set={loadModel} options={[{ value: "split", label: "Producers and service" }, { value: "portfolio", label: "Account reps, portfolio" }]} />
        </div>
      </div>
      <div style={{ fontSize: 12.5, color: N.faint, lineHeight: 1.55, marginBottom: 16 }}>
        {AGENCY_MODELS[modelKey].blurb} Enter the agency's real owners, departments, and staff here. Switching the model loads that template as a starting point. Saves to the agency staff record.
      </div>

      <div style={{ marginBottom: 18 }}>
        <OrgChartWrap><OrgNode node={buildAgencyTree({ departments: depts })} /></OrgChartWrap>
        <div style={{ fontSize: 12, color: N.faint, textAlign: "center", marginTop: 4 }}>This chart fills in live as you enter the team below. Build it out in the first one or two meetings to capture how the agency is organized.</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {depts.map((d, di) => (
            <div key={d.name}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                <span style={{ ...DISPLAY, fontSize: 11, color: B.darkBlue }}>{d.name}</span>
                <span style={{ fontSize: 12, color: N.faint }}>led by</span>
                <span style={{ minWidth: 200, flex: "0 1 240px" }}>{positionField(d.lead, "lead-" + di, (v) => setLead(di, v))}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {d.staff.map((st) => {
                  const t = tenure(st.hired);
                  return (
                    <div key={st.id} style={{ border: `1px solid ${N.line}`, borderRadius: 9, padding: "11px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1.3fr auto auto", gap: 8, alignItems: "start" }}>
                        <input value={st.name} placeholder="Name" onChange={(e) => setField(di, st.id, "name", e.target.value)} style={inputStyle} />
                        {positionField(st.title, st.id, (v) => setField(di, st.id, "title", v))}
                        {t
                          ? <span style={{ fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", padding: "4px 9px", borderRadius: 999, background: t.isNew ? B.teal : N.fill, color: t.isNew ? B.white : N.muted }}>{t.isNew ? "New" : "Experienced"} · {t.label}</span>
                          : <span style={{ fontSize: 11, color: N.faint, whiteSpace: "nowrap" }}>No hire date</span>}
                        <button onClick={() => removeStaff(di, st.id)} title="Remove" style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${N.line}`, background: B.white, color: N.muted, cursor: "pointer", display: "grid", placeItems: "center", padding: 0 }}><X size={14} /></button>
                      </div>
                      <input value={st.email} placeholder="Email" onChange={(e) => setField(di, st.id, "email", e.target.value)} style={inputStyle} />
                      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8, alignItems: "center" }}>
                        <input value={st.measure} placeholder="Measured on" onChange={(e) => setField(di, st.id, "measure", e.target.value)} style={inputStyle} />
                        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: N.muted }}>
                          Hired
                          <input type="date" value={st.hired} onChange={(e) => setField(di, st.id, "hired", e.target.value)} style={{ ...inputStyle, width: "auto", flex: 1 }} />
                        </label>
                      </div>
                      <textarea value={st.notes} placeholder="Internal notes, not shown to the client" rows={2} onChange={(e) => setField(di, st.id, "notes", e.target.value)} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} />
                    </div>
                  );
                })}
              </div>
              <button onClick={() => addStaff(di)} style={{ marginTop: 8, fontFamily: FONT_BODY, fontSize: 12.5, fontWeight: 600, color: B.darkBlue, background: B.white, border: `1px dashed ${N.line}`, borderRadius: 8, padding: "7px 12px", cursor: "pointer" }}>+ Add person to {d.name}</button>
            </div>
          ))}
        </div>
    </Card>
  );
}

function People({ client }) {
  const [photos, setPhotos] = useState({});
  const capture = (id, name) => setPhotos((p) => ({ ...p, [id]: svgPortrait(name) }));

  // Which Lava people are on this account. Identities come from the spine
  // directory; this only sets the association, which saves to client_team_members.
  const GROUPS = ["Sales", "Customer Success", "Fulfillment", "Team Lead"];
  const EMP_OPTIONS = Object.entries(EMP).map(([id, e]) => ({ id, name: e.name, role: e.role }));
  const [roles, setRoles] = useState(() => JSON.parse(JSON.stringify(client.roles)));
  const [pickId, setPickId] = useState(EMP_OPTIONS[0].id);
  const [pickGroup, setPickGroup] = useState("Fulfillment");
  const assignMember = () => setRoles((r) => {
    const copy = { ...r }; const list = copy[pickGroup] ? [...copy[pickGroup]] : [];
    if (!list.includes(pickId)) list.push(pickId);
    copy[pickGroup] = list; return copy;
  });
  const removeMember = (group, id) => setRoles((r) => ({ ...r, [group]: r[group].filter((x) => x !== id) }));

  // Scheduling links. A PM can open a teammate's booking page and set up a
  // meeting with the client without leaving the call. Saves to client_team_members.
  const [booking, setBooking] = useState(() => {
    const m = {}; Object.entries(EMP).forEach(([id, e]) => { m[id] = e.booking || ""; }); return m;
  });
  const [editLink, setEditLink] = useState(null);
  const [linkText, setLinkText] = useState("");
  const startEditLink = (id) => { setEditLink(id); setLinkText(booking[id] || ""); };
  const saveLink = (id) => { let v = linkText.trim(); if (v && !/^https?:\/\//i.test(v)) v = "https://" + v; setBooking((b) => ({ ...b, [id]: v })); setEditLink(null); setLinkText(""); };

  const lavaTree = {
    box: { name: "Darek Chojnacki", sub: "Account owner, Fulfillment", accent: B.red },
    children: [
      { box: { name: "Gio Marchan", sub: "Sales" } },
      { box: { name: "Karla Jardeloza", sub: "Insurance Director" } },
      { box: { name: "Edmar Quirante", sub: "Team Lead" }, children: [{ box: { name: `${client.va_count} virtual assistants`, sub: "deployed", accent: B.teal } }] },
    ],
  };
  const agencyTree = (function build(n) {
    return { box: { name: n.title, sub: n.count ? String(n.count) : null, accent: B.teal }, children: (n.children || []).map(build) };
  })(AGENCY_ORG);

  // New staff in onboarding. When the agency adds someone, they run our
  // onboarding before touching the system: a Teachable course tuned to this
  // agency's SOPs, role views set in the CRM, and the SOPs for their seat.
  const newHires = [
    { id: "nh1", name: "Jordan Pierce", email: "jordan.pierce@steeleinsurance.com", role: "Personal lines CSR", added: "June 2, 2026", done: 4, modules: 9, sops: ["New client onboarding", "Service request handling"] },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Card>
        <SectionHeading icon={Users}>Lava account team</SectionHeading>
        <div style={{ fontSize: 12.5, color: N.faint, marginBottom: 14 }}>
          Who on the Lava team is on this account. Identities come from the company directory; this sets the association. Open a teammate's scheduling link to book a meeting with the client without leaving the call. Click the camera to capture a headshot from the latest recording.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {Object.entries(roles).map(([group, ids]) => {
            const Icon = ROLE_ICON[group] || Users;
            return (
              <div key={group}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
                  <Icon size={14} color={B.red} />
                  <span style={{ ...DISPLAY, fontSize: 11, color: N.muted }}>{group}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {ids.length === 0 && <span style={{ fontSize: 12, color: N.faint }}>No one assigned</span>}
                  {ids.map((id) => {
                    const first = nameOf(id).split(" ")[0];
                    return (
                      <div key={id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                          <PersonRow name={nameOf(id)} role={EMP[id] ? EMP[id].role : ""} email={EMP[id] ? EMP[id].email : ""} photo={photos[id]} onCapture={() => capture(id, nameOf(id))} />
                          <button onClick={() => removeMember(group, id)} title="Remove from account" style={{ flexShrink: 0, width: 24, height: 24, borderRadius: 6, border: `1px solid ${N.line}`, background: B.white, color: N.muted, cursor: "pointer", display: "grid", placeItems: "center", padding: 0 }}>
                            <X size={13} />
                          </button>
                        </div>
                        {editLink === id ? (
                          <div style={{ display: "flex", gap: 6, paddingLeft: 46 }}>
                            <input value={linkText} autoFocus placeholder="Scheduling link" onChange={(e) => setLinkText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveLink(id)} style={{ flex: 1, fontFamily: FONT_BODY, fontSize: 12.5, color: B.black, border: `1px solid ${N.line}`, borderRadius: 7, padding: "6px 9px" }} />
                            <button onClick={() => saveLink(id)} style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, color: B.white, background: B.darkBlue, border: "none", borderRadius: 7, padding: "0 11px", cursor: "pointer" }}>Save</button>
                            <button onClick={() => setEditLink(null)} style={{ fontFamily: FONT_BODY, fontSize: 12, color: N.muted, background: "none", border: "none", cursor: "pointer" }}>Cancel</button>
                          </div>
                        ) : booking[id] ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 7, paddingLeft: 46 }}>
                            <a href={booking[id]} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, color: B.darkBlue, textDecoration: "none", background: "rgba(36,36,45,0.06)", border: `1px solid ${N.line}`, borderRadius: 8, padding: "6px 11px" }}>
                              <CalendarPlus size={13} /> Schedule with {first}
                            </a>
                            <button onClick={() => startEditLink(id)} title="Edit link" style={{ width: 26, height: 26, borderRadius: 7, border: `1px solid ${N.line}`, background: B.white, color: N.muted, cursor: "pointer", display: "grid", placeItems: "center", padding: 0 }}><Pencil size={12} /></button>
                          </div>
                        ) : (
                          <button onClick={() => startEditLink(id)} style={{ marginLeft: 46, display: "inline-flex", alignItems: "center", gap: 6, fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, color: N.muted, background: B.white, border: `1px dashed ${N.line}`, borderRadius: 8, padding: "6px 11px", cursor: "pointer", alignSelf: "flex-start" }}>
                            <CalendarPlus size={13} /> Add scheduling link
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
              <Headset size={14} color={B.red} />
              <span style={{ ...DISPLAY, fontSize: 11, color: N.muted }}>Virtual assistants ({VAS.length})</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {VAS.map((v) => (
                <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                  <PhotoAvatar name={v.name} photo={photos[v.id]} size={26} bg={B.teal} onCapture={() => capture(v.id, v.name)} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: B.black }}>{v.name}</div>
                    <div style={{ fontSize: 11, color: N.faint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{emailFromName(v.name)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${N.line}`, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: N.muted }}>Assign a team member</span>
          <select value={pickId} onChange={(e) => setPickId(e.target.value)} style={{ fontFamily: FONT_BODY, fontSize: 13, color: B.black, border: `1px solid ${N.line}`, borderRadius: 8, padding: "8px 10px" }}>
            {EMP_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.name} — {o.role}</option>)}
          </select>
          <select value={pickGroup} onChange={(e) => setPickGroup(e.target.value)} style={{ fontFamily: FONT_BODY, fontSize: 13, color: B.black, border: `1px solid ${N.line}`, borderRadius: 8, padding: "8px 10px" }}>
            {GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <button onClick={assignMember} style={{ fontFamily: FONT_BODY, fontSize: 12.5, fontWeight: 600, color: B.white, background: B.darkBlue, border: "none", borderRadius: 8, padding: "9px 14px", cursor: "pointer" }}>Add to account</button>
        </div>
      </Card>

      <Card>
        <SectionHeading icon={UserPlus} color={B.teal}>New staff onboarding</SectionHeading>
        <div style={{ fontSize: 12.5, color: N.faint, marginBottom: 14 }}>
          When the agency adds a team member, they run our onboarding before touching the system. A Teachable course tuned to this agency's SOPs from the pipelines and workflows we built, the role views set in the CRM, and the SOPs for their seat. New staff are reviewed when they are added and on the monthly or quarterly cadence.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {newHires.map((h) => (
            <div key={h.id} style={{ border: `1px solid ${N.line}`, borderRadius: 10, padding: "13px 15px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <PhotoAvatar name={h.name} photo={photos[h.id]} size={36} bg={B.teal} onCapture={() => capture(h.id, h.name)} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: B.black, fontWeight: 600 }}>{h.name}</div>
                  <div style={{ fontSize: 12, color: N.muted }}>{h.role}. Added {h.added}.</div>
                  {h.email && <div style={{ fontSize: 11.5, color: N.faint }}>{h.email}</div>}
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, background: "rgba(20,83,101,0.10)", color: B.teal, padding: "3px 10px", borderRadius: 8, whiteSpace: "nowrap" }}>In onboarding</span>
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: N.muted, marginBottom: 5 }}>
                  <span>Teachable course, Steele agency playbook</span>
                  <span>{h.done} of {h.modules} modules</span>
                </div>
                <div style={{ height: 7, background: N.line, borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ width: `${(h.done / h.modules) * 100}%`, height: "100%", background: B.teal, borderRadius: 999 }} />
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                <span style={{ fontSize: 11, color: N.faint, fontWeight: 600, marginRight: 2 }}>SOPs for the seat</span>
                {h.sops.map((s) => (
                  <span key={s} style={{ fontSize: 11.5, fontWeight: 600, color: B.darkBlue, background: N.fill, border: `1px solid ${N.line}`, borderRadius: 999, padding: "3px 10px" }}>{s}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionHeading icon={Network}>Lava account team chart</SectionHeading>
        <OrgChartWrap><OrgNode node={lavaTree} /></OrgChartWrap>
      </Card>

      <AgencyStaff />
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

function MeetingRecap() {
  const items = useMemo(() => {
    const fromMeetings = MEETINGS.flatMap((m) => (m.actionItems || []).map((a, idx) => ({
      id: m.date + "-" + idx, text: a.text, owner_id: a.owner_id, due: a.due, done: !!a.done, source: m.type + " · " + m.date,
    })));
    const fromPending = PENDING_TASKS.map((t, idx) => ({
      id: "pending-" + idx, text: t.text, owner_id: t.owner_id, due: t.due, done: t.status === "done", source: "Open task list",
    }));
    return [...fromMeetings, ...fromPending];
  }, []);
  const [done, setDone] = useState(() => { const m = {}; items.forEach((it) => { m[it.id] = it.done; }); return m; });
  const toggle = (id) => setDone((d) => ({ ...d, [id]: !d[id] }));
  const openCount = items.filter((it) => !done[it.id]).length;
  const ordered = [...items].sort((a, b) => (done[a.id] === done[b.id] ? 0 : done[a.id] ? 1 : -1));
  const recentNotes = MEETINGS.filter((m) => m.notes && m.actual != null).slice(0, 4);

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

function MeetingsTab({ onStart }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Card>
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <SectionHeading icon={Presentation}>Run a meeting</SectionHeading>
          <div style={{ marginLeft: "auto", display: "flex", gap: 10, marginBottom: 14 }}>
            <StartMeetingButton label="Start monthly meeting" period="Monthly" onStart={onStart} />
            <StartMeetingButton label="Start quarterly meeting" period="Quarterly" onStart={onStart} />
          </div>
        </div>
        <div style={{ fontSize: 13.5, color: N.muted, lineHeight: 1.6 }}>
          Starting a meeting opens the presenter setup. Recap the open items below first, then share the presented screen and keep your notes, the topic checklist, and project status on your own screen.
        </div>
      </Card>

      <MeetingRecap />

      <Card>
        <SectionHeading icon={CalendarDays}>Meeting history</SectionHeading>
        <MeetingLog meetings={MEETINGS} />
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
  { name: "HawkSoft", category: "AMS", usage: "high", pct: 95, eff: "high", sentiment: "good", notes: "System of record for policies and the book." },
  { name: "AgencyZoom", category: "CRM", usage: "high", pct: 92, eff: "high", sentiment: "good", notes: "Pipelines and automations run here. Heavily used." },
  { name: "Google Workspace", category: "Email", usage: "high", pct: 90, eff: "medium", sentiment: "good", notes: "Email, docs, and shared drives." },
  { name: "Cognito Forms", category: "Form software", usage: "high", pct: 80, eff: "high", sentiment: "good", notes: "Intake forms feed the CRM." },
  { name: "ChatGPT", category: "AI tools", usage: "medium", pct: 55, eff: "high", sentiment: "good", notes: "Drafting follow ups and summaries." },
  { name: "Zapier", category: "Integrators", usage: "high", pct: 85, eff: "high", sentiment: "good", notes: "Moves form data into the CRM and AMS." },
  { name: "Risk Advisor", category: "Integrators", usage: "medium", pct: 60, eff: "high", sentiment: "good", notes: "Prefills carrier quotes." },
  { name: "Sembly", category: "Integrators", usage: "high", pct: 75, eff: "high", sentiment: "good", notes: "Commercial form filling for ACORDs and supplementals." },
  { name: "RingCentral", category: "Phone systems", usage: "medium", pct: 65, eff: "medium", sentiment: "mixed", notes: "Phone and SMS. Call logging into the CRM is inconsistent." },
  { name: "Meet Leo", category: "Prospecting", usage: "low", pct: 30, eff: "medium", sentiment: "mixed", notes: "On trial for cold prospecting. Team adoption is low so far." },
  { name: "DocuSign", category: "E-signature", usage: "medium", pct: 60, eff: "high", sentiment: "good", notes: "E-signature on applications and forms." },
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
    return ex ? ts.filter((t) => t !== ex) : [...ts, { id: cat + ":" + name, name, category: cat, usage: "medium", pct: 50, eff: "medium", sentiment: "good", notes: "" }];
  });
  const addOther = (cat) => { const n = otherText.trim(); if (n && !has(cat, n)) setTools((ts) => [...ts, { id: cat + ":" + n, name: n, category: cat, usage: "medium", pct: 50, eff: "medium", sentiment: "good", notes: "" }]); setOtherText(""); setOtherCat(null); };
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
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
              <thead>
                <tr>
                  <th style={headTh}>Tool</th>
                  <th style={headTh}>Category</th>
                  <th style={headTh}>How it is going</th>
                  <th style={headTh}>Team usage</th>
                  <th style={headTh}>Usage %</th>
                  <th style={headTh}>Effectiveness</th>
                  <th style={headTh}>Notes</th>
                  <th style={headTh}></th>
                </tr>
              </thead>
              <tbody>
                {tools.map((t) => (
                  <tr key={t.id} style={{ borderTop: `1px solid ${N.line}` }}>
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
                    <td style={{ ...cellTd, minWidth: 200 }}><input value={t.notes} placeholder="Notes" onChange={(e) => setField(t.id, "notes", e.target.value)} style={selStyle} /></td>
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

function TimelineGantt() {
  const dayMs = 86400000;
  const D = (s) => new Date(s);
  const missed = (st) => ["no_show", "canceled", "off_track", "behind"].includes(st);

  const allDates = [
    ...TIMELINE_PHASES.flatMap((p) => [D(p.start), D(p.end)]),
    ...TIMELINE_TASKS.flatMap((t) => [D(t.start), D(t.end)]),
    ...MEETINGS.map((m) => D(m.date)),
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

function AccountsList({ onOpen }) {
  const [filter, setFilter] = useState("all");
  const order = { off_track: 0, at_risk: 1, on_track: 2 };
  const rows = AGENCIES.filter((a) => filter === "all" || a.status === filter).sort((a, b) => order[a.status] - order[b.status]);
  const count = (s) => AGENCIES.filter((a) => a.status === s).length;
  const filters = [["all", "All " + AGENCIES.length], ["on_track", "On track " + count("on_track")], ["at_risk", "At risk " + count("at_risk")], ["off_track", "Off track " + count("off_track")]];
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

export default function App() {
  const [view, setView] = useState("accounts"); // accounts | benchmark | profile
  const [agencyId, setAgencyId] = useState("steele");
  const [tab, setTab] = useState("Overview");
  const [meeting, setMeeting] = useState(null); // null or { period }
  const [techTools, setTechTools] = useState(() => TECH_SEED.map((t, i) => ({ id: "t" + i, ...t })));
  const selected = AGENCIES.find((a) => a.id === agencyId) || AGENCIES[0];
  const openAgency = (id) => { setAgencyId(id); setTab("Overview"); setMeeting(null); setView("profile"); logActivity("client.viewed", "client", id); };
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap";
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  return (
    <div style={{ fontFamily: FONT_BODY, background: "#F4F3F1", minHeight: 560, color: B.black }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", background: B.white, minHeight: 560, border: `1px solid ${N.line}` }}>
        {view === "profile" ? (
          <>
            <Header client={CLIENT} agency={selected} onBack={() => setView("accounts")} />
            {selected.id !== "steele" && (
              <div style={{ padding: "10px 28px", background: N.fill, borderBottom: `1px solid ${N.line}`, fontSize: 12.5, color: N.muted }}>
                Showing the Steele worked example. {selected.name} populates from its own records once connected.
              </div>
            )}
            {meeting ? (
              <div style={{ padding: 28 }}>
                <MeetingMode period={meeting.period} onExit={() => setMeeting(null)} />
              </div>
            ) : (
              <>
                <TabNav active={tab} onChange={setTab} />
                <div style={{ padding: 28 }}>
                  {tab === "Overview" && <Overview />}
                  {tab === "General" && <General client={CLIENT} techTools={techTools} />}
                  {tab === "Reporting" && <Reporting />}
                  {tab === "Meetings" && <MeetingsTab onStart={(period) => setMeeting({ period })} />}
                  {tab === "People" && <People client={CLIENT} />}
                  {tab === "Tech stack" && <TechStack tools={techTools} setTools={setTechTools} />}
                  {tab === "Timeline" && <TimelineGantt />}
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <AccountsNav view={view} setView={setView} />
            {view === "accounts" && <AccountsList onOpen={openAgency} />}
            {view === "benchmark" && <Benchmarking />}
          </>
        )}
      </div>
    </div>
  );
}
