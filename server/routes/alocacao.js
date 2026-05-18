import { Router } from "express";
import prisma from "../db.js";

const router = Router();

async function tenantObraIds(tenantId) {
  const obras = await prisma.obra.findMany({ where: { tenantId }, select: { id: true } });
  return obras.map(o => o.id);
}

async function findAlocacaoDoTenant(id, tenantId) {
  return prisma.alocacao.findFirst({
    where: { id },
    include: { obra: { select: { tenantId: true } } },
  }).then(a => (a?.obra?.tenantId === tenantId ? a : null));
}

router.get("/", async (req, res) => {
  const { obraId } = req.query;
  const ids = await tenantObraIds(req.user.tenantId);
  const where = { obraId: { in: ids } };
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
  // Verifica que a obra pertence ao tenant
  const obra = await prisma.obra.findFirst({ where: { id: parseInt(obraId), tenantId: req.user.tenantId } });
  if (!obra) return res.status(404).json({ error: "Obra não encontrada." });
  const refId = parseInt(referenciaId);
  const item = await prisma.alocacao.create({
    data: {
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
  const existing = await findAlocacaoDoTenant(parseInt(req.params.id), req.user.tenantId);
  if (!existing) return res.status(404).json({ error: "Não encontrado." });
  await prisma.alocacao.delete({ where: { id: existing.id } });
  res.json({ ok: true });
});

export default router;
