// Stripe: cliente da API (sem SDK: formulário + fetch), verificação de assinatura do webhook e tradução dos eventos para o que o sistema entende.
// Cobrança recorrente por cartão (Stripe Billing): o cliente assina pelo Checkout e a Stripe cobra todo mês ou ano; as faturas voltam por webhook.
// Observação da documentação (outubro/2026): para contas Stripe no Brasil o Pix Automático não está disponível, então a recorrência é no cartão.
import { createHmac, timingSafeEqual } from "node:crypto";
import { hojeBR } from "../utils/datas.js";
import { referenciaDe } from "../config/cobranca.js";

/** Os eventos que o endpoint de webhook do Stripe precisa assinar (o sistema ignora o resto). */
export const EVENTOS_STRIPE = [
  "checkout.session.completed", "invoice.finalized", "invoice.paid", "invoice.payment_failed", "invoice.voided",
  "invoice.marked_uncollectible", "customer.subscription.updated", "customer.subscription.deleted",
];

export class ErroGateway extends Error {
  constructor(mensagem, status = 0, codigo = null) { super(mensagem); this.status = status; this.codigo = codigo; }
}

/** Variáveis: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, APP_URL (para os retornos do Checkout e do portal). */
export function configStripe(env = process.env) {
  return {
    chave: env.STRIPE_SECRET_KEY || "",
    segredoWebhook: env.STRIPE_WEBHOOK_SECRET || "",
    appUrl: (env.APP_URL || env.FRONTEND_URL || "").replace(/\/+$/, ""),
    base: (env.NODE_ENV !== "production" && env.STRIPE_API_BASE) || "https://api.stripe.com",
    pronto: !!env.STRIPE_SECRET_KEY && !!env.STRIPE_WEBHOOK_SECRET && !!(env.APP_URL || env.FRONTEND_URL),
  };
}

// ─── Corpo de formulário no formato da Stripe: objetos viram a[b], listas viram a[0] ─────────────────────────────

export function codificarForm(obj) {
  const partes = [];
  const por = (valor, chave) => {
    if (valor === undefined || valor === null) return;
    if (Array.isArray(valor)) valor.forEach((v, i) => por(v, `${chave}[${i}]`));
    else if (typeof valor === "object") for (const [k, v] of Object.entries(valor)) por(v, chave ? `${chave}[${k}]` : k);
    else partes.push(`${encodeURIComponent(chave)}=${encodeURIComponent(String(valor))}`);
  };
  por(obj, "");
  return partes.join("&");
}

async function chamar(metodo, caminho, params, { chaveIdempotencia } = {}) {
  const cfg = configStripe();
  const r = await fetch(`${cfg.base}${caminho}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${cfg.chave}`, "Content-Type": "application/x-www-form-urlencoded", ...(chaveIdempotencia ? { "Idempotency-Key": String(chaveIdempotencia).slice(0, 255) } : {}) },
    body: metodo === "GET" ? undefined : codificarForm(params ?? {}),
    signal: AbortSignal.timeout(15000),
  });
  let dados = {};
  try { dados = await r.json(); } catch { /* vazio */ }
  if (!r.ok) throw new ErroGateway(`Stripe ${r.status}: ${dados.error?.message || "erro"}`, r.status, dados.error?.code ?? null);
  return dados;
}

const INTERVALO = { mensal: "month", anual: "year" };
const precoDe = (valorCent, ciclo, nomeProduto) => ({ currency: "brl", unit_amount: valorCent, recurring: { interval: INTERVALO[ciclo] }, product_data: { name: nomeProduto } });

