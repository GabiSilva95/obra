import { useMemo, useState } from "react";
import { Banner, Button, Card, SegmentedTabs, useIsMobile } from "../../../design-system";
import logoPositivo from "../../../design-system/assets/logo-positivo.svg";
import createApi from "../../utils/api.js";
import { avisarErro } from "../../utils/aviso";
import { PageActionsContext } from "../../components/PageActions";
import ChatSuporte from "../../components/ChatSuporte";
import Suporte from "../Suporte";
import Assinatura from ".";
import { useResumoSuporte } from "../Suporte/useResumoSuporte";
import { dataBR } from "../../utils/tempo";

// O que dizer em cada situação. O motivo interno da equipe nunca aparece aqui: o cliente só sabe o que houve, não o porquê.
const TEXTOS = {
  trial_expirado: {
    titulo: "O seu teste grátis terminou",
    texto: "Os seus dados estão guardados e continuam seus. Para voltar a usar o ConstruktPro, escolha um plano falando com a nossa equipe: é rápido e você retoma de onde parou.",
    pedido: { setor: "assinatura", assunto: "Quero assinar o ConstruktPro", texto: "O meu teste grátis terminou e quero escolher um plano para continuar usando." },
    pedidoRotulo: "Quero assinar",
  },
  suspenso: {
    titulo: "A sua conta está suspensa",
    texto: "Os seus dados estão guardados. Fale com a nossa equipe para regularizar e voltar a usar.",
    pedido: { setor: "assinatura", assunto: "Conta suspensa: quero regularizar", texto: "A minha conta está suspensa e quero entender o que preciso fazer para voltar a usar." },
    pedidoRotulo: "Quero regularizar",
  },
  cancelado: {
    titulo: "A sua conta foi cancelada",
    texto: "Os seus dados ficam guardados por um tempo. Se quiser voltar, fale com a nossa equipe.",
    pedido: { setor: "assinatura", assunto: "Quero reativar a minha conta", texto: "A minha conta foi cancelada e quero reativá-la." },
    pedidoRotulo: "Quero reativar",
  },
};

/**
 * Tela de uma conta bloqueada (teste acabado, suspensa ou cancelada). O cliente entra, vê o que houve e só alcança
 * a assinatura e o suporte, o único caminho aberto no servidor. Mora fora do shell completo: não carrega dados do sistema.
 * "Minha assinatura" completa (planos, pagamento, faturas) entra com a fase de cobrança.
 */
export default function ContaBloqueada({ session, atualizarSessao, onLogout }) {
  const mobile = useIsMobile();
  const tenant = session.tenant;
  const api = useMemo(() => createApi(session.token), [session.token]);
  const [aba, setAba] = useState("assinatura");
  const [verificando, setVerificando] = useState(false);
  const [acoesEl, setAcoesEl] = useState(null);
  const [pedido, setPedido] = useState(null);
  const { resumoSup, chatId, setChatId, atualizar } = useResumoSuporte(api, { rota: aba });
  const t = TEXTOS[tenant.situacao] || TEXTOS.suspenso;

  const verificar = async () => {
    setVerificando(true);
    try {
      const nova = await api.get("/assinatura");
      if (nova.bloqueada) avisarErro("A conta ainda está bloqueada. Se já falou com a equipe, aguarde a confirmação.");
      atualizarSessao({ tenant: { ...tenant, ...nova } });
    } catch (e) { avisarErro(e.message); }
    setVerificando(false);
  };
  const pedirAjuda = () => { setPedido(t.pedido); setAba("suporte"); };
  const trocarAba = v => { setPedido(null); setAba(v); }; // o pedido pronto vale só para a abertura vinda do botão

  return (
    <PageActionsContext.Provider value={acoesEl}>
      {chatId && <ChatSuporte api={api} id={chatId} onFechar={() => { setChatId(null); atualizar(); }} onAbrirChamado={() => setAba("suporte")} />}
      <div style={{ minHeight: "100vh", background: "var(--bg-app)" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-4)", flexWrap: "wrap", padding: "var(--space-4) var(--space-6)" }}>
          <img src={logoPositivo} alt="ConstruktPro, do canteiro ao escritório" style={{ width: "var(--logo-w)", maxWidth: "50%" }} />
          <span style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
            <span style={{ fontSize: "var(--fs-p5)", color: "var(--text-secondary)" }}>{tenant.razaoSocial}</span>
            <Button variant="secondary" size="sm" iconLeft="log-out" onClick={onLogout}>Sair</Button>
          </span>
        </header>
        <main style={{ maxWidth: "var(--content-w-lg)", margin: "0 auto", padding: mobile ? "var(--space-4)" : "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
          <SegmentedTabs variant="light" value={aba} onChange={trocarAba} tabs={[{ value: "assinatura", label: "Minha assinatura" }, { value: "suporte", label: "Suporte" }]} />
          {aba === "assinatura" ? (
            <>
              <Banner tone={tenant.situacao === "trial_expirado" ? "warning" : "danger"} title={t.titulo}>{t.texto}</Banner>
              <Card title="O que fazer agora">
                <p style={{ margin: 0, fontSize: "var(--fs-p5)", color: "var(--text-secondary)", lineHeight: "var(--lh-body)" }}>
                  {tenant.situacao === "trial_expirado" && tenant.trialAte ? `O seu teste acabou em ${dataBR(`${tenant.trialAte}T12:00:00Z`)}. ` : ""}
                  Fale com a nossa equipe pelo suporte: abra um chamado ou converse ao vivo. Assim que a conta for liberada, é só tocar em "Já foi liberado" e o sistema abre como você deixou.
                </p>
                <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
                  <Button iconLeft="message-circle" onClick={pedirAjuda}>{t.pedidoRotulo}</Button>
                  <Button variant="secondary" iconLeft="refresh-cw" loading={verificando} onClick={verificar}>Já foi liberado</Button>
                </div>
              </Card>
              {session.user?.role === "tenant_admin" && (
                <Assinatura api={api} tenant={tenant} bloqueada onPedido={p => { setPedido(p); setAba("suporte"); }} atualizarTenant={nova => atualizarSessao({ tenant: { ...tenant, ...nova } })} />
              )}
              {resumoSup?.respondidos?.length > 0 && (
                <Banner tone="info" title="A equipe respondeu"
                  action={<Button size="sm" variant="secondary" onClick={() => setAba("suporte")}>Ver respostas</Button>}>
                  Você tem {resumoSup.respondidos.length} chamado(s) com resposta nova.
                </Banner>
              )}
            </>
          ) : (
            <>
              <div ref={setAcoesEl} style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }} />
              <Suporte api={api} chatAtivo={resumoSup?.chatAtivo} abrirChat={setChatId} atualizarResumo={atualizar} novoInicial={pedido} />
            </>
          )}
        </main>
      </div>
    </PageActionsContext.Provider>
  );
}
