import React from "react";
import {
  LayoutDashboard, Code, Shield, Radio, Contact, BookMarked,
  BarChart3, Settings as SettingsIcon,
} from "lucide-react";
import { C, FONT } from "../lib/theme.js";

const NAV = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Training" },
  { key: "crm", label: "CRM Dev Training", icon: Code, group: "Training" },
  { key: "insurance", label: "Insurance Training", icon: Shield, group: "Training" },
  { key: "broad", label: "Broad Market Training", icon: Radio, group: "Training" },
  { key: "directory", label: "VA Directory", icon: Contact, group: "Manage" },
  { key: "catalog", label: "Course Catalog", icon: BookMarked, group: "Manage" },
  { key: "reports", label: "Reports", icon: BarChart3, group: "Manage" },
  { key: "settings", label: "Settings", icon: SettingsIcon, group: "Admin" },
];

export default function Sidebar({ nav, setNav, role, setRole }) {
  const groups = ["Training", "Manage", "Admin"];
  return (
    <div
      style={{
        width: 230,
        flexShrink: 0,
        background: C.ink,
        color: "#fff",
        height: "100vh",
        position: "sticky",
        top: 0,
        display: "flex",
        flexDirection: "column",
        fontFamily: FONT.body,
      }}
    >
      <div style={{ padding: "20px 20px 14px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 9, height: 26, background: C.red, borderRadius: 2 }} />
        <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: "-0.02em" }}>Lava Training</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "4px 12px" }}>
        {groups.map((g) => (
          <div key={g} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.8px", color: "rgba(255,255,255,0.35)", padding: "6px 10px" }}>
              {g}
            </div>
            {NAV.filter((n) => n.group === g).map((n) => {
              const Icon = n.icon;
              const on = nav === n.key;
              return (
                <button
                  key={n.key}
                  onClick={() => setNav(n.key)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    border: "none",
                    background: on ? "rgba(255,255,255,0.1)" : "transparent",
                    color: on ? "#fff" : "rgba(255,255,255,0.65)",
                    fontFamily: FONT.body,
                    fontSize: 12.5,
                    fontWeight: on ? 600 : 500,
                    padding: "9px 10px",
                    borderRadius: 8,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                  }}
                >
                  <Icon size={16} strokeWidth={2} />
                  {n.label}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginBottom: 5 }}>Viewing as</div>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          style={{
            width: "100%",
            background: "rgba(255,255,255,0.08)",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 7,
            padding: "7px 9px",
            fontSize: 11.5,
            fontFamily: FONT.body,
          }}
        >
          <option value="director">Director (Marky)</option>
          <option value="manager-combo">Manager — Training (Gui)</option>
          <option value="manager-ins">Manager — Insurance (Jonas)</option>
          <option value="manager-qaqc">Manager — QAQC (Kristel)</option>
          <option value="trainer-combo">Trainer — Combo</option>
          <option value="trainer-ins">Trainer — Insurance</option>
        </select>
      </div>
    </div>
  );
}
