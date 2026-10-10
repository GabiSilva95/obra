import { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { Banner, Button, Header, MobileTabBar, Tour, useIsMobile } from "../design-system";
import createApi from "./utils/api.js";
import AppSidebar, { MENU, TAB_IDS, allowedMenu } from "./components/Sidebar";
import { PageActionsContext } from "./components/PageActions";
import AvisoModal from "./components/AvisoModal";
import { planoPorId } from "./constants/data";
import { onLimiteAtingido, LABELS_RECURSO, ACAO_RECURSO } from "./utils/planoLimite";
import { avisar, avisarSucesso, avisarErro } from "./utils/aviso";
import { passosDoTour } from "./tour/primeirosPassos";
import Notificacoes from "./components/Notificacoes";
import Login from "./pages/Login";
import Registro from "./pages/Registro";
import Landing from "./pages/Landing";
import ChatSuporte from "./components/ChatSuporte";
import { useResumoSuporte } from "./pages/Suporte/useResumoSuporte";
import { capturarAcessoLeitura, encerrarAcessoLeitura, lerAcessoLeitura } from "./utils/leitura";
import { horaBR } from "./utils/tempo";
import { PLANO_DO_TESTE } from "./pages/Landing/oferta";

// Telas do sistema carregam sob demanda: a landing (porta de entrada) abre só com o próprio código
const Dashboard    = lazy(() => import("./pages/Dashboard"));
const Obras        = lazy(() => import("./pages/Obras"));
const Cadastros    = lazy(() => import("./pages/Cadastros"));
const Maquinas     = lazy(() => import("./pages/Cadastros").then(m => ({ default: m.Maquinas })));
const Estoque      = lazy(() => import("./pages/Estoque"));
const Alocacao     = lazy(() => import("./pages/Alocacao"));
const Relatorios   = lazy(() => import("./pages/Relatorios"));
const Usuarios     = lazy(() => import("./pages/Usuarios"));
const Diario       = lazy(() => import("./pages/Diario"));
const Financeiro   = lazy(() => import("./pages/Financeiro"));
const Compras      = lazy(() => import("./pages/Compras"));
const Treinamentos = lazy(() => import("./pages/Treinamentos"));
const Suporte      = lazy(() => import("./pages/Suporte"));
const Assinatura   = lazy(() => import("./pages/Assinatura"));
const ContaBloqueada = lazy(() => import("./pages/Assinatura/ContaBloqueada"));
const Showcase     = lazy(() => import("../design-system/showcase/Showcase"));

function normalizeData(raw) {
  const { obras, maquinas, funcionarios, insumos, estoques, alocacoes, tiposEtapa, users, diario, receitas, compras, categoriasMaquina, tiposObra, consumos, apontamentos, despesas, transferencias } = raw;
  const etapasObra = obras.flatMap(o => (o.etapas || []).map(e => ({ ...e, obraId: o.id })));
  const funcionarioObra = funcionarios.flatMap(f => (f.funcionarioObra || []));
  const normalizedAlocacoes = alocacoes.map(a => ({ ...a, referenciaId: a.maquinaId || a.insumoId }));
  const normalizedUsers = users.map(u => ({ ...u, obrasAcesso: (u.obrasAcesso || []).map(oa => oa.obraId) }));
  return {
    obras: obras.map(({ etapas, acessos, ...o }) => o),
    etapasObra,
    maquinas,
    funcionarios: funcionarios.map(({ funcionarioObra: _, ...f }) => f),
    funcionarioObra,
    insumos,
    estoques,
    alocacoes: normalizedAlocacoes,
    tiposEtapa,
    users: normalizedUsers,
    diario: diario || [],
    receitas: receitas || [],
    compras: compras || [],
    categoriasMaquina: categoriasMaquina || [],
    tiposObra: tiposObra || [],
    consumos: consumos || [],
    apontamentos: apontamentos || [],
    despesas: despesas || [],
    transferencias: transferencias || [],
  };
}

const MOTIVO_BLOQUEIO = { trial_expirado: "teste acabado", suspenso: "suspensa", cancelado: "cancelada" };

// Acesso "como o cliente" (a equipe, só leitura): sem refresh, sem tocar na sessão guardada do navegador
const SEM_RENOVACAO = { chaveSessao: "leitura-sem-renovacao" };

/** Faixa fixa do modo leitura: quem está vendo, de qual chamado, até quando, e a saída. */
function FaixaLeitura({ session, onSair }) {
  const { leitura, tenant } = session;
  return (
    <div style={{ position: "sticky", top: 0, zIndex: "var(--z-sticky)", padding: "var(--space-2) var(--space-4)", background: "var(--bg-app)" }}>
      <Banner tone="warning" title={`Modo leitura: ${tenant.razaoSocial}`}
        action={<Button size="sm" variant="secondary" onClick={onSair}>Sair da leitura</Button>}>
        Você está vendo esta conta como a equipe do ConstruktPro, por causa do chamado #{leitura.chamado}. Nada pode ser alterado e o cliente foi avisado no chamado. O acesso termina às {horaBR(leitura.expiraEm)}.
        {tenant.bloqueada ? ` Para o cliente, esta conta está bloqueada (${MOTIVO_BLOQUEIO[tenant.situacao] || "bloqueio"}).` : ""}
      </Banner>
    </div>
  );
}

/** Aviso no topo para o administrador: teste perto do fim ou pagamento em atraso. */
function FaixaAssinatura({ tenant, ir }) {
  const d = tenant.diasRestantes;
  if (tenant.situacao === "trial" && d != null && d <= 5) {
    return (
      <Banner tone={d <= 2 ? "warning" : "info"} title={d > 1 ? `Faltam ${d} dias do seu teste grátis` : d === 1 ? "Falta 1 dia do seu teste grátis" : "Hoje é o último dia do seu teste grátis"}
        action={<Button size="sm" variant="secondary" onClick={ir}>Escolher um plano</Button>}>
        Depois do teste o acesso é bloqueado até a assinatura. Os seus dados ficam guardados.
      </Banner>
    );
  }
  if (tenant.situacao === "inadimplente") {
    return (
      <Banner tone="warning" title="Pagamento em atraso" action={<Button size="sm" variant="secondary" onClick={ir}>Ver faturas</Button>}>
        Regularize para evitar a suspensão da conta.
      </Banner>
    );
  }
  return null;
}

/** Conta bloqueada (teste acabou, suspensa, cancelada) vê só a tela de assinatura e o suporte; as demais, o sistema completo. */
function AppShell({ session, atualizarSessao, onLogout }) {
  if (session.tenant?.bloqueada && !session.leitura) {
    return <Suspense fallback={null}><ContaBloqueada session={session} atualizarSessao={atualizarSessao} onLogout={onLogout} /></Suspense>;
  }
  return <AppShellCompleto session={session} atualizarSessao={atualizarSessao} onLogout={onLogout} />;
}

/** A página Suporte, aberta já com um chamado preenchido quando vem de um atalho (ex.: "Assinar" na tela Assinatura). */
function SuporteRota(props) {
  const { state } = useLocation();
  return <Suspense fallback={null}><Suporte {...props} novoInicial={state?.novoInicial} key={state?.novoInicial?.assunto || "suporte"} /></Suspense>;
}

function AppShellCompleto({ session, atualizarSessao, onLogout }) {
  const navigate = useNavigate();
  const api = createApi(session.token, session.leitura ? SEM_RENOVACAO : undefined);
  const [leituraVenceu, setLeituraVenceu] = useState(false);
  // A situação da conta muda por fora (a equipe ativa, um pagamento entra): relê ao abrir, em vez de confiar só no login
  useEffect(() => {
    api.get("/assinatura").then(t => atualizarSessao({ tenant: { ...session.tenant, ...t } })).catch(() => {});
  }, []); // eslint-disable-line
  useEffect(() => {
    if (!session.leitura) return;
    const t = setInterval(() => { if (Date.now() > new Date(session.leitura.expiraEm).getTime()) setLeituraVenceu(true); }, 10000);
    return () => clearInterval(t);
  }, [session.leitura]);

  const [data, setData] = useState(null);
  const [loadErr, setLoadErr] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [obras, maquinas, funcionarios, insumos, estoques, alocacoes, tiposEtapa, users, diario, receitas, compras, categoriasMaquina, tiposObra, consumos, apontamentos, despesas, transferencias] = await Promise.all([
        api.get("/obras"),
        api.get("/cadastros/maquinas"),
        api.get("/cadastros/funcionarios"),
        api.get("/cadastros/insumos"),
        api.get("/estoque"),
        api.get("/alocacao"),
        api.get("/cadastros/tipos-etapa"),
        api.get("/usuarios"),
        api.get("/diario"),
        api.get("/receitas"),
        api.get("/compras"),
        api.get("/cadastros/categorias-maquina").catch(() => []),
        api.get("/cadastros/tipos-obra").catch(() => []),
        api.get("/estoque/consumos").catch(() => []),
        api.get("/apontamentos").catch(() => []),
        api.get("/despesas").catch(() => []),
        api.get("/estoque/transferencias").catch(() => []),
      ]);
      setData(normalizeData({ obras, maquinas, funcionarios, insumos, estoques, alocacoes, tiposEtapa, users, diario, receitas, compras, categoriasMaquina, tiposObra, consumos, apontamentos, despesas, transferencias }));
    } catch (e) {
      setLoadErr(session.leitura && e.status === 401 ? "O acesso de leitura terminou." : e.message);
    }
  }, [session.token]); // eslint-disable-line

  useEffect(() => { loadData(); }, [loadData]);




  const user = session.user;
  const tenant = session.tenant;

  // Vencimentos do financeiro (sino e painel): só para quem tem a permissão, e atualizado a cada troca de tela.
  // null = ainda carregando; false = falhou (o painel mostra o aviso em vez de ficar "Carregando")
  const [resumoFin, setResumoFin] = useState(null);
  const podeFinanceiro = user.role === "tenant_admin" || (user.permissoes || []).includes("financeiro");
  const { pathname: rotaAtual } = useLocation();
  useEffect(() => {
    if (!podeFinanceiro || !data) return;
    api.get("/financeiro/resumo").then(setResumoFin).catch(() => setResumoFin(false));
  }, [podeFinanceiro, !!data, rotaAtual]); // eslint-disable-line

  // Suporte: chamados com resposta nova (sino) e o chat ao vivo, que mora no shell e segue o cliente pelas telas
  const { resumoSup, chatId, setChatId, atualizar: atualizarResumoSup } = useResumoSuporte(api, { ativo: !!data, rota: rotaAtual });

  // Limite de plano vira o mesmo pop-up central, com atalho para os planos
  useEffect(() => onLimiteAtingido(info => {
    const label = LABELS_RECURSO[info.recurso] || "registros";
    const acao  = ACAO_RECURSO[info.recurso];
    const planoNome = /plano\s+(\S+?)\s+atingido/i.exec(info.error || "")?.[1] || tenant?.plano;
    avisar({
      tipo: "alerta",
      titulo: "Limite do plano atingido",
      mensagem: info.limite != null
        ? `Seu plano ${planoNome} permite ${info.limite} ${label} e você já tem ${info.atual}.`
          + (acao ? ` Para ${acao}, faça upgrade.` : "")
        : (info.error || "Faça upgrade do plano para continuar."),
      acao: user.role === "tenant_admin" ? { rotulo: "Ver planos", onClick: () => navigate("/app/assinatura") } : undefined,
    });
  }), [tenant?.plano]); // eslint-disable-line
  const isAdmin = user.role === "tenant_admin";
  const has = p => isAdmin || (user.permissoes || []).includes(p);

  const sharedProps = { data, setData, api, reloadData: loadData };

  const isMobile = useIsMobile();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [actionsEl, setActionsEl] = useState(null);
  const activeId = pathname.split("/")[2];
  const title = MENU.find(m => m.id === activeId)?.title || "";
  const plano = planoPorId(tenant?.plano) ? ` · Plano ${planoPorId(tenant.plano).nome}` : "";
  const headerUser = { name: user.nome, role: (session.leitura ? "Modo leitura" : isAdmin ? "Administrador" : "Usuário") + plano };
  const go = id => {
    if (id === "menu") { setDrawer(true); return; }
    setDrawer(false);
    if (id === "sair") onLogout(); else navigate(`/app/${id}`);
  };
  const tabs = [...allowedMenu(user).filter(m => TAB_IDS.includes(m.id)), { id: "menu", label: "Menu", icon: "menu" }]
    .map(({ id, label, icon }) => ({ id, label, icon }));

  // Tour de primeiros passos: abre a cada login (session.tourPendente) ou pelo botão da central
  const [tourAberto, setTourAberto] = useState(false);
  const passosTour = useMemo(() => passosDoTour(allowedMenu(user), { mobile: isMobile, idsBarraMobile: TAB_IDS }), [user, isMobile]);
  const salvarOcultarTour = async valor => {
    await api.patch("/me/preferencias", { ocultarTour: valor });
    atualizarSessao({ user: { ...user, ocultarTour: valor } });
  };
  const fecharTour = async ({ dontShowAgain }) => {
    setTourAberto(false);
    atualizarSessao({ tourPendente: false });
    if (!dontShowAgain) return;
    try {
      await salvarOcultarTour(true);
      avisarSucesso("O tour não vai mais abrir ao entrar. Para rever, acesse Treinamentos.");
    } catch (e) { avisarErro(e.message); }
  };

  const message = (text, color = "var(--text-secondary)") => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", paddingTop: "var(--space-12)", color, fontSize: "var(--fs-p5-5)" }}>{text}</div>
  );

  const sairDaLeitura = () => { encerrarAcessoLeitura(); window.close(); window.location.assign("/"); };
  if (session.leitura && (leituraVenceu || loadErr === "O acesso de leitura terminou.")) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", flexDirection: "column", gap: "var(--space-4)", padding: "var(--space-6)", textAlign: "center" }}>
      <Banner tone="info" title="O acesso de leitura terminou">Ele dura 30 minutos. Volte ao painel e entre de novo, se precisar.</Banner>
      <Button onClick={sairDaLeitura}>Fechar</Button>
    </div>
  );
  if (loadErr) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: "var(--status-danger)", fontSize: "var(--fs-p5-5)", flexDirection: "column", gap: "var(--space-3)" }}>
      <span>Erro ao carregar dados: {loadErr}</span>
      <Button variant="secondary" iconLeft="clock" onClick={loadData}>Tentar novamente</Button>
    </div>
  );

  // Na própria tela Assinatura o aviso já aparece, então a faixa do topo some
  const faixaAssinatura = isAdmin && !session.leitura && session.tenant && activeId !== "assinatura" ? <FaixaAssinatura tenant={session.tenant} ir={() => navigate("/app/assinatura")} /> : null;
  const routes = !data ? message("Carregando…") : (
    <Suspense fallback={message("Carregando…")}>
    <Routes>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard"  element={<Dashboard data={data} userId={user.id} isMaster={isAdmin} financeiro={resumoFin} pode={{ financeiro: has("financeiro"), estoque: has("estoque") }} api={api} ir={id => navigate(`/app/${id}`)} />} />
      <Route path="obras"      element={has("obras")       ? <Obras      {...sharedProps} canWrite={has("obras")}       /> : message("Acesso não permitido.")} />
      <Route path="maquinas"   element={has("maquinas")    ? <Maquinas   {...sharedProps} canWrite={has("maquinas")}    /> : message("Acesso não permitido.")} />
      <Route path="cadastros"  element={<Cadastros {...sharedProps} canWrite={has("cadastros")} />} />
      <Route path="estoque"    element={has("estoque")     ? <Estoque    {...sharedProps} canWrite={has("estoque")}     /> : message("Acesso não permitido.")} />
      <Route path="alocacao"   element={has("alocacao")    ? <Alocacao   {...sharedProps} canWrite={has("alocacao")}    /> : message("Acesso não permitido.")} />
      <Route path="relatorios" element={has("relatorios")  ? <Relatorios data={data} />                                  : message("Acesso não permitido.")} />
      <Route path="usuarios"   element={isAdmin            ? <Usuarios   {...sharedProps} tenant={tenant} irAssinatura={() => navigate("/app/assinatura")} /> : message("Acesso não permitido.")} />
      <Route path="diario"     element={<Diario    {...sharedProps} canWrite={isAdmin || has("obras")} />} />
      <Route path="financeiro" element={has("financeiro") ? <Financeiro {...sharedProps} canWrite={has("financeiro")} /> : message("Acesso não permitido.")} />
      <Route path="compras"    element={<Compras   {...sharedProps} canWrite={isAdmin || has("estoque")} />} />
      <Route path="assinatura" element={isAdmin ? <Assinatura api={api} tenant={tenant} onPedido={p => navigate("/app/suporte", { state: { novoInicial: p } })} atualizarTenant={t => atualizarSessao({ tenant: { ...tenant, ...t } })} /> : message("Acesso não permitido.")} />
      <Route path="suporte"     element={<SuporteRota api={api} chatAtivo={resumoSup?.chatAtivo} abrirChat={setChatId} atualizarResumo={atualizarResumoSup} />} />
      <Route path="treinamentos" element={<Treinamentos menu={allowedMenu(user)} ocultarTour={!!user.ocultarTour} onRefazerTour={() => setTourAberto(true)}
        onMostrarTourAoEntrar={async mostrar => {
          try { await salvarOcultarTour(!mostrar); } catch (e) { avisarErro(e.message); }
        }} />} />
      <Route path="*"          element={<Navigate to="dashboard" replace />} />
    </Routes>
    </Suspense>
  );

  const actionsSlot = <div ref={setActionsEl} data-tour="acoes" style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap", justifyContent: isMobile ? "flex-start" : "flex-end", flex: "0 1 auto", minWidth: 0 }} />;
  const header = (
    <Header title={title} user={headerUser} search="none" messages={false} compact={isMobile}
      onMenu={isMobile ? () => setDrawer(true) : undefined}
      actions={isMobile ? undefined : actionsSlot}
      notificationsSlot={<Notificacoes data={data} financeiro={resumoFin} suporte={resumoSup} />} />
  );

  return (
    <PageActionsContext.Provider value={actionsEl}>
      {session.leitura && <FaixaLeitura session={session} onSair={sairDaLeitura} />}
      {chatId && <ChatSuporte api={api} id={chatId} onFechar={() => { setChatId(null); atualizarResumoSup(); }} onAbrirChamado={() => navigate("/app/suporte")} />}
      {data && (session.tourPendente || tourAberto) && (
        <Tour steps={passosTour} onStepChange={i => passosTour[i].route && navigate(`/app/${passosTour[i].route}`)} onClose={fecharTour} />
      )}
      <style>{`*{margin:0;padding: 0}::-webkit-scrollbar{width:var(--space-1-5);height:var(--space-1-5)}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:var(--border-default);border-radius:var(--radius-sm)}::-webkit-scrollbar-thumb:hover{background:var(--border-strong)}input[type=range]{accent-color:var(--accent)}`}</style>
      {isMobile ? (
        <div style={{ minHeight: "100vh", paddingBottom: "calc(var(--mobile-tabbar-height) + var(--space-4))" }}>
          <div style={{ position: "sticky", top: 0, zIndex: "var(--z-sticky)", background: "var(--bg-app)", padding: "0 var(--space-4)" }}>{header}</div>
          <main style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-4)", minWidth: 0 }}>
            {actionsSlot}
            {faixaAssinatura}
            {routes}
          </main>
          <MobileTabBar items={tabs} activeId={tabs.some(t => t.id === activeId) ? activeId : "menu"} onSelect={go}
            style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: "var(--z-tabbar)" }} />
          {drawer && (
            <div onClick={() => setDrawer(false)} style={{ position: "fixed", inset: 0, zIndex: "var(--z-drawer)", background: "var(--scrim)", backdropFilter: "blur(var(--blur-scrim))" }}>
              <div onClick={e => e.stopPropagation()} style={{ position: "absolute", top: "var(--space-2)", bottom: "var(--space-2)", left: "var(--space-2)" }}>
                <AppSidebar user={user} tenant={tenant} activeId={activeId} onSelect={go} onClose={() => setDrawer(false)} style={{ width: "min(var(--sidebar-width), calc(100vw - var(--space-12)))" }} />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", gap: "var(--space-8)", padding: "var(--space-4)", minHeight: "100vh", alignItems: "flex-start" }}>
          <div style={{ position: "sticky", top: "var(--space-4)", height: "calc(100vh - 2 * var(--space-4))" }}>
            <AppSidebar user={user} tenant={tenant} activeId={activeId} onSelect={go} collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
          </div>
          <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "var(--space-6)", paddingRight: "var(--space-4)", paddingBottom: "var(--space-8)" }}>
            {header}
            {faixaAssinatura}
            {routes}
          </main>
        </div>
      )}
    </PageActionsContext.Provider>
  );
}

