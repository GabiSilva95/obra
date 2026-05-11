import { Router } from "express";
import prisma from "../db.js";

const router = Router();

router.get("/", async (req, res) => {
  const { obraId } = req.query;
  const obras = await prisma.obra.findMany({ where: { tenantId: req.user.tenantId }, select: { id: true } });
  const ids = obras.map(o => o.id);
  const where = { obraId: { in: ids }, ...(obraId ? { obraId: parseInt(obraId) } : {}) };
  const items = await prisma.diarioObra.findMany({ where, orderBy: { data: "desc" } });
  res.json(items);
});

router.post("/", async (req, res) => {
  const { obraId, data, clima, descricao, trabalhadores, obs } = req.body;
  const obra = await prisma.obra.findFirst({ where: { id: parseInt(obraId), tenantId: req.user.tenantId } });
  if (!obra) return res.status(404).json({ error: "Obra não encontrada." });
  const item = await prisma.diarioObra.create({ data: { obraId: parseInt(obraId), data, clima, descricao, trabalhadores: parseInt(trabalhadores) || 0, obs } });
  res.json(item);
});

router.put("/:id", async (req, res) => {
  const { data, clima, descricao, trabalhadores, obs } = req.body;
  const existing = await prisma.diarioObra.findFirst({
    where: { id: parseInt(req.params.id) },
    include: { obra: { select: { tenantId: true } } },
  });
  if (!existing || existing.obra.tenantId !== req.user.tenantId) return res.status(404).json({ error: "Não encontrado." });
  const updated = await prisma.diarioObra.update({ where: { id: existing.id }, data: { data, clima, descricao, trabalhadores: parseInt(trabalhadores) || 0, obs } });
  res.json(updated);
});

router.delete("/:id", async (req, res) => {
  const existing = await prisma.diarioObra.findFirst({
    where: { id: parseInt(req.params.id) },
    include: { obra: { select: { tenantId: true } } },
  });
  if (!existing || existing.obra.tenantId !== req.user.tenantId) return res.status(404).json({ error: "Não encontrado." });
  await prisma.diarioObra.delete({ where: { id: existing.id } });
  res.json({ ok: true });
});

export default router;
