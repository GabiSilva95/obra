// O que os avisos de um gateway recorrente (Stripe) fazem no sistema: espelham as faturas como cobranças, ativam, deixam inadimplente,
// suspendem ou cancelam a empresa. Roda dentro da transação do webhook (server/pagamentos/webhook.js), então ou aplica tudo ou nada.
// Cada função devolve { rotulo, tenantId }: o rótulo vai para o registro do evento; sem efeito vira "ignorado: ..." (2xx, nunca erro).
import { emReais } from "../financeiro/dinheiro.js";
import { PLANOS, getLimites } from "../config/planos.js";
import { CICLOS, descricaoDaCobranca, valorListaCent } from "../config/cobranca.js";
import { ehContaInterna } from "../config/conta.js";
import { efeitoDoPagamento } from "./servico.js";

const MOTIVO = "Stripe: ";
const planoValido = p => (p && PLANOS[p] ? p : null);
const cicloValido = c => (CICLOS.includes(c) ? c : null);
const vindoDoGateway = t => String(t.motivoStatus ?? "").startsWith(MOTIVO);

/** A empresa de um cliente do gateway: pelo id do cliente já guardado, ou pelo `tenantId` que mandamos nos metadados (e então guarda o id). */
async function empresaDe(db, { cliente, tenantId }) {
  const ass = cliente ? await db.assinatura.findFirst({ where: { gatewayClienteId: cliente } }) : null;
  const id = ass?.tenantId ?? tenantId;
  const t = id ? await db.tenant.findUnique({ where: { id } }) : null;
  return t && !ehContaInterna(t) ? t : null;
}

/** Guarda na assinatura da empresa os ids do gateway (e cria a assinatura se ainda não existe). */
async function carimbar(db, t, dados) {
  const limpo = Object.fromEntries(Object.entries(dados).filter(([, v]) => v !== undefined && v !== null));
  const existente = await db.assinatura.findUnique({ where: { tenantId: t.id } });
  if (existente) return Object.keys(limpo).length ? db.assinatura.update({ where: { id: existente.id }, data: limpo }) : existente;
  return db.assinatura.create({ data: { tenantId: t.id, valor: emReais(valorListaCent(t.plano, t.ciclo)), ...limpo } });
}

/** A primeira fatura traz o que o cliente escolheu no Checkout: plano, ciclo e o valor que ficou combinado. */
async function aplicarEscolhaDoCheckout(db, t, { plano, ciclo, valorCent }) {
  const p = planoValido(plano), c = cicloValido(ciclo);
  const dados = {};
  if (p && p !== t.plano) dados.plano = p;
  if (c && c !== t.ciclo) dados.ciclo = c;
  if (Object.keys(dados).length) await db.tenant.update({ where: { id: t.id }, data: dados });
  if (valorCent > 0) await db.assinatura.update({ where: { tenantId: t.id }, data: { valor: emReais(valorCent) } });
}

