import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { Button, Header, MobileTabBar, useIsMobile } from "../design-system";
import createApi from "./utils/api.js";
import AppSidebar, { MENU, TAB_IDS, allowedMenu } from "./components/Sidebar";
import { PageActionsContext } from "./components/PageActions";
import AvisoModal from "./components/AvisoModal";
import { planoPorId } from "./constants/data";
import { onLimiteAtingido, LABELS_RECURSO, ACAO_RECURSO } from "./utils/planoLimite";
import { avisar } from "./utils/aviso";
import Notificacoes from "./components/Notificacoes";
import Login from "./pages/Login";
import Registro from "./pages/Registro";
import PlanosPage from "./pages/PlanosPage";
import Dashboard from "./pages/Dashboard";
import Obras from "./pages/Obras";
import Cadastros, { Maquinas } from "./pages/Cadastros";
import Estoque from "./pages/Estoque";
import Alocacao from "./pages/Alocacao";
import Relatorios from "./pages/Relatorios";
import Usuarios from "./pages/Usuarios";
import Diario from "./pages/Diario";
import Financeiro from "./pages/Financeiro";
import Compras from "./pages/Compras";

const Showcase = lazy(() => import("../design-system/showcase/Showcase"));

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

function AppShell({ session, setSession }) {
  const navigate = useNavigate();
  const api = createApi(session.token);

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
      setLoadErr(e.message);
    }
  }, [session.token]); // eslint-disable-line

  useEffect(() => { loadData(); }, [loadData]);


  const doLogout = () => { setSession(null); navigate("/"); };

  const user = session.user;
  const tenant = session.tenant;

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
      acao: { rotulo: "Ver planos", onClick: () => navigate("/planos") },
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
  const headerUser = { name: user.nome, role: (isAdmin ? "Administrador" : "Usuário") + plano };
  const go = id => {
    if (id === "menu") { setDrawer(true); return; }
    setDrawer(false);
    if (id === "sair") doLogout(); else navigate(`/app/${id}`);
  };
  const tabs = [...allowedMenu(user).filter(m => TAB_IDS.includes(m.id)), { id: "menu", label: "Menu", icon: "menu" }]
    .map(({ id, label, icon }) => ({ id, label, icon }));

  const message = (text, color = "var(--text-secondary)") => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", paddingTop: "var(--space-12)", color, fontSize: "var(--fs-p5-5)" }}>{text}</div>
  );

  if (loadErr) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: "var(--status-danger)", fontSize: "var(--fs-p5-5)", flexDirection: "column", gap: "var(--space-3)" }}>
      <span>Erro ao carregar dados: {loadErr}</span>
      <Button variant="secondary" iconLeft="clock" onClick={loadData}>Tentar novamente</Button>
    </div>
  );

  const routes = !data ? message("Carregando…") : (
    <Routes>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard"  element={<Dashboard data={data} userId={user.id} isMaster={isAdmin} />} />
      <Route path="obras"      element={has("obras")       ? <Obras      {...sharedProps} canWrite={has("obras")}       /> : message("Acesso não permitido.")} />
      <Route path="maquinas"   element={has("maquinas")    ? <Maquinas   {...sharedProps} canWrite={has("maquinas")}    /> : message("Acesso não permitido.")} />
      <Route path="cadastros"  element={<Cadastros {...sharedProps} canWrite={has("cadastros")} />} />
      <Route path="estoque"    element={has("estoque")     ? <Estoque    {...sharedProps} canWrite={has("estoque")}     /> : message("Acesso não permitido.")} />
      <Route path="alocacao"   element={has("alocacao")    ? <Alocacao   {...sharedProps} canWrite={has("alocacao")}    /> : message("Acesso não permitido.")} />
      <Route path="relatorios" element={has("relatorios")  ? <Relatorios data={data} />                                  : message("Acesso não permitido.")} />
      <Route path="usuarios"   element={isAdmin            ? <Usuarios   {...sharedProps} tenant={tenant} setTenant={t => setSession(s => ({ ...s, tenant: t }))} /> : message("Acesso não permitido.")} />
      <Route path="diario"     element={<Diario    {...sharedProps} canWrite={isAdmin || has("obras")} />} />
      <Route path="financeiro" element={<Financeiro {...sharedProps} canWrite={isAdmin} />} />
      <Route path="compras"    element={<Compras   {...sharedProps} canWrite={isAdmin || has("estoque")} />} />
      <Route path="*"          element={<Navigate to="dashboard" replace />} />
    </Routes>
  );

  const actionsSlot = <div ref={setActionsEl} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap", justifyContent: isMobile ? "flex-start" : "flex-end", flex: "0 1 auto", minWidth: 0 }} />;
  const header = (
    <Header title={title} user={headerUser} search="none" messages={false} compact={isMobile}
      onMenu={isMobile ? () => setDrawer(true) : undefined}
      actions={isMobile ? undefined : actionsSlot}
      notificationsSlot={<Notificacoes data={data} />} />
  );

  return (
    <PageActionsContext.Provider value={actionsEl}>
      <style>{`*{margin:0;padding: 0}::-webkit-scrollbar{width:var(--space-1-5);height:var(--space-1-5)}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:var(--border-default);border-radius:var(--radius-sm)}::-webkit-scrollbar-thumb:hover{background:var(--border-strong)}input[type=range]{accent-color:var(--accent)}`}</style>
      {isMobile ? (
        <div style={{ minHeight: "100vh", paddingBottom: "calc(var(--mobile-tabbar-height) + var(--space-4))" }}>
          <div style={{ position: "sticky", top: 0, zIndex: "var(--z-sticky)", background: "var(--bg-app)", padding: "0 var(--space-4)" }}>{header}</div>
          <main style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-4)", minWidth: 0 }}>
            {actionsSlot}
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
            {routes}
          </main>
        </div>
      )}
    </PageActionsContext.Provider>
  );
}

export default function App() {
  const [session, setSession] = useState(() => {
    try {
      const s = localStorage.getItem("session");
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  });
  const navigate = useNavigate();

  const doLogin = (token, user, tenant, refreshToken) => {
    const s = { token, user, tenant, refreshToken };
    setSession(s);
    localStorage.setItem("session", JSON.stringify(s));
    navigate("/app/dashboard");
  };

  const doLogout = () => {
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
      <Route path="/"        element={<PlanosPage onEscolher={id => navigate("/registro", { state: { planoId: id } })} onLogin={() => navigate("/login")} />} />
      <Route path="/login"   element={<Login onLogin={doLogin} onRegistro={() => navigate("/planos")} />} />
      <Route path="/planos"  element={<PlanosPage onEscolher={id => navigate("/registro", { state: { planoId: id } })} onLogin={() => navigate("/login")} />} />
      <Route path="/showcase" element={<Suspense fallback={null}><Showcase /></Suspense>} />
      <Route path="/registro" element={<Registro onVoltar={() => navigate("/login")} onVerPlanos={() => navigate("/planos")} />} />
      <Route path="/app/*"   element={session ? <AppShell session={session} setSession={setSession} /> : <Navigate to="/login" replace />} />
      <Route path="*"        element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}
