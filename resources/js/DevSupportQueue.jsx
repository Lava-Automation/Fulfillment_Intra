import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, Plus, X, Clock, AlertCircle, CheckCircle2, PauseCircle,
  Sun, Moon, ChevronRight, Circle
} from 'lucide-react';

/*
  Lava Dev Support Queue — Minimalist edition
  ------------------------------------------------------------------
  Owners: Loid Aringoy + Nassim Orabi.

  Sits on the Lava spine. Does not own auth, identity, or directory data.
  Reads: employees, role_grants, clients.
  Writes: devsupport.ticket.opened, devsupport.ticket.assigned,
          devsupport.ticket.resolved -> spine.activity_log.

  Two colors per screen: Red #e73835 (accent/CTA), Dark Blue #24242d
  (structure). Light is the default surface; dark mode is a toggle.
  Both palettes derive from the same two brand colors — White and
  near-Black are utilities, not extra colors.

  Display Monument Extended, body Poppins. Real dev support team from
  Lava_Employees_Merged.js; everything else mock for the prototype.
*/

// -- Brand floor + color theory ------------------------------------
// Lava palette (brand guide p.12):
//   Red    #e73835  - primary, most visible. CTAs, high priority, breaches.
//   DarkBlue #24242d - structure, contrast, header areas.
//   Teal   #145365  - SUPPORTING only: secondary highlights, system states.
//   Black  #1B120B  - typography / strong contrast.
//   White  #ffffff  - breathing room, card + form surfaces.
//
// Rule: two PRIMARY colors per layout. So Red + Dark Blue lead everywhere;
// Teal is the sanctioned supporting accent, never a third primary.
//
// The harmony: Red (~6°, warm) and Teal (~194°, cool) sit nearly opposite
// on the wheel — a warm/cool near-complementary pair. We let Red stay loud
// and give Teal the quiet, cool counterweight (in-progress + healthy SLA),
// so the eye gets temperature contrast instead of red-vs-gray. Every
// surface carries a faint tonal wash pulled from a brand hue rather than a
// neutral gray, which is what makes the screen read as harmonized.
const RED = '#e73835';
const RED_HOVER = '#c0302e';
const DARK_BLUE = '#24242d';
const TEAL = '#145365';
const TEAL_LIGHT = '#1d7187';   // teal lifted for dark-mode legibility
const BLACK = '#1B120B';

const THEMES = {
  light: {
    red: RED,
    redHover: RED_HOVER,
    redDim: 'rgba(231, 56, 53, 0.09)',
    redLine: 'rgba(231, 56, 53, 0.32)',
    darkBlue: DARK_BLUE,
    // teal supporting set
    teal: TEAL,
    tealText: TEAL,
    tealDim: 'rgba(20, 83, 101, 0.10)',
    tealLine: 'rgba(20, 83, 101, 0.30)',
    // surfaces carry a faint cool (blue/teal) tint, not gray
    bg: '#f4f6f7',
    surface: '#ffffff',
    surfaceHover: '#f7fafb',
    // structural lines borrow the dark-blue hue
    border: 'rgba(36, 36, 45, 0.10)',
    borderStrong: 'rgba(36, 36, 45, 0.18)',
    // type sits on Black for warmth against the cool field
    text: BLACK,
    textMid: 'rgba(27, 18, 11, 0.62)',
    textDim: 'rgba(27, 18, 11, 0.42)',
    textFaint: 'rgba(27, 18, 11, 0.26)',
    trackBg: 'rgba(36, 36, 45, 0.08)',
    avatarBg: 'rgba(20, 83, 101, 0.07)',
    // header/footer get the dark-blue structural fill
    structFill: DARK_BLUE,
    onStruct: '#ffffff',
    onStructDim: 'rgba(255,255,255,0.58)',
    overlay: 'rgba(27, 18, 11, 0.30)',
  },
  dark: {
    red: RED,
    redHover: RED_HOVER,
    redDim: 'rgba(231, 56, 53, 0.16)',
    redLine: 'rgba(231, 56, 53, 0.42)',
    darkBlue: DARK_BLUE,
    teal: TEAL_LIGHT,
    tealText: '#5fc7dd',
    tealDim: 'rgba(29, 113, 135, 0.20)',
    tealLine: 'rgba(95, 199, 221, 0.34)',
    // deep base tuned toward the dark-blue hue (cool, not neutral)
    bg: '#15161b',
    surface: '#1e2028',
    surfaceHover: '#252834',
    border: 'rgba(255, 255, 255, 0.08)',
    borderStrong: 'rgba(255, 255, 255, 0.16)',
    text: '#f4f3f1',
    textMid: 'rgba(244, 243, 241, 0.68)',
    textDim: 'rgba(244, 243, 241, 0.46)',
    textFaint: 'rgba(244, 243, 241, 0.28)',
    trackBg: 'rgba(255, 255, 255, 0.08)',
    avatarBg: 'rgba(95, 199, 221, 0.10)',
    structFill: '#1b1c22',
    onStruct: '#f4f3f1',
    onStructDim: 'rgba(244, 243, 241, 0.55)',
    overlay: 'rgba(0, 0, 0, 0.58)',
  },
};

