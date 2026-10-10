import { test } from "node:test";
import assert from "node:assert/strict";
import { assinarStripe, codificarForm, faturaDoInvoice, interpretarEventoStripe, verificarAssinaturaStripe } from "./stripe.js";

test("formulário da Stripe: objetos e listas aninhados, sem campos vazios", () => {
  const f = codificarForm({ mode: "subscription", locale: "pt-BR", line_items: [{ quantity: 1, price_data: { currency: "brl", unit_amount: 34900, recurring: { interval: "month" }, product_data: { name: "ConstruktPro Business (mensal)" } } }], metadata: { tenantId: "t1", vazio: null, indef: undefined } });
  const p = new URLSearchParams(f);
  assert.equal(p.get("mode"), "subscription");
  assert.equal(p.get("line_items[0][quantity]"), "1");
  assert.equal(p.get("line_items[0][price_data][unit_amount]"), "34900");
  assert.equal(p.get("line_items[0][price_data][recurring][interval]"), "month");
  assert.equal(p.get("line_items[0][price_data][product_data][name]"), "ConstruktPro Business (mensal)");
  assert.equal(p.get("metadata[tenantId]"), "t1");
  assert.equal(p.has("metadata[vazio]"), false);
  assert.equal(p.has("metadata[indef]"), false);
  assert.equal(codificarForm({ a: "x y&z=1" }), "a=x%20y%26z%3D1", "valores com & e = são escapados");
});

test("assinatura do webhook da Stripe: corpo exato, segredo, prazo, várias assinaturas, só v1", () => {
  const segredo = "whsec_segredo_de_teste", corpo = Buffer.from('{"id":"evt_1","type":"invoice.paid"}');
  const agora = 1_800_000_000_000, t = agora / 1000;
  const cab = assinarStripe({ corpo, segredo, timestamp: t });
  const v = extra => verificarAssinaturaStripe({ cabecalho: cab, corpo, segredo, agora, ...extra });
  assert.equal(v(), true);
  assert.equal(v({ corpo: Buffer.from(corpo.toString() + " ") }), false, "um espaço a mais já invalida");
  assert.equal(v({ segredo: "whsec_outro" }), false);
  assert.equal(v({ agora: agora + 6 * 60 * 1000 }), false, "mais de 5 minutos: repetição");
  assert.equal(v({ cabecalho: `${cab},v1=${"0".repeat(64)}` }), true, "segredo em rotação: várias v1, basta uma");
  assert.equal(v({ cabecalho: cab.replace("v1=", "v0=") }), false, "v0 (assinatura falsa de teste) nunca vale");
  assert.equal(v({ cabecalho: "" }), false);
  assert.equal(v({ cabecalho: "t=abc,v1=00" }), false);
  assert.equal(v({ segredo: "" }), false);
});

const invoice = (extra = {}) => ({
  id: "in_1", object: "invoice", customer: "cus_1", subscription: "sub_1", currency: "brl", status: "paid", billing_reason: "subscription_create", collection_method: "charge_automatically",
  total: 34900, amount_due: 34900, amount_paid: 34900, created: 1_792_500_000, due_date: null, hosted_invoice_url: "https://invoice.stripe.com/i/x",
  status_transitions: { paid_at: 1_792_500_100 },
  lines: { data: [{ subscription_item: "si_1", period: { start: 1_792_500_000, end: 1_795_100_000 }, price: { recurring: { interval: "month" } } }] },
  parent: { type: "subscription_details", subscription_details: { subscription: "sub_1", metadata: { tenantId: "t1", plano: "pro", ciclo: "mensal" } } },
  ...extra,
});

