import React, { useState, useMemo } from "react";
import { C } from "../lib/theme.js";
import { BROAD_TRAINEES } from "../data/trainees.js";
import { assocValues, passesAssoc, sortList } from "../lib/associations.js";
import { SearchBox } from "../components/Controls.jsx";
import FilterBar, { makeBlank } from "../components/FilterPopover.jsx";
import { BroadCard } from "../components/Cards.jsx";
import Metrics from "../components/Metrics.jsx";

const BROAD_FIELDS = [
  { key: "devTrainer", label: "Dev Trainer", options: assocValues("devTrainer") },
  { key: "insTrainer", label: "Insurance Trainer", options: assocValues("insTrainer") },
  { key: "salesRep", label: "Sales Rep", options: assocValues("salesRep") },
  { key: "am", label: "Account Manager", options: assocValues("am") },
];

export default function Broad({ onOpenVA }) {
  const [q, setQ] = useState("");
  const [f, setF] = useState(makeBlank(BROAD_FIELDS));
  const term = q.toLowerCase();

  const list = useMemo(() => {
    let l = BROAD_TRAINEES.map((b, i) => ({ b, i }));
    if (term) {
      l = l.filter(
        (o) =>
          o.b.name.toLowerCase().includes(term) ||
          (o.b.agency || "").toLowerCase().includes(term) ||
          (o.b.tools || []).some((t) => t.toLowerCase().includes(term))
      );
    }
    l = l.filter((o) => passesAssoc(o.b, f));
    const sorted = sortList(l.map((o) => o.b), f.sort);
    return sorted.map((b) => ({ b, i: BROAD_TRAINEES.indexOf(b) }));
  }, [term, f]);

  return (
    <div>
      <Metrics view="broad" />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, justifyContent: "flex-end", flexWrap: "wrap" }}>
        <SearchBox value={q} onChange={setQ} placeholder="Search by name, agency, or tool…" />
        <FilterBar fields={BROAD_FIELDS} value={f} onChange={setF} />
      </div>
      {list.length === 0 ? (
        <div style={{ padding: 24, color: C.sub, fontSize: 13, background: C.white, border: `1px dashed ${C.line}`, borderRadius: 12 }}>
          {q ? `No broad market VAs match "${q}".` : "No broad market VAs yet."}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 14 }}>
          {list.map((o) => (
            <BroadCard key={o.b.name} b={o.b} i={o.i} onOpen={(name) => onOpenVA && onOpenVA(name, "broad")} />
          ))}
        </div>
      )}
    </div>
  );
}