// Status -> brand-hue accent. This is the color-theory spine of the board:
// open is loud red (needs picking up), in-progress is the cool teal
// counterweight, waiting is muted neutral, resolved is teal-confirmed.
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

// Real dev support team from Lava_Employees_Merged.js. All report to Kristel.
const TEAM = [
  { id: '4e6d7463-e2f0-4b8b-b116-b8c77a7b98b2', name: 'Loid Aringoy', role: 'Dev Support Specialist' },
  { id: '53a2cb1e-1a6b-448b-b19c-eb6b3e307cb2', name: 'Nassim Orabi', role: 'Dev Support Specialist' },
  { id: '78fcfc43-75e8-42d5-9a1b-af5f4005d42d', name: 'Elijah Tancio', role: 'Dev Support Specialist' },
  { id: '40432580-7e49-4e81-b3a7-c94e92e1a71f', name: 'Josiah Hannen Lera', role: 'QA/QC Support Specialist' },
  { id: 'e01c6cfb-a8de-42d4-b4ef-8434dc9754fd', name: 'Kristel Joyce Asuncion', role: 'QA/QC and Support Lead' },
];

const TEAM_BY_ID = Object.fromEntries(TEAM.map(t => [t.id, t]));
const CURRENT_USER = TEAM[0]; // Loid, signed in for this preview.

const STATUSES = [
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'waiting', label: 'Waiting on Client' },
  { key: 'resolved', label: 'Resolved' },
];

const PRIORITIES = {
  H: { label: 'High', slaMs: 2 * 60 * 60 * 1000 },
  M: { label: 'Medium', slaMs: 24 * 60 * 60 * 1000 },
  L: { label: 'Low', slaMs: 5 * 24 * 60 * 60 * 1000 },
};

