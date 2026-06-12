import React, { useState, useMemo } from "react";
import { LayoutGrid, List, CheckSquare, Wand2, Plus, X } from "lucide-react";
import { C, FONT } from "../lib/theme.js";
import { TRAINEES } from "../data/trainees.js";
import { CATALOG, CAT_META, CAT_ORDER, SKILL_GROUPS } from "../data/catalog.js";
import { COLORS } from "../data/org.js";
import { vaStatus, ini } from "../lib/status.js";
import { allSkills } from "../lib/panelData.js";
import { enrollVAInCourse, applyAutoEnroll, statusBadge } from "../lib/enroll.js";
import { assocValues, passesAssoc, sortList } from "../lib/associations.js";
import { FilterTabs, ViewToggle, SearchBox } from "../components/Controls.jsx";
import FilterBar, { makeBlank, skillOpts } from "../components/FilterPopover.jsx";
import { can } from "../lib/permissions.js";
import Metrics from "../components/Metrics.jsx";

const DIR_FIELDS = [
  { key: "salesRep", label: "Sales Rep", options: assocValues("salesRep") },
  { key: "am", label: "Account Manager", options: assocValues("am") },
  { key: "tl", label: "Team Lead", options: assocValues("tl") },
  { key: "pm", label: "Project Manager", options: assocValues("pm") },
  { key: "devTrainer", label: "Dev Trainer", options: assocValues("devTrainer") },
  { key: "insTrainer", label: "Insurance Trainer", options: assocValues("insTrainer") },
  { key: "vtype", label: "VA Type", options: [["combo", "Combo"], ["gen", "Gen"]] },
  { key: "skill", label: "Has Skill", options: skillOpts() },
];

export default function Directory({ role, onOpenVA }) {
  const [status, setStatus] = useState("all");
  const [view, setView] = useState("card");
  const [q, setQ] = useState("");
  const [bulk, setBulk] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [, force] = useState(0);
  const bump = () => force((n) => n + 1);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [f, setF] = useState(makeBlank(DIR_FIELDS));

  const canBulk = can(role, "bulkEnroll");
  const term = q.toLowerCase();

  const list = useMemo(() => {
    let l = [...TRAINEES];
    if (status !== "all") l = l.filter((t) => vaStatus(t) === status);
    if (term) l = l.filter((t) => t.name.toLowerCase().includes(term) || t.agency.toLowerCase().includes(term));
    l = l.filter((t) => passesAssoc(t, f));
    return sortList(l, f.sort);
  }, [status, term, f]);

  const toggleSel = (name) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(name)) n.delete(name);
      else n.add(name);
      return n;
    });
  };

  return (
    <div>
      <Metrics view="directory" />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <FilterTabs
          options={[["all", "All"], ["in-training", "In Training"], ["deployed", "Deployed"], ["active-watch", "Active Watch"], ["fired", "Fired"]]}
          value={status}
          onChange={setStatus}
        />
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <SearchBox value={q} onChange={setQ} placeholder="Search VA or agency…" />
          <FilterBar fields={DIR_FIELDS} value={f} onChange={setF} />
          <ViewToggle options={[["card", "Cards", LayoutGrid], ["list", "List", List]]} value={view} onChange={setView} />
          {canBulk && (
            <button
              onClick={() => { setBulk((b) => !b); setSelected(new Set()); }}
              style={{ border: bulk ? `1px solid ${C.teal}` : `1px solid ${C.line}`, background: bulk ? "#e6eef1" : "#fff", color: bulk ? C.teal : C.sub, fontSize: 11.5, fontWeight: 500, padding: "7px 12px", borderRadius: 8, cursor: "pointer", fontFamily: FONT.body, display: "flex", alignItems: "center", gap: 6 }}
            >
              <CheckSquare size={14} /> Select
            </button>
          )}
        </div>
      </div>

      {bulk && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#fff", border: `1px solid ${C.line}`, borderRadius: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>{selected.size} selected</span>
          <button onClick={() => setSelected(new Set(list.map((t) => t.name)))} style={bulkBtn}>Select all ({list.length})</button>
          <button onClick={() => setSelected(new Set())} style={bulkBtn}>Clear</button>
          <div style={{ flex: 1 }} />
          <button
            disabled={!selected.size}
            onClick={() => { let total = 0; [...selected].forEach((n) => { const t = TRAINEES.find((x) => x.name === n); if (t) total += applyAutoEnroll(t); }); setSelected(new Set()); bump(); alert(`Applied default courses · ${total} new enrollments`); }}
            style={{ ...bulkBtn, opacity: selected.size ? 1 : 0.4 }}
          >
            <Wand2 size={13} /> Apply default courses
          </button>
          <button
            disabled={!selected.size}
            onClick={() => setEnrollOpen(true)}
            style={{ ...bulkBtn, background: C.teal, color: "#fff", border: "none", opacity: selected.size ? 1 : 0.4 }}
          >
            <Plus size={13} /> Enroll in course
          </button>
        </div>
      )}

      {list.length === 0 ? (
        <Empty>No VAs match.</Empty>
      ) : view === "list" ? (
        <ListTable list={list} bulk={bulk} selected={selected} toggleSel={toggleSel} onOpenVA={onOpenVA} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 14 }}>
          {list.map((t, i) => (
            <DirCard key={t.name} t={t} i={i} bulk={bulk} selected={selected} toggleSel={toggleSel} onOpenVA={onOpenVA} />
          ))}
        </div>
      )}

      {enrollOpen && (
        <BulkEnroll
          count={selected.size}
          onClose={() => setEnrollOpen(false)}
          onEnroll={(k) => {
            let added = 0;
            [...selected].forEach((n) => { const t = TRAINEES.find((x) => x.name === n); if (t && enrollVAInCourse(t, k)) added++; });
            setEnrollOpen(false);
            setSelected(new Set());
            bump();
            alert(`Enrolled ${added} VA${added === 1 ? "" : "s"} in ${CATALOG[k].name}`);
          }}
        />
      )}
    </div>
  );
}

