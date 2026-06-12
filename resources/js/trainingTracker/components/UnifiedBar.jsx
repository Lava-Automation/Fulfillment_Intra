import React from "react";
import { C } from "../lib/theme.js";
import { unifiedSegments } from "../lib/progress.js";

export function UnifiedBar({ t }) {
  const s = unifiedSegments(t);
  return (
    <div>
      <div style={{ display: "flex", height: 7, borderRadius: 4, overflow: "hidden", background: "#eee" }}>
        {s.combo && <div style={{ width: `${s.crmFill}%`, background: C.red }} />}
        <div style={{ width: `${s.insFill}%`, background: C.teal }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 9, color: C.sub }}>
        {s.combo ? (
          <>
            <span style={{ color: C.red }}>CRM</span>
            <span style={{ color: C.teal }}>Insurance</span>
            <span>{s.pct}%</span>
          </>
        ) : (
          <>
            <span style={{ color: C.teal }}>Insurance</span>
            <span>{s.pct}%</span>
          </>
        )}
      </div>
    </div>
  );
}

export function PhasePill({ phase }) {
  return (
    <span style={{ background: phase.bg, color: phase.fg, fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap" }}>
      {phase.label}
    </span>
  );
}
