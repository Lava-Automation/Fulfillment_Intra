/**
 * Lava Client Profile (Company 360) — translated for the hub. Pass 1.
 *
 * The teammate's app was a single hardcoded client (Steele) with mock data.
 * Here it is account-driven and wired to Supabase per the CLAUDE.md playbook.
 * The root takes an optional `accountId`: standalone now it shows an accounts
 * list -> profile; later the Portal mounts it with the selected company and it
 * becomes the company detail view (one-line mount, no rewrite).
 *
 * Pass 1 wires Overview, General, Meetings, Timeline, and People (deployed VAs)
 * to real tables; Tech stack is read-only for now (editing + catalog in a later
 * pass); Reporting is "Coming Soon" (a separate app feeds it later). No mock
 * data: sections read the schema and sit empty until rows exist.
 *
 * Reads: accounts (+ hubspot_companies), employees, vas, meetings, goals,
 *        projects, action_items, timeline_events.
 */

import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft, Building2, CalendarDays, Pin, Check, Target, Briefcase,
  Users, Wrench, ListChecks, Clock, Map as MapIcon, LayoutDashboard, FileText, Star,
  X, Plus,
} from "lucide-react";
import { logActivity } from "../../lib/activity";

// Brand floor.
const B = { red: "#E73835", darkBlue: "#24242D", teal: "#145365", white: "#FFFFFF", black: "#1B120B" };
const N = {
  line: "rgba(27,18,11,0.10)", fill: "rgba(27,18,11,0.04)",
  muted: "rgba(27,18,11,0.55)", faint: "rgba(27,18,11,0.40)",
};
const FONT_BODY = "'Poppins', system-ui, -apple-system, sans-serif";
const DISPLAY = { fontFamily: FONT_BODY, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" };

const TABS = ["Overview", "General", "Reporting", "Meetings", "People", "Tech stack", "Timeline"];
const ROLE_GROUPS = ["Sales", "Customer Success", "Fulfillment", "Team Lead"];

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
      const [aRes, eRes] = await Promise.all([
        supabase.from("accounts").select("account_id,plan,stage,cs_status,fulfillment,pm_id,hubspot_company_id"),
        supabase.from("employees").select("id,name"),
      ]);
      const emp = Object.fromEntries((eRes.data || []).map((e) => [e.id, e.name]));
      const accs = aRes.data || [];
      const compIds = [...new Set(accs.map((a) => a.hubspot_company_id).filter(Boolean))];
      let compName = {};
      if (compIds.length) {
        const { data: cs } = await supabase.from("hubspot_companies").select("id,name").in("id", compIds);
        compName = Object.fromEntries((cs || []).map((c) => [c.id, c.name]));
      }
      const list = accs.map((a) => ({
        id: a.account_id,
        name: compName[a.hubspot_company_id] || "(no agency)",
        pm: emp[a.pm_id] || "—",
        product: a.plan || "—",
        stage: a.stage || "—",
        cs: a.cs_status || "—",
      })).sort((x, y) => x.name.localeCompare(y.name));
      if (alive) { setRows(list); setLoading(false); }
    })();
    return () => { alive = false; };
  }, [supabase]);

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

function General({ d }) {
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
      <Card>
        <SectionHeading icon={Wrench}>Tech tools</SectionHeading>
        {(d.account.tech_tools && d.account.tech_tools.length) ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
            {d.account.tech_tools.map((t) => (
              <span key={t} style={{ fontSize: 13, color: B.darkBlue, background: N.fill, border: `1px solid ${N.line}`, padding: "6px 12px", borderRadius: 8 }}>{t}</span>
            ))}
          </div>
        ) : <Empty>No tech tools selected yet. Manage them in the Tech stack tab.</Empty>}
      </Card>
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

