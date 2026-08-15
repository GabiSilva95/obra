import { useState, useEffect, useCallback } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { C, F, FONT_URL } from "./constants/tokens";
import createApi from "./utils/api.js";
import Sidebar from "./components/Sidebar";
import AvisoModal from "./components/AvisoModal";
import { onLimiteAtingido, LABELS_RECURSO, ACAO_RECURSO } from "./utils/planoLimite";
import { avisar } from "./utils/aviso";
import BottomNav from "./components/BottomNav";
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

function normalizeData(raw) {
  const { obras, maquinas, funcionarios, insumos, estoques, alocacoes, tiposEtapa, users, diario, receitas, compras, categoriasMaquina, tiposObra, consumos, apontamentos, despesas } = raw;
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
  };
}

function TopBar({ user, data, onLogout }) {
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(6,8,16,.9)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${C.borderLight}`, padding: "10px 24px", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10 }}>
      <Notificacoes data={data} />
      <div style={{ width: 1, height: 20, background: C.borderLight }} />
      <div style={{ fontSize: 12, color: C.muted, ...F }}>{user.nome}</div>
      <button onClick={onLogout} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.dim} strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
      </button>
    </div>
  );
}

function AppShell({ session, setSession }) {
  const navigate = useNavigate();
  const api = createApi(session.token);

  const [data, setData] = useState(null);
  const [loadErr, setLoadErr] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [obras, maquinas, funcionarios, insumos, estoques, alocacoes, tiposEtapa, users, diario, receitas, compras, categoriasMaquina, tiposObra, consumos, apontamentos, despesas] = await Promise.all([
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
        // Endpoints adicionados na Etapa 3 — fallback [] para compatibilidade
        // com servidores ainda não atualizados (local sem restart ou pré-deploy)
        api.get("/cadastros/categorias-maquina").catch(() => []),
        api.get("/cadastros/tipos-obra").catch(() => []),
        api.get("/estoque/consumos").catch(() => []),
        api.get("/apontamentos").catch(() => []),
        api.get("/despesas").catch(() => []),
      ]);
      setData(normalizeData({ obras, maquinas, funcionarios, insumos, estoques, alocacoes, tiposEtapa, users, diario, receitas, compras, categoriasMaquina, tiposObra, consumos, apontamentos, despesas }));
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

  const styleInner = { maxWidth: 1280, margin: "0 auto", padding: "20px 24px", paddingBottom: 80 };
  const denied = <div style={{ display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 120, color: C.dim, fontSize: 13 }}>Acesso não permitido.</div>;
  const loading = <div style={{ display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 120, color: C.dim, fontSize: 13 }}>Carregando...</div>;

  if (loadErr) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: C.red, fontSize: 13, flexDirection: "column", gap: 12 }}>
      <span>Erro ao carregar dados: {loadErr}</span>
      <button onClick={loadData} style={{ color: C.orange, background: "none", border: "1px solid", borderRadius: 8, padding: "6px 16px", cursor: "pointer" }}>Tentar novamente</button>
    </div>
  );

  return (
    <>
      <link href={FONT_URL} rel="stylesheet" />
      <style>{`*{box-sizing:border-box;margin:0;padding:0}body{background:${C.bg}}::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${C.border};border-radius:8px}::-webkit-scrollbar-thumb:hover{background:#383838}input[type=range]{accent-color:${C.orange}}option{background:#1a1a1a;color:#f0f0f0}`}</style>
      <style>{`
        @media(max-width:768px){
          .app-sidebar{display:none!important}
          .app-bottomnav{display:flex!important}
          .app-topbar{display:flex!important}
          .page-inner{padding:14px 12px 80px!important}
        }
        @media(min-width:769px){
          .app-bottomnav{display:none!important}
          .app-topbar{display:none!important}
        }
      `}</style>
      <div style={{ display: "flex", minHeight: "100vh", background: C.bg, ...F }}>
        <Sidebar user={user} onLogout={doLogout} tenant={tenant} className="app-sidebar" />
        <BottomNav user={user} className="app-bottomnav" />
        <main style={{ flex: 1, overflowY: "auto", minHeight: "100vh" }}>
          <TopBar user={user} data={data} onLogout={doLogout} />
          <div className="page-inner" style={styleInner}>
            {!data ? loading : (
              <Routes>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard"  element={<Dashboard data={data} userId={user.id} isMaster={isAdmin} />} />
                <Route path="obras"      element={has("obras")       ? <Obras      {...sharedProps} canWrite={has("obras")}       /> : denied} />
                <Route path="maquinas"   element={has("maquinas")    ? <Maquinas   {...sharedProps} canWrite={has("maquinas")}    /> : denied} />
                <Route path="cadastros"  element={<Cadastros {...sharedProps} canWrite={has("cadastros")} />} />
                <Route path="estoque"    element={has("estoque")     ? <Estoque    {...sharedProps} canWrite={has("estoque")}     /> : denied} />
                <Route path="alocacao"   element={has("alocacao")    ? <Alocacao   {...sharedProps} canWrite={has("alocacao")}    /> : denied} />
                <Route path="relatorios" element={has("relatorios")  ? <Relatorios data={data} />                                  : denied} />
                <Route path="usuarios"   element={isAdmin            ? <Usuarios   {...sharedProps} tenant={tenant} setTenant={t => setSession(s => ({ ...s, tenant: t }))} /> : denied} />
                <Route path="diario"     element={<Diario    {...sharedProps} canWrite={isAdmin || has("obras")} />} />
                <Route path="financeiro" element={<Financeiro {...sharedProps} canWrite={isAdmin} />} />
                <Route path="compras"    element={<Compras   {...sharedProps} canWrite={isAdmin || has("estoque")} />} />
                <Route path="*"          element={<Navigate to="dashboard" replace />} />
              </Routes>
            )}
          </div>
        </main>
      </div>
    </>
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
      <Route path="/registro" element={<Registro onVoltar={() => navigate("/login")} onVerPlanos={() => navigate("/planos")} />} />
      <Route path="/app/*"   element={session ? <AppShell session={session} setSession={setSession} /> : <Navigate to="/login" replace />} />
      <Route path="*"        element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}
