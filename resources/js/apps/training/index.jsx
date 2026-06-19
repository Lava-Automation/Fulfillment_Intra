/**
 * Lava Training Tracker — frontend only.
 *
 * Data layer now lives in Laravel (TrainingController). This file no longer
 * talks to Supabase or writes the activity log directly; it fetches
 * /api/training/* and mutates via /api/training/* endpoints through lib/api.
 * Identity comes from the shell session (display only). Everything below the
 * data calls is pure UI — the markup/styling is unchanged from the Supabase
 * version. The activity_log writes now happen server-side in the controller.
 */

import { useState, useEffect, useCallback } from "react";
import {
  LayoutDashboard, Code, Shield, Radio, Contact, BookMarked, BarChart3,
  Settings as SettingsIcon, Plus, Pencil, Trash2, ChevronUp, ChevronDown,
  ArrowLeft, BadgeCheck, Search, LayoutGrid, List, X,
} from "lucide-react";
import { api } from "../../lib/api";

const C = {
  red: "#e73835", ink: "#24242d", teal: "#145365", white: "#ffffff", black: "#1b120b",
  paper: "#f7f8f8", line: "rgba(36,36,45,0.08)", sub: "#8a8f93", tealSoft: "#e6eef1",
};
const FONT = { body: "'Poppins', system-ui, sans-serif", head: "'Monument Extended', 'Poppins', system-ui, sans-serif" };

const NAV = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Training" },
  { key: "crm", label: "CRM Dev Training", icon: Code, group: "Training" },
  { key: "insurance", label: "Insurance Training", icon: Shield, group: "Training" },
  { key: "broad", label: "Broad Market Training", icon: Radio, group: "Training" },
  { key: "directory", label: "VA Directory", icon: Contact, group: "Manage" },
  { key: "catalog", label: "Course Catalog", icon: BookMarked, group: "Manage" },
  { key: "reports", label: "Reports", icon: BarChart3, group: "Manage" },
  { key: "settings", label: "Settings", icon: SettingsIcon, group: "Admin" },
];
const PAGE_META = {
  dashboard: ["Dashboard", "Training overview"],
  crm: ["CRM Dev Training", "Combo build track"],
  insurance: ["Insurance Training", "Gen and handed-off combo VAs"],
  broad: ["Broad Market Training", "Build-as-you-go, market-wide"],
  directory: ["VA Directory", "Everyone across the program"],
  catalog: ["Course Catalog", "Define and maintain courses"],
  reports: ["Training Reports", "Year to date"],
  settings: ["Settings", "Auto-enrollment and configuration"],
};
// Known categories (free text since the seed/uploads vary). Used in the editor.
const CATEGORIES = ["crm", "insurance", "automation", "general", "oneoff"];
const CAT_LABEL = { crm: "CRM", insurance: "Insurance", automation: "Automation", general: "General", oneoff: "One-off" };

const btn = {
  ghost: { display: "flex", alignItems: "center", gap: 5, border: `1px solid ${C.line}`, background: "#fff", color: C.ink, fontSize: 12, fontWeight: 500, padding: "8px 13px", borderRadius: 8, cursor: "pointer", fontFamily: FONT.body },
  primary: { display: "flex", alignItems: "center", gap: 5, border: "none", background: C.teal, color: "#fff", fontSize: 12, fontWeight: 600, padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontFamily: FONT.body },
  row: { display: "flex", alignItems: "center", gap: 4, border: `1px solid ${C.line}`, background: "#fff", color: C.ink, fontSize: 11, padding: "6px 11px", borderRadius: 7, cursor: "pointer", fontFamily: FONT.body },
  add: { display: "flex", alignItems: "center", gap: 4, border: "none", background: "#e6eef1", color: C.teal, fontSize: 11, fontWeight: 500, padding: "6px 11px", borderRadius: 7, cursor: "pointer", fontFamily: FONT.body },
  back: { display: "flex", alignItems: "center", gap: 6, border: "none", background: "transparent", color: C.teal, fontSize: 12.5, fontWeight: 500, cursor: "pointer", fontFamily: FONT.body, padding: 0 },
  arrow: { border: "none", background: "transparent", color: "#bbb", cursor: "pointer", display: "flex", padding: 1 },
  del: { border: "none", background: "transparent", color: "#ccc", cursor: "pointer", display: "flex", padding: 2 },
};
const input = { width: "100%", border: `1px solid ${C.line}`, borderRadius: 8, padding: "9px 11px", fontSize: 13, fontFamily: FONT.body, color: C.ink, boxSizing: "border-box", background: "#fff", outline: "none" };

