import prisma from "../db.js";
import { ErroNegocio } from "../financeiro/erro.js";
import { emCentavos, emReais } from "../financeiro/dinheiro.js";
import { hojeBR, somarMeses } from "../utils/datas.js";
import { getLimites } from "../config/planos.js";
import { ehContaInterna } from "../config/conta.js";
import {
  SITUACOES_COBRANCA, calcularIndicadores, cobrancaCobreMes, dataValida, descricaoDaCobranca, formaValida, referenciaDe, referenciaValida,
  rotuloForma, situacaoCobranca, valorListaCent, vencimentoDoMes,
} from "../config/cobranca.js";
import { provedorAtivo } from "../pagamentos/provedores.js";
import { invalidarConta } from "../middleware/conta.js";

/**
 * Assinaturas e cobranças. Regras de dinheiro em centavos (config/cobranca.js); valores entram e saem da API em reais.
 * Quem muda o status da empresa por aqui (pagamento que ativa o teste) esquece o cache do bloqueio na hora.
 */
const TX = { timeout: 30000, maxWait: 10000 };
const num = d => (d == null ? null : Number(d));
const rotuloPlano = plano => getLimites(plano).label;

// ─── Serializadores (o que cada lado pode ver) ────────────────────────────────

export function cobrancaEquipe(c, hoje = hojeBR()) {
  const situacao = situacaoCobranca(c, hoje);
  return {
    id: c.id, tenantId: c.tenantId, empresa: c.tenant ? { id: c.tenant.id, nome: c.tenant.razaoSocial, plano: c.tenant.plano, status: c.tenant.status } : undefined,
    referencia: c.referencia, descricao: c.descricao, plano: c.plano, ciclo: c.ciclo, valor: num(c.valor), vencimento: c.vencimento,
    status: c.status, situacao, pagaEm: c.pagaEm, valorPago: num(c.valorPago), forma: c.forma, formaRotulo: rotuloForma(c.forma),
    gateway: c.gateway, gatewayId: c.gatewayId, linkPagamento: c.linkPagamento, motivoCancelamento: c.motivoCancelamento, createdAt: c.createdAt,
  };
}

/** A fatura como o cliente vê: sem gateway, sem motivo interno. */
export function faturaCliente(c, hoje = hojeBR()) {
  return {
    id: c.id, referencia: c.referencia, descricao: c.descricao, valor: num(c.valor), vencimento: c.vencimento,
    situacao: situacaoCobranca(c, hoje), pagaEm: c.pagaEm, linkPagamento: c.status === "aberta" ? c.linkPagamento : null,
  };
}

export const assinaturaEquipe = (a, t) => (a ? {
  valor: num(a.valor), diaVencimento: a.diaVencimento, cortesia: a.cortesia, gateway: a.gateway, gatewayClienteId: a.gatewayClienteId, gatewayAssinaturaId: a.gatewayAssinaturaId, ativadaEm: a.ativadaEm, canceladaEm: a.canceladaEm, valorLista: emReais(valorListaCent(t.plano, t.ciclo)),
} : { valor: null, valorLista: emReais(valorListaCent(t.plano, t.ciclo)) });

// ─── Assinatura da empresa ────────────────────────────────────────────────────

const diaValido = v => { const n = parseInt(v, 10); if (!Number.isInteger(n) || n < 1 || n > 28) throw new ErroNegocio("O dia do vencimento é de 1 a 28."); return n; };
const valorValido = v => { const c = emCentavos(v); if (!Number.isFinite(c) || c <= 0 || c > 100_000_000) throw new ErroNegocio("Informe um valor maior que zero."); return c; };

/**
 * Cria a assinatura da empresa se ainda não existe (valor de lista do plano e ciclo atuais) e aplica o que veio em `dados`.
 * `ativar` marca a data de ativação (uma vez); `cancelar` marca o cancelamento; reativar apaga a data de cancelamento.
 */
