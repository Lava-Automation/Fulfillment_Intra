// resources/js/lib/supabase.js
// The single place that knows the Supabase project. Everything talks to the DB
// through this client. At cutover to the company spine, only the two values in
// the .env change; no other file is touched.
//
// Anon key only. RLS does the enforcement. NEVER import or reference the service
// role key in browser code.
//
// .env (Vite exposes only VITE_-prefixed vars to the browser):
//   VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
//   VITE_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// DEV ONLY. When VITE_DEV_EMPLOYEE_ID is set, send it as an x-employee-id header
// so the db-pre-request hook (public.dev_apply_employee) can populate
// app.current_employee_id and RLS resolves locally without real auth. This is an
// INSECURE override for local preview only — anyone could claim any employee.
// Production identity is the JWT access-token hook; leave VITE_DEV_EMPLOYEE_ID
// unset there and this header is never sent.
const devEmployeeId = import.meta.env.VITE_DEV_EMPLOYEE_ID;

if (!url || !anonKey) {
  // Fail loud in dev rather than silently making unauthenticated calls.
  console.error(
    '[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
    'Add them to .env and restart the Vite dev server.'
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // magic-link callback
  },
  ...(devEmployeeId ? { global: { headers: { 'x-employee-id': devEmployeeId } } } : {}),
});
