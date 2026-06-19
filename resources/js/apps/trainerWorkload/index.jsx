/**
 * Lava Trainer Workload — frontend only.
 *
 * Data layer now lives in Laravel (TrainerWorkloadController). This file no
 * longer talks to Supabase or writes the activity log; it fetches /api/
 * trainer-workload and mutates via /api/* endpoints through lib/api. Identity
 * comes from the shell session. Everything below the data calls is pure UI.
 */
import { useState, useEffect, useCallback } from "react";
import { Plus, X, Calendar, Trash2, BadgeCheck, Star } from "lucide-react";
import { api } from "../../lib/api";

const B = {
  red: "#E73835", dark: "#24242D", teal: "#145365", white: "#FFFFFF", black: "#1B120B",
  paper: "#F4F0EA", border: "#E3DDD5", border2: "#CEC5BA", muted: "#746D66", ink2: "#463F3A",
  line: "rgba(27,18,11,0.10)", fill: "rgba(27,18,11,0.04)",
};
const FONT = "'Poppins', system-ui, -apple-system, sans-serif";

const TRACKS = [{ key: "crm", label: "CRM Development" }, { key: "ins", label: "Insurance" }];
const STATUSES = ["scheduled", "live", "completed", "no_show", "canceled"];
const STATUS_META = {
  scheduled: ["Scheduled", "#E1ECEF", "#0E3D4A"],
  live: ["Live", "#FCEAEA", "#A32420"],
  completed: ["Completed", "#E7F1EC", "#0f6e56"],
  no_show: ["No show", "#FBE3E3", "#A32420"],
  canceled: ["Canceled", "#EFEAE4", "#746D66"],
};

const ini = (n) => (n || "?").split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
const fmtDateTime = (iso) => iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