function SkillChips({ t }) {
  const s = allSkills(t);
  const chips = [];
  SKILL_GROUPS.forEach((g) => (s[g.id] || []).forEach((x, i) => chips.push({ label: x.label, auto: x.auto, bg: g.chipBg || "#eef0f2", fg: g.chipFg || "#555", key: g.id + i })));
  if (!chips.length) return <span style={{ fontSize: 10, color: "#ccc" }}>No skills tagged yet</span>;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
      {chips.map((c) => (
        <span key={c.key} style={{ background: c.bg, color: c.fg, fontSize: 9.5, padding: "3px 8px", borderRadius: 20 }}>{c.label}{!c.auto && "*"}</span>
      ))}
    </div>
  );
}

function Check({ on }) {
  return <span style={{ color: on ? C.teal : "#ccc", fontSize: 16 }}>{on ? "☑" : "☐"}</span>;
}

function DirCard({ t, i, bulk, selected, toggleSel, onOpenVA }) {
  const on = selected.has(t.name);
  return (
    <div
      onClick={() => (bulk ? toggleSel(t.name) : onOpenVA(t.name, "dir"))}
      style={{ background: "#fff", border: on ? `1.5px solid ${C.teal}` : `1px solid ${C.line}`, borderRadius: 12, padding: 16, cursor: "pointer" }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
        {bulk && <Check on={on} />}
        <div style={{ background: COLORS[i % COLORS.length], width: 32, height: 32, borderRadius: "50%", color: "#fff", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{ini(t.name)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, display: "flex", alignItems: "center" }}>
            {t.name}
            <span style={{ background: t.type === "combo" ? "#fce8e8" : "#e1f0f5", color: t.type === "combo" ? "#a32d2d" : "#0c447c", fontSize: 9, fontWeight: 600, padding: "2px 7px", borderRadius: 20, marginLeft: 6 }}>{t.type === "combo" ? "Combo" : "Gen"}</span>
          </div>
          <div style={{ fontSize: 11, color: C.sub }}>{t.agency}</div>
        </div>
      </div>
      <div style={{ fontSize: 9, color: C.sub, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 6 }}>Skills</div>
      <SkillChips t={t} />
    </div>
  );
}

function ListTable({ list, bulk, selected, toggleSel, onOpenVA }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "40px 1.6fr 1fr 0.8fr 0.9fr", gap: 10, padding: "10px 16px", fontSize: 10, color: C.sub, textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: `1px solid ${C.line}` }}>
        <span /><span>VA / Agency</span><span>Team Lead</span><span>Skills</span><span>Started</span>
      </div>
      {list.map((t, i) => {
        const on = selected.has(t.name);
        const s = allSkills(t);
        const count = SKILL_GROUPS.reduce((n, g) => n + (s[g.id] || []).length, 0);
        const idx = TRAINEES.indexOf(t);
        return (
          <div
            key={t.name}
            onClick={() => (bulk ? toggleSel(t.name) : onOpenVA(t.name, "dir"))}
            style={{ display: "grid", gridTemplateColumns: "40px 1.6fr 1fr 0.8fr 0.9fr", gap: 10, padding: "11px 16px", alignItems: "center", borderBottom: `1px solid ${C.line}`, cursor: "pointer", background: on ? "#f3f9fa" : "transparent" }}
          >
            {bulk ? <Check on={on} /> : <div style={{ background: COLORS[idx % COLORS.length], width: 24, height: 24, borderRadius: "50%", color: "#fff", fontSize: 8, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>{ini(t.name)}</div>}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: C.ink, display: "flex", alignItems: "center" }}>
                {t.name}
                <span style={{ background: t.type === "combo" ? "#fce8e8" : "#e1f0f5", color: t.type === "combo" ? "#a32d2d" : "#0c447c", fontSize: 8.5, fontWeight: 600, padding: "1px 6px", borderRadius: 20, marginLeft: 5 }}>{t.type === "combo" ? "Combo" : "Gen"}</span>
              </div>
              <div style={{ fontSize: 10.5, color: C.sub }}>{t.agency}</div>
            </div>
            <div style={{ fontSize: 11.5, color: C.sub }}>{t.tl}</div>
            <div style={{ fontSize: 11.5, color: C.sub }}>{count} skills</div>
            <div style={{ fontSize: 11.5, color: C.sub }}>{t.started}</div>
          </div>
        );
      })}
    </div>
  );
}

