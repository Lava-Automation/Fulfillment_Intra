import React from "react";
import { C } from "../lib/theme.js";
import { COLORS } from "../data/org.js";
import { ini, healthVal, qaqcMarker } from "../lib/status.js";
import { courseChips, enrollDone, enrollPct } from "../lib/courses.js";
import { vaActivity } from "../lib/events.js";
import { ACT_TYPES } from "../lib/events.js";
import { TypeBadge } from "./Badge.jsx";

export function HealthDot({ h }) {
  const v = healthVal(h);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: v.dot }} />
      <span style={{ fontSize: 11, color: v.txt }}>{v.label}</span>
    </div>
  );
}

export function CourseChips({ t, side }) {
  const { chips, moreCount } = courseChips(t, side);
  if (!chips.length && !moreCount) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, margin: "8px 0 2px" }}>
      {chips.map((c, i) => (
        <span key={i} style={{ background: c.bg, color: c.fg, fontSize: 10, padding: "3px 8px", borderRadius: 20 }}>
          {c.done ? "✓ " : ""}{c.name} · {c.pct}%
        </span>
      ))}
      {moreCount > 0 && (
        <span style={{ background: "#f2f2f2", color: "#999", fontSize: 10, padding: "3px 8px", borderRadius: 20 }}>+{moreCount} more</span>
      )}
    </div>
  );
}

function LastTouch({ name }) {
  const a = vaActivity(name)[0];
  if (!a) return null;
  const m = ACT_TYPES[a.action] || { verb: a.action };
  const txt = `${a.actor} ${m.verb}${a.detail ? " " + a.detail : ""} · ${a.date}`;
  return (
    <div style={{ fontSize: 9, color: "#999", margin: "6px 0 2px", padding: "5px 8px", background: "#f8f8f8", borderRadius: 6, lineHeight: 1.3 }}>
      {txt}
    </div>
  );
}

const cardStyle = { background: C.white, border: `1px solid ${C.line}`, borderRadius: 12, padding: 16, cursor: "pointer" };

// Shared card header: avatar, full name (wraps cleanly), badge, optional marker top-right.
export function CardHead({ name, i, badge, marker, sub }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
      <div style={{ background: COLORS[i % COLORS.length], width: 32, height: 32, borderRadius: "50%", color: "#fff", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {ini(name)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, lineHeight: 1.25 }}>
          {name}
          {badge && <span style={{ marginLeft: 6, verticalAlign: "middle" }}>{badge}</span>}
        </div>
        {sub && <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>{sub}</div>}
      </div>
      {marker && <span style={{ flexShrink: 0 }}>{marker}</span>}
    </div>
  );
}

// Build-track combo card (meetings-based)
export function BuildCard({ t, i, onOpen }) {
  const md = t.meetingsDone || 0,
    mt = t.meetingsTarget || 10;
  const p = Math.round((md / mt) * 100);
  const qm = qaqcMarker(t);
  return (
    <div style={cardStyle} onClick={() => onOpen && onOpen(t.name, "crm")}>
      <CardHead name={t.name} i={i} badge={<TypeBadge type="combo" />} sub={t.agency} />
      <div style={{ display: "flex", gap: 18, marginBottom: 10 }}>
        <Meta label="Started" val={t.started} />
        <Meta label="Dev Trainer" val={t.devTrainer} />
      </div>
      <ProgRow label="Trainer meetings" right={`${md}/${mt}`} pct={p} color={C.teal} />
      <CourseChips t={t} side="crm" />
      <LastTouch name={t.name} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 9, borderTop: `1px solid ${C.line}`, gap: 6 }}>
        <HealthDot h={t.crmHealth} />
        {t.devComplete ? (
          <span style={{ background: "#e1f5ee", color: "#0f6e56", fontSize: 9, fontWeight: 600, padding: "3px 8px", borderRadius: 20 }}>Dev Complete</span>
        ) : qm ? (
          <span style={{ background: qm.bg, color: qm.fg, fontSize: 9, fontWeight: 600, padding: "3px 8px", borderRadius: 20 }}>{qm.label}</span>
        ) : (
          <span style={{ fontSize: 9, color: "#ccc" }}>In progress</span>
        )}
      </div>
    </div>
  );
}

// Endorsed card (flag-based) — per-team action item progress
export function EndorsedCard({ t, team, i, onOpen }) {
  const e = t.endorse[team];
  const items = e.items || [];
  const done = items.filter((x) => x.done).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;
  const oneoffs = (t.enrollments || []).filter((en) => {
    return false; // chips simplified here; one-offs shown in panel
  });
  const preview = items.slice(0, 3);
  const deployed = (t.devComplete && t.insComplete) || (t.type === "gen" && t.insComplete);
  return (
    <div style={cardStyle} onClick={() => onOpen && onOpen(t.name, team)}>
      <CardHead name={t.name} i={i} sub={t.agency}
        badge={<><TypeBadge type={t.type} />{deployed && <span style={{ background: "#e1f5ee", color: "#0f6e56", fontSize: 9, fontWeight: 600, padding: "2px 7px", borderRadius: 20, marginLeft: 6 }}>Deployed</span>}</>} />
      <div style={{ fontSize: 9, color: "#999", marginBottom: 8 }}>
        {e.synced ? `synced · ${e.by}` : `${e.by}`} · {e.date}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 4 }}>
        {preview.length ? (
          preview.map((it, idx) => (
            <div key={idx} style={{ fontSize: 11, color: "#555", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: it.done ? "#0f6e56" : "#ccc" }}>{it.done ? "●" : "○"}</span>
              <span style={{ textDecoration: it.done ? "line-through" : "none", color: it.done ? "#aaa" : "#555" }}>{it.t}</span>
            </div>
          ))
        ) : (
          <div style={{ fontSize: 10, color: "#ccc" }}>No action items yet.</div>
        )}
        {items.length > 3 && <div style={{ fontSize: 9, color: "#bbb", paddingLeft: 17 }}>+{items.length - 3} more</div>}
      </div>
      <ProgRow label="Action items" right={`${done}/${items.length}`} pct={pct} color="#a8650f" />
    </div>
  );
}

