import { useState } from "react";
import { Button, Card, Icon, Input } from "../../design-system";
import logoPositivo from "../../design-system/assets/logo-positivo.svg";

export default function Login({ onLogin, onRegistro }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [err, setErr] = useState("");
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
        else if (res.status >= 500) { setErr("Servidor indisponível. Tente novamente em instantes."); }
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
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-4)", background: "var(--bg-app)" }}>
      <Card padding="var(--space-10) var(--space-8) var(--space-8)" style={{ width: "100%", maxWidth: "var(--content-w-xs)", gap: "var(--space-6)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-6)", textAlign: "center" }}>
          <img src={logoPositivo} alt="ConstruktPro, do canteiro ao escritório" style={{ width: "var(--logo-w)", maxWidth: "80%" }} />
          <div>
            <h1 style={{ margin: 0, font: "var(--type-page-title)", fontSize: "var(--fs-h4)" }}>Bem-vindo de volta</h1>
            <p style={{ margin: "var(--space-2) 0 0", fontSize: "var(--fs-p5)", color: "var(--text-secondary)" }}>Acesse sua conta para continuar gerenciando suas obras.</p>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <Input label="E-mail" type="email" icon="mail" autoComplete="email" placeholder="voce@empresa.com.br" value={email}
            onChange={e => { setEmail(e.target.value); setErr(""); }} onKeyDown={onKey} />
          <Input label="Senha" type="password" autoComplete="current-password" value={senha} error={err || undefined}
            onChange={e => { setSenha(e.target.value); setErr(""); }} onKeyDown={onKey} />
          <Button fullWidth size="lg" loading={loading} onClick={go}>Entrar</Button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", color: "var(--text-secondary)", fontSize: "var(--fs-caption)" }}>
          <span style={{ flex: 1, height: "var(--border-w)", background: "var(--border-default)" }} />ou<span style={{ flex: 1, height: "var(--border-w)", background: "var(--border-default)" }} />
        </div>
        <Button variant="secondary" fullWidth iconLeft="user" onClick={() => { setEmail("admin@teste.com"); setSenha("admin123"); setErr(""); }}>
          Usar credenciais de demonstração
        </Button>
        <p style={{ margin: 0, textAlign: "center", fontSize: "var(--fs-p6)", color: "var(--text-secondary)" }}>
          Ainda não tem conta?{" "}
          <Button variant="link" size="sm" onClick={onRegistro} style={{ height: "auto", padding: 0, color: "var(--text-accent)" }}>
            Ver planos <Icon name="arrow-right" size={14} />
          </Button>
        </p>
      </Card>
    </div>
  );
}
