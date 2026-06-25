import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { Users, Headset, ClipboardCheck, History, Activity, Code2, ChevronDown, ChevronRight } from "lucide-react";
import { api } from "../../lib/api";

// The Portal is the host SHELL: a thin directory that switches between the real
// apps embedded in its content area, plus the hub's Activity Logs views. It owns
// no product data of its own — Client Profiles is the accounts/company navigation,
// and the other apps own their domains. Each app is lazy so it compiles into its
// own chunk and loads on demand.
//
// NOTE: Training Tracker and Trainer Workload were removed from the hub — the
// training team is building their own portal for those. Their app folders and
// Laravel endpoints still exist (unused) and can be re-added here if needed.
const ClientProfileApp = lazy(() => import("../clientProfile/index.jsx"));
const DevSupportApp = lazy(() => import("../devSupport/index.jsx"));
const QAQCApp = lazy(() => import("../qaqc/index.jsx"));

// Brand floor.
const B = { red: "#E73835", dark: "#24242D", teal: "#145365", white: "#FFFFFF", black: "#1B120B" };
const FONT_BODY = "'Poppins', system-ui, -apple-system, sans-serif";

// The directory. Client Profiles is first and is the default landing app — it is
// our main accounts/company navigation view.
const APPS = [
  { key: "clientprofiles", label: "Client Profiles", desc: "Accounts & Company 360", icon: Users, Comp: ClientProfileApp },
  { key: "devsupport", label: "Dev Support", desc: "Support tickets", icon: Headset, Comp: DevSupportApp },
  { key: "qaqc", label: "QAQC", desc: "Build review tracker", icon: ClipboardCheck, Comp: QAQCApp },
];

// Activity Logs sub-views (rendered by the shell itself, not embedded apps).
const LOGS = [
  { key: "log:inapp", label: "In-app changes", desc: "Value edits across the hub", icon: Activity },
  { key: "log:feature", label: "Feature changes", desc: "Code & feature changelog", icon: Code2 },
];

