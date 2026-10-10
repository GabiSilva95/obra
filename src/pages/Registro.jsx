import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Button, Card, Checkbox, Icon, Input, Select, Tag } from "../../design-system";
import logoPositivo from "../../design-system/assets/logo-positivo.svg";
import { PLANOS } from "../constants/data";
import { DIAS_TESTE, PLANO_DO_TESTE } from "./Landing/oferta";
import { ACEITE_MENSAGENS } from "../../server/config/conta.js";
import { formatarTelefoneBR, normalizarTelefoneBR } from "../../server/utils/telefone.js";

/**
 * Cadastro do teste grátis: uma etapa, o mínimo de campos, e a pessoa entra direto no sistema (com o tour).
 * O plano vem do botão da landing (`state.planoId`) e pode ser trocado aqui.
 */
export default function Registro({ onCriada, onLogin, onVerPlanos }) {
  const planoInicial = useLocation().state?.planoId;
  const [plano, setPlano] = useState(PLANOS.some(p => p.id === planoInicial) ? planoInicial : PLANO_DO_TESTE);
  const [form, setForm] = useState({ razaoSocial: "", cnpj: "", nome: "", email: "", telefone: "", senha: "" });
  const [aceite, setAceite] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const set = k => e => { setForm(f => ({ ...f, [k]: e.target.value })); setErr(""); };

  const registrar = async () => {
    if (loading) return;
    if (Object.values(form).some(v => !v.trim())) { setErr("Preencha todos os campos."); return; }
    if (!normalizarTelefoneBR(form.telefone)) { setErr("Informe um telefone válido, com DDD."); return; }
    if (form.senha.length < 6) { setErr("A senha precisa de pelo menos 6 caracteres."); return; }
    if (!aceite) { setErr("Para criar a conta, marque o aceite de mensagens e notificações."); return; }
    setLoading(true); setErr("");
    try {
      const res = await fetch("/api/auth/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, plano, aceiteMensagens: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(data.error || "Não foi possível criar a conta."); setLoading(false); return; }
      if (data.tenant) onCriada(data.token, data.user, data.tenant, data.refreshToken);
      else onLogin();
    } catch {
      setErr("Erro de conexão com o servidor.");
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-app)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "var(--space-6)", padding: "var(--space-6) var(--space-4)" }}>
      <img src={logoPositivo} alt="ConstruktPro" style={{ width: "var(--logo-w)" }} />
      <Card padding="var(--space-8) var(--space-6)" style={{ width: "100%", maxWidth: "var(--content-w-sm)", gap: "var(--space-5)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", alignItems: "flex-start" }}>
          <Tag tone="accent" dot>Teste grátis de {DIAS_TESTE} dias</Tag>
          <h1 style={{ margin: 0, font: "var(--type-page-title)" }}>Crie sua conta e comece hoje</h1>
          <p style={{ margin: 0, fontSize: "var(--fs-p5)", color: "var(--text-secondary)", lineHeight: "var(--lh-body)" }}>
            Sem cartão de crédito. Assim que criar a conta, você entra no sistema e um tour mostra o caminho.
          </p>
        </div>
        <form onSubmit={e => { e.preventDefault(); registrar(); }} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <Input label="Nome da empresa" required autoComplete="organization" placeholder="Construtora Silva" value={form.razaoSocial} onChange={set("razaoSocial")} />
          <Input label="CNPJ" required inputMode="numeric" placeholder="00.000.000/0000-00" value={form.cnpj} onChange={set("cnpj")} />
          <Input label="Seu nome" required autoComplete="name" value={form.nome} onChange={set("nome")} />
          <Input label="Seu e-mail" required type="email" icon="mail" autoComplete="email" placeholder="voce@empresa.com.br" helper="É com ele que você entra no sistema." value={form.email} onChange={set("email")} />
          <Input label="Telefone com DDD" required type="tel" icon="phone" autoComplete="tel-national" inputMode="tel" placeholder="(11) 99999-0000" helper="Para a equipe falar com você sobre a conta e os chamados." value={form.telefone} onChange={e => { setForm(f => ({ ...f, telefone: formatarTelefoneBR(e.target.value) })); setErr(""); }} />
          <Input label="Crie uma senha" required type="password" autoComplete="new-password" helper="Pelo menos 6 caracteres." value={form.senha} onChange={set("senha")} />
          <Select label="Plano do teste" value={plano} onChange={e => setPlano(e.target.value)}
            helper="No fim do teste você decide se continua. Nada é cobrado sem você escolher.">
            {PLANOS.map(p => <option key={p.id} value={p.id}>{p.nome} · R$ {p.preco.mensal}/mês depois do teste</option>)}
          </Select>
          <Checkbox checked={aceite} onChange={v => { setAceite(v); setErr(""); }} label={ACEITE_MENSAGENS.texto} />
          {err && (
            <span role="alert" style={{ display: "flex", alignItems: "center", gap: "var(--space-1)", fontSize: "var(--fs-caption)", fontWeight: "var(--fw-medium)", color: "var(--status-danger)" }}>
              <Icon name="info" size={12} />{err}
            </span>
          )}
          <Button type="submit" variant="accent" size="lg" fullWidth iconRight="arrow-right" loading={loading}>Começar meu teste grátis</Button>
        </form>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap", fontSize: "var(--fs-p6)", color: "var(--text-secondary)" }}>
          <span>Já tem conta? <Button variant="link" size="sm" onClick={onLogin} style={{ height: "auto", padding: 0, color: "var(--text-accent)" }}>Entrar</Button></span>
          <Button variant="link" size="sm" iconLeft="chevron-left" onClick={onVerPlanos} style={{ height: "auto", padding: 0 }}>Ver planos e preços</Button>
        </div>
      </Card>
    </div>
  );
}
