import React, { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { C, FONT } from "../lib/theme.js";
import { assocValues } from "../lib/associations.js";
import { SKILL_GROUPS } from "../data/catalog.js";

// fields: array of { key, label, options:[...] } ; always adds Sort.
// value: object of current selections (key -> value, plus sort)
export function makeBlank(fields) {
  const b = { sort: "start" };
  fields.forEach((f) => (b[f.key] = "all"));
  return b;
}

export default function FilterBar({ fields, value, onChange, sortOptions }) {
  const [open, setOpen] = useState(false);
  const activeCount = fields.filter((f) => value[f.key] && value[f.key] !== "all").length;
  const sorts = sortOptions || [
    ["start", "Start date (oldest)"],
    ["start-desc", "Start date (newest)"],
    ["name", "Name (A–Z)"],
  ];
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ display: "flex", alignItems: "center", gap: 6, border: activeCount ? `1px solid ${C.teal}` : `1px solid ${C.line}`, background: activeCount ? "#e6eef1" : "#fff", color: activeCount ? C.teal : C.sub, fontSize: 11.5, fontWeight: 500, padding: "7px 12px", borderRadius: 8, cursor: "pointer", fontFamily: FONT.body }}
      >
        <SlidersHorizontal size={14} /> Filters{activeCount ? ` · ${activeCount}` : ""}
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 30 }} />
          <div style={{ position: "absolute", top: 40, right: 0, width: 240, maxHeight: "70vh", overflowY: "auto", background: "#fff", border: `1px solid ${C.line}`, borderRadius: 11, boxShadow: "0 8px 28px rgba(0,0,0,0.14)", padding: 16, zIndex: 31 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>Filters</span>
              <button onClick={() => onChange(makeBlank(fields))} style={{ border: "none", background: "transparent", color: C.teal, fontSize: 10.5, cursor: "pointer", fontFamily: FONT.body }}>Clear</button>
            </div>
            {fields.map((f) => (
              <div key={f.key} style={{ marginBottom: 11 }}>
                <div style={{ fontSize: 10, color: C.sub, marginBottom: 4 }}>{f.label}</div>
                <select value={value[f.key] || "all"} onChange={(e) => onChange({ ...value, [f.key]: e.target.value })} style={sel}>
                  <option value="all">All</option>
                  {f.options.map((o) => (typeof o === "string" ? <option key={o} value={o}>{o}</option> : <option key={o[0]} value={o[0]}>{o[1]}</option>))}
                </select>
              </div>
            ))}
            <div style={{ borderTop: `1px solid ${C.line}`, margin: "4px 0 11px" }} />
            <div style={{ fontSize: 10, color: C.sub, marginBottom: 4 }}>Sort by</div>
            <select value={value.sort} onChange={(e) => onChange({ ...value, sort: e.target.value })} style={sel}>
              {sorts.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>
        </>
      )}
    </div>
  );
}

const sel = { width: "100%", padding: "7px 9px", borderRadius: 7, border: `1px solid ${C.line}`, fontSize: 12, fontFamily: FONT.body };

// helpers to build option lists
export function assocOpts(field) {
  return assocValues(field);
}
export function skillOpts() {
  const out = [];
  SKILL_GROUPS.forEach((g) => (g.skills || []).forEach((s) => out.push(s)));
  return out.length ? out : ["Cognito Forms", "AgencyZoom", "Zapier", "EZLynx", "Hawksoft", "Policy Basics", "Servicing", "Client Comms"];
}
