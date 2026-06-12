import React, { useState } from "react";
import { Search, Plus, ChevronDown, ChevronRight, ChevronUp, Pencil, Users, ArrowLeft, Trash2, FolderPlus, BadgeCheck, Check, X } from "lucide-react";
import { C, FONT } from "../lib/theme.js";
import { CATALOG, CAT_META, CAT_ORDER } from "../data/catalog.js";
import { TRAINEES } from "../data/trainees.js";
import { courseLessonCount, enrollCount } from "../lib/courses.js";
import { courseCertCount, courseRoster } from "../lib/certs.js";
import { COLORS } from "../data/org.js";
import { ini } from "../lib/status.js";
import { useDataVersion, bumpData } from "../lib/store.js";
import { can, canCourse } from "../lib/permissions.js";
import Metrics from "../components/Metrics.jsx";

const uid = (p) => `${p}_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e4)}`;
const isDraft = (co) => co.status === "draft";
function DraftBadge() {
  return <span style={{ display: "inline-flex", alignItems: "center", background: "#fdf0dd", color: "#a8650f", fontSize: 9, fontWeight: 600, padding: "2px 7px", borderRadius: 20 }}>Draft</span>;
}

const CAT_PALETTE = [
  { color: "#5b3b9c", chipBg: "#efe7fa", chipFg: "#5b3b9c" },
  { color: "#0c6b5e", chipBg: "#e6f4f1", chipFg: "#0c6b5e" },
  { color: "#9c3b6b", chipBg: "#fde8f0", chipFg: "#9c3b6b" },
  { color: "#0c447c", chipBg: "#e1f0f5", chipFg: "#0c447c" },
  { color: "#7a5c00", chipBg: "#faf2da", chipFg: "#7a5c00" },
  { color: "#555", chipBg: "#eef0f2", chipFg: "#555" },
];

function addCategory(label, palIdx) {
  const t = (label || "").trim();
  if (!t) return null;
  const existing = CAT_ORDER.find((k) => CAT_META[k] && CAT_META[k].label.toLowerCase() === t.toLowerCase());
  if (existing) return existing;
  const id = "cat_" + Date.now();
  const pal = CAT_PALETTE[palIdx] || CAT_PALETTE[0];
  CAT_META[id] = { label: t, color: pal.color, chipBg: pal.chipBg, chipFg: pal.chipFg };
  CAT_ORDER.push(id);
  return id;
}

function catList() {
  return CAT_ORDER.map((k) => [k, (CAT_META[k] || {}).label || k]);
}