// Insurance training card (gen + handed-off combo)
export function InsCard({ t, i, p, onOpen }) {
  const wk = Math.max(1, t.type === "combo" ? t.week - 2 : t.week);
  return (
    <div style={cardStyle} onClick={() => onOpen && onOpen(t.name, "ins")}>
      <CardHead name={t.name} i={i + 1} badge={<TypeBadge type={t.type} />} sub={t.insTrainer} />
      <div style={{ display: "flex", gap: 18, marginBottom: 10 }}>
        <Meta label="Ins. Week" val={`Wk ${wk}`} />
        <Meta label="Client Agency" val={t.agency} />
      </div>
      <ProgRow label="Insurance 101" right={`${p}%`} pct={p} color="#185fa5" />
      <CourseChips t={t} side="ins" />
      <LastTouch name={t.name} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 9, borderTop: `1px solid ${C.line}`, gap: 6 }}>
        <HealthDot h={t.insHealth} />
        {t.insComplete ? (
          <span style={{ background: "#e1f5ee", color: "#0f6e56", fontSize: 9, fontWeight: 600, padding: "3px 8px", borderRadius: 20 }}>Insurance Complete</span>
        ) : (
          <span style={{ fontSize: 9, color: "#ccc" }}>In training</span>
        )}
      </div>
    </div>
  );
}

// Broad market VA card (checklist-driven)
export function BroadCard({ b, i, onOpen }) {
  const total = (b.checklist || []).length;
  const done = (b.checklist || []).filter((x) => x.done).length;
  const ap = total ? Math.round((done / total) * 100) : 0;
  return (
    <div style={cardStyle} onClick={() => onOpen && onOpen(b.name)}>
      <CardHead name={b.name} i={i} sub={b.agency}
        badge={<span style={{ background: "#efe7fa", color: "#5b3b9c", fontSize: 9, fontWeight: 600, padding: "2px 7px", borderRadius: 20 }}>Broad</span>} />
      <div style={{ display: "flex", gap: 18, marginBottom: 10 }}>
        <Meta label="Started" val={b.started} />
        <Meta label="Trainer" val={b.trainer} />
      </div>
      {(b.tools || []).length > 0 && (
        <>
          <div style={{ fontSize: 9, color: C.sub, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 5 }}>Tools & Courses</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
            {b.tools.map((tl, ti) => (
              <span key={ti} style={{ background: "#efe7fa", color: "#5b3b9c", fontSize: 9, padding: "3px 8px", borderRadius: 20 }}>{tl}</span>
            ))}
          </div>
        </>
      )}
      <div style={{ fontSize: 10, fontWeight: 600, color: C.ink, marginBottom: 6 }}>
        Action Items <span style={{ color: "#bbb", fontWeight: 400 }}>{done}/{total}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {(b.checklist || []).length ? (
          b.checklist.map((x, xi) => (
            <div key={xi} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11.5 }}>
              <span style={{ color: x.done ? "#5b3b9c" : "#ccc" }}>{x.done ? "●" : "○"}</span>
              <span style={{ textDecoration: x.done ? "line-through" : "none", color: x.done ? "#aaa" : "#555" }}>{x.t}</span>
            </div>
          ))
        ) : (
          <div style={{ fontSize: 10, color: "#ccc" }}>No items yet.</div>
        )}
      </div>
      <div style={{ height: 6, borderRadius: 4, background: "#eee", overflow: "hidden", marginTop: 10 }}>
        <div style={{ width: `${ap}%`, height: "100%", background: "#5b3b9c" }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
        <HealthDot h={b.health} />
        <span style={{ fontSize: 9, color: "#999" }}>{ap}% done</span>
      </div>
    </div>
  );
}

function Meta({ label, val }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: C.sub, textTransform: "uppercase", letterSpacing: "0.4px" }}>{label}</div>
      <div style={{ fontSize: 12, color: C.ink, marginTop: 1 }}>{val}</div>
    </div>
  );
}

function ProgRow({ label, right, pct, color }) {
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.sub, marginBottom: 4 }}>
        <span>{label}</span>
        <span style={{ fontWeight: 600 }}>{right}</span>
      </div>
      <div style={{ height: 6, borderRadius: 4, background: "#eee", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color }} />
      </div>
    </div>
  );
}
