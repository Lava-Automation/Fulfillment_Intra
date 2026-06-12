import React, { useState } from "react";
import { X, Mail, Phone, Plus, Pencil, Check } from "lucide-react";
import { C, FONT } from "../lib/theme.js";
import { TRAINEES, BROAD_TRAINEES } from "../data/trainees.js";
import { CATALOG, CAT_META, SKILL_GROUPS } from "../data/catalog.js";
import { COLORS, TLS, DEV_TRAINERS, INS_TRAINERS, CURRENT_USER } from "../data/org.js";
import { ini, vaStatus, isDeployed, canMarkDevDone, devDoneBlockReason, masterDone, masterCourse, healthVal } from "../lib/status.js";
import { courseLessons, enrollPct, enrollDone, enrollDoneCount, courseLessonCount, moduleDone, moduleDoneCount } from "../lib/courses.js";
import { insPct, INS_MODULES, unifiedSegments } from "../lib/progress.js";
import { isEndorsed, isEndorsedTo, endorseItems, setEndorse } from "../lib/certs.js";
import { vaActivity, vaMilestones, vaHistory, ACT_TYPES, logActivity, historyEntry } from "../lib/events.js";
import { bumpData } from "../lib/store.js";
import { can, canCourse } from "../lib/permissions.js";
import { fmtDate, parseStart, wfhDate, regDate } from "../lib/dates.js";
import { getNotes, addNote, getUploads, allSkills, skillGroup } from "../lib/panelData.js";
import { UnifiedBar } from "./UnifiedBar.jsx";

const STATUS_BADGE = {
  "in-training": ["#e6f1fb", "#185fa5", "In Training"],
  deployed: ["#e1f5ee", "#0f6e56", "Deployed"],
  "active-watch": ["#fdf0e6", "#a8650f", "Active Watch"],
  fired: ["#fce8e8", "#a32d2d", "Fired"],
};

export default function VAPanel({ open, role, onClose }) {
  const [, force] = useState(0);
  const bump = () => force((n) => n + 1);

  if (!open) return null;
  const broad = open.source === "broad";
  const t = broad ? BROAD_TRAINEES.find((x) => x.name === open.name) : TRAINEES.find((x) => x.name === open.name);
  if (!t) return null;
  const idx = (broad ? BROAD_TRAINEES : TRAINEES).indexOf(t);

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.32)", zIndex: 60 }} />
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100vh",
          width: 520,
          maxWidth: "94vw",
          background: "#fff",
          zIndex: 61,
          boxShadow: "-8px 0 30px rgba(0,0,0,0.12)",
          display: "flex",
          flexDirection: "column",
          fontFamily: FONT.body,
        }}
      >
        <PanelHeader t={t} idx={idx} broad={broad} onClose={onClose} />
        {broad ? (
          <BroadBody b={t} role={role} bump={bump} />
        ) : (
          <ComboGenBody t={t} role={role} source={open.source} bump={bump} />
        )}
      </div>
    </>
  );
}

