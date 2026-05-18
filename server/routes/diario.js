import { Router } from "express";
import prisma from "../db.js";

const router = Router();

router.get("/", async (req, res) => {
  const { obraId } = req.query;
  const where = { tenantId: req.user.tenantId };
  if (obraId) where.obraId = parseInt(obraId);
  const items = await prisma.diarioObra.findMany({ where, orderBy: { data: "desc" } });
  res.json(items);
});

router.post("/", async (req, res) => {
  const { obraId, data, clima, descricao, trabalhadores, obs } = req.body;
  const obra = await prisma.obra.findFirst({ where: { id: parseInt(obraId), tenantId: req.user.tenantId } });
  if (!obra) return res.status(404).json({ error: "Obra não encontrada." });
  const item = await prisma.diarioObra.create({
    data: { tenantId: req.user.tenantId, obraId: parseInt(obraId), data, clima, descricao, trabalhadores: parseInt(trabalhadores) || 0, obs },
  });
  res.json(item);
});

router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const existing = await prisma.diarioObra.findFirst({ where: { id, tenantId: req.user.tenantId } });
  if (!existing) return res.status(404).json({ error: "Não encontrado." });
  const { data, clima, descricao, trabalhadores, obs } = req.body;
  const updated = await prisma.diarioObra.update({ where: { id }, data: { data, clima, descricao, trabalhadores: parseInt(trabalhadores) || 0, obs } });
  res.json(updated);
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const existing = await prisma.diarioObra.findFirst({ where: { id, tenantId: req.user.tenantId } });
  if (!existing) return res.status(404).json({ error: "Não encontrado." });
  await prisma.diarioObra.delete({ where: { id } });
  res.json({ ok: true });
});

export default router;
