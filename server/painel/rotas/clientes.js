import { Router } from "express";
import jwt from "jsonwebtoken";
import prisma from "../../db.js";
import { rota, ErroNegocio } from "../rota.js";
import { registrarAuditoria } from "../auditoria.js";
import { exigirPermissao } from "../guardas.js";
import { temPermissao } from "../../config/painel.js";
import * as cobranca from "../../cobranca/servico.js";
import { valorListaCent } from "../../config/cobranca.js";
import { ErroGateway, stripeApi } from "../../pagamentos/stripe.js";
import { emCentavos } from "../../financeiro/dinheiro.js";
import { invalidarConta } from "../../middleware/conta.js";
import { DURACAO_LEITURA_MIN, MAX_DIAS_EXTENSAO, SITUACOES, contaBloqueada, diasRestantesTeste, ehContaInterna, rotuloSituacao, statusEfetivo } from "../../config/conta.js";
import { PLANOS, getLimites } from "../../config/planos.js";
import { rotuloSetor } from "../../config/suporte.js";
import { registrarEntradaLeitura } from "../../suporte/servico.js";
import { tenantParaCliente } from "../../utils/tenantPublico.js";
import { hojeBR, somarDias } from "../../utils/datas.js";

/**
 * Clientes no painel (`/api/painel/clientes`): quem testa, quem paga, quem está bloqueado.
 * Ler exige `clientes`; mudar plano, teste e status e escrever notas exige `clientes_editar`.
 * Toda mudança vai para a auditoria da equipe, com a empresa.
 */
const router = Router();
const editar = exigirPermissao("clientes_editar");
const LIMITE_PADRAO = 30;

/** Filtro do banco para cada situação efetiva (o banco guarda `trial`; o vencido é decidido pela data). */
function filtroSituacao(situacao, hoje) {
  switch (situacao) {
    case "trial": return { status: "trial", OR: [{ trialAte: null }, { trialAte: { gte: hoje } }] };
    case "trial_expirado": return { status: "trial", trialAte: { lt: hoje } };
    case "ativo": case "inadimplente": case "suspenso": case "cancelado": return { status: situacao };
    default: return null;
  }
}

const linhaCliente = (t, hoje) => ({
  id: t.id, razaoSocial: t.razaoSocial, cnpj: t.cnpj, email: t.email, telefone: t.telefone, plano: t.plano, ciclo: t.ciclo,
  status: t.status, situacao: statusEfetivo(t, hoje), bloqueada: contaBloqueada(t, hoje), trialAte: t.trialAte, diasRestantes: diasRestantesTeste(t, hoje),
  ultimoAcessoEm: t.ultimoAcessoEm, createdAt: t.createdAt, interna: ehContaInterna(t),
  usuarios: t._count?.users ?? 0, obras: t._count?.obras ?? 0,
});

const textoCurto = (v, max) => String(v ?? "").trim().slice(0, max);

async function carregar(req) {
  const t = await prisma.tenant.findUnique({ where: { id: String(req.params.id).slice(0, 40) }, include: { _count: { select: { users: true, obras: true } } } });
  if (!t) throw new ErroNegocio("Empresa não encontrada.", 404);
  return t;
}

// ─── Lista ────────────────────────────────────────────────────────────────────

router.get("/", exigirPermissao("clientes"), rota(async (req, res) => {
  const q = req.query;
  const hoje = hojeBR();
  const pagina = Math.max(1, parseInt(q.pagina) || 1);
  const limite = Math.min(100, Math.max(1, parseInt(q.limite) || LIMITE_PADRAO));
  const and = [];
  const porSituacao = q.status ? filtroSituacao(String(q.status), hoje) : null;
  if (porSituacao) and.push(porSituacao);
  if (q.plano && PLANOS[String(q.plano)]) and.push({ plano: String(q.plano) });
  const busca = textoCurto(q.q, 80);
  if (busca) {
    const digitos = busca.replace(/\D/g, "");
    and.push({ OR: [
      { razaoSocial: { contains: busca, mode: "insensitive" } }, { email: { contains: busca, mode: "insensitive" } }, { cnpj: { contains: busca } },
      ...(digitos.length >= 4 ? [{ telefone: { contains: digitos } }] : []),
    ] });
  }
  const where = and.length ? { AND: and } : {};
  const ordem = { acesso: [{ ultimoAcessoEm: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }], nome: [{ razaoSocial: "asc" }] }[q.ordem] || [{ createdAt: "desc" }];

  const [total, itens, porStatus, vencidos] = await Promise.all([
    prisma.tenant.count({ where }),
    prisma.tenant.findMany({ where, orderBy: ordem, skip: (pagina - 1) * limite, take: limite, include: { _count: { select: { users: true, obras: true } } } }),
    prisma.tenant.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.tenant.count({ where: filtroSituacao("trial_expirado", hoje) }),
  ]);
  // Quantas empresas em cada situação (para os cartões do topo); o teste vencido sai do total de "trial"
  const resumo = Object.fromEntries(Object.keys(SITUACOES).map(s => [s, 0]));
  for (const g of porStatus) if (g.status in resumo) resumo[g.status] = g._count._all;
  resumo.trial_expirado = vencidos;
  resumo.trial = Math.max(0, resumo.trial - vencidos);
  res.json({ total, pagina, limite, resumo, itens: itens.map(t => linhaCliente(t, hoje)) });
}));