function Sidebar({ nav, setNav }) {
  const groups = ["Training", "Manage", "Admin"];
  return (
    <div style={{ width: 230, flexShrink: 0, background: C.ink, color: "#fff", minHeight: "100vh", position: "sticky", top: 0, display: "flex", flexDirection: "column", fontFamily: FONT.body }}>
      <div style={{ padding: "20px 20px 14px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 9, height: 26, background: C.red, borderRadius: 2 }} />
        <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: "-0.02em" }}>Lava Training</div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 12px" }}>
        {groups.map((g) => (
          <div key={g} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.8px", color: "rgba(255,255,255,0.35)", padding: "6px 10px" }}>{g}</div>
            {NAV.filter((n) => n.group === g).map((n) => {
              const Icon = n.icon; const on = nav === n.key;
              return (
                <button key={n.key} onClick={() => setNav(n.key)} style={{ width: "100%", textAlign: "left", border: "none", background: on ? "rgba(255,255,255,0.1)" : "transparent", color: on ? "#fff" : "rgba(255,255,255,0.65)", fontFamily: FONT.body, fontSize: 12.5, fontWeight: on ? 600 : 500, padding: "9px 10px", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 9 }}>
                  <Icon size={16} strokeWidth={2} /> {n.label}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function Placeholder({ title }) {
  return (
    <div style={{ background: "#fff", border: `1px dashed ${C.line}`, borderRadius: 12, padding: "56px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: C.sub, maxWidth: 460, margin: "0 auto", lineHeight: 1.6 }}>
        This view is wired in a later pass. The course catalog (the foundation both training apps build on) is live now under Course Catalog.
      </div>
    </div>
  );
}

// ---------------- Catalog (wired to courses/modules/lessons) ----------------
function Catalog() {
  const [courses, setCourses] = useState([]); // [{...course, modules:[{...module, lessons:[]}]}]
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get("/api/training/catalog");
      const lessonsByModule = {};
      (data.lessons || []).forEach((l) => { (lessonsByModule[l.module_id] = lessonsByModule[l.module_id] || []).push(l); });
      const modulesByCourse = {};
      (data.modules || []).forEach((m) => { (modulesByCourse[m.course_id] = modulesByCourse[m.course_id] || []).push({ ...m, lessons: lessonsByModule[m.module_id] || [] }); });
      setCourses((data.courses || []).map((c) => ({ ...c, modules: modulesByCourse[c.course_id] || [] })));
    } catch (e) {
      alert("Could not load catalog: " + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createCourse() {
    try {
      const data = await api.post("/api/training/courses", { name: "New course", category: "oneoff", cert: false });
      await load();
      setEditId(data?.course_id);
    } catch (e) { alert("Could not create course: " + e.message); }
  }

  if (editId) {
    const course = courses.find((c) => c.course_id === editId);
    return <CourseEditor course={course} onBack={() => setEditId(null)} reload={load} />;
  }

  const q = search.trim().toLowerCase();
  const groups = CATEGORIES.map((cat) => ({
    cat,
    courses: courses.filter((c) => (c.category || "oneoff") === cat && (!q || c.name.toLowerCase().includes(q) || (c.description || "").toLowerCase().includes(q))),
  })).filter((g) => g.courses.length);
  // categories present in data but not in the known list
  const extraCats = [...new Set(courses.map((c) => c.category).filter((cat) => cat && !CATEGORIES.includes(cat)))];
  extraCats.forEach((cat) => {
    const cs = courses.filter((c) => c.category === cat && (!q || c.name.toLowerCase().includes(q)));
    if (cs.length) groups.push({ cat, courses: cs });
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12 }}>
        <div style={{ fontSize: 12, color: C.sub, maxWidth: 480, lineHeight: 1.5 }}>The source of truth for all courses and modules. Lesson content (blocks, quizzes) is authored once content uploads land.</div>
        <button onClick={createCourse} style={btn.primary}><Plus size={13} /> New course</button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 7, background: "#fff", border: `1px solid ${C.line}`, borderRadius: 9, padding: "8px 11px", maxWidth: 420, marginBottom: 16 }}>
        <Search size={14} color={C.sub} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search courses…" style={{ border: "none", outline: "none", fontSize: 12, fontFamily: FONT.body, flex: 1, background: "transparent" }} />
      </div>

      {loading ? <div style={{ color: C.sub, fontSize: 13, padding: 20 }}>Loading catalog…</div>
        : groups.length === 0 ? <div style={{ padding: 24, color: C.sub, fontSize: 13, background: "#fff", border: `1px dashed ${C.line}`, borderRadius: 12 }}>No courses yet. Run the catalog seed, or add one.</div>
        : groups.map((g) => (
          <div key={g.cat} style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.teal }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{CAT_LABEL[g.cat] || g.cat}</span>
              <span style={{ fontSize: 10, color: "#bbb" }}>{g.courses.length}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {g.courses.map((co) => {
                const lessonCount = co.modules.reduce((n, m) => n + m.lessons.length, 0);
                return (
                  <div key={co.course_id} onClick={() => setEditId(co.course_id)} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 11, padding: "13px 16px", cursor: "pointer" }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: C.ink, display: "flex", alignItems: "center", gap: 6 }}>
                      {co.name}
                      {co.cert && <span style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "#e1f5ee", color: "#0f6e56", fontSize: 9, fontWeight: 600, padding: "2px 7px", borderRadius: 20 }}><BadgeCheck size={10} /> Cert</span>}
                    </div>
                    {co.description && <div style={{ fontSize: 11.5, color: C.sub, marginTop: 3, lineHeight: 1.4 }}>{co.description}</div>}
                    <div style={{ fontSize: 10.5, color: "#aaa", marginTop: 5 }}>{co.modules.length} modules · {lessonCount} lessons</div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
    </div>
  );
}

function CourseEditor({ course, onBack, reload }) {
  const [showSettings, setShowSettings] = useState(false);
  if (!course) return <div style={{ padding: 20 }}>Course not found.</div>;
  const lessonCount = course.modules.reduce((n, m) => n + m.lessons.length, 0);

  const setField = async (field, val) => {
    try { await api.patch(`/api/training/courses/${course.course_id}`, { [field]: val }); reload(); }
    catch (e) { alert("Save failed: " + e.message); }
  };
  const delCourse = async () => {
    if (!confirm(`Delete "${course.name}" and all its modules and lessons?`)) return;
    try { await api.del(`/api/training/courses/${course.course_id}`); onBack(); reload(); }
    catch (e) { alert("Delete failed: " + e.message); }
  };
  const addModule = async () => {
    try { await api.post("/api/training/modules", { course_id: course.course_id, name: "New module", position: course.modules.length }); reload(); }
    catch (e) { alert("Add module failed: " + e.message); }
  };
  const renameModule = async (mid, name) => { try { await api.patch(`/api/training/modules/${mid}`, { name }); reload(); } catch (e) { alert("Rename failed: " + e.message); } };
  const delModule = async (mid) => {
    if (!confirm("Delete this module and its lessons?")) return;
    try { await api.del(`/api/training/modules/${mid}`); reload(); } catch (e) { alert("Delete failed: " + e.message); }
  };
  const addLesson = async (mid, pos) => { try { await api.post("/api/training/lessons", { module_id: mid, name: "New lesson", position: pos }); reload(); } catch (e) { alert("Add lesson failed: " + e.message); } };
  const renameLesson = async (lid, name) => { try { await api.patch(`/api/training/lessons/${lid}`, { name }); reload(); } catch (e) { alert("Rename failed: " + e.message); } };
  const delLesson = async (lid) => { try { await api.del(`/api/training/lessons/${lid}`); reload(); } catch (e) { alert("Delete failed: " + e.message); } };
  // reorder by swapping positions of two rows
  const swap = async (kind, a, b) => {
    try {
      await api.patch(`/api/training/${kind}/${a[kind === "modules" ? "module_id" : "lesson_id"]}`, { position: b.position });
      await api.patch(`/api/training/${kind}/${b[kind === "modules" ? "module_id" : "lesson_id"]}`, { position: a.position });
      reload();
    } catch (e) { alert("Reorder failed: " + e.message); }
  };
  const moveModule = (i, dir) => { const j = i + dir; if (j < 0 || j >= course.modules.length) return; swap("modules", course.modules[i], course.modules[j]); };
  const moveLesson = (m, i, dir) => { const j = i + dir; if (j < 0 || j >= m.lessons.length) return; swap("lessons", m.lessons[i], m.lessons[j]); };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <button onClick={onBack} style={btn.back}><ArrowLeft size={14} /> Back to catalog</button>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowSettings((s) => !s)} style={btn.row}><Pencil size={12} /> Course settings</button>
          <button onClick={delCourse} style={{ ...btn.row, color: C.red, borderColor: "#f3c9c8" }}><Trash2 size={12} /> Delete</button>
        </div>
      </div>

      <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12, padding: "14px 18px", marginBottom: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.ink, display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: C.teal }} />
          {course.name}
          {course.cert && <span style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "#e1f5ee", color: "#0f6e56", fontSize: 9, fontWeight: 600, padding: "2px 7px", borderRadius: 20 }}><BadgeCheck size={10} /> Cert</span>}
        </div>
        <div style={{ fontSize: 11, color: C.sub, marginTop: 3 }}>{CAT_LABEL[course.category] || course.category} · {course.modules.length} modules · {lessonCount} lessons</div>
      </div>

      {showSettings && (
        <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12, padding: "16px 20px", marginBottom: 12, maxWidth: 620 }}>
          <Field label="Course name"><input value={course.name} onChange={(e) => setField("name", e.target.value)} style={input} /></Field>
          <Field label="Category"><select value={course.category || "oneoff"} onChange={(e) => setField("category", e.target.value)} style={input}>{CATEGORIES.map((k) => <option key={k} value={k}>{CAT_LABEL[k]}</option>)}</select></Field>
          <Field label="Description"><textarea value={course.description || ""} onChange={(e) => setField("description", e.target.value)} style={{ ...input, minHeight: 56, resize: "vertical" }} /></Field>
          <Field label="Issues certificate">
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: C.ink, cursor: "pointer" }}>
              <input type="checkbox" checked={!!course.cert} onChange={(e) => setField("cert", e.target.checked)} /> Earned on completion
            </label>
          </Field>
        </div>
      )}

      <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12, padding: 16, maxWidth: 620 }}>
        <div style={{ fontSize: 10.5, fontWeight: 600, color: C.sub, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Course outline</div>
        {course.modules.length === 0 && <div style={{ fontSize: 11.5, color: "#bbb", marginBottom: 10 }}>No modules yet.</div>}
        {course.modules.map((m, mi) => (
          <div key={m.module_id} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 18, height: 18, borderRadius: 5, background: "#eef0f2", color: C.sub, fontSize: 10, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{mi + 1}</span>
              <input defaultValue={m.name} onBlur={(e) => e.target.value !== m.name && renameModule(m.module_id, e.target.value)} style={{ flex: 1, border: "none", outline: "none", fontSize: 12.5, fontWeight: 600, color: C.ink, fontFamily: FONT.body, background: "transparent", padding: "2px 0" }} />
              <button onClick={() => moveModule(mi, -1)} style={btn.arrow}><ChevronUp size={13} /></button>
              <button onClick={() => moveModule(mi, 1)} style={btn.arrow}><ChevronDown size={13} /></button>
              <button onClick={() => delModule(m.module_id)} style={btn.del}><Trash2 size={12} /></button>
            </div>
            <div style={{ paddingLeft: 22, marginTop: 4 }}>
              {m.lessons.map((l, li) => (
                <div key={l.lesson_id} style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
                  <span style={{ color: "#cbd0d3", fontSize: 11 }}>•</span>
                  <input defaultValue={l.name} onBlur={(e) => e.target.value !== l.name && renameLesson(l.lesson_id, e.target.value)} style={{ flex: 1, border: "none", outline: "none", fontSize: 11.5, color: "#555", fontFamily: FONT.body, background: "transparent", padding: "3px 0" }} />
                  <button onClick={() => moveLesson(m, li, -1)} style={btn.arrow}><ChevronUp size={12} /></button>
                  <button onClick={() => moveLesson(m, li, 1)} style={btn.arrow}><ChevronDown size={12} /></button>
                  <button onClick={() => delLesson(l.lesson_id)} style={btn.del}><Trash2 size={11} /></button>
                </div>
              ))}
              <button onClick={() => addLesson(m.module_id, m.lessons.length)} style={{ ...btn.add, marginTop: 4, fontSize: 10.5, padding: "4px 9px" }}><Plus size={11} /> Add lesson</button>
            </div>
          </div>
        ))}
        <button onClick={addModule} style={{ ...btn.add, marginTop: 6, width: "100%", justifyContent: "center" }}><Plus size={13} /> Add module</button>
      </div>
      <div style={{ fontSize: 10, color: "#bbb", marginTop: 12, lineHeight: 1.5, maxWidth: 620 }}>Edits save to the database. Lesson content authoring (text, video, quizzes) comes with content uploads.</div>
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

// ---------------- Directory (wired to vas + employees) ----------------
const ini = (n) => (n || "?").split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
const AV_COLORS = [C.red, C.teal, C.ink, "#5b3b9c", "#0c6b5e", "#a8650f"];
const VA_STATUS = { onboarding: ["Onboarding", "#fdf0dd", "#a8650f"], training: ["In Training", "#e1f0f5", "#0c447c"], active: ["Deployed", "#e1f5ee", "#0f6e56"] };
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

function VAStatusPill({ status }) {
  const [lbl, bg, fg] = VA_STATUS[status] || [status || "—", "#eef0f2", C.sub];
  return <span style={{ background: bg, color: fg, fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 20, whiteSpace: "nowrap" }}>{lbl}</span>;
}
function TypePill({ type }) {
  const combo = type === "combo";
  return <span style={{ background: combo ? "#fce8e8" : "#e1f0f5", color: combo ? "#a32d2d" : "#0c447c", fontSize: 9, fontWeight: 600, padding: "2px 7px", borderRadius: 20 }}>{combo ? "Combo" : "Gen"}</span>;
}

// Shared: load the enriched VA roster (vas + employee names + agency + trainers).
async function loadVARoster() {
  const data = await api.get("/api/training/va-roster");
  const emp = Object.fromEntries((data.employees || []).map((e) => [e.id, e.name]));
  const accs = data.accounts || [];
  const compName = Object.fromEntries((data.companies || []).map((c) => [c.id, c.name]));
  const acctName = Object.fromEntries(accs.map((a) => [a.account_id, compName[a.hubspot_company_id] || "—"]));
  return (data.vas || []).map((v) => ({
    ...v,
    name: emp[v.employee_id] || "Unknown",
    agency: v.account_id ? (acctName[v.account_id] || "—") : "—",
    devTrainer: emp[v.dev_trainer_id] || null,
    insTrainer: emp[v.ins_trainer_id] || null,
  })).sort((a, b) => a.name.localeCompare(b.name));
}

// Header global search: find any VA from anywhere, open its drawer in place.
function GlobalSearch({ catalog }) {
  const [roster, setRoster] = useState([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(null);
  useEffect(() => { let alive = true; loadVARoster().then((r) => alive && setRoster(r)).catch(() => {}); return () => { alive = false; }; }, []);
  const term = q.trim().toLowerCase();
  const results = term ? roster.filter((r) => r.name.toLowerCase().includes(term) || (r.agency || "").toLowerCase().includes(term)).slice(0, 8) : [];
  return (
    <div style={{ position: "relative", width: 260 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, background: "#fff", border: `1px solid ${C.line}`, borderRadius: 9, padding: "8px 11px" }}>
        <Search size={14} color={C.sub} />
        <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
          placeholder="Search any VA…" style={{ border: "none", outline: "none", fontSize: 12, fontFamily: FONT.body, background: "transparent", width: "100%" }} />
      </div>
      {open && term && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: `1px solid ${C.line}`, borderRadius: 9, boxShadow: "0 12px 30px rgba(0,0,0,0.12)", zIndex: 50, maxHeight: 320, overflowY: "auto" }}>
          {results.length === 0 ? <div style={{ padding: "10px 12px", fontSize: 12, color: C.sub }}>No VA matches.</div>
            : results.map((r) => (
              <div key={r.employee_id} onMouseDown={() => { setSel(r); setOpen(false); setQ(""); }} style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 12px", cursor: "pointer", borderBottom: `1px solid ${C.line}` }}>
                <div style={{ background: AV_COLORS[r.name.charCodeAt(0) % AV_COLORS.length], width: 24, height: 24, borderRadius: "50%", color: "#fff", fontSize: 8, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>{ini(r.name)}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: C.ink }}>{r.name}</div>
                  <div style={{ fontSize: 10.5, color: C.sub }}>{r.agency}</div>
                </div>
              </div>
            ))}
        </div>
      )}
      {sel && <VADrawer t={sel} catalog={catalog} onClose={() => setSel(null)} />}
    </div>
  );
}

function Directory({ catalog }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [view, setView] = useState("card");
  const [q, setQ] = useState("");
  const [skill, setSkill] = useState("all");
  const [openVA, setOpenVA] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await loadVARoster();
      setRows(list);
    } catch (e) {
      alert("Could not load VAs: " + e.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const skillOptions = [...new Set((catalog || []).map((c) => c.name))].sort();
  const term = q.toLowerCase();
  const list = rows.filter((t) => {
    if (status !== "all" && t.status !== status) return false;
    if (skill !== "all" && !(t.skills || []).includes(skill)) return false;
    if (term && !t.name.toLowerCase().includes(term) && !(t.agency || "").toLowerCase().includes(term)) return false;
    return true;
  });

  const tabs = [["all", "All"], ["onboarding", "Onboarding"], ["training", "In Training"], ["active", "Deployed"]];
  const tab = (k, lbl) => {
    const on = status === k;
    return <button key={k} onClick={() => setStatus(k)} style={{ border: "none", background: on ? C.ink : "transparent", color: on ? "#fff" : C.sub, fontSize: 12, fontWeight: 600, padding: "7px 13px", borderRadius: 8, cursor: "pointer", fontFamily: FONT.body }}>{lbl}</button>;
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 4, background: "#fff", border: `1px solid ${C.line}`, borderRadius: 10, padding: 4 }}>{tabs.map(([k, l]) => tab(k, l))}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, background: "#fff", border: `1px solid ${C.line}`, borderRadius: 9, padding: "8px 11px" }}>
            <Search size={14} color={C.sub} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search VA or agency…" style={{ border: "none", outline: "none", fontSize: 12, fontFamily: FONT.body, background: "transparent", width: 180 }} />
          </div>
          <select value={skill} onChange={(e) => setSkill(e.target.value)} style={{ border: `1px solid ${C.line}`, borderRadius: 9, padding: "8px 9px", fontSize: 12, fontFamily: FONT.body, background: "#fff", color: C.ink }}>
            <option value="all">All skills</option>
            {skillOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <div style={{ display: "flex", gap: 2, background: "#fff", border: `1px solid ${C.line}`, borderRadius: 9, padding: 3 }}>
            {[["card", LayoutGrid], ["list", List]].map(([k, Icon]) => (
              <button key={k} onClick={() => setView(k)} style={{ border: "none", background: view === k ? "#e6eef1" : "transparent", color: view === k ? C.teal : C.sub, padding: "6px 9px", borderRadius: 6, cursor: "pointer", display: "flex" }}><Icon size={15} /></button>
            ))}
          </div>
        </div>
      </div>

      {loading ? <div style={{ color: C.sub, fontSize: 13, padding: 20 }}>Loading VAs…</div>
        : list.length === 0 ? <div style={{ padding: 24, color: C.sub, fontSize: 13, background: "#fff", border: `1px dashed ${C.line}`, borderRadius: 12 }}>No VAs match.</div>
        : view === "list" ? (
          <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "40px 1.6fr 1.1fr 1fr 0.9fr 0.9fr", gap: 10, padding: "10px 16px", fontSize: 10, color: C.sub, textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: `1px solid ${C.line}` }}>
              <span /><span>VA / Agency</span><span>Dev trainer</span><span>Ins trainer</span><span>Status</span><span>Started</span>
            </div>
            {list.map((t, i) => (
              <div key={t.employee_id} onClick={() => setOpenVA(t)} style={{ display: "grid", gridTemplateColumns: "40px 1.6fr 1.1fr 1fr 0.9fr 0.9fr", gap: 10, padding: "11px 16px", alignItems: "center", borderBottom: `1px solid ${C.line}`, cursor: "pointer" }}>
                <div style={{ background: AV_COLORS[i % AV_COLORS.length], width: 24, height: 24, borderRadius: "50%", color: "#fff", fontSize: 8, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>{ini(t.name)}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: C.ink, display: "flex", alignItems: "center", gap: 5 }}>{t.name} <TypePill type={t.type} /></div>
                  <div style={{ fontSize: 10.5, color: C.sub }}>{t.agency}</div>
                </div>
                <div style={{ fontSize: 11.5, color: C.sub }}>{t.devTrainer || "—"}</div>
                <div style={{ fontSize: 11.5, color: C.sub }}>{t.insTrainer || "—"}</div>
                <div><VAStatusPill status={t.status} /></div>
                <div style={{ fontSize: 11.5, color: C.sub }}>{fmtDate(t.started_at)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 14 }}>
            {list.map((t, i) => (
              <div key={t.employee_id} onClick={() => setOpenVA(t)} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12, padding: 16, cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                  <div style={{ background: AV_COLORS[i % AV_COLORS.length], width: 32, height: 32, borderRadius: "50%", color: "#fff", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{ini(t.name)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, display: "flex", alignItems: "center", gap: 6 }}>{t.name} <TypePill type={t.type} /></div>
                    <div style={{ fontSize: 11, color: C.sub }}>{t.agency}</div>
                  </div>
                  <VAStatusPill status={t.status} />
                </div>
                <div style={{ fontSize: 9, color: C.sub, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 6 }}>Skills</div>
                {(t.skills && t.skills.length) ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {t.skills.map((s, j) => <span key={j} style={{ background: "#eef0f2", color: "#555", fontSize: 9.5, padding: "3px 8px", borderRadius: 20 }}>{s}</span>)}
                  </div>
                ) : <span style={{ fontSize: 10, color: "#ccc" }}>No skills tagged yet</span>}
              </div>
            ))}
          </div>
        )}

      {openVA && <VADrawer t={openVA} catalog={catalog} onClose={() => setOpenVA(null)} onChanged={load} />}
    </div>
  );
}