function PanelHeader({ t, idx, broad, onClose }) {
  const status = broad ? null : vaStatus(t);
  const sb = status ? STATUS_BADGE[status] : null;
  return (
    <div style={{ padding: "22px 22px 16px", borderBottom: `1px solid ${C.line}`, display: "flex", alignItems: "flex-start", gap: 13, background: "#fff", flexShrink: 0 }}>
      <div style={{ background: COLORS[idx % COLORS.length], width: 44, height: 44, borderRadius: "50%", color: "#fff", fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {ini(t.name)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: C.ink, display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", lineHeight: 1.2 }}>
          {t.name}
          {!broad && (
            <span style={{ background: t.type === "combo" ? "#fce8e8" : "#e1f0f5", color: t.type === "combo" ? "#a32d2d" : "#0c447c", fontSize: 9, fontWeight: 600, padding: "2px 7px", borderRadius: 20 }}>
              {t.type === "combo" ? "Combo" : "Gen"}
            </span>
          )}
          {broad && <span style={{ background: "#efe7fa", color: "#5b3b9c", fontSize: 9, fontWeight: 600, padding: "2px 7px", borderRadius: 20 }}>Broad</span>}
          {sb && <span style={{ background: sb[0], color: sb[1], fontSize: 9, fontWeight: 600, padding: "2px 7px", borderRadius: 20 }}>{sb[2]}</span>}
        </div>
        <div style={{ fontSize: 12, color: C.sub, marginTop: 3 }}>{t.agency}</div>
      </div>
      <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: C.sub, padding: 4 }}>
        <X size={18} />
      </button>
    </div>
  );
}

function TabBar({ tabs, tab, setTab }) {
  return (
    <div style={{ display: "flex", gap: 1, padding: "0 14px", borderBottom: `1px solid ${C.line}`, overflowX: "auto", flexShrink: 0, scrollbarWidth: "none", background: "#fff" }}>
      {tabs.map(([k, l]) => {
        const on = tab === k;
        return (
          <button
            key={k}
            onClick={() => setTab(k)}
            style={{
              border: "none",
              background: "transparent",
              borderBottom: on ? `2px solid ${C.teal}` : "2px solid transparent",
              color: on ? C.ink : C.sub,
              fontFamily: FONT.body,
              fontSize: 12,
              fontWeight: on ? 600 : 500,
              padding: "11px 9px",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}

// ---------- combo/gen body ----------
function ComboGenBody({ t, role, source, bump }) {
  const end = isEndorsed(t);
  const tabs = [["contact", "Contact"]];
  if (source === "dir") tabs.push(["skills", "Skills"]);
  tabs.push(["courses", "Courses"], ["notes", "Notes"], ["milestones", "Milestones"]);
  if (source === "crm" || source === "ins") tabs.push(["activity", "Activity"]);
  if (source === "dir") tabs.push(["history", "History"]);
  if (end) tabs.push(["endorsed", "Endorsed"]);
  tabs.push(["uploads", "Uploads"]);

  const [tab, setTab] = useState("contact");
  return (
    <>
      <TabBar tabs={tabs} tab={tab} setTab={setTab} />
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 32px", background: "#f7f7f9" }}>
        {tab === "contact" && <ContactTab t={t} role={role} source={source} bump={bump} />}
        {tab === "skills" && <SkillsTab t={t} role={role} bump={bump} />}
        {tab === "courses" && <CoursesTab t={t} role={role} source={source} bump={bump} />}
        {tab === "notes" && <NotesTab t={t} bump={bump} />}
        {tab === "milestones" && <FeedTab events={vaMilestones(t.name)} kind="milestone" empty="No milestones yet." />}
        {tab === "activity" && <FeedTab events={vaActivity(t.name)} kind="activity" empty="No activity yet." />}
        {tab === "history" && <HistoryTab t={t} role={role} bump={bump} />}
        {tab === "endorsed" && <EndorsedTab t={t} role={role} bump={bump} />}
        {tab === "uploads" && <UploadsTab t={t} />}
      </div>
    </>
  );
}

function Sec({ title, children, right }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12, padding: "14px 16px", marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: C.ink, textTransform: "uppercase", letterSpacing: "0.7px" }}>{title}</div>
        {right}
      </div>
      {children}
    </div>
  );
}
function Row({ label, children, last }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", fontSize: 12.5, borderBottom: last ? "none" : `1px solid #f0f0f2` }}>
      <span style={{ color: C.sub }}>{label}</span>
      <span style={{ color: C.ink, textAlign: "right", fontWeight: 500 }}>{children}</span>
    </div>
  );
}

function ContactTab({ t, role, source, bump }) {
  const [editScope, setEditScope] = useState(false);
  const [scopeText, setScopeText] = useState(t.scope || "");
  const canScope = can(role, "editScope");

  return (
    <div>
      <Sec title="Contact">
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", fontSize: 12.5 }}><Mail size={14} color={C.sub} /> {t.email}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", fontSize: 12.5 }}><Phone size={14} color={C.sub} /> {t.phone}</div>
      </Sec>

      <Sec title="Scope" right={canScope && !editScope ? <button onClick={() => setEditScope(true)} style={iconBtn}><Pencil size={12} /></button> : null}>
        {editScope ? (
          <div>
            <textarea
              value={scopeText}
              onChange={(e) => setScopeText(e.target.value)}
              style={{ width: "100%", minHeight: 70, border: `1px solid ${C.line}`, borderRadius: 8, padding: 8, fontSize: 12, fontFamily: FONT.body, resize: "vertical" }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <button onClick={() => { t.scope = scopeText; setEditScope(false); bump(); }} style={smallBtn}>Save</button>
              <button onClick={() => { setScopeText(t.scope || ""); setEditScope(false); }} style={{ ...smallBtn, background: "#f0f0f0", color: "#555" }}>Cancel</button>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 12.5, color: t.scope ? C.ink : "#bbb", lineHeight: 1.5 }}>{t.scope || "No scope set."}</div>
        )}
      </Sec>

      <Sec title="Details">
        <Row label="Start Date">{fmtDate(parseStart(t.started))}</Row>
        <Row label="WFH Date">{fmtDate(wfhDate(t.started))}</Row>
        <Row label="Regularization">{fmtDate(regDate(t.started))}</Row>
        {t.type === "combo" && (
          <Row label="Combo Quiz">
            <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: t.quiz === "passed" ? "#e1f5ee" : t.quiz === "failed" ? "#fce8e8" : "#eef0f2", color: t.quiz === "passed" ? "#0f6e56" : t.quiz === "failed" ? "#a32d2d" : "#888" }}>
              {t.quiz === "passed" ? "Passed" : t.quiz === "failed" ? "Failed" : "Not taken"}
            </span>
          </Row>
        )}
      </Sec>

      <Sec title="Association">
        <Row label="Sales Rep">{t.salesRep || "—"}</Row>
        <Row label="Account Mgr">{t.am || "—"}</Row>
        {t.type === "combo" && <Row label="Project Mgr">{t.pm || "—"}</Row>}
        <Row label="Team Lead">{t.tl || "—"}</Row>
        {t.type === "combo" && <Row label="Dev Trainer">{t.devTrainer}</Row>}
        <Row label="Ins. Trainer">{t.insTrainer === "—" ? "Pending handoff" : t.insTrainer}</Row>
      </Sec>

      <StatusSection t={t} role={role} source={source} bump={bump} />
    </div>
  );
}

