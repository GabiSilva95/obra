import { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Header, MobileTabBar, Modal, Sidebar, Tag, useIsMobile } from "../../design-system";
import logoNegativo from "../../design-system/assets/logo-negativo.svg";
import { PageActionsContext } from "../components/PageActions";
import { menuPermitido } from "./menu";
import TrocarSenha from "./TrocarSenha";
import Atendimento from "./paginas/Atendimento";
import Chamados from "./paginas/Chamados";
import Clientes from "./paginas/Clientes";
import DetalheCliente from "./paginas/DetalheCliente";
import Financeiro from "./paginas/Financeiro";
import VisaoGeral from "./paginas/VisaoGeral";
import PainelSino from "./PainelSino";
import Equipe from "./paginas/Equipe";
import Auditoria from "./paginas/Auditoria";

const SEM_ACESSO = (
  <div style={{ display: "flex", justifyContent: "center", paddingTop: "var(--space-12)", color: "var(--text-secondary)", fontSize: "var(--fs-p5-5)" }}>Acesso não permitido.</div>
);

/** Casca do painel: menu pelas permissões da pessoa, cabeçalho e a área da página. */
export default function Casca({ sessao, api, guardar, onSair }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const mobile = useIsMobile();
  const [recolhido, setRecolhido] = useState(false);
  const [gaveta, setGaveta] = useState(false);
  const [acoesEl, setAcoesEl] = useState(null);
  const [trocandoSenha, setTrocandoSenha] = useState(false);
  const equipe = sessao.equipe;

  // Permissões podem mudar a qualquer momento (o administrador altera): relê de tempos em tempos
  useEffect(() => {
    let vivo = true;
    const ler = () => api.get("/painel/auth/me").then(e => { if (vivo) guardar({ ...sessao, equipe: { ...sessao.equipe, ...e } }); }).catch(() => {});
    const t = setInterval(ler, 60000);
    return () => { vivo = false; clearInterval(t); };
  }, []); // eslint-disable-line

  const menu = useMemo(() => menuPermitido(equipe), [equipe]);
  const ativo = pathname.split("/")[1] || "";
  const titulo = menu.find(m => m.id === ativo)?.title || "";
  const ir = id => {
    if (id === "menu") return setGaveta(true);
    setGaveta(false);
    if (id === "sair") return onSair();
    if (id === "senha") return setTrocandoSenha(true);
    navigate(`/${id}`);
  };

  const itens = menu.map(({ id, label, icon }) => ({ id, label, icon }));
  const rodape = [{ id: "senha", label: "Trocar senha", icon: "key" }, { id: "sair", label: "Sair", icon: "log-out" }];
  const barraSidebar = (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", padding: "0 var(--space-3)" }}>
      <span style={{ fontSize: "var(--fs-p6)", color: "var(--text-on-sidebar-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{equipe.nome}</span>
      <Tag tone="accent" style={{ alignSelf: "flex-start" }}>Painel da equipe</Tag>
    </div>
  );
  const sidebar = estilo => (
    <Sidebar logoSrc={logoNegativo} items={itens} footerItems={rodape} footer={barraSidebar} activeId={ativo} onSelect={ir}
      collapsed={mobile ? false : recolhido} onToggle={() => setRecolhido(c => !c)} onClose={() => setGaveta(false)} style={estilo} />
  );

  const cabecalho = (
    <Header title={titulo} user={{ name: equipe.nome, role: equipe.papel === "equipe_admin" ? "Administrador" : "Equipe" }} search="none" messages={false} compact={mobile}
      notificationsSlot={<PainelSino api={api} />}
      onMenu={mobile ? () => setGaveta(true) : undefined}
      actions={mobile ? undefined : <div ref={setAcoesEl} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap", justifyContent: "flex-end", flex: "0 1 auto", minWidth: 0 }} />} />
  );

  const rotas = (
    <Routes>
      <Route index element={menu[0] ? <Navigate to={`/${menu[0].id}`} replace /> : SEM_ACESSO} />
      <Route path="atendimento" element={menu.some(m => m.id === "atendimento") ? <Atendimento api={api} equipe={equipe} /> : SEM_ACESSO} />
      <Route path="chamados" element={menu.some(m => m.id === "chamados") ? <Chamados api={api} equipe={equipe} /> : SEM_ACESSO} />
      <Route path="chamados/:id" element={menu.some(m => m.id === "chamados") ? <Chamados api={api} equipe={equipe} /> : SEM_ACESSO} />
      <Route path="clientes" element={menu.some(m => m.id === "clientes") ? <Clientes api={api} /> : SEM_ACESSO} />
      <Route path="clientes/:id" element={menu.some(m => m.id === "clientes") ? <DetalheCliente api={api} equipe={equipe} /> : SEM_ACESSO} />
      <Route path="visao-geral" element={menu.some(m => m.id === "visao-geral") ? <VisaoGeral api={api} /> : SEM_ACESSO} />
      <Route path="financeiro" element={menu.some(m => m.id === "financeiro") ? <Financeiro api={api} /> : SEM_ACESSO} />
      <Route path="equipe" element={menu.some(m => m.id === "equipe") ? <Equipe api={api} equipe={equipe} /> : SEM_ACESSO} />
      <Route path="auditoria" element={menu.some(m => m.id === "auditoria") ? <Auditoria api={api} /> : SEM_ACESSO} />
      <Route path="*" element={menu[0] ? <Navigate to={`/${menu[0].id}`} replace /> : SEM_ACESSO} />
    </Routes>
  );

  const abas = [...itens.slice(0, 4), { id: "menu", label: "Menu", icon: "menu" }];
  return (
    <PageActionsContext.Provider value={acoesEl}>
      {trocandoSenha && (
        <Modal title="Trocar senha" onClose={() => setTrocandoSenha(false)}>
          <TrocarSenha api={api} onCancelar={() => setTrocandoSenha(false)} onTrocou={nova => { guardar(nova); setTrocandoSenha(false); }} />
        </Modal>
      )}
      {mobile ? (
        <div style={{ minHeight: "100vh", paddingBottom: "calc(var(--mobile-tabbar-height) + var(--space-4))" }}>
          <div style={{ position: "sticky", top: 0, zIndex: "var(--z-sticky)", background: "var(--bg-app)", padding: "0 var(--space-4)" }}>{cabecalho}</div>
          <main style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-4)", minWidth: 0 }}>
            <div ref={setAcoesEl} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }} />
            {rotas}
          </main>
          <MobileTabBar items={abas} activeId={abas.some(a => a.id === ativo) ? ativo : "menu"} onSelect={ir} style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: "var(--z-tabbar)" }} />
          {gaveta && (
            <div onClick={() => setGaveta(false)} style={{ position: "fixed", inset: 0, zIndex: "var(--z-drawer)", background: "var(--scrim)", backdropFilter: "blur(var(--blur-scrim))" }}>
              <div onClick={e => e.stopPropagation()} style={{ position: "absolute", top: "var(--space-2)", bottom: "var(--space-2)", left: "var(--space-2)" }}>
                {sidebar({ width: "min(var(--sidebar-width), calc(100vw - var(--space-12)))" })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", gap: "var(--space-8)", padding: "var(--space-4)", minHeight: "100vh", alignItems: "flex-start" }}>
          <div style={{ position: "sticky", top: "var(--space-4)", height: "calc(100vh - 2 * var(--space-4))" }}>{sidebar()}</div>
          <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "var(--space-6)", paddingRight: "var(--space-4)", paddingBottom: "var(--space-8)" }}>
            {cabecalho}
            {rotas}
          </main>
        </div>
      )}
    </PageActionsContext.Provider>
  );
}
