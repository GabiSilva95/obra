import { Router } from "express";
import prisma from "../db.js";

const router = Router();

router.get("/", async (req, res) => {
  const { obraId } = req.query;
  const where = {};
  if (obraId) where.obraId = parseInt(obraId);
  const items = await prisma.alocacao.findMany({
    where,
    include: { maquina: true, insumo: true },
    orderBy: { data: "desc" },
  });
  res.json(items);
});

router.post("/", async (req, res) => {
  const { obraId, tipo, referenciaId, quantidade, data, obs } = req.body;
  const refId = parseInt(referenciaId);
  const item = await prisma.alocacao.create({
    data: {
      obraId: parseInt(obraId),
      tipo,
      maquinaId: tipo === "maquina" ? refId : null,
      insumoId: tipo === "insumo" ? refId : null,
      quantidade: parseFloat(quantidade),
      data,
      obs,
    },
    include: { maquina: true, insumo: true },
  });
  res.status(201).json(item);
});

router.delete("/:id", async (req, res) => {
  await prisma.alocacao.delete({ where: { id: parseInt(req.params.id) } });
  res.json({ ok: true });
});

export default router;