function StatusSection({ t, role, source, bump }) {
  const onDash = source === "dash";
  const onCrm = source === "crm" || source === "endorsed";
  const onIns = source === "ins";
  const showCrm = (onDash || onCrm) && t.type === "combo";
  const showIns = onDash || onIns;
  const canCrmHealth = onCrm && can(role, "editCrmHealth");
  const canInsHealth = onIns && can(role, "editInsHealth");
  const canDev = onCrm && can(role, "markDevDone");
  const canIns = onIns && can(role, "markInsDone");

  return (
    <>
      {onDash && (
        <Sec title="Progress">
          <UnifiedBar t={t} />
          {t.type === "combo" && (
            <div style={{ fontSize: 10, color: "#888", marginTop: 8 }}>
              Trainer meetings: <b>{t.meetingsDone || 0}/{t.meetingsTarget || 10}</b> · synced from trainer app
            </div>
          )}
        </Sec>
      )}

      {(showCrm || showIns) && (
        <Sec title="Training Health">
          {showCrm && <HealthSelector label="CRM Health" value={t.crmHealth} editable={canCrmHealth} onSet={(v) => { t.crmHealth = v; bump(); }} />}
          {showIns && <HealthSelector label="Insurance Health" value={t.insHealth} editable={canInsHealth} onSet={(v) => { t.insHealth = v; bump(); }} />}
        </Sec>
      )}

      {(onDash || onCrm) && t.type === "combo" && (
        <>
          <Sec title="QAQC">
            {!t.qaqcStage ? (
              <span style={{ fontSize: 11, color: "#aaa" }}>Awaiting endorsement in training app</span>
            ) : (
              <span style={{ fontSize: 11, color: t.qaqcStage === "completed" ? "#0f6e56" : t.qaqcStage === "issues" ? "#a32d2d" : "#a8650f" }}>
                {t.qaqcStage === "completed" ? "QAQC Completed" : t.qaqcStage === "issues" ? "QAQC Issues Found" : "In QAQC — under review"}
                <span style={{ color: "#bbb", marginLeft: 6 }}>· synced</span>
              </span>
            )}
          </Sec>
          <Sec title="Dev Completion">
            <DevAction t={t} canDev={canDev} bump={bump} />
          </Sec>
        </>
      )}

      {(onDash || onIns) && (
        <Sec title="Insurance Completion">
          <InsAction t={t} canIns={canIns} bump={bump} />
        </Sec>
      )}

      {onDash && <div style={{ fontSize: 9, color: "#bbb" }}>Health and completion are set by the owning training team. View only here.</div>}
    </>
  );
}

function HealthSelector({ label, value, editable, onSet }) {
  const opts = ["on-track", "needs-attention", "at-risk"];
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 10, color: C.sub, marginBottom: 5 }}>{label}</div>
      {editable ? (
        <div style={{ display: "flex", gap: 6 }}>
          {opts.map((o) => {
            const v = healthVal(o);
            const on = value === o;
            return (
              <button
                key={o}
                onClick={() => onSet(o)}
                style={{ border: on ? `1.5px solid ${v.dot}` : `1px solid ${C.line}`, background: on ? "#fff" : "#fafafa", color: v.txt, fontSize: 10, padding: "5px 9px", borderRadius: 7, cursor: "pointer", fontFamily: FONT.body, display: "flex", alignItems: "center", gap: 5 }}
              >
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: v.dot }} />
                {v.label}
              </button>
            );
          })}
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: healthVal(value).dot }} />
          <span style={{ fontSize: 11, color: healthVal(value).txt }}>{healthVal(value).label}</span>
        </div>
      )}
    </div>
  );
}

function DevAction({ t, canDev, bump }) {
  if (t.devComplete)
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={chip("#e1f5ee", "#0f6e56")}>Dev Complete</span>
        {masterDone(t) && <span style={chip("#e1f5ee", "#0f6e56")}>{CATALOG[masterCourse(t)] ? CATALOG[masterCourse(t)].name : "Master"} certified</span>}
        {canDev && <button onClick={() => { t.devComplete = false; bump(); }} style={revokeBtn}>Revoke</button>}
      </div>
    );
  if (canDev) {
    const ok = canMarkDevDone(t);
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <button disabled={!ok} onClick={() => { if (ok) { t.devComplete = true; bump(); } }} style={ok ? actBtn : { ...actBtn, opacity: 0.45, cursor: "not-allowed" }}>Mark Dev Done</button>
        {!ok && <span style={{ fontSize: 10, color: C.sub }}>{devDoneBlockReason(t)}</span>}
      </div>
    );
  }
  return <span style={{ fontSize: 11, color: "#aaa" }}>Dev not complete</span>;
}