// ─── Detalhe ──────────────────────────────────────────────────────────────────

router.get("/:id", exigirPermissao("clientes"), rota(async (req, res) => {
  const t = await carregar(req);
  const hoje = hojeBR();
  const verFinanceiro = temPermissao(req.equipe, "financeiro");
  const [usuarios, chamados, abertos, assinatura, cobrancas] = await Promise.all([
    prisma.user.findMany({ where: { tenantId: t.id }, select: { id: true, nome: true, email: true, role: true, ativo: true, createdAt: true }, orderBy: [{ ativo: "desc" }, { createdAt: "asc" }] }),
    prisma.ticket.findMany({ where: { tenantId: t.id }, orderBy: { id: "desc" }, take: 15, select: { id: true, canal: true, assunto: true, setor: true, status: true, prioridade: true, createdAt: true } }),
    prisma.ticket.count({ where: { tenantId: t.id, status: { in: ["aberto", "em_atendimento", "aguardando_cliente", "na_fila"] } } }),
    prisma.assinatura.findUnique({ where: { tenantId: t.id } }),
    verFinanceiro ? prisma.cobranca.findMany({ where: { tenantId: t.id }, orderBy: [{ vencimento: "desc" }, { id: "desc" }], take: 60 }) : Promise.resolve(null),
  ]);
  const lim = getLimites(t.plano);
  const aTeto = n => (Number.isFinite(n) ? n : null);
  res.json({
    ...linhaCliente(t, hoje),
    notasInternas: t.notasInternas, motivoStatus: t.motivoStatus,
    aceite: { em: t.aceiteMensagensEm, texto: t.aceiteMensagensTexto, ip: t.aceiteMensagensIp },
    planoNome: lim.label, uso: { obras: t._count.obras, obrasLimite: aTeto(lim.obras), usuarios: t._count.users, usuariosLimite: aTeto(lim.usuarios) },
    assinatura: verFinanceiro ? cobranca.assinaturaEquipe(assinatura, t) : null,
    cobrancas: cobrancas ? cobrancas.map(c => cobranca.cobrancaEquipe(c, hoje)) : null,
    usuariosLista: usuarios,
    chamados: chamados.map(c => ({ ...c, setorRotulo: rotuloSetor(c.setor) })), chamadosAbertos: abertos,
  });
}));

// ─── Ações (clientes_editar) ──────────────────────────────────────────────────

router.post("/:id/plano", editar, rota(async (req, res) => {
  const t = await carregar(req);
  const plano = String(req.body?.plano ?? "");
  const ciclo = req.body?.ciclo === undefined ? t.ciclo : String(req.body.ciclo);
  if (!PLANOS[plano]) throw new ErroNegocio("Escolha um plano válido.");
  if (!["mensal", "anual"].includes(ciclo)) throw new ErroNegocio("O ciclo é mensal ou anual.");
  if (plano === t.plano && ciclo === t.ciclo) throw new ErroNegocio("A empresa já está nesse plano e ciclo.");
  // Assinatura com o preço de lista antigo acompanha o plano novo; preço combinado (diferente da lista) fica como está
  const ass = await prisma.assinatura.findUnique({ where: { tenantId: t.id } });
  const acompanha = ass && emCentavos(ass.valor) === valorListaCent(t.plano, t.ciclo);
  // Empresa cobrada no Stripe: o preço da assinatura de lá muda junto (mesmo ciclo, proporcional ao que já foi cobrado). Se o Stripe falhar, nada muda aqui.
  if (ass?.gateway === "stripe" && ass.gatewayAssinaturaId) {
    if (ciclo !== t.ciclo) throw new ErroNegocio("A cobrança desta empresa está no Stripe: para mudar o ciclo, ela precisa cancelar a assinatura e assinar de novo no ciclo novo.", 409);
    try {
      const sub = await stripeApi.lerAssinatura(ass.gatewayAssinaturaId);
      const itemId = sub.items?.data?.[0]?.id;
      if (!itemId) throw new ErroGateway("assinatura sem item", 0);
      await stripeApi.atualizarPreco({ assinaturaId: ass.gatewayAssinaturaId, itemId, valorCent: acompanha ? valorListaCent(plano, ciclo) : emCentavos(ass.valor), ciclo, plano, nomeProduto: `ConstruktPro ${getLimites(plano).label} (${ciclo === "anual" ? "anual" : "mensal"})` });
    } catch (e) {
      if (!(e instanceof ErroGateway)) throw e;
      console.error(`[clientes] troca de plano no Stripe (empresa ${t.id}):`, e.message);
      throw new ErroNegocio(`Não foi possível atualizar a assinatura no Stripe (${e.message}). O plano não foi alterado.`, 502);
    }
  }
  await prisma.$transaction(async tx => {
    await tx.tenant.update({ where: { id: t.id }, data: { plano, ciclo } });
    if (acompanha) await tx.assinatura.update({ where: { id: ass.id }, data: { valor: valorListaCent(plano, ciclo) / 100 } });
  });
  invalidarConta(t.id);
  await registrarAuditoria(req, { acao: "cliente_plano", alvoTipo: "empresa", alvoId: t.id, tenantId: t.id, detalhe: `${t.plano}/${t.ciclo} para ${plano}/${ciclo}${acompanha ? ". O valor da assinatura acompanhou o preço de lista" : ""}` });
  res.json({ ok: true });
}));

