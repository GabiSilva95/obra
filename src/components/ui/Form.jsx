import { useState, useRef } from "react";
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

// ─── Campo monetário ─────────────────────────────────────────────────────────
//
// Formata enquanto se digita, no padrão brasileiro (1.234,56).
//
// Os dígitos preenchem da direita para a esquerda, como em aplicativo de banco:
// digitar 1 → 2 → 3 → 4 mostra 0,01 → 0,12 → 1,23 → 12,34. Assim os separadores
// aparecem sozinhos a cada tecla e o campo nunca fica num estado inválido.
// O cursor permanece no fim, então não há salto ao reformatar.

/** Formata número para exibição: 1234.5 → "1.234,50" */
export function formatarMoeda(n) {
  if (n === "" || n === null || n === undefined || isNaN(n)) return "";
  return Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Converte texto em número lendo apenas os dígitos, tratando os dois últimos
 * como centavos. Serve tanto para a digitação quanto para colagem:
 * "1.234,56", "1234.56" e "123456" resultam todos em 1234.56.
 */
export function parseMoeda(txt) {
  if (txt === "" || txt === null || txt === undefined) return "";
  const digitos = String(txt).replace(/\D/g, "");
  if (!digitos) return "";
  return parseInt(digitos, 10) / 100;
}

export function MoneyInp({ label, error, value, onChange, prefixo = "R$", ...p }) {
  const [f, setF] = useState(false);
  const ref = useRef(null);

  const exibido = formatarMoeda(value);

  // Mantém o cursor no fim após cada reformatação
  const cursorNoFim = () => {
    const el = ref.current;
    if (!el) return;
    requestAnimationFrame(() => {
      const fim = el.value.length;
      try { el.setSelectionRange(fim, fim); } catch { /* input sem suporte */ }
    });
  };

  return (
    <Fld label={label} error={error}>
      <div style={{ position: "relative" }}>
        <span style={{
          position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)",
          fontSize: 12, color: error ? C.red : f ? C.orange : C.dim, pointerEvents: "none", ...F,
        }}>{prefixo}</span>
        <input
          {...p}
          ref={ref}
          type="text"
          inputMode="numeric"
          value={exibido}
          placeholder="0,00"
          style={{
            ...INP_BASE,
            paddingLeft: 13 + prefixo.length * 8 + 6,
            textAlign: "right",
            fontVariantNumeric: "tabular-nums",
            borderColor: error ? C.red : f ? C.orange : C.border,
          }}
          onFocus={() => { setF(true); cursorNoFim(); }}
          onBlur={() => setF(false)}
          onClick={cursorNoFim}
          onChange={e => {
            onChange?.({ target: { value: parseMoeda(e.target.value) } });
            cursorNoFim();
          }}
        />
      </div>
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
