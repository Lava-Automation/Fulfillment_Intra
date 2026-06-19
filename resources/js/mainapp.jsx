// resources/js/mainapp.jsx
// The shell, slimmed to the auth/host wrapper. The Portal is now the sole app
// and hosts every other app embedded as its own pages, so the shell no longer
// needs the app-switcher sidebar or the router. It still owns the few genuinely
// shared concerns: the Supabase client + session (passed DOWN to the Portal),
// and a top-level error boundary. Keep this file small.
import React, { Suspense, lazy } from 'react';
import { useSession } from './lib/useSession';
import { supabase } from './lib/supabase';
import { AppErrorBoundary } from './lib/AppErrorBoundary';

const Portal = lazy(() => import('./apps/portal/index.jsx'));

const B = {
  red: '#E73835',
  dark: '#24242D',
  white: '#FFFFFF',
};

function Loading() {
  return <div style={{ padding: 40, fontFamily: 'Poppins, sans-serif', color: '#777' }}>Loading…</div>;
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

  if (loading) return <Loading />;

  // No session and no dev bypass -> show sign-in.
  if (!employee && !devBypass) {
    return <SignInGate onSignIn={signInWithEmail} />;
  }

  // signOut travels with the session so the Portal can offer it from its footer.
  const session = { employee, signOut };

  return (
    <AppErrorBoundary appName="Portal" routeKey="portal">
      <Suspense fallback={<Loading />}>
        <Portal session={session} supabase={supabase} />
      </Suspense>
    </AppErrorBoundary>
  );
}
