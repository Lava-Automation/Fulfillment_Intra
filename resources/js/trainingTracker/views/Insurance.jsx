import React, { useState, useMemo } from "react";
import { LayoutGrid, List } from "lucide-react";
import { C } from "../lib/theme.js";
import { TRAINEES } from "../data/trainees.js";
import { COLORS } from "../data/org.js";
import { isDeployed, vaStatus, ini } from "../lib/status.js";
import { insEnrollment, enrollPct } from "../lib/courses.js";
import { insPct, INS_MODULES } from "../lib/progress.js";
import { endorsedList } from "../lib/certs.js";
import { assocValues, passesAssoc, sortList } from "../lib/associations.js";
import { FilterTabs, ViewToggle, SearchBox } from "../components/Controls.jsx";
import FilterBar, { makeBlank } from "../components/FilterPopover.jsx";
import { InsCard, EndorsedCard } from "../components/Cards.jsx";
import { TypeBadge } from "../components/Badge.jsx";
import Metrics from "../components/Metrics.jsx";

const INS_FIELDS = [
  { key: "am", label: "Account Manager", options: assocValues("am") },
  { key: "insTrainer", label: "Insurance Trainer", options: assocValues("insTrainer") },
];

function pctFor(t) {
  const en = insEnrollment(t);
  return en ? enrollPct(en) : insPct(t);
}

export default function Insurance({ role, onOpenVA }) {
  const [tab, setTab] = useState("all");
  const [view, setView] = useState("card");
  const [q, setQ] = useState("");
  const [f, setF] = useState(makeBlank(INS_FIELDS));
  const term = q.toLowerCase();

  const mainList = useMemo(() => {
    let l = TRAINEES.filter((t) => (t.type === "gen" || (t.type === "combo" && t.devComplete)) && !isDeployed(t) && vaStatus(t) !== "fired");
    if (tab === "gen") l = l.filter((t) => t.type === "gen");
    else if (tab === "combo") l = l.filter((t) => t.type === "combo");
    if (term) l = l.filter((t) => t.name.toLowerCase().includes(term) || t.agency.toLowerCase().includes(term));
    l = l.filter((t) => passesAssoc(t, f));
    return sortList(l, f.sort);
  }, [tab, term, f]);

  const endList = useMemo(() => {
    return endorsedList("ins").filter((t) => t.name.toLowerCase().includes(term) || t.agency.toLowerCase().includes(term));
  }, [term]);

  const showEndorsed = tab === "all";

  return (
    <div>
      <Metrics view="insurance" />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <FilterTabs
          options={[["all", "All"], ["gen", "Gen Only"], ["combo", "Combo (handed off)"], ["endorsed", "Endorsed"]]}
          value={tab}
          onChange={setTab}
        />
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <SearchBox value={q} onChange={setQ} placeholder="Search VA or agency…" />
          <FilterBar fields={INS_FIELDS} value={f} onChange={setF} />
          {tab !== "endorsed" && (
            <ViewToggle options={[["card", "Cards", LayoutGrid], ["list", "List", List]]} value={view} onChange={setView} />
          )}
        </div>
      </div>

      {tab === "endorsed" ? (
        <EndorsedGrid list={endList} onOpenVA={onOpenVA} />
      ) : (
        <>
          {view === "list" ? (
            <ListTable list={mainList} onOpenVA={onOpenVA} />
          ) : (
            <CardGrid list={mainList} onOpenVA={onOpenVA} />
          )}
          {showEndorsed && (
            <>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.ink, margin: "22px 0 10px" }}>Endorsed</div>
              <EndorsedGrid list={endList} onOpenVA={onOpenVA} />
            </>
          )}
        </>
      )}
    </div>
  );
}

function CardGrid({ list, onOpenVA }) {
  if (!list.length) return <Empty>No trainees match.</Empty>;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
      {list.map((t, i) => (
        <InsCard key={t.name} t={t} i={i} p={pctFor(t)} onOpen={onOpenVA} />
      ))}
    </div>
  );
}

function ListTable({ list, onOpenVA }) {
  if (!list.length) return <Empty>No trainees match.</Empty>;
  return (
    <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "40px 1.4fr 1.2fr 0.8fr 1.4fr 0.9fr", gap: 10, padding: "10px 16px", fontSize: 10, color: C.sub, textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: `1px solid ${C.line}` }}>
        <span /><span>Trainee / Trainer</span><span>Agency</span><span>Ins. Week</span><span>Progress</span><span>Start</span>
      </div>
      {list.map((t, i) => {
        const p = pctFor(t);
        const wk = Math.max(1, t.type === "combo" ? t.week - 2 : t.week);
        const cur = t.insActive != null ? INS_MODULES[t.insActive] : "Done";
        const idx = TRAINEES.indexOf(t);
        return (
          <div
            key={t.name}
            onClick={() => onOpenVA && onOpenVA(t.name, "ins")}
            style={{ display: "grid", gridTemplateColumns: "40px 1.4fr 1.2fr 0.8fr 1.4fr 0.9fr", gap: 10, padding: "11px 16px", alignItems: "center", borderBottom: `1px solid ${C.line}`, cursor: "pointer" }}
          >
            <div style={{ background: COLORS[(idx + 1) % COLORS.length], width: 24, height: 24, borderRadius: "50%", color: "#fff", fontSize: 8, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>{ini(t.name)}</div>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: C.ink, display: "flex", alignItems: "center" }}>{t.name}<TypeBadge type={t.type} /></div>
              <div style={{ fontSize: 10.5, color: C.sub }}>{t.insTrainer}</div>
            </div>
            <div style={{ fontSize: 11.5, color: C.sub }}>{t.agency}</div>
            <div style={{ fontSize: 11.5, color: C.sub }}>Wk {wk}</div>
            <div>
              <div style={{ fontSize: 10.5, color: C.sub, marginBottom: 3 }}>{p}% · {cur}</div>
              <div style={{ height: 5, borderRadius: 3, background: "#eee", overflow: "hidden" }}>
                <div style={{ width: `${p}%`, height: "100%", background: "#185fa5" }} />
              </div>
            </div>
            <div style={{ fontSize: 11.5, color: C.sub }}>{t.started}</div>
          </div>
        );
      })}
    </div>
  );
}

function EndorsedGrid({ list, onOpenVA }) {
  if (!list.length) return <Empty>No VAs endorsed to Insurance.</Empty>;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
      {list.map((t, i) => (
        <EndorsedCard key={t.name} t={t} team="ins" i={i} onOpen={onOpenVA} />
      ))}
    </div>
  );
}

function Empty({ children }) {
  return <div style={{ padding: 24, color: C.sub, fontSize: 13, background: C.white, border: `1px dashed ${C.line}`, borderRadius: 12 }}>{children}</div>;
}