test("fatura da Stripe: valores em centavos, datas de São Paulo, ciclo e metadados da assinatura (API recente)", () => {
  const f = faturaDoInvoice(invoice());
  assert.deepEqual([f.gatewayId, f.cliente, f.assinatura, f.itemId, f.moeda, f.status, f.valorCent, f.pagoCent, f.ciclo], ["in_1", "cus_1", "sub_1", "si_1", "brl", "paid", 34900, 34900, "mensal"]);
  assert.deepEqual(f.meta, { tenantId: "t1", plano: "pro", ciclo: "mensal" });
  assert.match(f.referencia, /^\d{4}-\d{2}$/);
  assert.match(f.vencimento, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(f.pagaEm, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(f.link, "https://invoice.stripe.com/i/x");
});

test("fatura da Stripe: o formato antigo da API (subscription e subscription_details na raiz) dá o mesmo resultado", () => {
  const antiga = invoice({ parent: undefined, subscription: "sub_1", subscription_details: { metadata: { tenantId: "t1", plano: "pro", ciclo: "anual" } }, lines: { data: [{ period: { start: 1_792_500_000 }, price: { recurring: { interval: "year" } } }] } });
  const f = faturaDoInvoice(antiga);
  assert.deepEqual([f.assinatura, f.ciclo, f.meta.tenantId, f.meta.plano], ["sub_1", "anual", "t1", "pro"]);
});

test("fatura da Stripe: o mês vem do fuso de São Paulo, não do UTC", () => {
  // 2026-11-01 01:30 UTC = 2026-10-31 22:30 em São Paulo
  const seg = Date.UTC(2026, 10, 1, 1, 30) / 1000;
  const f = faturaDoInvoice(invoice({ created: seg, lines: { data: [{ period: { start: seg } }] } }));
  assert.equal(f.referencia, "2026-10");
  assert.equal(f.vencimento, "2026-10-31");
});

test("eventos: fatura paga, criada, falha e anulada viram a ação certa; rascunho é ignorado", () => {
  const ev = (type, obj) => interpretarEventoStripe({ id: `evt_${type}`, type, data: { object: obj } });
  assert.equal(ev("invoice.paid", invoice()).acao, "paga");
  assert.equal(ev("invoice.payment_succeeded", invoice()).acao, "paga");
  assert.equal(ev("invoice.finalized", invoice({ status: "open", status_transitions: {} })).acao, "criada");
  assert.equal(ev("invoice.created", invoice({ status: "draft" })).tipo, "outro", "rascunho não é espelhado");
  assert.equal(ev("invoice.updated", invoice({ status: "paid" })).acao, "paga");
  assert.equal(ev("invoice.payment_failed", invoice({ status: "open" })).acao, "falhou");
  assert.equal(ev("invoice.voided", invoice({ status: "void" })).acao, "anulada");
  assert.equal(ev("invoice.marked_uncollectible", invoice({ status: "uncollectible" })).acao, "anulada");
  assert.equal(ev("invoice.paid", invoice()).eventoId, "evt_invoice.paid");
});

test("eventos: assinatura (status), checkout concluído e o resto sem efeito", () => {
  const ev = (type, obj) => interpretarEventoStripe({ id: "evt_1", type, data: { object: obj } });
  assert.deepEqual(ev("customer.subscription.deleted", { id: "sub_1", customer: "cus_1", status: "canceled", metadata: { tenantId: "t1" } }).assinatura, { gatewayId: "sub_1", cliente: "cus_1", status: "cancelada", meta: { tenantId: "t1" } });
  assert.equal(ev("customer.subscription.updated", { id: "sub_1", customer: "cus_1", status: "past_due" }).assinatura.status, "em_atraso");
  assert.equal(ev("customer.subscription.updated", { id: "sub_1", customer: "cus_1", status: "unpaid" }).assinatura.status, "nao_paga");
  assert.equal(ev("customer.subscription.updated", { id: "sub_1", customer: "cus_1", status: "active" }).assinatura.status, "ativa");
  assert.equal(ev("customer.subscription.updated", { id: "sub_1", customer: "cus_1", status: "incomplete" }).tipo, "outro");
  const ck = ev("checkout.session.completed", { mode: "subscription", customer: "cus_1", subscription: "sub_1", client_reference_id: "t1", metadata: { plano: "pro", ciclo: "anual" } });
  assert.deepEqual(ck.sessao, { cliente: "cus_1", assinatura: "sub_1", tenantId: "t1", plano: "pro", ciclo: "anual" });
  assert.equal(ev("checkout.session.completed", { mode: "payment" }).tipo, "outro");
  assert.equal(ev("charge.refunded", {}).tipo, "outro");
  assert.equal(interpretarEventoStripe({ type: "x" }), null, "sem id do evento não há como ser idempotente");
  assert.equal(interpretarEventoStripe(null), null);
});
