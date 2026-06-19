/**
 * Lava Client Profile (Company 360) — frontend only.
 *
 * Data layer now lives in Laravel (ClientProfileController). This file no longer
 * talks to Supabase or writes the activity log; it fetches /api/client-profiles
 * and mutates via /api/client-profiles/* through lib/api. Identity comes from the
 * shell session. The root takes an optional `accountId`: standalone it shows an
 * accounts list -> profile; the Portal can mount it with a selected company.
 *
 * Wires Overview, General, Meetings, Timeline, and People (deployed VAs) to real
 * tables; tech tools edit per-account; Reporting is "Coming Soon". Sections sit
 * empty until rows exist.
 *
 * Reads: /api/client-profiles (accounts + employees + companies) and
 *        /api/client-profiles/{account} (account + company + employees + vas +
 *        meetings + goals + projects + action_items + timeline_events +
 *        account_team).
 */

import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft, Building2, CalendarDays, Pin, Check, Target, Briefcase,
  Users, Wrench, ListChecks, Clock, Map as MapIcon, LayoutDashboard, FileText, Star,
  X, Plus,
} from "lucide-react";
// Plus is used by the People add picker.
import { api } from "../../lib/api";

// Brand floor.
const B = { red: "#E73835", darkBlue: "#24242D", teal: "#145365", white: "#FFFFFF", black: "#1B120B" };
const N = {
  line: "rgba(27,18,11,0.10)", fill: "rgba(27,18,11,0.04)",
  muted: "rgba(27,18,11,0.55)", faint: "rgba(27,18,11,0.40)",
};
const FONT_BODY = "'Poppins', system-ui, -apple-system, sans-serif";
const DISPLAY = { fontFamily: FONT_BODY, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" };

const TABS = ["Overview", "General", "Reporting", "Meetings", "People", "Timeline"];
const ROLE_GROUPS = ["Sales", "Customer Success", "Fulfillment", "Team Lead"];

// Tech tools are picked from a fixed catalog per category, edited from the Tech
// tools card in General. A dedicated catalog manager ("add new tech") comes
// later with App Settings; for now these are the selectable options.
const TECH_CATALOG = {
  "AMS": ["HawkSoft", "Applied Epic", "EZLynx", "AMS360", "NowCerts", "QQ Catalyst"],
  "CRM": ["AgencyZoom", "HubSpot", "GoHighLevel", "InsuredMine", "Salesforce", "Zoho"],
  "Email": ["Gmail", "Outlook", "Google Workspace", "Microsoft 365"],
  "Form Software": ["Cognito Forms", "Jotform", "Typeform", "Google Forms"],
  "AI Tools": ["ChatGPT", "Claude", "Copilot", "Jasper"],
  "Integrators": ["Zapier", "Make", "Risk Advisor", "Sembly", "Canopy Connect", "Gaya"],
  "Phone Systems": ["RingCentral", "Aircall", "Dialpad", "JustCall", "CallRail"],
  "Prospecting": ["Meet Leo", "Apollo", "ZoomInfo", "Smartlead"],
  "E-Signature": ["DocuSign", "Dropbox Sign", "Adobe Sign"],
};
const TECH_CATEGORIES = Object.keys(TECH_CATALOG);

// -- helpers -----------------------------------------------------------------
const initialsOf = (name) => (name || "?").split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
const daysSince = (d) => d ? Math.round((Date.now() - new Date(d).getTime()) / 86400000) : null;
const titleCase = (s) => (s || "").replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const STATUS = {
  in_progress: { label: "in progress", bg: "rgba(36,36,45,0.08)", fg: B.darkBlue },
  on_track: { label: "on track", bg: "rgba(36,36,45,0.08)", fg: B.darkBlue },
  at_risk: { label: "at risk", bg: "rgba(231,56,53,0.10)", fg: B.red },
  off_track: { label: "off track", bg: "rgba(231,56,53,0.10)", fg: B.red },
  not_started: { label: "not started", bg: N.fill, fg: N.muted },
  done: { label: "done", bg: N.fill, fg: N.muted },
  completed: { label: "completed", bg: N.fill, fg: N.muted },
  scheduled: { label: "scheduled", bg: "rgba(36,36,45,0.08)", fg: B.darkBlue },
  no_show: { label: "no show", bg: "rgba(231,56,53,0.10)", fg: B.red },
  canceled: { label: "canceled", bg: N.fill, fg: N.faint },
};
function Pill({ status }) {
  const s = STATUS[status] || { label: titleCase(status) || "—", bg: N.fill, fg: N.muted };
  return <span style={{ fontSize: 11, fontWeight: 500, background: s.bg, color: s.fg, padding: "3px 10px", borderRadius: 8, whiteSpace: "nowrap" }}>{s.label}</span>;
}

function Monogram({ name, bg = B.darkBlue, color = B.white, size = 30 }) {
  return <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: size, height: size, borderRadius: "50%", background: bg, color, fontSize: size * 0.4, fontWeight: 500, flexShrink: 0 }}>{initialsOf(name)}</span>;
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
function Fact({ label, value }) {
  return (
    <div>
      <div style={{ ...DISPLAY, fontSize: 10.5, color: N.faint, marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 15, color: B.black, fontWeight: 500 }}>{value ?? "—"}</div>
    </div>
  );
}
function DateRow({ label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
      <span style={{ width: 150, flexShrink: 0, fontSize: 13, color: N.muted }}>{label}</span>
      <span style={{ fontSize: 14, color: B.black, fontWeight: 500 }}>{value}</span>
    </div>
  );
}
function Empty({ children }) {
  return <div style={{ fontSize: 13, color: N.faint, padding: "10px 0" }}>{children}</div>;
}
function ComingSoon({ title, body }) {
  return (
    <Card style={{ textAlign: "center", padding: "48px 24px" }}>
      <div style={{ ...DISPLAY, fontSize: 13, color: B.red, marginBottom: 8 }}>Coming soon</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: B.black, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13.5, color: N.muted, lineHeight: 1.6, maxWidth: 460, margin: "0 auto" }}>{body}</div>
    </Card>
  );
}

