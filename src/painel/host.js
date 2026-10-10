// O painel da equipe é outro sistema que mora no mesmo aplicativo: abre quando o endereço começa com "painel."
// (painel.construktpro.com.br em produção, painel.localhost:3000 no desenvolvimento). Em qualquer outro endereço,
// o painel nem é carregado: o código dele fica num pacote à parte.
export const ehHostDoPainel = host => /^painel\./i.test(String(host ?? ""));

/** Endereço do sistema do cliente a partir do endereço do painel (painel.exemplo.com → exemplo.com; painel.localhost:3000 → localhost:3000). */
export const urlDoCliente = (loc = window.location) => `${loc.protocol}//${loc.host.replace(/^painel\./i, "")}`;