export async function configurarAssinatura(db, tenant, { valor, diaVencimento, cortesia, ativar, cancelar } = {}) {
  const atual = await db.assinatura.findUnique({ where: { tenantId: tenant.id } });
  const dados = {};
  if (valor !== undefined) dados.valor = emReais(valorValido(valor));
  if (diaVencimento !== undefined) dados.diaVencimento = diaValido(diaVencimento);
  if (cortesia !== undefined) dados.cortesia = !!cortesia;
  if (ativar) { if (!atual?.ativadaEm) dados.ativadaEm = new Date(); dados.canceladaEm = null; }
  if (cancelar) dados.canceladaEm = new Date();
  if (!atual) {
    return db.assinatura.create({ data: { tenantId: tenant.id, valor: emReais(valorListaCent(tenant.plano, tenant.ciclo)), ...dados } });
  }
  return Object.keys(dados).length ? db.assinatura.update({ where: { id: atual.id }, data: dados }) : atual;
}

// ─── Cobranças ────────────────────────────────────────────────────────────────

/** Cria uma cobrança. Recusa a que repete a referência ou cuja janela já está coberta por outra (mensal ou anual). */
export async function criarCobranca({ tenantId, referencia, valor, vencimento, registradaPorId, hoje = hojeBR() }) {
  const t = await prisma.tenant.findUnique({ where: { id: String(tenantId ?? "") }, include: { assinatura: true } });
  if (!t) throw new ErroNegocio("Empresa não encontrada.", 404);
  if (ehContaInterna(t)) throw new ErroNegocio("A conta interna da casa não tem cobrança.", 409);
  if (t.assinatura?.cortesia) throw new ErroNegocio("Esta empresa está em cortesia: não gera cobrança.", 409);
  if (!referenciaValida(referencia)) throw new ErroNegocio("Informe o mês da cobrança (AAAA-MM).");
  const existentes = await prisma.cobranca.findMany({ where: { tenantId: t.id }, select: { id: true, referencia: true, ciclo: true, status: true } });
  const mesma = existentes.find(c => c.referencia === referencia);
  if (mesma) throw new ErroNegocio(mesma.status === "cancelada" ? `Já existe a cobrança #${mesma.id} cancelada para ${referencia}: reabra-a em vez de criar outra.` : `Já existe a cobrança #${mesma.id} para ${referencia}.`, 409);
  const cobre = existentes.find(c => cobrancaCobreMes(c, referencia));
  if (cobre) throw new ErroNegocio(`A cobrança #${cobre.id} já cobre ${referencia}.`, 409);

  const cent = valor !== undefined && valor !== null && valor !== "" ? valorValido(valor) : t.assinatura ? emCentavos(t.assinatura.valor) : valorListaCent(t.plano, t.ciclo);
  const venc = vencimento || vencimentoDoMes(referencia, t.assinatura?.diaVencimento ?? 10);
  if (!dataValida(venc)) throw new ErroNegocio("Informe o vencimento (AAAA-MM-DD).");
  if (t.assinatura && t.assinatura.gateway !== "manual") throw new ErroNegocio("Esta empresa é cobrada pelo gateway de pagamento: as faturas vêm de lá e entram aqui sozinhas.", 409);
  // Só um provedor que sabe criar cobrança (link, boleto) marca a cobrança com o nome dele; os demais registram à mão
  const provedor = provedorAtivo();
  const gera = typeof provedor.criarCobranca === "function";
  let c;
  try {
    c = await prisma.cobranca.create({ data: {
      tenantId: t.id, referencia, descricao: descricaoDaCobranca(rotuloPlano(t.plano), t.ciclo, referencia), plano: t.plano, ciclo: t.ciclo,
      valor: emReais(cent), vencimento: venc, gateway: gera ? provedor.id : "manual", registradaPorId: registradaPorId ?? null,
    } });
  } catch (e) {
    if (e.code === "P2002") throw new ErroNegocio(`Já existe uma cobrança para ${referencia}.`, 409);
    throw e;
  }
  if (gera) {
    // Falha do gateway não derruba a cobrança: ela existe e a equipe pode registrar o pagamento à mão
    try {
      const r = await provedor.criarCobranca(c, t);
      c = await prisma.cobranca.update({ where: { id: c.id }, data: { gatewayId: r?.gatewayId ?? null, linkPagamento: r?.linkPagamento ?? null } });
    } catch (e) { console.error(`[cobranca] gateway ${provedor.id} falhou ao criar a cobrança #${c.id}:`, e.message); }
  }
  return cobrancaEquipe({ ...c, tenant: t }, hoje);
}

