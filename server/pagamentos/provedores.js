// Provedores de pagamento. O sistema fala só com esta interface; trocar de gateway é escrever outro arquivo aqui.
//
//   id                       nome curto, gravado em Cobranca.gateway e em EventoPagamento.gateway
//   automatico               cobra sozinho (gera link) e avisa por webhook? `manual` não: a equipe registra o pagamento à mão
//   criarCobranca(c, empresa) -> { gatewayId?, linkPagamento? }       chamado ao criar uma cobrança
//   verificarWebhook(req)    -> boolean                              confere que o aviso veio mesmo do gateway (token ou assinatura)
//   interpretarWebhook(corpo)-> { eventoId, tipo, cobrancaExterna?, valor?, pagoEm?, forma? } | null
//        tipo: "pagamento_confirmado" | "pagamento_estornado" | "outro"; eventoId é a chave de idempotência do gateway.
//
// Gateway real: Stripe (cobrança recorrente no cartão). O mesmo evento pode chegar repetido ("ao menos uma vez") e fora de ordem:
// EventoPagamento resolve a repetição e as funções de sincronização (server/cobranca/gateway.js) só andam para a frente.
import { timingSafeEqual } from "node:crypto";
import { configStripe, interpretarEventoStripe, verificarAssinaturaStripe } from "./stripe.js";

const igual = (a, b) => {
  const x = Buffer.from(String(a ?? "")), y = Buffer.from(String(b ?? ""));
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
};

/** Sem gateway: a equipe confirma o pagamento no painel. Não gera link e não recebe webhook. */
export const manual = { id: "manual", automatico: false };

/**
 * Gateway de mentira, só para provar o webhook. Existe apenas fora de produção e com `PAGAMENTO_WEBHOOK_SEGREDO` definido;
 * o aviso traz o segredo no cabeçalho `x-falso-segredo`.
 */
export const falso = {
  id: "falso",
  automatico: true,
  async criarCobranca(c) {
    const gatewayId = `fk_${c.id}`;
    return { gatewayId, linkPagamento: `https://pagamento.exemplo.test/${gatewayId}` };
  },
  verificarWebhook(req) { return igual(req.headers["x-falso-segredo"], process.env.PAGAMENTO_WEBHOOK_SEGREDO); },
  interpretarWebhook(corpo) {
    if (!corpo || typeof corpo !== "object" || !corpo.id) return null;
    const tipos = { pagamento_confirmado: "pagamento_confirmado", pagamento_estornado: "pagamento_estornado" };
    return {
      eventoId: String(corpo.id), tipo: tipos[corpo.tipo] || "outro", cobrancaExterna: corpo.cobranca ? String(corpo.cobranca) : undefined,
      valor: corpo.valor != null ? Number(corpo.valor) : undefined, pagoEm: corpo.pagoEm, forma: corpo.forma,
    };
  },
};

/**
 * Stripe (Billing): a Stripe cobra o cartão todo mês ou ano e avisa por webhook. `criarCobranca` não existe de propósito:
 * as faturas nascem lá e entram aqui sozinhas (server/cobranca/gateway.js). Só vale com STRIPE_SECRET_KEY e STRIPE_WEBHOOK_SECRET.
 */
export const stripe = {
  id: "stripe",
  automatico: true,
  verificarWebhook(req) {
    return verificarAssinaturaStripe({ cabecalho: req.headers["stripe-signature"], corpo: req.rawBody, segredo: configStripe().segredoWebhook });
  },
  interpretarWebhook: interpretarEventoStripe,
};

const stripeDisponivel = () => { const c = configStripe(); return !!c.chave && !!c.segredoWebhook; };
const falsoDisponivel = () => process.env.NODE_ENV !== "production" && !!process.env.PAGAMENTO_WEBHOOK_SEGREDO;

/** O provedor com esse id, se estiver disponível neste ambiente. */
export function obterProvedor(id) {
  if (id === "manual") return manual;
  if (id === "falso" && falsoDisponivel()) return falso;
  if (id === "stripe" && stripeDisponivel()) return stripe;
  return null;
}

/** O provedor que cobra as empresas (`PAGAMENTO_GATEWAY`, padrão `manual`). Um nome desconhecido cai no manual. */
export function provedorAtivo() {
  const nome = process.env.PAGAMENTO_GATEWAY || "manual";
  const p = obterProvedor(nome);
  if (!p) console.error(`[pagamentos] PAGAMENTO_GATEWAY="${nome}" não está disponível: usando "manual".`);
  return p || manual;
}
