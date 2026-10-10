// Conciliação bancária: importação do extrato (OFX/CSV), sugestões e as ações sobre cada linha.
import { Router } from "express";
import prisma from "../db.js";
import { hojeBR } from "../utils/datas.js";
import { emCentavos, emReais } from "../financeiro/dinheiro.js";
import { ErroNegocio, rota, dataValida } from "../financeiro/erro.js";
import { lerOfx } from "../financeiro/ofx.js";
import { lerCsv } from "../financeiro/csv.js";
import { comHashes, sugerir, melhoresSugestoes } from "../financeiro/conciliacao.js";
import { saldosDasContas } from "../financeiro/saldos.js";
import { TX, lerRateio, validarVinculos, criarDocumento, baixarTitulo } from "../financeiro/servico.js";

const router = Router();
const tenantDe = req => req.user.tenantId;
const inteiro = v => (v === undefined || v === null || v === "" ? null : parseInt(v));
const MAX_LINHAS = 5000;

const travar = (tx, tenantId, id) => tx.$queryRaw`SELECT id FROM "LancamentoBancario" WHERE id = ${id} AND "tenantId" = ${tenantId} FOR UPDATE`;

/** Movimento da baixa no banco, com sinal: recebimento positivo, pagamento negativo. */
const movimentoCent = b => (b.titulo.tipo === "receber" ? 1 : -1) * (emCentavos(b.valor) + emCentavos(b.juros) + emCentavos(b.multa) - emCentavos(b.desconto));

const serializarLancamento = l => ({
  id: l.id, contaId: l.contaId, data: l.data, valor: Number(l.valor), descricao: l.descricao, status: l.status, origem: l.origem,
  baixas: (l.baixas || []).map(b => ({ id: b.id, tituloId: b.tituloId, titulo: b.titulo?.descricao, pessoa: b.titulo?.pessoa?.nome || b.titulo?.pessoaTexto || null, movimento: emReais(movimentoCent(b)) })),
  transferencias: [...(l.transferenciasDe || []), ...(l.transferenciasPara || [])].map(t => ({ id: t.id })),
});

const contaDoTenant = async (db, id, tenantId) => {
  const c = await db.contaFinanceira.findFirst({ where: { id, tenantId } });
  if (!c) throw new ErroNegocio("Conta não encontrada.", 404);
  return c;
};
const lancamentoDoTenant = async (tx, id, tenantId) => {
  await travar(tx, tenantId, id);
  const l = await tx.lancamentoBancario.findFirst({ where: { id, tenantId } });
  if (!l) throw new ErroNegocio("Linha do extrato não encontrada.", 404);
  return l;
};

// ─── Importação ──────────────────────────────────────────────────────────────

function lerArquivo(b) {
  if (typeof b.conteudo !== "string" || !b.conteudo.trim()) throw new ErroNegocio("O arquivo está vazio.");
  if (b.conteudo.length > 6_000_000) throw new ErroNegocio("O arquivo é grande demais.");
  let lido;
  try { lido = b.formato === "csv" ? lerCsv(b.conteudo, b.mapeamento) : lerOfx(b.conteudo); } catch (e) { throw new ErroNegocio(e.message); }
  if (lido.formato === "csv" && !lido.completo) return { precisaMapear: true, cabecalho: lido.cabecalho, mapeamento: lido.mapeamento };
  if (!lido.transacoes.length) throw new ErroNegocio("Nenhum lançamento reconhecido no arquivo.");
  if (lido.transacoes.length > MAX_LINHAS) throw new ErroNegocio(`O arquivo tem mais de ${MAX_LINHAS} lançamentos: importe por períodos menores.`);
  return { ...lido, transacoes: comHashes(lido.transacoes) };
}

router.post("/contas/:id/extrato/previa", rota(async (req, res) => {
  const contaId = inteiro(req.params.id);
  await contaDoTenant(prisma, contaId, tenantDe(req));
  const lido = lerArquivo(req.body);
  if (lido.precisaMapear) return res.json(lido);
  const existentes = new Set((await prisma.lancamentoBancario.findMany({ where: { contaId, hash: { in: lido.transacoes.map(t => t.hash) } }, select: { hash: true } })).map(x => x.hash));
  const transacoes = lido.transacoes.map(t => ({ ...t, duplicada: existentes.has(t.hash) }));
  const novas = transacoes.filter(t => !t.duplicada);
  res.json({
    formato: lido.formato, periodoInicio: lido.periodoInicio, periodoFim: lido.periodoFim, saldoFinal: lido.saldoFinal, dataSaldoFinal: lido.dataSaldoFinal,
    resumo: { total: transacoes.length, novas: novas.length, duplicadas: transacoes.length - novas.length,
      entradas: emReais(novas.filter(t => t.valor > 0).reduce((s, t) => s + emCentavos(t.valor), 0)), saidas: emReais(novas.filter(t => t.valor < 0).reduce((s, t) => s + emCentavos(t.valor), 0)) },
    transacoes,
  });
}));

