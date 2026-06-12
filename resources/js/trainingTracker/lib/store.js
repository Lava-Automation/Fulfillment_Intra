// Tiny pub/sub so views re-render when shared mutable data (CATALOG, trainees,
// events) changes. React doesn't watch plain object mutation, so editors call
// bumpData() and any component using useDataVersion() re-renders.
import { useState, useEffect } from "react";

let version = 0;
const listeners = new Set();

export function bumpData() {
  version++;
  listeners.forEach((fn) => fn(version));
}

export function useDataVersion() {
  const [v, setV] = useState(version);
  useEffect(() => {
    listeners.add(setV);
    return () => listeners.delete(setV);
  }, []);
  return v;
}