// -- Accounts list (real accounts) -------------------------------------------
function AccountsList({ supabase, onOpen }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await api.get("/api/client-profiles");
        const emp = Object.fromEntries((data.employees || []).map((e) => [e.id, e.name]));
        const compName = Object.fromEntries((data.companies || []).map((c) => [c.id, c.name]));
        const list = (data.accounts || []).map((a) => ({
          id: a.account_id,
          name: compName[a.hubspot_company_id] || "(no agency)",
          pm: emp[a.pm_id] || "—",
          product: a.plan || "—",
          stage: a.stage || "—",
          cs: a.cs_status || "—",
        })).sort((x, y) => x.name.localeCompare(y.name));
        if (alive) { setRows(list); setLoading(false); }
      } catch (e) {
        if (alive) { alert("Could not load accounts: " + e.message); setLoading(false); }
      }
    })();
    return () => { alive = false; };
  }, []);

  const colHead = { ...DISPLAY, fontSize: 10, color: N.faint };
  return (
    <div style={{ padding: 28 }}>
      <SectionHeading icon={Building2}>Fulfillment accounts</SectionHeading>
      <div style={{ fontSize: 13.5, color: N.muted, lineHeight: 1.6, marginBottom: 16, maxWidth: 720 }}>
        Every client agency the fulfillment department runs. Click one to open its company profile.
      </div>
      <Card style={{ padding: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1.3fr 1fr 1fr 1fr", gap: 12, padding: "12px 16px", borderBottom: `1px solid ${N.line}` }}>
          <span style={colHead}>Agency</span><span style={colHead}>Project manager</span><span style={colHead}>Product</span><span style={colHead}>Stage</span><span style={colHead}>CS status</span>
        </div>
        {loading && <div style={{ padding: "40px 16px", textAlign: "center", color: N.faint, fontSize: 13 }}>Loading accounts…</div>}
        {!loading && rows.length === 0 && <div style={{ padding: "40px 16px", textAlign: "center", color: N.faint, fontSize: 13 }}>No accounts visible.</div>}
        {rows.map((a) => (
          <div key={a.id} onClick={() => onOpen(a.id)} style={{ display: "grid", gridTemplateColumns: "2fr 1.3fr 1fr 1fr 1fr", gap: 12, alignItems: "center", padding: "13px 16px", borderBottom: `1px solid ${N.line}`, cursor: "pointer" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = N.fill; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: B.black }}>{a.name}</span>
            <span style={{ fontSize: 13, color: N.muted }}>{a.pm}</span>
            <span style={{ fontSize: 12.5, color: N.muted }}>{a.product}</span>
            <span style={{ fontSize: 12.5, color: N.muted }}>{a.stage}</span>
            <span><Pill status={a.cs?.toLowerCase?.() === "at risk" ? "at_risk" : a.cs?.toLowerCase?.() === "healthy" ? "on_track" : a.cs} /></span>
          </div>
        ))}
      </Card>
    </div>
  );
}

// -- Header ------------------------------------------------------------------
function Header({ d, onBack }) {
  return (
    <div style={{ background: B.darkBlue, padding: "18px 28px" }}>
      {onBack && (
        <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.08)", border: "none", color: "rgba(255,255,255,0.85)", fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, padding: "6px 11px", borderRadius: 8, cursor: "pointer", marginBottom: 14 }}>
          <ChevronLeft size={14} /> All accounts
        </button>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{ width: 64, height: 64, borderRadius: 12, flexShrink: 0, background: B.white, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ ...DISPLAY, fontSize: 22, color: B.darkBlue }}>{initialsOf(d.name)}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...DISPLAY, fontSize: 22, color: B.white, lineHeight: 1.1 }}>{d.name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 9, flexWrap: "wrap" }}>
            {d.product && <span style={{ fontSize: 12, fontWeight: 600, background: B.red, color: B.white, padding: "3px 11px", borderRadius: 8 }}>{d.product}</span>}
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}>{d.stage || "—"}</span>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>|</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
              <Building2 size={14} color="rgba(255,255,255,0.55)" />
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}>PM: {d.pm || "—"}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

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