router.post("/contas/:id/extrato", rota(async (req, res) => {
  const tenantId = tenantDe(req);
  const contaId = inteiro(req.params.id);
  await contaDoTenant(prisma, contaId, tenantId);
  const lido = lerArquivo(req.body);
  if (lido.precisaMapear) throw new ErroNegocio("Indique as colunas de data, descrição e valor do arquivo.");
  const r = await prisma.$transaction(async tx => {
    const imp = await tx.importacaoExtrato.create({
      data: { tenantId, contaId, arquivo: String(req.body.arquivo || "extrato").slice(0, 120), formato: lido.formato, periodoInicio: lido.periodoInicio, periodoFim: lido.periodoFim,
        saldoFinal: lido.saldoFinal != null ? lido.saldoFinal.toFixed(2) : null, dataSaldoFinal: lido.dataSaldoFinal, total: lido.transacoes.length },
    });
    const criados = await tx.lancamentoBancario.createMany({
      data: lido.transacoes.map(t => ({ tenantId, contaId, importacaoId: imp.id, data: t.data, valor: t.valor.toFixed(2), descricao: t.descricao.slice(0, 300), fitid: t.fitid, hash: t.hash, origem: "extrato" })),
      skipDuplicates: true,
    });
    await tx.importacaoExtrato.update({ where: { id: imp.id }, data: { novos: criados.count } });
    return { importacaoId: imp.id, novos: criados.count, duplicados: lido.transacoes.length - criados.count };
  }, TX);
  res.status(201).json(r);
}));

// ─── Tela de conciliação ─────────────────────────────────────────────────────

const INCLUDE_LANC = {
  baixas: { include: { titulo: { include: { pessoa: { select: { nome: true } } } } } },
  transferenciasDe: { select: { id: true } }, transferenciasPara: { select: { id: true } },
};

async function carregarConciliacao(tenantId, contaId, status) {
  const conta = await contaDoTenant(prisma, contaId, tenantId);
  const [lancs, pendentes, livres, transfLivres, ultimaImp] = await Promise.all([
    prisma.lancamentoBancario.findMany({ where: { tenantId, contaId, ...(status !== "todos" ? { status } : {}) }, include: INCLUDE_LANC, orderBy: [{ data: "asc" }, { id: "asc" }], take: 500 }),
    prisma.lancamentoBancario.findMany({ where: { tenantId, contaId, status: "pendente" }, orderBy: [{ data: "asc" }, { id: "asc" }], take: 500 }),
    prisma.baixa.findMany({ where: { tenantId, contaId, estornadaEm: null, lancamentoId: null }, include: { titulo: { include: { pessoa: { select: { nome: true } } } } }, orderBy: [{ data: "asc" }, { id: "asc" }] }),
    prisma.transferenciaConta.findMany({ where: { tenantId, OR: [{ deContaId: contaId, lancamentoDeId: null }, { paraContaId: contaId, lancamentoParaId: null }] }, orderBy: { data: "asc" } }),
    prisma.importacaoExtrato.findFirst({ where: { tenantId, contaId, saldoFinal: { not: null } }, orderBy: [{ dataSaldoFinal: "desc" }, { id: "desc" }] }),
  ]);
  const baixasLivres = livres.map(b => ({ id: b.id, data: b.data, tituloId: b.tituloId, tipo: b.titulo.tipo, titulo: b.titulo.descricao, pessoa: b.titulo.pessoa?.nome || b.titulo.pessoaTexto || null, movimentoCent: movimentoCent(b), forma: b.forma }));
  const sug = melhoresSugestoes(sugerir(pendentes.map(l => ({ id: l.id, data: l.data, valorCent: emCentavos(l.valor), descricao: l.descricao })), baixasLivres.map(b => ({ id: b.id, data: b.data, movimentoCent: b.movimentoCent, pessoa: b.pessoa || "" }))));
  const sugestoes = sug.map(s => ({ ...s, baixas: s.baixaIds.map(id => { const b = baixasLivres.find(x => x.id === id); return { id, titulo: b.titulo, pessoa: b.pessoa, movimento: emReais(b.movimentoCent) }; }) }));
  // Transferências entre contas que combinam com a linha (mesmo valor, até 3 dias)
  const transferencias = [];
  for (const l of pendentes) {
    const c = emCentavos(l.valor);
    for (const t of transfLivres) {
      const saida = t.deContaId === contaId && !t.lancamentoDeId;
      if ((c < 0) === saida && emCentavos(t.valor) === Math.abs(c) && Math.abs((new Date(t.data) - new Date(l.data)) / 86400000) <= 3) transferencias.push({ lancamentoId: l.id, transferenciaId: t.id });
    }
  }
  const sistema = (await saldosDasContas(prisma, tenantId, { ate: ultimaImp?.dataSaldoFinal || null })).get(contaId) ?? 0;
  return {
    conta: { id: conta.id, nome: conta.nome },
    lancamentos: lancs.map(serializarLancamento),
    sugestoes, transferenciasSugeridas: transferencias,
    baixasLivres: baixasLivres.map(({ movimentoCent: m, ...b }) => ({ ...b, movimento: emReais(m) })),
    transferenciasLivres: transfLivres.map(t => ({ id: t.id, data: t.data, valor: Number(t.valor), saida: t.deContaId === contaId, obs: t.obs })),
    contagens: { pendentes: pendentes.length, baixasLivres: baixasLivres.length },
    fechamento: ultimaImp ? {
      data: ultimaImp.dataSaldoFinal, saldoExtrato: Number(ultimaImp.saldoFinal), saldoSistema: emReais(sistema), diferenca: emReais(emCentavos(ultimaImp.saldoFinal) - sistema), arquivo: ultimaImp.arquivo,
    } : null,
  };
}

