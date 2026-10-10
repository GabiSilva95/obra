import { Router } from "express";
import prisma from "../db.js";
import { hojeBR, somarDias, diasEntre } from "../utils/datas.js";
import { emCentavos, emReais } from "../financeiro/dinheiro.js";
import { ErroNegocio, rota, dataValida } from "../financeiro/erro.js";
import { serializarTitulo, serializarConta } from "../financeiro/serializar.js";
import { garantirPadroes } from "../financeiro/padroes.js";
import { saldosDasContas as saldosDoBanco } from "../financeiro/saldos.js";
import { montarFluxo, envelhecimento } from "../financeiro/fluxo.js";
import { gerarTituloDaCompra } from "../financeiro/compras.js";
import { gerarPendencias, contarPendencias, gerarTitulosDeDiarias, gerarTitulosDeLocacoes, lerPago } from "../financeiro/geracao.js";
import {
  TX, lerRateio, validarVinculos, montarParcelas, criarDocumento, baixarTitulo, estornarBaixa,
  cancelarTitulo, ajustarTitulo, excluirDocumento, atualizarDocumento,
} from "../financeiro/servico.js";

const router = Router();
const tenantDe = req => req.user.tenantId;
const inteiro = v => (v === undefined || v === null || v === "" ? null : parseInt(v));
const texto = v => (typeof v === "string" && v.trim() ? v.trim() : null);

const INCLUDE_TITULO = {
  pessoa: { select: { id: true, nome: true } },
  rateios: true,
  baixas: { orderBy: { id: "asc" } },
};

// ─── Saldos ──────────────────────────────────────────────────────────────────

const saldosDasContas = tenantId => saldosDoBanco(prisma, tenantId);

// ─── Base: contas, categorias, centros, configuração ─────────────────────────

router.get("/base", rota(async (req, res) => {
  const tenantId = tenantDe(req);
  await garantirPadroes(prisma, tenantId);
  const [contas, categorias, centros, config, saldos] = await Promise.all([
    prisma.contaFinanceira.findMany({ where: { tenantId }, orderBy: [{ ativa: "desc" }, { nome: "asc" }] }),
    prisma.categoriaFinanceira.findMany({ where: { tenantId }, orderBy: { nome: "asc" } }),
    prisma.centroCusto.findMany({ where: { tenantId }, orderBy: { nome: "asc" } }),
    prisma.configFinanceira.findUnique({ where: { tenantId } }),
    saldosDasContas(tenantId),
  ]);
  res.json({
    contas: contas.map(c => serializarConta(c, saldos.get(c.id) ?? 0)),
    categorias, centros, config: { prazoPadraoDias: config?.prazoPadraoDias ?? 30 },
  });
}));

router.put("/config", rota(async (req, res) => {
  const dias = inteiro(req.body.prazoPadraoDias);
  if (!(dias >= 0 && dias <= 365)) throw new ErroNegocio("O prazo padrão deve ficar entre 0 e 365 dias.");
  const c = await prisma.configFinanceira.upsert({ where: { tenantId: tenantDe(req) }, update: { prazoPadraoDias: dias }, create: { tenantId: tenantDe(req), prazoPadraoDias: dias } });
  res.json({ prazoPadraoDias: c.prazoPadraoDias });
}));

function lerConta(body, tenantId) {
  const nome = texto(body.nome);
  if (!nome) throw new ErroNegocio("Informe o nome da conta.");
  const saldo = Number(body.saldoInicial ?? 0);
  if (!Number.isFinite(saldo)) throw new ErroNegocio("Saldo inicial inválido.");
  const data = body.dataSaldoInicial || hojeBR();
  if (!dataValida(data)) throw new ErroNegocio("Data do saldo inicial inválida.");
  if (!["banco", "caixa"].includes(body.tipo || "banco")) throw new ErroNegocio("Tipo de conta inválido.");
  return {
    tenantId, nome, tipo: body.tipo || "banco", banco: texto(body.banco), agencia: texto(body.agencia), numero: texto(body.numero),
    saldoInicial: (emCentavos(saldo) / 100).toFixed(2), dataSaldoInicial: data, ativa: body.ativa ?? true,
  };
}

router.post("/contas", rota(async (req, res) => {
  const c = await prisma.contaFinanceira.create({ data: lerConta(req.body, tenantDe(req)) });
  res.status(201).json(serializarConta(c, emCentavos(c.saldoInicial)));
}));