export const stripeApi = {
  /** Um cliente por empresa. A chave de idempotência evita dois clientes se o administrador clicar duas vezes. */
  criarCliente: ({ email, nome, tenantId }) => chamar("POST", "/v1/customers", { email, name: nome, metadata: { tenantId } }, { chaveIdempotencia: `cliente-${tenantId}` }),
  /** Checkout hospedado em modo assinatura: a Stripe coleta o cartão e cria a assinatura recorrente. */
  criarCheckout: ({ clienteId, nomeProduto, valorCent, ciclo, tenantId, plano, sucessoUrl, cancelaUrl }) => chamar("POST", "/v1/checkout/sessions", {
    mode: "subscription", customer: clienteId, client_reference_id: tenantId, locale: "pt-BR", success_url: sucessoUrl, cancel_url: cancelaUrl,
    line_items: [{ quantity: 1, price_data: precoDe(valorCent, ciclo, nomeProduto) }],
    metadata: { tenantId, plano, ciclo }, subscription_data: { metadata: { tenantId, plano, ciclo } },
  }),
  /** Portal do cliente (trocar o cartão, ver faturas, cancelar). Exige o portal ativado no painel da Stripe. */
  criarPortal: ({ clienteId, retornoUrl }) => chamar("POST", "/v1/billing_portal/sessions", { customer: clienteId, return_url: retornoUrl }),
  lerAssinatura: id => chamar("GET", `/v1/subscriptions/${encodeURIComponent(id)}`),
  /** Troca o preço da assinatura (mesmo ciclo), proporcional ao que já foi cobrado. */
  atualizarPreco: ({ assinaturaId, itemId, valorCent, ciclo, nomeProduto, plano }) => chamar("POST", `/v1/subscriptions/${encodeURIComponent(assinaturaId)}`, {
    items: [{ id: itemId, price_data: precoDe(valorCent, ciclo, nomeProduto) }], proration_behavior: "create_prorations", metadata: { plano },
  }),
};

// ─── Assinatura do webhook ────────────────────────────────────────────────────

/**
 * Cabeçalho `Stripe-Signature: t=<epoch>,v1=<hex>[,v1=<hex>]`: HMAC-SHA256 de "<t>.<corpo>" com o segredo do endpoint (`whsec_...`, usado como
 * está), comparado em tempo constante; só o esquema v1 vale e várias assinaturas valem se uma bater (segredo em rotação). Tolerância de 5 minutos.
 */
export function verificarAssinaturaStripe({ cabecalho, corpo, segredo, agora = Date.now(), toleranciaSeg = 300 }) {
  if (!cabecalho || !segredo || corpo == null) return false;
  const partes = String(cabecalho).split(",").map(p => p.trim().split("="));
  const t = partes.find(([k]) => k === "t")?.[1];
  const ts = Number(t);
  if (!Number.isFinite(ts) || Math.abs(agora / 1000 - ts) > toleranciaSeg) return false;
  const esperado = createHmac("sha256", segredo).update(`${t}.`).update(corpo).digest();
  return partes.filter(([k]) => k === "v1").some(([, v]) => {
    const recebido = Buffer.from(v ?? "", "hex");
    return recebido.length === esperado.length && timingSafeEqual(recebido, esperado);
  });
}

/** Assina como a Stripe faria (para os testes). */
export const assinarStripe = ({ corpo, segredo, timestamp = Math.floor(Date.now() / 1000) }) =>
  `t=${timestamp},v1=${createHmac("sha256", segredo).update(`${timestamp}.`).update(corpo).digest("hex")}`;

// ─── Tradução dos eventos ─────────────────────────────────────────────────────

const idDe = v => (v && typeof v === "object" ? v.id : v) ?? null;
const dia = seg => (seg ? hojeBR(new Date(seg * 1000)) : null);
const cent = v => (v == null ? null : Number(v));

/**
 * A fatura da Stripe como o sistema entende. A forma do objeto mudou entre versões da API (a assinatura e os metadados dela ficam em
 * `invoice.subscription` / `subscription_details` nas antigas e em `invoice.parent.subscription_details` nas recentes): lê as duas.
 */