router.get("/contas/:id/conciliacao", rota(async (req, res) => {
  const status = ["pendente", "conciliado", "ignorado", "todos"].includes(req.query.status) ? req.query.status : "pendente";
  res.json(await carregarConciliacao(tenantDe(req), inteiro(req.params.id), status));
}));

// ─── Ações sobre uma linha do extrato ────────────────────────────────────────

const marcar = (tx, id, status) => tx.lancamentoBancario.update({ where: { id }, data: { status } });

/** Liga uma ou mais baixas à linha; a soma (com sinal) precisa ser exatamente o valor da linha. */
async function conciliarComBaixas(tx, tenantId, lanc, baixaIds) {
  const baixas = await tx.baixa.findMany({ where: { id: { in: baixaIds }, tenantId }, include: { titulo: true } });
  if (!baixaIds.length || baixas.length !== baixaIds.length) throw new ErroNegocio("Baixa não encontrada.", 404);
  if (baixas.some(b => b.contaId !== lanc.contaId)) throw new ErroNegocio("Todas as baixas precisam ser da mesma conta da linha do extrato.");
  if (baixas.some(b => b.estornadaEm || b.lancamentoId)) throw new ErroNegocio("Alguma baixa já foi estornada ou conciliada.", 409);
  const soma = baixas.reduce((s, b) => s + movimentoCent(b), 0);
  if (soma !== emCentavos(lanc.valor)) throw new ErroNegocio(`A soma das baixas (${emReais(soma).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}) é diferente da linha do extrato (${Number(lanc.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}).`);
  await tx.baixa.updateMany({ where: { id: { in: baixaIds } }, data: { lancamentoId: lanc.id } });
  await marcar(tx, lanc.id, "conciliado");
}
const exigirPendente = l => { if (l.status !== "pendente") throw new ErroNegocio("Esta linha já foi tratada. Desfaça antes de conciliar de novo.", 409); };

router.post("/lancamentos/:id/conciliar", rota(async (req, res) => {
  const tenantId = tenantDe(req);
  await prisma.$transaction(async tx => {
    const l = await lancamentoDoTenant(tx, inteiro(req.params.id), tenantId);
    exigirPendente(l);
    await conciliarComBaixas(tx, tenantId, l, (req.body.baixaIds || []).map(inteiro).filter(Boolean));
  }, TX);
  res.json({ ok: true });
}));