function VADrawer({ t, catalog, onClose, onChanged }) {
  const [skills, setSkills] = useState(t.skills || []);
  const modPct = t.mods_total ? Math.round((100 * (t.mods_done || 0)) / t.mods_total) : null;
  const available = [...new Set((catalog || []).map((c) => c.name))].filter((n) => !skills.includes(n)).sort();

  async function saveSkills(next, verb, name) {
    try {
      await api.patch(`/api/training/vas/${t.employee_id}/skills`, { skills: next, verb, skill: name });
      setSkills(next);
      onChanged && onChanged();
    } catch (e) { alert("Could not update skills: " + e.message); }
  }
  const addSkill = (name) => { if (name && !skills.includes(name)) saveSkills([...skills, name], "added", name); };
  const removeSkill = (name) => saveSkills(skills.filter((s) => s !== name), "removed", name);

  const Row = ({ label, value }) => (
    <div style={{ display: "flex", alignItems: "baseline", gap: 12, padding: "7px 0" }}>
      <span style={{ width: 130, flexShrink: 0, fontSize: 12, color: C.sub }}>{label}</span>
      <span style={{ fontSize: 13, color: C.ink, fontWeight: 500 }}>{value ?? "—"}</span>
    </div>
  );
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(27,18,11,0.4)", zIndex: 60, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 460, maxWidth: "100vw", height: "100%", background: "#fff", overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <div style={{ background: C.ink, padding: "20px 24px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ background: C.teal, width: 40, height: 40, borderRadius: "50%", color: "#fff", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>{ini(t.name)}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 7 }}>{t.name} <TypePill type={t.type} /></div>
            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.6)" }}>{t.title || "VA"} · {t.agency}</div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", width: 28, height: 28, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={16} /></button>
        </div>
        <div style={{ padding: "18px 24px", flex: 1 }}>
          <div style={{ marginBottom: 8 }}><VAStatusPill status={t.status} />{t.certified && <span style={{ marginLeft: 8, display: "inline-flex", alignItems: "center", gap: 3, background: "#e1f5ee", color: "#0f6e56", fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 20 }}><BadgeCheck size={11} /> Certified</span>}</div>
          {t.bio && <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.6, margin: "10px 0 14px" }}>{t.bio}</div>}
          <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 8, paddingTop: 8 }}>
            <Row label="Dev trainer" value={t.devTrainer} />
            <Row label="Insurance trainer" value={t.insTrainer} />
            <Row label="Started" value={fmtDate(t.started_at)} />
            <Row label="Modules done" value={t.mods_total ? `${t.mods_done || 0} / ${t.mods_total}${modPct != null ? ` (${modPct}%)` : ""}` : "—"} />
            <Row label="Task completion" value={t.task_comp != null ? `${t.task_comp}%` : "—"} />
            <Row label="Tasks run" value={t.tasks_run != null ? String(t.tasks_run) : "—"} />
          </div>
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 9.5, color: C.sub, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Skills</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {skills.length ? skills.map((s, j) => (
                <span key={j} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#eef0f2", color: "#555", fontSize: 11, padding: "4px 7px 4px 10px", borderRadius: 20 }}>
                  {s}
                  <button onClick={() => removeSkill(s)} title="Remove" style={{ background: "none", border: "none", cursor: "pointer", color: "#999", display: "flex", padding: 0 }}><X size={12} /></button>
                </span>
              )) : <span style={{ fontSize: 12, color: "#ccc" }}>No skills tagged yet.</span>}
            </div>
            {available.length > 0 && (
              <select value="" onChange={(e) => { if (e.target.value) addSkill(e.target.value); }} style={{ border: `1px solid ${C.line}`, borderRadius: 8, padding: "6px 9px", fontSize: 12, fontFamily: FONT.body, background: "#fff", color: C.ink }}>
                <option value="">+ Add skill…</option>
                {available.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------- Tracks (enrollments + module_progress) ----------------
// CRM track = enrollments.track 'crm'; Insurance = 'ins'; Broad = neither (the
// general/oneoff/automation courses, track null).
const TRACK_OF_CATEGORY = { crm: "crm", insurance: "ins" };

async function enrollVA(vaId, course) {
  const track = TRACK_OF_CATEGORY[course.category] || null;
  try {
    await api.post("/api/training/enrollments", { va_id: vaId, course_id: course.course_id, track });
    return true;
  } catch (e) {
    alert("Could not enroll: " + e.message);
    return false;
  }
}

function TrackView({ track, blurb }) {
  const [rows, setRows] = useState([]);
  const [courses, setCourses] = useState([]); // courses available for this track
  const [vaRoster, setVaRoster] = useState([]); // [{id,name}]
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(() => new Set());
  const [enrollOpen, setEnrollOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get("/api/training/track");
      const emp = Object.fromEntries((data.employees || []).map((e) => [e.id, e.name]));
      const courseById = Object.fromEntries((data.courses || []).map((c) => [c.course_id, c]));
      const modsByCourse = {};
      (data.modules || []).forEach((m) => { (modsByCourse[m.course_id] = modsByCourse[m.course_id] || []).push(m); });
      const mpByEnr = {};
      (data.moduleProgress || []).forEach((mp) => { (mpByEnr[mp.enrollment_id] = mpByEnr[mp.enrollment_id] || []).push(mp); });

      const inTrack = (e) => track === "broad" ? (e.track !== "crm" && e.track !== "ins") : e.track === track;
      const built = (data.enrollments || []).filter(inTrack).map((e) => {
        const course = courseById[e.course_id] || {};
        const courseMods = (modsByCourse[e.course_id] || []);
        const mpRows = mpByEnr[e.enrollment_id] || [];
        const mpByModule = Object.fromEntries(mpRows.map((mp) => [mp.module_id, mp]));
        const modules = courseMods.map((m) => ({ ...m, mp: mpByModule[m.module_id] || null }));
        const pcts = modules.map((m) => m.mp?.pct || 0);
        return {
          ...e,
          vaName: emp[e.va_id] || "Unknown",
          courseName: course.name || "—",
          cert: !!course.cert,
          modules,
          overall: pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0,
        };
      }).sort((a, b) => a.vaName.localeCompare(b.vaName));

      // courses offered on this track for the enroll picker
      const offered = (data.courses || []).filter((c) => track === "broad" ? !TRACK_OF_CATEGORY[c.category] : TRACK_OF_CATEGORY[c.category] === track);
      setCourses(offered.sort((a, b) => a.name.localeCompare(b.name)));
      setVaRoster((data.vaIds || []).map((id) => ({ id, name: emp[id] || "Unknown" })).filter((o) => o.name !== "Unknown").sort((a, b) => a.name.localeCompare(b.name)));
      setRows(built);
    } catch (e) {
      alert("Could not load track: " + e.message);
    } finally {
      setLoading(false);
    }
  }, [track]);

  useEffect(() => { load(); }, [load]);

  const toggle = (id) => setExpanded((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  async function cycleModule(row, m) {
    const cur = m.mp?.pct || 0;
    const next = cur >= 100 ? 0 : cur === 0 ? 50 : 100;
    // auto-complete the enrollment when every module is at 100
    const allDone = row.modules.every((x) => (x.module_id === m.module_id ? next : (x.mp?.pct || 0)) >= 100);
    try {
      await api.patch(`/api/training/enrollments/${row.enrollment_id}/module-progress`, {
        module_id: m.module_id, pct: next, completed: allDone, module_name: m.name,
      });
      load();
    } catch (e) { alert("Update failed: " + e.message); }
  }
  async function unenroll(row) {
    if (!confirm(`Unenroll ${row.vaName} from ${row.courseName}?`)) return;
    try { await api.del(`/api/training/enrollments/${row.enrollment_id}`); load(); }
    catch (e) { alert("Unenroll failed: " + e.message); }
  }

  const pctColor = (p) => p >= 100 ? "#0f6e56" : p > 0 ? C.teal : "#bbb";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: C.sub, maxWidth: 520, lineHeight: 1.5 }}>{blurb}</div>
        <button onClick={() => setEnrollOpen(true)} style={btn.primary}><Plus size={13} /> Enroll VA</button>
      </div>

      {loading ? <div style={{ color: C.sub, fontSize: 13, padding: 20 }}>Loading…</div>
        : rows.length === 0 ? <div style={{ padding: 24, color: C.sub, fontSize: 13, background: "#fff", border: `1px dashed ${C.line}`, borderRadius: 12 }}>No VAs enrolled on this track yet. Use “Enroll VA” to add one.</div>
        : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {rows.map((r) => {
              const open = expanded.has(r.enrollment_id);
              return (
                <div key={r.enrollment_id} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12 }}>
                  <div onClick={() => toggle(r.enrollment_id)} style={{ display: "grid", gridTemplateColumns: "1.4fr 1.6fr 120px 90px 32px", gap: 12, alignItems: "center", padding: "13px 16px", cursor: "pointer" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, display: "flex", alignItems: "center", gap: 6 }}>{r.vaName}{r.cert && <BadgeCheck size={12} color="#0f6e56" />}</div>
                    <div style={{ fontSize: 12, color: C.sub }}>{r.courseName}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 6, borderRadius: 4, background: "#eee", overflow: "hidden" }}><div style={{ width: `${r.overall}%`, height: "100%", background: pctColor(r.overall) }} /></div>
                      <span style={{ fontSize: 11, color: C.sub, width: 30 }}>{r.overall}%</span>
                    </div>
                    <div>{r.completed ? <span style={{ background: "#e1f5ee", color: "#0f6e56", fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 20 }}>Complete</span> : <span style={{ background: "#e1f0f5", color: "#0c447c", fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 20 }}>In progress</span>}</div>
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>{open ? <ChevronUp size={16} color="#bbb" /> : <ChevronDown size={16} color="#bbb" />}</div>
                  </div>
                  {open && (
                    <div style={{ borderTop: `1px solid ${C.line}`, padding: "12px 16px", background: "#fcfcfd" }}>
                      <div style={{ fontSize: 10, color: C.sub, marginBottom: 8 }}>Started {fmtDate(r.started_at)} · click a module to cycle 0 → 50 → 100%</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                        {r.modules.length ? r.modules.map((m) => {
                          const p = m.mp?.pct || 0;
                          return (
                            <button key={m.module_id} onClick={() => cycleModule(r, m)} style={{ border: `1px solid ${C.line}`, background: p >= 100 ? "#e1f5ee" : p > 0 ? "#e6eef1" : "#fff", color: p >= 100 ? "#0f6e56" : p > 0 ? C.teal : C.sub, fontSize: 11, fontWeight: 500, padding: "6px 11px", borderRadius: 8, cursor: "pointer", fontFamily: FONT.body, display: "flex", alignItems: "center", gap: 6 }}>
                              {m.name} <span style={{ fontWeight: 700 }}>{p}%</span>
                            </button>
                          );
                        }) : <span style={{ fontSize: 11.5, color: "#bbb" }}>This course has no modules.</span>}
                      </div>
                      <button onClick={() => unenroll(r)} style={{ ...btn.row, color: C.red, borderColor: "#f3c9c8" }}><Trash2 size={12} /> Unenroll</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      {enrollOpen && <EnrollModal courses={courses} roster={vaRoster} onClose={() => setEnrollOpen(false)} onEnroll={async (vaId, course) => { const ok = await enrollVA(vaId, course); if (ok) { setEnrollOpen(false); load(); } }} />}
    </div>
  );
}

function EnrollModal({ courses, roster, onClose, onEnroll }) {
  const [vaId, setVaId] = useState(roster[0]?.id || "");
  const [courseId, setCourseId] = useState(courses[0]?.course_id || "");
  const sel = { width: "100%", padding: "9px 11px", borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 12.5, fontFamily: FONT.body, marginBottom: 14, background: "#fff" };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(27,18,11,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 70 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, padding: "24px 26px", width: 400, maxWidth: "92vw", fontFamily: FONT.body }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.ink, marginBottom: 14 }}>Enroll a VA</div>
        <div style={{ fontSize: 10.5, color: C.sub, marginBottom: 5 }}>Virtual assistant</div>
        <select value={vaId} onChange={(e) => setVaId(e.target.value)} style={sel}>{roster.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
        <div style={{ fontSize: 10.5, color: C.sub, marginBottom: 5 }}>Course</div>
        {courses.length ? <select value={courseId} onChange={(e) => setCourseId(e.target.value)} style={sel}>{courses.map((c) => <option key={c.course_id} value={c.course_id}>{c.name}</option>)}</select>
          : <div style={{ fontSize: 12, color: C.sub, marginBottom: 14 }}>No courses on this track yet. Add one in the Catalog.</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={btn.ghost}>Cancel</button>
          <button disabled={!vaId || !courseId} onClick={() => onEnroll(vaId, courses.find((c) => c.course_id === courseId))} style={{ ...btn.primary, opacity: vaId && courseId ? 1 : 0.4 }}>Enroll</button>
        </div>
      </div>
    </div>
  );
}

// ---------------- Dashboard (real counts) ----------------
function Dashboard() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await api.get("/api/training/dashboard");
        if (alive) setStats(data);
      } catch (e) { /* leave loading state */ }
    })();
    return () => { alive = false; };
  }, []);

  const cards = stats ? [
    { label: "Total VAs", value: stats.total },
    { label: "In training", value: stats.inTraining },
    { label: "Deployed", value: stats.deployed },
    { label: "Certified", value: stats.certified },
    { label: "Courses", value: stats.courses },
    { label: "Enrollments", value: stats.enrollments },
  ] : [];

  return (
    <div>
      {!stats ? <div style={{ color: C.sub, fontSize: 13, padding: 20 }}>Loading…</div> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14 }}>
          {cards.map((c) => (
            <div key={c.label} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: C.ink, fontFamily: FONT.head }}>{c.value}</div>
              <div style={{ fontSize: 11.5, color: C.sub, marginTop: 4 }}>{c.label}</div>
            </div>
          ))}
        </div>
      )}
      <div style={{ fontSize: 11, color: "#bbb", marginTop: 16 }}>Enroll VAs from the CRM / Insurance / Broad track tabs; progress rolls up here.</div>
    </div>
  );
}

