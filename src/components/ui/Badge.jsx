import { F } from "../../constants/tokens";

export default function Badge({ children, v = "default", dot = false }) {
  const vs = {
    default: { bg: "rgba(255,255,255,0.05)", c: "#7a7a7a", b: "#252525" },
    orange: { bg: "rgba(249,115,22,0.10)", c: "#f97316", b: "rgba(249,115,22,.3)" },
    green: { bg: "rgba(34,197,94,.08)", c: "#22c55e", b: "rgba(34,197,94,.25)" },
    red: { bg: "rgba(239,68,68,.08)", c: "#ef4444", b: "rgba(239,68,68,.25)" },
    blue: { bg: "rgba(96,165,250,.08)", c: "#60a5fa", b: "rgba(96,165,250,.25)" },
    yellow: { bg: "rgba(251,191,36,.08)", c: "#fbbf24", b: "rgba(251,191,36,.25)" },
  };
  const t = vs[v] || vs.default;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 20, background: t.bg, color: t.c, border: `1px solid ${t.b}`, ...F, letterSpacing: "0.02em" }}>
      {dot && <span style={{ width: 5, height: 5, borderRadius: "50%", background: t.c, flexShrink: 0 }} />}
      {children}
    </span>
  );
}