/** Cria a baixa de um título em aberto a partir da linha do extrato (data e conta vêm da linha). */
router.post("/lancamentos/:id/baixar", rota(async (req, res) => {
  const tenantId = tenantDe(req);
  await prisma.$transaction(async tx => {
    const l = await lancamentoDoTenant(tx, inteiro(req.params.id), tenantId);
    exigirPendente(l);
    const titulo = await tx.titulo.findFirst({ where: { id: inteiro(req.body.tituloId), tenantId } });
    if (!titulo) throw new ErroNegocio("Título não encontrado.", 404);
    const saida = Number(l.valor) < 0;
    if ((titulo.tipo === "pagar") !== saida) throw new ErroNegocio(saida ? "Uma saída do extrato só pode quitar uma conta a pagar." : "Uma entrada do extrato só pode quitar uma conta a receber.");
    const jurosCent = emCentavos(req.body.juros || 0), multaCent = emCentavos(req.body.multa || 0), descontoCent = emCentavos(req.body.desconto || 0);
    const principal = Math.abs(emCentavos(l.valor)) - jurosCent - multaCent + descontoCent;
    await baixarTitulo(tx, { tenantId, tituloId: titulo.id, contaId: l.contaId, data: l.data, valorCent: principal, jurosCent, multaCent, descontoCent, forma: req.body.forma || "pix", lancamentoId: l.id });
    await marcar(tx, l.id, "conciliado");
  }, TX);
  res.json({ ok: true });
}));

/** Lança o que só existe no banco (tarifa, rendimento, imposto): cria o documento já baixado e concilia. */
router.post("/lancamentos/:id/lancar", rota(async (req, res) => {
  const tenantId = tenantDe(req);
  const b = req.body;
  const descricao = typeof b.descricao === "string" && b.descricao.trim() ? b.descricao.trim() : null;
  if (!descricao) throw new ErroNegocio("Informe a descrição.");
  const rateio = lerRateio(b.rateio);
  const pessoaId = inteiro(b.pessoaId);
  await prisma.$transaction(async tx => {
    const l = await lancamentoDoTenant(tx, inteiro(req.params.id), tenantId);
    exigirPendente(l);
    const valorCent = Math.abs(emCentavos(l.valor));
    const saida = Number(l.valor) < 0;
    const origemTipo = b.natureza === "outro" ? "avulso" : (saida ? "despesa" : "receita");
    await validarVinculos(tx, tenantId, { linhas: rateio, pessoaId });
    await criarDocumento(tx, {
      tenantId, tipo: saida ? "pagar" : "receber", origemTipo, pessoaId, pessoaTexto: b.pessoaTexto || null, descricao, categoria: b.categoria || null, obs: b.obs || null,
      emissao: l.data, parcelas: [{ parcela: 1, totalParcelas: 1, valorCent, vencimento: l.data }], rateio,
      baixaImediata: { contaId: l.contaId, data: l.data, forma: "ted", lancamentoId: l.id },
    });
    await marcar(tx, l.id, "conciliado");
  }, TX);
  res.status(201).json({ ok: true });
}));

router.post("/lancamentos/:id/ignorar", rota(async (req, res) => {
  await prisma.$transaction(async tx => {
    const l = await lancamentoDoTenant(tx, inteiro(req.params.id), tenantDe(req));
    exigirPendente(l);
    await marcar(tx, l.id, "ignorado");
  }, TX);
  res.json({ ok: true });
}));

/** Volta a linha para pendente. Baixas e documentos criados a partir dela continuam existindo. */
router.post("/lancamentos/:id/desfazer", rota(async (req, res) => {
  const tenantId = tenantDe(req);
  await prisma.$transaction(async tx => {
    const l = await lancamentoDoTenant(tx, inteiro(req.params.id), tenantId);
    if (l.status === "pendente") throw new ErroNegocio("Esta linha já está pendente.", 409);
    await tx.baixa.updateMany({ where: { lancamentoId: l.id, tenantId }, data: { lancamentoId: null } });
    await tx.transferenciaConta.updateMany({ where: { lancamentoDeId: l.id, tenantId }, data: { lancamentoDeId: null } });
    await tx.transferenciaConta.updateMany({ where: { lancamentoParaId: l.id, tenantId }, data: { lancamentoParaId: null } });
    await marcar(tx, l.id, "pendente");
  }, TX);
  res.json({ ok: true });
}));

/** Aplica de uma vez as sugestões de alta confiança. Nada mais é conciliado sem o usuário olhar. */
router.post("/contas/:id/conciliar-exatos", rota(async (req, res) => {
  const tenantId = tenantDe(req);
  const contaId = inteiro(req.params.id);
  const c = await carregarConciliacao(tenantId, contaId, "pendente");
  const altas = c.sugestoes.filter(s => s.confianca === "alta");
  let feitos = 0;
  await prisma.$transaction(async tx => {
    for (const s of altas) {
      const l = await lancamentoDoTenant(tx, s.lancamentoId, tenantId);
      if (l.status !== "pendente") continue;
      await conciliarComBaixas(tx, tenantId, l, s.baixaIds);
      feitos++;
    }
  }, TX);
  res.json({ conciliados: feitos });
}));