export default function App() {
  const [session, setSession] = useState(() => {
    // A equipe em modo leitura abre o sistema com o acesso no fragmento da URL: vale só nesta aba e nunca toca na sessão guardada
    capturarAcessoLeitura();
    const l = lerAcessoLeitura();
    if (l) return { token: l.token, user: l.user, tenant: l.tenant, tourPendente: false, leitura: { expiraEm: l.expiraEm, chamado: l.chamado } };
    try {
      const s = localStorage.getItem("session");
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  });
  const navigate = useNavigate();

  const sessionRef = useRef(session); // o valor mais recente da sessão para os ouvintes de evento, sem recriá-los
  useEffect(() => { sessionRef.current = session; });

  // Atualiza campos da sessão no estado e no localStorage. Mescla sobre o que está salvo
  // porque o refresh silencioso (utils/api.js) troca os tokens direto no localStorage.
  const atualizarSessao = useCallback(patch => {
    setSession(s => s && { ...s, ...patch });
    if (sessionRef.current?.leitura) return; // modo leitura: nada vai para a sessão guardada no navegador
    try {
      const raw = localStorage.getItem("session");
      if (raw) localStorage.setItem("session", JSON.stringify({ ...JSON.parse(raw), ...patch }));
    } catch {}
  }, []);

  // A conta foi bloqueada no meio do uso (o teste acabou, a equipe suspendeu): troca para a tela de assinatura
  useEffect(() => {
    const aoBloquear = e => {
      const s = sessionRef.current;
      if (!s || s.leitura || s.tenant?.bloqueada) return;
      atualizarSessao({ tenant: { ...s.tenant, bloqueada: true, situacao: e.detail?.situacao || "suspenso" } });
    };
    window.addEventListener("conta-bloqueada", aoBloquear);
    return () => window.removeEventListener("conta-bloqueada", aoBloquear);
  }, [atualizarSessao]);

  const doLogin = (token, user, tenant, refreshToken) => {
    // tourPendente: o tour abre a cada login, até o usuário marcar "Não mostrar novamente"
    const s = { token, user, tenant, refreshToken, tourPendente: !user.ocultarTour };
    setSession(s);
    localStorage.setItem("session", JSON.stringify(s));
    navigate("/app/dashboard");
  };

  const testar = planoId => navigate("/registro", { state: { planoId: planoId || PLANO_DO_TESTE } });
  const landing = secao => (
    <Landing secaoInicial={secao} onTestar={testar} onLogin={() => navigate("/login")} />
  );

  const doLogout = () => {
    if (session?.leitura) { encerrarAcessoLeitura(); setSession(null); navigate("/"); return; } // não mexe na sessão guardada do navegador
    // Revoga refresh token no backend (best-effort, não bloqueia o logout)
    const raw = localStorage.getItem("session");
    if (raw) {
      try {
        const { refreshToken } = JSON.parse(raw);
        if (refreshToken) {
          fetch("/api/auth/logout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
          }).catch(() => {});
        }
      } catch {}
    }
    setSession(null);
    localStorage.removeItem("session");
    navigate("/");
  };

  return (
    <>
    <AvisoModal />
    <Routes>
      <Route path="/"        element={landing()} />
      <Route path="/login"   element={<Login onLogin={doLogin} onRegistro={() => testar()} />} />
      <Route path="/planos"  element={landing("precos")} />
      <Route path="/showcase" element={<Suspense fallback={null}><Showcase /></Suspense>} />
      <Route path="/registro" element={<Registro onCriada={doLogin} onLogin={() => navigate("/login")} onVerPlanos={() => navigate("/planos")} />} />
      <Route path="/app/*"   element={session ? <AppShell session={session} atualizarSessao={atualizarSessao} onLogout={doLogout} /> : <Navigate to="/login" replace />} />
      <Route path="*"        element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}
