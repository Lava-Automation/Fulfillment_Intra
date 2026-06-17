// resources/js/mainapp.jsx
// The shell. Owns the few genuinely shared concerns and nothing else:
//   - the Supabase client + session (passed DOWN to apps, never reached for)
//   - the router and the side-panel switcher
//   - a per-route error boundary so one app's crash can't blank the hub
//   - the brand frame
// Apps are strangers to each other. They receive { session, supabase } and talk
// only to the shell above and the database below. Keep this file small; a change
// here affects everyone, which is the one shared single point of failure.
import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { APPS } from './apps/registry';
import { useSession } from './lib/useSession';
import { supabase } from './lib/supabase';
import { AppErrorBoundary } from './lib/AppErrorBoundary';

const B = {
  red: '#E73835',
  dark: '#24242D',
  teal: '#145365',
  white: '#FFFFFF',
  black: '#1B120B',
};

function SidePanel({ employee, onSignOut }) {
  return (
    <nav style={{
      width: 220, minWidth: 220, background: B.dark, color: B.white,
      display: 'flex', flexDirection: 'column', height: '100vh',
      fontFamily: 'Poppins, system-ui, sans-serif',
    }}>
      <div style={{ padding: '20px 18px', fontWeight: 700, fontSize: 18, letterSpacing: 0.5 }}>
        LAVA <span style={{ color: B.red }}>Fulfillment</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {APPS.map((app) => (
          <NavLink
            key={app.key}
            to={app.path}
            end={app.path === '/'}
            style={({ isActive }) => ({
              display: 'block', padding: '11px 18px', fontSize: 14,
              color: isActive ? B.white : '#b9b9c2',
              background: isActive ? B.red : 'transparent',
              textDecoration: 'none', borderLeft: isActive ? `3px solid ${B.white}` : '3px solid transparent',
            })}
          >
            {app.label}
          </NavLink>
        ))}
      </div>
      <div style={{ padding: '14px 18px', borderTop: '1px solid #3a3a44', fontSize: 12 }}>
        <div style={{ color: B.white, fontWeight: 600 }}>{employee?.name || 'Not signed in'}</div>
        <div style={{ color: '#9a9aa4' }}>{employee?.position || employee?.group || ''}</div>
        {employee && (
          <button onClick={onSignOut} style={{
            marginTop: 8, background: 'transparent', color: '#b9b9c2',
            border: '1px solid #3a3a44', borderRadius: 6, padding: '4px 10px',
            fontSize: 12, cursor: 'pointer',
          }}>Sign out</button>
        )}
      </div>
    </nav>
  );
}

function AppArea({ session }) {
  const location = useLocation();
  return (
    <main style={{ flex: 1, height: '100vh', overflow: 'auto', background: B.white }}>
      <Routes>
        {APPS.map((app) => {
          const Comp = app.component;
          return (
            <Route
              key={app.key}
              path={app.path}
              element={
                <AppErrorBoundary appName={app.label} routeKey={location.pathname}>
                  <Suspense fallback={<div style={{ padding: 40, fontFamily: 'Poppins, sans-serif', color: '#777' }}>Loading {app.label}…</div>}>
                    {/* Apps receive identity and the client from the shell. */}
                    <Comp session={session} supabase={supabase} />
                  </Suspense>
                </AppErrorBoundary>
              }
            />
          );
        })}
      </Routes>
    </main>
  );
}

function SignInGate({ onSignIn }) {
  const [email, setEmail] = React.useState('');
  const [sent, setSent] = React.useState(false);
  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Poppins, system-ui, sans-serif', background: B.dark, color: B.white,
    }}>
      <div style={{ width: 320, textAlign: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: 22, marginBottom: 6 }}>
          LAVA <span style={{ color: B.red }}>Fulfillment</span>
        </div>
        <p style={{ color: '#b9b9c2', fontSize: 13, marginBottom: 18 }}>
          {sent ? 'Check your email for the sign-in link.' : 'Sign in with your Lava email.'}
        </p>
        {!sent && (
          <>
            <input
              value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@lavaautomation.com"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: 'none', marginBottom: 10, fontSize: 14 }}
            />
            <button
              onClick={async () => { await onSignIn(email); setSent(true); }}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: 'none', background: B.red, color: B.white, fontWeight: 600, cursor: 'pointer' }}
            >Send magic link</button>
          </>
        )}
      </div>
    </div>
  );
}

export default function MainApp() {
  const { employee, loading, signInWithEmail, signOut } = useSession();
  const devBypass = import.meta.env.VITE_DEV_EMPLOYEE_ID;

  if (loading) {
    return <div style={{ padding: 40, fontFamily: 'Poppins, sans-serif', color: '#777' }}>Loading…</div>;
  }

  // No session and no dev bypass -> show sign-in.
  if (!employee && !devBypass) {
    return <SignInGate onSignIn={signInWithEmail} />;
  }

  const session = { employee };

  return (
    <BrowserRouter>
      <div style={{ display: 'flex', fontFamily: 'Poppins, system-ui, sans-serif' }}>
        <SidePanel employee={employee} onSignOut={signOut} />
        <AppArea session={session} />
      </div>
    </BrowserRouter>
  );
}