router.put("/contas/:id", rota(async (req, res) => {
  const id = inteiro(req.params.id);
  const existe = await prisma.contaFinanceira.findFirst({ where: { id, tenantId: tenantDe(req) } });
  if (!existe) throw new ErroNegocio("Conta não encontrada.", 404);
  const { tenantId: _t, ...data } = lerConta({ ...existe, saldoInicial: Number(existe.saldoInicial), ...req.body }, tenantDe(req));
  const c = await prisma.contaFinanceira.update({ where: { id }, data });
  const saldos = await saldosDasContas(tenantDe(req));
  res.json(serializarConta(c, saldos.get(id) ?? 0));
}));

router.delete("/contas/:id", rota(async (req, res) => {
  const id = inteiro(req.params.id);
  const tenantId = tenantDe(req);
  const existe = await prisma.contaFinanceira.findFirst({ where: { id, tenantId } });
  if (!existe) throw new ErroNegocio("Conta não encontrada.", 404);
  const [baixas, lanc, transf] = await Promise.all([
    prisma.baixa.count({ where: { contaId: id } }),
    prisma.lancamentoBancario.count({ where: { contaId: id } }),
    prisma.transferenciaConta.count({ where: { OR: [{ deContaId: id }, { paraContaId: id }] } }),
  ]);
  if (baixas || lanc || transf) throw new ErroNegocio("A conta tem movimentações: inative em vez de excluir.", 409);
  await prisma.contaFinanceira.delete({ where: { id } });
  res.json({ ok: true });
}));

// Categorias e centros de custo: cadastros simples
function cadastroSimples(caminho, modelo, campos) {
  router.post(`/${caminho}`, rota(async (req, res) => {
    const dados = campos(req.body);
    const item = await prisma[modelo].create({ data: { tenantId: tenantDe(req), ...dados } }).catch(e => {
      if (e.code === "P2002") throw new ErroNegocio("Já existe um cadastro com este nome.", 409);
      throw e;
    });
    res.status(201).json(item);
  }));
  router.put(`/${caminho}/:id`, rota(async (req, res) => {
    const id = inteiro(req.params.id);
    if (!(await prisma[modelo].findFirst({ where: { id, tenantId: tenantDe(req) } }))) throw new ErroNegocio("Cadastro não encontrado.", 404);
    const item = await prisma[modelo].update({ where: { id }, data: campos(req.body, true) }).catch(e => {
      if (e.code === "P2002") throw new ErroNegocio("Já existe um cadastro com este nome.", 409);
      throw e;
    });
    res.json(item);
  }));
}
cadastroSimples("categorias", "categoriaFinanceira", (b, parcial) => {
  const nome = texto(b.nome);
  if (!parcial && !nome) throw new ErroNegocio("Informe o nome da categoria.");
  if (!parcial && !["pagar", "receber"].includes(b.tipo)) throw new ErroNegocio("Tipo de categoria inválido.");
  return { ...(nome ? { nome } : {}), ...(!parcial ? { tipo: b.tipo } : {}), ...(b.ativa !== undefined ? { ativa: !!b.ativa } : {}) };
});
cadastroSimples("centros", "centroCusto", (b, parcial) => {
  const nome = texto(b.nome);
  if (!parcial && !nome) throw new ErroNegocio("Informe o nome do centro de custo.");
  return { ...(nome ? { nome } : {}), ...(b.codigo !== undefined ? { codigo: texto(b.codigo) } : {}), ...(b.ativo !== undefined ? { ativo: !!b.ativo } : {}) };
});

// ─── Títulos ─────────────────────────────────────────────────────────────────

const ABERTOS = ["aberto", "parcial"];

