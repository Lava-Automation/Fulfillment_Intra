// Single source of truth for permissions. Two layers:
//  1. Role capabilities (what a role can do at all)
//  2. Course-side rule (CRM vs Insurance courses are side-bound; shared = all)
//
// In this prototype the role comes from the sidebar switcher. Real enforcement
// (login-based, server-side) lands in the database phase. QAQC is view-only here;
// their status/notes/files/incidents sync in read-only from their own app.

export const ROLES = [
  "director",
  "manager-combo", // Manager — Training (CRM Dev side)
  "manager-ins", // Manager — Insurance
  "trainer-combo",
  "trainer-ins",
  "manager-qaqc", // QAQC — view-only here
];

// which "side" each role belongs to (director spans both; qaqc none)
const SIDE = {
  director: "both",
  "manager-combo": "crm",
  "trainer-combo": "crm",
  "manager-ins": "ins",
  "trainer-ins": "ins",
  "manager-qaqc": "none",
};

// Capability table. Each capability lists the roles allowed.
const CAP = {
  // VA actions
  markDevDone: ["director", "manager-combo"],
  markInsDone: ["director", "manager-ins"],
  editCrmHealth: ["director", "manager-combo", "trainer-combo"],
  editInsHealth: ["director", "manager-ins", "trainer-ins"],
  editScope: ["director", "manager-combo", "manager-ins", "trainer-combo", "trainer-ins"],
  grantSkill: ["director", "manager-combo", "manager-ins", "trainer-combo", "trainer-ins"],
  endorse: ["director", "manager-combo", "manager-ins"],
  fileIncident: ["director", "manager-combo", "manager-ins"],
  bulkEnroll: ["director", "manager-combo", "manager-ins", "trainer-combo", "trainer-ins"],
  // course authoring (gated further by course side via canCourse)
  authorCourses: ["director", "manager-combo", "manager-ins", "trainer-combo", "trainer-ins"],
  enroll: ["director", "manager-combo", "manager-ins", "trainer-combo", "trainer-ins"],
  // nobody, for now
  deleteVA: [],
  deleteCourse: [],
};

// basic capability check
export function can(role, capability) {
  const list = CAP[capability];
  return Array.isArray(list) && list.includes(role);
}

// course-side map: which side a category belongs to. unknown/custom = shared.
const CATEGORY_SIDE = {
  crm: "crm",
  insurance: "ins",
  general: "shared",
  oneoff: "shared",
};
export function courseSide(category) {
  return CATEGORY_SIDE[category] || "shared"; // custom types default shared
}

// Can this role author/edit/toggle a course of the given category?
// Director: any. Shared categories: anyone with authoring rights. Otherwise
// the role's side must match the course's side.
export function canCourse(role, category, capability = "authorCourses") {
  if (!can(role, capability)) return false;
  if (role === "director") return true;
  const cside = courseSide(category);
  if (cside === "shared") return true;
  return SIDE[role] === cside;
}

// Lesson toggling respects side: crm lessons need crm-side, ins need ins-side.
export function canToggleLesson(role, category) {
  return canCourse(role, category, "enroll");
}

export function roleSide(role) {
  return SIDE[role] || "none";
}
