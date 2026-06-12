// Date helpers. The mock data uses "Mon DD" strings, treated as 2026.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_IDX = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };

export { MONTHS };

// rough ordinal rank for "Mon DD" (month*31 + day)
export function startRank(s) {
  if (!s) return 0;
  const p = s.split(" ");
  return (MONTH_IDX[p[0]] || 0) * 31 + parseInt(p[1] || 0, 10);
}
export const dateRank = startRank;

export function monthIdx(s) {
  return Math.floor(startRank(s || "Jan 1") / 31);
}

export function parseStart(s) {
  if (!s) return null;
  const d = new Date(s + ", 2026");
  return isNaN(d) ? null : d;
}

export function fmtDate(d) {
  if (!d) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function shiftDate(start, days) {
  const d = parseStart(start);
  if (!d) return start;
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// start + 10 weeks
export function wfhDate(start) {
  const d = parseStart(start);
  if (!d) return null;
  const x = new Date(d);
  x.setDate(x.getDate() + 70);
  return x;
}

// start + 3 months
export function regDate(start) {
  const d = parseStart(start);
  if (!d) return null;
  const x = new Date(d);
  x.setMonth(x.getMonth() + 3);
  return x;
}

export function todayShort() {
  // anchored to the mockup's "today" (June 2026) for stable mock output
  return "Jun 11";
}