router.post("/:id/estender-teste", editar, rota(async (req, res) => {
  const t = await carregar(req);
  const dias = parseInt(req.body?.dias, 10);
  if (!Number.isInteger(dias) || dias < 1 || dias > MAX_DIAS_EXTENSAO) throw new ErroNegocio(`Informe de 1 a ${MAX_DIAS_EXTENSAO} dias.`);
  if (t.status !== "trial") throw new ErroNegocio("Só dá para estender o teste de uma conta em teste. Para liberar outra conta, ative-a.", 409);
  const hoje = hojeBR();
  const base = t.trialAte && t.trialAte > hoje ? t.trialAte : hoje; // teste vencido recomeça de hoje
  const novo = somarDias(base, dias);
  const motivo = textoCurto(req.body?.motivo, 200);
  await prisma.tenant.update({ where: { id: t.id }, data: { trialAte: novo } });
  invalidarConta(t.id);
  await registrarAuditoria(req, { acao: "cliente_teste", alvoTipo: "empresa", alvoId: t.id, tenantId: t.id, detalhe: `${dias} dia(s): teste até ${novo}${motivo ? `. ${motivo}` : ""}` });
  res.json({ ok: true, trialAte: novo });
}));

const STATUS_ALVO = ["ativo", "inadimplente", "suspenso", "cancelado"];
/**
 * Muda a situação da empresa. Ativar cria a assinatura (valor de lista) se ainda não existe e marca a data de ativação;
 * cancelar marca o cancelamento. Com `assinatura` no corpo (valor, diaVencimento, cortesia, primeiraCobranca) a ativação
 * também combina o preço e já gera a primeira cobrança: isso é dinheiro, então exige a permissão `financeiro`.
 */
router.post("/:id/status", editar, rota(async (req, res) => {
  const t = await carregar(req);
  const alvo = String(req.body?.status ?? "");
  if (!STATUS_ALVO.includes(alvo)) throw new ErroNegocio("Escolha ativar, marcar inadimplente, suspender ou cancelar.");
  if (ehContaInterna(t)) throw new ErroNegocio("Esta é a conta interna da casa (vídeos e testes): ela nunca é suspensa nem cancelada.", 409);
  if (t.status === alvo) throw new ErroNegocio(`A conta já está ${rotuloSituacao(alvo).toLowerCase()}.`, 409);
  const motivo = textoCurto(req.body?.motivo, 300);
  if (alvo !== "ativo" && motivo.length < 3) throw new ErroNegocio("Informe o motivo (fica registrado na auditoria).");
  const comAssinatura = alvo === "ativo" && req.body?.assinatura && typeof req.body.assinatura === "object" ? req.body.assinatura : null;
  if (comAssinatura && !temPermissao(req.equipe, "financeiro")) throw new ErroNegocio("Combinar o preço e gerar a cobrança exige a permissão Financeiro.", 403);

  const antes = statusEfetivo(t, hojeBR());
  await prisma.$transaction(async tx => {
    await tx.tenant.update({ where: { id: t.id }, data: { status: alvo, motivoStatus: motivo || null } });
    if (alvo === "ativo") await cobranca.configurarAssinatura(tx, t, { ativar: true, valor: comAssinatura?.valor, diaVencimento: comAssinatura?.diaVencimento, cortesia: comAssinatura?.cortesia });
    if (alvo === "cancelado") await cobranca.configurarAssinatura(tx, t, { cancelar: true });
  });
  invalidarConta(t.id);
  await registrarAuditoria(req, { acao: "cliente_status", alvoTipo: "empresa", alvoId: t.id, tenantId: t.id, detalhe: `${antes} para ${alvo}${motivo ? `: ${motivo}` : ""}${comAssinatura?.cortesia ? " (cortesia)" : ""}` });

  let cobrancaCriada = null;
  if (comAssinatura?.primeiraCobranca && !comAssinatura.cortesia) {
    // A ativação já valeu; se a cobrança não puder ser criada (ex.: mês já coberto), a resposta avisa em vez de desfazer a ativação
    try {
      const c = await cobranca.criarCobranca({ tenantId: t.id, referencia: comAssinatura.primeiraCobranca.referencia, vencimento: comAssinatura.primeiraCobranca.vencimento, registradaPorId: req.equipe.id });
      cobrancaCriada = c;
      await registrarAuditoria(req, { acao: "cobranca_criou", alvoTipo: "cobranca", alvoId: c.id, tenantId: t.id, detalhe: `${c.referencia}, R$ ${c.valor.toFixed(2)}, vence ${c.vencimento} (primeira cobrança)` });
    } catch (e) {
      if (!(e instanceof ErroNegocio)) throw e;
      return res.json({ ok: true, avisoCobranca: e.message });
    }
  }
  res.json({ ok: true, cobranca: cobrancaCriada });
}));

