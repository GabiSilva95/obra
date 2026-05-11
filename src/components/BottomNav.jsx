import { NavLink } from "react-router-dom";
import { C, F } from "../constants/tokens";
import Icon from "./ui/Icon";

const MENU = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard", perm: null },
  { id: "obras",     label: "Obras",     icon: "building",  perm: "obras" },
  { id: "estoque",   label: "Estoque",   icon: "warehouse", perm: "estoque" },
  { id: "alocacao",  label: "Alocação",  icon: "link",      perm: "alocacao" },
  { id: "cadastros", label: "Mais",      icon: "checklist", perm: null },
];

export default function BottomNav({ user, className }) {
  const isAdmin = user.role === "tenant_admin";
  const has = p => isAdmin || (user.permissoes || []).includes(p);

  const allowed = MENU.filter(m => !m.perm || has(m.perm));

  return (
    <nav
      className={className}
      style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
        background: C.surface, borderTop: `1px solid ${C.borderLight}`,
        display: "flex", alignItems: "stretch",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        ...F,
      }}
    >
      {allowed.map(m => (
        <NavLink
          key={m.id}
          to={`/app/${m.id}`}
          style={({ isActive }) => ({
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: 3, padding: "8px 4px 6px",
            textDecoration: "none", color: isActive ? C.orange : C.dim,
            borderTop: `2px solid ${isActive ? C.orange : "transparent"}`,
            fontSize: 9, fontWeight: isActive ? 700 : 500, letterSpacing: "0.02em",
            transition: "all .15s",
          })}
        >
          {({ isActive }) => (
            <>
              <Icon n={m.icon} size={18} color={isActive ? C.orange : C.dim} />
              <span>{m.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
