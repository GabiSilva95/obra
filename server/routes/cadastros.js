import { Router } from "express";
import prisma from "../db.js";

const router = Router();

// ─── Helpers de ownership ────────────────────────────────────────────────────

async function findDoTenant(model, id, tenantId) {
  return prisma[model].findFirst({ where: { id, tenantId } });
}

function ownershipError(res) {
  return res.status(404).json({ error: "Não encontrado." });
}

// ─── Helper: auto-calcula custoHora ──────────────────────────────────────────
//
// Regras:
//   propria            → valorAquisicao / (vidaUtilAnos × 12 × horasProdMes)
//   alugada / hora     → valorLocacao  (= custo por hora diretamente)
//   alugada / mensal   → valorLocacao / (horasProdMes ∥ 160)
//   legado (sem tipo)  → mantém o valor manual enviado pelo cliente
//
function calcularCustoHora({ tipoPropriedade, tipoCobranca, valorLocacao, valorAquisicao, vidaUtilAnos, horasProdMes, custoHoraManual }) {
  if (tipoPropriedade === "propria") {
    const va  = parseFloat(valorAquisicao)  || 0;
    const vu  = parseInt(vidaUtilAnos)      || 0;
    const hpm = parseInt(horasProdMes)      || 0;
    if (va > 0 && vu > 0 && hpm > 0) {
      return va / (vu * 12 * hpm);
    }
    return parseFloat(custoHoraManual) || 0;
  }
  if (tipoPropriedade === "alugada") {
    const vl  = parseFloat(valorLocacao) || 0;
    const hpm = parseInt(horasProdMes)   || 160;
    if (vl <= 0) return parseFloat(custoHoraManual) || 0;
    return tipoCobranca === "hora" ? vl : vl / hpm;
  }
  // Legado: campo livre
  return parseFloat(custoHoraManual) || 0;
}

// ─── Categorias de Máquina ────────────────────────────────────────────────────