function TechStackTab({ d, onToggleTool, onAddCatalog, onBulkAdd, onRemoveCatalog }) {
  const [newTech, setNewTech] = useState("");
  const [bulk, setBulk] = useState("");
  const [showBulk, setShowBulk] = useState(false);

  const selected = new Set(d.account.tech_tools || []);
  const catalog = [...d.catalog].sort((a, b) => a.name.localeCompare(b.name));
  const inputStyle = { border: `1px solid ${N.line}`, borderRadius: 8, padding: "8px 11px", fontFamily: FONT_BODY, fontSize: 13, color: B.black, outline: "none", background: B.white };
  const btn = (bg, fg) => ({ background: bg, color: fg, border: "none", borderRadius: 8, padding: "8px 14px", fontFamily: FONT_BODY, fontSize: 12.5, fontWeight: 600, cursor: "pointer" });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Card>
        <SectionHeading icon={Wrench}>This account's tech stack</SectionHeading>
        <div style={{ fontSize: 12.5, color: N.muted, marginBottom: 12 }}>The software selected for this account. Click a catalog item below to add or remove it.</div>
        {selected.size ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
            {[...selected].map((t) => (
              <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, color: B.white, background: B.darkBlue, padding: "6px 8px 6px 12px", borderRadius: 8 }}>
                {t}
                <button onClick={() => onToggleTool(t)} title="Remove" style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.7)", padding: 0, display: "flex" }}><X size={13} /></button>
              </span>
            ))}
          </div>
        ) : <Empty>No tech selected yet. Pick from the catalog below.</Empty>}
      </Card>

      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
          <SectionHeading icon={Wrench}>Catalog</SectionHeading>
          <button onClick={() => setShowBulk((s) => !s)} style={{ marginLeft: "auto", ...btn("transparent", B.darkBlue), border: `1px solid ${N.line}` }}>{showBulk ? "Close bulk add" : "Bulk add"}</button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <input value={newTech} onChange={(e) => setNewTech(e.target.value)} placeholder="Add a tool to the catalog…" style={{ ...inputStyle, flex: 1, minWidth: 200 }}
            onKeyDown={(e) => { if (e.key === "Enter") { onAddCatalog(newTech); setNewTech(""); } }} />
          <button onClick={() => { onAddCatalog(newTech); setNewTech(""); }} style={btn(B.red, B.white)}><Plus size={13} style={{ marginRight: 5, verticalAlign: "-2px" }} />Add</button>
        </div>

        {showBulk && (
          <div style={{ marginBottom: 16, padding: 14, background: N.fill, borderRadius: 10 }}>
            <div style={{ fontSize: 12, color: N.muted, marginBottom: 8 }}>Paste a list, one tool per line (or comma separated). Existing names are skipped.</div>
            <textarea value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder={"AgencyZoom\nHawkSoft AMS\nRingCentral"} style={{ ...inputStyle, width: "100%", boxSizing: "border-box", height: 100, resize: "none", lineHeight: 1.5 }} />
            <div style={{ marginTop: 10 }}>
              <button onClick={() => { onBulkAdd(bulk); setBulk(""); setShowBulk(false); }} style={btn(B.darkBlue, B.white)}>Add list to catalog</button>
            </div>
          </div>
        )}

        {catalog.length ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
            {catalog.map((c) => {
              const on = selected.has(c.name);
              return (
                <span key={c.tech_id} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, color: on ? B.white : B.darkBlue, background: on ? B.teal : N.fill, border: `1px solid ${on ? B.teal : N.line}`, padding: "6px 8px 6px 12px", borderRadius: 8 }}>
                  <button onClick={() => onToggleTool(c.name)} title={on ? "Remove from this account" : "Add to this account"} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0, font: "inherit", display: "inline-flex", alignItems: "center", gap: 5 }}>
                    {on && <Check size={12} strokeWidth={3} />}{c.name}
                  </button>
                  <button onClick={() => onRemoveCatalog(c.tech_id, c.name)} title="Delete from catalog" style={{ background: "none", border: "none", cursor: "pointer", color: on ? "rgba(255,255,255,0.7)" : N.faint, padding: 0, display: "flex" }}><X size={13} /></button>
                </span>
              );
            })}
          </div>
        ) : <Empty>The catalog is empty. Add tools above.</Empty>}
      </Card>
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
  const me = session?.employee;
  const [d, setD] = useState(null);
  const [tab, setTab] = useState("Overview");
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    const { data: account, error: aErr } = await supabase
      .from("accounts")
      .select("account_id,plan,crm,ams,stage,service_status,fulfillment,cs_status,pm_id,since_date,cancel_date,hubspot_company_id,va_start_date,go_live_date,support_through,decision_due_date,ad_hoc_prepaid,tech_tools")
      .eq("account_id", accountId)
      .maybeSingle();
    if (aErr) { setError(aErr.message); return; }
    if (!account) { setError("Account not found."); return; }

    const [cRes, eRes, vRes, mRes, gRes, pRes, aiRes, tRes, teamRes, catRes] = await Promise.all([
      account.hubspot_company_id ? supabase.from("hubspot_companies").select("name").eq("id", account.hubspot_company_id).maybeSingle() : Promise.resolve({ data: null }),
      supabase.from("employees").select("id,name"),
      supabase.from("vas").select("employee_id,account_id,title,status"), // full roster; assigned set derived below
      supabase.from("meetings").select("meeting_id,type,title,status,meeting_date,rating,notes").eq("account_id", accountId).order("meeting_date", { ascending: false }),
      supabase.from("goals").select("goal_id,title,status,quarter,owner_id").eq("account_id", accountId),
      supabase.from("projects").select("project_id,name,status,progress_pct").eq("account_id", accountId),
      supabase.from("action_items").select("action_item_id,body,owner_id,due_date,status").eq("account_id", accountId).order("due_date", { ascending: true }),
      supabase.from("timeline_events").select("timeline_event_id,event_date,label,detail,color").eq("account_id", accountId).order("event_date", { ascending: false }),
      supabase.from("account_team").select("employee_id,role_group").eq("account_id", accountId),
      supabase.from("tech_stack").select("tech_id,name,category").order("name", { ascending: true }),
    ]);

    const emps = eRes.data || [];
    const empName = Object.fromEntries(emps.map((e) => [e.id, e.name]));
    const vaRoster = vRes.data || [];
    setD({
      account,
      name: cRes.data?.name || "(no agency)",
      product: account.plan,
      stage: account.stage,
      pm: empName[account.pm_id] || null,
      empName,
      allEmployees: emps.map((e) => ({ id: e.id, name: e.name })).sort((a, b) => a.name.localeCompare(b.name)),
      vaRoster,
      vas: vaRoster.filter((v) => v.account_id === accountId),
      team: teamRes.data || [],
      meetings: mRes.data || [],
      goals: gRes.data || [],
      projects: pRes.data || [],
      actionItems: aiRes.data || [],
      timeline: tRes.data || [],
      catalog: catRes.data || [],
    });
  }, [supabase, accountId]);

  useEffect(() => { setD(null); load(); }, [load]);

  // -- People writes: vas.account_id for VAs, account_team for the Lava team --
  async function assignVA(employeeId) {
    const { error: e } = await supabase.from("vas").update({ account_id: accountId }).eq("employee_id", employeeId);
    if (e) { alert("Could not assign VA: " + e.message); return; }
    await logActivity({ app: "clientprofile", actor: me, action: "clientprofile.va.assigned", entityType: "account", entityId: accountId, details: { va: d.empName[employeeId] } });
    load();
  }
  async function removeVA(employeeId) {
    const { error: e } = await supabase.from("vas").update({ account_id: null }).eq("employee_id", employeeId);
    if (e) { alert("Could not remove VA: " + e.message); return; }
    await logActivity({ app: "clientprofile", actor: me, action: "clientprofile.va.removed", entityType: "account", entityId: accountId, details: { va: d.empName[employeeId] } });
    load();
  }
  async function assignTeam(employeeId, roleGroup) {
    const { error: e } = await supabase.from("account_team").insert({ account_id: accountId, employee_id: employeeId, role_group: roleGroup });
    if (e) { alert("Could not add to team: " + e.message); return; }
    await logActivity({ app: "clientprofile", actor: me, action: "clientprofile.team.assigned", entityType: "account", entityId: accountId, details: { person: d.empName[employeeId], group: roleGroup } });
    load();
  }
  async function removeTeam(employeeId, roleGroup) {
    const { error: e } = await supabase.from("account_team").delete().eq("account_id", accountId).eq("employee_id", employeeId).eq("role_group", roleGroup);
    if (e) { alert("Could not remove from team: " + e.message); return; }
    await logActivity({ app: "clientprofile", actor: me, action: "clientprofile.team.removed", entityType: "account", entityId: accountId, details: { person: d.empName[employeeId], group: roleGroup } });
    load();
  }

  // -- Tech stack: per-account selection in accounts.tech_tools; shared catalog --
  async function toggleTool(name) {
    const cur = d.account.tech_tools || [];
    const has = cur.includes(name);
    const next = has ? cur.filter((t) => t !== name) : [...cur, name];
    const { error: e } = await supabase.from("accounts").update({ tech_tools: next }).eq("account_id", accountId);
    if (e) { alert("Could not update tech tools: " + e.message); return; }
    await logActivity({ app: "clientprofile", actor: me, action: has ? "clientprofile.techstack.removed" : "clientprofile.techstack.added", entityType: "account", entityId: accountId, details: { tool: name } });
    load();
  }
  async function addCatalog(name) {
    const n = (name || "").trim();
    if (!n) return;
    if (d.catalog.some((c) => c.name.toLowerCase() === n.toLowerCase())) { alert(`"${n}" is already in the catalog.`); return; }
    const { error: e } = await supabase.from("tech_stack").insert({ name: n });
    if (e) { alert("Could not add to catalog: " + e.message); return; }
    await logActivity({ app: "clientprofile", actor: me, action: "clientprofile.tech.catalog_added", entityType: "tech_stack", entityId: n, details: { name: n } });
    load();
  }
  async function bulkAddCatalog(text) {
    const existing = new Set(d.catalog.map((c) => c.name.toLowerCase()));
    const names = [...new Set((text || "").split(/[\n,]/).map((s) => s.trim()).filter(Boolean))]
      .filter((n) => !existing.has(n.toLowerCase()));
    if (!names.length) { alert("Nothing new to add."); return; }
    const { error: e } = await supabase.from("tech_stack").insert(names.map((name) => ({ name })));
    if (e) { alert("Could not bulk add: " + e.message); return; }
    await logActivity({ app: "clientprofile", actor: me, action: "clientprofile.tech.catalog_bulk_added", entityType: "tech_stack", entityId: accountId, details: { count: names.length } });
    load();
  }
  async function removeCatalog(techId, name) {
    const { error: e } = await supabase.from("tech_stack").delete().eq("tech_id", techId);
    if (e) { alert("Could not remove from catalog: " + e.message); return; }
    await logActivity({ app: "clientprofile", actor: me, action: "clientprofile.tech.catalog_removed", entityType: "tech_stack", entityId: name, details: { name } });
    load();
  }

  if (error) return <div style={{ padding: 28, color: B.red, fontFamily: FONT_BODY }}>Error: {error}</div>;
  if (!d) return <div style={{ padding: 28, color: N.muted, fontFamily: FONT_BODY }}>Loading profile…</div>;

  return (
    <>
      <Header d={d} onBack={onBack} />
      <TabNav active={tab} onChange={setTab} />
      <div style={{ padding: 28 }}>
        {tab === "Overview" && <Overview d={d} />}
        {tab === "General" && <General d={d} />}
        {tab === "Reporting" && <ComingSoon title="Reporting" body="Agency reporting (leads, pipelines, premium, producers, reviews) is a separate app that will tie in here later. It pulls from the agency CRM, not the spine." />}
        {tab === "Meetings" && <MeetingsTab d={d} />}
        {tab === "People" && <PeopleTab d={d} onAssignVA={assignVA} onRemoveVA={removeVA} onAssignTeam={assignTeam} onRemoveTeam={removeTeam} />}
        {tab === "Tech stack" && <TechStackTab d={d} onToggleTool={toggleTool} onAddCatalog={addCatalog} onBulkAdd={bulkAddCatalog} onRemoveCatalog={removeCatalog} />}
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