// ─── Transferências entre contas ─────────────────────────────────────────────

router.get("/transferencias", rota(async (req, res) => {
  const tenantId = tenantDe(req);
  const itens = await prisma.transferenciaConta.findMany({ where: { tenantId }, orderBy: [{ data: "desc" }, { id: "desc" }], take: 200 });
  res.json(itens.map(t => ({ id: t.id, deContaId: t.deContaId, paraContaId: t.paraContaId, data: t.data, valor: Number(t.valor), obs: t.obs, conciliadaDe: !!t.lancamentoDeId, conciliadaPara: !!t.lancamentoParaId })));
}));

router.post("/transferencias", rota(async (req, res) => {
  const tenantId = tenantDe(req);
  const de = inteiro(req.body.deContaId), para = inteiro(req.body.paraContaId);
  if (!de || !para || de === para) throw new ErroNegocio("Escolha duas contas diferentes.");
  const valorCent = emCentavos(req.body.valor);
  if (!(valorCent > 0)) throw new ErroNegocio("O valor deve ser maior que zero.");
  const data = req.body.data || hojeBR();
  if (!dataValida(data)) throw new ErroNegocio("Data inválida.");
  await contaDoTenant(prisma, de, tenantId); await contaDoTenant(prisma, para, tenantId);
  const t = await prisma.transferenciaConta.create({ data: { tenantId, deContaId: de, paraContaId: para, data, valor: (valorCent / 100).toFixed(2), obs: req.body.obs || null } });
  res.status(201).json({ id: t.id });
}));

router.delete("/transferencias/:id", rota(async (req, res) => {
  const t = await prisma.transferenciaConta.findFirst({ where: { id: inteiro(req.params.id), tenantId: tenantDe(req) } });
  if (!t) throw new ErroNegocio("Transferência não encontrada.", 404);
  if (t.lancamentoDeId || t.lancamentoParaId) throw new ErroNegocio("Esta transferência foi conciliada com o extrato: desfaça a conciliação antes.", 409);
  await prisma.transferenciaConta.delete({ where: { id: t.id } });
  res.json({ ok: true });
}));

/** A linha do extrato é uma transferência: cria a transferência (o outro lado concilia depois) e liga a linha. */
router.post("/lancamentos/:id/transferir", rota(async (req, res) => {
  const tenantId = tenantDe(req);
  await prisma.$transaction(async tx => {
    const l = await lancamentoDoTenant(tx, inteiro(req.params.id), tenantId);
    exigirPendente(l);
    const outra = inteiro(req.body.contaId);
    if (!outra || outra === l.contaId) throw new ErroNegocio("Escolha a outra conta da transferência.");
    await contaDoTenant(tx, outra, tenantId);
    const saida = Number(l.valor) < 0;
    await tx.transferenciaConta.create({
      data: { tenantId, deContaId: saida ? l.contaId : outra, paraContaId: saida ? outra : l.contaId, data: l.data, valor: Math.abs(Number(l.valor)).toFixed(2), obs: req.body.obs || null,
        ...(saida ? { lancamentoDeId: l.id } : { lancamentoParaId: l.id }) },
    });
    await marcar(tx, l.id, "conciliado");
  }, TX);
  res.status(201).json({ ok: true });
}));

router.post("/lancamentos/:id/conciliar-transferencia", rota(async (req, res) => {
  const tenantId = tenantDe(req);
  await prisma.$transaction(async tx => {
    const l = await lancamentoDoTenant(tx, inteiro(req.params.id), tenantId);
    exigirPendente(l);
    const t = await tx.transferenciaConta.findFirst({ where: { id: inteiro(req.body.transferenciaId), tenantId } });
    if (!t) throw new ErroNegocio("Transferência não encontrada.", 404);
    const saida = Number(l.valor) < 0;
    if (emCentavos(t.valor) !== Math.abs(emCentavos(l.valor))) throw new ErroNegocio("O valor da transferência é diferente da linha do extrato.");
    if (saida ? (t.deContaId !== l.contaId || t.lancamentoDeId) : (t.paraContaId !== l.contaId || t.lancamentoParaId)) throw new ErroNegocio("Esta transferência não combina com a linha (conta ou sentido), ou já foi conciliada.", 409);
    await tx.transferenciaConta.update({ where: { id: t.id }, data: saida ? { lancamentoDeId: l.id } : { lancamentoParaId: l.id } });
    await marcar(tx, l.id, "conciliado");
  }, TX);
  res.json({ ok: true });
}));

export default router;
