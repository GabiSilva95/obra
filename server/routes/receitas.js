import { Router } from "express";
import prisma from "../db.js";

const router = Router();

router.get("/", async (req, res) => {
  const { obraId } = req.query;
  const obras = await prisma.obra.findMany({ where: { tenantId: req.user.tenantId }, select: { id: true } });
  const ids = obras.map(o => o.id);
  const where = { obraId: { in: ids }, ...(obraId ? { obraId: parseInt(obraId) } : {}) };
  const items = await prisma.receita.findMany({ where, orderBy: { data: "desc" } });
  res.json(items);
});

router.post("/", async (req, res) => {
  const { obraId, descricao, valor, data, tipo } = req.body;
  const obra = await prisma.obra.findFirst({ where: { id: parseInt(obraId), tenantId: req.user.tenantId } });
  if (!obra) return res.status(404).json({ error: "Obra não encontrada." });
  const item = await prisma.receita.create({ data: { obraId: parseInt(obraId), descricao, valor: parseFloat(valor) || 0, data, tipo: tipo || "Contrato" } });
  res.json(item);
});

router.put("/:id", async (req, res) => {
  const { descricao, valor, data, tipo } = req.body;
  const existing = await prisma.receita.findFirst({
    where: { id: parseInt(req.params.id) },
    include: { obra: { select: { tenantId: true } } },
  });
  if (!existing || existing.obra.tenantId !== req.user.tenantId) return res.status(404).json({ error: "Não encontrado." });
  const updated = await prisma.receita.update({ where: { id: existing.id }, data: { descricao, valor: parseFloat(valor) || 0, data, tipo } });
  res.json(updated);
});

router.delete("/:id", async (req, res) => {
  const existing = await prisma.receita.findFirst({
    where: { id: parseInt(req.params.id) },
    include: { obra: { select: { tenantId: true } } },
  });
  if (!existing || existing.obra.tenantId !== req.user.tenantId) return res.status(404).json({ error: "Não encontrado." });
  await prisma.receita.delete({ where: { id: existing.id } });
  res.json({ ok: true });
});

export default router;
