import { Router } from "express";
import prisma from "../db.js";

const router = Router();

router.get("/", async (req, res) => {
  const { obraId } = req.query;
  const where = {};
  if (obraId) where.obraId = parseInt(obraId);
  const items = await prisma.estoque.findMany({
    where,
    include: { insumo: true, obra: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(items);
});

router.post("/", async (req, res) => {
  const { obraId, insumoId, quantEntrada, dataMov, origem } = req.body;
  const item = await prisma.estoque.create({
    data: { obraId: parseInt(obraId), insumoId: parseInt(insumoId), quantEntrada: parseFloat(quantEntrada) || 0, quantUtilizado: 0, dataMov, origem },
    include: { insumo: true },
  });
  res.status(201).json(item);
});

router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { quantEntrada, quantUtilizado, dataMov, origem } = req.body;
  const item = await prisma.estoque.update({
    where: { id },
    data: { quantEntrada: parseFloat(quantEntrada), quantUtilizado: parseFloat(quantUtilizado), dataMov, origem },
    include: { insumo: true },
  });
  res.json(item);
});

router.delete("/:id", async (req, res) => {
  await prisma.estoque.delete({ where: { id: parseInt(req.params.id) } });
  res.json({ ok: true });
});

export default router;