export default function Catalog({ role, onOpenVA }) {
  useDataVersion(); // re-render on any catalog mutation
  const canAuthor = can(role, "authorCourses"); // can create courses / add types at all
  const canManage = canAuthor; // list-level button visibility
  const [editKey, setEditKey] = useState(null); // course key being edited
  const [manageKey, setManageKey] = useState(null); // course key being managed
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState({});
  const [addType, setAddType] = useState(false);

  if (editKey) {
    return <CourseEditor courseKey={editKey} role={role} onBack={() => setEditKey(null)} />;
  }
  if (manageKey) {
    return <CourseManage courseKey={manageKey} onBack={() => setManageKey(null)} onEdit={() => { setManageKey(null); setEditKey(manageKey); }} onOpenVA={onOpenVA} />;
  }

  const createCourse = () => {
    const key = uid("course");
    CATALOG[key] = { name: "New course", desc: "", category: "oneoff", cert: false, skill: null, modules: [], status: "draft" };
    bumpData();
    setEditKey(key);
  };

  const q = search.trim().toLowerCase();
  const groups = catList()
    .map(([key, label]) => {
      let courses = Object.keys(CATALOG).filter((k) => CATALOG[k].category === key);
      if (q) courses = courses.filter((k) => CATALOG[k].name.toLowerCase().includes(q) || (CATALOG[k].desc || "").toLowerCase().includes(q));
      return { key, label, courses, meta: CAT_META[key] || {} };
    })
    .filter((g) => g.courses.length);

  return (
    <div>
      <Metrics view="catalog" />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, gap: 12 }}>
        <div style={{ fontSize: 12, color: C.sub, maxWidth: 480, lineHeight: 1.5 }}>
          The source of truth for all courses and modules. Definitions sync to the training app for VA delivery.
        </div>
        {canManage && (
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button onClick={() => setAddType(true)} style={ghostBtn}><FolderPlus size={13} /> Add type</button>
            <button onClick={createCourse} style={primaryBtn}><Plus size={13} /> New course</button>
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, justifyContent: "space-between", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, background: "#fff", border: `1px solid ${C.line}`, borderRadius: 9, padding: "8px 11px", flex: 1, maxWidth: 420 }}>
          <Search size={14} color={C.sub} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search courses by name or description…" style={{ border: "none", outline: "none", fontSize: 12, fontFamily: FONT.body, flex: 1, background: "transparent" }} />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setCollapsed({})} style={ghostBtn}>Expand all</button>
          <button onClick={() => { const all = {}; catList().forEach(([k]) => { all[k] = true; }); setCollapsed(all); }} style={ghostBtn}>Collapse all</button>
        </div>
      </div>

      {groups.length === 0 ? (
        <div style={{ padding: 24, color: C.sub, fontSize: 13, background: "#fff", border: `1px dashed ${C.line}`, borderRadius: 12 }}>No courses match “{search}”.</div>
      ) : (
        groups.map((g) => {
          const isCol = q ? false : !!collapsed[g.key];
          return (
            <div key={g.key} style={{ marginBottom: 18 }}>
              <div onClick={() => setCollapsed((c) => ({ ...c, [g.key]: !c[g.key] }))} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 10 }}>
                {isCol ? <ChevronRight size={14} color="#bbb" /> : <ChevronDown size={14} color="#bbb" />}
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: g.meta.color || C.teal }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{g.label}</span>
                <span style={{ fontSize: 10, color: "#bbb" }}>{g.courses.length}</span>
              </div>
              {!isCol && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {g.courses.map((k) => {
                    const co = CATALOG[k];
                    const n = enrollCount(k, TRAINEES);
                    const cc = courseCertCount(k);
                    const canEditThis = canCourse(role, co.category);
                    return (
                      <div key={k} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 11, padding: "13px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div onClick={() => canEditThis && setEditKey(k)} style={{ fontSize: 13.5, fontWeight: 600, color: C.ink, cursor: canEditThis ? "pointer" : "default", display: "flex", alignItems: "center", gap: 6 }}>
                            {co.name}
                            {co.cert && <span style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "#e1f5ee", color: "#0f6e56", fontSize: 9, fontWeight: 600, padding: "2px 7px", borderRadius: 20 }}><BadgeCheck size={10} /> Cert</span>}
                            {isDraft(co) && <DraftBadge />}
                          </div>
                          {co.desc && <div style={{ fontSize: 11.5, color: C.sub, marginTop: 3, lineHeight: 1.4 }}>{co.desc}</div>}
                          <div style={{ fontSize: 10.5, color: "#aaa", marginTop: 5 }}>
                            {co.modules.length} modules · {courseLessonCount(k)} lessons · {n} enrolled{co.cert ? ` · ${cc} certified` : ""}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                          {canEditThis && <button onClick={() => setEditKey(k)} style={rowBtn}><Pencil size={12} /> Edit</button>}
                          {canManage && <button onClick={() => setManageKey(k)} style={rowBtn}><Users size={12} /> Manage</button>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      )}

      {!canManage && <div style={{ fontSize: 11, color: C.sub, marginTop: 14 }}>You have view access. Course editing is limited to directors and managers.</div>}

      {addType && <AddTypeModal onClose={() => setAddType(false)} onAdd={(name, pal) => { addCategory(name, pal); setAddType(false); bumpData(); }} />}
    </div>
  );
}

// ---------------- Manage / enrollee roster ----------------
function CourseManage({ courseKey, onBack, onEdit, onOpenVA }) {
  useDataVersion();
  const co = CATALOG[courseKey];
  if (!co) return <div style={{ padding: 20 }}>Course not found.</div>;
  const roster = courseRoster(courseKey);
  const certified = roster.filter((r) => r.status === "certified").length;
  const completed = roster.filter((r) => r.status === "completed").length;
  const summary = co.cert ? `${roster.length} enrolled · ${certified} certified` : `${roster.length} enrolled · ${completed} completed`;

  const statusPill = (s) => {
    const map = { "in-progress": ["In progress", "#e1f0f5", "#0c447c"], completed: ["Completed", "#e1f5ee", "#0f6e56"], certified: ["Certified", "#e1f5ee", "#0f6e56"], revoked: ["Revoked", "#f0f0f0", "#999"] };
    const [lbl, bg, fg] = map[s] || ["—", "#f0f0f0", "#888"];
    return <span style={{ background: bg, color: fg, fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 20, whiteSpace: "nowrap" }}>{lbl}</span>;
  };

  return (
    <div>
      <button onClick={onBack} style={backBtn}><ArrowLeft size={14} /> Back to catalog</button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "16px 0", gap: 12 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: C.ink, display: "flex", alignItems: "center", gap: 7 }}>
            {co.name}
            {co.cert && <span style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "#e1f5ee", color: "#0f6e56", fontSize: 9, fontWeight: 600, padding: "2px 7px", borderRadius: 20 }}><BadgeCheck size={10} /> Cert</span>}
          </div>
          <div style={{ fontSize: 12, color: C.sub, marginTop: 3 }}>{summary}</div>
        </div>
        <button onClick={onEdit} style={rowBtn}><Pencil size={12} /> Edit course</button>
      </div>

      <div style={{ fontSize: 10.5, fontWeight: 600, color: C.sub, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Enrollees</div>
      <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden" }}>
        {roster.length === 0 ? (
          <div style={{ padding: 22, fontSize: 13, color: C.sub }}>No VAs enrolled in this course yet.</div>
        ) : (
          roster.map((r, i) => (
            <div
              key={r.name}
              onClick={() => onOpenVA && onOpenVA(r.name, r.broad ? "broad" : "dir")}
              style={{ display: "grid", gridTemplateColumns: "40px 1.6fr 1.4fr auto", gap: 12, alignItems: "center", padding: "11px 16px", borderBottom: `1px solid ${C.line}`, cursor: "pointer" }}
            >
              <div style={{ background: COLORS[i % COLORS.length], width: 26, height: 26, borderRadius: "50%", color: "#fff", fontSize: 9, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>{ini(r.name)}</div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: C.ink, display: "flex", alignItems: "center", gap: 6 }}>
                {r.name}
                <span style={{ background: r.type === "combo" ? "#fce8e8" : r.type === "gen" ? "#e1f0f5" : "#efe7fa", color: r.type === "combo" ? "#a32d2d" : r.type === "gen" ? "#0c447c" : "#5b3b9c", fontSize: 8.5, fontWeight: 600, padding: "1px 6px", borderRadius: 20 }}>{r.type === "combo" ? "Combo" : r.type === "gen" ? "Gen" : "Broad"}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, height: 6, borderRadius: 4, background: "#eee", overflow: "hidden", maxWidth: 140 }}>
                  <div style={{ width: `${r.pct}%`, height: "100%", background: C.teal }} />
                </div>
                <span style={{ fontSize: 11, color: C.sub }}>{r.pct}%</span>
              </div>
              {statusPill(r.status)}
            </div>
          ))
        )}
      </div>
      <div style={{ fontSize: 10, color: "#bbb", marginTop: 12, display: "flex", alignItems: "center", gap: 6 }}>Bulk actions (unenroll, archive course) will live here later.</div>
    </div>
  );
}

