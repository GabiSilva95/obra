import { useState } from "react";
import { Banner, Button, Card, Input } from "../../design-system";
import logoPositivo from "../../design-system/assets/logo-positivo.svg";
import { validarSenhaEquipe } from "../../server/config/painel.js";

/** Troca de senha. `obrigatoria` (senha provisória) ocupa a tela toda; senão abre sobre o painel com Cancelar. */
export default function TrocarSenha({ api, obrigatoria, onTrocou, onCancelar }) {
  const [form, setForm] = useState({ atual: "", nova: "", repetir: "" });
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const set = k => e => { setForm(f => ({ ...f, [k]: e.target.value })); setErro(""); };

  const salvar = async () => {
    if (salvando) return;
    const problema = validarSenhaEquipe(form.nova);
    if (!form.atual) return setErro("Informe a senha atual.");
    if (problema) return setErro(problema);
    if (form.nova !== form.repetir) return setErro("A confirmação não confere com a senha nova.");
    setSalvando(true);
    try { onTrocou(await api.post("/painel/auth/trocar-senha", { senhaAtual: form.atual, senhaNova: form.nova })); }
    catch (e) { setErro(e.message); setSalvando(false); }
  };

  const corpo = (
    <>
      {obrigatoria && <img src={logoPositivo} alt="ConstruktPro" style={{ width: "var(--logo-w)", maxWidth: "70%", alignSelf: "center" }} />}
      {obrigatoria && (
        <div>
          <h1 style={{ margin: 0, font: "var(--type-page-title)", fontSize: "var(--fs-h4)" }}>Crie sua senha</h1>
          <p style={{ margin: "var(--space-2) 0 0", fontSize: "var(--fs-p5)", color: "var(--text-secondary)" }}>A senha que você recebeu é provisória. Escolha uma só sua para continuar.</p>
        </div>
      )}
      {obrigatoria ? <Banner tone="info">Pelo menos 10 caracteres, misturando letras com números ou símbolos.</Banner>
        : <p style={{ margin: 0, fontSize: "var(--fs-p5)", color: "var(--text-secondary)" }}>As outras sessões abertas com a senha antiga serão encerradas.</p>}
      <Input label={obrigatoria ? "Senha provisória" : "Senha atual"} required type="password" autoComplete="current-password" value={form.atual} onChange={set("atual")} />
      <Input label="Senha nova" required type="password" autoComplete="new-password" helper={obrigatoria ? undefined : "Pelo menos 10 caracteres, misturando letras com números ou símbolos."} value={form.nova} onChange={set("nova")} />
      <Input label="Repita a senha nova" required type="password" autoComplete="new-password" error={erro || undefined} value={form.repetir} onChange={set("repetir")} onKeyDown={e => { if (e.key === "Enter") salvar(); }} />
      <div style={{ display: "flex", gap: "var(--space-2)" }}>
        {!obrigatoria && <Button variant="secondary" onClick={onCancelar}>Cancelar</Button>}
        <Button iconLeft="check" loading={salvando} onClick={salvar} style={{ flex: 1 }}>Salvar senha</Button>
      </div>
    </>
  );

  if (!obrigatoria) return <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>{corpo}</div>;
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-4)", background: "var(--bg-app)" }}>
      <Card padding="var(--space-8)" style={{ width: "100%", maxWidth: "var(--content-w-xs)", gap: "var(--space-5)" }}>{corpo}</Card>
    </div>
  );
}