function InsAction({ t, canIns, bump }) {
  const allDone = (t.ins || []).length >= INS_MODULES.length;
  if (t.insComplete)
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={chip("#e1f5ee", "#0f6e56")}>Insurance Complete</span>
        {canIns && <button onClick={() => { t.insComplete = false; bump(); }} style={revokeBtn}>Revoke</button>}
      </div>
    );
  if (canIns)
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <button disabled={!allDone} onClick={() => { if (allDone) { t.insComplete = true; bump(); } }} style={allDone ? actBtn : { ...actBtn, opacity: 0.45, cursor: "not-allowed" }}>Mark Ins Done</button>
        {!allDone && <span style={{ fontSize: 10, color: C.sub }}>Complete all modules first</span>}
      </div>
    );
  return <span style={{ fontSize: 11, color: "#aaa" }}>Insurance not complete</span>;
}

// ---------- Courses ----------
function CoursesTab({ t, role, source, bump }) {
  const ens = t.enrollments || [];
  if (!ens.length) return <Empty>No course enrollments yet.</Empty>;
  const cats = [["crm", "CRM"], ["insurance", "Insurance"], ["other", "Other Courses"]];
  const canModEdit = source === "crm" && canCourse(role, "crm", "enroll");
  const canInsEdit = source === "ins" && canCourse(role, "insurance", "enroll");

  return (
    <div>
      {cats.map(([key, label]) => {
        let list;
        if (key === "other") list = ens.filter((e) => CATALOG[e.course] && ["general", "oneoff"].includes(CATALOG[e.course].category));
        else list = ens.filter((e) => CATALOG[e.course] && CATALOG[e.course].category === key);
        if (!list.length) return null;
        return (
          <Sec key={key} title={label}>
            {list.map((en) => {
              const c = CATALOG[en.course];
              const editable = (c.category === "crm" && canModEdit) || (c.category === "insurance" && canInsEdit);
              return <EnrollCard key={en.course} t={t} en={en} c={c} editable={editable} bump={bump} />;
            })}
          </Sec>
        );
      })}
    </div>
  );
}