/** Espelha a fatura do gateway como cobrança e aplica o efeito do pagamento (ou da falha) na empresa. */
export async function sincronizarFatura(db, gateway, { acao, fatura: f }, hoje) {
  if (f.moeda !== "brl") return { rotulo: `ignorado: fatura em ${f.moeda || "moeda desconhecida"} (o sistema cobra em reais)` };
  let t = await empresaDe(db, { cliente: f.cliente, tenantId: f.meta.tenantId });
  if (!t) return { rotulo: "ignorado: nenhuma empresa para este cliente do gateway" };
  await carimbar(db, t, { gateway, gatewayClienteId: f.cliente, gatewayAssinaturaId: f.assinatura });
  if (f.motivo === "subscription_create") { await aplicarEscolhaDoCheckout(db, t, { plano: f.meta.plano, ciclo: f.meta.ciclo ?? f.ciclo, valorCent: f.valorCent }); t = await db.tenant.findUnique({ where: { id: t.id } }); }

  const alvo = acao === "paga" ? "paga" : acao === "anulada" ? "cancelada" : "aberta";
  const ciclo = cicloValido(f.ciclo) ?? t.ciclo;
  const valor = emReais(f.valorCent ?? 0);
  let c = await db.cobranca.findFirst({ where: { gateway, gatewayId: f.gatewayId } });

  if (!c) {
    // Uma cobrança em aberto criada à mão para este mês vira a própria fatura do gateway (em vez de duplicar)
    const manual = await db.cobranca.findFirst({ where: { tenantId: t.id, referencia: f.referencia, gateway: "manual", status: "aberta" } });
    const referencia = manual || !(await db.cobranca.findFirst({ where: { tenantId: t.id, referencia: f.referencia }, select: { id: true } })) ? f.referencia : `${f.referencia}#${String(f.gatewayId).slice(-8)}`;
    const dados = { gateway, gatewayId: f.gatewayId, linkPagamento: f.link, valor, vencimento: f.vencimento, ciclo, plano: t.plano, descricao: descricaoDaCobranca(getLimites(t.plano).label, ciclo, f.referencia) };
    c = manual
      ? await db.cobranca.update({ where: { id: manual.id }, data: dados })
      : await db.cobranca.create({ data: { tenantId: t.id, referencia, ...dados, status: "aberta" } });
  } else if (c.status === "aberta") {
    await db.cobranca.update({ where: { id: c.id }, data: { linkPagamento: f.link ?? c.linkPagamento, vencimento: f.vencimento, valor } });
  }

  // A situação só anda para a frente: uma fatura já paga não volta a aberta por um aviso atrasado
  if (alvo === "paga" && c.status !== "paga") {
    await db.cobranca.update({ where: { id: c.id }, data: { status: "paga", pagaEm: f.pagaEm ?? hoje, valorPago: emReais(f.pagoCent ?? f.valorCent ?? 0), forma: f.metodoCobranca === "charge_automatically" ? "cartao" : null, motivoCancelamento: null } });
  } else if (alvo === "cancelada" && c.status === "aberta") {
    await db.cobranca.update({ where: { id: c.id }, data: { status: "cancelada", motivoCancelamento: `${MOTIVO}fatura anulada` } });
  }

  let efeito = "";
  if (alvo === "paga") {
    // Pagou: quem estava em teste ou inadimplente passa a ativo; quem o gateway suspendeu por falta de pagamento volta
    const atual = await db.tenant.findUnique({ where: { id: t.id } });
    if (atual.status === "suspenso" && vindoDoGateway(atual)) { await db.tenant.update({ where: { id: t.id }, data: { status: "ativo", motivoStatus: null } }); efeito = "; a empresa voltou a ativa"; }
    else { const novo = await efeitoDoPagamento(db, t.id, hoje); if (novo) efeito = `; a empresa passou a ${novo}`; }
  } else if (acao === "falhou" && t.status === "ativo") {
    await db.tenant.update({ where: { id: t.id }, data: { status: "inadimplente", motivoStatus: `${MOTIVO}pagamento recusado` } });
    efeito = "; a empresa ficou inadimplente";
  }
  return { rotulo: `fatura ${f.gatewayId}: ${alvo === "paga" ? "paga" : alvo === "cancelada" ? "anulada" : acao === "falhou" ? "pagamento recusado" : "em aberto"}${efeito}`, tenantId: t.id };
}

/** Mudança de situação da assinatura no gateway: atraso, falta de pagamento ou cancelamento. */
export async function sincronizarAssinatura(db, gateway, a) {
  const t = await empresaDe(db, { cliente: a.cliente, tenantId: a.meta?.tenantId });
  if (!t) return { rotulo: "ignorado: nenhuma empresa para este cliente do gateway" };
  await carimbar(db, t, { gateway, gatewayClienteId: a.cliente, gatewayAssinaturaId: a.gatewayId });
  if (a.status === "cancelada" && t.status !== "cancelado") {
    await db.tenant.update({ where: { id: t.id }, data: { status: "cancelado", motivoStatus: `${MOTIVO}assinatura cancelada` } });
    await db.assinatura.update({ where: { tenantId: t.id }, data: { canceladaEm: new Date() } });
    return { rotulo: "assinatura cancelada: a empresa foi cancelada", tenantId: t.id };
  }
  if (a.status === "em_atraso" && t.status === "ativo") {
    await db.tenant.update({ where: { id: t.id }, data: { status: "inadimplente", motivoStatus: `${MOTIVO}pagamento em atraso` } });
    return { rotulo: "assinatura em atraso: a empresa ficou inadimplente", tenantId: t.id };
  }
  if (a.status === "nao_paga" && ["ativo", "inadimplente"].includes(t.status)) {
    await db.tenant.update({ where: { id: t.id }, data: { status: "suspenso", motivoStatus: `${MOTIVO}pagamento não confirmado` } });
    return { rotulo: "assinatura sem pagamento: a empresa foi suspensa", tenantId: t.id };
  }
  return { rotulo: `assinatura ${a.status}: sem mudança`, tenantId: t.id };
}

/** Checkout concluído: liga a empresa ao cliente e à assinatura do gateway e guarda o plano escolhido. A ativação vem com a fatura paga. */
export async function sincronizarCheckout(db, gateway, s) {
  const t = await empresaDe(db, { cliente: s.cliente, tenantId: s.tenantId });
  if (!t) return { rotulo: "ignorado: nenhuma empresa para este checkout" };
  await carimbar(db, t, { gateway, gatewayClienteId: s.cliente, gatewayAssinaturaId: s.assinatura });
  await aplicarEscolhaDoCheckout(db, t, { plano: s.plano, ciclo: s.ciclo, valorCent: 0 });
  return { rotulo: "checkout concluído: a empresa está ligada à assinatura do gateway", tenantId: t.id };
}