export function faturaDoInvoice(inv) {
  const detalhes = inv.parent?.subscription_details ?? inv.subscription_details ?? {};
  const linha = inv.lines?.data?.[0] ?? {};
  const inicio = linha.period?.start ?? inv.period_start ?? inv.created;
  const intervalo = linha.price?.recurring?.interval ?? linha.pricing?.price_details?.recurring?.interval ?? null;
  const meta = detalhes.metadata ?? {};
  return {
    gatewayId: inv.id, cliente: idDe(inv.customer), assinatura: idDe(inv.subscription ?? detalhes.subscription), itemId: linha.subscription_item ?? linha.parent?.subscription_item_details?.subscription_item ?? null,
    moeda: String(inv.currency ?? "").toLowerCase(), status: inv.status, motivo: inv.billing_reason ?? null, metodoCobranca: inv.collection_method ?? null,
    valorCent: cent(inv.total ?? inv.amount_due), pagoCent: cent(inv.amount_paid),
    referencia: referenciaDe(dia(inicio) ?? hojeBR()), vencimento: dia(inv.due_date) ?? dia(inv.created) ?? hojeBR(), pagaEm: dia(inv.status_transitions?.paid_at),
    link: inv.hosted_invoice_url ?? null, ciclo: intervalo === "year" ? "anual" : intervalo === "month" ? "mensal" : (meta.ciclo ?? null),
    meta: { tenantId: meta.tenantId ?? null, plano: meta.plano ?? null, ciclo: meta.ciclo ?? null },
  };
}

const STATUS_ASSINATURA = { active: "ativa", trialing: "ativa", past_due: "em_atraso", unpaid: "nao_paga", canceled: "cancelada", incomplete_expired: "expirada" };

/**
 * Evento da Stripe -> { eventoId, tipo, ... }.
 *   tipo "fatura":     { acao: "criada" | "paga" | "falhou" | "anulada", fatura }
 *   tipo "assinatura": { assinatura: { gatewayId, cliente, status, meta } }
 *   tipo "checkout":   { sessao: { cliente, assinatura, tenantId, plano, ciclo } }
 *   tipo "outro":      sem efeito (fica registrado)
 */
export function interpretarEventoStripe(evento) {
  if (!evento || typeof evento !== "object" || !evento.id || !evento.type) return null;
  const obj = evento.data?.object ?? {};
  const base = { eventoId: evento.id };
  switch (evento.type) {
    case "invoice.finalized": case "invoice.created": case "invoice.updated": {
      // Rascunho ainda pode mudar (a Stripe finaliza cerca de uma hora depois): só espelha a fatura quando está aberta ou paga
      if (obj.status === "draft") return { ...base, tipo: "outro", rotulo: "fatura em rascunho" };
      const acao = obj.status === "paid" ? "paga" : obj.status === "void" || obj.status === "uncollectible" ? "anulada" : "criada";
      return { ...base, tipo: "fatura", acao, fatura: faturaDoInvoice(obj) };
    }
    case "invoice.paid": case "invoice.payment_succeeded": return { ...base, tipo: "fatura", acao: "paga", fatura: faturaDoInvoice(obj) };
    case "invoice.payment_failed": return { ...base, tipo: "fatura", acao: "falhou", fatura: faturaDoInvoice(obj) };
    case "invoice.voided": case "invoice.marked_uncollectible": return { ...base, tipo: "fatura", acao: "anulada", fatura: faturaDoInvoice(obj) };
    case "customer.subscription.updated": case "customer.subscription.deleted": {
      const status = evento.type === "customer.subscription.deleted" ? "cancelada" : STATUS_ASSINATURA[obj.status] ?? null;
      if (!status) return { ...base, tipo: "outro", rotulo: `assinatura ${obj.status}` };
      return { ...base, tipo: "assinatura", assinatura: { gatewayId: obj.id, cliente: idDe(obj.customer), status, meta: obj.metadata ?? {} } };
    }
    case "checkout.session.completed": {
      if (obj.mode !== "subscription") return { ...base, tipo: "outro", rotulo: "checkout que não é assinatura" };
      const m = obj.metadata ?? {};
      return { ...base, tipo: "checkout", sessao: { cliente: idDe(obj.customer), assinatura: idDe(obj.subscription), tenantId: obj.client_reference_id ?? m.tenantId ?? null, plano: m.plano ?? null, ciclo: m.ciclo ?? null } };
    }
    default: return { ...base, tipo: "outro", rotulo: evento.type };
  }
}
