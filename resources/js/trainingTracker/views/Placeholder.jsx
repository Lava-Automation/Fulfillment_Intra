import React from "react";
import { C } from "../lib/theme.js";

// Temporary stand-in for views not yet ported. Shows a quick data sanity check
// so we can confirm the foundation (data + helpers) is wired before building UI.
export default function Placeholder({ title, stats }) {
  return (
    <div>
      <div
        style={{
          border: `1px dashed ${C.line}`,
          borderRadius: 12,
          padding: "28px 24px",
          background: C.white,
          color: C.sub,
          fontSize: 13,
        }}
      >
        <div style={{ fontWeight: 600, color: C.ink, marginBottom: 6 }}>{title}</div>
        <div>This view gets built in an upcoming pass. The foundation (data, helpers, nav, routing) is in place.</div>
        {stats && (
          <div style={{ marginTop: 16, display: "flex", gap: 20, flexWrap: "wrap" }}>
            {stats.map((s) => (
              <div key={s.label}>
                <div style={{ fontSize: 24, fontWeight: 700, color: C.teal }}>{s.value}</div>
                <div style={{ fontSize: 11 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