function filtroTitulos(req, hoje) {
  const q = req.query;
  const where = { tenantId: tenantDe(req) };
  if (["pagar", "receber"].includes(q.tipo)) where.tipo = q.tipo;
  switch (q.status || "aberto") {
    case "aberto": where.status = { in: ABERTOS }; break;
    case "vencido": where.status = { in: ABERTOS }; where.vencimento = { lt: hoje }; break;
    case "avencer": where.status = { in: ABERTOS }; where.vencimento = { gte: hoje }; break;
    case "quitado": where.status = "quitado"; break;
    case "cancelado": where.status = "cancelado"; break;
    case "todos": break;
    default: throw new ErroNegocio("Filtro de status inválido.");
  }
  if (q.de || q.ate) {
    where.vencimento = { ...(where.vencimento || {}), ...(dataValida(q.de) ? { gte: q.de } : {}), ...(dataValida(q.ate) ? { lte: q.ate } : {}) };
  }
  if (q.pessoaId) where.pessoaId = inteiro(q.pessoaId);
  if (q.grupoId) where.grupoId = String(q.grupoId);
  if (q.obraId) where.rateios = { some: { obraId: inteiro(q.obraId) } };
  if (q.centroCustoId) where.rateios = { some: { ...(where.rateios?.some || {}), centroCustoId: inteiro(q.centroCustoId) } };
  const busca = texto(q.q);
  if (busca) {
    where.OR = [
      { descricao: { contains: busca, mode: "insensitive" } }, { documento: { contains: busca, mode: "insensitive" } },
      { pessoaTexto: { contains: busca, mode: "insensitive" } }, { pessoa: { nome: { contains: busca, mode: "insensitive" } } },
    ];
  }
  return where;
}

async function rotulosDeCompra(titulos) {
  const ids = [...new Set(titulos.filter(t => t.origemTipo === "compra" && t.origemId).map(t => t.origemId))];
  if (!ids.length) return new Map();
  const ordens = await prisma.ordemCompra.findMany({ where: { id: { in: ids } }, select: { id: true, numero: true } });
  return new Map(ordens.map(o => [o.id, o.numero ?? o.id]));
}

router.get("/titulos", rota(async (req, res) => {
  const hoje = hojeBR();
  const where = filtroTitulos(req, hoje);
  const limite = Math.min(Math.max(inteiro(req.query.limite) || 100, 1), 500);
  const pagina = Math.max(inteiro(req.query.pagina) || 1, 1);
  const desc = req.query.ordem === "venc_desc" || ["quitado", "cancelado"].includes(req.query.status);
  const [itens, total, somaValor, somaBaixas] = await Promise.all([
    prisma.titulo.findMany({ where, include: INCLUDE_TITULO, orderBy: [{ vencimento: desc ? "desc" : "asc" }, { id: "asc" }], skip: (pagina - 1) * limite, take: limite }),
    prisma.titulo.count({ where }),
    prisma.titulo.aggregate({ where: { ...where, status: where.status === "cancelado" ? "cancelado" : { in: where.status?.in || ["aberto", "parcial", "quitado"] } }, _sum: { valor: true } }),
    prisma.baixa.aggregate({ where: { estornadaEm: null, titulo: { ...where, status: where.status === "cancelado" ? "cancelado" : { in: where.status?.in || ["aberto", "parcial", "quitado"] } } }, _sum: { valor: true } }),
  ]);
  const ordens = await rotulosDeCompra(itens);
  const valorCent = emCentavos(somaValor._sum.valor || 0);
  res.json({
    itens: itens.map(t => serializarTitulo(t, hoje, ordens)), total, pagina, limite,
    totais: { valor: emReais(valorCent), saldo: emReais(valorCent - emCentavos(somaBaixas._sum.valor || 0)) },
  });
}));

/** Documento novo: título(s) + rateio + (para despesa/receita) as linhas de custo da obra. */
router.post("/documentos", rota(async (req, res) => {
  const tenantId = tenantDe(req);
  const b = req.body;
  if (!["pagar", "receber"].includes(b.tipo)) throw new ErroNegocio("Tipo inválido.");
  const descricao = texto(b.descricao);
  if (!descricao) throw new ErroNegocio("Informe a descrição.");
  const valorCent = emCentavos(b.valor);
  if (!(valorCent > 0)) throw new ErroNegocio("O valor deve ser maior que zero.");
  const emissao = b.data || hojeBR();
  if (!dataValida(emissao)) throw new ErroNegocio("Data inválida.");
  const origemTipo = b.natureza === "outro" ? "avulso" : (b.tipo === "pagar" ? "despesa" : "receita");
  const rateio = lerRateio(b.rateio);
  const pessoaId = inteiro(b.pessoaId);
  const { parcelas, recorrente, baixaImediata } = montarParcelas({ valorCent, pagamento: b.pagamento });

  const resultado = await prisma.$transaction(async tx => {
    await validarVinculos(tx, tenantId, { linhas: rateio, pessoaId, contaId: baixaImediata?.contaId });
    return criarDocumento(tx, {
      tenantId, tipo: b.tipo, origemTipo, pessoaId, pessoaTexto: texto(b.pessoaTexto), descricao, documento: texto(b.documento),
      categoria: texto(b.categoria), obs: texto(b.obs), emissao, parcelas, rateio, recorrente, baixaImediata,
    });
  }, TX);
  res.status(201).json({ grupoId: resultado.grupoId });
}));

