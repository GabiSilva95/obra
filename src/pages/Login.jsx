import { useState } from "react";
import { C, F, FONT_URL } from "../constants/tokens";
import Icon from "../components/ui/Icon";

export default function Login({ onLogin, onRegistro }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [focusField, setFocusField] = useState(null);
  const [loading, setLoading] = useState(false);

  const go = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });
      let data;
      try { data = await res.json(); } catch { data = {}; }
      if (!res.ok) {
        if (res.status === 429) { setErr("Muitas tentativas. Aguarde alguns minutos."); }
        else if (res.status >= 500 || res.status === 502 || res.status === 503) { setErr("Servidor indisponível. Tente novamente em instantes."); }
        else { setErr(data.error || "Credenciais inválidas."); }
        setLoading(false);
        return;
      }
      onLogin(data.token, data.user, data.tenant, data.refreshToken);
    } catch {
      setErr("Não foi possível conectar ao servidor. Tente novamente.");
      setLoading(false);
    }
  };

  const onKey = e => { if (e.key === "Enter") go(); };

  return (
    <>
      <link href={FONT_URL} rel="stylesheet" />
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#060810}
        ::placeholder{color:#3a3a3a}
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-thumb{background:#252525;border-radius:8px}
        @keyframes lgn-in{from{opacity:0;transform:translateY(18px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes lgn-spin{to{transform:rotate(360deg)}}
      `}</style>
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#060810", position: "relative", overflow: "hidden", ...F }}>
        <div style={{ position: "absolute", top: "-20%", left: "50%", transform: "translateX(-50%)", width: 700, height: 500, background: "radial-gradient(ellipse, rgba(249,115,22,.055) 0%, transparent 65%)", pointerEvents: "none" }} />
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: .04, pointerEvents: "none" }} preserveAspectRatio="xMidYMid slice">
          <defs><pattern id="lgrid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M 48 0 L 0 0 0 48" fill="none" stroke="#f97316" strokeWidth="0.5" /></pattern></defs>
          <rect width="100%" height="100%" fill="url(#lgrid)" />
        </svg>
        <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 400, animation: "lgn-in .55s cubic-bezier(.34,1.2,.64,1) both" }}>
          <div style={{ position: "absolute", inset: -1, borderRadius: 22, background: "linear-gradient(160deg, rgba(249,115,22,.18) 0%, rgba(249,115,22,.04) 40%, transparent 70%)", pointerEvents: "none" }} />
          <div style={{ position: "relative", background: "rgba(14,14,18,.82)", backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 22, padding: "44px 40px 36px", boxShadow: "0 32px 80px rgba(0,0,0,.7)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32, justifyContent: "center" }}>
              <div style={{ width: 36, height: 36, borderRadius: 11, background: "linear-gradient(135deg,#f97316,#ea6c0a)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(249,115,22,.45)" }}>
                <Icon n="building" size={18} color="#0a0a0a" />
              </div>
              <span style={{ fontWeight: 800, fontSize: 22, color: "#f97316", letterSpacing: "-0.055em" }}>obrasgest</span>
            </div>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "#f0f0f0", letterSpacing: "-0.045em", lineHeight: 1.2, marginBottom: 8, ...F }}>Bem-vindo de volta</h1>
              <p style={{ fontSize: 13, color: "#555", lineHeight: 1.6 }}>Acesse sua conta para continuar gerenciando suas obras</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: err ? 8 : 16 }}>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", opacity: focusField === "email" || email?.length ? 0.9 : 0.4 }}>
                  <Icon n="eye" size={15} color={focusField === "email" ? "#f97316" : "#555"} />
                </div>
                <input type="email" value={email} onChange={e => { setEmail(e.target.value); setErr(""); }} onFocus={() => setFocusField("email")} onBlur={() => setFocusField(null)} onKeyDown={onKey} placeholder="E-mail" style={{ width: "100%", background: focusField === "email" ? "rgba(249,115,22,.05)" : "rgba(255,255,255,.04)", border: `1px solid ${focusField === "email" ? "rgba(249,115,22,.45)" : "rgba(255,255,255,.08)"}`, borderRadius: 12, padding: "13px 14px 13px 40px", fontSize: 13, color: "#f0f0f0", outline: "none", ...F, transition: "all .2s" }} />
              </div>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", opacity: focusField === "senha" || senha?.length ? 0.9 : 0.4 }}>
                  <Icon n="key" size={15} color={focusField === "senha" ? "#f97316" : "#555"} />
                </div>
                <input type={show ? "text" : "password"} value={senha} onChange={e => { setSenha(e.target.value); setErr(""); }} onFocus={() => setFocusField("senha")} onBlur={() => setFocusField(null)} onKeyDown={onKey} placeholder="Senha" style={{ width: "100%", background: focusField === "senha" ? "rgba(249,115,22,.05)" : "rgba(255,255,255,.04)", border: `1px solid ${focusField === "senha" ? "rgba(249,115,22,.45)" : "rgba(255,255,255,.08)"}`, borderRadius: 12, padding: "13px 40px", fontSize: 13, color: "#f0f0f0", outline: "none", ...F, transition: "all .2s" }} />
                <button onClick={() => setShow(s => !s)} style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", display: "flex", padding: 4, borderRadius: 6 }}>
                  <Icon n={show ? "eyeoff" : "eye"} size={15} color={focusField === "senha" ? "#7a7a7a" : "#3a3a3a"} />
                </button>
              </div>
            </div>
            {err && (
              <div style={{ fontSize: 11, color: "#ef4444", background: "rgba(239,68,68,.07)", border: "1px solid rgba(239,68,68,.15)", borderRadius: 9, padding: "8px 13px", marginBottom: 14, display: "flex", alignItems: "center", gap: 7 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                {err}
              </div>
            )}
            <button onClick={go} disabled={loading} style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: loading ? "rgba(249,115,22,.4)" : "linear-gradient(90deg,#f97316,#ea6c0a)", color: "#0a0a0a", fontWeight: 800, fontSize: 14, cursor: loading ? "default" : "pointer", transition: "all .2s", ...F, letterSpacing: "-0.02em", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: loading ? "none" : "0 6px 28px rgba(249,115,22,.35)" }}>
              {loading ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="2.5" style={{ animation: "lgn-spin 0.8s linear infinite" }}><path d="M12 2a10 10 0 0 1 10 10" /></svg> : "Entrar"}
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "22px 0 18px" }}>
              <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,.06)" }} />
              <span style={{ fontSize: 10, color: "#333", letterSpacing: "0.08em", textTransform: "uppercase" }}>ou</span>
              <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,.06)" }} />
            </div>
            <button onClick={() => { setEmail("admin@teste.com"); setSenha("admin123"); }} style={{ width: "100%", padding: "11px", borderRadius: 12, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", color: "#7a7a7a", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all .2s", ...F, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }} onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,.07)"; e.currentTarget.style.color = "#f0f0f0"; }} onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,.04)"; e.currentTarget.style.color = "#7a7a7a"; }}>
              <Icon n="eye" size={13} color="currentColor" />
              Usar credenciais de demonstração
            </button>
            <p style={{ textAlign: "center", fontSize: 11, color: "#333", marginTop: 22 }}>
              Ainda não tem conta?{" "}
              <button onClick={onRegistro} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#f97316", fontWeight: 700, ...F, padding: 0 }}>Ver planos →</button>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
