import React from "react";
import { C } from "../lib/theme.js";
import { TRAINEES, BROAD_TRAINEES } from "../data/trainees.js";
import { CATALOG, CAT_ORDER } from "../data/catalog.js";
import { isDeployed, vaStatus } from "../lib/status.js";
import { endorsedList } from "../lib/certs.js";

function Tile({ label, value, sub, accent }) {
  const color = accent === "r" ? C.red : accent === "t" ? C.teal : accent === "p" ? "#5b3b9c" : C.ink;
  return (
    <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12, padding: "14px 16px", flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 10.5, color: C.sub, textTransform: "uppercase", letterSpacing: "0.4px" }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1.1, marginTop: 4, letterSpacing: "-0.02em" }}>{value}</div>
      <div style={{ fontSize: 10, color: "#aaa", marginTop: 3 }}>{sub}</div>
    </div>
  );
}

export default function Metrics({ view }) {
  const combo = TRAINEES.filter((t) => t.type === "combo");
  const gen = TRAINEES.filter((t) => t.type === "gen");
  let tiles = [];

  if (view === "crm") {
    tiles = [
      ["Combo VAs", combo.filter((t) => !isDeployed(t)).length, "Active build", "r"],
      ["QAQC Issues", combo.filter((t) => t.qaqcStage === "issues").length, "Flagged"],
      ["Dev Complete", combo.filter((t) => t.devComplete).length, "Course done", "t"],
      ["Endorsed", endorsedList("crm").length, "To CRM Dev"],
    ];
  } else if (view === "insurance") {
    tiles = [
      ["Gen VAs", gen.filter((t) => !isDeployed(t)).length, "Active", "t"],
      ["Combo here", combo.filter((t) => t.devComplete && !isDeployed(t)).length, "Handed off", "r"],
      ["Endorsed", endorsedList("ins").length, "To Insurance"],
      ["Trainers", 2, "Leo, Aurealle"],
    ];
  } else if (view === "broad") {
    const allDone = BROAD_TRAINEES.filter((b) => b.checklist.length && b.checklist.every((x) => x.done)).length;
    const trainers = [...new Set(BROAD_TRAINEES.map((b) => b.trainer))].length;
    const openItems = BROAD_TRAINEES.reduce((s, b) => s + b.checklist.filter((x) => !x.done).length, 0);
    tiles = [
      ["In Training", BROAD_TRAINEES.length, "Broad market VAs", "p"],
      ["Trainers", trainers, "Shared across teams"],
      ["All Items Done", allDone, "Checklist complete", "t"],
      ["Open Items", openItems, "Across all VAs", "r"],
    ];
  } else if (view === "directory") {
    tiles = [
      ["All VAs", TRAINEES.length, "Full history"],
      ["Deployed", TRAINEES.filter((t) => vaStatus(t) === "deployed").length, "Active clients", "t"],
      ["In Training", TRAINEES.filter((t) => vaStatus(t) === "in-training").length, "Pipeline", "r"],
      ["Active Watch", TRAINEES.filter((t) => vaStatus(t) === "active-watch").length, "Flagged"],
    ];
  } else if (view === "catalog") {
    const courses = Object.keys(CATALOG);
    const cats = CAT_ORDER.filter((k) => courses.some((ck) => CATALOG[ck].category === k)).length;
    tiles = [
      ["Courses", courses.length, "In catalog"],
      ["Certified Courses", courses.filter((k) => CATALOG[k].cert).length, "Issue a cert", "r"],
      ["Categories", cats, "Course types", "t"],
      ["Total Modules", courses.reduce((s, k) => s + CATALOG[k].modules.length, 0), "Across all courses"],
    ];
  } else {
    // dashboard
    const onsite = TRAINEES.filter((t) => !isDeployed(t) && vaStatus(t) !== "fired");
    tiles = [
      ["All Onsite", onsite.length, "In training"],
      ["Combo VAs", combo.filter((t) => !isDeployed(t)).length, "Both depts", "r"],
      ["Gen VAs", gen.filter((t) => !isDeployed(t)).length, "Insurance only", "t"],
      ["Broad VAs", BROAD_TRAINEES.length, "Build-as-you-go", "p"],
      ["New This Week", TRAINEES.filter((t) => t.week === 1).length, "Just started"],
    ];
  }

  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
      {tiles.map((t, i) => (
        <Tile key={i} label={t[0]} value={t[1]} sub={t[2]} accent={t[3]} />
      ))}
    </div>
  );
}