/** Empresas que deveriam ter cobrança neste mês e ainda não têm: assinatura configurada, fora de cortesia, ativa ou inadimplente. */
export async function previaDoMes(mes) {
  if (!referenciaValida(mes)) throw new ErroNegocio("Informe o mês (AAAA-MM).");
  const ass = await prisma.assinatura.findMany({
    where: { cortesia: false, gateway: "manual", tenant: { status: { in: ["ativo", "inadimplente"] } } }, // quem o gateway cobra (Stripe) recebe as faturas por webhook, não por aqui
    include: { tenant: { select: { id: true, razaoSocial: true, email: true, plano: true, ciclo: true, status: true, cobrancas: { select: { id: true, referencia: true, ciclo: true, status: true } } } } },
    orderBy: { id: "asc" },
  });
  const itens = ass.filter(a => !ehContaInterna(a.tenant) && !a.tenant.cobrancas.some(c => c.referencia === mes || cobrancaCobreMes(c, mes)))
    .map(a => ({ tenantId: a.tenant.id, empresa: a.tenant.razaoSocial, plano: a.tenant.plano, ciclo: a.tenant.ciclo, valor: num(a.valor), vencimento: vencimentoDoMes(mes, a.diaVencimento) }));
  return { mes, itens, total: emReais(itens.reduce((s, i) => s + emCentavos(i.valor), 0)) };
}

/** Gera as cobranças do mês para todas as empresas da prévia. Rodar de novo não duplica (cada empresa só entra se o mês ainda não está coberto). */
export async function gerarDoMes(mes, { registradaPorId, hoje = hojeBR() } = {}) {
  const { itens } = await previaDoMes(mes);
  let criadas = 0, ignoradas = 0;
  for (const i of itens) {
    try { await criarCobranca({ tenantId: i.tenantId, referencia: mes, registradaPorId, hoje }); criadas++; }
    catch (e) { if (e instanceof ErroNegocio && e.status === 409) ignoradas++; else throw e; }
  }
  return { mes, criadas, ignoradas };
}

/**
 * Efeito do pagamento na empresa: quem estava em teste passa a ativo (pagou, é cliente) e quem estava inadimplente volta
 * a ativo se não restou nenhuma cobrança vencida em aberto. Suspensa ou cancelada não muda sozinha: a equipe decide.
 */
export async function efeitoDoPagamento(db, tenantId, hoje) {
  const t = await db.tenant.findUnique({ where: { id: tenantId }, select: { id: true, status: true, plano: true, ciclo: true } });
  if (!t) return null;
  let novo = null;
  if (t.status === "trial") novo = "ativo";
  else if (t.status === "inadimplente" && !(await db.cobranca.count({ where: { tenantId, status: "aberta", vencimento: { lt: hoje } } }))) novo = "ativo";
  if (!novo) return null;
  await db.tenant.update({ where: { id: tenantId }, data: { status: novo, motivoStatus: null } });
  await configurarAssinatura(db, t, { ativar: true });
  return novo;
}

/**
 * Registra o pagamento de uma cobrança em aberto (à mão no painel ou por aviso do gateway).
 * `valorPago` em reais (padrão: o valor da cobrança), `pagaEm` AAAA-MM-DD (padrão: hoje, nunca no futuro).
 */
