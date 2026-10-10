import { Router } from "express";
import { extrairDadosNfe } from "../utils/nfe.js";
import prisma from "../db.js";
import { hojeBR } from "../utils/datas.js";
import { TX, sanearNf, gerarTituloDaCompra, sincronizarTitulosDaCompra, cancelarTitulosDaCompra, excluirTitulosDaCompra } from "../financeiro/compras.js";

const router = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

const origemDaOrdem = id => `Compra #${id}`;

const INCLUDE_ORDEM = {
  insumo:           { select: { nome: true, unidade: true } },
  fornecedorPessoa: { select: { id: true, nome: true, telefone: true, email: true } },
  itens:            { include: { insumo: { select: { nome: true, unidade: true } } }, orderBy: { id: "asc" } },
};

/**
 * Normaliza OCs legadas (single-item) para o formato multi-item.
 * OCs novas já têm itens na tabela ItemOrdemCompra.
 */
function normalizar(ordem) {
  if (ordem.itens && ordem.itens.length > 0) return ordem;
  // Legada: sintetiza um item a partir dos campos diretos
  if (ordem.insumoId || ordem.quantidade > 0) {
    return {
      ...ordem,
      itens: [{
        id:        null,
        ordemId:   ordem.id,
        insumoId:  ordem.insumoId,
        descricao: ordem.descricao,
        quantidade: ordem.quantidade,
        valorUnit:  ordem.valorUnit,
        insumo:    ordem.insumo,
      }],
    };
  }
  return { ...ordem, itens: [] };
}

/**
 * Gera entradas de estoque para todos os itens da ordem.
 * Idempotente: já-existentes são ignorados.
 */
async function gerarEntradasEstoque(ordem, tenantId) {
  const itens = ordem.itens?.length ? ordem.itens : (
    ordem.insumoId && ordem.quantidade > 0
      ? [{ insumoId: ordem.insumoId, quantidade: ordem.quantidade, valorUnit: ordem.valorUnit }]
      : []
  );

  const criados = [];
  for (const item of itens) {
    if (!item.insumoId || !(item.quantidade > 0)) continue;
    const origem = origemDaOrdem(ordem.id);
    const jaExiste = await prisma.estoque.findFirst({
      where: { tenantId, obraId: ordem.obraId, insumoId: item.insumoId, origem },
    });
    if (jaExiste) continue;

    const custoNovo = parseFloat(item.valorUnit) || 0;

    // Média ponderada: recalcula custoUnit do insumo com o novo lote
    if (custoNovo > 0) {
      const insumo = await prisma.insumo.findUnique({ where: { id: item.insumoId } });
      const estoqueAtual = await prisma.estoque.aggregate({
        where: { tenantId, insumoId: item.insumoId },
        _sum: { quantEntrada: true, quantUtilizado: true },
      });
      const saldoAtual = (estoqueAtual._sum.quantEntrada || 0) - (estoqueAtual._sum.quantUtilizado || 0);
      const custoAtual = insumo?.custoUnit || 0;
      const mediaPonderada = saldoAtual > 0
        ? (saldoAtual * custoAtual + item.quantidade * custoNovo) / (saldoAtual + item.quantidade)
        : custoNovo;
      await prisma.insumo.update({ where: { id: item.insumoId }, data: { custoUnit: mediaPonderada } });
    }

    const novo = await prisma.estoque.create({
      data: {
        tenantId,
        obraId:         ordem.obraId,
        insumoId:       item.insumoId,
        quantEntrada:   item.quantidade,
        quantUtilizado: 0,
        custoUnit:      custoNovo,
        dataMov:        hojeBR(),
        origem,
      },
      include: { insumo: true },
    });
    criados.push(novo);
  }
  return criados;
}

/**
 * Compra entregue: dá entrada no estoque e gera a conta a pagar. Uma falha numa das duas
 * não desfaz a entrega nem a outra: o que faltar aparece em Financeiro > Pendências.
 */
async function aoEntregar(ordem, tenantId, nf) {
  const estoquesGerados = await gerarEntradasEstoque(ordem, tenantId).catch(e => {
    console.error(`[compras] falha ao gerar estoque da ordem ${ordem.id}:`, e);
    return [];
  });
  const titulo = await prisma.$transaction(tx => gerarTituloDaCompra(tx, { tenantId, ordem, nf }), TX).catch(e => {
    console.error(`[compras] falha ao gerar conta a pagar da ordem ${ordem.id}:`, e);
    return null;
  });
  return { estoquesGerados, tituloGerado: !!titulo };
}

// ─── Rotas ────────────────────────────────────────────────────────────────────

router.get("/", async (req, res) => {
  const { obraId } = req.query;
  const where = { tenantId: req.user.tenantId };
  if (obraId) where.obraId = parseInt(obraId);
  const items = await prisma.ordemCompra.findMany({
    where,
    orderBy: { data: "desc" },
    include: INCLUDE_ORDEM,
  });
  res.json(items.map(normalizar));
});

// ─── Importação NF-e → pré-visualização ──────────────────────────────────────
router.post("/importar-nf", async (req, res) => {
  try {
    const { xml } = req.body;
    if (!xml || typeof xml !== "string")
      return res.status(400).json({ error: "Envie o campo 'xml' com o conteúdo da nota fiscal." });
    const dados = extrairDadosNfe(xml);
    if (!dados.itens.length)
      return res.status(422).json({ error: "Nenhum item encontrado no XML. Verifique se é uma NF-e válida." });
    res.json(dados);
  } catch (err) {
    console.error("[compras/importar-nf]", err.message);
    res.status(422).json({ error: err.message || "Erro ao processar o XML." });
  }
});

