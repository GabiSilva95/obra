import { Router } from "express";
import prisma from "../db.js";

const router = Router();

router.get("/", async (req, res) => {
  const { obraId } = req.query;
  const where = { tenantId: req.user.tenantId };
  if (obraId) where.obraId = parseInt(obraId);
  const items = await prisma.receita.findMany({ where, orderBy: { data: "desc" } });
  res.json(items);
});

router.post("/", async (req, res) => {
  const { obraId, descricao, valor, data, tipo } = req.body;
  const obra = await prisma.obra.findFirst({ where: { id: parseInt(obraId), tenantId: req.user.tenantId } });
  if (!obra) return res.status(404).json({ error: "Obra não encontrada." });
  const item = await prisma.receita.create({
    data: { tenantId: req.user.tenantId, obraId: parseInt(obraId), descricao, valor: parseFloat(valor) || 0, data, tipo: tipo || "Contrato" },
  });
  res.json(item);
});

router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const existing = await prisma.receita.findFirst({ where: { id, tenantId: req.user.tenantId } });
  if (!existing) return res.status(404).json({ error: "Não encontrado." });
  const { descricao, valor, data, tipo } = req.body;
  const updated = await prisma.receita.update({ where: { id }, data: { descricao, valor: parseFloat(valor) || 0, data, tipo } });
  res.json(updated);
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const existing = await prisma.receita.findFirst({ where: { id, tenantId: req.user.tenantId } });
  if (!existing) return res.status(404).json({ error: "Não encontrado." });
  await prisma.receita.delete({ where: { id } });
  res.json({ ok: true });
});

export default router;