router.put("/documentos/:grupoId", rota(async (req, res) => {
  const tenantId = tenantDe(req);
  const b = req.body;
  const patch = {};
  if (b.descricao !== undefined) { if (!texto(b.descricao)) throw new ErroNegocio("Informe a descrição."); patch.descricao = texto(b.descricao); }
  for (const k of ["categoria", "documento", "obs", "pessoaTexto"]) if (b[k] !== undefined) patch[k] = texto(b[k]);
  if (b.pessoaId !== undefined) patch.pessoaId = inteiro(b.pessoaId);
  if (b.data !== undefined) { if (!dataValida(b.data)) throw new ErroNegocio("Data inválida."); patch.emissao = b.data; }
  if (b.rateio) patch.rateio = lerRateio(b.rateio);
  if (b.valor !== undefined) { patch.valorCent = emCentavos(b.valor); if (!(patch.valorCent > 0)) throw new ErroNegocio("O valor deve ser maior que zero."); }
  if (b.pagamento !== undefined) patch.pagamento = b.pagamento;
  await prisma.$transaction(async tx => {
    await validarVinculos(tx, tenantId, { linhas: patch.rateio || [], pessoaId: patch.pessoaId, contaId: patch.pagamento?.contaId ? inteiro(patch.pagamento.contaId) : undefined });
    await atualizarDocumento(tx, { tenantId, grupoId: req.params.grupoId, patch });
  }, TX);
  res.json({ ok: true });
}));

router.delete("/documentos/:grupoId", rota(async (req, res) => {
  await prisma.$transaction(tx => excluirDocumento(tx, { tenantId: tenantDe(req), grupoId: req.params.grupoId }), TX);
  res.json({ ok: true });
}));

router.patch("/titulos/:id", rota(async (req, res) => {
  const t = await prisma.$transaction(tx => ajustarTitulo(tx, { tenantId: tenantDe(req), tituloId: inteiro(req.params.id), ...req.body }), TX);
  res.json({ id: t.id, vencimento: t.vencimento });
}));

router.post("/titulos/:id/cancelar", rota(async (req, res) => {
  await prisma.$transaction(tx => cancelarTitulo(tx, { tenantId: tenantDe(req), tituloId: inteiro(req.params.id) }), TX);
  res.json({ ok: true });
}));

// ─── Baixas ──────────────────────────────────────────────────────────────────

const lerBaixa = b => ({
  contaId: inteiro(b.contaId), data: b.data || hojeBR(), forma: b.forma || "pix", obs: texto(b.obs),
  jurosCent: emCentavos(b.juros || 0), multaCent: emCentavos(b.multa || 0), descontoCent: emCentavos(b.desconto || 0),
});

router.post("/titulos/:id/baixas", rota(async (req, res) => {
  const tenantId = tenantDe(req);
  const dados = lerBaixa(req.body);
  if (!dados.contaId) throw new ErroNegocio("Escolha a conta.");
  const baixa = await prisma.$transaction(tx => baixarTitulo(tx, { tenantId, tituloId: inteiro(req.params.id), valorCent: emCentavos(req.body.valor), ...dados }), TX);
  res.status(201).json({ id: baixa.id });
}));

