import { Router } from "express";
import prisma from "../db.js";

const router = Router();

// ─── Entrada automática no estoque ───────────────────────────────────────────

/** Marca de origem que amarra a movimentação à ordem — usada para não duplicar. */
const origemDaOrdem = id => `Compra #${id}`;

/**
 * Gera a entrada de estoque de uma ordem entregue.
 *
 * Idempotente: se já existe movimentação com a origem desta ordem, não cria
 * outra — reabrir e reentregar a mesma ordem não duplica material.
 *
 * Só age quando a ordem aponta para um insumo do catálogo; ordens descritivas
 * (sem insumoId) não têm o que movimentar e são ignoradas silenciosamente.
 *
 * @returns {Promise<object|null>} a movimentação criada, ou null
 */
async function gerarEntradaEstoque(ordem, tenantId) {
  if (!ordem.insumoId || !(ordem.quantidade > 0)) return null;

  const origem = origemDaOrdem(ordem.id);
  const jaExiste = await prisma.estoque.findFirst({
    where: { tenantId, obraId: ordem.obraId, insumoId: ordem.insumoId, origem },
  });
  if (jaExiste) return null;

  return prisma.estoque.create({
    data: {
      tenantId,
      obraId:         ordem.obraId,
      insumoId:       ordem.insumoId,
      quantEntrada:   ordem.quantidade,
      quantUtilizado: 0,
      dataMov:        new Date().toISOString().slice(0, 10),
      origem,
    },
    include: { insumo: true },
  });
}

router.get("/", async (req, res) => {
  const { obraId } = req.query;
  const where = { tenantId: req.user.tenantId };
  if (obraId) where.obraId = parseInt(obraId);
  const items = await prisma.ordemCompra.findMany({
    where,
    orderBy: { data: "desc" },
    include: { insumo: { select: { nome: true, unidade: true } } },
  });
  res.json(items);
});

router.post("/", async (req, res) => {
  const { obraId, insumoId, etapaId, descricao, quantidade, valorUnit, fornecedor, data, obs } = req.body;
  const obra = await prisma.obra.findFirst({ where: { id: parseInt(obraId), tenantId: req.user.tenantId } });
  if (!obra) return res.status(404).json({ error: "Obra não encontrada." });
  const item = await prisma.ordemCompra.create({
    data: {
      tenantId: req.user.tenantId,
      obraId: parseInt(obraId),
      insumoId: insumoId ? parseInt(insumoId) : null,
      etapaId: etapaId ? parseInt(etapaId) : null,
      descricao,
      quantidade: parseFloat(quantidade) || 0,
      valorUnit: parseFloat(valorUnit) || 0,
      fornecedor,
      status: "Pendente",
      data,
      obs,
    },
    include: { insumo: { select: { nome: true, unidade: true } } },
  });
  res.json(item);
});

router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const existing = await prisma.ordemCompra.findFirst({ where: { id, tenantId: req.user.tenantId } });
  if (!existing) return res.status(404).json({ error: "Não encontrado." });
  const { insumoId, descricao, quantidade, valorUnit, fornecedor, status, data, obs } = req.body;
  const updated = await prisma.ordemCompra.update({
    where: { id },
    data: { insumoId: insumoId ? parseInt(insumoId) : null, etapaId: etapaId ? parseInt(etapaId) : null, descricao, quantidade: parseFloat(quantidade) || 0, valorUnit: parseFloat(valorUnit) || 0, fornecedor, status, data, obs },
    include: { insumo: { select: { nome: true, unidade: true } } },
  });

  // Mesma regra do PATCH: editar a ordem para Entregue também dá entrada
  let estoque = null;
  if (status === "Entregue") {
    estoque = await gerarEntradaEstoque(updated, req.user.tenantId).catch(e => {
      console.error(`[compras] falha ao gerar entrada de estoque da ordem ${id}:`, e);
      return null;
    });
  }

  res.json({ ...updated, estoqueGerado: estoque });
});

router.patch("/:id/status", async (req, res) => {
  const id = parseInt(req.params.id);
  const existing = await prisma.ordemCompra.findFirst({ where: { id, tenantId: req.user.tenantId } });
  if (!existing) return res.status(404).json({ error: "Não encontrado." });

  const { status } = req.body;
  const updated = await prisma.ordemCompra.update({ where: { id }, data: { status } });

  // Entregue dá entrada no estoque da obra automaticamente
  let estoque = null;
  if (status === "Entregue") {
    estoque = await gerarEntradaEstoque(updated, req.user.tenantId).catch(e => {
      console.error(`[compras] falha ao gerar entrada de estoque da ordem ${id}:`, e);
      return null;
    });
  }

  res.json({ ...updated, estoqueGerado: estoque });
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const existing = await prisma.ordemCompra.findFirst({ where: { id, tenantId: req.user.tenantId } });
  if (!existing) return res.status(404).json({ error: "Não encontrado." });
  await prisma.ordemCompra.delete({ where: { id } });
  res.json({ ok: true });
});

export default router;
