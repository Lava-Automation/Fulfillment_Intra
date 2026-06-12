import React, { useState, useMemo } from "react";
import { ResponsiveContainer, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";
import { Users, GraduationCap, Award, Building2, ClipboardCheck, AlertTriangle, Clock, Route, Radio } from "lucide-react";
import { C, FONT } from "../lib/theme.js";
import { TRAINEES } from "../data/trainees.js";
import { BROAD_TRAINEES } from "../data/trainees.js";
import { isDeployed, vaStatus } from "../lib/status.js";
import { allCerts } from "../lib/certs.js";
import { getEvents } from "../lib/events.js";
import { monthIdx, todayShort, MONTHS } from "../lib/dates.js";

const COMBO = "#e73835";
const GEN = "#145365";

function rptCurrentMonth() {
  return monthIdx(todayShort());
}
function labelsYTD() {
  return MONTHS.slice(0, rptCurrentMonth() + 1);
}
function msMonth(va, action) {
  const e = getEvents()
    .filter((x) => x.va === va && x.channel === "milestone" && x.action === action)
    .sort((a, b) => a.rank - b.rank)[0];
  return e ? monthIdx(e.date) : null;
}

const TABS = [
  ["overview", "Overview"],
  ["intake", "Intake & Pipeline"],
  ["completions", "Completions & Certs"],
  ["exams", "Quizzes & Exams"],
  ["pacing", "Time & Pacing"],
];
const RANGES = [["daily", "Day"], ["weekly", "Week"], ["monthly", "Month"], ["ytd", "YTD"]];

const BROAD = "#5b3b9c";

// broad VAs normalized for reporting (type tag; no dev/qaqc/ins phases)
const BROAD_RPT = BROAD_TRAINEES.map((b) => ({ ...b, type: "broad", devComplete: false, insComplete: false, qaqcStage: null }));

export default function Reports() {
  const [tab, setTab] = useState("overview");
  const [range, setRange] = useState("ytd");
  const [scope, setScope] = useState("all");

  const pool = useMemo(() => {
    if (scope === "combo") return TRAINEES.filter((t) => t.type === "combo");
    if (scope === "gen") return TRAINEES.filter((t) => t.type === "gen");
    if (scope === "broad") return BROAD_RPT;
    return [...TRAINEES, ...BROAD_RPT];
  }, [scope]);
  const sparse = range === "daily" || range === "weekly";
  const rangeLabel = { daily: "Today", weekly: "This week", monthly: "This month", ytd: "Year to date" }[range];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ display: "inline-flex", gap: 2, flexWrap: "wrap" }}>
          {TABS.map(([k, l]) => {
            const on = tab === k;
            return (
              <button key={k} onClick={() => setTab(k)} style={{ border: "none", background: on ? C.ink : "transparent", color: on ? "#fff" : C.sub, fontSize: 12, fontFamily: FONT.body, fontWeight: on ? 600 : 500, padding: "7px 13px", borderRadius: 8, cursor: "pointer" }}>{l}</button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "inline-flex", background: "#f0f0f0", borderRadius: 8, padding: 2 }}>
            {RANGES.map(([k, l]) => {
              const on = range === k;
              return <button key={k} onClick={() => setRange(k)} style={{ border: "none", background: on ? "#fff" : "transparent", color: on ? C.ink : C.sub, fontSize: 11, fontFamily: FONT.body, fontWeight: on ? 600 : 500, padding: "5px 11px", borderRadius: 6, cursor: "pointer", boxShadow: on ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>{l}</button>;
            })}
          </div>
          <div style={{ display: "inline-flex", gap: 2 }}>
            {[["all", "All"], ["combo", "Combo"], ["gen", "Gen"], ["broad", "Broad"]].map(([k, l]) => {
              const on = scope === k;
              return <button key={k} onClick={() => setScope(k)} style={{ border: "none", background: on ? C.ink : "transparent", color: on ? "#fff" : C.sub, fontSize: 12, fontFamily: FONT.body, fontWeight: on ? 600 : 500, padding: "7px 13px", borderRadius: 8, cursor: "pointer" }}>{l}</button>;
            })}
          </div>
        </div>
      </div>

      {sparse && (
        <div style={{ fontSize: 10.5, color: "#a8650f", background: "#fdf3e6", borderRadius: 8, padding: "8px 12px", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
          {rangeLabel} view is approximate. Day and week level data needs real timestamps, which come with the live build.
        </div>
      )}

      {tab === "overview" && <Overview pool={pool} scope={scope} range={range} />}
      {tab === "intake" && <Intake pool={pool} />}
      {tab === "completions" && <Completions pool={pool} scope={scope} />}
      {tab === "exams" && <Exams pool={pool} scope={scope} />}
      {tab === "pacing" && <Pacing pool={pool} />}

      <div style={{ fontSize: 10, color: "#bbb", marginTop: 20, maxWidth: 560, lineHeight: 1.5 }}>
        Derived from milestone, quiz/exam, and certification records logged in the tracker. Dates are approximate (2026); {rangeLabel.toLowerCase()} scope shown.
      </div>
    </div>
  );
}

function vaType(name) {
  const t = TRAINEES.find((x) => x.name === name);
  if (t) return t.type;
  if (BROAD_TRAINEES.some((b) => b.name === name)) return "broad";
  return null;
}
function certsScoped(scope) {
  return allCerts().filter((c) => c.status === "active" && (scope === "all" || vaType(c.va) === scope));
}
function eventsScoped(action, scope) {
  return getEvents().filter((e) => e.channel === "milestone" && e.action === action && (scope === "all" || vaType(e.va) === scope));
}

function Overview({ pool, scope }) {
  const started = pool.length;
  const insDone = pool.filter((t) => t.insComplete).length;
  const certs = certsScoped(scope).length;
  const deployed = pool.filter((t) => isDeployed(t)).length;
  const quizzes = eventsScoped("quiz", scope).length;
  const broadCount = pool.filter((t) => t.type === "broad").length;
  const incidents = getEvents().filter((e) => e.channel === "history" && e.action === "incident" && (scope === "all" || vaType(e.va) === scope)).length;
  const inTraining = pool.filter((t) => t.type === "broad" || (!isDeployed(t) && vaStatus(t) !== "fired")).length;

  const labels = labelsYTD();
  const startedSeries = labels.map((m, i) => ({
    m,
    combo: pool.filter((t) => t.type === "combo" && monthIdx(t.started) === i).length,
    gen: pool.filter((t) => t.type === "gen" && monthIdx(t.started) === i).length,
    broad: pool.filter((t) => t.type === "broad" && monthIdx(t.started) === i).length,
  }));
  let run = 0;
  const cum = labels.map((m, i) => {
    run += pool.filter((t) => msMonth(t.name, "ins-complete") === i).length + pool.filter((t) => msMonth(t.name, "certified") === i).length + pool.filter((t) => msMonth(t.name, "dev-complete") === i).length + pool.filter((t) => t.type === "broad" && msMonth(t.name, "completed") === i).length;
    return { m, v: run };
  });

  const tiles = [
    [Users, "Started", started, `${inTraining} still in training`],
    [GraduationCap, "Insurance complete", insDone, "through insurance"],
    [Award, "Certificates", certs, "master course passes"],
    [Building2, "Deployed", deployed, "live on a client book"],
    [ClipboardCheck, "Combo quizzes", quizzes, "passed post-meeting"],
  ];
  if (scope === "all" || scope === "broad") tiles.push([Radio, "Broad market", broadCount, "build-as-you-go VAs"]);
  tiles.push([AlertTriangle, "Incidents", incidents, "on record", true]);

  return (
    <>
      <StatRow items={tiles} />
      <Grid>
        <Panel title="VAs started" note="by month, by type"><StackedBars data={startedSeries} /></Panel>
        <Panel title="Cumulative completions" note="dev + insurance + certs + broad"><AreaTrend data={cum} /></Panel>
      </Grid>
    </>
  );
}

function Intake({ pool }) {
  const labels = labelsYTD();
  const startedSeries = labels.map((m, i) => ({
    m,
    combo: pool.filter((t) => t.type === "combo" && monthIdx(t.started) === i).length,
    gen: pool.filter((t) => t.type === "gen" && monthIdx(t.started) === i).length,
    broad: pool.filter((t) => t.type === "broad" && monthIdx(t.started) === i).length,
  }));
  const combos = pool.filter((t) => t.type === "combo");
  const funnel = [
    ["Started", pool.length],
    ["Dev done", combos.filter((t) => t.devComplete).length],
    ["QAQC passed", combos.filter((t) => t.qaqcStage === "completed").length],
    ["Insurance done", pool.filter((t) => t.insComplete).length],
    ["Deployed", pool.filter((t) => isDeployed(t)).length],
  ];
  const conv = pool.length ? Math.round((pool.filter((t) => isDeployed(t)).length / pool.length) * 100) : 0;
  return (
    <>
      <StatRow items={[
        [Users, "Total intake", pool.length, "VAs this year"],
        [Route, "Reached deploy", pool.filter((t) => isDeployed(t)).length, `${conv}% of intake`],
        [Clock, "Still in training", pool.filter((t) => t.type === "broad" || (!isDeployed(t) && vaStatus(t) !== "fired")).length, "active now"],
      ]} />
      <Grid>
        <Panel title="VAs started" note="by month, by type"><StackedBars data={startedSeries} /></Panel>
        <Panel title="Pipeline funnel" note="combo/gen phases · broad has no phases"><Funnel rows={funnel} /></Panel>
      </Grid>
    </>
  );
}

function Completions({ pool, scope }) {
  const labels = labelsYTD();
  const ins = labels.map((m, i) => ({ m, v: pool.filter((t) => msMonth(t.name, "ins-complete") === i).length }));
  const dev = labels.map((m, i) => ({ m, v: pool.filter((t) => msMonth(t.name, "dev-complete") === i).length }));
  const cert = labels.map((m, i) => ({ m, v: pool.filter((t) => msMonth(t.name, "certified") === i).length }));
  const courseCompletions = eventsScoped("completed", scope).length;
  return (
    <>
      <StatRow items={[
        [GraduationCap, "Dev complete", pool.filter((t) => t.devComplete).length, "combo dev side"],
        [GraduationCap, "Insurance complete", pool.filter((t) => t.insComplete).length, "through insurance"],
        [ClipboardCheck, "Course completions", courseCompletions, "all courses"],
        [Award, "Certificates", certsScoped(scope).length, "master course passes"],
      ]} />
      <Grid>
        <Panel title="Insurance completions" note="by month"><SimpleBars data={ins} color={GEN} /></Panel>
        <Panel title="Certificates issued" note="by month"><SimpleBars data={cert} color={COMBO} /></Panel>
        <Panel title="Dev completions" note="by month"><SimpleBars data={dev} color={GEN} /></Panel>
      </Grid>
    </>
  );
}

function Exams({ pool, scope }) {
  const quizzes = eventsScoped("quiz", scope);
  const exams = eventsScoped("exam", scope);
  const combosTotal = pool.filter((t) => t.type === "combo").length;
  const quizRate = combosTotal ? Math.round((quizzes.length / combosTotal) * 100) : 0;
  const examPass = exams.filter((e) => /pass/i.test(e.title)).length;
  const examFail = exams.length - examPass;
  const labels = labelsYTD();
  const quizSeries = labels.map((m, i) => ({ m, v: quizzes.filter((e) => monthIdx(e.date) === i).length }));
  const examSeries = labels.map((m, i) => ({ m, v: exams.filter((e) => monthIdx(e.date) === i).length }));
  return (
    <>
      <StatRow items={[
        [ClipboardCheck, "Combo quiz passes", quizzes.length, `${quizRate}% of combos`],
        [Award, "Exam takes", exams.length, "module exams"],
        [GraduationCap, "Exams passed", examPass, `${examFail} did not pass`],
      ]} />
      <Grid>
        <Panel title="Combo quiz passes" note="post-meeting quiz, by month"><SimpleBars data={quizSeries} color={GEN} /></Panel>
        <Panel title="Exam takes" note="module exams, by month"><SimpleBars data={examSeries} color={COMBO} /></Panel>
        <Panel title="Exam outcomes" note="pass vs not">
          <Funnel rows={[["Passed", examPass], ["Did not pass", examFail]]} lastColor={GEN} otherColor={COMBO} />
        </Panel>
      </Grid>
    </>
  );
}

function Pacing({ pool }) {
  const phases = [
    { phase: "Dev", from: "started", to: "dev-complete" },
    { phase: "QAQC", from: "dev-complete", to: "qaqc-pass" },
    { phase: "Insurance", from: "to-ins", to: "ins-complete" },
  ];
  const rows = phases.map((p) => {
    const gaps = [];
    pool.forEach((t) => {
      const a = p.from === "started" ? monthIdx(t.started) : msMonth(t.name, p.from);
      const b = msMonth(t.name, p.to);
      if (a != null && b != null && b >= a) gaps.push(b - a);
    });
    const avg = gaps.length ? gaps.reduce((x, y) => x + y, 0) / gaps.length : 0;
    return { phase: p.phase, months: Math.round(avg * 10) / 10, n: gaps.length };
  });
  const total = Math.round(rows.reduce((s, r) => s + r.months, 0) * 10) / 10;
  return (
    <>
      <StatRow items={[
        [Clock, "Avg dev phase", `${rows[0].months} mo`, `${rows[0].n} VAs measured`],
        [Clock, "Avg insurance phase", `${rows[2].months} mo`, `${rows[2].n} VAs measured`],
        [Route, "Full combo journey", `~${total} mo`, "start to insurance done"],
      ]} />
      <Grid>
        <Panel title="Average time in phase" note="months, combo journey">
          <Funnel rows={rows.map((r) => [r.phase, r.months])} unit=" mo" lastColor={GEN} otherColor={GEN} />
        </Panel>
      </Grid>
    </>
  );
}

// ---- shared bits ----
function StatRow({ items }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 16 }}>
      {items.map(([Icon, label, val, sub, accent], i) => (
        <div key={i} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: accent ? "#fdeceb" : "#e6eef1", color: accent ? COMBO : GEN, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon size={15} />
            </div>
            <span style={{ fontSize: 11, color: C.sub }}>{label}</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: accent ? COMBO : C.ink, lineHeight: 1, letterSpacing: "-0.02em" }}>{val}</div>
          <div style={{ fontSize: 10, color: "#aaa", marginTop: 5 }}>{sub}</div>
        </div>
      ))}
    </div>
  );
}
function Grid({ children }) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>{children}</div>;
}
function Panel({ title, note, children }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12, padding: "16px 18px 18px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{title}</span>
        {note && <span style={{ fontSize: 10, color: "#aaa" }}>{note}</span>}
      </div>
      {children}
    </div>
  );
}
function CTooltip({ active, payload, label, unit }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: C.ink, color: "#fff", borderRadius: 8, padding: "6px 10px", fontSize: 11, fontFamily: FONT.body }}>
      <div style={{ opacity: 0.7 }}>{label}</div>
      {payload.map((p, i) => <div key={i} style={{ fontWeight: 600 }}>{p.name}: {p.value}{unit || ""}</div>)}
    </div>
  );
}
function StackedBars({ data }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} barCategoryGap="28%">
        <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false} />
        <XAxis dataKey="m" tick={{ fontSize: 11, fill: C.sub }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: C.sub }} axisLine={false} tickLine={false} allowDecimals={false} width={22} />
        <Tooltip cursor={{ fill: "#f3f3f3" }} content={<CTooltip />} />
        <Bar dataKey="gen" name="Gen" stackId="a" fill={GEN} />
        <Bar dataKey="broad" name="Broad" stackId="a" fill={BROAD} />
        <Bar dataKey="combo" name="Combo" stackId="a" fill={COMBO} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