/** Baixa o saldo inteiro de vários títulos de uma vez, na mesma conta e data. Tudo ou nada. */
router.post("/titulos/baixa-lote", rota(async (req, res) => {
  const tenantId = tenantDe(req);
  const ids = (req.body.ids || []).map(inteiro).filter(Boolean);
  if (!ids.length) throw new ErroNegocio("Selecione ao menos um título.");
  if (ids.length > 200) throw new ErroNegocio("Selecione no máximo 200 títulos por vez.");
  const dados = lerBaixa(req.body);
  if (!dados.contaId) throw new ErroNegocio("Escolha a conta.");
  const { jurosCent: _j, multaCent: _m, descontoCent: _d, ...comum } = dados;
  await prisma.$transaction(async tx => {
    const titulos = await tx.titulo.findMany({ where: { id: { in: ids }, tenantId }, include: { baixas: true } });
    if (titulos.length !== ids.length) throw new ErroNegocio("Algum título não foi encontrado.", 404);
    if (new Set(titulos.map(t => t.tipo)).size > 1) throw new ErroNegocio("Não misture contas a pagar e a receber na mesma baixa.");
    for (const t of titulos) {
      const saldo = emCentavos(t.valor) - t.baixas.filter(b => !b.estornadaEm).reduce((s, b) => s + emCentavos(b.valor), 0);
      if (saldo <= 0) throw new ErroNegocio(`"${t.descricao}" já está quitado.`, 409);
      await baixarTitulo(tx, { tenantId, tituloId: t.id, valorCent: saldo, ...comum });
    }
  }, TX);
  res.json({ ok: true, quantidade: ids.length });
}));

router.post("/baixas/:id/estornar", rota(async (req, res) => {
  await prisma.$transaction(tx => estornarBaixa(tx, { tenantId: tenantDe(req), baixaId: inteiro(req.params.id) }), TX);
  res.json({ ok: true });
}));

// ─── Resumo (visão geral) ────────────────────────────────────────────────────

router.get("/resumo", rota(async (req, res) => {
  const tenantId = tenantDe(req);
  const hoje = hojeBR();
  const em7 = somarDias(hoje, 7);
  const em30 = somarDias(hoje, 30);
  const [contas, saldos, linhas] = await Promise.all([
    prisma.contaFinanceira.findMany({ where: { tenantId, ativa: true }, orderBy: { nome: "asc" } }),
    saldosDasContas(tenantId),
    prisma.$queryRaw`
      SELECT t.tipo,
        COALESCE(SUM(s.saldo) FILTER (WHERE t.vencimento < ${hoje}), 0) AS vencido,
        COUNT(*) FILTER (WHERE t.vencimento < ${hoje}) AS "qtdVencido",
        COALESCE(SUM(s.saldo) FILTER (WHERE t.vencimento = ${hoje}), 0) AS hoje,
        COALESCE(SUM(s.saldo) FILTER (WHERE t.vencimento > ${hoje} AND t.vencimento <= ${em7}), 0) AS prox7,
        COALESCE(SUM(s.saldo) FILTER (WHERE t.vencimento > ${em7} AND t.vencimento <= ${em30}), 0) AS prox30,
        COALESCE(SUM(s.saldo), 0) AS aberto,
        COUNT(*) AS qtd
      FROM "Titulo" t
      CROSS JOIN LATERAL (
        SELECT t.valor - COALESCE((SELECT SUM(b.valor) FROM "Baixa" b WHERE b."tituloId" = t.id AND b."estornadaEm" IS NULL), 0) AS saldo
      ) s
      WHERE t."tenantId" = ${tenantId} AND t.status IN ('aberto', 'parcial')
      GROUP BY t.tipo`,
  ]);
  const vazio = { vencido: 0, qtdVencido: 0, hoje: 0, prox7: 0, prox30: 0, aberto: 0, qtd: 0 };
  const porTipo = Object.fromEntries(linhas.map(l => [l.tipo, {
    vencido: Number(l.vencido), qtdVencido: Number(l.qtdVencido), hoje: Number(l.hoje), prox7: Number(l.prox7),
    prox30: Number(l.prox30), aberto: Number(l.aberto), qtd: Number(l.qtd),
  }]));
  const contasOut = contas.map(c => serializarConta(c, saldos.get(c.id) ?? 0));
  res.json({
    hoje, contas: contasOut,
    saldoTotal: emReais(contasOut.reduce((s, c) => s + emCentavos(c.saldo), 0)),
    pagar: porTipo.pagar || vazio, receber: porTipo.receber || vazio,
    pendencias: await contarPendencias(tenantId),
  });
}));

// ─── Fluxo de caixa e relatórios ─────────────────────────────────────────────

