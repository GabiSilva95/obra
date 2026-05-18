import { Router } from "express";
import prisma from "../db.js";

const router = Router();

// Helper: retorna ids das obras do tenant (evita N+1 nas rotas)
async function tenantObraIds(tenantId) {
  const obras = await prisma.obra.findMany({ where: { tenantId }, select: { id: true } });
  return obras.map(o => o.id);
}

// Helper: busca registro e verifica pertencimento ao tenant via obra
async function findEstoqueDoTenant(id, tenantId) {
  return prisma.estoque.findFirst({
    where: { id },
    include: { obra: { select: { tenantId: true } } },
  }).then(e => (e?.obra?.tenantId === tenantId ? e : null));
}

router.get("/", async (req, res) => {
  const { obraId } = req.query;
  const ids = await tenantObraIds(req.user.tenantId);
  const where = { obraId: { in: ids } };
  if (obraId) where.obraId = parseInt(obraId); // já está dentro do conjunto seguro
  const items = await prisma.estoque.findMany({
    where,
    include: { insumo: true, obra: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(items);
});

router.post("/", async (req, res) => {
  const { obraId, insumoId, quantEntrada, dataMov, origem } = req.body;
  // Verifica que a obra pertence ao tenant
  const obra = await prisma.obra.findFirst({ where: { id: parseInt(obraId), tenantId: req.user.tenantId } });
  if (!obra) return res.status(404).json({ error: "Obra não encontrada." });
  const item = await prisma.estoque.create({
    data: { obraId: parseInt(obraId), insumoId: parseInt(insumoId), quantEntrada: parseFloat(quantEntrada) || 0, quantUtilizado: 0, dataMov, origem },
    include: { insumo: true },
  });
  res.status(201).json(item);
});

router.put("/:id", async (req, res) => {
  const existing = await findEstoqueDoTenant(parseInt(req.params.id), req.user.tenantId);
  if (!existing) return res.status(404).json({ error: "Não encontrado." });
  const { quantEntrada, quantUtilizado, dataMov, origem } = req.body;
  const item = await prisma.estoque.update({
    where: { id: existing.id },
    data: { quantEntrada: parseFloat(quantEntrada), quantUtilizado: parseFloat(quantUtilizado), dataMov, origem },
    include: { insumo: true },
  });
  res.json(item);
});

router.delete("/:id", async (req, res) => {
  const existing = await findEstoqueDoTenant(parseInt(req.params.id), req.user.tenantId);
  if (!existing) return res.status(404).json({ error: "Não encontrado." });
  await prisma.estoque.delete({ where: { id: existing.id } });
  res.json({ ok: true });
});

export default router;
