import React from "react";
import { TYPE_BADGE } from "../lib/theme.js";

export function TypeBadge({ type }) {
  const b = TYPE_BADGE[type];
  if (!b) return null;
  return (
    <span
      style={{
        background: b.bg,
        color: b.fg,
        fontSize: 9,
        fontWeight: 600,
        padding: "2px 7px",
        borderRadius: 20,
        marginLeft: 6,
      }}
    >
      {b.label}
    </span>
  );
}

export function Pill({ children, bg, fg }) {
  return (
    <span style={{ background: bg, color: fg, fontSize: 10, padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}
