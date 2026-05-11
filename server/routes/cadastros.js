import { Router } from "express";
import prisma from "../db.js";

const router = Router();

// Máquinas
router.get("/maquinas", async (req, res) => {
  const items = await prisma.maquina.findMany({ where: { tenantId: req.user.tenantId }, orderBy: { nome: "asc" } });
  res.json(items);
});
router.post("/maquinas", async (req, res) => {
  const { nome, tipo, modelo, custoHora } = req.body;
  const item = await prisma.maquina.create({ data: { tenantId: req.user.tenantId, nome, tipo, modelo, custoHora: parseFloat(custoHora) || 0 } });
  res.status(201).json(item);
});
router.put("/maquinas/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { nome, tipo, modelo, custoHora } = req.body;
  const item = await prisma.maquina.update({ where: { id }, data: { nome, tipo, modelo, custoHora: parseFloat(custoHora) || 0 } });
  res.json(item);
});
router.delete("/maquinas/:id", async (req, res) => {
  await prisma.maquina.delete({ where: { id: parseInt(req.params.id) } });
  res.json({ ok: true });
});

// Funcionários
router.get("/funcionarios", async (req, res) => {
  const items = await prisma.funcionario.findMany({
    where: { tenantId: req.user.tenantId },
    include: { funcionarioObra: { include: { obra: true } } },
    orderBy: { nome: "asc" },
  });
  res.json(items);
});
router.post("/funcionarios", async (req, res) => {
  const { nome, cargo, salarioDia, telefone, cpf } = req.body;
  const item = await prisma.funcionario.create({ data: { tenantId: req.user.tenantId, nome, cargo, salarioDia: parseFloat(salarioDia) || 0, telefone, cpf } });
  res.status(201).json(item);
});
router.put("/funcionarios/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { nome, cargo, salarioDia, telefone, cpf, ativo } = req.body;
  const item = await prisma.funcionario.update({ where: { id }, data: { nome, cargo, salarioDia: parseFloat(salarioDia) || 0, telefone, cpf, ativo: ativo ?? true } });
  res.json(item);
});
router.delete("/funcionarios/:id", async (req, res) => {
  await prisma.funcionario.delete({ where: { id: parseInt(req.params.id) } });
  res.json({ ok: true });
});

// Vínculo funcionário-obra
router.post("/funcionarios/:id/obras", async (req, res) => {
  const { obraId, dias } = req.body;
  const item = await prisma.funcionarioObra.create({ data: { funcionarioId: parseInt(req.params.id), obraId: parseInt(obraId), dias: parseInt(dias) || 0 } });
  res.status(201).json(item);
});
router.delete("/funcionarios/obras/:vincId", async (req, res) => {
  await prisma.funcionarioObra.delete({ where: { id: parseInt(req.params.vincId) } });
  res.json({ ok: true });
});

// Insumos
router.get("/insumos", async (req, res) => {
  const items = await prisma.insumo.findMany({ where: { tenantId: req.user.tenantId }, orderBy: { nome: "asc" } });
  res.json(items);
});
router.post("/insumos", async (req, res) => {
  const { nome, unidade, custoUnit, categoria, fornecedor } = req.body;
  const item = await prisma.insumo.create({ data: { tenantId: req.user.tenantId, nome, unidade, custoUnit: parseFloat(custoUnit) || 0, categoria, fornecedor } });
  res.status(201).json(item);
});
router.put("/insumos/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { nome, unidade, custoUnit, categoria, fornecedor } = req.body;
  const item = await prisma.insumo.update({ where: { id }, data: { nome, unidade, custoUnit: parseFloat(custoUnit) || 0, categoria, fornecedor } });
  res.json(item);
});
router.delete("/insumos/:id", async (req, res) => {
  await prisma.insumo.delete({ where: { id: parseInt(req.params.id) } });
  res.json({ ok: true });
});

// Tipos de Etapa
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
  const { nome, icon, tempoPadrao } = req.body;
  const item = await prisma.tipoEtapa.update({ where: { id }, data: { nome, icon, tempoPadrao: tempoPadrao ? parseInt(tempoPadrao) : null } });
  res.json(item);
});
router.delete("/tipos-etapa/:id", async (req, res) => {
  await prisma.tipoEtapa.delete({ where: { id: parseInt(req.params.id) } });
  res.json({ ok: true });
});

export default router;
