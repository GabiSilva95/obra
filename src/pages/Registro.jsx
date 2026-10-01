import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Badge, Button, Card, Icon, Input, Stepper, Tag } from "../../design-system";
import logoPositivo from "../../design-system/assets/logo-positivo.svg";
import { PLANOS } from "../constants/data";

export default function Registro({ onVoltar, onVerPlanos }) {
  const planoInicial = useLocation().state?.planoId || null;
  const [step, setStep] = useState(planoInicial ? 2 : 1);
  const [plano, setPlano] = useState(planoInicial || null);
  const [form, setForm] = useState({ razaoSocial: "", cnpj: "", email: "", nome: "", senha: "", confirma: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

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

  const page = children => (
    <div style={{ minHeight: "100vh", background: "var(--bg-app)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "var(--space-8)", padding: "var(--space-6) var(--space-4)" }}>
      <img src={logoPositivo} alt="ConstruktPro" style={{ width: "var(--logo-w)" }} />
      {children}
    </div>
  );

  const erro = err && (
    <span role="alert" style={{ display: "flex", alignItems: "center", gap: "var(--space-1)", fontSize: "var(--fs-caption)", fontWeight: "var(--fw-medium)", color: "var(--status-danger)" }}>
      <Icon name="info" size={12} />{err}
    </span>
  );

  if (ok) return page(
    <Card padding="var(--space-10) var(--space-8)" style={{ maxWidth: "var(--content-w-xs)", width: "100%", alignItems: "center", textAlign: "center" }}>
      <span style={{ width: "var(--space-16)", height: "var(--space-16)", borderRadius: "50%", background: "var(--status-success-soft)", color: "var(--status-success)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon name="check" size={28} stroke={2.4} />
      </span>
      <h1 style={{ margin: 0, font: "var(--type-page-title)", fontSize: "var(--fs-h4)" }}>Conta criada</h1>
      <p style={{ margin: 0, fontSize: "var(--fs-p5)", color: "var(--text-secondary)", lineHeight: "var(--lh-body)" }}>
        Sua empresa foi registrada no plano <b style={{ color: "var(--text-primary)" }}>{PLANOS.find(p => p.id === plano)?.nome}</b>. Faça login para começar.
      </p>
      <Button fullWidth iconRight="arrow-right" onClick={onVoltar}>Fazer login</Button>
    </Card>
  );

  return page(
    <div style={{ width: "100%", maxWidth: step === 1 ? "var(--content-w-lg)" : "var(--content-w-sm)", display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ margin: 0, font: "var(--type-page-title)" }}>Crie sua conta</h1>
        <p style={{ margin: "var(--space-2) 0 0", color: "var(--text-secondary)" }}>Rápido e sem burocracia.</p>
      </div>
      <Card><Stepper steps={2} current={step} label={step === 1 ? "Etapa 1 · Escolha o plano" : "Etapa 2 · Dados da empresa"} progressLabel={step === 1 ? "0% concluído" : "50% concluído"} /></Card>

      {step === 1 && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(var(--col-min-md), 1fr))", gap: "var(--space-4)" }}>
            {PLANOS.map(p => (
              <Card key={p.id} onClick={() => setPlano(p.id)} selected={plano === p.id} title={p.nome}
                action={p.popular ? <Badge tone="accent" size="sm">Popular</Badge> : plano === p.id ? <Icon name="check" size={18} color="var(--accent)" /> : null}>
                <div>
                  <span style={{ font: "var(--type-stat)", color: "var(--text-primary)" }}>R$ {p.preco.mensal}</span>
                  <span style={{ fontSize: "var(--fs-p6)", color: "var(--text-secondary)" }}> /mês</span>
                  <p style={{ margin: "var(--space-1) 0 0", fontSize: "var(--fs-p6)", color: "var(--text-secondary)" }}>{p.desc}</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  {p.features.map(f => (
                    <span key={f} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--fs-p5-5)" }}>
                      <Icon name="check" size={14} color="var(--status-success)" />{f}
                    </span>
                  ))}
                </div>
              </Card>
            ))}
          </div>
          {erro}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-3)" }}>
            <Button variant="ghost" iconLeft="chevron-left" onClick={onVerPlanos || onVoltar}>Ver planos</Button>
            <Button iconRight="arrow-right" onClick={avancar}>Continuar</Button>
          </div>
        </>
      )}

      {step === 2 && (
        <Card title="Dados da empresa" action={<Tag tone="accent">Plano {PLANOS.find(p => p.id === plano)?.nome}</Tag>}>
          <Input label="Razão social" required placeholder="Construtora Exemplo Ltda" value={form.razaoSocial} onChange={set("razaoSocial")} />
          <Input label="CNPJ" required placeholder="00.000.000/0000-00" value={form.cnpj} onChange={set("cnpj")} />
          <Input label="E-mail da empresa" required type="email" icon="mail" placeholder="contato@empresa.com" value={form.email} onChange={set("email")} />
          <h3 style={{ margin: "var(--space-2) 0 0", font: "var(--type-card-title)", fontSize: "var(--fs-p4)" }}>Administrador</h3>
          <Input label="Seu nome completo" required value={form.nome} onChange={set("nome")} />
          <Input label="Senha de acesso" required type="password" autoComplete="new-password" value={form.senha} onChange={set("senha")} />
          <Input label="Confirmar senha" required type="password" autoComplete="new-password" value={form.confirma} onChange={set("confirma")} />
          {erro}
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <Button variant="secondary" iconLeft="chevron-left" onClick={() => { setStep(1); setErr(""); }}>Voltar</Button>
            <Button iconLeft="check" loading={loading} onClick={registrar} style={{ flex: 1 }}>Criar minha conta</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
