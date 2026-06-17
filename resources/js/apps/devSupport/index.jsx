// resources/js/apps/devSupport/index.jsx
// EXAMPLE of a translated app, showing the shape every app folder follows.
// This is the pattern the translation playbook produces from a teammate's raw
// DevSupportQueue.jsx: same UI they designed, static arrays replaced with
// Supabase reads, identity from the shell, writes paired with activity_log.
//
// Props from the shell: { session, supabase }. Never import the client or the
// session directly here; take them from props so the app stays a stranger to
// the shell internals.
import { useState, useEffect } from 'react';
import { logActivity } from '../../lib/activity';

export default function DevSupportApp({ session, supabase }) {
  const me = session?.employee;
  const [tickets, setTickets] = useState(null);
  const [error, setError] = useState(null);

  // READ: static SEED_TICKETS array -> Supabase query. RLS decides which rows
  // come back, so the app does not filter by permission itself.
  useEffect(() => {
    let alive = true;
    (async () => {
      // employees is read for name resolution; tickets reference people by UUID.
      const { data, error } = await supabase
        .from('tickets')
        .select('ticket_id,title,priority,status,assigned_to,account_id,created_at')
        .order('created_at', { ascending: false });
      if (!alive) return;
      if (error) setError(error.message);
      else setTickets(data);
    })();
    return () => { alive = false; };
  }, [supabase]);

  // WRITE: mutate state -> Supabase update + activity_log insert.
  async function resolveTicket(ticket) {
    const { error } = await supabase
      .from('tickets')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('ticket_id', ticket.ticket_id);
    if (error) { setError(error.message); return; }

    await logActivity({
      app: 'devsupport',
      actor: me,
      action: 'devsupport.ticket.resolved',
      entityType: 'ticket',
      entityId: ticket.ticket_id,
      details: { from: ticket.status, to: 'resolved' },
    });

    setTickets((prev) => prev.map((t) =>
      t.ticket_id === ticket.ticket_id ? { ...t, status: 'resolved' } : t));
  }

  if (error) return <div style={{ padding: 40 }}>Error: {error}</div>;
  if (!tickets) return <div style={{ padding: 40 }}>Loading tickets…</div>;

  return (
    <div style={{ padding: 32, fontFamily: 'Poppins, system-ui, sans-serif' }}>
      <h1 style={{ color: '#24242D' }}>Dev Support Queue</h1>
      <p style={{ color: '#777', fontSize: 13 }}>Signed in as {me?.name}. Rows shown are what RLS allows.</p>
      <ul style={{ listStyle: 'none', padding: 0, marginTop: 16 }}>
        {tickets.map((t) => (
          <li key={t.ticket_id} style={{
            border: '1px solid #e3e3e8', borderRadius: 8, padding: 14, marginBottom: 10,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span><strong>[{t.priority}]</strong> {t.title} — {t.status}</span>
            {t.status !== 'resolved' && (
              <button onClick={() => resolveTicket(t)} style={{
                background: '#E73835', color: '#fff', border: 'none', borderRadius: 6,
                padding: '6px 12px', cursor: 'pointer', fontSize: 13,
              }}>Resolve</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