export async function registrarPagamento(db, id, { pagaEm, forma, valorPago, registradaPorId } = {}, hoje = hojeBR()) {
  const c = await db.cobranca.findUnique({ where: { id: parseInt(id, 10) || 0 } });
  if (!c) throw new ErroNegocio("Cobrança não encontrada.", 404);
  if (c.status === "paga") throw new ErroNegocio("Esta cobrança já está paga.", 409);
  if (c.status === "cancelada") throw new ErroNegocio("Esta cobrança está cancelada. Reabra-a antes de registrar o pagamento.", 409);
  const data = pagaEm || hoje;
  if (!dataValida(data) || data > hoje) throw new ErroNegocio("A data do pagamento não pode ser no futuro.");
  if (forma && !formaValida(forma)) throw new ErroNegocio("Forma de pagamento inválida.");
  const pago = valorPago !== undefined && valorPago !== null && valorPago !== "" ? valorValido(valorPago) : emCentavos(c.valor);
  const r = await db.cobranca.updateMany({ where: { id: c.id, status: "aberta" }, data: { status: "paga", pagaEm: data, valorPago: emReais(pago), forma: forma || null, ...(registradaPorId ? { registradaPorId } : {}) } });
  if (r.count === 0) throw new ErroNegocio("Esta cobrança mudou enquanto você registrava. Recarregue a tela.", 409);
  const statusNovo = await efeitoDoPagamento(db, c.tenantId, hoje);
  return { id: c.id, tenantId: c.tenantId, statusNovo };
}

/** A fatura de um gateway recorrente (Stripe) só muda por aviso dele: mexer à mão deixaria o sistema e o gateway discordando (e o cliente seria cobrado de novo). */
async function exigirManual(id) {
  const c = await prisma.cobranca.findUnique({ where: { id: parseInt(id, 10) || 0 }, select: { gateway: true } });
  if (c && c.gateway === "stripe") throw new ErroNegocio("Esta fatura é do Stripe: o pagamento, o estorno e o cancelamento entram aqui sozinhos quando o Stripe avisa. Para mexer, use o painel do Stripe.", 409);
}

export async function pagarCobranca(id, dados, hoje = hojeBR()) {
  await exigirManual(id);
  const r = await prisma.$transaction(tx => registrarPagamento(tx, id, dados, hoje), TX);
  invalidarConta(r.tenantId);
  return { ...r, cobranca: await lerCobranca(r.id, hoje) };
}

/** Desfaz um pagamento registrado por engano: a cobrança volta a ficar em aberto. (O status da empresa não volta sozinho.) */
export async function estornarPagamento(db, id) {
  const c = await db.cobranca.findUnique({ where: { id: parseInt(id, 10) || 0 } });
  if (!c) throw new ErroNegocio("Cobrança não encontrada.", 404);
  const r = await db.cobranca.updateMany({ where: { id: c.id, status: "paga" }, data: { status: "aberta", pagaEm: null, valorPago: null, forma: null } });
  if (r.count === 0) throw new ErroNegocio("Só se estorna uma cobrança paga.", 409);
  return { id: c.id, tenantId: c.tenantId };
}

export const estornarCobranca = async id => { await exigirManual(id); return estornarPagamento(prisma, id); };

export async function cancelarCobranca(id, motivo) {
  await exigirManual(id);
  const m = String(motivo ?? "").trim().slice(0, 300);
  if (m.length < 3) throw new ErroNegocio("Informe o motivo do cancelamento.");
  const c = await prisma.cobranca.findUnique({ where: { id: parseInt(id, 10) || 0 } });
  if (!c) throw new ErroNegocio("Cobrança não encontrada.", 404);
  const r = await prisma.cobranca.updateMany({ where: { id: c.id, status: "aberta" }, data: { status: "cancelada", motivoCancelamento: m } });
  if (r.count === 0) throw new ErroNegocio(c.status === "paga" ? "Esta cobrança está paga: estorne o pagamento antes de cancelar." : "Esta cobrança já está cancelada.", 409);
  return { id: c.id, tenantId: c.tenantId };
}

export async function reabrirCobranca(id) {
  await exigirManual(id);
  const c = await prisma.cobranca.findUnique({ where: { id: parseInt(id, 10) || 0 } });
  if (!c) throw new ErroNegocio("Cobrança não encontrada.", 404);
  const r = await prisma.cobranca.updateMany({ where: { id: c.id, status: "cancelada" }, data: { status: "aberta", motivoCancelamento: null } });
  if (r.count === 0) throw new ErroNegocio("Só se reabre uma cobrança cancelada.", 409);
  return { id: c.id, tenantId: c.tenantId };
}