function Avatar({ name, size = 30, bg = B.teal }) {
  return <span style={{ width: size, height: size, borderRadius: "50%", background: bg, color: "#fff", fontSize: size * 0.38, fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{ini(name)}</span>;
}

const card = { background: B.white, border: `1px solid ${B.border}`, borderRadius: 14, boxShadow: "0 10px 26px rgba(27,18,11,.05)" };
const btnPrimary = { display: "flex", alignItems: "center", gap: 6, border: "none", background: B.red, color: "#fff", fontSize: 12.5, fontWeight: 600, padding: "9px 15px", borderRadius: 9, cursor: "pointer", fontFamily: FONT };
const btnGhost = { border: `1px solid ${B.border2}`, background: B.white, color: B.ink2, fontSize: 11.5, fontWeight: 500, padding: "6px 11px", borderRadius: 8, cursor: "pointer", fontFamily: FONT };
const fieldSel = { width: "100%", padding: "9px 11px", borderRadius: 8, border: `1px solid ${B.border2}`, fontSize: 12.5, fontFamily: FONT, marginBottom: 14, background: "#fff", boxSizing: "border-box" };

export default function TrainerWorkloadApp({ session }) {
  const me = session?.employee;
  const [track, setTrack] = useState("crm");
  const [sessions, setSessions] = useState([]);
  const [trainers, setTrainers] = useState([]); // [{id,name,position,track}]
  const [vaRoster, setVaRoster] = useState([]); // [{id,name}]
  const [evals, setEvals] = useState([]);       // evaluations
  const [empName, setEmpName] = useState({});
  const [loading, setLoading] = useState(true);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [evalFor, setEvalFor] = useState(null); // session being evaluated

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get("/api/trainer-workload");
      const emp = Object.fromEntries((data.employees || []).map((e) => [e.id, e.name]));
      const roster = (data.employees || [])
        .filter((e) => /trainer|training lead/i.test(e.position || ""))
        .map((e) => ({ id: e.id, name: e.name, position: e.position, track: /insurance/i.test(e.position || "") ? "ins" : "crm" }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setEmpName(emp);
      setTrainers(roster);
      setVaRoster((data.vaIds || []).map((id) => ({ id, name: emp[id] || "Unknown" })).filter((o) => o.name !== "Unknown").sort((a, b) => a.name.localeCompare(b.name)));
      setSessions(data.sessions || []);
      setEvals(data.evaluations || []);
    } catch (e) {
      alert("Could not load workload: " + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const trackSessions = sessions.filter((s) => s.track === track);
  const trackTrainers = trainers.filter((t) => t.track === track);
  const loadOf = (trainerId) => trackSessions.filter((s) => s.trainer_id === trainerId).length;
  const evalForSession = (s) => evals.find((e) => e.va_id === s.va_id && e.trainer_id === s.trainer_id);

  // -- writes (Laravel via lib/api) -----------------------------------------
  async function schedule(form) {
    try { await api.post("/api/training-sessions", { ...form, track }); setScheduleOpen(false); load(); }
    catch (e) { alert("Could not schedule: " + e.message); }
  }
  async function reassign(s, trainerId) {
    try { await api.patch(`/api/training-sessions/${s.training_session_id}`, { trainer_id: trainerId }); load(); }
    catch (e) { alert("Reassign failed: " + e.message); }
  }
  async function setStatus(s, status) {
    try { await api.patch(`/api/training-sessions/${s.training_session_id}`, { status }); load(); }
    catch (e) { alert("Status update failed: " + e.message); }
  }
  async function delSession(s) {
    if (!confirm("Delete this session?")) return;
    try { await api.del(`/api/training-sessions/${s.training_session_id}`); load(); }
    catch (e) { alert("Delete failed: " + e.message); }
  }
  async function saveEval(s, rating, note, endorsed) {
    try { await api.post("/api/evaluations", { va_id: s.va_id, trainer_id: s.trainer_id, rating, note: note || null, endorsed: !!endorsed }); setEvalFor(null); load(); }
    catch (e) { alert("Could not save evaluation: " + e.message); }
  }

  const metrics = [
    { label: "Sessions", value: trackSessions.length },
    { label: "Scheduled", value: trackSessions.filter((s) => s.status === "scheduled").length },
    { label: "Completed", value: trackSessions.filter((s) => s.status === "completed").length },
    { label: "Trainers", value: trackTrainers.length },
    { label: "Evaluations", value: evals.filter((e) => trackSessions.some((s) => s.va_id === e.va_id)).length },
  ];

  return (
    <div style={{ minHeight: "100vh", background: B.paper, fontFamily: FONT, color: B.black }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');`}</style>

      <div style={{ background: B.dark, padding: "18px 32px", display: "flex", alignItems: "center", gap: 16, borderBottom: `3px solid ${B.red}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 24, background: B.red, borderRadius: 2 }} />
          <span style={{ fontSize: 16, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>Trainer Workload</span>
        </div>
        <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.08)", borderRadius: 999, padding: 4, marginLeft: 8 }}>
          {TRACKS.map((t) => (
            <button key={t.key} onClick={() => setTrack(t.key)} style={{ fontSize: 12, fontWeight: 700, padding: "6px 14px", border: "none", borderRadius: 999, cursor: "pointer", background: track === t.key ? B.red : "transparent", color: track === t.key ? "#fff" : "rgba(255,255,255,0.6)" }}>{t.label}</button>
          ))}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{me?.name}</span>
          <button onClick={() => setScheduleOpen(true)} style={btnPrimary}><Plus size={14} /> Schedule</button>
        </div>
      </div>

      <div style={{ padding: "24px 32px", maxWidth: 1200, margin: "0 auto" }}>
        {/* metrics */}
        <div style={{ display: "flex", gap: 14, marginBottom: 22, flexWrap: "wrap" }}>
          {metrics.map((m) => (
            <div key={m.label} style={{ ...card, padding: "18px 20px", flex: 1, minWidth: 120, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", left: 0, top: 0, width: "100%", height: 4, background: B.red }} />
              <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em" }}>{m.value}</div>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: B.ink2, marginTop: 8 }}>{m.label}</div>
            </div>
          ))}
        </div>

        {/* trainers */}
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: B.ink2, marginBottom: 10 }}>Trainers on this track</div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 26 }}>
          {trackTrainers.length === 0 ? <div style={{ fontSize: 13, color: B.muted }}>No trainers found for this track.</div>
            : trackTrainers.map((t) => (
              <div key={t.id} style={{ ...card, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, minWidth: 220 }}>
                <Avatar name={t.name} size={36} bg={track === "ins" ? B.teal : B.dark} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: B.muted }}>{t.position}</div>
                </div>
                <div style={{ marginLeft: "auto", textAlign: "right" }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: B.red }}>{loadOf(t.id)}</div>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: B.muted }}>sessions</div>
                </div>
              </div>
            ))}
        </div>

        {/* sessions */}
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: B.ink2, marginBottom: 10 }}>Sessions</div>
        {loading ? <div style={{ fontSize: 13, color: B.muted, padding: 20 }}>Loading…</div>
          : trackSessions.length === 0 ? <div style={{ ...card, padding: 24, fontSize: 13, color: B.muted, border: `1px dashed ${B.border2}` }}>No sessions on this track yet. Use “Schedule” to add one.</div>
          : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {trackSessions.map((s) => {
                const ev = evalForSession(s);
                return (
                  <div key={s.training_session_id} style={{ ...card, padding: "13px 16px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1.4fr 1fr 1fr auto", gap: 12, alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <Avatar name={empName[s.va_id]} size={30} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 700 }}>{empName[s.va_id] || "Unknown"}</div>
                          <div style={{ fontSize: 10.5, color: B.muted, display: "flex", alignItems: "center", gap: 4 }}><Calendar size={11} /> {fmtDateTime(s.scheduled_at)}</div>
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 9, color: B.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>Trainer</div>
                        <select value={s.trainer_id} onChange={(e) => reassign(s, e.target.value)} style={{ border: `1px solid ${B.border}`, borderRadius: 7, padding: "5px 8px", fontSize: 12, fontFamily: FONT, background: "#fff", maxWidth: 180 }}>
                          {trainers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                          {!trainers.some((t) => t.id === s.trainer_id) && <option value={s.trainer_id}>{empName[s.trainer_id] || "Unknown"}</option>}
                        </select>
                      </div>
                      <div>
                        <select value={s.status} onChange={(e) => setStatus(s, e.target.value)} style={{ border: `1px solid ${B.border}`, borderRadius: 7, padding: "5px 8px", fontSize: 12, fontFamily: FONT, background: "#fff" }}>
                          {STATUSES.map((st) => <option key={st} value={st}>{STATUS_META[st][0]}</option>)}
                        </select>
                      </div>
                      <div>
                        {ev ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: B.ink2 }}>
                            <span style={{ display: "inline-flex" }}>{[1, 2, 3, 4, 5].map((n) => <Star key={n} size={12} color={n <= ev.rating ? B.red : B.border2} fill={n <= ev.rating ? B.red : "none"} />)}</span>
                            {ev.endorsed && <BadgeCheck size={13} color="#0f6e56" />}
                          </span>
                        ) : <span style={{ fontSize: 11, color: B.muted }}>Not evaluated</span>}
                      </div>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button onClick={() => setEvalFor(evalFor === s.training_session_id ? null : s.training_session_id)} style={btnGhost}>{evalFor === s.training_session_id ? "Cancel" : ev ? "Re-evaluate" : "Evaluate"}</button>
                        <button onClick={() => delSession(s)} style={{ ...btnGhost, color: B.red, borderColor: "#f0c9c8", display: "flex" }}><Trash2 size={13} /></button>
                      </div>
                    </div>
                    {evalFor === s.training_session_id && <EvalPanel onSave={(r, n, e2) => saveEval(s, r, n, e2)} />}
                  </div>
                );
              })}
            </div>
          )}
      </div>

      {scheduleOpen && <ScheduleModal trainers={trackTrainers.length ? trackTrainers : trainers} roster={vaRoster} track={track} onClose={() => setScheduleOpen(false)} onSchedule={schedule} />}
    </div>
  );
}

function EvalPanel({ onSave }) {
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState("");
  const [endorsed, setEndorsed] = useState(false);
  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${B.line}`, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ fontSize: 11, color: B.muted, marginRight: 4 }}>Rating</span>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setRating(n)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 0 }}>
            <Star size={18} color={n <= rating ? B.red : B.border2} fill={n <= rating ? B.red : "none"} />
          </button>
        ))}
      </div>
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" style={{ flex: 1, minWidth: 200, border: `1px solid ${B.border2}`, borderRadius: 8, padding: "8px 11px", fontSize: 12.5, fontFamily: FONT, outline: "none" }} />
      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: B.ink2, cursor: "pointer" }}>
        <input type="checkbox" checked={endorsed} onChange={(e) => setEndorsed(e.target.checked)} /> Endorse (certify VA)
      </label>
      <button onClick={() => rating ? onSave(rating, note, endorsed) : alert("Pick a rating.")} style={{ ...btnPrimary, background: B.teal }}>Save evaluation</button>
    </div>
  );
}