function AddTypeModal({ onClose, onAdd }) {
  const [name, setName] = useState("");
  const [pal, setPal] = useState(0);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 70 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, padding: "24px 26px", width: 380, maxWidth: "92vw", fontFamily: FONT.body }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.ink, marginBottom: 6 }}>Add course type</div>
        <div style={{ fontSize: 12, color: C.sub, marginBottom: 14 }}>A new way to group courses in the catalog (e.g. “Marketing”, “Compliance”).</div>
        <div style={{ fontSize: 10.5, color: C.sub, marginBottom: 5 }}>Type name</div>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Marketing" style={{ ...input, marginBottom: 14 }} autoFocus />
        <div style={{ fontSize: 10.5, color: C.sub, marginBottom: 7 }}>Color</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
          {CAT_PALETTE.map((p, i) => (
            <button key={i} onClick={() => setPal(i)} style={{ width: 30, height: 30, borderRadius: 8, background: p.color, border: pal === i ? "2px solid #24242d" : "2px solid transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {pal === i && <Check size={14} color="#fff" />}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
          <button onClick={onClose} style={{ border: `1px solid ${C.line}`, background: "#fff", color: C.sub, fontSize: 12, padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontFamily: FONT.body }}>Cancel</button>
          <button onClick={() => name.trim() && onAdd(name.trim(), pal)} style={{ border: "none", background: C.teal, color: "#fff", fontSize: 12, fontWeight: 600, padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontFamily: FONT.body }}>Add type</button>
        </div>
      </div>
    </div>
  );
}

// ---------------- Course Editor ----------------
// ===== Two-pane Course Builder =====
function CourseEditor({ courseKey, role, onBack }) {
  useDataVersion();
  const co = CATALOG[courseKey];
  const [sel, setSel] = useState(null); // {mi, li} selected lesson
  const [showSettings, setShowSettings] = useState(false);

  if (!co) return <div style={{ padding: 20 }}>Course not found.</div>;
  const canManage = canCourse(role, co.category);

  const setField = (field, val) => { co[field] = val; bumpData(); };
  const addModule = () => { co.modules.push({ id: uid("m"), name: "New module", lessons: [] }); bumpData(); };
  const delModule = (mi) => { if (confirm("Delete this module and its lessons?")) { co.modules.splice(mi, 1); if (sel && sel.mi === mi) setSel(null); bumpData(); } };
  const addLesson = (mi) => { co.modules[mi].lessons.push({ id: uid("l"), name: "New lesson", gate: null, blocks: [] }); setSel({ mi, li: co.modules[mi].lessons.length - 1 }); bumpData(); };
  const delLesson = (mi, li) => { co.modules[mi].lessons.splice(li, 1); if (sel && sel.mi === mi && sel.li === li) setSel(null); bumpData(); };
  const move = (arr, i, dir) => { const j = i + dir; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; bumpData(); };

  const lessonCount = co.modules.reduce((n, m) => n + m.lessons.length, 0);
  const cm = CAT_META[co.category] || {};
  const selLesson = sel && co.modules[sel.mi] && co.modules[sel.mi].lessons[sel.li];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <button onClick={onBack} style={backBtn}><ArrowLeft size={14} /> Back to catalog</button>
        {!canManage && <span style={{ fontSize: 11, color: C.sub }}>View only — this course is {cm.label || co.category} side</span>}
      </div>

      {/* course header */}
      <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12, padding: "14px 18px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.ink, display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: cm.color || C.teal }} />
            {co.name}
            {co.cert && <span style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "#e1f5ee", color: "#0f6e56", fontSize: 9, fontWeight: 600, padding: "2px 7px", borderRadius: 20 }}><BadgeCheck size={10} /> Cert</span>}
            {isDraft(co) && <DraftBadge />}
          </div>
          <div style={{ fontSize: 11, color: C.sub, marginTop: 3 }}>{cm.label || co.category} · {co.modules.length} modules · {lessonCount} lessons</div>
        </div>
        {canManage && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => setShowSettings((s) => !s)} style={rowBtn}><Pencil size={12} /> Course settings</button>
            {isDraft(co) ? (
              <button onClick={() => { co.status = "published"; bumpData(); }} style={primaryBtn}>Publish</button>
            ) : (
              <button onClick={() => { co.status = "draft"; bumpData(); }} style={rowBtn}>Unpublish</button>
            )}
          </div>
        )}
      </div>
      {canManage && isDraft(co) && (
        <div style={{ fontSize: 10.5, color: "#a8650f", background: "#fdf3e6", borderRadius: 8, padding: "8px 12px", marginBottom: 12 }}>
          This course is a draft. It won't affect enrolled VAs or appear for enrollment until you publish it. Edits save automatically.
        </div>
      )}

      {showSettings && canManage && (
        <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12, padding: "16px 20px", marginBottom: 12, maxWidth: 620 }}>
          <Field label="Course name"><input value={co.name} onChange={(e) => setField("name", e.target.value)} style={input} /></Field>
          <Field label="Category"><select value={co.category} onChange={(e) => setField("category", e.target.value)} style={input}>{CAT_ORDER.map((k) => <option key={k} value={k}>{(CAT_META[k] || {}).label || k}</option>)}</select></Field>
          <Field label="Description"><textarea value={co.desc || ""} onChange={(e) => setField("desc", e.target.value)} style={{ ...input, minHeight: 56, resize: "vertical" }} /></Field>
          <Field label="Issues certificate">
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: C.ink, cursor: "pointer" }}>
              <input type="checkbox" checked={!!co.cert} onChange={(e) => setField("cert", e.target.checked)} /> Earned on passing the final exam
            </label>
          </Field>
        </div>
      )}

      {/* two-pane builder */}
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        {/* left: outline */}
        <div style={{ width: 300, flexShrink: 0, background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12, padding: 14, maxHeight: "72vh", overflowY: "auto" }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: C.sub, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Course outline</div>
          {co.modules.length === 0 && <div style={{ fontSize: 11.5, color: "#bbb", marginBottom: 10 }}>No modules yet.</div>}
          {co.modules.map((m, mi) => (
            <div key={m.id} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 18, height: 18, borderRadius: 5, background: "#eef0f2", color: C.sub, fontSize: 10, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{mi + 1}</span>
                {canManage ? (
                  <input value={m.name} onChange={(e) => { m.name = e.target.value; bumpData(); }} style={{ flex: 1, border: "none", outline: "none", fontSize: 12, fontWeight: 600, color: C.ink, fontFamily: FONT.body, background: "transparent", padding: "2px 0" }} />
                ) : <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: C.ink }}>{m.name}</span>}
                {canManage && (
                  <span style={{ display: "flex", gap: 1 }}>
                    <button onClick={() => move(co.modules, mi, -1)} style={arrowBtn} title="Move up"><ChevronUp size={13} /></button>
                    <button onClick={() => move(co.modules, mi, 1)} style={arrowBtn} title="Move down"><ChevronDown size={13} /></button>
                    <button onClick={() => delModule(mi)} style={iconDel}><Trash2 size={12} /></button>
                  </span>
                )}
              </div>
              <div style={{ paddingLeft: 22, marginTop: 3 }}>
                {m.lessons.map((l, li) => {
                  const on = sel && sel.mi === mi && sel.li === li;
                  return (
                    <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                      <button onClick={() => setSel({ mi, li })} style={{ flex: 1, textAlign: "left", border: "none", background: on ? "#e6eef1" : "transparent", color: on ? C.teal : "#555", fontSize: 11.5, fontWeight: on ? 600 : 400, padding: "5px 8px", borderRadius: 6, cursor: "pointer", fontFamily: FONT.body, display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ color: "#bbb" }}>{(l.blocks || []).length}</span> {l.name}
                      </button>
                      {canManage && (
                        <span style={{ display: "flex", gap: 1 }}>
                          <button onClick={() => move(m.lessons, li, -1)} style={arrowBtn}><ChevronUp size={12} /></button>
                          <button onClick={() => move(m.lessons, li, 1)} style={arrowBtn}><ChevronDown size={12} /></button>
                          <button onClick={() => delLesson(mi, li)} style={iconDel}><Trash2 size={11} /></button>
                        </span>
                      )}
                    </div>
                  );
                })}
                {canManage && <button onClick={() => addLesson(mi)} style={{ ...addBtn, marginTop: 4, fontSize: 10.5, padding: "4px 9px" }}><Plus size={11} /> Add lesson</button>}
              </div>
            </div>
          ))}
          {canManage && <button onClick={addModule} style={{ ...addBtn, marginTop: 6, width: "100%", justifyContent: "center" }}><Plus size={13} /> Add module</button>}
        </div>

        {/* right: selected lesson */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {selLesson ? (
            <LessonEditor co={co} m={co.modules[sel.mi]} l={selLesson} canManage={canManage} />
          ) : (
            <div style={{ background: "#fff", border: `1px dashed ${C.line}`, borderRadius: 12, padding: 40, textAlign: "center", color: "#bbb", fontSize: 13 }}>
              Select a lesson on the left to edit its content, or add a module to get started.
            </div>
          )}
        </div>
      </div>

      <div style={{ fontSize: 10, color: "#bbb", marginTop: 12, lineHeight: 1.5, maxWidth: 620 }}>
        Edits save live. Adding a lesson updates lesson counts on cards and recalculates enrolled VAs' progress.
      </div>
    </div>
  );
}