/** Combina (ou corrige) o preço, o dia do vencimento e a cortesia da assinatura da empresa. */
router.put("/:id/assinatura", exigirPermissao("financeiro"), rota(async (req, res) => {
  const t = await carregar(req);
  if (ehContaInterna(t)) throw new ErroNegocio("A conta interna da casa não tem assinatura.", 409);
  const { valor, diaVencimento, cortesia } = req.body || {};
  const a = await cobranca.configurarAssinatura(prisma, t, { valor, diaVencimento, cortesia });
  await registrarAuditoria(req, { acao: "cliente_assinatura", alvoTipo: "empresa", alvoId: t.id, tenantId: t.id, detalhe: `R$ ${Number(a.valor).toFixed(2)} por ${t.ciclo === "anual" ? "ano" : "mês"}, vence dia ${a.diaVencimento}${a.cortesia ? ", cortesia" : ""}` });
  res.json(cobranca.assinaturaEquipe(a, t));
}));

router.patch("/:id/notas", editar, rota(async (req, res) => {
  const t = await carregar(req);
  const notas = String(req.body?.notas ?? "").trim().slice(0, 4000);
  await prisma.tenant.update({ where: { id: t.id }, data: { notasInternas: notas || null } });
  await registrarAuditoria(req, { acao: "cliente_notas", alvoTipo: "empresa", alvoId: t.id, tenantId: t.id, detalhe: notas ? "Atualizou as notas internas" : "Apagou as notas internas" });
  res.json({ ok: true });
}));

// ─── Entrar como o cliente (somente leitura) ──────────────────────────────────

/**
 * Emite um token do sistema do cliente, só de leitura, por 30 minutos e sem renovação, ligado a um chamado da empresa.
 * O chamado recebe uma mensagem de sistema (o cliente sabe que alguém consultou a conta) e a auditoria registra a entrada.
 * A pessoa "vista" é o administrador ativo da empresa: é quem enxerga tudo.
 */
router.post("/:id/entrar", exigirPermissao("clientes"), rota(async (req, res) => {
  const t = await carregar(req);
  const adm = await prisma.user.findFirst({ where: { tenantId: t.id, role: "tenant_admin", ativo: true }, orderBy: { id: "asc" }, select: { id: true, permissoes: true } });
  if (!adm) throw new ErroNegocio("Esta empresa não tem administrador ativo para consultar.", 409);
  const chamado = await registrarEntradaLeitura(req.equipe, { ticketId: req.body?.chamadoId, tenantId: t.id, minutos: DURACAO_LEITURA_MIN });
  const token = jwt.sign(
    { userId: adm.id, tenantId: t.id, role: "tenant_admin", leitura: true, equipeId: req.equipe.id, chamadoId: chamado.id },
    process.env.JWT_SECRET, { expiresIn: `${DURACAO_LEITURA_MIN}m` },
  );
  await registrarAuditoria(req, { acao: "cliente_entrou_leitura", alvoTipo: "empresa", alvoId: t.id, tenantId: t.id, ticketId: chamado.id, detalhe: `Entrou em modo leitura por ${DURACAO_LEITURA_MIN} min (chamado #${chamado.numero})` });
  res.json({
    token, chamado: chamado.numero, expiraEm: new Date(Date.now() + DURACAO_LEITURA_MIN * 60000).toISOString(),
    user: { id: adm.id, nome: `Equipe ${String(req.equipe.nome).split(/\s+/)[0]}`, role: "tenant_admin", permissoes: adm.permissoes ?? [], ocultarTour: true },
    tenant: tenantParaCliente(t),
  });
}));

export default router;
