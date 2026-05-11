import { useState } from "react";
import { C, F } from "../../constants/tokens";

const INP_BASE = { background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 13px", fontSize: 13, color: C.text, outline: "none", width: "100%", boxSizing: "border-box", ...F, transition: "border-color .15s" };

export function Fld({ label, children, error }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {label && <label style={{ fontSize: 10, fontWeight: 700, color: error ? C.red : C.dim, textTransform: "uppercase", letterSpacing: "0.09em", ...F }}>{label}</label>}
      {children}
      {error && <span style={{ fontSize: 11, color: C.red, ...F }}>{error}</span>}
    </div>
  );
}

export function Inp({ label, error, ...p }) {
  const [f, setF] = useState(false);
  return (
    <Fld label={label} error={error}>
      <input style={{ ...INP_BASE, borderColor: error ? C.red : f ? C.orange : C.border }} onFocus={() => setF(true)} onBlur={() => setF(false)} {...p} />
    </Fld>
  );
}

export function Sel({ label, error, children, ...p }) {
  const [f, setF] = useState(false);
  return (
    <Fld label={label} error={error}>
      <select style={{ ...INP_BASE, borderColor: error ? C.red : f ? C.orange : C.border, cursor: "pointer" }} onFocus={() => setF(true)} onBlur={() => setF(false)} {...p}>
        {children}
      </select>
    </Fld>
  );
}

export function Txta({ label, error, ...p }) {
  const [f, setF] = useState(false);
  return (
    <Fld label={label} error={error}>
      <textarea style={{ ...INP_BASE, borderColor: error ? C.red : f ? C.orange : C.border, resize: "none" }} onFocus={() => setF(true)} onBlur={() => setF(false)} {...p} />
    </Fld>
  );
}
