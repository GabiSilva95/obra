import { C, F } from "../../constants/tokens";

export function Hdr({ title, sub, action }) {
  return (
    <>
      <style>{`@media(max-width:520px){.hdr-root{flex-direction:column!important;align-items:stretch!important}.hdr-action{justify-content:flex-start!important}}`}</style>
      <div className="hdr-root" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22, gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: 0, letterSpacing: "-0.03em", ...F }}>{title}</h1>
          {sub && <p style={{ fontSize: 11, color: C.muted, marginTop: 4, ...F }}>{sub}</p>}
        </div>
        {action && <div className="hdr-action" style={{ display: "flex", flexShrink: 0 }}>{action}</div>}
      </div>
    </>
  );
}

export function DSel({ value, onChange, children }) {
  return (
    <select
      value={value}
      onChange={onChange}
      style={{ background: "rgba(255,255,255,0.04)", border: `1px solid #252525`, borderRadius: 9, padding: "7px 12px", fontSize: 12, color: "#f0f0f0", outline: "none", width: "auto", minWidth: 175, boxSizing: "border-box", ...F, transition: "border-color .15s", cursor: "pointer" }}
    >
      {children}
    </select>
  );
}
