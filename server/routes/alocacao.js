import { Router } from "express";
import prisma from "../db.js";

const router = Router();

router.get("/", async (req, res) => {
  const { obraId } = req.query;
  const where = { tenantId: req.user.tenantId };
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
  const obra = await prisma.obra.findFirst({ where: { id: parseInt(obraId), tenantId: req.user.tenantId } });
  if (!obra) return res.status(404).json({ error: "Obra não encontrada." });
  const refId = parseInt(referenciaId);
  const item = await prisma.alocacao.create({
    data: {
      tenantId: req.user.tenantId,
      obraId: parseInt(obraId),
      tipo,
      maquinaId: tipo === "maquina" ? refId : null,
      insumoId:  tipo === "insumo"  ? refId : null,
      quantidade: parseFloat(quantidade),
      data,
      obs,
    },
    include: { maquina: true, insumo: true },
  });
  res.status(201).json(item);
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const existing = await prisma.alocacao.findFirst({ where: { id, tenantId: req.user.tenantId } });
  if (!existing) return res.status(404).json({ error: "Não encontrado." });
  await prisma.alocacao.delete({ where: { id } });
  res.json({ ok: true });
});

export default router;
