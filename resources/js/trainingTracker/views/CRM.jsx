import React, { useState, useMemo } from "react";
import { LayoutGrid, List } from "lucide-react";
import { C } from "../lib/theme.js";
import { TRAINEES } from "../data/trainees.js";
import { COLORS } from "../data/org.js";
import { isDeployed, vaStatus, devDoneWithCrm, ini, qaqcMarker } from "../lib/status.js";
import { endorsedList } from "../lib/certs.js";
import { assocValues, passesAssoc, sortList } from "../lib/associations.js";
import { FilterTabs, ViewToggle, SearchBox } from "../components/Controls.jsx";
import FilterBar, { makeBlank } from "../components/FilterPopover.jsx";
import { BuildCard, EndorsedCard, HealthDot } from "../components/Cards.jsx";
import Metrics from "../components/Metrics.jsx";

const CRM_FIELDS = [
  { key: "pm", label: "Project Manager", options: assocValues("pm") },
  { key: "devTrainer", label: "Dev Trainer", options: assocValues("devTrainer") },
];

export default function CRM({ role, onOpenVA }) {
  const [tab, setTab] = useState("all");
  const [view, setView] = useState("card");
  const [q, setQ] = useState("");
  const [f, setF] = useState(makeBlank(CRM_FIELDS));

  const term = q.toLowerCase();

  const buildList = useMemo(() => {
    let l = TRAINEES.filter((t) => t.type === "combo" && !isDeployed(t) && vaStatus(t) !== "fired" && !devDoneWithCrm(t));
    if (term) l = l.filter((t) => t.name.toLowerCase().includes(term) || t.agency.toLowerCase().includes(term));
    l = l.filter((t) => passesAssoc(t, f));
    return sortList(l, f.sort, (t) => Math.round(((t.meetingsDone || 0) / (t.meetingsTarget || 10)) * 100));
  }, [role, term, f]);

  const endList = useMemo(() => {
    return endorsedList("crm").filter((t) => t.name.toLowerCase().includes(term) || t.agency.toLowerCase().includes(term));
  }, [term]);

  return (
    <div>
      <Metrics view="crm" />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <FilterTabs options={[["all", "All"], ["build", "Build Track"], ["endorsed", "Endorsed"]]} value={tab} onChange={setTab} />
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <SearchBox value={q} onChange={setQ} placeholder="Search VA or agency…" />
          <FilterBar fields={CRM_FIELDS} value={f} onChange={setF} />
          {tab !== "endorsed" && (
            <ViewToggle options={[["card", "Cards", LayoutGrid], ["list", "List", List]]} value={view} onChange={setView} />
          )}
        </div>
      </div>

      {tab === "all" && (
        <>
          <SectionLabel>Build Track</SectionLabel>
          <BuildSection list={buildList} view={view} onOpenVA={onOpenVA} />
          <div style={{ height: 22 }} />
          <SectionLabel>Endorsed</SectionLabel>
          <EndorsedGrid list={endList} onOpenVA={onOpenVA} />
        </>
      )}
      {tab === "build" && <BuildSection list={buildList} view={view} onOpenVA={onOpenVA} />}
      {tab === "endorsed" && <EndorsedGrid list={endList} onOpenVA={onOpenVA} />}
    </div>
  );
}

function SectionLabel({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 600, color: C.ink, marginBottom: 10 }}>{children}</div>;
}

function BuildSection({ list, view, onOpenVA }) {
  if (!list.length) return <Empty>No build-track trainees match.</Empty>;
  if (view === "list") {
    return (
      <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "40px 1.4fr 1.2fr 1fr 1.1fr 1fr", gap: 10, padding: "10px 16px", fontSize: 10, color: C.sub, textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: `1px solid ${C.line}` }}>
          <span /><span>Trainee / Trainer</span><span>Agency</span><span>Start</span><span>Meetings</span><span>Health</span>
        </div>
        {list.map((t, i) => (
          <ComboRow key={t.name} t={t} i={i} onOpenVA={onOpenVA} />
        ))}
      </div>
    );
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
      {list.map((t, i) => (
        <BuildCard key={t.name} t={t} i={i} onOpen={onOpenVA} />
      ))}
    </div>
  );
}

function ComboRow({ t, i, onOpenVA }) {
  const md = t.meetingsDone || 0,
    mt = t.meetingsTarget || 10;
  const p = Math.round((md / mt) * 100);
  const qm = qaqcMarker(t);
  return (
    <div
      onClick={() => onOpenVA && onOpenVA(t.name, "crm")}
      style={{ display: "grid", gridTemplateColumns: "40px 1.4fr 1.2fr 1fr 1.1fr 1fr", gap: 10, padding: "11px 16px", alignItems: "center", borderBottom: `1px solid ${C.line}`, cursor: "pointer" }}
    >
      <div style={{ background: COLORS[i % COLORS.length], width: 24, height: 24, borderRadius: "50%", color: "#fff", fontSize: 8, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>{ini(t.name)}</div>
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: C.ink }}>{t.name}</div>
        <div style={{ fontSize: 10.5, color: C.sub }}>{t.devTrainer}</div>
      </div>
      <div style={{ fontSize: 11.5, color: C.sub }}>{t.agency}</div>
      <div style={{ fontSize: 11.5, color: C.sub }}>{t.started}{qm ? ` · ${qm.label}` : ""}</div>
      <div>
        <div style={{ fontSize: 10.5, color: C.sub, marginBottom: 3 }}>{md}/{mt} meetings</div>
        <div style={{ height: 5, borderRadius: 3, background: "#eee", overflow: "hidden" }}>
          <div style={{ width: `${p}%`, height: "100%", background: C.teal }} />
        </div>
      </div>
      <HealthDot h={t.crmHealth} />
    </div>
  );
}

function EndorsedGrid({ list, onOpenVA }) {
  if (!list.length) return <Empty>No endorsed VAs.</Empty>;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
      {list.map((t, i) => (
        <EndorsedCard key={t.name} t={t} team="crm" i={i} onOpen={onOpenVA} />
      ))}
    </div>
  );
}

function Empty({ children }) {
  return <div style={{ padding: 24, color: C.sub, fontSize: 13, background: C.white, border: `1px dashed ${C.line}`, borderRadius: 12 }}>{children}</div>;
}