// Mock tickets. Real names where humans appear; everything else mock.
const SEED_TICKETS = [
  {
    id: 'TKT-0241',
    summary: 'HubSpot to Zapier webhook returning 500 on enrollment',
    detail: 'Workflow "Lead Nurture v3" stopped enrolling new contacts at roughly 9:14 AM PHT. Zapier task history shows 500 responses from the HubSpot side. Affects new inbound leads from the Bridgepoint paid funnel.',
    client: 'Bridgepoint Insurance',
    openedBy: { name: 'Karla Jardeloza', kind: 'internal' },
    priority: 'H', status: 'in_progress',
    assignedTo: '4e6d7463-e2f0-4b8b-b116-b8c77a7b98b2',
    openedAtOffsetMs: 47 * 60 * 1000,
  },
  {
    id: 'TKT-0240',
    summary: 'Pipedrive sync stopped writing new deals into HubSpot',
    detail: 'The nightly Pipedrive to HubSpot sync ran at 2:00 AM but produced zero new deal rows in HubSpot. Pipedrive shows 14 new deals from yesterday. No errors in the sync log. Stellar has noticed and is asking for an ETA.',
    client: 'Stellar Logistics',
    openedBy: { name: 'Pat Reynolds', kind: 'client' },
    priority: 'H', status: 'open', assignedTo: null,
    openedAtOffsetMs: 1 * 60 * 60 * 1000 + 51 * 60 * 1000,
  },
  {
    id: 'TKT-0239',
    summary: 'Form submission not triggering follow-up sequence',
    detail: 'Submissions from the Heritage intake form land in HubSpot as contacts but the "Intake Follow-up" sequence does not start. Manual enrollment works. Likely a workflow trigger condition issue.',
    client: 'Heritage Wellness',
    openedBy: { name: 'Niccole Peeler', kind: 'internal' },
    priority: 'H', status: 'open', assignedTo: null,
    openedAtOffsetMs: 1 * 60 * 60 * 1000 + 23 * 60 * 1000,
  },
  {
    id: 'TKT-0238',
    summary: 'Workflow re-enrollment looping a contact through three sequences',
    detail: 'A single contact at Atlas was re-enrolled into the cold outreach sequence three times in 12 hours. Suspected loop between the "re-engage stale" workflow and the "new lead" workflow. Sent question to client about preferred enrollment rules.',
    client: 'Atlas Roofing',
    openedBy: { name: 'Rommel Cuta', kind: 'internal' },
    priority: 'H', status: 'waiting',
    assignedTo: '53a2cb1e-1a6b-448b-b19c-eb6b3e307cb2',
    openedAtOffsetMs: 4 * 60 * 60 * 1000,
  },
  {
    id: 'TKT-0237',
    summary: 'Calendly sync writing wrong timezone for PH-based reps',
    detail: 'Meetings booked via the Coastal calendar embed are showing up in HubSpot timeline events with a 16-hour offset. PH reps see the meeting at the wrong time on their HubSpot day view.',
    client: 'Coastal Marketing',
    openedBy: { name: 'Via Pagara', kind: 'internal' },
    priority: 'M', status: 'in_progress',
    assignedTo: '53a2cb1e-1a6b-448b-b19c-eb6b3e307cb2',
    openedAtOffsetMs: 9 * 60 * 60 * 1000,
  },
  {
    id: 'TKT-0236',
    summary: 'CRM tag automation not firing on new contact',
    detail: 'The "auto-tag by source" workflow runs on enrollment but does not write the tag property on contacts created via the Northwind landing page. Other landing pages work. Possibly a property mapping mismatch.',
    client: 'Northwind Realty',
    openedBy: { name: 'Sam Romero', kind: 'internal' },
    priority: 'M', status: 'open', assignedTo: null,
    openedAtOffsetMs: 2 * 60 * 60 * 1000 + 11 * 60 * 1000,
  },
  {
    id: 'TKT-0235',
    summary: 'Quote PDF generation timing out on long line items',
    detail: 'Pioneer quote PDFs over 40 line items time out at the PandaDoc step. Shorter quotes finish in under 6 seconds. Likely a payload size or render timeout. Need to confirm whether to chunk or raise the timeout.',
    client: 'Pioneer Construction',
    openedBy: { name: 'Dana Mills', kind: 'client' },
    priority: 'M', status: 'open', assignedTo: null,
    openedAtOffsetMs: 14 * 60 * 60 * 1000,
  },
  {
    id: 'TKT-0234',
    summary: 'Twilio SMS replies not threading correctly',
    detail: 'Inbound SMS replies are creating new conversation threads instead of attaching to the outbound thread. Affects roughly one in five replies. Sent diagnostic CSV to Bridgepoint, waiting on their preferred dedupe rule.',
    client: 'Bridgepoint Insurance',
    openedBy: { name: 'Mike Walker', kind: 'internal' },
    priority: 'M', status: 'waiting',
    assignedTo: '78fcfc43-75e8-42d5-9a1b-af5f4005d42d',
    openedAtOffsetMs: 18 * 60 * 60 * 1000,
  },
  {
    id: 'TKT-0232',
    summary: 'Slack notification missing assigned-to field',
    detail: 'Slack alerts for new HubSpot tasks render with an empty "Assigned to" line. The field is set on the task. Suspected template variable typo in the Zapier step.',
    client: 'Atlas Roofing',
    openedBy: { name: 'Loid Aringoy', kind: 'internal' },
    priority: 'L', status: 'in_progress',
    assignedTo: '78fcfc43-75e8-42d5-9a1b-af5f4005d42d',
    openedAtOffsetMs: 2 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'TKT-0231',
    summary: 'Lead score recalculation stuck on stale contacts',
    detail: 'Contacts with a last_modified date older than 90 days are not being re-scored by the nightly job. Job completes without errors. Likely a query filter that excludes stale records.',
    client: 'Coastal Marketing',
    openedBy: { name: 'Princess Aguilar', kind: 'internal' },
    priority: 'L', status: 'in_progress',
    assignedTo: '40432580-7e49-4e81-b3a7-c94e92e1a71f',
    openedAtOffsetMs: 3 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'TKT-0230',
    summary: 'Email template merge field showing UUID instead of name',
    detail: 'Outbound nurture email "Week 2 Check-in" rendered the contact UUID where the first name should appear. One client noticed. Template uses {{contact.id}} where it should use {{contact.firstname}}.',
    client: 'Northwind Realty',
    openedBy: { name: 'Jordan Hale', kind: 'client' },
    priority: 'L', status: 'open', assignedTo: null,
    openedAtOffsetMs: 1 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000,
  },
  {
    id: 'TKT-0228',
    summary: 'Migration script error on phone number format',
    detail: 'Heritage migration batch 4 failed on 23 of 1,400 rows due to international format phone numbers. Rolled those rows into a manual cleanup batch. Closing as resolved.',
    client: 'Heritage Wellness',
    openedBy: { name: 'Sam Romero', kind: 'internal' },
    priority: 'M', status: 'resolved',
    assignedTo: '4e6d7463-e2f0-4b8b-b116-b8c77a7b98b2',
    openedAtOffsetMs: 2 * 24 * 60 * 60 * 1000,
    resolvedAtOffsetMs: 1 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'TKT-0226',
    summary: 'Calendly link returning 404 on weekend hours',
    detail: 'Pioneer sales reps shared a Calendly link that returns 404 between Friday 6 PM and Monday 8 AM. Caused by an availability rule with no weekend slots and no fallback page. Updated the rule, link is live.',
    client: 'Pioneer Construction',
    openedBy: { name: 'Loid Aringoy', kind: 'internal' },
    priority: 'L', status: 'resolved',
    assignedTo: '4e6d7463-e2f0-4b8b-b116-b8c77a7b98b2',
    openedAtOffsetMs: 4 * 24 * 60 * 60 * 1000,
    resolvedAtOffsetMs: 2 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'TKT-0224',
    summary: 'Dashboard widget showing stale data after refresh',
    detail: 'Stellar weekly summary widget kept loading from cache after the underlying report changed. Cleared cache and added a 1-hour TTL. Confirmed fix with the client.',
    client: 'Stellar Logistics',
    openedBy: { name: 'Riley Andersen', kind: 'client' },
    priority: 'L', status: 'resolved',
    assignedTo: '53a2cb1e-1a6b-448b-b19c-eb6b3e307cb2',
    openedAtOffsetMs: 6 * 24 * 60 * 60 * 1000,
    resolvedAtOffsetMs: 4 * 24 * 60 * 60 * 1000,
  },
];

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

