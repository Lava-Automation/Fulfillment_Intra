// resources/js/lib/useSession.js
// The single source of "who is the current user" for the SPA shell.
//
// Identity is resolved entirely on the SERVER: the Laravel login gate
// authenticates the user, CurrentEmployee maps them to their employees row, and
// welcome.blade.php injects the full identity as window.__AUTH__. There is no
// Supabase here anymore — every app reads/writes through the Laravel /api
// endpoints (lib/api.js), so the browser never talks to Supabase directly.
import { useCallback } from 'react';

// Full employee identity from the server: { id, name, email, country, group,
// department, position } — or null if unauthenticated.
const AUTH = (typeof window !== 'undefined' && window.__AUTH__) || null;

export function useSession() {
  // Identity is known synchronously from the server render — no async load.
  const employee = AUTH;
  const loading = false;

  // Logout ends the Laravel session that gates the app and redirects at once.
  const signOut = useCallback(async () => {
    const token = document.querySelector('meta[name="csrf-token"]')?.content;
    try {
      await fetch('/logout', {
        method: 'POST',
        headers: { 'X-CSRF-TOKEN': token || '', 'Accept': 'application/json' },
      });
    } catch (e) {
      // Even if the POST fails, send the user to the gate.
      console.error('[logout] request failed:', e);
    }
    window.location.href = '/login';
  }, []);

  return { employee, loading, signOut };
}