// ---------------- Settings (skills catalog manager) ----------------
function Settings({ catalog, reload }) {
  const [adding, setAdding] = useState({});   // per-category inline input text
  const [newCat, setNewCat] = useState("");
  const [newCatSkill, setNewCatSkill] = useState("");

  const byCat = {};
  (catalog || []).forEach((c) => { (byCat[c.category] = byCat[c.category] || []).push(c); });
  const cats = Object.keys(byCat).sort();

  async function addSkill(category, name) {
    const n = (name || "").trim(); if (!n) return;
    if ((byCat[category] || []).some((s) => s.name.toLowerCase() === n.toLowerCase())) { alert(`"${n}" already exists in ${category}.`); return; }
    try { await api.post("/api/training/skills", { category, name: n }); reload(); }
    catch (e) { alert("Could not add skill: " + e.message); }
  }
  async function removeSkill(s) {
    try { await api.del(`/api/training/skills/${s.skill_id}`); reload(); }
    catch (e) { alert("Could not remove skill: " + e.message); }
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ fontSize: 12, color: C.sub, lineHeight: 1.5, marginBottom: 16 }}>The skills directory governs which skills can be granted to VAs (in the Directory) and what the Has-skill filter offers. Removing a skill stops it being offered; it does not strip it from VAs who already have it.</div>

      {cats.map((cat) => (
        <div key={cat} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12, padding: "14px 16px", marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 10 }}>{cat}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 10 }}>
            {byCat[cat].sort((a, b) => a.name.localeCompare(b.name)).map((s) => (
              <span key={s.skill_id} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#eef0f2", color: "#555", fontSize: 11.5, padding: "4px 7px 4px 11px", borderRadius: 20 }}>
                {s.name}
                <button onClick={() => removeSkill(s)} title="Remove" style={{ background: "none", border: "none", cursor: "pointer", color: "#999", display: "flex", padding: 0 }}><X size={12} /></button>
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <input value={adding[cat] || ""} onChange={(e) => setAdding((p) => ({ ...p, [cat]: e.target.value }))} placeholder={`Add a ${cat} skill…`}
              onKeyDown={(e) => { if (e.key === "Enter") { addSkill(cat, adding[cat]); setAdding((p) => ({ ...p, [cat]: "" })); } }}
              style={{ ...input, flex: 1, maxWidth: 280 }} />
            <button onClick={() => { addSkill(cat, adding[cat]); setAdding((p) => ({ ...p, [cat]: "" })); }} style={btn.add}><Plus size={12} /> Add</button>
          </div>
        </div>
      ))}

      <div style={{ background: "#fff", border: `1px dashed ${C.line}`, borderRadius: 12, padding: "14px 16px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>New category</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Category (e.g. Automation)" style={{ ...input, flex: 1, maxWidth: 220 }} />
          <input value={newCatSkill} onChange={(e) => setNewCatSkill(e.target.value)} placeholder="First skill" style={{ ...input, flex: 1, maxWidth: 220 }} />
          <button onClick={() => { if (newCat.trim() && newCatSkill.trim()) { addSkill(newCat.trim(), newCatSkill); setNewCat(""); setNewCatSkill(""); } else alert("Enter a category and a first skill."); }} style={btn.primary}><Plus size={12} /> Add category</button>
        </div>
        <div style={{ fontSize: 10, color: "#bbb", marginTop: 8 }}>A category is created by adding its first skill.</div>
      </div>
    </div>
  );
}

