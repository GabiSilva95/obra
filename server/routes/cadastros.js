import { Router } from "express";
import prisma from "../db.js";
import { checkPlanLimit } from "../middleware/planLimit.js";

const router = Router();

// ─── Helpers de ownership ────────────────────────────────────────────────────

async function findDoTenant(model, id, tenantId) {
  return prisma[model].findFirst({ where: { id, tenantId } });
}

async function ownershipError(res) {
  return res.status(404).json({ error: "Não encontrado." });
}

// ─── Máquinas ─────────────────────────────────────────────────────────────────

router.get("/maquinas", async (req, res) => {
  const items = await prisma.maquina.findMany({ where: { tenantId: req.user.tenantId }, orderBy: { nome: "asc" } });
  res.json(items);
});

router.post("/maquinas", checkPlanLimit("maquinas"), async (req, res) => {
  const { nome, tipo, modelo, custoHora } = req.body;
  const item = await prisma.maquina.create({ data: { tenantId: req.user.tenantId, nome, tipo, modelo, custoHora: parseFloat(custoHora) || 0 } });
  res.status(201).json(item);
});

router.put("/maquinas/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const existing = await findDoTenant("maquina", id, req.user.tenantId);
  if (!existing) return ownershipError(res);
  const { nome, tipo, modelo, custoHora } = req.body;
  const item = await prisma.maquina.update({ where: { id }, data: { nome, tipo, modelo, custoHora: parseFloat(custoHora) || 0 } });
  res.json(item);
});

router.delete("/maquinas/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const existing = await findDoTenant("maquina", id, req.user.tenantId);
  if (!existing) return ownershipError(res);
  await prisma.maquina.delete({ where: { id } });
  res.json({ ok: true });
});

// ─── Funcionários ─────────────────────────────────────────────────────────────

router.get("/funcionarios", async (req, res) => {
  const items = await prisma.funcionario.findMany({
    where: { tenantId: req.user.tenantId },
    include: { funcionarioObra: { include: { obra: true } } },
    orderBy: { nome: "asc" },
  });
  res.json(items);
});

router.post("/funcionarios", checkPlanLimit("funcionarios"), async (req, res) => {
  const { nome, cargo, salarioDia, telefone, cpf } = req.body;
  const item = await prisma.funcionario.create({ data: { tenantId: req.user.tenantId, nome, cargo, salarioDia: parseFloat(salarioDia) || 0, telefone, cpf } });
  res.status(201).json(item);
});

router.put("/funcionarios/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const existing = await findDoTenant("funcionario", id, req.user.tenantId);
  if (!existing) return ownershipError(res);
  const { nome, cargo, salarioDia, telefone, cpf, ativo } = req.body;
  const item = await prisma.funcionario.update({ where: { id }, data: { nome, cargo, salarioDia: parseFloat(salarioDia) || 0, telefone, cpf, ativo: ativo ?? true } });
  res.json(item);
});

router.delete("/funcionarios/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const existing = await findDoTenant("funcionario", id, req.user.tenantId);
  if (!existing) return ownershipError(res);
  await prisma.funcionario.delete({ where: { id } });
  res.json({ ok: true });
});

// Vínculo funcionário-obra — verifica ambos os lados
router.post("/funcionarios/:id/obras", async (req, res) => {
  const funcionarioId = parseInt(req.params.id);
  const { obraId, dias } = req.body;

  const funcionario = await findDoTenant("funcionario", funcionarioId, req.user.tenantId);
  if (!funcionario) return ownershipError(res);

  const obra = await prisma.obra.findFirst({ where: { id: parseInt(obraId), tenantId: req.user.tenantId } });
  if (!obra) return ownershipError(res);

  const item = await prisma.funcionarioObra.create({ data: { funcionarioId, obraId: parseInt(obraId), dias: parseInt(dias) || 0 } });
  res.status(201).json(item);
});

router.delete("/funcionarios/obras/:vincId", async (req, res) => {
  const id = parseInt(req.params.vincId);
  // Verifica que o vínculo pertence a um funcionário do tenant
  const vinc = await prisma.funcionarioObra.findFirst({
    where: { id },
    include: { funcionario: { select: { tenantId: true } } },
  });
  if (!vinc || vinc.funcionario.tenantId !== req.user.tenantId) return ownershipError(res);
  await prisma.funcionarioObra.delete({ where: { id } });
  res.json({ ok: true });
});

// ─── Insumos ──────────────────────────────────────────────────────────────────

router.get("/insumos", async (req, res) => {
  const items = await prisma.insumo.findMany({ where: { tenantId: req.user.tenantId }, orderBy: { nome: "asc" } });
  res.json(items);
});

router.post("/insumos", checkPlanLimit("insumos"), async (req, res) => {
  const { nome, unidade, custoUnit, categoria, fornecedor } = req.body;
  const item = await prisma.insumo.create({ data: { tenantId: req.user.tenantId, nome, unidade, custoUnit: parseFloat(custoUnit) || 0, categoria, fornecedor } });
  res.status(201).json(item);
});

router.put("/insumos/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const existing = await findDoTenant("insumo", id, req.user.tenantId);
  if (!existing) return ownershipError(res);
  const { nome, unidade, custoUnit, categoria, fornecedor } = req.body;
  const item = await prisma.insumo.update({ where: { id }, data: { nome, unidade, custoUnit: parseFloat(custoUnit) || 0, categoria, fornecedor } });
  res.json(item);
});

router.delete("/insumos/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const existing = await findDoTenant("insumo", id, req.user.tenantId);
  if (!existing) return ownershipError(res);
  await prisma.insumo.delete({ where: { id } });
  res.json({ ok: true });
});

// ─── Tipos de Etapa ───────────────────────────────────────────────────────────

router.get("/tipos-etapa", async (req, res) => {
  const items = await prisma.tipoEtapa.findMany({ where: { tenantId: req.user.tenantId }, orderBy: { nome: "asc" } });
  res.json(items);
});

router.post("/tipos-etapa", async (req, res) => {
  const { nome, icon, tempoPadrao } = req.body;
  const item = await prisma.tipoEtapa.create({ data: { tenantId: req.user.tenantId, nome, icon, tempoPadrao: tempoPadrao ? parseInt(tempoPadrao) : null } });
  res.status(201).json(item);
});

router.put("/tipos-etapa/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const existing = await findDoTenant("tipoEtapa", id, req.user.tenantId);
  if (!existing) return ownershipError(res);
  const { nome, icon, tempoPadrao } = req.body;
  const item = await prisma.tipoEtapa.update({ where: { id }, data: { nome, icon, tempoPadrao: tempoPadrao ? parseInt(tempoPadrao) : null } });
  res.json(item);
});

router.delete("/tipos-etapa/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const existing = await findDoTenant("tipoEtapa", id, req.user.tenantId);
  if (!existing) return ownershipError(res);
  await prisma.tipoEtapa.delete({ where: { id } });
  res.json({ ok: true });
});

export default router;
