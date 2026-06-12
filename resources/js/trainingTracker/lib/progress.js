// Unified progress + phase label + gantt phase segments — ported from the mockup.
import { vaStatus, isDeployed } from "./status.js";
import { vaMilestones } from "./events.js";
import { dateRank, todayShort } from "./dates.js";

export const COMBO_TOTAL_WEEKS = 5;
export const GEN_TOTAL_WEEKS = 3;
export const INS_MODULES = ["A", "B", "C", "D", "E", "F"];

export function insPct(t) {
  return Math.round(((t.ins || []).length / INS_MODULES.length) * 100);
}

export function unifiedPct(t) {
  const total = t.type === "combo" ? COMBO_TOTAL_WEEKS : GEN_TOTAL_WEEKS;
  return Math.min(100, Math.round((Math.min(t.week, total) / total) * 100));
}

// returns { crmFill, insFill } percentages for the unified bar (combo), or single fill (gen)
export function unifiedSegments(t) {
  if (t.type === "combo") {
    const wk = Math.min(t.week, 5);
    return {
      combo: true,
      crmFill: (Math.min(wk, 2) / 5) * 100,
      insFill: (Math.max(0, Math.min(wk, 5) - 2) / 5) * 100,
      pct: unifiedPct(t),
    };
  }
  return { combo: false, insFill: unifiedPct(t), pct: unifiedPct(t) };
}

export function phaseLabel(t) {
  const s = vaStatus(t);
  if (s === "deployed") return { label: "Deployed", bg: "#e1f5ee", fg: "#0f6e56" };
  if (s === "active-watch") return { label: "Active Watch", bg: "#fdf0e6", fg: "#a8650f" };
  if (s === "fired") return { label: "Fired", bg: "#fce8e8", fg: "#a32d2d" };
  if (t.type === "combo") {
    if (t.devComplete) return { label: "Ins. Training", bg: "#e6f1fb", fg: "#185fa5" };
    if (t.qaqcStage === "in-qaqc" || t.qaqcStage === "issues") return { label: "QAQC Review", bg: "#fdf0e6", fg: "#a8650f" };
    return { label: "Build Track", bg: "#fce8e8", fg: "#a32d2d" };
  }
  return { label: "Ins. Training", bg: "#e6f1fb", fg: "#185fa5" };
}

export function broadPct(b) {
  const cl = b.checklist || [];
  if (!cl.length) return 0;
  return Math.round((cl.filter((x) => x.done).length / cl.length) * 100);
}

// gantt phase segments for one VA
export function vaPhaseBars(t) {
  const ms = vaMilestones(t.name);
  const find = (type) => {
    const e = ms.find((x) => x.action === type);
    return e ? e.rank : null;
  };
  const startR = dateRank(t.started);
  const today = dateRank(todayShort());
  const end = (r) => (r == null ? today : r);
  const segs = [];
  if (t.type === "broad") {
    segs.push({ label: "Broad Market", from: startR, to: today, color: "#5b3b9c" });
    return segs;
  }
  if (t.type === "combo") {
    const devEnd = find("dev-complete");
    segs.push({ label: "Dev", from: startR, to: end(devEnd), color: "#145365" });
    if (devEnd != null) {
      const qa = find("qaqc-pass");
      segs.push({ label: "QAQC", from: devEnd, to: end(qa), color: "#854f0b" });
    }
    const insStart = find("to-ins");
    const insEnd = find("ins-complete");
    if (insStart != null) segs.push({ label: "Insurance", from: insStart, to: end(insEnd), color: "#185fa5" });
  } else {
    segs.push({ label: "Insurance", from: startR, to: end(find("ins-complete")), color: "#185fa5" });
  }
  return segs;
}