function ScheduleModal({ trainers, roster, track, onClose, onSchedule }) {
  const [vaId, setVaId] = useState(roster[0]?.id || "");
  const [trainerId, setTrainerId] = useState(trainers[0]?.id || "");
  const [when, setWhen] = useState("");
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(27,18,11,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 70 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, padding: "22px 24px", width: 400, maxWidth: "92vw", fontFamily: FONT }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <span style={{ fontSize: 16, fontWeight: 800 }}>Schedule a session</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: B.muted, display: "flex" }}><X size={18} /></button>
        </div>
        <div style={{ fontSize: 10.5, color: B.muted, marginBottom: 5 }}>Virtual assistant</div>
        <select value={vaId} onChange={(e) => setVaId(e.target.value)} style={fieldSel}>{roster.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
        <div style={{ fontSize: 10.5, color: B.muted, marginBottom: 5 }}>Trainer</div>
        <select value={trainerId} onChange={(e) => setTrainerId(e.target.value)} style={fieldSel}>{trainers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
        <div style={{ fontSize: 10.5, color: B.muted, marginBottom: 5 }}>Date & time</div>
        <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} style={fieldSel} />
        <div style={{ fontSize: 11, color: B.muted, marginBottom: 14 }}>Track: <b>{track === "ins" ? "Insurance" : "CRM Development"}</b></div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{ ...btnGhost, padding: "9px 16px" }}>Cancel</button>
          <button disabled={!vaId || !trainerId || !when} onClick={() => onSchedule({ va_id: vaId, trainer_id: trainerId, scheduled_at: new Date(when).toISOString() })} style={{ ...btnPrimary, opacity: vaId && trainerId && when ? 1 : 0.4 }}>Schedule</button>
        </div>
      </div>
    </div>
  );
}
