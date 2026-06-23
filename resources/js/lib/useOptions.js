// resources/js/lib/useOptions.js
// The single source of dropdown values for the whole hub. Every app's select
// menus read from here instead of hardcoding arrays, so the choices stay
// consistent system-wide and the team can add/retire values as data (managed
// through /api/options). One GET /api/options is fetched once and cached in
// module scope, so opening five apps does not refetch the pool five times.
//
// Shape returned by the API:
//   { options: { plan: [{value,label}, ...], crm: [...], ams: [...], ... } }
// Categories: plan, fulfillment_status, account_status, cs_status, crm, ams,
// form_software.
import { useEffect, useState } from 'react';
import { api } from './api';

let CACHE = null;        // the resolved { category: [{value,label}] } map
let INFLIGHT = null;     // de-dupes concurrent first loads across apps

async function load() {
  if (CACHE) return CACHE;
  if (!INFLIGHT) {
    INFLIGHT = api
      .get('/api/options')
      .then((res) => {
        CACHE = res?.options || {};
        return CACHE;
      })
      .finally(() => {
        INFLIGHT = null;
      });
  }
  return INFLIGHT;
}

// Drop the cache so the next read refetches — call after an admin edits the pool.
export function invalidateOptions() {
  CACHE = null;
}

// useOptions() -> { options, loading, error }
//   options[category] is an array of { value, label } (empty array if unknown).
export function useOptions() {
  const [options, setOptions] = useState(CACHE || {});
  const [loading, setLoading] = useState(!CACHE);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (CACHE) return;
    let alive = true;
    load()
      .then((map) => {
        if (alive) setOptions(map);
      })
      .catch((e) => {
        if (alive) setError(e);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return { options, loading, error };
}

// Convenience: just the value strings for one category, for a plain <select>.
export function useOptionValues(category) {
  const { options } = useOptions();
  return (options[category] || []).map((o) => o.value);
}
