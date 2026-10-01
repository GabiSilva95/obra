import { Sidebar, Tag } from "../../design-system";
import logoNegativo from "../../design-system/assets/logo-negativo.svg";
import { planoPorId } from "../constants/data";

export const MENU = [
  { id: "dashboard",  label: "Início",      title: "Início",          icon: "layout-grid",    perm: null },
  { id: "obras",      label: "Obras",       title: "Obras",           icon: "building-2",     perm: "obras" },
  { id: "diario",     label: "Diário",      title: "Diário de obra",  icon: "book-open",      perm: "obras" },
  { id: "maquinas",   label: "Máquinas",    title: "Máquinas",        icon: "construction",   perm: "maquinas" },
  { id: "cadastros",  label: "Cadastros",   title: "Cadastros",       icon: "clipboard-list", perm: null },
  { id: "estoque",    label: "Estoque",     title: "Estoque",         icon: "warehouse",      perm: "estoque" },
  { id: "compras",    label: "Compras",     title: "Compras",         icon: "package",        perm: "estoque" },
  { id: "alocacao",   label: "Alocação",    title: "Alocação",        icon: "link",           perm: "alocacao" },
  { id: "financeiro", label: "Financeiro",  title: "Financeiro",      icon: "wallet",         perm: null },
  { id: "relatorios", label: "Relatórios",  title: "Relatórios",      icon: "chart-column",   perm: "relatorios" },
  { id: "usuarios",   label: "Usuários",    title: "Usuários",        icon: "users",          perm: "usuarios" },
];

// Mobile bottom bar: top destinations + "Menu" (opens the sidebar drawer).
export const TAB_IDS = ["dashboard", "obras", "estoque", "alocacao"];

export function allowedMenu(user) {
  const isAdmin = user.role === "tenant_admin";
  return MENU.filter(m => !m.perm || isAdmin || (m.perm !== "usuarios" && (user.permissoes || []).includes(m.perm)));
}

export default function AppSidebar({ user, tenant, activeId, onSelect, collapsed, onToggle, onClose, style }) {
  const plano = planoPorId(tenant?.plano);
  const footer = tenant && (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", padding: "0 var(--space-3)" }}>
      <span style={{ fontSize: "var(--fs-p6)", color: "var(--text-on-sidebar-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tenant.razaoSocial}</span>
      {plano && <Tag tone="accent" style={{ alignSelf: "flex-start" }}>Plano {plano.nome}</Tag>}
    </div>
  );
  return (
    <Sidebar
      logoSrc={logoNegativo}
      items={allowedMenu(user).map(({ id, label, icon }) => ({ id, label, icon }))}
      footerItems={[{ id: "sair", label: "Sair", icon: "log-out" }]}
      footer={footer}
      activeId={activeId}
      onSelect={onSelect}
      collapsed={collapsed}
      onToggle={onToggle}
      onClose={onClose}
      style={style}
    />
  );
}
