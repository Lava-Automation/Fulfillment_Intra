import React from "react";
import { C, FONT } from "../lib/theme.js";
import { Search } from "lucide-react";

export function FilterTabs({ options, value, onChange }) {
  return (
    <div style={{ display: "inline-flex", gap: 4 }}>
      {options.map(([key, label]) => {
        const on = value === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            style={{
              border: "none",
              background: on ? C.ink : "transparent",
              color: on ? "#fff" : C.sub,
              fontSize: 12,
              fontFamily: FONT.body,
              fontWeight: on ? 600 : 500,
              padding: "7px 15px",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function ViewToggle({ options, value, onChange }) {
  return (
    <div style={{ display: "inline-flex", gap: 2, background: "#f0f0f0", borderRadius: 8, padding: 2 }}>
      {options.map(([key, label, Icon]) => {
        const on = value === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            style={{
              border: "none",
              background: on ? "#fff" : "transparent",
              color: on ? C.ink : C.sub,
              fontSize: 11,
              fontFamily: FONT.body,
              fontWeight: on ? 600 : 500,
              padding: "6px 11px",
              borderRadius: 6,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 5,
              boxShadow: on ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            }}
          >
            {Icon && <Icon size={13} />}
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, background: "#fff", border: `1px solid ${C.line}`, borderRadius: 9, padding: "7px 11px", minWidth: 220 }}>
      <Search size={14} color={C.sub} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Search…"}
        style={{ border: "none", outline: "none", fontSize: 12, fontFamily: FONT.body, flex: 1, color: C.ink, background: "transparent" }}
      />
    </div>
  );
}
