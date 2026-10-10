import { useState } from "react";
import { Button, Card, Input } from "../../design-system";
import logoPositivo from "../../design-system/assets/logo-positivo.svg";

/** Login da equipe. Não há cadastro: quem cria o acesso é um administrador da equipe. */
export default function Login({ onEntrou }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  const entrar = async () => {
    if (carregando) return;
    setCarregando(true); setErro("");
    try {
      const res = await fetch("/api/painel/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, senha }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErro(res.status === 429 ? "Muitas tentativas. Aguarde alguns minutos." : res.status >= 500 ? "Servidor indisponível. Tente em instantes." : d.error || "Credenciais inválidas.");
        setCarregando(false);
        return;
      }
      onEntrou(d);
    } catch {
      setErro("Não foi possível conectar ao servidor.");
      setCarregando(false);
    }
  };
  const aoTeclar = e => { if (e.key === "Enter") entrar(); };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-4)", background: "var(--bg-app)" }}>
      <Card padding="var(--space-10) var(--space-8) var(--space-8)" style={{ width: "100%", maxWidth: "var(--content-w-xs)", gap: "var(--space-6)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-6)", textAlign: "center" }}>
          <img src={logoPositivo} alt="ConstruktPro" style={{ width: "var(--logo-w)", maxWidth: "80%" }} />
          <div>
            <h1 style={{ margin: 0, font: "var(--type-page-title)", fontSize: "var(--fs-h4)" }}>Painel da equipe</h1>
            <p style={{ margin: "var(--space-2) 0 0", fontSize: "var(--fs-p5)", color: "var(--text-secondary)" }}>Acesso restrito à equipe do ConstruktPro.</p>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <Input label="E-mail" type="email" icon="mail" autoComplete="username" value={email} onChange={e => { setEmail(e.target.value); setErro(""); }} onKeyDown={aoTeclar} />
          <Input label="Senha" type="password" autoComplete="current-password" value={senha} error={erro || undefined} onChange={e => { setSenha(e.target.value); setErro(""); }} onKeyDown={aoTeclar} />
          <Button fullWidth size="lg" loading={carregando} onClick={entrar}>Entrar</Button>
        </div>
      </Card>
    </div>
  );
}
