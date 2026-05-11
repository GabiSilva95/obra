import { useState } from "react";
import { useLocation } from "react-router-dom";
import { C, F, FONT_URL } from "../constants/tokens";
import { PLANOS } from "../constants/data";
import { today } from "../utils/helpers";
import Icon from "../components/ui/Icon";
import Btn from "../components/ui/Button";
import { Inp } from "../components/ui/Form";

export default function Registro({ onVoltar, onVerPlanos }) {
  const planoInicial = useLocation().state?.planoId || null;
  const [step, setStep] = useState(planoInicial ? 2 : 1);
  const [plano, setPlano] = useState(planoInicial || null);
  const [form, setForm] = useState({ razaoSocial: "", cnpj: "", email: "", nome: "", senha: "", confirma: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);

  const avancar = () => { if (!plano) { setErr("Selecione um plano."); return; } setErr(""); setStep(2); };

  const registrar = async () => {
    if (!form.razaoSocial || !form.cnpj || !form.email || !form.nome || !form.senha) { setErr("Preencha todos os campos."); return; }
    if (form.senha !== form.confirma) { setErr("Senhas não conferem."); return; }
    setLoading(true); setErr("");
    try {
      const res = await fetch("/api/auth/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, plano }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || "Erro ao criar conta."); setLoading(false); return; }
      setOk(true);
    } catch {
      setErr("Erro de conexão com o servidor.");
      setLoading(false);
    }
  };

  if (ok) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#080808", ...F }}>
      <div style={{ background: "#111", border: "1px solid rgba(34,197,94,.25)", borderRadius: 20, padding: "52px 48px", maxWidth: 440, textAlign: "center", boxShadow: "0 40px 80px rgba(0,0,0,.8)" }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(34,197,94,.1)", border: "1px solid rgba(34,197,94,.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <Icon n="check" size={26} color={C.green} />
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 10, letterSpacing: "-0.04em" }}>Conta criada!</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 28, lineHeight: 1.6 }}>Sua empresa foi registrada com sucesso no plano <b style={{ color: C.orange }}>{PLANOS.find(p => p.id === plano)?.nome}</b>. Faça login para começar.</div>
        <Btn onClick={onVoltar} sx={{ width: "100%", justifyContent: "center", padding: "12px" }}><Icon n="arrow" size={14} />Fazer Login</Btn>
      </div>
    </div>
  );

  return (
    <>
      <link href={FONT_URL} rel="stylesheet" />
      <style>{`*{box-sizing:border-box;margin:0;padding:0}body{background:#080808}option{background:#1a1a1a;color:#f0f0f0}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:${C.border};border-radius:8px}`}</style>
      <div style={{ minHeight: "100vh", background: "#080808", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, ...F }}>
        <div style={{ marginBottom: 28, textAlign: "center" }}>
          <span style={{ fontWeight: 800, fontSize: 22, color: C.orange, letterSpacing: "-0.05em" }}>obrasgest</span>
          <div style={{ fontSize: 11, color: C.dim, marginTop: 3 }}>Crie sua conta — é rápido e sem burocracia</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32 }}>
          {["Escolha o Plano", "Dados da Empresa"].map((s, i) => { const a = i + 1 === step, d = i + 1 < step; return (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, background: a || d ? C.orange : "rgba(255,255,255,.05)", color: a || d ? "#0a0a0a" : C.dim, border: `1px solid ${a || d ? C.orange : C.border}` }}>
                {d ? <Icon n="check" size={11} color="#0a0a0a" /> : i + 1}
              </div>
              <span style={{ fontSize: 11, color: a ? C.text : C.dim, fontWeight: a ? 600 : 400 }}>{s}</span>
              {i < 1 && <div style={{ width: 32, height: 1, background: C.border }} />}
            </div>
          ); })}
        </div>

        {step === 1 && (
          <div style={{ width: "100%", maxWidth: 820 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 20 }}>
              {PLANOS.map(p => { const sel = plano === p.id; return (
                <div key={p.id} onClick={() => setPlano(p.id)} style={{ background: sel ? "rgba(249,115,22,.06)" : "#111", border: `2px solid ${sel ? C.orange : C.border}`, borderRadius: 16, padding: "22px 20px", cursor: "pointer", transition: "all .18s", position: "relative" }}>
                  {p.popular && <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: C.orange, color: "#0a0a0a", fontSize: 10, fontWeight: 800, padding: "3px 11px", borderRadius: 20 }}>POPULAR</div>}
                  <div style={{ fontSize: 11, color: p.cor, fontWeight: 700, marginBottom: 6, textTransform: "uppercase" }}>{p.nome}</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: C.text, letterSpacing: "-0.05em", marginBottom: 4 }}>R$ {p.preco.mensal}<span style={{ fontSize: 12, fontWeight: 400, color: C.muted }}>/mês</span></div>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 14 }}>{p.desc}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {p.features.map(f => (
                      <div key={f} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: C.muted }}>
                        <Icon n="check" size={11} color={C.green} />{f}
                      </div>
                    ))}
                  </div>
                  {sel && <div style={{ position: "absolute", top: 14, right: 14, width: 18, height: 18, borderRadius: "50%", background: C.orange, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon n="check" size={10} color="#0a0a0a" /></div>}
                </div>
              ); })}
            </div>
            {err && <div style={{ fontSize: 11, color: C.red, background: "rgba(239,68,68,.07)", border: "1px solid rgba(239,68,68,.15)", borderRadius: 9, padding: "8px 13px", marginBottom: 12 }}>{err}</div>}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button onClick={onVerPlanos || onVoltar} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 12, ...F }}>← Ver planos</button>
              <Btn onClick={avancar} sx={{ padding: "10px 22px" }}>Continuar <Icon n="arrow" size={13} /></Btn>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ width: "100%", maxWidth: 480, background: "#111", border: `1px solid ${C.border}`, borderRadius: 18, padding: "30px 28px", boxShadow: "0 32px 80px rgba(0,0,0,.8)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 18, ...F }}>Dados da Empresa</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 11, marginBottom: 14 }}>
              <Inp label="Razão Social" placeholder="Construtora Exemplo Ltda" value={form.razaoSocial} onChange={e => setForm(f => ({ ...f, razaoSocial: e.target.value }))} />
              <Inp label="CNPJ" placeholder="00.000.000/0000-00" value={form.cnpj} onChange={e => setForm(f => ({ ...f, cnpj: e.target.value }))} />
              <Inp label="E-mail da empresa" type="email" placeholder="contato@empresa.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              <div style={{ height: 1, background: C.borderLight, margin: "4px 0" }} />
              <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: "uppercase", letterSpacing: "0.09em" }}>Dados do Administrador</div>
              <Inp label="Seu nome completo" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
              <Inp label="Senha de acesso" type="password" value={form.senha} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))} />
              <Inp label="Confirmar senha" type="password" value={form.confirma} onChange={e => setForm(f => ({ ...f, confirma: e.target.value }))} />
            </div>
            {err && <div style={{ fontSize: 11, color: C.red, background: "rgba(239,68,68,.07)", border: "1px solid rgba(239,68,68,.15)", borderRadius: 9, padding: "8px 13px", marginBottom: 12 }}>{err}</div>}
            <div style={{ display: "flex", gap: 9 }}>
              <Btn v="secondary" onClick={() => { setStep(1); setErr(""); }}>← Voltar</Btn>
              <Btn onClick={registrar} sx={{ flex: 1, justifyContent: "center", padding: "10px" }}><Icon n="check" size={13} />Criar minha conta</Btn>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
