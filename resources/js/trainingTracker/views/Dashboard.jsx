import React, { useState, useMemo } from "react";
import { List, GanttChartSquare } from "lucide-react";
import { C, FONT } from "../lib/theme.js";
import { TRAINEES, BROAD_TRAINEES } from "../data/trainees.js";
import { isDeployed, vaStatus } from "../lib/status.js";
import { isEndorsed } from "../lib/certs.js";
import { unifiedSegments, phaseLabel, broadPct } from "../lib/progress.js";
import { assocValues, passesAssoc, sortList } from "../lib/associations.js";
import { startRank } from "../lib/dates.js";
import { Avatar } from "../components/Avatar.jsx";
import { TypeBadge } from "../components/Badge.jsx";
import { UnifiedBar, PhasePill } from "../components/UnifiedBar.jsx";
import { FilterTabs, ViewToggle, SearchBox } from "../components/Controls.jsx";
import FilterBar, { makeBlank } from "../components/FilterPopover.jsx";
import Gantt from "../components/Gantt.jsx";
import Metrics from "../components/Metrics.jsx";

const DASH_FIELDS = [
  { key: "tl", label: "Team Lead", options: assocValues("tl") },
  { key: "am", label: "Account Manager", options: assocValues("am") },
  { key: "salesRep", label: "Sales Rep", options: assocValues("salesRep") },
];

export default function Dashboard({ onOpenVA }) {
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState("list");
  const [q, setQ] = useState("");
  const [f, setF] = useState(makeBlank(DASH_FIELDS));

  const all = useMemo(() => {
    const reg = TRAINEES.filter((t) => !isDeployed(t) && vaStatus(t) !== "fired");
    const broughtBack = TRAINEES.filter((t) => (isDeployed(t) || vaStatus(t) === "fired") && isEndorsed(t) && vaStatus(t) !== "fired");
    const broad = BROAD_TRAINEES.map((b) => ({ name: b.name, type: "broad", agency: b.agency, started: b.started, tl: b.tl, am: b.am, salesRep: b.salesRep, _broad: b }));
    return [...reg, ...broughtBack, ...broad];
  }, []);

  const list = useMemo(() => {
    let l = all;
    if (filter === "endorsed") l = l.filter((t) => t.type !== "broad" && isEndorsed(t));
    else if (filter !== "all") l = l.filter((t) => t.type === filter);
    const term = q.toLowerCase();
    if (term) l = l.filter((t) => t.name.toLowerCase().includes(term) || (t.agency || "").toLowerCase().includes(term));
    l = l.filter((t) => passesAssoc(t, f));
    return sortList(l, f.sort);
  }, [all, filter, q, f]);

  return (
    <div>
      <Metrics view="dashboard" />
      {/* legend */}
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 14, flexWrap: "wrap" }}>
        <LegendDot color={C.red} label="CRM Dev phase" />
        <LegendDot color={C.teal} label="Insurance phase" />
        <LegendDot color="#5b3b9c" label="Broad Market" />
        <span style={{ marginLeft: "auto", fontSize: 10, color: "#bbb" }}>Progress = time elapsed in training period</span>
      </div>

      {/* controls */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <FilterTabs
          options={[["all", "All"], ["combo", "Combo"], ["gen", "Gen"], ["broad", "Broad"], ["endorsed", "Endorsed"]]}
          value={filter}
          onChange={setFilter}
        />
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <SearchBox value={q} onChange={setQ} placeholder="Search VA or agency…" />
          <FilterBar fields={DASH_FIELDS} value={f} onChange={setF} />
          <ViewToggle options={[["list", "List", List], ["gantt", "Gantt", GanttChartSquare]]} value={view} onChange={setView} />
        </div>
      </div>

      {view === "gantt" ? (
        <Gantt list={list} />
      ) : (
        <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "44px 1.6fr 0.8fr 1.4fr 1fr", gap: 12, padding: "11px 18px", fontSize: 10, color: C.sub, textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: `1px solid ${C.line}` }}>
            <span />
            <span>Trainee</span>
            <span>Week</span>
            <span>Unified Progress</span>
            <span>Phase</span>
          </div>
          {list.length === 0 && <div style={{ padding: 24, color: C.sub, fontSize: 13 }}>No VAs match.</div>}
          {list.map((t, i) => (
            <Row key={t.name} t={t} i={i} onOpenVA={onOpenVA} />
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ t, i, onOpenVA }) {
  const broad = t.type === "broad";
  const totalWks = t.type === "combo" ? 5 : 3;
  return (
    <div
      onClick={() => onOpenVA && onOpenVA(t.name, broad ? "broad" : "dash")}
      style={{ display: "grid", gridTemplateColumns: "44px 1.6fr 0.8fr 1.4fr 1fr", gap: 12, padding: "13px 18px", alignItems: "center", borderBottom: `1px solid ${C.line}`, cursor: "pointer" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <Avatar name={t.name} i={i} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, display: "flex", alignItems: "center" }}>
          {t.name}
          <TypeBadge type={t.type} />
          {!broad && isEndorsed(t) && <TypeBadge type="endorsed" />}
        </div>
        <div style={{ fontSize: 11, color: C.sub, marginTop: 1 }}>{t.agency}</div>
      </div>
      <div style={{ fontSize: 12, color: C.sub }}>
        {broad ? "—" : isDeployed(t) ? <span style={{ color: "#0f6e56" }}>Deployed</span> : `Wk ${Math.min(t.week, totalWks)}/${totalWks}`}
      </div>
      <div>
        {broad ? (
          <div>
            <div style={{ height: 7, borderRadius: 4, background: "#eee", overflow: "hidden" }}>
              <div style={{ width: `${broadPct(t._broad)}%`, height: "100%", background: "#5b3b9c" }} />
            </div>
            <div style={{ fontSize: 9, color: C.sub, marginTop: 4, textAlign: "right" }}>{broadPct(t._broad)}% checklist</div>
          </div>
        ) : (
          <UnifiedBar t={t} />
        )}
      </div>
      <div>
        {broad ? <PhasePill phase={{ label: "Broad Market", bg: "#efe7fa", fg: "#5b3b9c" }} /> : isEndorsed(t) ? <PhasePill phase={{ label: "Endorsed", bg: "#fef0e8", fg: "#a8650f" }} /> : <PhasePill phase={phaseLabel(t)} />}
      </div>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.sub }}>
      <span style={{ width: 9, height: 9, borderRadius: "50%", background: color, display: "inline-block" }} />
      {label}
    </div>
  );
}
