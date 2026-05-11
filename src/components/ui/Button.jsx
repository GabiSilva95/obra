import { useState } from "react";
import { C, F } from "../../constants/tokens";

export default function Btn({ children, onClick, v = "primary", type = "button", disabled = false, sx = {} }) {
  const [h, setH] = useState(false);
  const vs = {
    primary: { bg: h ? C.orangeHov : C.orange, c: "#0a0a0a", b: "none", fw: 700 },
    secondary: { bg: h ? "rgba(255,255,255,.07)" : "rgba(255,255,255,.04)", c: C.muted, b: `1px solid ${C.border}`, fw: 600 },
    danger: { bg: h ? "#dc2626" : "#991b1b", c: "#fff", b: "none", fw: 700 },
    outline: { bg: h ? C.orangeDim : "transparent", c: h ? C.orange : C.muted, b: `1px solid ${h ? C.orange : C.border}`, fw: 600 },
    ghost: { bg: h ? "rgba(255,255,255,.05)" : "transparent", c: C.muted, b: "none", fw: 500 },
  };
  const t = vs[v] || vs.primary;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{ background: t.bg, color: t.c, border: t.b, fontWeight: t.fw, padding: "8px 15px", borderRadius: 10, fontSize: 12, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .4 : 1, display: "inline-flex", alignItems: "center", gap: 6, transition: "all .15s", ...F, ...sx }}
    >
      {children}
    </button>
  );
}