function EnrollCard({ t, en, c, editable, bump }) {
  const [openCard, setOpenCard] = useState(false);
  const pct = enrollPct(en);
  const done = enrollDone(en);
  const cm = CAT_META[c.category] || {};
  return (
    <div style={{ border: `1px solid ${C.line}`, borderRadius: 10, marginBottom: 8, overflow: "hidden" }}>
      <div onClick={() => setOpenCard((o) => !o)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 13px", cursor: "pointer" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: C.ink }}>{c.name}{c.category === "oneoff" && <span style={{ ...chip("#fdf0dd", "#a8650f"), marginLeft: 6 }}>added</span>}</div>
          <div style={{ fontSize: 10.5, color: C.sub }}>{cm.label} · {enrollDoneCount(en)}/{courseLessonCount(en.course)} lessons{c.cert ? " · issues certificate" : ""}</div>
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: cm.chipFg || C.teal }}>{done ? "✓ " : ""}{pct}%</div>
      </div>
      {openCard && (
        <div style={{ padding: "0 13px 11px" }}>
          {c.modules.map((m, mi) => (
            <ModuleBlock key={m.id} en={en} m={m} mi={mi} editable={editable} bump={bump} />
          ))}
          {c.cert && (
            <div style={{ marginTop: 8, padding: "8px 10px", borderRadius: 8, background: done ? "#e1f5ee" : "#f4f4f6", fontSize: 10.5, color: done ? "#0f6e56" : "#888" }}>
              {done ? "✓ Certificate earned on final exam pass" : "Certificate earned on passing the final exam"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ModuleBlock({ en, m, mi, editable, bump }) {
  const [open, setOpen] = useState(false);
  const mDone = moduleDone(en, m);
  return (
    <div style={{ marginTop: 8 }}>
      <div onClick={() => setOpen((o) => !o)} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
        <div style={{ width: 20, height: 20, borderRadius: 6, background: mDone ? C.teal : "#eee", color: mDone ? "#fff" : "#888", fontSize: 10, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {mDone ? "✓" : mi + 1}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: C.ink }}>{m.name}</div>
          <div style={{ fontSize: 10, color: C.sub }}>{moduleDoneCount(en, m)}/{m.lessons.length} lessons</div>
        </div>
      </div>
      {open && (
        <div style={{ paddingLeft: 28, marginTop: 4 }}>
          {m.lessons.map((l) => {
            const ldone = en.completed.includes(l.id);
            return (
              <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0" }}>
                <button
                  disabled={!editable}
                  onClick={() => {
                    if (!editable) return;
                    if (ldone) en.completed = en.completed.filter((x) => x !== l.id);
                    else en.completed = [...en.completed, l.id];
                    bump();
                  }}
                  style={{ border: "none", background: "transparent", cursor: editable ? "pointer" : "default", padding: 0, color: ldone ? "#0f6e56" : "#ccc", fontSize: 15 }}
                >
                  {ldone ? "●" : "○"}
                </button>
                <span style={{ fontSize: 11.5, color: ldone ? "#aaa" : "#555", textDecoration: ldone ? "line-through" : "none" }}>{l.name}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------- Skills ----------
function SkillsTab({ t, role, bump }) {
  const canGrant = can(role, "grantSkill");
  const [grp, setGrp] = useState(SKILL_GROUPS[0].id);
  const [label, setLabel] = useState("");
  const s = allSkills(t);

  const grant = () => {
    if (!label.trim()) return;
    if (!t.manualSkills) t.manualSkills = [];
    t.manualSkills.push({ cat: grp, label: label.trim(), by: CURRENT_USER, date: "Jun 11" });
    logActivity(t.name, CURRENT_USER, "skill", label.trim());
    setLabel("");
    bumpData();
    bump && bump();
  };

  return (
    <div>
      {SKILL_GROUPS.map((g) => {
        const arr = s[g.id] || [];
        return (
          <Sec key={g.id} title={g.label}>
            {arr.length ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {arr.map((x, i) => (
                  <span key={i} style={chip(g.chipBg || "#eef0f2", g.chipFg || "#555")} title={x.by ? `Granted by ${x.by}${x.date ? " · " + x.date : ""}` : ""}>
                    {x.label}{!x.auto && "*"}
                  </span>
                ))}
              </div>
            ) : (
              <span style={{ fontSize: 10, color: "#ccc" }}>None</span>
            )}
          </Sec>
        );
      })}
      <div style={{ fontSize: 9, color: "#bbb", marginBottom: canGrant ? 14 : 0 }}>* manually added</div>
      {canGrant && (
        <div style={{ border: `1px solid ${C.line}`, borderRadius: 9, padding: 12 }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: C.sub, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Grant a skill</div>
          <div style={{ display: "flex", gap: 6 }}>
            <select value={grp} onChange={(e) => setGrp(e.target.value)} style={{ border: `1px solid ${C.line}`, borderRadius: 7, padding: "7px 8px", fontSize: 11, fontFamily: FONT.body }}>
              {SKILL_GROUPS.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
            </select>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Skill name…" style={{ flex: 1, border: `1px solid ${C.line}`, borderRadius: 7, padding: "7px 9px", fontSize: 11, fontFamily: FONT.body }} />
            <button onClick={grant} style={{ ...smallBtn, padding: "7px 12px" }}>Grant</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Notes ----------
const MENTIONABLE = ["Marky Pandatu", "Karla Jardeloza", "Gui Rubis", "Jonas Rosauro", "Elijah Bautista", "RP Patlonag", "Leo Cesar Maboloc", "Aurealle Sagarino"];

// render note text with @mentions highlighted
function renderNoteText(text) {
  const parts = String(text).split(/(@[A-Za-z]+(?:\s[A-Za-z]+)?)/g);
  return parts.map((part, i) => {
    if (part.startsWith("@")) {
      const name = part.slice(1).trim().toLowerCase();
      const matched = MENTIONABLE.some((m) => m.toLowerCase().startsWith(name) || m.toLowerCase().split(" ")[0] === name);
      if (matched) return <span key={i} style={{ color: C.teal, fontWeight: 600, background: "#e6eef1", borderRadius: 4, padding: "0 3px" }}>{part}</span>;
    }
    return <span key={i}>{part}</span>;
  });
}

function NotesTab({ t, bump }) {
  const [text, setText] = useState("");
  const [isTodo, setIsTodo] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const notes = getNotes(t.name);

  const detectMentions = (str) => MENTIONABLE.filter((m) => {
    const first = m.toLowerCase().split(" ")[0];
    return str.toLowerCase().includes("@" + first) || str.toLowerCase().includes("@" + m.toLowerCase());
  });

  const add = () => {
    if (!text.trim()) return;
    addNote(t.name, { text: text.trim(), by: CURRENT_USER, date: "Jun 11", todo: isTodo, done: false, mentions: detectMentions(text) });
    setText(""); setIsTodo(false); setShowMentions(false); bump();
  };
  const insertMention = (name) => {
    const first = name.split(" ")[0];
    setText((tx) => (tx.endsWith("@") ? tx + first + " " : tx + (tx && !tx.endsWith(" ") ? " " : "") + "@" + first + " "));
    setShowMentions(false);
  };

  const todos = notes.filter((n) => n.todo);
  const openTodos = todos.filter((n) => !n.done).length;

  return (
    <div>
      <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 10, padding: 12, marginBottom: 12 }}>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={isTodo ? "Add a todo… use @ to mention" : "Add a note… use @ to mention"} style={{ width: "100%", border: `1px solid ${C.line}`, borderRadius: 8, padding: "8px 10px", fontSize: 12, fontFamily: FONT.body, minHeight: 46, resize: "vertical", boxSizing: "border-box" }} />
        {showMentions && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
            {MENTIONABLE.map((m) => (
              <button key={m} onClick={() => insertMention(m)} style={{ border: `1px solid ${C.line}`, background: "#fff", color: C.teal, fontSize: 10.5, padding: "3px 8px", borderRadius: 14, cursor: "pointer", fontFamily: FONT.body }}>@{m.split(" ")[0]}</button>
            ))}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: C.sub, cursor: "pointer" }}>
            <input type="checkbox" checked={isTodo} onChange={(e) => setIsTodo(e.target.checked)} /> Make a todo
          </label>
          <button onClick={() => setShowMentions((s) => !s)} style={{ border: "none", background: "transparent", color: C.teal, fontSize: 11.5, cursor: "pointer", fontFamily: FONT.body }}>@ Mention</button>
          <div style={{ flex: 1 }} />
          <button onClick={add} style={smallBtn}>Add</button>
        </div>
      </div>

      {todos.length > 0 && (
        <div style={{ fontSize: 10, color: C.sub, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
          Todos <span style={{ color: openTodos ? "#a8650f" : "#0f6e56" }}>{openTodos} open</span> · {todos.length - openTodos} done
        </div>
      )}

      {notes.length ? (
        notes.map((n, i) => (
          <div key={i} style={{ display: "flex", gap: 9, padding: "10px 12px", border: `1px solid ${C.line}`, borderRadius: 9, marginBottom: 8, background: "#fff" }}>
            {n.todo && (
              <button onClick={() => { n.done = !n.done; bump(); }} style={{ border: "none", background: "transparent", cursor: "pointer", color: n.done ? "#0f6e56" : "#ccc", fontSize: 16, padding: 0, flexShrink: 0, lineHeight: 1 }}>
                {n.done ? "☑" : "☐"}
              </button>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, color: n.done ? "#aaa" : C.ink, lineHeight: 1.4, textDecoration: n.done ? "line-through" : "none" }}>
                {n.todo && <span style={{ fontSize: 8.5, fontWeight: 700, color: "#a8650f", background: "#fdf0dd", padding: "1px 6px", borderRadius: 10, marginRight: 6, textTransform: "uppercase", letterSpacing: "0.4px" }}>Todo</span>}
                {renderNoteText(n.text)}
              </div>
              <div style={{ fontSize: 9.5, color: C.sub, marginTop: 5 }}>
                {n.by} · {n.date}
                {n.mentions && n.mentions.length > 0 && <span> · to {n.mentions.map((m) => m.split(" ")[0]).join(", ")}</span>}
              </div>
            </div>
          </div>
        ))
      ) : (
        <Empty>No notes yet.</Empty>
      )}
    </div>
  );
}

// ---------- History (with manager actions) ----------
function HistoryTab({ t, role, bump }) {
  const canAct = can(role, "endorse");
  const [mode, setMode] = useState(null); // 'incident' | 'endorse'
  const [text, setText] = useState("");

  const doIncident = () => {
    if (!text.trim()) return;
    historyEntry(t.name, "incident", "Incident report filed · " + text.trim(), "Jun 11", "HR");
    setText(""); setMode(null); bumpData(); bump();
  };
  const doEndorse = (team) => {
    setEndorse(t, team, CURRENT_USER, false);
    historyEntry(t.name, "certified", `Endorsed to ${team === "crm" ? "CRM Dev" : "Insurance"}`, "Jun 11", CURRENT_USER);
    setMode(null); bumpData(); bump();
  };

  return (
    <div>
      {canAct && (
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <button onClick={() => setMode(mode === "endorse" ? null : "endorse")} style={smallBtn}>Endorse</button>
          <button onClick={() => setMode(mode === "incident" ? null : "incident")} style={{ ...smallBtn, background: "#fff", color: "#a32d2d", border: `1px solid ${C.line}` }}>File incident</button>
        </div>
      )}
      {mode === "incident" && (
        <div style={{ border: `1px solid ${C.line}`, borderRadius: 9, padding: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: C.sub, marginBottom: 6 }}>Incident summary</div>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Attendance, missed deadline…" style={{ width: "100%", border: `1px solid ${C.line}`, borderRadius: 7, padding: "7px 9px", fontSize: 12, fontFamily: FONT.body, boxSizing: "border-box", marginBottom: 8 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={doIncident} style={{ ...smallBtn, background: "#a32d2d" }}>File</button>
            <button onClick={() => setMode(null)} style={{ ...smallBtn, background: "#f0f0f0", color: "#555" }}>Cancel</button>
          </div>
        </div>
      )}
      {mode === "endorse" && (
        <div style={{ border: `1px solid ${C.line}`, borderRadius: 9, padding: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: C.sub, marginBottom: 8 }}>Endorse to a team for a one-off course, custom training, or retraining.</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button disabled={isEndorsedTo(t, "crm")} onClick={() => doEndorse("crm")} style={{ ...smallBtn, opacity: isEndorsedTo(t, "crm") ? 0.4 : 1 }}>CRM Dev{isEndorsedTo(t, "crm") ? " ✓" : ""}</button>
            <button disabled={isEndorsedTo(t, "ins")} onClick={() => doEndorse("ins")} style={{ ...smallBtn, opacity: isEndorsedTo(t, "ins") ? 0.4 : 1 }}>Insurance{isEndorsedTo(t, "ins") ? " ✓" : ""}</button>
          </div>
        </div>
      )}
      <FeedTab events={vaHistory(t.name)} kind="history" empty="No history records." />
    </div>
  );
}

// ---------- Feeds (milestones / activity / history) ----------
function FeedTab({ events, kind, empty }) {
  if (!events.length) return <Empty>{empty}</Empty>;
  return (
    <div style={{ position: "relative", paddingLeft: 6 }}>
      {events.map((e, i) => {
        const dot = e.color || "#eef0f2";
        const label = kind === "activity" ? `${e.actor} ${(ACT_TYPES[e.action] || {}).verb || e.action}${e.detail ? " " + e.detail : ""}` : e.title;
        return (
          <div key={i} style={{ display: "flex", gap: 10, paddingBottom: 14, position: "relative" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: kind === "activity" ? "#ccc" : "#0f6e56", flexShrink: 0, marginTop: 3 }} />
              {i < events.length - 1 && <span style={{ width: 1, flex: 1, background: C.line, marginTop: 2 }} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: C.ink, lineHeight: 1.35 }}>{label}</div>
              <div style={{ fontSize: 9.5, color: C.sub, marginTop: 2 }}>
                {e.date}{kind === "history" && e.actor ? ` · ${e.actor}` : ""}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Endorsed ----------
function EndorsedTab({ t, role, bump }) {
  const canEdit = can(role, "endorse");
  const teams = [["crm", "CRM Dev"], ["ins", "Insurance"]];
  const [newItem, setNewItem] = useState({ crm: "", ins: "" });
  return (
    <div>
      {teams.map(([team, label]) => {
        if (!isEndorsedTo(t, team)) return null;
        const e = t.endorse[team];
        const items = e.items || [];
        const done = items.filter((x) => x.done).length;
        return (
          <div key={team} style={{ border: `1px solid ${C.line}`, borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={chip(team === "crm" ? "#fce8e8" : "#e1f0f5", team === "crm" ? "#a32d2d" : "#0c447c")}>{label}</span>
              <span style={{ fontSize: 9, color: "#bbb" }}>{e.synced ? `synced · ${e.by}` : `by ${e.by}`} · {e.date}</span>
            </div>
            {items.length ? (
              items.map((it, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0" }}>
                  <button disabled={!canEdit} onClick={() => { it.done = !it.done; bump(); }} style={{ border: "none", background: "transparent", cursor: canEdit ? "pointer" : "default", color: it.done ? "#0f6e56" : "#ccc", fontSize: 15, padding: 0 }}>
                    {it.done ? "●" : "○"}
                  </button>
                  <span style={{ flex: 1, fontSize: 12, color: it.done ? "#aaa" : "#555", textDecoration: it.done ? "line-through" : "none" }}>{it.t}</span>
                  {canEdit && <button onClick={() => { e.items.splice(i, 1); bump(); }} style={{ border: "none", background: "transparent", color: "#ccc", cursor: "pointer" }}><X size={13} /></button>}
                </div>
              ))
            ) : (
              <div style={{ fontSize: 11, color: "#ccc" }}>No action items yet.</div>
            )}
            {canEdit && (
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <input value={newItem[team]} onChange={(ev) => setNewItem((s) => ({ ...s, [team]: ev.target.value }))} placeholder="Add action item…" style={{ flex: 1, border: `1px solid ${C.line}`, borderRadius: 7, padding: "6px 9px", fontSize: 11, fontFamily: FONT.body }} />
                <button onClick={() => { const v = newItem[team].trim(); if (v) { e.items.push({ t: v, done: false }); setNewItem((s) => ({ ...s, [team]: "" })); bump(); } }} style={{ ...smallBtn, padding: "6px 12px" }}>Add</button>
              </div>
            )}
            <div style={{ fontSize: 9, color: "#bbb", marginTop: 8 }}>{done}/{items.length} done</div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Uploads ----------
function UploadsTab({ t }) {
  const ups = getUploads(t.name);
  return (
    <div>
      <button style={{ ...smallBtn, marginBottom: 12 }}>Upload file</button>
      {ups.length ? (
        ups.map((u, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: `1px solid ${C.line}` }}>
            <div style={{ fontSize: 12, color: C.ink, flex: 1 }}>{u.name}<div style={{ fontSize: 9.5, color: C.sub }}>{u.by} · {u.date}</div></div>
          </div>
        ))
      ) : (
        <Empty>No files uploaded yet.</Empty>
      )}
    </div>
  );
}

// ---------- Broad body ----------
function BroadBody({ b, role, bump }) {
  const tabs = [["overview", "Overview"], ["items", "Action Items"], ["courses", "Courses"], ["notes", "Notes"], ["uploads", "Uploads"]];
  const [tab, setTab] = useState("overview");
  const canEdit = can(role, "editScope");
  const [newItem, setNewItem] = useState("");
  return (
    <>
      <TabBar tabs={tabs} tab={tab} setTab={setTab} />
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 32px", background: "#f7f7f9" }}>
        {tab === "overview" && (
          <div>
            <Sec title="Details">
              <Row label="Agency">{b.agency}</Row>
              <Row label="Trainer">{b.trainer}</Row>
              <Row label="Start Date">{fmtDate(parseStart(b.started))}</Row>
              <Row label="WFH Date">{fmtDate(wfhDate(b.started))}</Row>
              <Row label="Regularization">{fmtDate(regDate(b.started))}</Row>
            </Sec>
            <Sec title="Association">
              <Row label="Sales Rep">{b.salesRep || "—"}</Row>
              <Row label="Account Mgr">{b.am || "—"}</Row>
              <Row label="Team Lead">{b.tl || "—"}</Row>
            </Sec>
            <Sec title="Tools">
              {(b.tools || []).length ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {b.tools.map((tl, i) => <span key={i} style={chip("#efe7fa", "#5b3b9c")}>{tl}</span>)}
                </div>
              ) : <span style={{ fontSize: 10, color: "#ccc" }}>None yet</span>}
            </Sec>
            <Sec title="Health">
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: healthVal(b.health).dot }} />
                <span style={{ fontSize: 11, color: healthVal(b.health).txt }}>{healthVal(b.health).label}</span>
              </div>
            </Sec>
          </div>
        )}
        {tab === "items" && (
          <Sec title={`Action Items (${(b.checklist || []).filter((x) => x.done).length}/${(b.checklist || []).length})`}>
            {(b.checklist || []).map((x, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0" }}>
                <button disabled={!canEdit} onClick={() => { x.done = !x.done; bump(); }} style={{ border: "none", background: "transparent", cursor: canEdit ? "pointer" : "default", color: x.done ? "#5b3b9c" : "#ccc", fontSize: 15, padding: 0 }}>{x.done ? "●" : "○"}</button>
                <span style={{ flex: 1, fontSize: 12, color: x.done ? "#aaa" : "#555", textDecoration: x.done ? "line-through" : "none" }}>{x.t}</span>
                {canEdit && <button onClick={() => { b.checklist.splice(i, 1); bump(); }} style={{ border: "none", background: "transparent", color: "#ccc", cursor: "pointer" }}><X size={13} /></button>}
              </div>
            ))}
            {canEdit && (
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <input value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Add action item…" style={{ flex: 1, border: `1px solid ${C.line}`, borderRadius: 7, padding: "6px 9px", fontSize: 11, fontFamily: FONT.body }} />
                <button onClick={() => { const v = newItem.trim(); if (v) { b.checklist.push({ t: v, done: false }); setNewItem(""); bump(); } }} style={{ ...smallBtn, padding: "6px 12px" }}>Add</button>
              </div>
            )}
          </Sec>
        )}
        {tab === "courses" && (
          <Sec title="Courses">
            {(b.enrollments || []).length ? (
              b.enrollments.map((en) => {
                const c = CATALOG[en.course];
                if (!c) return null;
                return (
                  <div key={en.course} style={{ border: `1px solid ${C.line}`, borderRadius: 9, padding: "10px 12px", marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: C.ink }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: enrollDone(en) ? "#0f6e56" : "#888" }}>{enrollPct(en)}%</div>
                    </div>
                    <div style={{ fontSize: 10, color: C.sub }}>{(CAT_META[c.category] || {}).label} · {enrollDoneCount(en)}/{courseLessonCount(en.course)} lessons</div>
                  </div>
                );
              })
            ) : (
              <span style={{ fontSize: 11, color: "#ccc" }}>Not enrolled in any catalog course yet.</span>
            )}
          </Sec>
        )}
        {tab === "notes" && <NotesTab t={b} bump={bump} />}
        {tab === "uploads" && <UploadsTab t={b} />}
      </div>
    </>
  );
}

function Empty({ children }) {
  return <div style={{ fontSize: 12, color: "#bbb", padding: "20px 0" }}>{children}</div>;
}

const iconBtn = { border: "none", background: "transparent", cursor: "pointer", color: C.sub, padding: 2 };
const smallBtn = { border: "none", background: C.teal, color: "#fff", fontSize: 11, fontWeight: 600, padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontFamily: FONT.body };
const actBtn = { border: "none", background: C.teal, color: "#fff", fontSize: 11, fontWeight: 600, padding: "7px 13px", borderRadius: 7, cursor: "pointer", fontFamily: FONT.body };
const revokeBtn = { border: `1px solid ${C.line}`, background: "#fff", color: "#a32d2d", fontSize: 10, padding: "5px 10px", borderRadius: 7, cursor: "pointer", fontFamily: FONT.body };
const chip = (bg, fg) => ({ background: bg, color: fg, fontSize: 9.5, fontWeight: 600, padding: "3px 8px", borderRadius: 20, display: "inline-block" });
