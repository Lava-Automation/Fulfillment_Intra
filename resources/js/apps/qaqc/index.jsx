/**
 * QAQC Build Review Tracker — Lava Automation  (translated for the hub)
 * App namespace: qa
 *
 * Replaces the QAQC.xlsx spreadsheet. Each row is an agency build a VA completed
 * and QA reviews against a checklist. This is the hub version: the original
 * static BUILDS array, hardcoded CURRENT_USER, and console activity-log stub are
 * swapped for Supabase reads/writes and the shell session, per the CLAUDE.md
 * playbook. The screen the author designed is intact; only the data source
 * underneath changed.
 *
 * Reads:   public.builds joined to public.accounts -> spine.hubspot_companies
 *          (agency name) and public.employees (VA / QA / PM names).
 * Writes:  builds.* updates + an activity_log insert on every change
 *          (qa.build.logged | status_changed | field_changed | updated).
 *
 * Schema note: builds carries single-uuid FKs (va_id, qa_reviewer_id, pm_id), so
 * names render from spine.employees and edits write the UUID back. The sheet's
 * combined "Kristel, Siah" reviewer collapses to one reviewer to match the
 * single qa_reviewer_id column (bend-to-schema). client_name / im_link /
 * on_time_override were added to builds to preserve the sheet's fields.
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import { logActivity } from "../../lib/activity";

// --- COLOR CONSTANTS (B) ----------------------------------------------------
const B = {
  red:   "#E73835",
  dark:  "#24242D",
  teal:  "#145365",
  white: "#FFFFFF",
  black: "#1B120B",
};

const FONT_DISPLAY = "'Monument Extended', 'Archivo Black', 'Arial Black', sans-serif";
const FONT_BODY    = "'Poppins', sans-serif";
const FONT_FACE_CSS = `
@font-face {
  font-family: 'Monument Extended';
  src: url('/fonts/MonumentExtended-Ultrabold.woff2') format('woff2');
  font-weight: 800;
  font-display: swap;
}`;

// --- WORKFLOW VOCAB (from the sheet, not invented) --------------------------
const STATUSES = ["Done", "Working On It", "Waiting on Client", "Pending"];
const CRMS     = ["Agency Zoom", "Insured Mine"];

// --- ACTIVITY LOG -----------------------------------------------------------
// Append-only audit, namespaced qa.build.<verb>. Real insert via the shared
// helper; actor is the signed-in employee from the shell session.
function logBuild(me, action, entityId, details) {
  return logActivity({ app: "qa", actor: me, action, entityType: "build", entityId, details });
}

// --- HELPERS ----------------------------------------------------------------
const initials = (name) => (name || "?").split(" ").map(w => w[0]).filter(Boolean).join("").slice(0, 2).toUpperCase();
const AVATAR_COLORS = [B.red, B.teal, "#5B5B7A", "#2E7D32", "#7B3F00", "#1565C0", "#6A1B9A", "#BF360C"];
const avatarColor = (name) => AVATAR_COLORS[(name || "?").toUpperCase().charCodeAt(0) % AVATAR_COLORS.length];
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

// deadline = date_start + 7 days (the sheet's "1 week after Date Start")
function deadlineOf(b) {
  if (!b.date_start) return null;
  const d = new Date(b.date_start);
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}
// on-time: manual override wins; otherwise derived once finished
function onTimeOf(b) {
  if (b.on_time_override) return b.on_time_override;   // "On Time" | "Overdue" set by hand
  const dl = deadlineOf(b);
  if (!b.date_finish || !dl) return null;
  return b.date_finish <= dl ? "On Time" : "Overdue";
}
const issueCount = (b) => b.issues ? b.issues.split("\n").filter(l => l.trim()).length : 0;

const STATUS_STYLES = {
  "Done":              { bg: "#F0FDF4", color: "#166534" },
  "Working On It":     { bg: "#EFF6FF", color: "#1E40AF" },
  "Waiting on Client": { bg: "#FEFCE8", color: "#854D0E" },
  "Pending":           { bg: "#FFF1F2", color: "#9F1239" },
};

// --- MONO HELPER COMPONENTS -------------------------------------------------
function Avatar({ name, size = 30 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: avatarColor(name),
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.35, fontWeight: 700, color: B.white, flexShrink: 0, fontFamily: FONT_BODY,
    }}>{initials(name)}</div>
  );
}
function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES["Pending"];
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 10,
      background: s.bg, color: s.color, fontSize: 10, fontWeight: 700, fontFamily: FONT_BODY,
      whiteSpace: "nowrap",
    }}>{status}</span>
  );
}
function OnTimePill({ value }) {
  if (!value) return <span style={{ fontSize: 11, color: "#C0C0CC" }}>—</span>;
  const ok = value === "On Time";
  return (
    <span style={{
      display: "inline-block", padding: "2px 9px", borderRadius: 8, fontSize: 10, fontWeight: 700,
      fontFamily: FONT_BODY, background: ok ? "#F0FDF4" : "#FEF2F2", color: ok ? "#166534" : "#9F1239",
    }}>{value}</span>
  );
}
function CrmChip({ crm }) {
  const teal = crm === "Insured Mine";
  return (
    <span style={{
      display: "inline-block", padding: "2px 9px", borderRadius: 6, fontSize: 10, fontWeight: 600,
      fontFamily: FONT_BODY, background: teal ? "#E6F2F5" : "#EBEBF5", color: teal ? B.teal : B.dark,
    }}>{crm || "—"}</span>
  );
}
function Btn({ label, onClick, variant = "primary", small }) {
  const variants = {
    primary: { background: B.red,  color: B.white, border: "none" },
    teal:    { background: B.teal, color: B.white, border: "none" },
    ghost:   { background: "transparent", color: B.dark, border: "1.5px solid #D0D0DC" },
    danger:  { background: "#FEF2F2", color: B.red, border: "1.5px solid #FECACA" },
  };
  return (
    <button onClick={onClick}
      onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
      onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
      style={{
        padding: small ? "5px 12px" : "8px 18px", borderRadius: 7, fontFamily: FONT_BODY,
        fontSize: small ? 11 : 12, fontWeight: 600, cursor: "pointer", transition: "opacity 0.15s",
        ...variants[variant],
      }}>{label}</button>
  );
}
function LavaMark({ size = 28, color = B.red }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Lava">
      <circle cx="50" cy="8" r="7" fill={color} />
      <rect x="47" y="13" width="6" height="13" rx="3" fill={color} />
      <rect x="22" y="24" width="56" height="56" rx="16" fill={color} />
      <rect x="14" y="40" width="12" height="20" rx="4" fill={color} />
      <rect x="18" y="44" width="8" height="12" rx="3" fill={B.white} />
      <path d="M30 70 H46 V84 H38 A8 8 0 0 1 30 76 Z" fill={B.white} />
      <circle cx="42" cy="52" r="5.5" fill={B.white} />
      <circle cx="62" cy="52" r="5.5" fill={B.white} />
    </svg>
  );
}

function HeaderCell({ label, tip, align = "left" }) {
  const [show, setShow] = useState(false);
  return (
    <th style={{ padding: "10px 14px", borderBottom: "1px solid #E0E0E8", textAlign: align }}>
      <span
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        style={{
          position: "relative", display: "inline-flex", alignItems: "center", gap: 4,
          fontSize: 10, fontWeight: 800, color: B.dark, textTransform: "uppercase",
          letterSpacing: "0.6px", fontFamily: FONT_BODY, whiteSpace: "nowrap",
          cursor: tip ? "help" : "default",
        }}
      >
        {label}
        {tip ? <span style={{ fontSize: 9, color: "#C0C0CC" }}>ⓘ</span> : null}
        {tip && show && (
          <span style={{
            position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 50,
            background: B.dark, color: B.white, padding: "7px 10px", borderRadius: 7,
            fontSize: 11, fontWeight: 500, textTransform: "none", letterSpacing: "normal",
            lineHeight: 1.4, width: "max-content", maxWidth: 220,
            boxShadow: "0 8px 24px rgba(0,0,0,0.22)", pointerEvents: "none",
          }}>
            <span style={{ position: "absolute", top: -5, left: 14, width: 10, height: 10, background: B.dark, transform: "rotate(45deg)" }} />
            {tip}
          </span>
        )}
      </span>
    </th>
  );
}

function FilterBtn({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "5px 14px", borderRadius: 20, fontFamily: FONT_BODY, fontSize: 11, fontWeight: 600,
      cursor: "pointer", background: active ? B.dark : "transparent",
      color: active ? B.white : "#9090A8", border: "1.5px solid " + (active ? B.dark : "#D0D0DC"),
      transition: "all 0.15s",
    }}>{label}</button>
  );
}

// Inline editable dropdown for table cells (CRM, PM, QA, Status, On Time).
function InlineSelect({ value, options, onChange, render, width }) {
  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{ position: "relative", display: "inline-flex", alignItems: "center", minWidth: width || "auto" }}
    >
      {render ? render(value) : (
        <span style={{ fontSize: 12, color: B.dark, fontFamily: FONT_BODY }}>{value || "—"}</span>
      )}
      <span style={{ fontSize: 9, color: "#B0B0C0", marginLeft: 4 }}>▾</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          opacity: 0, cursor: "pointer", border: "none", appearance: "none",
        }}
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

// --- DETAIL / REVIEW DRAWER -------------------------------------------------
// Agency is read-only here: it is derived from the linked account/company, not a
// builds column. VA / PM / QA are real-employee dropdowns so a save writes UUIDs.
function BuildDrawer({ build, onClose, onSave, vaOptions, pmOptions, qaOptions }) {
  const [f, setF] = useState({ ...build });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const dl = deadlineOf(f);
  const ot = onTimeOf(f);

  const vaNames = useMemo(() => ["Unassigned", ...vaOptions.map(o => o.name)], [vaOptions]);
  const pmNames = useMemo(() => pmOptions.map(o => o.name), [pmOptions]);
  const qaNames = useMemo(() => qaOptions.map(o => o.name), [qaOptions]);

  const labelStyle = { fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px", color: "#9090A8", marginBottom: 4, display: "block", fontFamily: FONT_BODY };
  const valueStyle = { fontSize: 13, color: B.dark, fontFamily: FONT_BODY };
  const inputStyle = { width: "100%", border: "1.5px solid #D0D0DC", borderRadius: 8, padding: "8px 10px", fontFamily: FONT_BODY, fontSize: 12, color: B.black, outline: "none", background: B.white, boxSizing: "border-box" };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", justifyContent: "flex-end", zIndex: 200 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 480, height: "100%", background: B.white, boxShadow: "-12px 0 40px rgba(0,0,0,0.18)", overflowY: "auto", display: "flex", flexDirection: "column" }}>

        <div style={{ background: B.dark, padding: "18px 22px", borderBottom: "2px solid " + B.red, flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 17, color: B.white, letterSpacing: "0.5px" }}>{f.agency || "Untitled build"}</div>
              <div style={{ fontSize: 11, color: "#9090A8", marginTop: 3 }}>{f.client_name || "No client name"}</div>
            </div>
            <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", fontSize: 14, color: B.white }}>✕</button>
          </div>
        </div>

        <div style={{ padding: "20px 22px", flex: 1 }}>

          {/* Agency (read-only, from account) + Client */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
            <div>
              <span style={labelStyle}>Agency</span>
              <div style={{ ...inputStyle, background: "#F7F7FC", color: "#666", display: "flex", alignItems: "center" }}>{f.agency || "—"}</div>
            </div>
            <div><span style={labelStyle}>Client name</span><input style={inputStyle} value={f.client_name} onChange={e => set("client_name", e.target.value)} placeholder="Optional" /></div>
          </div>

          {/* VA + QA */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
            <div>
              <span style={labelStyle}>VA (built by) *</span>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <Avatar name={f.va_name} size={28} />
                <select style={inputStyle} value={f.va_name} onChange={e => set("va_name", e.target.value)}>
                  {vaNames.map(n => <option key={n}>{n}</option>)}
                </select>
              </div>
              {f.va_flag && <div style={{ fontSize: 9, color: B.red, fontWeight: 600, marginTop: 3 }}>⚑ no VA linked — assign one</div>}
            </div>
            <div><span style={labelStyle}>QA Reviewer</span>
              <select style={inputStyle} value={f.qa_reviewer} onChange={e => set("qa_reviewer", e.target.value)}>
                {qaNames.map(q => <option key={q}>{q}</option>)}
              </select>
            </div>
          </div>

          {/* CRM + PM */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
            <div><span style={labelStyle}>CRM</span>
              <select style={inputStyle} value={f.crm} onChange={e => set("crm", e.target.value)}>{CRMS.map(c => <option key={c}>{c}</option>)}</select>
            </div>
            <div><span style={labelStyle}>Project Mgr</span>
              <select style={inputStyle} value={f.project_mgr} onChange={e => set("project_mgr", e.target.value)}>{pmNames.map(p => <option key={p}>{p}</option>)}</select>
            </div>
          </div>

          {/* Dates */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
            <div><span style={labelStyle}>Date Start</span><input type="date" style={inputStyle} value={f.date_start || ""} onChange={e => set("date_start", e.target.value)} /></div>
            <div><span style={labelStyle}>Date Finish</span><input type="date" style={inputStyle} value={f.date_finish || ""} onChange={e => set("date_finish", e.target.value)} /></div>
          </div>

          {/* Derived line: deadline + on-time */}
          <div style={{ display: "flex", gap: 24, marginBottom: 16, padding: "10px 12px", background: "#F7F7FC", borderRadius: 8 }}>
            <div><span style={labelStyle}>Deadline (+1 wk)</span><span style={valueStyle}>{fmtDate(dl)}</span></div>
            <div>
              <span style={labelStyle}>On Time</span>
              <select style={{ ...inputStyle, width: "auto", padding: "4px 8px" }} value={f.on_time_override || "Auto"} onChange={e => set("on_time_override", e.target.value === "Auto" ? "" : e.target.value)}>
                <option>Auto</option><option>On Time</option><option>Overdue</option>
              </select>
              <span style={{ marginLeft: 8 }}><OnTimePill value={ot} /></span>
            </div>
          </div>

          {/* Status control */}
          <div style={{ marginBottom: 18 }}>
            <span style={labelStyle}>Status</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {STATUSES.map(s => (
                <button key={s} onClick={() => set("status", s)} style={{
                  padding: "6px 12px", borderRadius: 8, fontFamily: FONT_BODY, fontSize: 11, fontWeight: 600, cursor: "pointer",
                  border: "1.5px solid " + (f.status === s ? B.dark : "#D0D0DC"),
                  background: f.status === s ? (STATUS_STYLES[s]?.bg || B.white) : B.white,
                  color: f.status === s ? (STATUS_STYLES[s]?.color || B.dark) : "#9090A8",
                }}>{s}</button>
              ))}
            </div>
          </div>

          {/* Issues / Lacking */}
          <div style={{ marginBottom: 18 }}>
            <span style={labelStyle}>Issues / Lacking</span>
            <textarea value={f.issues} onChange={e => set("issues", e.target.value)} placeholder="List the issues found during QA review, one per line..."
              style={{ ...inputStyle, resize: "none", height: 110, lineHeight: 1.6 }} />
          </div>

          {/* Editable links */}
          <div style={{ marginBottom: 8 }}>
            <span style={labelStyle}>Links</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input style={inputStyle} value={f.checklist_url} onChange={e => set("checklist_url", e.target.value)} placeholder="📋 QAQC Checklist form URL" />
              <input style={inputStyle} value={f.pending_url} onChange={e => set("pending_url", e.target.value)} placeholder="📝 Pending Tasks form URL" />
              <input style={inputStyle} value={f.im_link} onChange={e => set("im_link", e.target.value)} placeholder="🔗 Insured Mine build URL" />
            </div>
          </div>
        </div>

        <div style={{ padding: "14px 22px", borderTop: "1px solid #E0E0E8", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, background: B.white }}>
          <span style={{ fontSize: 10, color: "#AAA", fontFamily: FONT_BODY }}>activity_log → qa.build.*</span>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn label="Cancel" variant="ghost" small onClick={onClose} />
            <Btn label="Save Build" variant="primary" small onClick={() => {
              if (f.va_name === "Unassigned" || !f.va_name) { alert("Assign a VA before saving."); return; }
              onSave(build.id, f);
              onClose();
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// --- NEW BUILD MODAL --------------------------------------------------------
// Account / VA / PM / QA are picked from real records so the insert carries
// real foreign keys.
function NewBuildModal({ onClose, onSubmit, accounts, vaOptions, pmOptions, qaOptions }) {
  const [f, setF] = useState({
    account: accounts[0]?.name || "",
    client_name: "",
    crm: "Agency Zoom",
    project_mgr: pmOptions[0]?.name || "",
    va_name: vaOptions[0]?.name || "",
    qa_reviewer: qaOptions[0]?.name || "",
    status: "Working On It",
    date_start: new Date().toISOString().slice(0, 10),
  });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const inputStyle = { width: "100%", border: "1.5px solid #D0D0DC", borderRadius: 8, padding: "8px 12px", fontFamily: FONT_BODY, fontSize: 12, color: B.black, outline: "none", background: B.white };
  const labelStyle = { fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px", color: "#9090A8", display: "block", marginBottom: 5, fontFamily: FONT_BODY };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: B.white, borderRadius: 14, width: 560, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}>
        <div style={{ padding: "18px 24px 14px", borderBottom: "1px solid #E0E0E8", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 16, color: B.dark, letterSpacing: "0.5px" }}>ADD BUILD TO QAQC</span>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: "50%", background: "#F0F0F8", border: "none", cursor: "pointer", fontSize: 14, color: "#888" }}>✕</button>
        </div>
        <div style={{ padding: "20px 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div><label style={labelStyle}>Account *</label><select style={inputStyle} value={f.account} onChange={e => set("account", e.target.value)}>{accounts.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}</select></div>
            <div><label style={labelStyle}>Client name</label><input style={inputStyle} value={f.client_name} onChange={e => set("client_name", e.target.value)} placeholder="Optional" /></div>
            <div><label style={labelStyle}>CRM *</label><select style={inputStyle} value={f.crm} onChange={e => set("crm", e.target.value)}>{CRMS.map(c => <option key={c}>{c}</option>)}</select></div>
            <div><label style={labelStyle}>Project Mgr *</label><select style={inputStyle} value={f.project_mgr} onChange={e => set("project_mgr", e.target.value)}>{pmOptions.map(c => <option key={c.id}>{c.name}</option>)}</select></div>
            <div><label style={labelStyle}>VA (built by) *</label><select style={inputStyle} value={f.va_name} onChange={e => set("va_name", e.target.value)}>{vaOptions.map(c => <option key={c.id}>{c.name}</option>)}</select></div>
            <div><label style={labelStyle}>QA Reviewer *</label><select style={inputStyle} value={f.qa_reviewer} onChange={e => set("qa_reviewer", e.target.value)}>{qaOptions.map(c => <option key={c.id}>{c.name}</option>)}</select></div>
            <div><label style={labelStyle}>Status</label><select style={inputStyle} value={f.status} onChange={e => set("status", e.target.value)}>{STATUSES.map(c => <option key={c}>{c}</option>)}</select></div>
            <div><label style={labelStyle}>Date Start</label><input type="date" style={inputStyle} value={f.date_start} onChange={e => set("date_start", e.target.value)} /></div>
          </div>
        </div>
        <div style={{ padding: "14px 24px", borderTop: "1px solid #E0E0E8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 10, color: "#AAA", fontFamily: FONT_BODY }}>activity_log → qa.build.logged · deadline auto-set +1 week</span>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn label="Cancel" variant="ghost" onClick={onClose} />
            <Btn label="Add Build" variant="primary" onClick={() => {
              if (!f.account || !f.va_name) { alert("Account and VA are required."); return; }
              onSubmit(f); onClose();
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// --- MAIN APP ---------------------------------------------------------------
export default function QAQCTracker({ session, supabase }) {
  const me = session?.employee;

  const [builds, setBuilds]       = useState([]);
  const [accounts, setAccounts]   = useState([]);  // [{id,name}]
  const [pmOptions, setPmOptions] = useState([]);  // [{id,name}]
  const [qaOptions, setQaOptions] = useState([]);  // [{id,name}]
  const [vaOptions, setVaOptions] = useState([]);  // [{id,name}]
  const [loading, setLoading]     = useState(true);

  const [statusFilter, setStatus] = useState("All");
  const [crmFilter, setCrm]       = useState("All");
  const [pmFilter, setPm]         = useState("All");
  const [qaFilter, setQa]         = useState("All");
  const [search, setSearch]       = useState("");
  const [selected, setSelected]   = useState(null);
  const [showNew, setShowNew]     = useState(false);

  // name -> uuid maps for writing FK columns back from the dropdown labels
  const pmIdByName  = useMemo(() => Object.fromEntries(pmOptions.map(o => [o.name, o.id])), [pmOptions]);
  const qaIdByName  = useMemo(() => Object.fromEntries(qaOptions.map(o => [o.name, o.id])), [qaOptions]);
  const vaIdByName  = useMemo(() => Object.fromEntries(vaOptions.map(o => [o.name, o.id])), [vaOptions]);
  const acctIdByName = useMemo(() => Object.fromEntries(accounts.map(o => [o.name, o.id])), [accounts]);

  const load = useCallback(async () => {
    setLoading(true);
    const [bRes, aRes, eRes, vRes] = await Promise.all([
      supabase.from("builds").select("build_id,account_id,va_id,qa_reviewer_id,pm_id,crm,status,issues,date_start,date_finish,checklist_url,pending_url,im_link,client_name,on_time_override").order("date_start", { ascending: false }),
      supabase.from("accounts").select("account_id,hubspot_company_id,pm_id"),
      supabase.from("employees").select("id,name"),
      supabase.from("vas").select("employee_id"),
    ]);

    const emp = new Map((eRes.data || []).map(e => [e.id, e.name]));
    const accs = aRes.data || [];
    const compIds = [...new Set(accs.map(a => a.hubspot_company_id).filter(Boolean))];
    let compName = {};
    if (compIds.length) {
      const { data: cs } = await supabase.from("hubspot_companies").select("id,name").in("id", compIds);
      compName = Object.fromEntries((cs || []).map(c => [c.id, c.name]));
    }
    const acctName = new Map(accs.map(a => [a.account_id, compName[a.hubspot_company_id] || "(no agency)"]));

    const rows = (bRes.data || []).map(b => ({
      id: b.build_id,
      account_id: b.account_id,
      agency: acctName.get(b.account_id) || "(no agency)",
      client_name: b.client_name || "",
      crm: b.crm || "",
      pm_id: b.pm_id, project_mgr: emp.get(b.pm_id) || "",
      va_id: b.va_id, va_name: emp.get(b.va_id) || "Unassigned", va_flag: !b.va_id,
      qa_id: b.qa_reviewer_id, qa_reviewer: emp.get(b.qa_reviewer_id) || "",
      issues: b.issues || "", status: b.status || "Pending",
      date_start: b.date_start || "", date_finish: b.date_finish || "",
      checklist_url: b.checklist_url || "", pending_url: b.pending_url || "", im_link: b.im_link || "",
      on_time_override: b.on_time_override || "",
    }));

    // option lists, derived from real records
    const sortByName = (x, y) => x.name.localeCompare(y.name);
    const toOpt = (id) => ({ id, name: emp.get(id) || "" });

    const pmIds = [...new Set(accs.map(a => a.pm_id).filter(Boolean).concat(rows.map(r => r.pm_id).filter(Boolean)))];
    const qaIds = [...new Set(rows.map(r => r.qa_id).filter(Boolean).concat(me?.id ? [me.id] : []))];

    setPmOptions(pmIds.map(toOpt).filter(o => o.name).sort(sortByName));
    setQaOptions(qaIds.map(toOpt).filter(o => o.name).sort(sortByName));
    setVaOptions((vRes.data || []).map(v => toOpt(v.employee_id)).filter(o => o.name).sort(sortByName));
    setAccounts(accs.map(a => ({ id: a.account_id, name: acctName.get(a.account_id) })).filter(o => o.name).sort(sortByName));
    setBuilds(rows);
    setLoading(false);
  }, [supabase, me]);

  useEffect(() => { load(); }, [load]);

  const counts = {
    total:   builds.length,
    working: builds.filter(b => b.status === "Working On It").length,
    waiting: builds.filter(b => b.status === "Waiting on Client").length,
    done:    builds.filter(b => b.status === "Done").length,
    issues:  builds.filter(b => issueCount(b) > 0 && b.status !== "Done").length,
  };

  const visible = useMemo(() => builds.filter(b => {
    if (statusFilter !== "All" && b.status !== statusFilter) return false;
    if (crmFilter !== "All" && b.crm !== crmFilter) return false;
    if (pmFilter !== "All" && b.project_mgr !== pmFilter) return false;
    if (qaFilter !== "All" && !(b.qa_reviewer || "").includes(qaFilter)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!b.agency.toLowerCase().includes(q) && !b.va_name.toLowerCase().includes(q) && !(b.client_name || "").toLowerCase().includes(q)) return false;
    }
    return true;
  }), [builds, statusFilter, crmFilter, pmFilter, qaFilter, search]);

  // --- writes (Supabase update + activity_log, then refetch) ----------------
  async function handleStatus(id, status) {
    const b = builds.find(x => x.id === id);
    const patch = { status };
    if (status === "Done" && !b?.date_finish) patch.date_finish = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("builds").update(patch).eq("build_id", id);
    if (error) { alert("Could not update status: " + error.message); return; }
    await logBuild(me, "qa.build.status_changed", id, { to: status });
    load();
  }

  // Inline field edits from the table row (CRM, PM, QA, On Time).
  async function handleField(id, field, value) {
    const colMap = { crm: "crm", project_mgr: "pm_id", qa_reviewer: "qa_reviewer_id", on_time_override: "on_time_override" };
    const col = colMap[field];
    if (!col) return;
    let dbval = value;
    if (field === "project_mgr") dbval = pmIdByName[value] ?? null;
    if (field === "qa_reviewer") dbval = qaIdByName[value] ?? null;
    const { error } = await supabase.from("builds").update({ [col]: dbval }).eq("build_id", id);
    if (error) { alert("Could not update: " + error.message); return; }
    await logBuild(me, "qa.build.field_changed", id, { field, to: value });
    load();
  }

  // Full save from the drawer — every editable field at once.
  async function handleSaveBuild(id, form) {
    const patch = {
      client_name: form.client_name || null,
      crm: form.crm || null,
      pm_id: pmIdByName[form.project_mgr] ?? null,
      qa_reviewer_id: qaIdByName[form.qa_reviewer] ?? null,
      va_id: vaIdByName[form.va_name] ?? null,
      issues: form.issues || null,
      status: form.status,
      date_start: form.date_start || null,
      date_finish: form.date_finish || null,
      checklist_url: form.checklist_url || null,
      pending_url: form.pending_url || null,
      im_link: form.im_link || null,
      on_time_override: form.on_time_override || null,
    };
    if (patch.status === "Done" && !patch.date_finish) patch.date_finish = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("builds").update(patch).eq("build_id", id);
    if (error) { alert("Could not save build: " + error.message); return; }
    await logBuild(me, "qa.build.updated", id, { agency: form.agency });
    load();
  }

  async function handleNew(f) {
    const ins = {
      account_id: acctIdByName[f.account] || null,
      va_id: vaIdByName[f.va_name] ?? null,
      qa_reviewer_id: qaIdByName[f.qa_reviewer] ?? null,
      pm_id: pmIdByName[f.project_mgr] ?? null,
      crm: f.crm,
      status: f.status,
      client_name: f.client_name || null,
      issues: "",
      date_start: f.date_start || null,
    };
    const { data, error } = await supabase.from("builds").insert(ins).select("build_id").maybeSingle();
    if (error) { alert("Could not add build: " + error.message); return; }
    await logBuild(me, "qa.build.logged", data?.build_id, { agency: f.account, va: f.va_name, pm: f.project_mgr });
    load();
  }

  const selectStyle = { padding: "6px 10px", border: "1.5px solid #D0D0DC", borderRadius: 8, fontFamily: FONT_BODY, fontSize: 11, color: B.dark, background: B.white, outline: "none", cursor: "pointer" };
  const th = (label, tip, align = "left") => <HeaderCell label={label} tip={tip} align={align} />;

  return (
    <div style={{ fontFamily: FONT_BODY, background: "#F1F2F5", color: B.black, height: "100vh", display: "flex", flexDirection: "column" }}>
      <style>{FONT_FACE_CSS}</style>

      {/* HEADER */}
      <div style={{ background: B.dark, height: 50, display: "flex", alignItems: "center", padding: "0 20px", gap: 14, borderBottom: "2px solid " + B.red, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}><LavaMark size={26} color={B.white} /></div>
          <span style={{ fontFamily: FONT_DISPLAY, color: B.white, fontSize: 14, letterSpacing: "1px" }}>LAVA</span>
        </div>
        <div style={{ width: 1, height: 20, background: "#3A3A48" }} />
        <span style={{ color: "#A0A0B8", fontSize: 12, fontWeight: 500 }}>QAQC Build Tracker</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "4px 12px 4px 5px", display: "flex", alignItems: "center", gap: 8 }}>
            <Avatar name={me?.name} size={24} />
            <span style={{ color: B.white, fontSize: 12, fontWeight: 500 }}>{me?.name || "…"}</span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* SIDEBAR */}
        <div style={{ width: 220, background: B.dark, flexShrink: 0, display: "flex", flexDirection: "column", overflowY: "auto", padding: "16px 12px" }}>
          <div style={{ fontFamily: FONT_DISPLAY, color: B.white, fontSize: 13, letterSpacing: "1.5px", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>BUILD STATUS</div>
          {[
            { val: counts.total,   label: "Total Builds",     sub: "All tracked",      subColor: "#FB923C", filter: "All" },
            { val: counts.working, label: "Working On It",    sub: "In QA review",     subColor: "#60A5FA", filter: "Working On It" },
            { val: counts.waiting, label: "Waiting on Client", sub: "Blocked",         subColor: "#FACC15", filter: "Waiting on Client" },
            { val: counts.done,    label: "Done",             sub: "Passed QA",        subColor: "#4ade80", filter: "Done" },
          ].map(({ val, label, sub, subColor, filter }) => (
            <div key={label} onClick={() => setStatus(filter)} style={{
              background: statusFilter === filter ? "rgba(231,56,53,0.14)" : "rgba(255,255,255,0.05)",
              border: "1px solid " + (statusFilter === filter ? "rgba(231,56,53,0.3)" : "rgba(255,255,255,0.07)"),
              borderRadius: 8, padding: "10px 12px", marginBottom: 6, cursor: "pointer",
            }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: B.white, lineHeight: 1, fontFamily: FONT_BODY }}>{val}</div>
              <div style={{ fontSize: 10, color: "#666", marginTop: 3 }}>{label}</div>
              <div style={{ fontSize: 10, color: subColor, marginTop: 2, fontWeight: 600 }}>{sub}</div>
            </div>
          ))}

          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "#555", marginBottom: 8 }}>BY CRM</div>
            {["All", ...CRMS].map(c => (
              <div key={c} onClick={() => setCrm(c)} style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", borderRadius: 7, cursor: "pointer", marginBottom: 2, background: crmFilter === c ? "rgba(255,255,255,0.08)" : "transparent" }}>
                <span style={{ fontSize: 11, color: "#CCC" }}>{c}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: B.white }}>{c === "All" ? builds.length : builds.filter(b => b.crm === c).length}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16, background: "rgba(231,56,53,0.1)", border: "1px solid rgba(231,56,53,0.25)", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: B.red, marginBottom: 5 }}>⬆ Feeds</div>
            <div style={{ fontSize: 11, color: "#AAA", lineHeight: 1.6 }}>Andy's VA Performance Tracker<div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>Per-VA rollup · wire later</div></div>
          </div>

          <div style={{ marginTop: "auto", paddingTop: 16, fontSize: 9, color: "#444", lineHeight: 1.6 }}>
            Replaces QAQC.xlsx<br />Same workflow, on the spine
          </div>
        </div>

        {/* MAIN */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>

          {/* TOOLBAR */}
          <div style={{ background: B.white, padding: "13px 24px", borderBottom: "1px solid #E0E0E8", display: "flex", alignItems: "center", gap: 10, flexShrink: 0, flexWrap: "wrap" }}>
            <span style={{ fontFamily: FONT_DISPLAY, fontSize: 15, color: B.dark, letterSpacing: "0.5px" }}>BUILD QUEUE</span>
            <span style={{ background: B.red, color: B.white, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>{visible.length}</span>

            <div style={{ display: "flex", gap: 5, marginLeft: 4 }}>
              {["All", ...STATUSES].map(s => <FilterBtn key={s} label={s} active={statusFilter === s} onClick={() => setStatus(s)} />)}
            </div>

            <select value={pmFilter} onChange={e => setPm(e.target.value)} style={selectStyle}>
              <option value="All">All PMs</option>{pmOptions.map(p => <option key={p.id}>{p.name}</option>)}
            </select>
            <select value={qaFilter} onChange={e => setQa(e.target.value)} style={selectStyle}>
              <option value="All">All QA</option>{qaOptions.map(q => <option key={q.id}>{q.name}</option>)}
            </select>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search agency / VA / client..." style={{ ...selectStyle, width: 200, cursor: "text" }} />

            <div style={{ marginLeft: "auto" }}><Btn label="+ Add Build" variant="primary" onClick={() => setShowNew(true)} /></div>
          </div>

          {/* TABLE */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: B.white, position: "sticky", top: 0, zIndex: 2, boxShadow: "0 1px 0 #E0E0E8" }}>
                  {th("Agency / Client", "The agency build under review, and the client contact name if there is one.")}
                  {th("CRM", "Which CRM the build lives in — Agency Zoom or Insured Mine.")}
                  {th("PM", "Project Manager overseeing the build.")}
                  {th("VA", "The virtual assistant who built it. Flagged if no VA is linked.")}
                  {th("QA", "Who reviewed the build.")}
                  {th("Issues", "Count of issues or lacking items found during QA. Click the row to read them.")}
                  {th("Status", "Done, Working On It, Waiting on Client, or Pending. Click to change inline.")}
                  {th("Start", "Date the build started. Deadline is one week after this.")}
                  {th("Finish", "Date the build was finished. Auto-set when status flips to Done.")}
                  {th("On Time", "Finished on or before the one-week deadline. Auto-derived; override per row.")}
                </tr>
              </thead>
              <tbody>
                {visible.map(b => {
                  const ic = issueCount(b);
                  return (
                    <tr key={b.id} onClick={() => setSelected(b)}
                      onMouseEnter={e => (e.currentTarget.style.background = "#F7F7FC")}
                      onMouseLeave={e => (e.currentTarget.style.background = B.white)}
                      style={{ background: B.white, borderBottom: "1px solid #E0E0E8", cursor: "pointer", transition: "background 0.12s" }}>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: B.dark }}>{b.agency}</div>
                        {b.client_name ? <div style={{ fontSize: 10, color: "#9090A8" }}>{b.client_name}</div> : null}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <InlineSelect value={b.crm} options={CRMS} onChange={v => handleField(b.id, "crm", v)} render={v => <CrmChip crm={v} />} />
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <InlineSelect value={b.project_mgr} options={pmOptions.map(o => o.name)} onChange={v => handleField(b.id, "project_mgr", v)} />
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Avatar name={b.va_name} size={26} />
                          <div>
                            <div style={{ fontSize: 12, color: B.dark }}>{b.va_name}</div>
                            {b.va_flag ? <div style={{ fontSize: 9, color: B.red, fontWeight: 600 }}>⚑ no VA linked</div> : null}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                        <InlineSelect value={b.qa_reviewer} options={qaOptions.map(o => o.name)} onChange={v => handleField(b.id, "qa_reviewer", v)} />
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "center" }}>
                        {ic > 0 ? <span style={{ display: "inline-block", minWidth: 20, padding: "2px 7px", borderRadius: 10, background: "#FEF2F2", color: B.red, fontSize: 11, fontWeight: 700 }}>{ic}</span> : <span style={{ fontSize: 11, color: "#C0C0CC" }}>—</span>}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <InlineSelect value={b.status} options={STATUSES} onChange={v => handleStatus(b.id, v)} render={v => <StatusBadge status={v} />} />
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: 11, color: "#9090A8", whiteSpace: "nowrap" }}>{fmtDate(b.date_start)}</td>
                      <td style={{ padding: "12px 14px", fontSize: 11, color: "#9090A8", whiteSpace: "nowrap" }}>{fmtDate(b.date_finish)}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <InlineSelect
                          value={b.on_time_override || "Auto"}
                          options={["Auto", "On Time", "Overdue"]}
                          onChange={v => handleField(b.id, "on_time_override", v === "Auto" ? "" : v)}
                          render={() => <OnTimePill value={onTimeOf(b)} />}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {loading && <div style={{ textAlign: "center", padding: "60px 0", color: "#9090A8", fontFamily: FONT_BODY, fontSize: 13 }}>Loading builds…</div>}
            {!loading && visible.length === 0 && <div style={{ textAlign: "center", padding: "60px 0", color: "#9090A8", fontFamily: FONT_BODY, fontSize: 13 }}>No builds match the current filters.</div>}
          </div>

          {/* SUMMARY BAR */}
          <div style={{ background: B.white, borderTop: "1px solid #E0E0E8", padding: "10px 24px", display: "flex", alignItems: "center", gap: 28, flexShrink: 0, flexWrap: "wrap" }}>
            {[
              { label: "Working on it", val: counts.working, valColor: "#1E40AF" },
              { label: "Waiting on client", val: counts.waiting, valColor: "#854D0E" },
              { label: "Builds with open issues", val: counts.issues, valColor: B.red },
              { label: "Done", val: counts.done, valColor: "#166534" },
            ].map(({ label, val, valColor }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, color: "#9090A8", fontFamily: FONT_BODY }}>{label}:</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: valColor, fontFamily: FONT_BODY }}>{val}</span>
              </div>
            ))}
            <span style={{ marginLeft: "auto", fontSize: 10, color: "#CCCCDD", fontFamily: FONT_BODY }}>qa.build.logged · qa.build.status_changed · qa.build.reviewed</span>
          </div>
        </div>
      </div>

      {showNew && <NewBuildModal onClose={() => setShowNew(false)} onSubmit={handleNew} accounts={accounts} vaOptions={vaOptions} pmOptions={pmOptions} qaOptions={qaOptions} />}
      {selected && <BuildDrawer build={selected} onClose={() => setSelected(null)} onSave={handleSaveBuild} vaOptions={vaOptions} pmOptions={pmOptions} qaOptions={qaOptions} />}
    </div>
  );
}