function LessonEditor({ co, m, l, canManage }) {
  useDataVersion();
  const addBlock = (type) => { if (!l.blocks) l.blocks = []; l.blocks.push(newBlock(type)); bumpData(); };
  const delBlock = (bi) => { l.blocks.splice(bi, 1); bumpData(); };
  const moveBlock = (bi, dir) => { const j = bi + dir; if (j < 0 || j >= l.blocks.length) return; [l.blocks[bi], l.blocks[j]] = [l.blocks[j], l.blocks[bi]]; bumpData(); };

  return (
    <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12, padding: "18px 20px" }}>
      <div style={{ fontSize: 10.5, color: C.sub, marginBottom: 10 }}>{m.name}</div>
      <Field label="Lesson name">
        <input value={l.name} disabled={!canManage} onChange={(e) => { l.name = e.target.value; bumpData(); }} style={input} />
      </Field>
      <Field label="Gate">
        <select value={l.gate || ""} disabled={!canManage} onChange={(e) => { l.gate = e.target.value || null; bumpData(); }} style={{ ...input, maxWidth: 220 }}>
          <option value="">None</option>
          <option value="pass">Must pass</option>
          <option value="watch90">Watch 90%</option>
        </select>
      </Field>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "18px 0 10px" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: C.ink, textTransform: "uppercase", letterSpacing: "0.5px" }}>Content</div>
      </div>

      {(l.blocks || []).length === 0 && <div style={{ fontSize: 12, color: "#bbb", marginBottom: 10 }}>No content yet. Add a block below.</div>}

      {(l.blocks || []).map((b, bi) => (
        <BlockEditor key={b.id} b={b} canManage={canManage}
          onDel={() => delBlock(bi)}
          onUp={() => moveBlock(bi, -1)}
          onDown={() => moveBlock(bi, 1)} />
      ))}

      {canManage && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12, borderTop: `1px solid ${C.line}`, paddingTop: 12 }}>
          <span style={{ fontSize: 10.5, color: C.sub, alignSelf: "center", marginRight: 4 }}>Add block:</span>
          {[["text", "Text"], ["video", "Video"], ["pdf", "PDF"], ["code", "Code / Diagram"], ["resource", "Resource"], ["quiz", "Quiz"], ["exam", "Exam"]].map(([t, lbl]) => (
            <button key={t} onClick={() => addBlock(t)} style={addBtn}><Plus size={11} /> {lbl}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function newBlock(type) {
  const base = { id: uid("b"), type };
  if (type === "text") return { ...base, text: "" };
  if (type === "video") return { ...base, url: "" };
  if (type === "pdf") return { ...base, url: "", title: "" };
  if (type === "code") return { ...base, lang: "diagram", code: "" };
  if (type === "resource") return { ...base, label: "", url: "" };
  if (type === "quiz") return { ...base, passMark: 80, questions: [] };
  if (type === "exam") return { ...base, passMark: null, questions: [] };
  return base;
}

// Rich text editor (contentEditable + toolbar). Stores HTML in b.text.
function RichText({ b, ro }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (b.text || "")) ref.current.innerHTML = b.text || "";
  }, []);
  const exec = (cmd, val) => { document.execCommand(cmd, false, val); save(); ref.current && ref.current.focus(); };
  const save = () => { if (ref.current) { b.text = ref.current.innerHTML; bumpData(); } };
  const link = () => { const url = prompt("Link URL:"); if (url) exec("createLink", url); };
  const pickImage = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { exec("insertImage", reader.result); }; // embeds inline (real storage later)
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  if (ro) return <div style={{ ...richBox, minHeight: 60 }} dangerouslySetInnerHTML={{ __html: b.text || "<span style='color:#bbb'>No content.</span>" }} />;

  const Btn = ({ onClick, children, title }) => (
    <button type="button" title={title} onMouseDown={(e) => { e.preventDefault(); onClick(); }} style={rtBtn}>{children}</button>
  );
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 6, padding: 5, background: "#f4f4f6", borderRadius: 7 }}>
        <Btn onClick={() => exec("bold")} title="Bold"><b>B</b></Btn>
        <Btn onClick={() => exec("italic")} title="Italic"><i>I</i></Btn>
        <Btn onClick={() => exec("underline")} title="Underline"><u>U</u></Btn>
        <Btn onClick={() => exec("strikeThrough")} title="Strikethrough"><s>S</s></Btn>
        <span style={rtSep} />
        <select onMouseDown={(e) => e.stopPropagation()} onChange={(e) => { exec("formatBlock", e.target.value); e.target.value = ""; }} defaultValue="" style={rtSelect} title="Heading">
          <option value="" disabled>Style</option>
          <option value="<h2>">Heading</option>
          <option value="<h3>">Subheading</option>
          <option value="<p>">Normal</option>
        </select>
        <select onMouseDown={(e) => e.stopPropagation()} onChange={(e) => { exec("fontSize", e.target.value); e.target.value = ""; }} defaultValue="" style={rtSelect} title="Font size">
          <option value="" disabled>Size</option>
          <option value="2">Small</option>
          <option value="3">Normal</option>
          <option value="5">Large</option>
          <option value="6">XL</option>
        </select>
        <span style={rtSep} />
        <label style={{ ...rtBtn, position: "relative", overflow: "hidden" }} title="Text color">
          A<input type="color" onChange={(e) => exec("foreColor", e.target.value)} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} />
        </label>
        <label style={{ ...rtBtn, position: "relative", overflow: "hidden", background: "#fff3a8" }} title="Highlight">
          H<input type="color" onChange={(e) => exec("hiliteColor", e.target.value)} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} />
        </label>
        <span style={rtSep} />
        <Btn onClick={() => exec("insertUnorderedList")} title="Bullet list">•</Btn>
        <Btn onClick={() => exec("insertOrderedList")} title="Numbered list">1.</Btn>
        <Btn onClick={link} title="Link">🔗</Btn>
        <label style={rtBtn} title="Insert image">🖼<input type="file" accept="image/*" onChange={pickImage} style={{ display: "none" }} /></label>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={save}
        onBlur={save}
        style={richBox}
      />
    </div>
  );
}
const richBox = { border: `1px solid ${C.line}`, borderRadius: 8, padding: "10px 12px", fontSize: 13, fontFamily: FONT.body, minHeight: 90, outline: "none", lineHeight: 1.5, color: C.ink };
const rtBtn = { border: `1px solid ${C.line}`, background: "#fff", color: C.ink, fontSize: 12, minWidth: 28, height: 26, borderRadius: 5, cursor: "pointer", fontFamily: FONT.body, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 6px" };
const rtSelect = { border: `1px solid ${C.line}`, background: "#fff", color: C.ink, fontSize: 11, height: 26, borderRadius: 5, cursor: "pointer", fontFamily: FONT.body };
const rtSep = { width: 1, background: C.line, margin: "0 2px" };

const BLOCK_META = {
  text: ["Text", "#555", "#eef0f2"],
  video: ["Video", "#0c447c", "#e1f0f5"],
  pdf: ["PDF", "#a32d2d", "#fce8e8"],
  code: ["Code / Diagram", "#0c6b5e", "#e6f4f1"],
  resource: ["Resource", "#7a5c00", "#faf2da"],
  quiz: ["Quiz", "#a8650f", "#fdf0dd"],
  exam: ["Exam", "#a32d2d", "#fce8e8"],
};

function BlockEditor({ b, canManage, onDel, onUp, onDown }) {
  const [meta] = [BLOCK_META[b.type] || ["Block", "#555", "#eef0f2"]];
  const ro = !canManage;
  return (
    <div style={{ border: `1px solid ${C.line}`, borderRadius: 9, padding: "11px 13px", marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: b.type === "quiz" || b.type === "exam" ? 0 : 9 }}>
        <span style={{ fontSize: 9.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: meta[1], background: meta[2], padding: "2px 8px", borderRadius: 5 }}>{meta[0]}</span>
        <div style={{ flex: 1 }} />
        {canManage && (
          <>
            <button onClick={onUp} style={arrowBtn}><ChevronUp size={13} /></button>
            <button onClick={onDown} style={arrowBtn}><ChevronDown size={13} /></button>
            <button onClick={onDel} style={iconDel}><Trash2 size={12} /></button>
          </>
        )}
      </div>

      {b.type === "text" && (
        <RichText b={b} ro={ro} />
      )}
      {b.type === "video" && (
        <>
          <input value={b.url || ""} disabled={ro} placeholder="Video URL (YouTube, Vimeo, etc.)" onChange={(e) => { b.url = e.target.value; bumpData(); }} style={input} />
          {b.url && <div style={{ marginTop: 8, fontSize: 11, color: C.teal, wordBreak: "break-all" }}>▶ {b.url}</div>}
        </>
      )}
      {b.type === "pdf" && (
        <>
          <input value={b.title || ""} disabled={ro} placeholder="PDF title" onChange={(e) => { b.title = e.target.value; bumpData(); }} style={{ ...input, marginBottom: 6 }} />
          <input value={b.url || ""} disabled={ro} placeholder="PDF link (real upload comes with the database)" onChange={(e) => { b.url = e.target.value; bumpData(); }} style={input} />
          {b.url && <div style={{ marginTop: 8, padding: 10, background: "#faf7f7", borderRadius: 7, fontSize: 11, color: "#a32d2d" }}>📄 {b.title || "PDF"} — {b.url}</div>}
        </>
      )}
      {b.type === "code" && (
        <>
          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <select value={b.lang || "diagram"} disabled={ro} onChange={(e) => { b.lang = e.target.value; bumpData(); }} style={{ ...input, maxWidth: 160, marginBottom: 0 }}>
              <option value="diagram">Diagram</option>
              <option value="javascript">JavaScript</option>
              <option value="html">HTML</option>
              <option value="text">Plain</option>
            </select>
          </div>
          <textarea value={b.code || ""} disabled={ro} placeholder={b.lang === "diagram" ? "Describe or paste a diagram / ASCII art…" : "Paste code…"} onChange={(e) => { b.code = e.target.value; bumpData(); }} style={{ ...input, minHeight: 90, resize: "vertical", fontFamily: "monospace", fontSize: 12 }} />
          {b.code && (
            <pre style={{ marginTop: 8, background: "#1e1e24", color: "#e6e6e6", padding: 12, borderRadius: 8, fontSize: 11.5, overflowX: "auto", whiteSpace: "pre-wrap" }}>{b.code}</pre>
          )}
        </>
      )}
      {b.type === "resource" && (
        <>
          <input value={b.label || ""} disabled={ro} placeholder="Resource label" onChange={(e) => { b.label = e.target.value; bumpData(); }} style={{ ...input, marginBottom: 6 }} />
          <input value={b.url || ""} disabled={ro} placeholder="Download link" onChange={(e) => { b.url = e.target.value; bumpData(); }} style={input} />
          {b.url && <div style={{ marginTop: 8, fontSize: 11, color: "#7a5c00" }}>⬇ {b.label || "Resource"} — {b.url}</div>}
        </>
      )}
      {(b.type === "quiz" || b.type === "exam") && (
        <QuizEditor b={b} canManage={canManage} accent={meta[1]} bg={meta[2]} />
      )}
    </div>
  );
}

// ===== Question builder (B2) =====
const Q_TYPES = [
  ["mc-single", "Multiple choice", "auto"],
  ["mc-multi", "Multiple choice (multi)", "auto"],
  ["truefalse", "True / False", "auto"],
  ["fillblank", "Fill in the blank", "auto"],
  ["matching", "Matching", "auto"],
  ["essay", "Essay", "manual"], // exam only
];

function newQuestion(type) {
  const base = { id: uid("q"), type, q: "", points: 1 };
  if (type === "mc-single") return { ...base, options: [{ id: uid("o"), text: "" }, { id: uid("o"), text: "" }], correct: null };
  if (type === "mc-multi") return { ...base, options: [{ id: uid("o"), text: "" }, { id: uid("o"), text: "" }], correct: [] };
  if (type === "truefalse") return { ...base, correct: true };
  if (type === "fillblank") return { ...base, accepted: [""] };
  if (type === "matching") return { ...base, pairs: [{ id: uid("p"), left: "", right: "" }, { id: uid("p"), left: "", right: "" }] };
  if (type === "essay") return { ...base, points: 10, model: "", rubric: [{ id: uid("r"), criterion: "", points: 0 }] };
  return base;
}
function qTypeMeta(type) { return Q_TYPES.find((t) => t[0] === type) || ["", type, "auto"]; }

function QuizEditor({ b, canManage, accent, bg }) {
  useDataVersion();
  if (!b.questions) b.questions = [];
  const isExam = b.type === "exam";
  const totalPts = b.questions.reduce((s, q) => s + (q.points || 0), 0);
  const manualCount = b.questions.filter((q) => qTypeMeta(q.type)[2] === "manual").length;

  const addQ = (type) => { b.questions.push(newQuestion(type)); bumpData(); };
  const delQ = (i) => { b.questions.splice(i, 1); bumpData(); };
  const moveQ = (i, dir) => { const j = i + dir; if (j < 0 || j >= b.questions.length) return; [b.questions[i], b.questions[j]] = [b.questions[j], b.questions[i]]; bumpData(); };

  const types = isExam ? Q_TYPES : Q_TYPES.filter((t) => t[0] !== "essay"); // essay exam-only

  return (
    <div style={{ marginTop: 9 }}>
      {/* settings bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", background: bg, borderRadius: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11.5, color: accent, fontWeight: 600 }}>{isExam ? "Exam" : "Quiz"}</span>
        <span style={{ fontSize: 11, color: accent }}>{b.questions.length} questions · {totalPts} pts</span>
        <div style={{ flex: 1 }} />
        <label style={{ fontSize: 11, color: accent, display: "flex", alignItems: "center", gap: 5 }}>
          Pass mark
          <input type="number" min="0" max="100" disabled={!canManage} value={b.passMark ?? ""} placeholder={isExam ? "TBD" : "80"} onChange={(e) => { b.passMark = e.target.value === "" ? null : Number(e.target.value); bumpData(); }} style={{ width: 54, border: `1px solid ${C.line}`, borderRadius: 6, padding: "3px 6px", fontSize: 11, fontFamily: FONT.body }} />
          %
        </label>
      </div>

      {b.questions.length === 0 && <div style={{ fontSize: 11.5, color: "#bbb", marginBottom: 8 }}>No questions yet.</div>}

      {b.questions.map((q, qi) => (
        <QuestionEditor key={q.id} q={q} qi={qi} canManage={canManage}
          onDel={() => delQ(qi)} onUp={() => moveQ(qi, -1)} onDown={() => moveQ(qi, 1)} />
      ))}

      {manualCount > 0 && (
        <div style={{ fontSize: 10, color: "#a8650f", marginTop: 4, marginBottom: 8 }}>
          {manualCount} question{manualCount > 1 ? "s" : ""} need manual review (graded by a trainer).
        </div>
      )}

      {canManage && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          <span style={{ fontSize: 10.5, color: C.sub, alignSelf: "center", marginRight: 2 }}>Add question:</span>
          {types.map(([t, lbl]) => (
            <button key={t} onClick={() => addQ(t)} style={addBtn}><Plus size={11} /> {lbl}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function QuestionEditor({ q, qi, canManage, onDel, onUp, onDown }) {
  const ro = !canManage;
  const meta = qTypeMeta(q.type);
  const isManual = meta[2] === "manual";
  return (
    <div style={{ border: `1px solid ${C.line}`, borderRadius: 9, padding: "11px 13px", marginBottom: 8, background: "#fcfcfd" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.ink }}>Q{qi + 1}</span>
        <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 7px", borderRadius: 20, background: isManual ? "#fdf0dd" : "#e1f5ee", color: isManual ? "#a8650f" : "#0f6e56" }}>
          {meta[1]} · {isManual ? "manual" : "auto"}
        </span>
        <div style={{ flex: 1 }} />
        {canManage && (
          <>
            <label style={{ fontSize: 10, color: C.sub, display: "flex", alignItems: "center", gap: 4 }}>
              pts
              <input type="number" min="0" value={q.points ?? 0} onChange={(e) => { q.points = Number(e.target.value); bumpData(); }} style={{ width: 44, border: `1px solid ${C.line}`, borderRadius: 6, padding: "2px 5px", fontSize: 10.5, fontFamily: FONT.body }} />
            </label>
            <button onClick={onUp} style={arrowBtn}><ChevronUp size={13} /></button>
            <button onClick={onDown} style={arrowBtn}><ChevronDown size={13} /></button>
            <button onClick={onDel} style={iconDel}><Trash2 size={12} /></button>
          </>
        )}
      </div>

      <textarea value={q.q || ""} disabled={ro} placeholder="Question prompt…" onChange={(e) => { q.q = e.target.value; bumpData(); }} style={{ ...input, minHeight: 44, resize: "vertical", marginBottom: 8 }} />

      {(q.type === "mc-single" || q.type === "mc-multi") && <MCEditor q={q} ro={ro} multi={q.type === "mc-multi"} />}
      {q.type === "truefalse" && <TFEditor q={q} ro={ro} />}
      {q.type === "fillblank" && <FillEditor q={q} ro={ro} />}
      {q.type === "matching" && <MatchEditor q={q} ro={ro} />}
      {q.type === "essay" && <EssayEditor q={q} ro={ro} />}
    </div>
  );
}

function MCEditor({ q, ro, multi }) {
  const addOpt = () => { q.options.push({ id: uid("o"), text: "" }); bumpData(); };
  const delOpt = (oi) => { const oid = q.options[oi].id; q.options.splice(oi, 1); if (multi) q.correct = (q.correct || []).filter((x) => x !== oid); else if (q.correct === oid) q.correct = null; bumpData(); };
  const toggle = (oid) => {
    if (multi) { const set = new Set(q.correct || []); set.has(oid) ? set.delete(oid) : set.add(oid); q.correct = [...set]; }
    else q.correct = oid;
    bumpData();
  };
  return (
    <div>
      <div style={{ fontSize: 9.5, color: C.sub, marginBottom: 5 }}>{multi ? "Tick all correct answers" : "Tick the correct answer"}</div>
      {q.options.map((o, oi) => {
        const on = multi ? (q.correct || []).includes(o.id) : q.correct === o.id;
        return (
          <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
            <button disabled={ro} onClick={() => toggle(o.id)} title="Mark correct" style={{ border: "none", background: "transparent", cursor: ro ? "default" : "pointer", color: on ? "#0f6e56" : "#ccc", fontSize: 15, padding: 0 }}>
              {multi ? (on ? "☑" : "☐") : (on ? "◉" : "○")}
            </button>
            <input value={o.text} disabled={ro} placeholder={`Option ${oi + 1}`} onChange={(e) => { o.text = e.target.value; bumpData(); }} style={{ ...input, marginBottom: 0, flex: 1 }} />
            {!ro && q.options.length > 2 && <button onClick={() => delOpt(oi)} style={iconDel}><X size={12} /></button>}
          </div>
        );
      })}
      {!ro && <button onClick={addOpt} style={{ ...addBtn, marginTop: 2, fontSize: 10.5, padding: "4px 9px" }}><Plus size={11} /> Add option</button>}
    </div>
  );
}

function TFEditor({ q, ro }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {[true, false].map((v) => (
        <button key={String(v)} disabled={ro} onClick={() => { q.correct = v; bumpData(); }} style={{ border: q.correct === v ? `1.5px solid #0f6e56` : `1px solid ${C.line}`, background: q.correct === v ? "#e1f5ee" : "#fff", color: q.correct === v ? "#0f6e56" : C.sub, fontSize: 11.5, fontWeight: 600, padding: "6px 18px", borderRadius: 7, cursor: ro ? "default" : "pointer", fontFamily: FONT.body }}>
          {v ? "True" : "False"}
        </button>
      ))}
    </div>
  );
}

function FillEditor({ q, ro }) {
  const add = () => { q.accepted.push(""); bumpData(); };
  const del = (i) => { q.accepted.splice(i, 1); bumpData(); };
  return (
    <div>
      <div style={{ fontSize: 9.5, color: C.sub, marginBottom: 5 }}>Accepted answers (any match counts as correct)</div>
      {q.accepted.map((a, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
          <input value={a} disabled={ro} placeholder={`Accepted answer ${i + 1}`} onChange={(e) => { q.accepted[i] = e.target.value; bumpData(); }} style={{ ...input, marginBottom: 0, flex: 1 }} />
          {!ro && q.accepted.length > 1 && <button onClick={() => del(i)} style={iconDel}><X size={12} /></button>}
        </div>
      ))}
      {!ro && <button onClick={add} style={{ ...addBtn, marginTop: 2, fontSize: 10.5, padding: "4px 9px" }}><Plus size={11} /> Add accepted answer</button>}
    </div>
  );
}

function MatchEditor({ q, ro }) {
  const add = () => { q.pairs.push({ id: uid("p"), left: "", right: "" }); bumpData(); };
  const del = (i) => { q.pairs.splice(i, 1); bumpData(); };
  return (
    <div>
      <div style={{ fontSize: 9.5, color: C.sub, marginBottom: 5 }}>Matching pairs (portal shuffles the right side)</div>
      {q.pairs.map((pr, i) => (
        <div key={pr.id} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
          <input value={pr.left} disabled={ro} placeholder="Left" onChange={(e) => { pr.left = e.target.value; bumpData(); }} style={{ ...input, marginBottom: 0, flex: 1 }} />
          <span style={{ color: "#bbb", fontSize: 12 }}>↔</span>
          <input value={pr.right} disabled={ro} placeholder="Right" onChange={(e) => { pr.right = e.target.value; bumpData(); }} style={{ ...input, marginBottom: 0, flex: 1 }} />
          {!ro && q.pairs.length > 2 && <button onClick={() => del(i)} style={iconDel}><X size={12} /></button>}
        </div>
      ))}
      {!ro && <button onClick={add} style={{ ...addBtn, marginTop: 2, fontSize: 10.5, padding: "4px 9px" }}><Plus size={11} /> Add pair</button>}
    </div>
  );
}

function EssayEditor({ q, ro }) {
  if (!q.rubric) q.rubric = [];
  const addCrit = () => { q.rubric.push({ id: uid("r"), criterion: "", points: 0 }); bumpData(); };
  const delCrit = (i) => { q.rubric.splice(i, 1); bumpData(); };
  const rubricTotal = q.rubric.reduce((s, r) => s + (Number(r.points) || 0), 0);
  return (
    <div>
      <div style={{ fontSize: 9.5, color: "#a8650f", marginBottom: 8, background: "#fdf3e6", padding: "6px 9px", borderRadius: 6 }}>
        Graded manually by a trainer. The model answer and rubric guide grading (and will feed AI-assisted grading later).
      </div>
      <div style={{ fontSize: 10, color: C.sub, marginBottom: 4 }}>Model / best answer</div>
      <textarea value={q.model || ""} disabled={ro} placeholder="The ideal answer, for the grader's reference…" onChange={(e) => { q.model = e.target.value; bumpData(); }} style={{ ...input, minHeight: 56, resize: "vertical", marginBottom: 10 }} />
      <div style={{ fontSize: 10, color: C.sub, marginBottom: 5 }}>Rubric ({rubricTotal} pts across criteria)</div>
      {q.rubric.map((r, i) => (
        <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
          <input value={r.criterion} disabled={ro} placeholder={`Criterion ${i + 1}`} onChange={(e) => { r.criterion = e.target.value; bumpData(); }} style={{ ...input, marginBottom: 0, flex: 1 }} />
          <input type="number" min="0" disabled={ro} value={r.points ?? 0} onChange={(e) => { r.points = Number(e.target.value); bumpData(); }} style={{ width: 56, border: `1px solid ${C.line}`, borderRadius: 6, padding: "6px 7px", fontSize: 11, fontFamily: FONT.body }} />
          <span style={{ fontSize: 10, color: C.sub }}>pts</span>
          {!ro && q.rubric.length > 1 && <button onClick={() => delCrit(i)} style={iconDel}><X size={12} /></button>}
        </div>
      ))}
      {!ro && <button onClick={addCrit} style={{ ...addBtn, marginTop: 2, fontSize: 10.5, padding: "4px 9px" }}><Plus size={11} /> Add criterion</button>}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 10.5, color: C.sub, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

const input = { width: "100%", border: `1px solid ${C.line}`, borderRadius: 8, padding: "9px 11px", fontSize: 13, fontFamily: FONT.body, color: C.ink, marginBottom: 0, boxSizing: "border-box" };
const rowBtn = { display: "flex", alignItems: "center", gap: 4, border: `1px solid ${C.line}`, background: "#fff", color: C.ink, fontSize: 11, padding: "6px 11px", borderRadius: 7, cursor: "pointer", fontFamily: FONT.body };
const ghostBtn = { display: "flex", alignItems: "center", gap: 5, border: `1px solid ${C.line}`, background: "#fff", color: C.ink, fontSize: 12, fontWeight: 500, padding: "8px 13px", borderRadius: 8, cursor: "pointer", fontFamily: FONT.body };
const primaryBtn = { display: "flex", alignItems: "center", gap: 5, border: "none", background: C.teal, color: "#fff", fontSize: 12, fontWeight: 600, padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontFamily: FONT.body };
const backBtn = { display: "flex", alignItems: "center", gap: 6, border: "none", background: "transparent", color: C.teal, fontSize: 12.5, fontWeight: 500, cursor: "pointer", fontFamily: FONT.body, padding: 0 };
const addBtn = { display: "flex", alignItems: "center", gap: 4, border: "none", background: "#e6eef1", color: C.teal, fontSize: 11, fontWeight: 500, padding: "6px 11px", borderRadius: 7, cursor: "pointer", fontFamily: FONT.body };
const miniBtn = { border: `1px solid ${C.line}`, background: "#fff", color: C.sub, fontSize: 10.5, padding: "3px 9px", borderRadius: 6, cursor: "pointer", fontFamily: FONT.body };
const iconDel = { border: "none", background: "transparent", color: "#ccc", cursor: "pointer", display: "flex", padding: 2 };
const arrowBtn = { border: "none", background: "transparent", color: "#bbb", cursor: "pointer", display: "flex", padding: 1 };
