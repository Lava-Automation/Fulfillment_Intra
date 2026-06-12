// Shared design tokens. Lava palette + fonts.
// Inline-style convention: import C and FONT where needed.
export const C = {
  red: "#e73835",
  ink: "#24242d",
  teal: "#145365",
  white: "#ffffff",
  black: "#1b120b",
  // working tints derived from palette
  paper: "#f7f8f8",
  line: "rgba(36,36,45,0.08)",
  sub: "#8a8f93",
  tealSoft: "#e6eef1",
  purple: "#5b3b9c", // broad market accent (used sparingly)
};

export const FONT = {
  body: "'Poppins', system-ui, sans-serif",
  head: "'Monument Extended', 'Poppins', system-ui, sans-serif",
};

// type badge colors
export const TYPE_BADGE = {
  combo: { bg: "#fce8e8", fg: "#a32d2d", label: "Combo" },
  gen: { bg: "#e1f0f5", fg: "#0c447c", label: "Gen" },
  broad: { bg: "#efe7fa", fg: "#5b3b9c", label: "Broad" },
  endorsed: { bg: "#fef0e8", fg: "#a8650f", label: "Endorsed" },
};
