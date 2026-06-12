import React, { useState } from "react";
import { Plus, Trash2, Zap, X } from "lucide-react";
import { C, FONT } from "../lib/theme.js";
import { CATALOG, CAT_META, CAT_ORDER } from "../data/catalog.js";
import { AUTO_ENROLL, AE_EVENTS } from "../data/autoEnroll.js";

function aeEventLabel(ev) {
  const m = AE_EVENTS.find((e) => e[0] === ev);
  return m ? m[1] : ev;
}

import { can } from "../lib/permissions.js";

export default function Settings({ role }) {
  const canEdit = can(role, "authorCourses");
  const [, force] = useState(0);
  const bump = () => force((n) => n + 1);
  const [pick, setPick] = useState(null); // {onPick}
  const [newRule, setNewRule] = useState(false);

  const types = [["combo", "Combo VAs"], ["gen", "Gen VAs"], ["broad", "Broad Market VAs"]];
  const defs = AUTO_ENROLL.defaults || {};
  const rules = AUTO_ENROLL.rules || [];

  return (
    <div>
      {!canEdit && (
        <div style={{ fontSize: 11.5, color: "#a8650f", background: "#fdf3e6", borderRadius: 8, padding: "9px 13px", marginBottom: 16 }}>
          View access. Auto-enrollment config is limited to directors and managers.
        </div>
      )}

      <Section title="Default courses by VA type" note="Auto-assigned when a VA of this type is created. Run on demand here, or via “Apply default courses” in the Directory.">
        {types.map(([key, label]) => (
          <Row
            key={key}
            title={label}
            courses={defs[key] || []}
            canEdit={canEdit}
            onAdd={canEdit ? () => setPick({ onPick: (k) => { if (!defs[key]) defs[key] = []; if (!defs[key].includes(k)) defs[key].push(k); setPick(null); bump(); } }) : null}
            onRemove={(k) => { defs[key] = (defs[key] || []).filter((x) => x !== k); bump(); }}
          />
        ))}
      </Section>

      <Section
        title="Event rules"
        note="When a lifecycle event fires, enroll the VA in these courses. Wiring to live events comes with deployment."
        action={canEdit ? <button onClick={() => setNewRule(true)} style={newBtn}><Plus size={13} /> Add rule</button> : null}
      >
        {rules.length ? (
          rules.map((r) => (
            <Row
              key={r.id}
              title={<span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#a8650f", fontSize: 11.5 }}><Zap size={12} /> {aeEventLabel(r.event)}</span>}
              courses={r.courses}
              canEdit={canEdit}
              onAdd={canEdit ? () => setPick({ onPick: (k) => { if (!r.courses.includes(k)) r.courses.push(k); setPick(null); bump(); } }) : null}
              onRemove={(k) => { r.courses = r.courses.filter((x) => x !== k); bump(); }}
              onDeleteRow={canEdit ? () => { AUTO_ENROLL.rules = rules.filter((x) => x.id !== r.id); bump(); } : null}
            />
          ))
        ) : (
          <div style={{ fontSize: 11, color: "#ccc", padding: "4px 0" }}>No event rules yet.</div>
        )}
      </Section>

      <div style={{ fontSize: 10.5, color: "#bbb", lineHeight: 1.5, maxWidth: 580 }}>
        Note: in this mockup these rules are config only. They don't fire automatically yet, that wiring happens at deployment. Use “Apply default courses” in the Directory to run type defaults now.
      </div>

      {pick && <CoursePick onClose={() => setPick(null)} onPick={pick.onPick} />}
      {newRule && (
        <NewRule
          onClose={() => setNewRule(false)}
          onCreate={(ev) => {
            const id = "r" + (Date.now() % 100000);
            AUTO_ENROLL.rules.push({ id, event: ev, courses: [] });
            setNewRule(false);
            bump();
          }}
        />
      )}
    </div>
  );
}

function Section({ title, note, action, children }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12, padding: "18px 20px", marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, gap: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{title}</div>
          {note && <div style={{ fontSize: 11, color: C.sub, marginTop: 3, maxWidth: 520, lineHeight: 1.4 }}>{note}</div>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function Row({ title, courses, canEdit, onAdd, onRemove, onDeleteRow }) {
  return (
    <div style={{ border: `1px solid ${C.line}`, borderRadius: 10, padding: "12px 14px", marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: C.ink }}>{title}</div>
        <div style={{ display: "flex", gap: 6 }}>
          {onAdd && <button onClick={onAdd} style={addBtn}><Plus size={12} /> Add course</button>}
          {onDeleteRow && <button onClick={onDeleteRow} style={{ ...addBtn, color: "#a32d2d" }}><Trash2 size={12} /></button>}
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {courses.length ? (
          courses.map((k) => {
            const c = CATALOG[k];
            const cm = c ? CAT_META[c.category] || {} : {};
            return (
              <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: cm.chipBg || "#eef0f2", color: cm.chipFg || "#555", fontSize: 10.5, padding: "4px 9px", borderRadius: 20 }}>
                {c ? c.name : k}
                {canEdit && onRemove && <button onClick={() => onRemove(k)} style={{ border: "none", background: "transparent", color: "inherit", cursor: "pointer", padding: 0, display: "flex", opacity: 0.6 }}><X size={11} /></button>}
              </span>
            );
          })
        ) : (
          <span style={{ fontSize: 11, color: "#ccc" }}>No default courses</span>
        )}
      </div>
    </div>
  );
}

function CoursePick({ onClose, onPick }) {
  const cats = CAT_ORDER.filter((key) => Object.keys(CATALOG).some((k) => CATALOG[k].category === key && CATALOG[k].status !== "draft"));
  const first = Object.keys(CATALOG)[0];
  const [course, setCourse] = useState(first);
  return (
    <Modal onClose={onClose} title="Add course">
      <select value={course} onChange={(e) => setCourse(e.target.value)} style={selectStyle}>
        {cats.map((key) => (
          <optgroup key={key} label={(CAT_META[key] || {}).label || key}>
            {Object.keys(CATALOG).filter((k) => CATALOG[k].category === key && CATALOG[k].status !== "draft").map((k) => (
              <option key={k} value={k}>{CATALOG[k].name}</option>
            ))}
          </optgroup>
        ))}
      </select>
      <ModalActions onClose={onClose} onOk={() => onPick(course)} okLabel="Add" />
    </Modal>
  );
}

function NewRule({ onClose, onCreate }) {
  const [ev, setEv] = useState(AE_EVENTS[0][0]);
  return (
    <Modal onClose={onClose} title="Add event rule">
      <div style={{ fontSize: 11, color: C.sub, marginBottom: 8 }}>Pick the lifecycle event that triggers enrollment.</div>
      <select value={ev} onChange={(e) => setEv(e.target.value)} style={selectStyle}>
        {AE_EVENTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>
      <ModalActions onClose={onClose} onOk={() => onCreate(ev)} okLabel="Create rule" />
    </Modal>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 70 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, padding: "24px 26px", width: 380, maxWidth: "92vw", fontFamily: FONT.body }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.ink, marginBottom: 12 }}>{title}</div>
        {children}
      </div>
    </div>
  );
}
function ModalActions({ onClose, onOk, okLabel }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
      <button onClick={onClose} style={{ border: `1px solid ${C.line}`, background: "#fff", color: C.sub, fontSize: 12, padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontFamily: FONT.body }}>Cancel</button>
      <button onClick={onOk} style={{ border: "none", background: C.teal, color: "#fff", fontSize: 12, fontWeight: 600, padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontFamily: FONT.body }}>{okLabel}</button>
    </div>
  );
}

const newBtn = { display: "flex", alignItems: "center", gap: 5, border: `1px solid ${C.line}`, background: "#fff", color: C.ink, fontSize: 11.5, fontWeight: 500, padding: "6px 11px", borderRadius: 7, cursor: "pointer", fontFamily: FONT.body };
const addBtn = { display: "flex", alignItems: "center", gap: 4, border: "none", background: "#f2f2f2", color: C.sub, fontSize: 10.5, padding: "5px 9px", borderRadius: 6, cursor: "pointer", fontFamily: FONT.body };
const selectStyle = { width: "100%", padding: "9px 10px", borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 12.5, fontFamily: FONT.body };