function SimpleBars({ data, color }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false} />
        <XAxis dataKey="m" tick={{ fontSize: 11, fill: C.sub }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: C.sub }} axisLine={false} tickLine={false} allowDecimals={false} width={22} />
        <Tooltip cursor={{ fill: "#f3f3f3" }} content={<CTooltip />} />
        <Bar dataKey="v" name="Count" fill={color} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
function AreaTrend({ data }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="cf" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GEN} stopOpacity={0.22} />
            <stop offset="100%" stopColor={GEN} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false} />
        <XAxis dataKey="m" tick={{ fontSize: 11, fill: C.sub }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: C.sub }} axisLine={false} tickLine={false} allowDecimals={false} width={22} />
        <Tooltip cursor={{ stroke: C.line }} content={<CTooltip />} />
        <Area type="monotone" dataKey="v" name="Completed" stroke={GEN} strokeWidth={2.5} fill="url(#cf)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
function Funnel({ rows, unit, lastColor = GEN, otherColor = "#3f7d8c" }) {
  const max = Math.max(1, ...rows.map((r) => r[1]));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9, paddingTop: 4 }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 100, fontSize: 11, color: "#444", textAlign: "right", flexShrink: 0 }}>{r[0]}</div>
          <div style={{ flex: 1, background: "#f4f4f6", borderRadius: 5, overflow: "hidden" }}>
            <div style={{ width: `${(r[1] / max) * 100}%`, height: 22, borderRadius: 5, background: i === rows.length - 1 ? lastColor : otherColor, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 8, color: "#fff", fontSize: 10, fontWeight: 600, minWidth: 22 }}>
              {r[1]}{unit || ""}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