function slaState(ticket, now) {
  if (ticket.status === 'resolved') return { kind: 'resolved' };
  if (ticket.status === 'waiting') return { kind: 'paused' };
  const openedAt = now - ticket.openedAtOffsetMs;
  const elapsed = now - openedAt;
  const remaining = PRIORITIES[ticket.priority].slaMs - elapsed;
  let band;
  if (remaining < 0) band = 'breached';
  else if (remaining < PRIORITIES[ticket.priority].slaMs * 0.25) band = 'urgent';
  else band = 'ok';
  const pct = Math.max(0, Math.min(1, elapsed / PRIORITIES[ticket.priority].slaMs));
  return { kind: 'active', remaining, band, pct };
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
      }}>{PRIORITIES[priority].label}</span>
    </div>
  );
}

function SlaBar({ ticket, now, T }) {
  const s = slaState(ticket, now);
  if (s.kind === 'resolved') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.tealText, fontFamily: FONTS.body, fontSize: 11 }}>
        <CheckCircle2 size={12} strokeWidth={2} />
        <span>Resolved {formatElapsed(ticket.openedAtOffsetMs - ticket.resolvedAtOffsetMs)} after open</span>
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
  // Healthy = cool teal (calm). Urgent/breach = warm red (loud). The bar
  // literally crosses from cool to warm as time runs out.
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
function Header({ T, theme, onToggleTheme, query, setQuery }) {
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

          <button
            onClick={onToggleTheme}
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            style={{
              width: 38, height: 38, borderRadius: 999, cursor: 'pointer',
              background: 'rgba(255,255,255,0.07)', border: `1px solid rgba(255,255,255,0.12)`,
              color: T.onStructDim, display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 120ms, color 120ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = T.onStruct; e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = T.onStructDim; e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
          >
            {theme === 'light' ? <Moon size={16} strokeWidth={2} /> : <Sun size={16} strokeWidth={2} />}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 32, flexShrink: 0,
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: FONTS.body, fontSize: 11.5, fontWeight: 600,
              letterSpacing: '0.03em', color: T.onStruct,
            }}>{initials(CURRENT_USER.name)}</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontFamily: FONTS.body, fontSize: 12.5, color: T.onStruct, fontWeight: 500 }}>{CURRENT_USER.name}</span>
              <span style={{ fontFamily: FONTS.body, fontSize: 10.5, color: T.onStructDim }}>{CURRENT_USER.role}</span>
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
      r[t.status]++;
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
function TicketCard({ ticket, now, onClick, T }) {
  const assignee = ticket.assignedTo ? TEAM_BY_ID[ticket.assignedTo] : null;
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
      {/* status-accent rail: ties each card to its column hue */}
      <span style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
        background: accent, opacity: ticket.status === 'waiting' ? 0.5 : 0.9,
      }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <PriorityDot priority={ticket.priority} T={T} />
        <MonoNum size={10} color={T.textFaint} T={T}>{ticket.id}</MonoNum>
      </div>
      <div style={{
        fontFamily: FONTS.body, fontSize: 13.5, color: T.text, lineHeight: 1.45,
        fontWeight: 500, letterSpacing: '-0.005em',
      }}>{ticket.summary}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: FONTS.body, fontSize: 11.5, color: T.textMid }}>
        <span style={{ fontWeight: 500 }}>{ticket.client}</span>
        <span style={{ color: T.textFaint }}>·</span>
        <span style={{ color: T.textDim }}>{formatElapsed(ticket.openedAtOffsetMs)} ago</span>
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 12, borderTop: `1px solid ${T.border}`,
      }}>
        <div style={{ flex: 1, minWidth: 0, marginRight: 10 }}>
          <SlaBar ticket={ticket} now={now} T={T} />
        </div>
        {assignee
          ? <Avatar name={assignee.name} size={24} T={T} />
          : <div style={{
              width: 24, height: 24, borderRadius: 24, border: `1px dashed ${T.borderStrong}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.textFaint,
            }}><Circle size={10} strokeWidth={2} /></div>}
      </div>
    </button>
  );
}

// -- Column --------------------------------------------------------
function Column({ status, tickets, now, onSelect, T }) {
  const accent = statusAccent(status.key, T);
  // tint the count chip with the status accent at low alpha
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
          <TicketCard key={t.id} ticket={t} now={now} onClick={() => onSelect(t.id)} T={T} />
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

function DetailDrawer({ ticket, now, onClose, onAssign, onStatusChange, T }) {
  if (!ticket) return null;
  const assignee = ticket.assignedTo ? TEAM_BY_ID[ticket.assignedTo] : null;

  const activity = [
    { kind: 'opened', at: ticket.openedAtOffsetMs, who: ticket.openedBy.name, note: 'Ticket opened' },
    ...(ticket.assignedTo ? [{
      kind: 'assigned', at: Math.max(0, ticket.openedAtOffsetMs - 5 * 60 * 1000),
      who: 'Kristel Joyce Asuncion', note: `Assigned to ${assignee.name}`,
    }] : []),
    ...(ticket.status === 'in_progress' ? [{
      kind: 'status', at: Math.max(0, ticket.openedAtOffsetMs - 12 * 60 * 1000),
      who: assignee?.name || 'System', note: 'Moved to In Progress',
    }] : []),
    ...(ticket.status === 'waiting' ? [{
      kind: 'status', at: Math.max(0, ticket.openedAtOffsetMs - 2 * 60 * 60 * 1000),
      who: assignee?.name || 'System', note: 'Moved to Waiting on Client',
    }] : []),
    ...(ticket.status === 'resolved' ? [{
      kind: 'status', at: ticket.resolvedAtOffsetMs || 0,
      who: assignee?.name || 'System', note: 'Moved to Resolved',
    }] : []),
  ].sort((a, b) => b.at - a.at);

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
            <MonoNum size={11} color={T.textDim} T={T}>{ticket.id}</MonoNum>
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
          <MetaField label="Opened by" value={ticket.openedBy.name} hint={ticket.openedBy.kind === 'client' ? 'client contact' : 'internal'} T={T} />
          <MetaField label="Opened" value={`${formatElapsed(ticket.openedAtOffsetMs)} ago`} T={T} />
          <MetaField label="Status" value={STATUSES.find(s => s.key === ticket.status)?.label} T={T} />
        </div>

        <div style={{ padding: '22px 0', borderBottom: `1px solid ${T.border}` }}>
          <FieldLabel T={T}>Assigned to</FieldLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 10 }}>
            {TEAM.map(member => {
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
          }}>{ticket.detail}</div>
        </div>

        <div style={{ padding: '22px 0 0' }}>
          <FieldLabel T={T}>Activity</FieldLabel>
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {activity.map((e, i) => (
              <div key={i} style={{ display: 'flex', gap: 11 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: 8, marginTop: 5, flexShrink: 0,
                  background: e.kind === 'opened' ? T.red : T.textFaint,
                }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontFamily: FONTS.body, fontSize: 12.5, color: T.text, fontWeight: 500 }}>{e.note}</span>
                  <span style={{ fontFamily: FONTS.body, fontSize: 11, color: T.textDim }}>{e.who} · {formatElapsed(e.at)} ago</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// -- App -----------------------------------------------------------
export default function DevSupportQueue() {
  const [tickets, setTickets] = useState(SEED_TICKETS);
  const [selectedId, setSelectedId] = useState(null);
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [now, setNow] = useState(Date.now());
  const [theme, setTheme] = useState('light');

  const T = THEMES[theme];

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tickets.filter(t => {
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (assigneeFilter === 'mine' && t.assignedTo !== CURRENT_USER.id) return false;
      if (assigneeFilter === 'unassigned' && t.assignedTo !== null) return false;
      if (q) {
        const hay = `${t.id} ${t.summary} ${t.client}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [tickets, priorityFilter, assigneeFilter, query]);

  const byStatus = useMemo(() => {
    const r = { open: [], in_progress: [], waiting: [], resolved: [] };
    for (const t of filtered) r[t.status].push(t);
    const pOrder = { H: 0, M: 1, L: 2 };
    for (const k of Object.keys(r)) {
      r[k].sort((a, b) => {
        const p = pOrder[a.priority] - pOrder[b.priority];
        if (p !== 0) return p;
        return b.openedAtOffsetMs - a.openedAtOffsetMs;
      });
    }
    return r;
  }, [filtered]);

  const selected = tickets.find(t => t.id === selectedId) || null;

  // Mock spine writes -> activity_log inserts in production.
  function handleAssign(ticketId, assigneeId) {
    setTickets(ts => ts.map(t => t.id === ticketId ? { ...t, assignedTo: assigneeId } : t));
  }
  function handleStatusChange(ticketId, newStatus) {
    setTickets(ts => ts.map(t => {
      if (t.id !== ticketId) return t;
      const update = { ...t, status: newStatus };
      if (newStatus === 'resolved' && !t.resolvedAtOffsetMs) update.resolvedAtOffsetMs = 0;
      return update;
    }));
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

      <Header T={T} theme={theme} onToggleTheme={() => setTheme(p => p === 'light' ? 'dark' : 'light')} query={query} setQuery={setQuery} />
      <StatStrip tickets={tickets} now={now} T={T} />
      <FilterRow
        priorityFilter={priorityFilter} setPriorityFilter={setPriorityFilter}
        assigneeFilter={assigneeFilter} setAssigneeFilter={setAssigneeFilter}
        onNew={() => {}} T={T}
      />

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 22,
        maxWidth: 1320, margin: '0 auto', width: '100%', padding: '16px 40px 48px',
      }}>
        {STATUSES.map(s => (
          <Column key={s.key} status={s} tickets={byStatus[s.key]} now={now} onSelect={setSelectedId} T={T} />
        ))}
      </div>

      <div style={{
        maxWidth: 1320, margin: '0 auto', width: '100%', padding: '0 40px 36px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
        fontFamily: FONTS.body, fontSize: 10.5, color: T.textFaint, letterSpacing: '0.04em',
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: 6, background: T.teal, flexShrink: 0 }} />
          Spine connected · Reads: employees, role_grants, clients · Writes: devsupport.ticket.opened, assigned, resolved
        </span>
        <span>Loid Aringoy &amp; Nassim Orabi</span>
      </div>

      {selected && (
        <>
          <div onClick={() => setSelectedId(null)} style={{ position: 'fixed', inset: 0, background: T.overlay, zIndex: 9 }} />
          <DetailDrawer
            ticket={selected} now={now} onClose={() => setSelectedId(null)}
            onAssign={handleAssign} onStatusChange={handleStatusChange} T={T}
          />
        </>
      )}
    </div>
  );
}