function BulkEnroll({ count, onClose, onEnroll }) {
  const cats = CAT_ORDER.filter((key) => Object.keys(CATALOG).some((k) => CATALOG[k].category === key && CATALOG[k].status !== "draft"));
  const first = Object.keys(CATALOG)[0];
  const [course, setCourse] = useState(first);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 70 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, padding: "24px 26px", width: 380, maxWidth: "92vw", fontFamily: FONT.body }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.ink, marginBottom: 6 }}>Bulk enroll</div>
        <div style={{ fontSize: 12, color: C.sub, marginBottom: 14 }}>Enroll <b>{count}</b> selected VA{count === 1 ? "" : "s"} in a course. Already-enrolled VAs are skipped.</div>
        <div style={{ fontSize: 10, color: C.sub, marginBottom: 5 }}>Course</div>
        <select value={course} onChange={(e) => setCourse(e.target.value)} style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 12.5, fontFamily: FONT.body, marginBottom: 16 }}>
          {cats.map((key) => (
            <optgroup key={key} label={(CAT_META[key] || {}).label || key}>
              {Object.keys(CATALOG).filter((k) => CATALOG[k].category === key && CATALOG[k].status !== "draft").map((k) => (
                <option key={k} value={k}>{CATALOG[k].name}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{ border: `1px solid ${C.line}`, background: "#fff", color: C.sub, fontSize: 12, padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontFamily: FONT.body }}>Cancel</button>
          <button onClick={() => onEnroll(course)} style={{ border: "none", background: C.teal, color: "#fff", fontSize: 12, fontWeight: 600, padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontFamily: FONT.body }}>Enroll {count}</button>
        </div>
      </div>
    </div>
  );
}

const bulkBtn = { border: `1px solid ${C.line}`, background: "#fff", color: C.ink, fontSize: 11, fontWeight: 500, padding: "6px 11px", borderRadius: 7, cursor: "pointer", fontFamily: FONT.body, display: "flex", alignItems: "center", gap: 5 };

function Empty({ children }) {
  return <div style={{ padding: 24, color: C.sub, fontSize: 13, background: "#fff", border: `1px dashed ${C.line}`, borderRadius: 12 }}>{children}</div>;
}
