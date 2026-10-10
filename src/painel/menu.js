import { temPermissao } from "../../server/config/painel.js";

// Telas do painel e a permissão que cada uma exige. O título aparece no cabeçalho. A primeira que a pessoa pode ver é a que abre ao entrar.
export const MENU_PAINEL = [
  // Visão geral: para quem acompanha clientes ou dinheiro. Quem só atende já vê o próprio painel em Atendimento.
  { id: "visao-geral", label: "Visão geral", title: "Visão geral", icon: "chart-column", visivel: eq => temPermissao(eq, "clientes") || temPermissao(eq, "financeiro") },
  { id: "atendimento", label: "Atendimento", title: "Atendimento", icon: "message-circle", perm: "suporte" },
  { id: "chamados", label: "Chamados", title: "Chamados", icon: "clipboard-list", perm: "suporte" },
  { id: "clientes", label: "Clientes", title: "Clientes", icon: "building-2", perm: "clientes" },
  { id: "financeiro", label: "Financeiro", title: "Financeiro", icon: "wallet", perm: "financeiro" },
  { id: "equipe", label: "Equipe", title: "Equipe", icon: "users", perm: "equipe" },
  { id: "auditoria", label: "Auditoria", title: "Auditoria", icon: "shield-check", perm: "equipe" },
];

export const menuPermitido = equipe => MENU_PAINEL.filter(m => (m.visivel ? m.visivel(equipe) : temPermissao(equipe, m.perm)));
