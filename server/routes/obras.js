import { Router } from "express";
import prisma from "../db.js";

const router = Router();

router.get("/", async (req, res) => {
  const obras = await prisma.obra.findMany({
    where: { tenantId: req.user.tenantId },
    include: { etapas: { include: { tipoEtapa: true } }, acessos: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(obras);
});

router.post("/", async (req, res) => {
  const { nome, local, responsavel, inicio, previsaoFim, orcamento, status, descricao } = req.body;
  const obra = await prisma.obra.create({
    data: { tenantId: req.user.tenantId, nome, local, responsavel, inicio, previsaoFim, orcamento: parseFloat(orcamento) || 0, status: status || "Planejada", descricao },
  });
  res.status(201).json(obra);
});

router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const obra = await prisma.obra.findFirst({ where: { id, tenantId: req.user.tenantId } });
  if (!obra) return res.status(404).json({ error: "Obra não encontrada." });
  const { nome, local, responsavel, inicio, previsaoFim, orcamento, status, descricao } = req.body;
  const updated = await prisma.obra.update({
    where: { id },
    data: { nome, local, responsavel, inicio, previsaoFim, orcamento: parseFloat(orcamento) || 0, status, descricao },
  });
  res.json(updated);
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const obra = await prisma.obra.findFirst({ where: { id, tenantId: req.user.tenantId } });
  if (!obra) return res.status(404).json({ error: "Obra não encontrada." });
  await prisma.obra.delete({ where: { id } });
  res.json({ ok: true });
});

// Etapas
router.get("/:id/etapas", async (req, res) => {
  const obraId = parseInt(req.params.id);
  const etapas = await prisma.etapaObra.findMany({
    where: { obraId },
    include: { tipoEtapa: true },
    orderBy: { dataInicioP: "asc" },
  });
  res.json(etapas);
});

router.post("/:id/etapas", async (req, res) => {
  const obraId = parseInt(req.params.id);
  const { tipoEtapaId, dataInicioP, dataFimP, dataInicioR, dataFimR, status, progresso } = req.body;
  const etapa = await prisma.etapaObra.create({
    data: { obraId, tipoEtapaId: parseInt(tipoEtapaId), dataInicioP, dataFimP, dataInicioR: dataInicioR || null, dataFimR: dataFimR || null, status: status || "Pendente", progresso: parseInt(progresso) || 0 },
    include: { tipoEtapa: true },
  });
  res.status(201).json(etapa);
});

router.put("/:id/etapas/:etapaId", async (req, res) => {
  const id = parseInt(req.params.etapaId);
  const { tipoEtapaId, dataInicioP, dataFimP, dataInicioR, dataFimR, status, progresso } = req.body;
  const updated = await prisma.etapaObra.update({
    where: { id },
    data: { tipoEtapaId: parseInt(tipoEtapaId), dataInicioP, dataFimP, dataInicioR: dataInicioR || null, dataFimR: dataFimR || null, status, progresso: parseInt(progresso) || 0 },
    include: { tipoEtapa: true },
  });
  res.json(updated);
});

router.delete("/:id/etapas/:etapaId", async (req, res) => {
  await prisma.etapaObra.delete({ where: { id: parseInt(req.params.etapaId) } });
  res.json({ ok: true });
});

export default router;