// -- Tabs --------------------------------------------------------------------
function Overview({ d }) {
  const recent = d.meetings[0] || null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.7fr) minmax(0,1fr)", gap: 18 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <Card style={{ borderTop: `3px solid ${B.red}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: B.red, fontWeight: 500, marginBottom: 10 }}>
            <Pin size={13} /><span>Pinned, most recent meeting</span>
            {recent && <span style={{ marginLeft: "auto", color: N.muted, fontWeight: 400, display: "inline-flex", alignItems: "center", gap: 5 }}><CalendarDays size={13} />{fmtDate(recent.meeting_date)}</span>}
          </div>
          {recent ? (
            <>
              <div style={{ fontSize: 16, fontWeight: 600, color: B.black, marginBottom: 8 }}>{recent.title || titleCase(recent.type) || "Meeting"}</div>
              <div style={{ fontSize: 14, color: N.muted, lineHeight: 1.65 }}>{recent.notes || "No notes recorded."}</div>
            </>
          ) : <Empty>No meetings logged for this account yet.</Empty>}
        </Card>
        <Card>
          <SectionHeading icon={Target}>Client goals</SectionHeading>
          {d.goals.length ? d.goals.map((g) => (
            <div key={g.goal_id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, padding: "7px 0" }}>
              <span style={{ flex: 1, color: B.black }}>{g.title}</span><Pill status={g.status} />
            </div>
          )) : <Empty>No goals set yet.</Empty>}
        </Card>
        <Card>
          <SectionHeading icon={Briefcase}>Projects</SectionHeading>
          {d.projects.length ? d.projects.map((p) => (
            <div key={p.project_id} style={{ padding: "8px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, marginBottom: 6 }}>
                <span style={{ flex: 1, color: B.black }}>{p.name}</span><Pill status={p.status} />
                <span style={{ fontSize: 12, color: N.muted }}>{p.progress_pct ?? 0}%</span>
              </div>
              <span style={{ display: "block", height: 6, background: N.fill, borderRadius: 4 }}>
                <span style={{ display: "block", width: `${p.progress_pct ?? 0}%`, height: "100%", background: p.status === "off_track" ? B.red : B.darkBlue, borderRadius: 4 }} />
              </span>
            </div>
          )) : <Empty>No projects yet.</Empty>}
        </Card>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <Card>
          <SectionHeading icon={ListChecks}>Open action items</SectionHeading>
          {d.actionItems.length ? d.actionItems.map((a) => (
            <div key={a.action_item_id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, padding: "7px 0" }}>
              <span style={{ width: 16, height: 16, borderRadius: 5, flexShrink: 0, border: a.status === "done" ? "none" : `1.5px solid ${N.faint}`, background: a.status === "done" ? B.darkBlue : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>{a.status === "done" && <Check size={11} color={B.white} strokeWidth={3} />}</span>
              <span style={{ flex: 1, color: B.black }}>{a.body}</span>
              {a.owner_id && <Monogram name={d.empName[a.owner_id]} size={22} />}
            </div>
          )) : <Empty>No open action items.</Empty>}
        </Card>
      </div>
    </div>
  );
}

function General({ d, onSaveTools }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 18 }}>
      <Card>
        <SectionHeading icon={Building2}>At a glance</SectionHeading>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div>
            <div style={{ ...DISPLAY, fontSize: 10.5, color: N.faint, marginBottom: 5 }}>Service status</div>
            <Pill status={d.account.service_status} />
          </div>
          <Fact label="Product mix" value={d.product} />
          <Fact label="CRM platform" value={d.account.crm} />
          <Fact label="Account owner" value={d.pm} />
          <Fact label="Deployed VAs" value={String(d.vas.length)} />
          <Fact label="CS status" value={d.account.cs_status} />
        </div>
      </Card>
      <Card>
        <SectionHeading icon={CalendarDays}>Key dates</SectionHeading>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <DateRow label="Client started" value={fmtDate(d.account.since_date)} />
          <DateRow label="VA started" value={fmtDate(d.account.va_start_date)} />
          <DateRow label="Go live" value={fmtDate(d.account.go_live_date)} />
          <DateRow label="Cadence decision due" value={fmtDate(d.account.decision_due_date)} />
          <DateRow label="Support through" value={fmtDate(d.account.support_through)} />
        </div>
      </Card>
      <TechToolsCard selected={d.account.tech_tools} onSave={onSaveTools} />
      <Card>
        <SectionHeading icon={Users}>Account owner</SectionHeading>
        {d.account.pm_id
          ? <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Monogram name={d.pm} size={32} /><span style={{ fontSize: 14, color: B.black, fontWeight: 500 }}>{d.pm}</span></div>
          : <Empty>No project manager assigned.</Empty>}
        <div style={{ fontSize: 12, color: N.faint, marginTop: 12 }}>The full account team is managed in the People tab.</div>
      </Card>
    </div>
  );
}