export async function lerCobranca(id, hoje = hojeBR()) {
  const c = await prisma.cobranca.findUnique({ where: { id: parseInt(id, 10) || 0 }, include: { tenant: { select: { id: true, razaoSocial: true, plano: true, status: true } } } });
  if (!c) throw new ErroNegocio("Cobrança não encontrada.", 404);
  return cobrancaEquipe(c, hoje);
}

// ─── Listagem, exportação e indicadores ───────────────────────────────────────

function filtroCobrancas({ status, mes, q, tenantId }, hoje) {
  const and = [];
  if (tenantId) and.push({ tenantId: String(tenantId).slice(0, 40) });
  if (status === "atrasada") and.push({ status: "aberta", vencimento: { lt: hoje } });
  else if (status === "aberta") and.push({ status: "aberta", vencimento: { gte: hoje } });
  else if (status === "paga" || status === "cancelada") and.push({ status });
  if (referenciaValida(mes)) and.push({ vencimento: { startsWith: mes } });
  const busca = String(q ?? "").trim().slice(0, 80);
  if (busca) and.push({ tenant: { OR: [{ razaoSocial: { contains: busca, mode: "insensitive" } }, { cnpj: { contains: busca } }, { email: { contains: busca, mode: "insensitive" } }] } });
  return and.length ? { AND: and } : {};
}

export async function listarCobrancas(filtros = {}, { pagina = 1, limite = 30 } = {}, hoje = hojeBR()) {
  const where = filtroCobrancas(filtros, hoje);
  const pg = Math.max(1, parseInt(pagina) || 1), lim = Math.min(100, Math.max(1, parseInt(limite) || 30));
  const [total, soma, itens] = await Promise.all([
    prisma.cobranca.count({ where }),
    prisma.cobranca.aggregate({ where, _sum: { valor: true } }),
    prisma.cobranca.findMany({ where, orderBy: [{ vencimento: "desc" }, { id: "desc" }], skip: (pg - 1) * lim, take: lim, include: { tenant: { select: { id: true, razaoSocial: true, plano: true, status: true } } } }),
  ]);
  return { total, pagina: pg, limite: lim, soma: num(soma._sum.valor) ?? 0, itens: itens.map(c => cobrancaEquipe(c, hoje)) };
}