/** Fluxo de caixa: realizado (baixas) e previsto (saldo dos títulos em aberto, no vencimento). */
router.get("/fluxo", rota(async (req, res) => {
  const tenantId = tenantDe(req);
  const q = req.query;
  const hoje = hojeBR();
  const de = dataValida(q.de) ? q.de : `${hoje.slice(0, 7)}-01`;
  const ate = dataValida(q.ate) ? q.ate : somarDias(hoje, 90);
  const agrupar = ["dia", "semana", "mes"].includes(q.agrupar) ? q.agrupar : "semana";
  if (ate < de) throw new ErroNegocio("A data final é anterior à inicial.");
  const dias = diasEntre(de, ate);
  if (dias > 1100) throw new ErroNegocio("Escolha um período de no máximo 3 anos.");
  if (agrupar === "dia" && dias > 370) throw new ErroNegocio("Para ver por dia, escolha um período de até 1 ano.");
  const contaId = inteiro(q.contaId), obraId = inteiro(q.obraId), centroCustoId = inteiro(q.centroCustoId);
  const [titulos, saldos, contas] = await Promise.all([
    prisma.titulo.findMany({
      where: { tenantId, status: { not: "cancelado" }, OR: [
        { baixas: { some: { estornadaEm: null, data: { gte: de, lte: ate }, ...(contaId ? { contaId } : {}) } } },
        { status: { in: ABERTOS }, vencimento: { lte: ate } },
      ] },
      include: { rateios: true, baixas: true },
    }),
    saldosDoBanco(prisma, tenantId, { ate: somarDias(de, -1) }),
    prisma.contaFinanceira.findMany({ where: { tenantId, ...(contaId ? { id: contaId } : { ativa: true }) }, select: { id: true } }),
  ]);
  const saldoInicialCent = contas.reduce((s, c) => s + (saldos.get(c.id) ?? 0), 0);
  res.json({ hoje, de, ate, agrupar, ...montarFluxo({ titulos, hoje, de, ate, agrupar, saldoInicialCent, contaId, obraId, centroCustoId }) });
}));

/** Contas em aberto por pessoa e faixa de atraso. */
router.get("/relatorios/envelhecimento", rota(async (req, res) => {
  const tipo = req.query.tipo === "receber" ? "receber" : "pagar";
  const hoje = hojeBR();
  const titulos = await prisma.titulo.findMany({ where: { tenantId: tenantDe(req), tipo, status: { in: ABERTOS } }, include: { baixas: true, pessoa: { select: { nome: true } } } });
  res.json({ tipo, hoje, ...envelhecimento(titulos, hoje) });
}));

/** Extrato da conta no sistema: baixas e transferências do período, com saldo corrido. */
router.get("/contas/:id/movimentos", rota(async (req, res) => {
  const tenantId = tenantDe(req);
  const id = inteiro(req.params.id);
  const conta = await prisma.contaFinanceira.findFirst({ where: { id, tenantId } });
  if (!conta) throw new ErroNegocio("Conta não encontrada.", 404);
  const hoje = hojeBR();
  const de = dataValida(req.query.de) ? req.query.de : `${hoje.slice(0, 7)}-01`;
  const ate = dataValida(req.query.ate) ? req.query.ate : hoje;
  const inicio = de < conta.dataSaldoInicial ? conta.dataSaldoInicial : de;
  const [anterior, baixas, transf, nomes] = await Promise.all([
    saldoDe(tenantId, id, somarDias(de, -1)),
    prisma.baixa.findMany({ where: { tenantId, contaId: id, estornadaEm: null, data: { gte: inicio, lte: ate } }, include: { titulo: { include: { pessoa: { select: { nome: true } } } } }, orderBy: [{ data: "asc" }, { id: "asc" }] }),
    prisma.transferenciaConta.findMany({ where: { tenantId, OR: [{ deContaId: id }, { paraContaId: id }], data: { gte: inicio, lte: ate } }, orderBy: [{ data: "asc" }, { id: "asc" }] }),
    prisma.contaFinanceira.findMany({ where: { tenantId }, select: { id: true, nome: true } }),
  ]);
  const nome = cid => nomes.find(c => c.id === cid)?.nome || "Conta";
  const mov = [
    ...baixas.map(b => ({ data: b.data, ordem: b.id, tipo: b.titulo.tipo === "receber" ? "Recebimento" : "Pagamento", descricao: b.titulo.descricao, pessoa: b.titulo.pessoa?.nome || b.titulo.pessoaTexto || null,
      cent: (b.titulo.tipo === "receber" ? 1 : -1) * (emCentavos(b.valor) + emCentavos(b.juros) + emCentavos(b.multa) - emCentavos(b.desconto)) })),
    ...transf.map(t => ({ data: t.data, ordem: 1e9 + t.id, tipo: "Transferência", descricao: t.deContaId === id ? `Para ${nome(t.paraContaId)}` : `De ${nome(t.deContaId)}`, pessoa: null, cent: (t.deContaId === id ? -1 : 1) * emCentavos(t.valor) })),
  ].sort((a, b) => (a.data === b.data ? a.ordem - b.ordem : a.data.localeCompare(b.data)));
  let acum = anterior;
  const movimentos = mov.map(m => { acum += m.cent; return { data: m.data, tipo: m.tipo, descricao: m.descricao, pessoa: m.pessoa, valor: emReais(m.cent), saldo: emReais(acum) }; });
  res.json({ conta: { id, nome: conta.nome }, de, ate, saldoAnterior: emReais(anterior), movimentos, saldoFinal: emReais(acum) });
}));