// ---------------- Reports (real metrics) ----------------
function Reports() {
  const [d, setD] = useState(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await api.get("/api/training/reports");
        const ratings = (data.ratings || []).filter((r) => r != null);
        const avg = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : "—";
        const courseName = Object.fromEntries((data.courses || []).map((c) => [c.course_id, c.name]));
        const perCourse = {};
        (data.enrollmentCourseIds || []).forEach((id) => { perCourse[id] = (perCourse[id] || 0) + 1; });
        const courseRows = Object.entries(perCourse).map(([id, n]) => ({ name: courseName[id] || "—", n })).sort((a, b) => b.n - a.n);
        if (alive) setD({
          cards: [
            { label: "Certified VAs", value: data.certified || 0 },
            { label: "Enrollments", value: data.enrollments || 0 },
            { label: "Completed", value: data.completed || 0 },
            { label: "Evaluations", value: ratings.length },
            { label: "Avg rating", value: avg },
          ],
          courseRows,
        });
      } catch (e) { /* leave loading state */ }
    })();
    return () => { alive = false; };
  }, []);

  if (!d) return <div style={{ color: C.sub, fontSize: 13, padding: 20 }}>Loading…</div>;
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 14, marginBottom: 22 }}>
        {d.cards.map((c) => (
          <div key={c.label} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: C.ink, fontFamily: FONT.head }}>{c.value}</div>
            <div style={{ fontSize: 11.5, color: C.sub, marginTop: 4 }}>{c.label}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Enrollments by course</div>
      <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden" }}>
        {d.courseRows.length ? d.courseRows.map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 16px", borderBottom: i < d.courseRows.length - 1 ? `1px solid ${C.line}` : "none" }}>
            <span style={{ fontSize: 12.5, color: C.ink }}>{r.name}</span>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: C.teal }}>{r.n}</span>
          </div>
        )) : <div style={{ padding: 20, fontSize: 13, color: C.sub }}>No enrollments yet.</div>}
      </div>
    </div>
  );
}