function MeetingsTab({ d }) {
  return (
    <Card style={{ padding: 0 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 2fr 1fr 1fr 0.8fr", gap: 12, padding: "12px 18px", borderBottom: `1px solid ${N.line}` }}>
        {["Date", "Meeting", "Type", "Status", "Rating"].map((h) => <span key={h} style={{ ...DISPLAY, fontSize: 10, color: N.faint }}>{h}</span>)}
      </div>
      {d.meetings.length ? d.meetings.map((m) => (
        <div key={m.meeting_id} style={{ display: "grid", gridTemplateColumns: "1.2fr 2fr 1fr 1fr 0.8fr", gap: 12, alignItems: "center", padding: "13px 18px", borderBottom: `1px solid ${N.line}` }}>
          <span style={{ fontSize: 13, color: N.muted }}>{fmtDate(m.meeting_date)}</span>
          <span style={{ fontSize: 13.5, color: B.black, fontWeight: 500 }}>{m.title || "—"}</span>
          <span style={{ fontSize: 12.5, color: N.muted }}>{m.type || "—"}</span>
          <span><Pill status={m.status} /></span>
          <span style={{ display: "flex", gap: 2 }}>{[1, 2, 3, 4, 5].map((n) => <Star key={n} size={13} color={n <= (m.rating || 0) ? B.red : N.line} fill={n <= (m.rating || 0) ? B.red : "none"} />)}</span>
        </div>
      )) : <div style={{ padding: "40px 18px", textAlign: "center", color: N.faint, fontSize: 13 }}>No meetings logged for this account yet.</div>}
    </Card>
  );
}

// Native "add" dropdown that calls onPick(id) and resets. Until Company<->person
// links are firm, assignment is a plain editable dropdown of real people.
function AddPicker({ options, placeholder, onPick }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, border: `1px dashed ${N.faint}`, borderRadius: 8, padding: "5px 9px" }}>
      <Plus size={13} color={N.muted} />
      <select
        value=""
        onChange={(e) => { if (e.target.value) onPick(e.target.value); }}
        style={{ border: "none", background: "transparent", outline: "none", fontFamily: FONT_BODY, fontSize: 12.5, color: N.muted, cursor: "pointer", maxWidth: 220 }}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </div>
  );
}