router.get("/categorias-maquina", async (req, res) => {
  try {
    const items = await prisma.categoriaMaquina.findMany({
      where: { tenantId: req.user.tenantId },
      orderBy: { nome: "asc" },
    });
    res.json(items);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/categorias-maquina", async (req, res) => {
  try {
    const { nome } = req.body;
    if (!nome?.trim()) return res.status(400).json({ error: "Nome é obrigatório." });
    const item = await prisma.categoriaMaquina.create({
      data: { tenantId: req.user.tenantId, nome: nome.trim() },
    });
    res.status(201).json(item);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put("/categorias-maquina/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await findDoTenant("categoriaMaquina", id, req.user.tenantId);
    if (!existing) return ownershipError(res);
    const { nome, ativo } = req.body;
    const item = await prisma.categoriaMaquina.update({
      where: { id },
      data: { nome: nome?.trim() || existing.nome, ativo: ativo ?? existing.ativo },
    });
    res.json(item);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/categorias-maquina/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await findDoTenant("categoriaMaquina", id, req.user.tenantId);
    if (!existing) return ownershipError(res);
    await prisma.maquina.updateMany({
      where: { categoriaId: id, tenantId: req.user.tenantId },
      data: { categoriaId: null },
    });
    await prisma.categoriaMaquina.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Máquinas ─────────────────────────────────────────────────────────────────

router.get("/maquinas", async (req, res) => {
  try {
    const items = await prisma.maquina.findMany({
      where: { tenantId: req.user.tenantId },
      include: { categoria: true },
      orderBy: { nome: "asc" },
    });
    res.json(items);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/maquinas", async (req, res) => {
  try {
    const {
      nome, tipo, modelo,
      categoriaId,
      tipoPropriedade, tipoCobranca,
      valorLocacao, valorAquisicao, dataAquisicao, vidaUtilAnos, horasProdMes,
      custoHora: custoHoraManual,
    } = req.body;

    const custoHora = calcularCustoHora({
      tipoPropriedade, tipoCobranca,
      valorLocacao, valorAquisicao, vidaUtilAnos, horasProdMes,
      custoHoraManual,
    });

    const item = await prisma.maquina.create({
      data: {
        tenantId: req.user.tenantId,
        nome,
        tipo: tipo || null,
        modelo: modelo || null,
        custoHora,
        categoriaId:      categoriaId     ? parseInt(categoriaId)     : null,
        tipoPropriedade:  tipoPropriedade  || null,
        tipoCobranca:     tipoCobranca     || null,
        valorLocacao:     valorLocacao     != null ? parseFloat(valorLocacao)     : null,
        valorAquisicao:   valorAquisicao   != null ? parseFloat(valorAquisicao)   : null,
        dataAquisicao:    dataAquisicao    || null,
        vidaUtilAnos:     vidaUtilAnos     != null ? parseInt(vidaUtilAnos)       : null,
        horasProdMes:     horasProdMes     != null ? parseInt(horasProdMes)       : null,
      },
      include: { categoria: true },
    });
    res.status(201).json(item);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put("/maquinas/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await findDoTenant("maquina", id, req.user.tenantId);
    if (!existing) return ownershipError(res);

    const {
      nome, tipo, modelo,
      categoriaId,
      tipoPropriedade, tipoCobranca,
      valorLocacao, valorAquisicao, dataAquisicao, vidaUtilAnos, horasProdMes,
      custoHora: custoHoraManual,
    } = req.body;

    const custoHora = calcularCustoHora({
      tipoPropriedade:  tipoPropriedade  ?? existing.tipoPropriedade,
      tipoCobranca:     tipoCobranca     ?? existing.tipoCobranca,
      valorLocacao:     valorLocacao     ?? existing.valorLocacao,
      valorAquisicao:   valorAquisicao   ?? existing.valorAquisicao,
      vidaUtilAnos:     vidaUtilAnos     ?? existing.vidaUtilAnos,
      horasProdMes:     horasProdMes     ?? existing.horasProdMes,
      custoHoraManual:  custoHoraManual  ?? existing.custoHora,
    });

    const item = await prisma.maquina.update({
      where: { id },
      data: {
        nome:            nome            ?? existing.nome,
        tipo:            tipo            !== undefined ? (tipo || null)    : existing.tipo,
        modelo:          modelo          !== undefined ? (modelo || null)  : existing.modelo,
        custoHora,
        categoriaId:     categoriaId     !== undefined ? (categoriaId ? parseInt(categoriaId) : null) : existing.categoriaId,
        tipoPropriedade: tipoPropriedade !== undefined ? (tipoPropriedade || null) : existing.tipoPropriedade,
        tipoCobranca:    tipoCobranca    !== undefined ? (tipoCobranca    || null) : existing.tipoCobranca,
        valorLocacao:    valorLocacao    !== undefined ? (valorLocacao    != null ? parseFloat(valorLocacao)   : null) : existing.valorLocacao,
        valorAquisicao:  valorAquisicao  !== undefined ? (valorAquisicao  != null ? parseFloat(valorAquisicao) : null) : existing.valorAquisicao,
        dataAquisicao:   dataAquisicao   !== undefined ? (dataAquisicao   || null) : existing.dataAquisicao,
        vidaUtilAnos:    vidaUtilAnos    !== undefined ? (vidaUtilAnos    != null ? parseInt(vidaUtilAnos)     : null) : existing.vidaUtilAnos,
        horasProdMes:    horasProdMes    !== undefined ? (horasProdMes    != null ? parseInt(horasProdMes)     : null) : existing.horasProdMes,
      },
      include: { categoria: true },
    });
    res.json(item);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/maquinas/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await findDoTenant("maquina", id, req.user.tenantId);
    if (!existing) return ownershipError(res);
    await prisma.maquina.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Funcionários ─────────────────────────────────────────────────────────────

router.get("/funcionarios", async (req, res) => {
  try {
    const items = await prisma.funcionario.findMany({
      where: { tenantId: req.user.tenantId },
      include: { funcionarioObra: { include: { obra: true } } },
      orderBy: { nome: "asc" },
    });
    res.json(items);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/funcionarios", async (req, res) => {
  try {
    const { nome, cargo, salarioDia, telefone, cpf } = req.body;
    const item = await prisma.funcionario.create({
      data: { tenantId: req.user.tenantId, nome, cargo, salarioDia: parseFloat(salarioDia) || 0, telefone, cpf },
    });
    res.status(201).json(item);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put("/funcionarios/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await findDoTenant("funcionario", id, req.user.tenantId);
    if (!existing) return ownershipError(res);
    const { nome, cargo, salarioDia, telefone, cpf, ativo } = req.body;
    const item = await prisma.funcionario.update({
      where: { id },
      data: { nome, cargo, salarioDia: parseFloat(salarioDia) || 0, telefone, cpf, ativo: ativo ?? true },
    });
    res.json(item);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/funcionarios/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await findDoTenant("funcionario", id, req.user.tenantId);
    if (!existing) return ownershipError(res);
    await prisma.funcionario.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Vínculo funcionário-obra
router.post("/funcionarios/:id/obras", async (req, res) => {
  try {
    const funcionarioId = parseInt(req.params.id);
    const { obraId, dias } = req.body;
    const funcionario = await findDoTenant("funcionario", funcionarioId, req.user.tenantId);
    if (!funcionario) return ownershipError(res);
    const obra = await prisma.obra.findFirst({ where: { id: parseInt(obraId), tenantId: req.user.tenantId } });
    if (!obra) return ownershipError(res);
    const item = await prisma.funcionarioObra.create({
      data: { funcionarioId, obraId: parseInt(obraId), dias: parseInt(dias) || 0 },
    });
    res.status(201).json(item);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/funcionarios/obras/:vincId", async (req, res) => {
  try {
    const id = parseInt(req.params.vincId);
    const vinc = await prisma.funcionarioObra.findFirst({
      where: { id },
      include: { funcionario: { select: { tenantId: true } } },
    });
    if (!vinc || vinc.funcionario.tenantId !== req.user.tenantId) return ownershipError(res);
    await prisma.funcionarioObra.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Insumos ──────────────────────────────────────────────────────────────────

router.get("/insumos", async (req, res) => {
  try {
    const items = await prisma.insumo.findMany({
      where: { tenantId: req.user.tenantId },
      orderBy: { nome: "asc" },
    });
    res.json(items);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/insumos", async (req, res) => {
  try {
    const { nome, unidade, custoUnit, categoria, fornecedor } = req.body;
    const item = await prisma.insumo.create({
      data: { tenantId: req.user.tenantId, nome, unidade, custoUnit: parseFloat(custoUnit) || 0, categoria, fornecedor },
    });
    res.status(201).json(item);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put("/insumos/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await findDoTenant("insumo", id, req.user.tenantId);
    if (!existing) return ownershipError(res);
    const { nome, unidade, custoUnit, categoria, fornecedor } = req.body;
    const item = await prisma.insumo.update({
      where: { id },
      data: { nome, unidade, custoUnit: parseFloat(custoUnit) || 0, categoria, fornecedor },
    });
    res.json(item);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/insumos/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await findDoTenant("insumo", id, req.user.tenantId);
    if (!existing) return ownershipError(res);
    await prisma.insumo.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Tipos de Etapa ───────────────────────────────────────────────────────────

router.get("/tipos-etapa", async (req, res) => {
  try {
    const items = await prisma.tipoEtapa.findMany({
      where: { tenantId: req.user.tenantId },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    });
    res.json(items);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/tipos-etapa", async (req, res) => {
  try {
    const { nome, icon, tempoPadrao, ordem } = req.body;
    const item = await prisma.tipoEtapa.create({
      data: {
        tenantId: req.user.tenantId,
        nome,
        icon,
        tempoPadrao: tempoPadrao ? parseInt(tempoPadrao) : null,
        ordem:       ordem       ? parseInt(ordem)       : null,
      },
    });
    res.status(201).json(item);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put("/tipos-etapa/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await findDoTenant("tipoEtapa", id, req.user.tenantId);
    if (!existing) return ownershipError(res);
    const { nome, icon, tempoPadrao, ordem } = req.body;
    const item = await prisma.tipoEtapa.update({
      where: { id },
      data: {
        nome,
        icon,
        tempoPadrao: tempoPadrao != null ? parseInt(tempoPadrao) : null,
        ordem:       ordem       != null ? parseInt(ordem)       : existing.ordem,
      },
    });
    res.json(item);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/tipos-etapa/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await findDoTenant("tipoEtapa", id, req.user.tenantId);
    if (!existing) return ownershipError(res);
    await prisma.tipoEtapa.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Tipos de Obra ────────────────────────────────────────────────────────────

router.get("/tipos-obra", async (req, res) => {
  try {
    const items = await prisma.tipoObra.findMany({
      where: { tenantId: req.user.tenantId },
      include: {
        etapas: {
          include: { tipoEtapa: true },
          orderBy: { ordem: "asc" },
        },
        _count: { select: { obras: true } },
      },
      orderBy: { nome: "asc" },
    });
    res.json(items);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/tipos-obra", async (req, res) => {
  try {
    const { nome, descricao } = req.body;
    if (!nome?.trim()) return res.status(400).json({ error: "Nome é obrigatório." });
    const item = await prisma.tipoObra.create({
      data: { tenantId: req.user.tenantId, nome: nome.trim(), descricao: descricao || null },
      include: { etapas: { include: { tipoEtapa: true } } },
    });
    res.status(201).json(item);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put("/tipos-obra/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await findDoTenant("tipoObra", id, req.user.tenantId);
    if (!existing) return ownershipError(res);
    const { nome, descricao, ativo } = req.body;
    const item = await prisma.tipoObra.update({
      where: { id },
      data: {
        nome:      nome?.trim()    || existing.nome,
        descricao: descricao       !== undefined ? (descricao || null) : existing.descricao,
        ativo:     ativo           != null ? ativo : existing.ativo,
      },
      include: { etapas: { include: { tipoEtapa: true }, orderBy: { ordem: "asc" } } },
    });
    res.json(item);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/tipos-obra/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await findDoTenant("tipoObra", id, req.user.tenantId);
    if (!existing) return ownershipError(res);
    await prisma.tipoObra.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Etapas de um Tipo de Obra (TipoObraEtapa) ───────────────────────────────

router.get("/tipos-obra/:id/etapas", async (req, res) => {
  try {
    const tipoObraId = parseInt(req.params.id);
    const tipoObra = await findDoTenant("tipoObra", tipoObraId, req.user.tenantId);
    if (!tipoObra) return ownershipError(res);
    const etapas = await prisma.tipoObraEtapa.findMany({
      where: { tipoObraId },
      include: { tipoEtapa: true },
      orderBy: { ordem: "asc" },
    });
    res.json(etapas);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/tipos-obra/:id/etapas", async (req, res) => {
  try {
    const tipoObraId = parseInt(req.params.id);
    const tipoObra = await findDoTenant("tipoObra", tipoObraId, req.user.tenantId);
    if (!tipoObra) return ownershipError(res);

    const { tipoEtapaId, ordem } = req.body;
    if (!tipoEtapaId) return res.status(400).json({ error: "tipoEtapaId é obrigatório." });

    const tipoEtapa = await findDoTenant("tipoEtapa", parseInt(tipoEtapaId), req.user.tenantId);
    if (!tipoEtapa) return res.status(404).json({ error: "Tipo de etapa não encontrado." });

    let ordemFinal = ordem != null ? parseInt(ordem) : 0;
    if (!ordem) {
      const ultimo = await prisma.tipoObraEtapa.findFirst({
        where: { tipoObraId },
        orderBy: { ordem: "desc" },
      });
      ordemFinal = ultimo ? ultimo.ordem + 1 : 0;
    }

    const vinculo = await prisma.tipoObraEtapa.upsert({
      where: { tipoObraId_tipoEtapaId: { tipoObraId, tipoEtapaId: parseInt(tipoEtapaId) } },
      create: { tipoObraId, tipoEtapaId: parseInt(tipoEtapaId), ordem: ordemFinal },
      update: { ordem: ordemFinal },
      include: { tipoEtapa: true },
    });
    res.status(201).json(vinculo);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/tipos-obra/:id/etapas/:tipoEtapaId", async (req, res) => {
  try {
    const tipoObraId  = parseInt(req.params.id);
    const tipoEtapaId = parseInt(req.params.tipoEtapaId);
    const tipoObra = await findDoTenant("tipoObra", tipoObraId, req.user.tenantId);
    if (!tipoObra) return ownershipError(res);

    const vinculo = await prisma.tipoObraEtapa.findFirst({ where: { tipoObraId, tipoEtapaId } });
    if (!vinculo) return res.status(404).json({ error: "Vínculo não encontrado." });

    await prisma.tipoObraEtapa.delete({ where: { id: vinculo.id } });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Substitui em lote as etapas de um TipoObra (recebe array ordenado)
router.put("/tipos-obra/:id/etapas", async (req, res) => {
  try {
    const tipoObraId = parseInt(req.params.id);
    const tipoObra = await findDoTenant("tipoObra", tipoObraId, req.user.tenantId);
    if (!tipoObra) return ownershipError(res);

    // etapas: [{ tipoEtapaId: number, ordem: number }]
    const { etapas } = req.body;
    if (!Array.isArray(etapas)) return res.status(400).json({ error: "etapas deve ser um array." });

    // Valida ownership de cada tipoEtapa antes de agir
    for (const e of etapas) {
      const ok = await findDoTenant("tipoEtapa", parseInt(e.tipoEtapaId), req.user.tenantId);
      if (!ok) return res.status(404).json({ error: `TipoEtapa ${e.tipoEtapaId} não encontrado.` });
    }

    // Remove os antigos e recria
    await prisma.tipoObraEtapa.deleteMany({ where: { tipoObraId } });
    if (etapas.length > 0) {
      await prisma.tipoObraEtapa.createMany({
        data: etapas.map((e, i) => ({
          tipoObraId,
          tipoEtapaId: parseInt(e.tipoEtapaId),
          ordem: e.ordem != null ? parseInt(e.ordem) : i,
        })),
      });
    }

    // Retorna o tipo de obra atualizado com etapas
    const updated = await prisma.tipoObra.findUnique({
      where: { id: tipoObraId },
      include: { etapas: { include: { tipoEtapa: true }, orderBy: { ordem: "asc" } } },
    });
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