// ---------------- Root ----------------
export default function TrainingApp({ session }) {
  const me = session?.employee;
  const [nav, setNav] = useState("catalog");
  const [catalog, setCatalog] = useState([]);
  const [title, sub] = PAGE_META[nav] || ["", ""];

  const loadCatalog = useCallback(async () => {
    try {
      const data = await api.get("/api/training/skills-catalog");
      setCatalog(data.skills || []);
    } catch (e) {
      setCatalog([]);
    }
  }, []);
  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.paper, fontFamily: FONT.body, color: C.ink }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');`}</style>
      <Sidebar nav={nav} setNav={setNav} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ padding: "26px 32px 0", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 7, height: 26, background: C.red, borderRadius: 2 }} />
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", fontFamily: FONT.head }}>{title}</h1>
            </div>
            <p style={{ margin: "6px 0 0 17px", fontSize: 12.5, color: C.sub }}>{sub}</p>
          </div>
          <GlobalSearch catalog={catalog} />
        </div>
        <div style={{ padding: "22px 32px 48px" }}>
          {nav === "catalog" ? <Catalog />
            : nav === "directory" ? <Directory catalog={catalog} />
            : nav === "dashboard" ? <Dashboard />
            : nav === "crm" ? <TrackView track="crm" blurb="Combo build track. CRM development courses and per-module progress." />
            : nav === "insurance" ? <TrackView track="ins" blurb="Insurance training for gen and handed-off combo VAs." />
            : nav === "broad" ? <TrackView track="broad" blurb="Broad market training: onboarding, security, AMS and other one-off courses." />
            : nav === "reports" ? <Reports />
            : nav === "settings" ? <Settings catalog={catalog} reload={loadCatalog} />
            : <Placeholder title={title} />}
        </div>
      </div>
    </div>
  );
}
