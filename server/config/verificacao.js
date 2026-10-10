// Regras puras da conferência de configuração (scripts/configuracao/verificar.mjs): recebem o que os provedores devolveram e dizem o que falta.
import { EVENTOS_STRIPE } from "../pagamentos/stripe.js";

const semBarra = s => String(s ?? "").replace(/\/+$/, "");

/** O endpoint do Stripe aponta para o nosso webhook, está ativo e assina todos os eventos de que precisamos? */
export function avaliarWebhookStripe(endpoints, appUrl) {
  const url = `${semBarra(appUrl)}/api/pagamentos/webhook/stripe`;
  const e = (endpoints ?? []).find(x => semBarra(x.url) === url);
  if (!e) return { ok: false, mensagem: `Nenhum endpoint de webhook para ${url}. Crie um no painel do Stripe (Desenvolvedores, Webhooks).` };
  if (e.status && e.status !== "enabled") return { ok: false, mensagem: `O endpoint ${url} existe, mas está ${e.status}.` };
  const assina = e.enabled_events ?? [];
  const faltam = assina.includes("*") ? [] : EVENTOS_STRIPE.filter(ev => !assina.includes(ev));
  return faltam.length ? { ok: false, mensagem: `O endpoint não assina: ${faltam.join(", ")}.` } : { ok: true, mensagem: `Endpoint ${url} ativo, com os ${EVENTOS_STRIPE.length} eventos.` };
}

/** Há alguma configuração ativa do portal do cliente (trocar cartão, ver faturas, cancelar)? */
export const avaliarPortalStripe = configuracoes => ((configuracoes ?? []).some(c => c.active !== false)
  ? { ok: true, mensagem: "Portal do cliente configurado." }
  : { ok: false, mensagem: "O portal do cliente não está configurado: ative em Configurações, Billing, Portal do cliente. Sem ele, o botão Gerenciar pagamento falha." });

/** O domínio do remetente existe no Resend, está verificado e pode enviar? */
export function avaliarDominioDeEnvio(dominios, remetente) {
  const email = /<([^>]+)>/.exec(String(remetente))?.[1] ?? String(remetente);
  const dominio = email.split("@")[1]?.toLowerCase();
  if (!dominio) return { ok: false, mensagem: "EMAIL_REMETENTE não tem um endereço válido (use \"Nome <e-mail@dominio>\")." };
  const d = (dominios ?? []).find(x => x.name?.toLowerCase() === dominio);
  if (!d) return { ok: false, mensagem: `O domínio ${dominio} não está no Resend. Adicione e verifique no painel (Domains).` };
  if (d.status !== "verified") return { ok: false, mensagem: `O domínio ${dominio} está "${d.status}": falta confirmar os registros de DNS no Resend.` };
  if (d.capabilities?.sending && d.capabilities.sending !== "enabled") return { ok: false, mensagem: `O domínio ${dominio} não está habilitado para envio.` };
  return { ok: true, mensagem: `Domínio ${dominio} verificado para envio.` };
}

/** Onde chegam as respostas: o endereço do Resend (<id>.resend.app, sem DNS) ou um domínio seu com recebimento habilitado e verificado. */
export function avaliarDominioDeRecebimento(dominios, dominioRecebimento) {
  const dom = String(dominioRecebimento ?? "").toLowerCase();
  if (!dom) return { ok: false, mensagem: "EMAIL_RECEBIMENTO_DOMINIO não está definido: os e-mails sairão pedindo para responder no sistema." };
  if (dom.endsWith(".resend.app")) return { ok: true, mensagem: `Recebimento pelo endereço do Resend (${dom}), sem DNS.` };
  const d = (dominios ?? []).find(x => x.name?.toLowerCase() === dom);
  if (!d) return { ok: false, mensagem: `O domínio ${dom} não está no Resend. Adicione-o (ou use o <id>.resend.app da conta).` };
  if (d.status !== "verified") return { ok: false, mensagem: `O domínio ${dom} está "${d.status}": falta confirmar o DNS.` };
  if (d.capabilities?.receiving !== "enabled") return { ok: false, mensagem: `O domínio ${dom} não está com o recebimento habilitado no Resend (e falta o registro MX).` };
  return { ok: true, mensagem: `Domínio ${dom} verificado para receber.` };
}

/** O webhook do Resend aponta para o nosso endereço, está ativo e assina `email.received`? */
export function avaliarWebhookResend(webhooks, appUrl) {
  const url = `${semBarra(appUrl)}/api/email/webhook/resend`;
  const w = (webhooks ?? []).find(x => semBarra(x.endpoint) === url);
  if (!w) return { ok: false, mensagem: `Nenhum webhook para ${url}. Crie no painel do Resend (Webhooks) com o evento email.received.` };
  if (w.status && w.status !== "enabled") return { ok: false, mensagem: `O webhook ${url} existe, mas está ${w.status}.` };
  if (!(w.events ?? []).includes("email.received")) return { ok: false, mensagem: "O webhook não assina o evento email.received." };
  return { ok: true, mensagem: `Webhook ${url} ativo, com email.received.` };
}

/** Modo da chave do Stripe, pelo prefixo: nunca devolve a chave. */
export const modoDaChaveStripe = chave => (/^(sk|rk)_test_/.test(chave ?? "") ? "teste" : /^(sk|rk)_live_/.test(chave ?? "") ? "produção" : "desconhecido");
