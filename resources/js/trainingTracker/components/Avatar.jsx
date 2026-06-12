import React from "react";
import { COLORS } from "../data/org.js";
import { ini } from "../lib/status.js";

export function Avatar({ name, i = 0, size = 26 }) {
  return (
    <div
      style={{
        background: COLORS[i % COLORS.length],
        width: size,
        height: size,
        borderRadius: "50%",
        color: "#fff",
        fontSize: size * 0.34,
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {ini(name)}
    </div>
  );
}
