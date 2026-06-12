// VA lifecycle status, deployment, and Dev Done gating — ported from the mockup.
import { CATALOG } from "../data/catalog.js";
import { enrollDone } from "./courses.js";

export function isDeployed(t) {
  if (t.type === "gen") return t.insComplete;
  return t.devComplete && t.insComplete;
}

export function vaStatus(t) {
  if (t.statusOverride === "fired") return "fired";
  if (t.statusOverride === "active-watch") return "active-watch";
  if (isDeployed(t)) return "deployed";
  return "in-training";
}

// A combo VA's master course (cert + QAQC gates Dev Done). One per combo VA.
export function masterCourse(t) {
  return t.masterCourse || "agencyzoom-mastery";
}
export function masterDone(t) {
  if (t.type !== "combo") return false;
  const en = (t.enrollments || []).find((e) => e.course === masterCourse(t));
  return en ? enrollDone(en) : false;
}
export function canMarkDevDone(t) {
  return t.type === "combo" && masterDone(t) && t.qaqcStage === "completed";
}
export function devDoneBlockReason(t) {
  if (!masterDone(t) && t.qaqcStage !== "completed") return "Awaiting final exam and QAQC";
  if (!masterDone(t)) {
    const mc = CATALOG[masterCourse(t)];
    return "Awaiting " + (mc ? mc.name : "master course") + " final exam";
  }
  if (t.qaqcStage !== "completed") return "Awaiting QAQC clearance";
  return "";
}

// Initials for avatars
export function ini(name) {
  return (name || "")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function devDoneWithCrm(t) {
  return t.devComplete && t.qaqcStage === "completed";
}

// health dot styling
export function healthVal(h) {
  const map = {
    "on-track": ["#145365", "On Track", "#0f6e56"],
    "needs-attention": ["#d98a1f", "Needs Attention", "#a8650f"],
    "at-risk": ["#e73835", "At Risk", "#a32d2d"],
  };
  const [dot, label, txt] = map[h] || map["on-track"];
  return { dot, label, txt };
}

// QAQC marker
export function qaqcMarker(t) {
  if (!t.qaqcStage) return null;
  const map = {
    "in-qaqc": ["#fdf0e6", "#a8650f", "In QAQC"],
    completed: ["#e1f5ee", "#0f6e56", "QAQC Done"],
    issues: ["#fce8e8", "#a32d2d", "QAQC Issues"],
  };
  const [bg, fg, label] = map[t.qaqcStage] || map["in-qaqc"];
  return { bg, fg, label };
}