function fmtWhen(iso) {
  if (!iso) return "";
  const d = new Date(iso.replace(" ", "T"));
  if (isNaN(d)) return iso;
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

// ── In-app changes (audit trail) ─────────────────────────────────────────────
function ActivityLogView() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [appFilter, setAppFilter] = useState("all");

  useEffect(() => {
    let alive = true;
    api.get("/api/activity-log")
      .then((d) => { if (alive) setData(d); })
      .catch((e) => { if (alive) setErr(e.message); });
    return () => { alive = false; };
  }, []);

  const entries = data?.entries || [];
  const apps = data?.apps || [];
  const shown = useMemo(
    () => (appFilter === "all" ? entries : entries.filter((e) => e.app === appFilter)),
    [entries, appFilter],
  );

  const chip = (on) => ({
    fontFamily: FONT_BODY, fontSize: 12, fontWeight: 500, padding: "5px 12px", borderRadius: 999,
    border: `1px solid ${on ? B.red : "rgba(27,18,11,0.15)"}`, background: on ? B.red : B.white,
    color: on ? B.white : "rgba(27,18,11,0.6)", cursor: "pointer",
  });

  return (
    <div style={{ padding: 28, maxWidth: 1040, fontFamily: FONT_BODY }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: B.dark, margin: "0 0 4px" }}>In-app changes</h1>
      <div style={{ fontSize: 13, color: "rgba(27,18,11,0.5)", marginBottom: 18 }}>
        Every value change across the hub, from the audit trail (<code>spine.activity_log</code>). Newest first.
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        <button style={chip(appFilter === "all")} onClick={() => setAppFilter("all")}>All</button>
        {apps.map((a) => <button key={a} style={chip(appFilter === a)} onClick={() => setAppFilter(a)}>{a}</button>)}
      </div>

      {err && <div style={{ color: B.red, fontSize: 13 }}>Could not load activity: {err}</div>}
      {!data && !err && <div style={{ color: "rgba(27,18,11,0.5)", fontSize: 13 }}>Loading…</div>}
      {data && shown.length === 0 && <div style={{ color: "rgba(27,18,11,0.5)", fontSize: 13 }}>No activity yet.</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {shown.map((e) => (
          <div key={e.id} style={{ background: B.white, border: "1px solid rgba(27,18,11,0.10)", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "flex-start", gap: 14 }}>
            <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: B.teal, background: "rgba(20,83,101,0.08)", padding: "3px 8px", borderRadius: 6, flexShrink: 0, marginTop: 1 }}>{e.app}</span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13.5, color: B.black, fontWeight: 500 }}>{e.action}</div>
              <div style={{ fontSize: 12, color: "rgba(27,18,11,0.5)", marginTop: 2 }}>
                {e.entity_type}{e.entity_id ? ` · ${String(e.entity_id).slice(0, 8)}` : ""}
                {e.details && Object.keys(e.details).length > 0 && (
                  <span> · {Object.entries(e.details).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join("  ·  ")}</span>
                )}
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 12.5, color: B.black }}>{e.actor}</div>
              <div style={{ fontSize: 11, color: "rgba(27,18,11,0.4)" }}>{fmtWhen(e.created_at)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Feature & code changes (changelog) ───────────────────────────────────────
function DevLogView() {
  const [entries, setEntries] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    api.get("/api/dev-log")
      .then((d) => { if (alive) setEntries(d.entries || []); })
      .catch((e) => { if (alive) setErr(e.message); });
    return () => { alive = false; };
  }, []);

  return (
    <div style={{ padding: 28, maxWidth: 860, fontFamily: FONT_BODY }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: B.dark, margin: "0 0 4px" }}>Feature &amp; code changes</h1>
      <div style={{ fontSize: 13, color: "rgba(27,18,11,0.5)", marginBottom: 18 }}>
        Changes we make to the hub itself, each with the reasoning behind it.
      </div>

      {err && <div style={{ color: B.red, fontSize: 13 }}>Could not load changelog: {err}</div>}
      {!entries && !err && <div style={{ color: "rgba(27,18,11,0.5)", fontSize: 13 }}>Loading…</div>}
      {entries && entries.length === 0 && <div style={{ color: "rgba(27,18,11,0.5)", fontSize: 13 }}>No entries yet.</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {(entries || []).map((e, i) => (
          <div key={i} style={{ background: B.white, border: "1px solid rgba(27,18,11,0.10)", borderRadius: 10, padding: "14px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: B.red, background: "rgba(231,56,53,0.08)", padding: "3px 8px", borderRadius: 6 }}>{e.area || "Change"}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: B.dark }}>{e.title}</span>
              <span style={{ marginLeft: "auto", fontSize: 11.5, color: "rgba(27,18,11,0.4)" }}>{e.date}</span>
            </div>
            {e.reason && <div style={{ fontSize: 13, color: "rgba(27,18,11,0.7)", lineHeight: 1.55 }}>{e.reason}</div>}
            {e.author && <div style={{ fontSize: 11.5, color: "rgba(27,18,11,0.4)", marginTop: 8 }}>{e.author}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function Loading({ label }) {
  return <div style={{ padding: 28, fontFamily: FONT_BODY, color: "rgba(27,18,11,0.5)" }}>Loading {label}…</div>;
}

export default function App({ session }) {
  const me = session?.employee || null;
  const [active, setActive] = useState("clientprofiles");
  const [logsOpen, setLogsOpen] = useState(false);

  const isLog = active.startsWith("log:");
  const current = APPS.find((a) => a.key === active) || APPS[0];
  const Current = current.Comp;

  const navBtn = (on) => ({
    display: "flex", alignItems: "center", gap: 12, textAlign: "left", width: "100%",
    padding: "11px 12px", borderRadius: 9, cursor: "pointer", fontFamily: FONT_BODY,
    border: "none", borderLeft: `3px solid ${on ? B.red : "transparent"}`,
    background: on ? "rgba(255,255,255,0.07)" : "transparent",
    color: on ? B.white : "#9A9AA4", transition: "background 0.12s, color 0.12s",
  });

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');`}</style>
      <div style={{ display: "flex", minHeight: "100vh", fontFamily: FONT_BODY, background: "#F4F3F1" }}>
        {/* Sidebar: the app directory */}
        <nav style={{ width: 232, flexShrink: 0, background: B.dark, color: "#B9B9C2", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
          <div style={{ padding: "22px 22px 18px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ fontWeight: 700, fontSize: 21, letterSpacing: 0.5, color: B.white }}>
              LAVA <span style={{ color: B.red }}>Fulfillment</span>
            </div>
            <div style={{ fontSize: 10, letterSpacing: 2, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginTop: 5 }}>Internal Hub</div>
          </div>

          <div style={{ padding: "12px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
            {APPS.map((a) => {
              const on = a.key === active;
              const Icon = a.icon;
              return (
                <button key={a.key} onClick={() => setActive(a.key)} style={navBtn(on)}
                  onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = "transparent"; }}>
                  <Icon size={18} strokeWidth={2} color={on ? B.red : "#7A7A85"} style={{ flexShrink: 0 }} />
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 13.5, fontWeight: on ? 600 : 500 }}>{a.label}</span>
                    <span style={{ display: "block", fontSize: 10.5, color: "rgba(255,255,255,0.32)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.desc}</span>
                  </span>
                </button>
              );
            })}

            {/* Activity Logs group (expandable) */}
            <button onClick={() => setLogsOpen((v) => !v)} style={navBtn(isLog && !logsOpen)}
              onMouseEnter={(e) => { if (!(isLog && !logsOpen)) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
              onMouseLeave={(e) => { if (!(isLog && !logsOpen)) e.currentTarget.style.background = "transparent"; }}>
              <History size={18} strokeWidth={2} color={isLog ? B.red : "#7A7A85"} style={{ flexShrink: 0 }} />
              <span style={{ minWidth: 0, flex: 1 }}>
                <span style={{ display: "block", fontSize: 13.5, fontWeight: isLog ? 600 : 500 }}>Activity Logs</span>
                <span style={{ display: "block", fontSize: 10.5, color: "rgba(255,255,255,0.32)" }}>Audit trail &amp; changelog</span>
              </span>
              {logsOpen ? <ChevronDown size={15} color="#7A7A85" /> : <ChevronRight size={15} color="#7A7A85" />}
            </button>
            {logsOpen && LOGS.map((l) => {
              const on = l.key === active;
              const Icon = l.icon;
              return (
                <button key={l.key} onClick={() => setActive(l.key)} style={{ ...navBtn(on), paddingLeft: 30 }}
                  onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = "transparent"; }}>
                  <Icon size={15} strokeWidth={2} color={on ? B.red : "#7A7A85"} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 12.5, fontWeight: on ? 600 : 500 }}>{l.label}</span>
                </button>
              );
            })}
          </div>

          {/* User + sign out */}
          <div style={{ marginTop: "auto", padding: "14px 16px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: B.red, color: B.white, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
              {(me?.name || "?").charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12.5, color: "#DDD", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{me?.name || "Unknown"}</div>
              <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={me?.email || ""}>{me?.email || me?.position || ""}</div>
            </div>
            {session?.signOut && (
              <button onClick={() => session.signOut()} title="Sign out" style={{ background: "transparent", color: "#9A9AA4", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 7, padding: "5px 9px", fontSize: 10.5, cursor: "pointer", fontFamily: FONT_BODY }}>Sign out</button>
            )}
          </div>
        </nav>

        {/* Content: the selected app or log view */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {active === "log:inapp" ? (
            <ActivityLogView />
          ) : active === "log:feature" ? (
            <DevLogView />
          ) : (
            <Suspense fallback={<Loading label={current.label} />}>
              <Current session={session} />
            </Suspense>
          )}
        </div>
      </div>
    </>
  );
}