// Planilha: texto que começa com = + - @ vira fórmula quando aberto no Excel; o nome da empresa vem do cliente, então vai com apóstrofo na frente
const csv = v => { let s = String(v ?? ""); if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const BR = n => (n == null ? "" : Number(n).toFixed(2).replace(".", ","));
const dataBRtxt = d => (d ? d.split("-").reverse().join("/") : "");

/** CSV no formato do Excel brasileiro (separador ;, vírgula decimal, BOM): as cobranças do filtro, até 5.000 linhas. */
export async function exportarCsv(filtros = {}, hoje = hojeBR()) {
  const itens = await prisma.cobranca.findMany({ where: filtroCobrancas(filtros, hoje), orderBy: [{ vencimento: "desc" }, { id: "desc" }], take: 5000, include: { tenant: { select: { razaoSocial: true, cnpj: true } } } });
  const cab = ["Nº", "Empresa", "CNPJ", "Referência", "Descrição", "Plano", "Ciclo", "Valor", "Vencimento", "Situação", "Pago em", "Valor pago", "Forma"];
  const linhas = itens.map(c => [c.id, c.tenant.razaoSocial, c.tenant.cnpj, c.referencia, c.descricao, rotuloPlano(c.plano), c.ciclo, BR(c.valor), dataBRtxt(c.vencimento), SITUACOES_COBRANCA[situacaoCobranca(c, hoje)].rotulo, dataBRtxt(c.pagaEm), BR(c.valorPago), rotuloForma(c.forma)].map(csv).join(";"));
  return `﻿${[cab.join(";"), ...linhas].join("\r\n")}\r\n`;
}

/** Os números do painel financeiro: receita recorrente, atraso, recebido, empresas em teste e as ativas ainda sem assinatura configurada. */
export async function resumoFinanceiro(hoje = hojeBR()) {
  const mes = referenciaDe(hoje);
  const desde = somarMeses(`${mes}-01`, -6); // os pagamentos dos últimos 6 meses alimentam o gráfico
  const [ass, cobrancas, trials, ativosSem] = await Promise.all([
    prisma.assinatura.findMany({ include: { tenant: { select: { status: true, plano: true, ciclo: true, email: true } } } }),
    prisma.cobranca.findMany({ where: { OR: [{ status: "aberta" }, { status: "paga", pagaEm: { gte: desde } }] }, select: { tenantId: true, status: true, vencimento: true, valor: true, valorPago: true, pagaEm: true } }),
    prisma.tenant.findMany({ where: { status: "trial" }, select: { trialAte: true, email: true } }),
    prisma.tenant.findMany({ where: { status: "ativo", assinatura: null }, select: { id: true, razaoSocial: true, plano: true, ciclo: true, email: true }, orderBy: { razaoSocial: "asc" }, take: 100 }),
  ]);
  const ind = calcularIndicadores({
    hoje,
    assinaturas: ass.filter(a => !ehContaInterna(a.tenant)).map(a => ({ tenantId: a.tenantId, valorCent: emCentavos(a.valor), ciclo: a.tenant.ciclo, cortesia: a.cortesia, status: a.tenant.status, plano: a.tenant.plano, ativadaEm: a.ativadaEm ? hojeBR(a.ativadaEm) : null, canceladaEm: a.canceladaEm ? hojeBR(a.canceladaEm) : null })), // o mês é o de São Paulo, não o do UTC
    cobrancas: cobrancas.map(c => ({ tenantId: c.tenantId, status: c.status, vencimento: c.vencimento, valorCent: emCentavos(c.valor), valorPagoCent: c.valorPago == null ? null : emCentavos(c.valorPago), pagaEm: c.pagaEm })),
  });
  const real = trials.filter(t => !ehContaInterna(t));
  const R = c => emReais(c);
  return {
    mes, mrr: R(ind.mrrCent), arr: R(ind.arrCent), pagantes: ind.pagantes, ticketMedio: R(ind.ticketMedioCent),
    porPlano: ind.porPlano.map(p => ({ plano: p.plano, nome: rotuloPlano(p.plano), empresas: p.empresas, mrr: R(p.mrrCent) })),
    emAtraso: { valor: R(ind.emAtraso.valorCent), cobrancas: ind.emAtraso.cobrancas, empresas: ind.emAtraso.empresas },
    recebidoNoMes: R(ind.recebidoNoMesCent), aReceberNoMes: R(ind.aReceberNoMesCent),
    novosNoMes: ind.novosNoMes, cancelamentosNoMes: ind.cancelamentosNoMes,
    emTeste: real.filter(t => !t.trialAte || t.trialAte >= hoje).length, testeAcabado: real.filter(t => t.trialAte && t.trialAte < hoje).length,
    serie: ind.serie.map(s => ({ mes: s.mes, valor: R(s.valorCent) })),
    semAssinatura: ativosSem.filter(t => !ehContaInterna(t)).map(t => ({ id: t.id, nome: t.razaoSocial, plano: t.plano, ciclo: t.ciclo })),
  };
}

// ─── Lado do cliente ──────────────────────────────────────────────────────────

/** Faturas da empresa para o administrador: sem as canceladas e sem dado de gateway. */
export async function faturasDoCliente(tenantId, hoje = hojeBR()) {
  const itens = await prisma.cobranca.findMany({ where: { tenantId, status: { in: ["aberta", "paga"] } }, orderBy: [{ vencimento: "desc" }, { id: "desc" }], take: 60 });
  return itens.map(c => faturaCliente(c, hoje));
}
