import { Router } from "express";
import prisma from "../db.js";

const router = Router();

router.get("/", async (req, res) => {
  const { obraId } = req.query;
  const obras = await prisma.obra.findMany({ where: { tenantId: req.user.tenantId }, select: { id: true } });
  const ids = obras.map(o => o.id);
  const where = { obraId: { in: ids }, ...(obraId ? { obraId: parseInt(obraId) } : {}) };
  const items = await prisma.ordemCompra.findMany({ where, orderBy: { data: "desc" }, include: { insumo: { select: { nome: true, unidade: true } } } });
  res.json(items);
});

router.post("/", async (req, res) => {
  const { obraId, insumoId, descricao, quantidade, valorUnit, fornecedor, data, obs } = req.body;
  const obra = await prisma.obra.findFirst({ where: { id: parseInt(obraId), tenantId: req.user.tenantId } });
  if (!obra) return res.status(404).json({ error: "Obra não encontrada." });
  const item = await prisma.ordemCompra.create({
    data: { obraId: parseInt(obraId), insumoId: insumoId ? parseInt(insumoId) : null, descricao, quantidade: parseFloat(quantidade) || 0, valorUnit: parseFloat(valorUnit) || 0, fornecedor, status: "Pendente", data, obs },
    include: { insumo: { select: { nome: true, unidade: true } } },
  });
  res.json(item);
});

router.put("/:id", async (req, res) => {
  const { insumoId, descricao, quantidade, valorUnit, fornecedor, status, data, obs } = req.body;
  const existing = await prisma.ordemCompra.findFirst({
    where: { id: parseInt(req.params.id) },
    include: { obra: { select: { tenantId: true } } },
  });
  if (!existing || existing.obra.tenantId !== req.user.tenantId) return res.status(404).json({ error: "Não encontrado." });
  const updated = await prisma.ordemCompra.update({
    where: { id: existing.id },
    data: { insumoId: insumoId ? parseInt(insumoId) : null, descricao, quantidade: parseFloat(quantidade) || 0, valorUnit: parseFloat(valorUnit) || 0, fornecedor, status, data, obs },
    include: { insumo: { select: { nome: true, unidade: true } } },
  });
  res.json(updated);
});

router.patch("/:id/status", async (req, res) => {
  const { status } = req.body;
  const existing = await prisma.ordemCompra.findFirst({
    where: { id: parseInt(req.params.id) },
    include: { obra: { select: { tenantId: true } } },
  });
  if (!existing || existing.obra.tenantId !== req.user.tenantId) return res.status(404).json({ error: "Não encontrado." });
  const updated = await prisma.ordemCompra.update({ where: { id: existing.id }, data: { status } });
  res.json(updated);
});

router.delete("/:id", async (req, res) => {
  const existing = await prisma.ordemCompra.findFirst({
    where: { id: parseInt(req.params.id) },
    include: { obra: { select: { tenantId: true } } },
  });
  if (!existing || existing.obra.tenantId !== req.user.tenantId) return res.status(404).json({ error: "Não encontrado." });
  await prisma.ordemCompra.delete({ where: { id: existing.id } });
  res.json({ ok: true });
});

export default router;