router.post("/", async (req, res) => {
  const { obraId, etapaId, fornecedor, fornecedorId, data, obs, status, itens } = req.body;

  const obra = await prisma.obra.findFirst({ where: { id: parseInt(obraId), tenantId: req.user.tenantId } });
  if (!obra) return res.status(404).json({ error: "Obra não encontrada." });

  const linhas = Array.isArray(itens) ? itens.filter(l => l.quantidade > 0) : [];

  // Número sequencial por tenant
  const maxNum = await prisma.ordemCompra.aggregate({
    where: { tenantId: req.user.tenantId },
    _max: { numero: true },
  });
  const numero = (maxNum._max.numero || 0) + 1;

  const ordem = await prisma.$transaction(async tx => {
    const criada = await tx.ordemCompra.create({
      data: {
        tenantId:    req.user.tenantId,
        obraId:      parseInt(obraId),
        etapaId:     etapaId ? parseInt(etapaId) : null,
        fornecedor:  fornecedor || null,
        fornecedorId: fornecedorId ? parseInt(fornecedorId) : null,
        status:      status || "Pendente",
        data,
        obs:         obs || null,
        descricao:   "",
        numero,
      },
    });
    if (linhas.length) {
      await tx.itemOrdemCompra.createMany({
        data: linhas.map(l => ({
          ordemId:   criada.id,
          tenantId:  req.user.tenantId,
          insumoId:  l.insumoId ? parseInt(l.insumoId) : null,
          descricao: l.descricao || null,
          quantidade: parseFloat(l.quantidade) || 0,
          valorUnit:  parseFloat(l.valorUnit) || 0,
        })),
      });
    }
    return tx.ordemCompra.findUnique({ where: { id: criada.id }, include: INCLUDE_ORDEM });
  });

  res.json(normalizar(ordem));
});

router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const existing = await prisma.ordemCompra.findFirst({ where: { id, tenantId: req.user.tenantId } });
  if (!existing) return res.status(404).json({ error: "Não encontrado." });

  const { etapaId, fornecedor, fornecedorId, status, data, obs, itens } = req.body;
  const linhas = Array.isArray(itens) ? itens.filter(l => l.quantidade > 0) : [];

  const updated = await prisma.$transaction(async tx => {
    await tx.ordemCompra.update({
      where: { id },
      data: {
        etapaId:      etapaId !== undefined ? (etapaId ? parseInt(etapaId) : null) : undefined,
        fornecedor:   fornecedor !== undefined ? (fornecedor || null) : undefined,
        fornecedorId: fornecedorId !== undefined ? (fornecedorId ? parseInt(fornecedorId) : null) : undefined,
        status:       status || undefined,
        data:         data || undefined,
        obs:          obs !== undefined ? (obs || null) : undefined,
      },
    });
    // Substitui os itens: remove antigos, insere novos
    if (linhas.length) {
      await tx.itemOrdemCompra.deleteMany({ where: { ordemId: id } });
      await tx.itemOrdemCompra.createMany({
        data: linhas.map(l => ({
          ordemId:   id,
          tenantId:  req.user.tenantId,
          insumoId:  l.insumoId ? parseInt(l.insumoId) : null,
          descricao: l.descricao || null,
          quantidade: parseFloat(l.quantidade) || 0,
          valorUnit:  parseFloat(l.valorUnit) || 0,
        })),
      });
    }
    return tx.ordemCompra.findUnique({ where: { id }, include: INCLUDE_ORDEM });
  });

  const normalizada = normalizar(updated);
  let extra = { estoquesGerados: [], tituloGerado: false };
  if (status === "Entregue") extra = await aoEntregar(normalizada, req.user.tenantId, sanearNf(req.body.nf));
  // Itens, obra ou etapa mudaram: o título (se ainda estiver sem pagamento) acompanha
  await prisma.$transaction(tx => sincronizarTitulosDaCompra(tx, { tenantId: req.user.tenantId, ordem: normalizada }), TX).catch(e => console.error(`[compras] sincronização do título da ordem ${id}:`, e));

  res.json({ ...normalizada, ...extra });
});

router.patch("/:id/status", async (req, res) => {
  const id = parseInt(req.params.id);
  const existing = await prisma.ordemCompra.findFirst({ where: { id, tenantId: req.user.tenantId } });
  if (!existing) return res.status(404).json({ error: "Não encontrado." });

  const { status } = req.body;
  const updated = await prisma.ordemCompra.update({
    where: { id },
    data: { status },
    include: INCLUDE_ORDEM,
  });

  const normalizada = normalizar(updated);
  let extra = { estoquesGerados: [], tituloGerado: false };
  if (status === "Entregue") extra = await aoEntregar(normalizada, req.user.tenantId, sanearNf(req.body.nf));
  else if (status === "Cancelada") await prisma.$transaction(tx => cancelarTitulosDaCompra(tx, { tenantId: req.user.tenantId, ordemId: id }), TX).catch(e => console.error(`[compras] cancelamento dos títulos da ordem ${id}:`, e));

  res.json({ ...normalizada, ...extra });
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const existing = await prisma.ordemCompra.findFirst({ where: { id, tenantId: req.user.tenantId } });
  if (!existing) return res.status(404).json({ error: "Não encontrado." });
  const motivo = await prisma.$transaction(async tx => {
    const m = await excluirTitulosDaCompra(tx, { tenantId: req.user.tenantId, ordemId: id });
    if (!m) await tx.ordemCompra.delete({ where: { id } });
    return m;
  }, TX);
  if (motivo) return res.status(409).json({ error: motivo });
  res.json({ ok: true });
});

export default router;
