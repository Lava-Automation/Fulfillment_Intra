// resources/js/lib/useSession.js
// The single source of "who is the current user". Every app reads identity from
// here, never from its own invented user. This is the seam that changes when the
// real spine session arrives; the app-facing shape (employee, loading, signOut)
// stays the same, so apps do not change at cutover.
//
// Today: Supabase magic-link auth. The signed-in auth user is mapped to a
// spine.employees row. For the POC the mapping is by email
// (auth user email === spine.employees.email). On the spine, employee_id arrives
// in the session JWT and this lookup is replaced by reading that claim.
import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';

// POC: act as a fixed employee without real magic-link auth, so the hub loads
// straight in and RLS works (via anonymous sign-in). VITE_DEV_EMPLOYEE_ID
// overrides; if unset we fall back to a default employee so the VPS build does
// not need the env var. Restore `|| null` and re-enable the sign-in gate in
// mainapp.jsx when real auth is wired.
const DEV_EMPLOYEE_ID = import.meta.env.VITE_DEV_EMPLOYEE_ID || '0594b223-6f02-4f8e-9876-7f5af128c4de';

export function useSession() {
  const [employee, setEmployee] = useState(null); // { id, name, country, group, department, position, email }
  const [loading, setLoading] = useState(true);

  const resolveEmployee = useCallback(async () => {
    setLoading(true);

    // DEV path: act as a fixed employee.
    if (DEV_EMPLOYEE_ID) {
      // The RLS policies are scoped to the `authenticated` role. The anon key
      // alone is the `anon` role, so every policy denies it. An anonymous
      // sign-in gives a real session whose role IS `authenticated`, so the
      // policies apply. Identity (which employee) still comes from the
      // x-employee-id header -> app.current_employee_id (see supabase.js), not
      // from this anonymous user. DEV ONLY; the real path is magic-link below.
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        await supabase.auth.signInAnonymously();
        // onAuthStateChange re-runs resolveEmployee once the session lands.
        return;
      }
      const { data } = await supabase
        .from('employees') // public.employees view over spine.employees
        .select('id,name,country,"group",department,position,email')
        .eq('id', DEV_EMPLOYEE_ID)
        .maybeSingle();
      setEmployee(data || null);
      setLoading(false);
      return;
    }

    // Real path: Supabase auth user -> spine.employees by email.
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setEmployee(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('employees')
      .select('id,name,country,"group",department,position,email')
      .eq('email', user.email)
      .maybeSingle();
    setEmployee(data || null);
    setLoading(false);
  }, []);

  useEffect(() => {
    resolveEmployee();
    const { data: sub } = supabase.auth.onAuthStateChange(() => resolveEmployee());
    return () => sub.subscription.unsubscribe();
  }, [resolveEmployee]);

  const signInWithEmail = useCallback(async (email) => {
    return supabase.auth.signInWithOtp({ email });
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setEmployee(null);
  }, []);

  return { employee, loading, signInWithEmail, signOut };
}