function PersonChip({ name, sub, onRemove }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: `1px solid ${N.line}`, borderRadius: 10 }}>
      <Monogram name={name} size={30} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13.5, color: B.black, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name || "Unknown"}</div>
        {sub && <div style={{ fontSize: 11.5, color: N.muted }}>{sub}</div>}
      </div>
      {onRemove && (
        <button onClick={onRemove} title="Remove" style={{ background: "none", border: "none", cursor: "pointer", color: N.faint, padding: 2, display: "flex", flexShrink: 0 }}>
          <X size={15} />
        </button>
      )}
    </div>
  );
}

function PeopleTab({ d, onAssignVA, onRemoveVA, onAssignTeam, onRemoveTeam }) {
  // VA roster not already on this account, for the add dropdown.
  const vaPickable = d.vaRoster
    .filter((v) => v.account_id !== d.account.account_id)
    .map((v) => ({ id: v.employee_id, name: d.empName[v.employee_id] || "Unknown" }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const teamByGroup = (group) => d.team.filter((t) => t.role_group === group);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
          <SectionHeading icon={Users}>Deployed virtual assistants</SectionHeading>
          <span style={{ marginLeft: "auto" }}>
            <AddPicker options={vaPickable} placeholder="Assign a VA…" onPick={onAssignVA} />
          </span>
        </div>
        {d.vas.length ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 12 }}>
            {d.vas.map((v) => (
              <PersonChip key={v.employee_id} name={d.empName[v.employee_id]} sub={v.title || titleCase(v.status) || "VA"} onRemove={() => onRemoveVA(v.employee_id)} />
            ))}
          </div>
        ) : <Empty>No virtual assistants linked yet. Use “Assign a VA” to add one.</Empty>}
      </Card>

      <Card>
        <SectionHeading icon={Briefcase}>Lava account team</SectionHeading>
        <div style={{ fontSize: 12, color: N.faint, marginBottom: 14 }}>Editable until the Company-to-person links are firmed up. Pick real people from the roster.</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {ROLE_GROUPS.map((group) => {
            const members = teamByGroup(group);
            const memberIds = new Set(members.map((m) => m.employee_id));
            const pickable = d.allEmployees.filter((e) => !memberIds.has(e.id));
            return (
              <div key={group} style={{ border: `1px solid ${N.line}`, borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ ...DISPLAY, fontSize: 10.5, color: N.muted, marginBottom: 10 }}>{group}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                  {members.length ? members.map((m) => (
                    <div key={m.employee_id} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <Monogram name={d.empName[m.employee_id]} size={24} />
                      <span style={{ flex: 1, fontSize: 13, color: B.black, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.empName[m.employee_id] || "Unknown"}</span>
                      <button onClick={() => onRemoveTeam(m.employee_id, group)} title="Remove" style={{ background: "none", border: "none", cursor: "pointer", color: N.faint, padding: 2, display: "flex" }}><X size={14} /></button>
                    </div>
                  )) : <span style={{ fontSize: 12, color: N.faint }}>No one assigned.</span>}
                </div>
                <AddPicker options={pickable} placeholder="Add…" onPick={(id) => onAssignTeam(id, group)} />
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// Tech tools card (in General): lists each category and the selected tools,
// "—" where none, like Key Dates. Edit opens the picker.
function TechToolsCard({ selected, onSave }) {
  const [editing, setEditing] = useState(false);
  const sel = new Set(selected || []);
  // tools selected but not in the known catalog fall under "Other".
  const known = new Set(Object.values(TECH_CATALOG).flat());
  const otherSelected = [...sel].filter((t) => !known.has(t));

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
        <SectionHeading icon={Wrench}>Tech tools</SectionHeading>
        <button onClick={() => setEditing(true)} style={{ marginLeft: "auto", background: "transparent", border: `1px solid ${N.line}`, borderRadius: 8, padding: "6px 13px", fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, color: B.darkBlue, cursor: "pointer" }}>Edit</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {TECH_CATEGORIES.map((cat) => {
          const tools = TECH_CATALOG[cat].filter((t) => sel.has(t));
          return (
            <div key={cat} style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <span style={{ width: 130, flexShrink: 0, fontSize: 12.5, color: N.muted }}>{cat}</span>
              <span style={{ fontSize: 14, color: tools.length ? B.black : N.faint, fontWeight: tools.length ? 500 : 400 }}>{tools.length ? tools.join(", ") : "—"}</span>
            </div>
          );
        })}
        {otherSelected.length > 0 && (
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <span style={{ width: 130, flexShrink: 0, fontSize: 12.5, color: N.muted }}>Other</span>
            <span style={{ fontSize: 14, color: B.black, fontWeight: 500 }}>{otherSelected.join(", ")}</span>
          </div>
        )}
      </div>
      {editing && <TechToolsModal selected={selected} onClose={() => setEditing(false)} onSave={(next) => { onSave(next); setEditing(false); }} />}
    </Card>
  );
}

// Picker modal: select tools per category from the fixed catalog.
function TechToolsModal({ selected, onClose, onSave }) {
  const [working, setWorking] = useState(() => new Set(selected || []));
  const toggle = (name) => setWorking((prev) => {
    const next = new Set(prev);
    next.has(name) ? next.delete(name) : next.add(name);
    return next;
  });

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(27,18,11,0.45)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: B.white, borderRadius: 14, width: "min(720px, 100%)", maxHeight: "86vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: `1px solid ${N.line}` }}>
          <span style={{ ...DISPLAY, fontSize: 13, color: B.darkBlue }}>Select your tools</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: N.muted, padding: 4, display: "flex" }}><X size={18} /></button>
        </div>

        <div style={{ padding: "20px 22px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 18 }}>
          {TECH_CATEGORIES.map((cat) => (
            <div key={cat}>
              <div style={{ ...DISPLAY, fontSize: 10.5, color: N.faint, marginBottom: 9 }}>{cat}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
                {TECH_CATALOG[cat].map((name) => {
                  const on = working.has(name);
                  return (
                    <button key={name} onClick={() => toggle(name)} style={{
                      display: "inline-flex", alignItems: "center", gap: 6, fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, cursor: "pointer",
                      color: on ? B.white : B.darkBlue, background: on ? B.darkBlue : B.white, border: `1px solid ${on ? B.darkBlue : N.line}`,
                      padding: "7px 14px", borderRadius: 999,
                    }}>{on && <Check size={13} strokeWidth={3} />}{name}</button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, padding: "14px 22px", borderTop: `1px solid ${N.line}` }}>
          <button onClick={onClose} style={{ background: "transparent", border: `1px solid ${N.line}`, borderRadius: 8, padding: "9px 16px", fontFamily: FONT_BODY, fontSize: 12.5, fontWeight: 600, color: B.darkBlue, cursor: "pointer" }}>Cancel</button>
          <button onClick={() => onSave([...working])} style={{ background: B.red, border: "none", borderRadius: 8, padding: "9px 18px", fontFamily: FONT_BODY, fontSize: 12.5, fontWeight: 600, color: B.white, cursor: "pointer" }}>Save</button>
        </div>
      </div>
    </div>
  );
}

function TimelineTab({ d }) {
  return (
    <Card>
      <SectionHeading icon={MapIcon}>Timeline</SectionHeading>
      {d.timeline.length ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {d.timeline.map((t) => (
            <div key={t.timeline_event_id} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: `1px solid ${N.line}` }}>
              <span style={{ width: 110, flexShrink: 0, fontSize: 12.5, color: N.muted }}>{fmtDate(t.event_date)}</span>
              <span style={{ width: 9, height: 9, borderRadius: 9, marginTop: 4, flexShrink: 0, background: t.color || B.darkBlue }} />
              <div>
                <div style={{ fontSize: 14, color: B.black, fontWeight: 500 }}>{t.label}</div>
                {t.detail && <div style={{ fontSize: 12.5, color: N.muted, marginTop: 2 }}>{t.detail}</div>}
              </div>
            </div>
          ))}
        </div>
      ) : <Empty>No timeline events for this account yet.</Empty>}
    </Card>
  );
}

// -- Profile (loads one account's 360) ---------------------------------------
function Profile({ supabase, session, accountId, onBack }) {
  const [d, setD] = useState(null);
  const [tab, setTab] = useState("Overview");
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    let payload;
    try {
      payload = await api.get(`/api/client-profiles/${accountId}`);
    } catch (e) { setError(e.message); return; }

    const account = payload.account;
    if (!account) { setError("Account not found."); return; }

    const emps = payload.employees || [];
    const empName = Object.fromEntries(emps.map((e) => [e.id, e.name]));
    const vaRoster = payload.vas || [];
    setD({
      account,
      name: payload.company?.name || "(no agency)",
      product: account.plan,
      stage: account.stage,
      pm: empName[account.pm_id] || null,
      empName,
      allEmployees: emps.map((e) => ({ id: e.id, name: e.name })).sort((a, b) => a.name.localeCompare(b.name)),
      vaRoster,
      vas: vaRoster.filter((v) => v.account_id === accountId),
      team: payload.account_team || [],
      meetings: payload.meetings || [],
      goals: payload.goals || [],
      projects: payload.projects || [],
      actionItems: payload.action_items || [],
      timeline: payload.timeline_events || [],
    });
  }, [accountId]);

  useEffect(() => { setD(null); load(); }, [load]);

  // -- People writes: vas.account_id for VAs, account_team for the Lava team --
  async function assignVA(employeeId) {
    try { await api.patch(`/api/client-profiles/${accountId}/va/assign`, { employee_id: employeeId }); load(); }
    catch (e) { alert("Could not assign VA: " + e.message); }
  }
  async function removeVA(employeeId) {
    try { await api.patch(`/api/client-profiles/${accountId}/va/remove`, { employee_id: employeeId }); load(); }
    catch (e) { alert("Could not remove VA: " + e.message); }
  }
  async function assignTeam(employeeId, roleGroup) {
    try { await api.post(`/api/client-profiles/${accountId}/team`, { employee_id: employeeId, role_group: roleGroup }); load(); }
    catch (e) { alert("Could not add to team: " + e.message); }
  }
  async function removeTeam(employeeId, roleGroup) {
    try { await api.del(`/api/client-profiles/${accountId}/team?employee_id=${encodeURIComponent(employeeId)}&role_group=${encodeURIComponent(roleGroup)}`); load(); }
    catch (e) { alert("Could not remove from team: " + e.message); }
  }

  // -- Tech tools: per-account selection saved to accounts.tech_tools ----------
  async function saveTechTools(next) {
    try { await api.patch(`/api/client-profiles/${accountId}/tech-tools`, { tech_tools: next }); load(); }
    catch (e) { alert("Could not save tech tools: " + e.message); }
  }

  if (error) return <div style={{ padding: 28, color: B.red, fontFamily: FONT_BODY }}>Error: {error}</div>;
  if (!d) return <div style={{ padding: 28, color: N.muted, fontFamily: FONT_BODY }}>Loading profile…</div>;

  return (
    <>
      <Header d={d} onBack={onBack} />
      <TabNav active={tab} onChange={setTab} />
      <div style={{ padding: 28 }}>
        {tab === "Overview" && <Overview d={d} />}
        {tab === "General" && <General d={d} onSaveTools={saveTechTools} />}
        {tab === "Reporting" && <ComingSoon title="Reporting" body="Agency reporting (leads, pipelines, premium, producers, reviews) is a separate app that will tie in here later. It pulls from the agency CRM, not the spine." />}
        {tab === "Meetings" && <MeetingsTab d={d} />}
        {tab === "People" && <PeopleTab d={d} onAssignVA={assignVA} onRemoveVA={removeVA} onAssignTeam={assignTeam} onRemoveTeam={removeTeam} />}
        {tab === "Timeline" && <TimelineTab d={d} />}
      </div>
    </>
  );
}

// -- Root --------------------------------------------------------------------
export default function ClientProfileApp({ session, supabase, accountId }) {
  // accountId prop (future: the Portal passes the selected company) opens that
  // profile directly. Standalone, we show the accounts list first.
  const [selectedId, setSelectedId] = useState(accountId || null);
  useEffect(() => { if (accountId) setSelectedId(accountId); }, [accountId]);

  return (
    <div style={{ fontFamily: FONT_BODY, background: "#F4F3F1", minHeight: "100vh", color: B.black }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');`}</style>
      <div style={{ maxWidth: 1100, margin: "0 auto", background: B.white, minHeight: "100vh", border: `1px solid ${N.line}` }}>
        {selectedId ? (
          <Profile supabase={supabase} session={session} accountId={selectedId} onBack={accountId ? null : () => setSelectedId(null)} />
        ) : (
          <>
            <div style={{ display: "flex", gap: 6, padding: "12px 28px", borderBottom: `1px solid ${N.line}`, background: B.white }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, padding: "8px 13px", borderRadius: 8, background: B.darkBlue, color: B.white }}>
                <LayoutDashboard size={15} /> All accounts
              </span>
            </div>
            <AccountsList supabase={supabase} onOpen={setSelectedId} />
          </>
        )}
      </div>
    </div>
  );
}
