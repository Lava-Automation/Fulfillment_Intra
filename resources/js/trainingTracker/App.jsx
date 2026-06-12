import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar.jsx";
import Placeholder from "./views/Placeholder.jsx";
import Dashboard from "./views/Dashboard.jsx";
import CRM from "./views/CRM.jsx";
import Insurance from "./views/Insurance.jsx";
import Broad from "./views/Broad.jsx";
import VAPanel from "./components/VAPanel.jsx";
import Directory from "./views/Directory.jsx";
import Reports from "./views/Reports.jsx";
import Settings from "./views/Settings.jsx";
import Catalog from "./views/Catalog.jsx";
import { useDataVersion } from "./lib/store.js";
import { C, FONT } from "./lib/theme.js";
import { TRAINEES, BROAD_TRAINEES } from "./data/trainees.js";
import { CATALOG } from "./data/catalog.js";
import { isDeployed, vaStatus } from "./lib/status.js";
import { allCerts } from "./lib/certs.js";
import { seedLogs, allMilestones } from "./lib/events.js";
import { seedEndorsements } from "./lib/certs.js";
import { seedAssociations } from "./lib/associations.js";

const PAGE_META = {
  dashboard: ["Dashboard", "All VAs onsite · Weeks 1–5 · June 2026"],
  crm: ["CRM Dev Training", "Combo build track and endorsed VAs"],
  insurance: ["Insurance Training", "Gen and handed-off combo VAs"],
  broad: ["Broad Market Training", "Build-as-you-go, market-wide"],
  directory: ["VA Directory", "Everyone across the program"],
  catalog: ["Course Catalog", "Define and maintain courses"],
  reports: ["Training Reports", "Year to date · 2026"],
  settings: ["Settings", "Auto-enrollment and configuration"],
};

export default function App() {
  const [nav, setNav] = useState("dashboard");
  const [role, setRole] = useState("director");
  const [openVA, setOpenVA] = useState(null);
  useDataVersion(); // re-render views when catalog/data mutates

  // seed the in-memory logs once
  useEffect(() => {
    seedAssociations();
    seedLogs();
    seedEndorsements();
  }, []);

  const [title, sub] = PAGE_META[nav] || ["", ""];

  // quick sanity stats so the foundation is visibly working
  const inTraining = TRAINEES.filter((t) => !isDeployed(t) && vaStatus(t) !== "fired").length;
  const deployed = TRAINEES.filter((t) => isDeployed(t)).length;
  const certs = allCerts().filter((c) => c.status === "active").length;
  const milestones = allMilestones().length;

  const statsFor = () => {
    if (nav === "dashboard")
      return [
        { label: "In training", value: inTraining },
        { label: "Deployed", value: deployed },
        { label: "Broad VAs", value: BROAD_TRAINEES.length },
        { label: "Milestones logged", value: milestones },
      ];
    if (nav === "catalog")
      return [
        { label: "Courses", value: Object.keys(CATALOG).length },
        { label: "Cert courses", value: Object.values(CATALOG).filter((c) => c.cert).length },
      ];
    if (nav === "directory") return [{ label: "Total VAs", value: TRAINEES.length }];
    if (nav === "reports") return [{ label: "Certificates", value: certs }, { label: "Milestones", value: milestones }];
    return null;
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.paper, fontFamily: FONT.body, color: C.ink }}>
      <Sidebar nav={nav} setNav={setNav} role={role} setRole={setRole} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ padding: "26px 32px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 7, height: 26, background: C.red, borderRadius: 2 }} />
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", fontFamily: FONT.head }}>
              {title}
            </h1>
          </div>
          <p style={{ margin: "6px 0 0 17px", fontSize: 12.5, color: C.sub }}>{sub}</p>
        </div>
        <div style={{ padding: "22px 32px 48px" }}>
          {nav === "dashboard" ? (
            <Dashboard onOpenVA={(name, source) => setOpenVA({ name, source })} />
          ) : nav === "crm" ? (
            <CRM role={role} onOpenVA={(name, source) => setOpenVA({ name, source })} />
          ) : nav === "insurance" ? (
            <Insurance role={role} onOpenVA={(name, source) => setOpenVA({ name, source })} />
          ) : nav === "broad" ? (
            <Broad onOpenVA={(name, source) => setOpenVA({ name, source })} />
          ) : nav === "directory" ? (
            <Directory role={role} onOpenVA={(name, source) => setOpenVA({ name, source })} />
          ) : nav === "reports" ? (
            <Reports />
          ) : nav === "settings" ? (
            <Settings role={role} />
          ) : nav === "catalog" ? (
            <Catalog role={role} onOpenVA={(name, source) => setOpenVA({ name, source })} />
          ) : (
            <Placeholder title={title} stats={statsFor()} />
          )}
        </div>
      </div>
      {openVA && <VAPanel open={openVA} role={role} onClose={() => setOpenVA(null)} />}
    </div>
  );
}
