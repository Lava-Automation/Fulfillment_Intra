/**
 * Lava Dev Support Queue — translated for the hub.
 * Owners: Loid Aringoy + Nassim Orabi.
 *
 * The pipeline board the team designed (4 status columns, SLA bars, priority,
 * detail drawer). Data layer now lives in Laravel (DevSupportController): this
 * file no longer talks to Supabase or writes the activity log directly. It
 * fetches /api/devsupport and mutates via /api/devsupport/* through lib/api;
 * the controller does the DB write + activity_log row. Identity comes from the
 * shell session.
 *
 * Time: the original tracked fake "offsetMs" values; here SLA math runs off the
 * real created_at / resolved_at timestamps.
 *
 * Reads:  /api/devsupport (tickets + accounts -> hubspot_companies client name +
 *         employees), /api/devsupport/tickets/{id}/activity (drawer feed).
 * Writes: /api/devsupport/tickets[/{id}[/assign]] -> tickets.* + activity_log
 *         (devsupport.ticket.assigned | status_changed | resolved | opened).
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search, Plus, X, Clock, AlertCircle, CheckCircle2, PauseCircle,
  ChevronRight, Circle
} from 'lucide-react';
import { api } from '../../lib/api';

// -- Brand floor + color theory ------------------------------------
const RED = '#e73835';
const RED_HOVER = '#c0302e';
const DARK_BLUE = '#24242d';
const TEAL = '#145365';
const BLACK = '#1B120B';

// Single light theme. The original had a dark variant behind a toggle; the
// toggle was removed, so only the light palette remains.
const THEMES = {
  light: {
    red: RED, redHover: RED_HOVER, redDim: 'rgba(231, 56, 53, 0.09)', redLine: 'rgba(231, 56, 53, 0.32)',
    darkBlue: DARK_BLUE,
    teal: TEAL, tealText: TEAL, tealDim: 'rgba(20, 83, 101, 0.10)', tealLine: 'rgba(20, 83, 101, 0.30)',
    bg: '#f4f6f7', surface: '#ffffff', surfaceHover: '#f7fafb',
    border: 'rgba(36, 36, 45, 0.10)', borderStrong: 'rgba(36, 36, 45, 0.18)',
    text: BLACK, textMid: 'rgba(27, 18, 11, 0.62)', textDim: 'rgba(27, 18, 11, 0.42)', textFaint: 'rgba(27, 18, 11, 0.26)',
    trackBg: 'rgba(36, 36, 45, 0.08)', avatarBg: 'rgba(20, 83, 101, 0.07)',
    structFill: DARK_BLUE, onStruct: '#ffffff', onStructDim: 'rgba(255,255,255,0.58)', overlay: 'rgba(27, 18, 11, 0.30)',
  },
};

function statusAccent(statusKey, T) {
  switch (statusKey) {
    case 'open': return T.red;
    case 'in_progress': return T.teal;
    case 'resolved': return T.teal;
    case 'waiting': return T.textDim;
    default: return T.textDim;
  }
}

const FONTS = {
  display: "'Monument Extended', 'Archivo Black', Impact, sans-serif",
  body: "'Poppins', system-ui, -apple-system, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
};

const STATUSES = [
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'waiting', label: 'Waiting on Client' },
  { key: 'resolved', label: 'Resolved' },
];
const STATUS_LABEL = Object.fromEntries(STATUSES.map(s => [s.key, s.label]));

const PRIORITIES = {
  H: { label: 'High', slaMs: 2 * 60 * 60 * 1000 },
  M: { label: 'Medium', slaMs: 24 * 60 * 60 * 1000 },
  L: { label: 'Low', slaMs: 5 * 24 * 60 * 60 * 1000 },
};

// -- Helpers -------------------------------------------------------
function initials(name) {
  if (!name) return '·';
  return name.split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

function formatElapsed(ms) {
  const abs = Math.abs(ms);
  const m = Math.floor(abs / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d >= 1) return `${d}d ${h % 24}h`;
  if (h >= 1) return `${h}h ${m % 60}m`;
  if (m >= 1) return `${m}m`;
  return `${Math.floor(abs / 1000)}s`;
}

// SLA runs off the real created_at timestamp (ms epoch).
function slaState(ticket, now) {
  if (ticket.status === 'resolved') return { kind: 'resolved' };
  if (ticket.status === 'waiting') return { kind: 'paused' };
  const elapsed = now - ticket.createdAtMs;
  const slaMs = PRIORITIES[ticket.priority]?.slaMs ?? PRIORITIES.M.slaMs;
  const remaining = slaMs - elapsed;
  let band;
  if (remaining < 0) band = 'breached';
  else if (remaining < slaMs * 0.25) band = 'urgent';
  else band = 'ok';
  const pct = Math.max(0, Math.min(1, elapsed / slaMs));
  return { kind: 'active', remaining, band, pct };
}

function humanizeActivity(action, details) {
  if (!action) return 'Activity';
  if (action.endsWith('assigned')) return `Assigned to ${details?.to || 'someone'}`;
  if (action.endsWith('resolved')) return 'Moved to Resolved';
  if (action.endsWith('status_changed')) return `Moved to ${STATUS_LABEL[details?.to] || details?.to || 'a new status'}`;
  return action;
}

// -- Atomic UI -----------------------------------------------------
function MonoNum({ children, size = 12, color, T }) {
  return (
    <span style={{
      fontFamily: FONTS.mono, fontSize: size, letterSpacing: '0.02em',
      color: color || T.text, fontVariantNumeric: 'tabular-nums',
    }}>{children}</span>
  );
}

function Avatar({ name, size = 28, T }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size,
      background: T.avatarBg, border: `1px solid ${T.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: FONTS.body, fontSize: Math.round(size * 0.36),
      fontWeight: 600, letterSpacing: '0.03em', color: T.textMid, flexShrink: 0,
    }}>{initials(name)}</div>
  );
}

function PriorityDot({ priority, T }) {
  const isHigh = priority === 'H';
  const color = isHigh ? T.red : (priority === 'M' ? T.textMid : T.textFaint);
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 6, height: 6, borderRadius: 6, background: color, flexShrink: 0 }} />
      <span style={{
        fontFamily: FONTS.mono, fontSize: 10, letterSpacing: '0.08em',
        fontWeight: 600, color: isHigh ? T.red : T.textMid, textTransform: 'uppercase',
      }}>{PRIORITIES[priority]?.label || priority}</span>
    </div>
  );
}

function SlaBar({ ticket, now, T }) {
  const s = slaState(ticket, now);
  if (s.kind === 'resolved') {
    const dur = ticket.resolvedAtMs && ticket.createdAtMs ? formatElapsed(ticket.resolvedAtMs - ticket.createdAtMs) : null;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.tealText, fontFamily: FONTS.body, fontSize: 11 }}>
        <CheckCircle2 size={12} strokeWidth={2} />
        <span>{dur ? `Resolved ${dur} after open` : 'Resolved'}</span>
      </div>
    );
  }
  if (s.kind === 'paused') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.textDim, fontFamily: FONTS.body, fontSize: 11 }}>
        <PauseCircle size={12} strokeWidth={2} />
        <span>SLA paused · waiting on client</span>
      </div>
    );
  }
  const breached = s.band === 'breached';
  const urgent = s.band === 'urgent' || breached;
  const barColor = urgent ? T.red : T.teal;
  const labelColor = urgent ? T.red : T.tealText;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        {breached
          ? <AlertCircle size={12} strokeWidth={2.5} color={T.red} />
          : <Clock size={12} strokeWidth={2} color={urgent ? T.red : T.tealText} />}
        <MonoNum size={11} color={labelColor} T={T}>
          {breached ? `Overdue ${formatElapsed(s.remaining)}` : `${formatElapsed(s.remaining)} to SLA`}
        </MonoNum>
      </div>
      <div style={{ height: 3, background: T.trackBg, borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${Math.min(100, s.pct * 100)}%`,
          background: barColor, borderRadius: 3, transition: 'width 600ms linear, background 400ms',
        }} />
      </div>
    </div>
  );
}

function LavaMark({ size = 20 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 5, background: RED,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <div style={{ width: size * 0.4, height: size * 0.4, borderRadius: 2, background: '#fff' }} />
    </div>
  );
}

// -- Header --------------------------------------------------------
function Header({ T, query, setQuery, me }) {
  return (
    <div style={{ background: T.structFill }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 40px', maxWidth: 1320, margin: '0 auto', width: '100%',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <LavaMark size={22} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{
              fontFamily: FONTS.display, fontSize: 13, letterSpacing: '0.16em',
              color: T.onStruct, textTransform: 'uppercase',
            }}>Lava</span>
            <span style={{
              fontFamily: FONTS.body, fontSize: 10.5, letterSpacing: '0.14em',
              color: T.onStructDim, textTransform: 'uppercase',
            }}>Dev Support Queue</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 9, padding: '9px 14px',
            background: 'rgba(255,255,255,0.07)', border: `1px solid rgba(255,255,255,0.12)`,
            borderRadius: 999, minWidth: 260,
          }}>
            <Search size={14} color={T.onStructDim} strokeWidth={2} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search tickets, clients, IDs"
              style={{
                background: 'transparent', border: 'none', outline: 'none', color: T.onStruct,
                fontFamily: FONTS.body, fontSize: 12.5, width: '100%',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 32, flexShrink: 0,
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: FONTS.body, fontSize: 11.5, fontWeight: 600,
              letterSpacing: '0.03em', color: T.onStruct,
            }}>{initials(me?.name)}</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontFamily: FONTS.body, fontSize: 12.5, color: T.onStruct, fontWeight: 500 }}>{me?.name || '…'}</span>
              <span style={{ fontFamily: FONTS.body, fontSize: 10.5, color: T.onStructDim }}>{me?.position || ''}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// -- Summary strip -------------------------------------------------
function StatStrip({ tickets, now, T }) {
  const counts = useMemo(() => {
    const r = { open: 0, in_progress: 0, waiting: 0, resolved: 0, breached: 0 };
    for (const t of tickets) {
      if (r[t.status] != null) r[t.status]++;
      const s = slaState(t, now);
      if (s.kind === 'active' && s.band === 'breached') r.breached++;
    }
    return r;
  }, [tickets, now]);

  const stats = [
    { label: 'Open', value: counts.open, hue: T.red },
    { label: 'In Progress', value: counts.in_progress, hue: T.teal },
    { label: 'Waiting on Client', value: counts.waiting, hue: T.textDim },
    { label: 'SLA Breached', value: counts.breached, hue: T.red, accent: true },
    { label: 'Resolved', value: counts.resolved, hue: T.teal },
  ];

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14,
      maxWidth: 1320, margin: '0 auto', width: '100%', padding: '24px 40px 4px',
    }}>
      {stats.map(s => {
        const lit = s.accent && s.value > 0;
        return (
          <div key={s.label} style={{
            background: T.surface, border: `1px solid ${lit ? T.redLine : T.border}`,
            borderRadius: 14, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8,
            position: 'relative', overflow: 'hidden',
          }}>
            <span style={{
              position: 'absolute', left: 0, right: 0, top: 0, height: 3,
              background: s.hue, opacity: s.value > 0 ? 0.85 : 0.25,
            }} />
            <div style={{
              fontFamily: FONTS.body, fontSize: 10.5, letterSpacing: '0.06em',
              textTransform: 'uppercase', color: T.textDim, fontWeight: 500,
            }}>{s.label}</div>
            <div style={{
              fontFamily: FONTS.display, fontSize: 34, lineHeight: 1, letterSpacing: '0.01em',
              color: lit ? T.red : T.text,
            }}>{s.value.toString().padStart(2, '0')}</div>
          </div>
        );
      })}
    </div>
  );
}

// -- Filter row ----------------------------------------------------
function Segmented({ options, value, onChange, T }) {
  return (
    <div style={{
      display: 'inline-flex', padding: 3, gap: 2,
      background: T.surface, border: `1px solid ${T.border}`, borderRadius: 999,
    }}>
      {options.map(opt => {
        const active = value === opt.key;
        return (
          <button key={opt.key} onClick={() => onChange(opt.key)}
            style={{
              background: active ? T.darkBlue : 'transparent',
              color: active ? '#fff' : T.textMid,
              border: 'none', fontFamily: FONTS.body, fontSize: 11.5, fontWeight: 500,
              padding: '6px 13px', borderRadius: 999, cursor: 'pointer',
              transition: 'background 120ms, color 120ms', whiteSpace: 'nowrap',
            }}>{opt.label}</button>
        );
      })}
    </div>
  );
}

function FilterRow({ priorityFilter, setPriorityFilter, assigneeFilter, setAssigneeFilter, onNew, T }) {
  const priorityOptions = [
    { key: 'all', label: 'All' }, { key: 'H', label: 'High' },
    { key: 'M', label: 'Medium' }, { key: 'L', label: 'Low' },
  ];
  const assigneeOptions = [
    { key: 'all', label: 'Everyone' }, { key: 'mine', label: 'Mine' },
    { key: 'unassigned', label: 'Unassigned' },
  ];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      maxWidth: 1320, margin: '0 auto', width: '100%', padding: '20px 40px 8px', flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Segmented options={priorityOptions} value={priorityFilter} onChange={setPriorityFilter} T={T} />
        <Segmented options={assigneeOptions} value={assigneeFilter} onChange={setAssigneeFilter} T={T} />
      </div>
      <button onClick={onNew}
        style={{
          display: 'flex', alignItems: 'center', gap: 7, background: T.red, border: 'none',
          color: '#fff', fontFamily: FONTS.body, fontWeight: 600, fontSize: 12.5,
          padding: '10px 16px', borderRadius: 999, cursor: 'pointer', letterSpacing: '0.01em',
          transition: 'background 120ms',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = T.redHover; }}
        onMouseLeave={e => { e.currentTarget.style.background = T.red; }}
      >
        <Plus size={15} strokeWidth={2.5} /> New Ticket
      </button>
    </div>
  );
}

// -- Ticket card ---------------------------------------------------
function TicketCard({ ticket, now, onClick, T, empName }) {
  const assigneeName = ticket.assignedTo ? empName[ticket.assignedTo] : null;
  const s = slaState(ticket, now);
  const breached = s.kind === 'active' && s.band === 'breached';
  const accent = breached ? T.red : statusAccent(ticket.status, T);
  return (
    <button onClick={onClick}
      style={{
        textAlign: 'left', background: T.surface, position: 'relative', overflow: 'hidden',
        border: `1px solid ${breached ? T.redLine : T.border}`, borderRadius: 14,
        padding: '16px 16px 16px 18px', display: 'flex', flexDirection: 'column', gap: 12, cursor: 'pointer',
        transition: 'background 120ms, border-color 120ms, transform 120ms, box-shadow 120ms', width: '100%',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = T.surfaceHover;
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = `0 6px 20px ${T.overlay}`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = T.surface;
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <span style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
        background: accent, opacity: ticket.status === 'waiting' ? 0.5 : 0.9,
      }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <PriorityDot priority={ticket.priority} T={T} />
        <MonoNum size={10} color={T.textFaint} T={T}>{ticket.displayId}</MonoNum>
      </div>
      <div style={{
        fontFamily: FONTS.body, fontSize: 13.5, color: T.text, lineHeight: 1.45,
        fontWeight: 500, letterSpacing: '-0.005em',
      }}>{ticket.summary}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: FONTS.body, fontSize: 11.5, color: T.textMid }}>
        <span style={{ fontWeight: 500 }}>{ticket.client}</span>
        <span style={{ color: T.textFaint }}>·</span>
        <span style={{ color: T.textDim }}>{formatElapsed(now - ticket.createdAtMs)} ago</span>
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 12, borderTop: `1px solid ${T.border}`,
      }}>
        <div style={{ flex: 1, minWidth: 0, marginRight: 10 }}>
          <SlaBar ticket={ticket} now={now} T={T} />
        </div>
        {assigneeName
          ? <Avatar name={assigneeName} size={24} T={T} />
          : <div style={{
              width: 24, height: 24, borderRadius: 24, border: `1px dashed ${T.borderStrong}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.textFaint,
            }}><Circle size={10} strokeWidth={2} /></div>}
      </div>
    </button>
  );
}

// -- Column --------------------------------------------------------
function Column({ status, tickets, now, onSelect, T, empName }) {
  const accent = statusAccent(status.key, T);
  const chipBg = status.key === 'in_progress' || status.key === 'resolved'
    ? T.tealDim
    : status.key === 'open' ? T.redDim : T.trackBg;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div style={{
        padding: '0 4px 12px', marginBottom: 4, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: 8, borderBottom: `2px solid ${accent}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 7, height: 7, borderRadius: 7, background: accent, flexShrink: 0 }} />
          <div style={{
            fontFamily: FONTS.body, fontSize: 12, letterSpacing: '0.04em',
            color: T.text, fontWeight: 600,
          }}>{status.label}</div>
        </div>
        <span style={{
          fontFamily: FONTS.mono, fontSize: 11, color: T.textMid,
          background: chipBg, border: `1px solid ${T.border}`,
          borderRadius: 999, padding: '2px 9px', fontVariantNumeric: 'tabular-nums',
        }}>{tickets.length}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 24 }}>
        {tickets.length === 0 ? (
          <div style={{
            fontFamily: FONTS.body, fontSize: 12, color: T.textFaint,
            padding: '24px 16px', textAlign: 'center', border: `1px dashed ${T.border}`,
            borderRadius: 14,
          }}>Nothing here.</div>
        ) : tickets.map(t => (
          <TicketCard key={t.id} ticket={t} now={now} onClick={() => onSelect(t.id)} T={T} empName={empName} />
        ))}
      </div>
    </div>
  );
}

// -- Detail drawer -------------------------------------------------
function FieldLabel({ children, T }) {
  return (
    <div style={{
      fontFamily: FONTS.body, fontSize: 10.5, letterSpacing: '0.1em',
      textTransform: 'uppercase', color: T.textDim, fontWeight: 600,
    }}>{children}</div>
  );
}

function MetaField({ label, value, hint, T }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <FieldLabel T={T}>{label}</FieldLabel>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontFamily: FONTS.body, fontSize: 13.5, color: T.text, fontWeight: 500 }}>{value}</span>
        {hint && <span style={{ fontFamily: FONTS.body, fontSize: 10.5, color: T.textDim, fontStyle: 'italic' }}>{hint}</span>}
      </div>
    </div>
  );
}

function DetailDrawer({ ticket, now, onClose, onAssign, onStatusChange, T, team, empName }) {
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    if (!ticket) return;
    let alive = true;
    (async () => {
      try {
        const data = await api.get(`/api/devsupport/tickets/${ticket.id}/activity`);
        if (alive) setActivity(data || []);
      } catch {
        if (alive) setActivity([]);
      }
    })();
    return () => { alive = false; };
  }, [ticket]);

  if (!ticket) return null;
  const assigneeName = ticket.assignedTo ? empName[ticket.assignedTo] : null;

  // Real activity_log rows, with the ticket's own open as the base event.
  const items = [
    ...activity.map(a => ({ note: humanizeActivity(a.action, a.details), who: a.actor_email || '—', atMs: Date.parse(a.created_at) })),
    { note: 'Ticket opened', who: '—', atMs: ticket.createdAtMs, opened: true },
  ].sort((x, y) => y.atMs - x.atMs);

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(520px, 100vw)',
      background: T.surface, borderLeft: `1px solid ${T.border}`,
      boxShadow: `-16px 0 50px ${T.overlay}`, display: 'flex', flexDirection: 'column', zIndex: 10,
    }}>
      <div style={{ padding: '24px 28px 18px', borderBottom: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <PriorityDot priority={ticket.priority} T={T} />
            <MonoNum size={11} color={T.textDim} T={T}>{ticket.displayId}</MonoNum>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', cursor: 'pointer', color: T.textMid,
            padding: 4, display: 'flex',
          }}><X size={18} strokeWidth={2} /></button>
        </div>
        <div style={{
          fontFamily: FONTS.body, fontSize: 18, color: T.text, fontWeight: 600,
          lineHeight: 1.35, letterSpacing: '-0.01em',
        }}>{ticket.summary}</div>
        <div><SlaBar ticket={ticket} now={now} T={T} /></div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px 28px' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 24px',
          paddingBottom: 22, borderBottom: `1px solid ${T.border}`,
        }}>
          <MetaField label="Client" value={ticket.client} T={T} />
          <MetaField label="Assignee" value={assigneeName || 'Unassigned'} T={T} />
          <MetaField label="Opened" value={`${formatElapsed(now - ticket.createdAtMs)} ago`} T={T} />
          <MetaField label="Status" value={STATUS_LABEL[ticket.status] || ticket.status} T={T} />
        </div>

        <div style={{ padding: '22px 0', borderBottom: `1px solid ${T.border}` }}>
          <FieldLabel T={T}>Assigned to</FieldLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 10 }}>
            {team.length === 0 && <div style={{ fontFamily: FONTS.body, fontSize: 12, color: T.textDim }}>No support team found.</div>}
            {team.map(member => {
              const selected = ticket.assignedTo === member.id;
              return (
                <button key={member.id} onClick={() => onAssign(ticket.id, member.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 11, padding: '9px 11px',
                    background: selected ? T.bg : 'transparent',
                    border: `1px solid ${selected ? T.border : 'transparent'}`,
                    borderRadius: 10, cursor: 'pointer', textAlign: 'left', transition: 'background 100ms',
                  }}
                  onMouseEnter={e => { if (!selected) e.currentTarget.style.background = T.bg; }}
                  onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent'; }}
                >
                  <Avatar name={member.name} size={28} T={T} />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontFamily: FONTS.body, fontSize: 12.5, color: T.text, fontWeight: 500 }}>{member.name}</span>
                    <span style={{ fontFamily: FONTS.body, fontSize: 10.5, color: T.textDim }}>{member.role}</span>
                  </div>
                  {selected && <span style={{
                    marginLeft: 'auto', fontFamily: FONTS.mono, fontSize: 9, color: T.red,
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                  }}>Current</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ padding: '22px 0', borderBottom: `1px solid ${T.border}` }}>
          <FieldLabel T={T}>Move to</FieldLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {STATUSES.filter(s => s.key !== ticket.status).map(s => (
              <button key={s.key} onClick={() => onStatusChange(ticket.id, s.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, background: 'transparent',
                  border: `1px solid ${T.borderStrong}`, color: T.text, fontFamily: FONTS.body,
                  fontSize: 11.5, padding: '8px 13px', borderRadius: 999, cursor: 'pointer', fontWeight: 500,
                  transition: 'background 100ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = T.bg; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >{s.label} <ChevronRight size={13} strokeWidth={2} color={T.textDim} /></button>
            ))}
          </div>
        </div>

        <div style={{ padding: '22px 0', borderBottom: `1px solid ${T.border}` }}>
          <FieldLabel T={T}>Description</FieldLabel>
          <div style={{
            marginTop: 12, fontFamily: FONTS.body, fontSize: 13, color: T.textMid, lineHeight: 1.65,
          }}>{ticket.detail || 'No description.'}</div>
        </div>

        <div style={{ padding: '22px 0 0' }}>
          <FieldLabel T={T}>Activity</FieldLabel>
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {items.map((e, i) => (
              <div key={i} style={{ display: 'flex', gap: 11 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: 8, marginTop: 5, flexShrink: 0,
                  background: e.opened ? T.red : T.textFaint,
                }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontFamily: FONTS.body, fontSize: 12.5, color: T.text, fontWeight: 500 }}>{e.note}</span>
                  <span style={{ fontFamily: FONTS.body, fontSize: 11, color: T.textDim }}>{e.who} · {formatElapsed(now - e.atMs)} ago</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// -- New ticket modal ----------------------------------------------
function NewTicketModal({ T, accounts, team, onClose, onSubmit }) {
  const [f, setF] = useState({ title: '', description: '', account_id: '', priority: 'M', assigned_to: '' });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const labelStyle = {
    fontFamily: FONTS.body, fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase',
    color: T.textDim, fontWeight: 600, display: 'block', marginBottom: 7,
  };
  const fieldStyle = {
    width: '100%', boxSizing: 'border-box', background: T.bg, border: `1px solid ${T.border}`,
    borderRadius: 10, padding: '10px 12px', fontFamily: FONTS.body, fontSize: 13, color: T.text, outline: 'none',
  };

  const submit = () => {
    if (!f.title.trim()) { alert('A summary is required.'); return; }
    onSubmit(f);
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: T.overlay, zIndex: 20 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 'min(540px, calc(100vw - 32px))', maxHeight: '88vh', overflowY: 'auto', zIndex: 21,
        background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16,
        boxShadow: `0 24px 64px ${T.overlay}`,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px 16px', borderBottom: `1px solid ${T.border}`,
        }}>
          <span style={{ fontFamily: FONTS.display, fontSize: 15, letterSpacing: '0.06em', color: T.text, textTransform: 'uppercase' }}>New Ticket</span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: T.textMid, padding: 4, display: 'flex' }}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Summary *</label>
            <input style={fieldStyle} value={f.title} onChange={e => set('title', e.target.value)} placeholder="Short description of the issue" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>Client</label>
              <select style={fieldStyle} value={f.account_id} onChange={e => set('account_id', e.target.value)}>
                <option value="">— None —</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Priority</label>
              <select style={fieldStyle} value={f.priority} onChange={e => set('priority', e.target.value)}>
                <option value="H">High</option>
                <option value="M">Medium</option>
                <option value="L">Low</option>
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Assign to</label>
            <select style={fieldStyle} value={f.assigned_to} onChange={e => set('assigned_to', e.target.value)}>
              <option value="">— Unassigned —</option>
              {team.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Description</label>
            <textarea style={{ ...fieldStyle, resize: 'none', height: 110, lineHeight: 1.6 }} value={f.description} onChange={e => set('description', e.target.value)} placeholder="What is happening, and any detail that helps whoever picks it up." />
          </div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10,
          padding: '14px 24px', borderTop: `1px solid ${T.border}`,
        }}>
          <button onClick={onClose} style={{
            background: 'transparent', border: `1px solid ${T.borderStrong}`, color: T.text,
            fontFamily: FONTS.body, fontSize: 12.5, fontWeight: 500, padding: '9px 16px', borderRadius: 999, cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={submit}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, background: T.red, border: 'none', color: '#fff',
              fontFamily: FONTS.body, fontWeight: 600, fontSize: 12.5, padding: '10px 18px', borderRadius: 999, cursor: 'pointer',
              transition: 'background 120ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = T.redHover; }}
            onMouseLeave={e => { e.currentTarget.style.background = T.red; }}
          ><Plus size={15} strokeWidth={2.5} /> Create Ticket</button>
        </div>
      </div>
    </>
  );
}

// -- App -----------------------------------------------------------
export default function DevSupportQueue({ session }) {
  const me = session?.employee;

  const [tickets, setTickets] = useState([]);
  const [empName, setEmpName] = useState({}); // id -> name (all employees, for display)
  const [team, setTeam] = useState([]);       // [{id,name,role}] assignable support roster
  const [accounts, setAccounts] = useState([]); // [{id,name}] for the New Ticket client picker
  const [loading, setLoading] = useState(true);

  const [selectedId, setSelectedId] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [now, setNow] = useState(Date.now());

  const T = THEMES.light;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/devsupport');

      const empRows = data.employees || [];
      const emp = Object.fromEntries(empRows.map(e => [e.id, e.name]));
      const accs = data.accounts || [];
      const compName = Object.fromEntries((data.companies || []).map(c => [c.id, c.name]));
      const acctName = Object.fromEntries(accs.map(a => [a.account_id, compName[a.hubspot_company_id] || '—']));

      const rows = (data.tickets || []).map(t => ({
        id: t.ticket_id,
        displayId: 'TKT-' + String(t.ticket_id).slice(0, 4).toUpperCase(),
        summary: t.title || '(untitled)',
        detail: t.description || '',
        client: acctName[t.account_id] || '—',
        priority: t.priority || 'M',
        status: t.status || 'open',
        assignedTo: t.assigned_to,
        createdAtMs: t.created_at ? Date.parse(t.created_at) : Date.now(),
        resolvedAtMs: t.resolved_at ? Date.parse(t.resolved_at) : null,
      }));

      // Assignable roster = the dev support / QA team, resolved from employee data.
      const teamList = empRows
        .filter(e => /dev support|qa\/?qc/i.test(e.position || ''))
        .map(e => ({ id: e.id, name: e.name, role: e.position }));

      const acctList = accs
        .map(a => ({ id: a.account_id, name: acctName[a.account_id] }))
        .filter(o => o.name && o.name !== '—')
        .sort((x, y) => x.name.localeCompare(y.name));

      setEmpName(emp);
      setTeam(teamList);
      setAccounts(acctList);
      setTickets(rows);
    } catch (e) {
      alert('Could not load queue: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tickets.filter(t => {
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (assigneeFilter === 'mine' && t.assignedTo !== me?.id) return false;
      if (assigneeFilter === 'unassigned' && t.assignedTo != null) return false;
      if (q) {
        const hay = `${t.displayId} ${t.summary} ${t.client}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [tickets, priorityFilter, assigneeFilter, query, me]);

  const byStatus = useMemo(() => {
    const r = { open: [], in_progress: [], waiting: [], resolved: [] };
    for (const t of filtered) if (r[t.status]) r[t.status].push(t);
    const pOrder = { H: 0, M: 1, L: 2 };
    for (const k of Object.keys(r)) {
      r[k].sort((a, b) => {
        const p = (pOrder[a.priority] ?? 9) - (pOrder[b.priority] ?? 9);
        if (p !== 0) return p;
        return b.createdAtMs - a.createdAtMs;
      });
    }
    return r;
  }, [filtered]);

  const selected = tickets.find(t => t.id === selectedId) || null;

  // WRITE: optimistic local update -> Laravel (DB update + activity_log) via lib/api.
  async function handleAssign(ticketId, assigneeId) {
    setTickets(ts => ts.map(t => t.id === ticketId ? { ...t, assignedTo: assigneeId } : t));
    try {
      await api.patch(`/api/devsupport/tickets/${ticketId}/assign`, { assigned_to: assigneeId });
    } catch (e) {
      alert('Assign failed: ' + e.message); load();
    }
  }

  async function handleStatusChange(ticketId, newStatus) {
    setTickets(ts => ts.map(t => t.id === ticketId
      ? { ...t, status: newStatus, resolvedAtMs: newStatus === 'resolved' ? (t.resolvedAtMs || now) : t.resolvedAtMs }
      : t));
    try {
      await api.patch(`/api/devsupport/tickets/${ticketId}`, { status: newStatus });
    } catch (e) {
      alert('Update failed: ' + e.message); load();
    }
  }

  // CREATE: insert a new ticket (status opens at 'open') + log the open.
  async function handleNew(form) {
    try {
      await api.post('/api/devsupport/tickets', {
        title: form.title.trim(),
        description: form.description.trim() || null,
        account_id: form.account_id || null,
        priority: form.priority,
        assigned_to: form.assigned_to || null,
      });
      setShowNew(false);
      load();
    } catch (e) {
      alert('Could not create ticket: ' + e.message);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: T.bg, fontFamily: FONTS.body, color: T.text,
      transition: 'background 200ms, color 200ms',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        button:focus-visible { outline: 2px solid ${T.red}; outline-offset: 2px; }
        input::placeholder { color: ${T.textFaint}; }
        ::-webkit-scrollbar { width: 9px; height: 9px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 5px; }
        ::-webkit-scrollbar-thumb:hover { background: ${T.borderStrong}; }
      `}</style>

      <Header T={T} query={query} setQuery={setQuery} me={me} />
      <StatStrip tickets={tickets} now={now} T={T} />
      <FilterRow
        priorityFilter={priorityFilter} setPriorityFilter={setPriorityFilter}
        assigneeFilter={assigneeFilter} setAssigneeFilter={setAssigneeFilter}
        onNew={() => setShowNew(true)} T={T}
      />

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 22,
        maxWidth: 1320, margin: '0 auto', width: '100%', padding: '16px 40px 48px',
      }}>
        {loading
          ? <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 0', color: T.textDim, fontSize: 13 }}>Loading queue…</div>
          : STATUSES.map(s => (
            <Column key={s.key} status={s} tickets={byStatus[s.key]} now={now} onSelect={setSelectedId} T={T} empName={empName} />
          ))}
      </div>

      <div style={{
        maxWidth: 1320, margin: '0 auto', width: '100%', padding: '0 40px 36px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
        fontFamily: FONTS.body, fontSize: 10.5, color: T.textFaint, letterSpacing: '0.04em',
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: 6, background: T.teal, flexShrink: 0 }} />
          Spine connected · Reads: employees, accounts, tickets · Writes: devsupport.ticket.assigned, status_changed, resolved
        </span>
        <span>Loid Aringoy &amp; Nassim Orabi</span>
      </div>

      {selected && (
        <>
          <div onClick={() => setSelectedId(null)} style={{ position: 'fixed', inset: 0, background: T.overlay, zIndex: 9 }} />
          <DetailDrawer
            ticket={selected} now={now} onClose={() => setSelectedId(null)}
            onAssign={handleAssign} onStatusChange={handleStatusChange}
            T={T} team={team} empName={empName}
          />
        </>
      )}

      {showNew && (
        <NewTicketModal T={T} accounts={accounts} team={team} onClose={() => setShowNew(false)} onSubmit={handleNew} />
      )}
    </div>
  );
}
