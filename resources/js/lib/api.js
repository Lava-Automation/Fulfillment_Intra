// resources/js/lib/api.js
// The single client→Laravel data helper. Every app talks to the backend through
// this instead of building Supabase queries inline, so the app files stay
// "mostly frontend": fetch a JSON endpoint, render it; POST/PATCH/DELETE to
// mutate. Session cookie auth (same-origin) + CSRF header are handled here once.
const csrf = () => document.querySelector('meta[name="csrf-token"]')?.content || '';

async function request(method, url, body) {
  const opts = {
    method,
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  if (method !== 'GET') opts.headers['X-CSRF-TOKEN'] = csrf();

  const res = await fetch(url, opts);

  // Session expired / CSRF mismatch → back to the login gate.
  if (res.status === 401 || res.status === 419) {
    window.location.href = '/login';
    throw new Error('Your session expired. Redirecting to sign in…');
  }
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      message = data.message || message;
    } catch { /* non-JSON error body */ }
    throw new Error(message);
  }
  if (res.status === 204) return null;
  const type = res.headers.get('content-type') || '';
  return type.includes('application/json') ? res.json() : null;
}

export const api = {
  get: (url) => request('GET', url),
  post: (url, body) => request('POST', url, body),
  patch: (url, body) => request('PATCH', url, body),
  del: (url) => request('DELETE', url),
};