const saldoDe = async (tenantId, contaId, ate) => (await saldosDoBanco(prisma, tenantId, { ate })).get(contaId) ?? 0;

// ─── Pendências: o que já aconteceu nos outros módulos e ainda não virou conta a pagar ─────────────

router.get("/pendencias", rota(async (req, res) => {
  res.json(await gerarPendencias(tenantDe(req)));
}));

const vencimentoOuNulo = v => (v ? (dataValida(v) ? v : (() => { throw new ErroNegocio("Vencimento inválido."); })()) : null);

/** Gera a conta a pagar de uma compra entregue que ficou sem título (ou que já foi paga). */
router.post("/gerar/compra", rota(async (req, res) => {
  const tenantId = tenantDe(req);
  const ordem = await prisma.ordemCompra.findFirst({
    where: { id: inteiro(req.body.ordemId), tenantId },
    include: { itens: true, fornecedorPessoa: { select: { id: true, nome: true } } },
  });
  if (!ordem) throw new ErroNegocio("Compra não encontrada.", 404);
  if (ordem.status !== "Entregue") throw new ErroNegocio("Só compras entregues geram conta a pagar.", 409);
  if (!ordem.itens.length && ordem.quantidade > 0) ordem.itens = [{ quantidade: ordem.quantidade, valorUnit: ordem.valorUnit }];
  const pago = lerPago(req.body.pago);
  const r = await prisma.$transaction(async tx => {
    if (pago) await validarVinculos(tx, tenantId, { contaId: pago.contaId });
    return gerarTituloDaCompra(tx, { tenantId, ordem, vencimento: vencimentoOuNulo(req.body.vencimento), pago });
  }, TX);
  if (!r) throw new ErroNegocio("Esta compra já tem conta a pagar, ou não tem valor.", 409);
  res.status(201).json({ grupoId: r.grupoId });
}));

router.post("/gerar/diarias", rota(async (req, res) => {
  const tenantId = tenantDe(req);
  const ids = (req.body.funcionarioIds || []).map(inteiro).filter(Boolean);
  if (!ids.length) throw new ErroNegocio("Selecione ao menos um colaborador.");
  const pago = lerPago(req.body.pago);
  const r = await prisma.$transaction(async tx => {
    if (pago) await validarVinculos(tx, tenantId, { contaId: pago.contaId });
    return gerarTitulosDeDiarias(tx, { tenantId, funcionarioIds: ids, de: req.body.de, ate: req.body.ate, vencimento: vencimentoOuNulo(req.body.vencimento), pago });
  }, TX);
  if (!r.length) throw new ErroNegocio("Não há diárias a pagar nesse período.", 409);
  res.status(201).json({ gerados: r.length });
}));

router.post("/gerar/locacoes", rota(async (req, res) => {
  const tenantId = tenantDe(req);
  const chaves = (req.body.chaves || []).map(String);
  if (!chaves.length) throw new ErroNegocio("Selecione ao menos um locador.");
  const pago = lerPago(req.body.pago);
  const r = await prisma.$transaction(async tx => {
    if (pago) await validarVinculos(tx, tenantId, { contaId: pago.contaId });
    return gerarTitulosDeLocacoes(tx, { tenantId, chaves, de: req.body.de, ate: req.body.ate, vencimento: vencimentoOuNulo(req.body.vencimento), pago });
  }, TX);
  if (!r.length) throw new ErroNegocio("Não há locações a pagar nesse período.", 409);
  res.status(201).json({ gerados: r.length });
}));

export default router;
