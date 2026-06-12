import React from "react";
import { C } from "../lib/theme.js";
import { dateRank, todayShort, MONTHS } from "../lib/dates.js";
import { vaPhaseBars } from "../lib/progress.js";

const BADGE_BG = { combo: C.red, gen: C.teal, broad: "#5b3b9c" };

export default function Gantt({ list }) {
  if (!list.length) return <div style={{ color: C.sub, fontSize: 13, padding: 20 }}>No VAs to chart.</div>;
  const today = dateRank(todayShort());
  const rowsData = list.map((t) => ({ t, segs: vaPhaseBars(t) }));
  let minR = Infinity,
    maxR = today;
  rowsData.forEach((rd) => rd.segs.forEach((s) => { minR = Math.min(minR, s.from); maxR = Math.max(maxR, s.to); }));
  if (minR === Infinity) minR = today - 31;
  minR -= 2;
  maxR += 2;
  const span = Math.max(1, maxR - minR);
  const pct = (r) => ((r - minR) / span) * 100;
  const nowX = pct(today);

  const grid = [];
  for (let mi = 0; mi < 12; mi++) {
    const r = mi * 31;
    if (r < minR || r > maxR) continue;
    grid.push({ x: pct(r), label: MONTHS[mi] });
  }

  return (
    <div style={{ position: "relative", background: C.white, border: `1px solid ${C.line}`, borderRadius: 12, padding: "20px 20px 16px" }}>
      {/* header axis */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, height: 22, marginBottom: 6 }}>
        <div style={{ width: 150, flexShrink: 0 }} />
        <div style={{ flex: 1, position: "relative", height: "100%", borderBottom: `1px solid rgba(0,0,0,0.1)` }}>
          {grid.map((g, i) => (
            <div key={i} style={{ position: "absolute", left: `${g.x}%`, top: 0, bottom: -1000, borderLeft: "1px dashed rgba(0,0,0,0.07)" }}>
              <span style={{ position: "absolute", top: 0, left: 3, fontSize: 8, color: "#bbb" }}>{g.label}</span>
            </div>
          ))}
          <div style={{ position: "absolute", left: `${nowX}%`, top: 0, bottom: -1000, width: 1.5, background: "rgba(231,56,53,0.5)" }} />
        </div>
      </div>

      {rowsData.map(({ t, segs }, ri) => (
        <div key={ri} style={{ display: "flex", alignItems: "center", gap: 10, height: 26 }}>
          <div
            style={{
              width: 150,
              flexShrink: 0,
              fontSize: 11,
              color: "#444",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
            title={t.name}
          >
            <span style={{ width: 15, height: 15, borderRadius: 4, fontSize: 8, fontWeight: 700, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", background: BADGE_BG[t.type], flexShrink: 0 }}>
              {t.type === "combo" ? "C" : t.type === "gen" ? "G" : "B"}
            </span>
            {t.name}
          </div>
          <div style={{ flex: 1, position: "relative", height: "100%" }}>
            {segs.map((s, si) => {
              const left = pct(s.from);
              const w = Math.max(1, pct(s.to) - pct(s.from));
              return (
                <div
                  key={si}
                  title={s.label}
                  style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", left: `${left}%`, width: `${w}%`, height: 13, borderRadius: 4, background: s.color, zIndex: 1, minWidth: 2 }}
                />
              );
            })}
          </div>
        </div>
      ))}

      <div style={{ display: "flex", gap: 14, marginTop: 14, paddingTop: 10, borderTop: `1px solid ${C.line}` }}>
        {[["Dev", "#145365"], ["QAQC", "#854f0b"], ["Insurance", "#185fa5"], ["Broad", "#5b3b9c"]].map(([l, col]) => (
          <span key={l} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: C.sub }}>
            <i style={{ width: 11, height: 11, borderRadius: 3, background: col, display: "inline-block" }} />
            {l}
          </span>
        ))}
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: C.sub }}>
          <i style={{ width: 2, height: 12, background: "rgba(231,56,53,0.6)", display: "inline-block" }} />
          Today
        </span>
      </div>
      <div style={{ fontSize: 9, color: "#bbb", marginTop: 6 }}>Approximate timeline derived from milestone dates.</div>
    </div>
  );
}
