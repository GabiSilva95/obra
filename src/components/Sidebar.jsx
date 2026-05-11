import { useState } from "react";
import { NavLink } from "react-router-dom";
import { C, F, FONT_URL } from "../constants/tokens";
import { PLANOS } from "../constants/data";
import Icon from "./ui/Icon";

const MENU = [
  { id: "dashboard",  label: "Dashboard",   icon: "dashboard",  perm: null },
  { id: "obras",      label: "Obras",        icon: "building",   perm: "obras" },
  { id: "diario",     label: "Diário",       icon: "book",       perm: "obras" },
  { id: "maquinas",   label: "Máquinas",     icon: "excavator",  perm: "maquinas" },
  { id: "cadastros",  label: "Cadastros",    icon: "checklist",  perm: null },
  { id: "estoque",    label: "Estoque",      icon: "warehouse",  perm: "estoque" },
  { id: "compras",    label: "Compras",      icon: "cube",       perm: "estoque" },
  { id: "alocacao",   label: "Alocação",     icon: "link",       perm: "alocacao" },
  { id: "financeiro", label: "Financeiro",   icon: "money",      perm: null },
  { id: "relatorios", label: "Relatórios",   icon: "barchart",   perm: "relatorios" },
  { id: "usuarios",   label: "Usuários",     icon: "key",        perm: "usuarios" },
];

function NavItem({ m }) {
  const [h, setH] = useState(false);
  return (
    <NavLink
      to={`/app/${m.id}`}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={({ isActive }) => ({
        display: "flex", alignItems: "center", gap: 10, padding: "8px 11px",
        borderRadius: 10, border: "none", width: "100%", textDecoration: "none",
        cursor: "pointer", transition: "all .15s",
        background: isActive ? "rgba(249,115,22,.1)" : h ? "rgba(255,255,255,.035)" : "transparent",
        borderLeft: `2px solid ${isActive ? C.orange : "transparent"}`,
      })}
    >
      {({ isActive }) => (
        <>
          <Icon n={m.icon} size={15} color={isActive ? C.orange : h ? "rgba(255,255,255,.6)" : C.muted} />
          <span style={{ fontSize: 12, fontWeight: isActive ? 600 : 500, color: isActive ? C.orange : h ? "rgba(255,255,255,.6)" : C.muted, ...F, letterSpacing: "-0.01em" }}>{m.label}</span>
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar({ user, onLogout, tenant, className }) {
  const allowed = MENU.filter(m => {
    if (!m.perm) return true;
    if (user.role === "tenant_admin") return true;
    if (m.perm === "usuarios") return false;
    return (user.permissoes || []).includes(m.perm);
  });
  const [h, setH] = useState(false);
  const plano = PLANOS.find(p => p.id === tenant?.plano);
  return (
    <>
      <link href={FONT_URL} rel="stylesheet" />
      <aside className={className} style={{ width: 210, minHeight: "100vh", display: "flex", flexDirection: "column", background: C.surface, borderRight: `1px solid ${C.borderLight}`, flexShrink: 0 }}>
        <div style={{ padding: "16px 16px 12px", borderBottom: `1px solid ${C.borderLight}` }}>
          <span style={{ fontWeight: 800, fontSize: 17, color: C.orange, letterSpacing: "-0.05em", ...F }}>obrasgest</span>
          {tenant && <div style={{ fontSize: 10, color: C.muted, marginTop: 3, ...F, letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tenant.razaoSocial}</div>}
          {plano && (
            <div style={{ marginTop: 5, display: "inline-flex", alignItems: "center", gap: 4, background: `${plano.cor}14`, border: `1px solid ${plano.cor}30`, borderRadius: 6, padding: "2px 7px" }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: plano.cor, flexShrink: 0 }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: plano.cor, letterSpacing: "0.04em", textTransform: "uppercase" }}>{plano.nome}</span>
            </div>
          )}
        </div>
        <nav style={{ flex: 1, padding: "8px 7px", display: "flex", flexDirection: "column", gap: 1, overflowY: "auto" }}>
          {allowed.map(m => <NavItem key={m.id} m={m} />)}
        </nav>
        <div style={{ padding: "10px 13px 14px", borderTop: `1px solid ${C.borderLight}` }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.55)", marginBottom: 1, ...F }}>{user.nome}</div>
          <div style={{ fontSize: 10, color: C.dim, marginBottom: 9, display: "flex", alignItems: "center", gap: 5 }}>
            <Icon n="shield" size={10} color={user.role === "tenant_admin" ? C.orange : C.dim} />
            <span>{user.role === "tenant_admin" ? "Administrador" : "Usuário"}</span>
          </div>
          <button
            onClick={onLogout}
            onMouseEnter={() => setH(true)}
            onMouseLeave={() => setH(false)}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: h ? "rgba(255,255,255,.5)" : C.dim, background: "none", border: "none", cursor: "pointer", transition: "color .15s", ...F, padding: 0 }}
          >
            <Icon n="logout" size={12} color={h ? "rgba(255,255,255,.5)" : C.dim} /> Sair
          </button>
        </div>
      </aside>
    </>
  );
}
