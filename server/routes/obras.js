import { Router } from "express";
import prisma from "../db.js";
import { checkPlanLimit } from "../middleware/planLimit.js";
import anexosRoutes from "./anexos.js";

const router = Router();

// Anexos da obra: /obras/:id/anexos
router.use("/:id/anexos", anexosRoutes);

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function findObraDoTenant(obraId, tenantId) {
  return prisma.obra.findFirst({ where: { id: obraId, tenantId } });
}

async function findEtapaDoTenant(etapaId, obraId, tenantId) {
  return prisma.etapaObra.findFirst({ where: { id: etapaId, obraId, tenantId } });
}

// ─── Cronograma em cascata ───────────────────────────────────────────────────
//
// Datas são gravadas como String "YYYY-MM-DD". Todo cálculo usa UTC para não
// escorregar um dia conforme o fuso do servidor.

const DIA_MS = 86400000;

function paraData(iso) {
  const [a, m, d] = String(iso).split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d));
}

function paraIso(date) {
  return date.toISOString().slice(0, 10);
}

function somarDias(iso, dias) {
  return paraIso(new Date(paraData(iso).getTime() + dias * DIA_MS));
}

function diasEntre(isoA, isoB) {
  return Math.round((paraData(isoB) - paraData(isoA)) / DIA_MS);
}

/**
 * Distribui as etapas do template em sequência a partir do início da obra:
 * cada etapa começa no dia seguinte ao fim da anterior.
 *
 * A duração vem do `tempoPadrao` do tipo de etapa. Quando ele não está
 * preenchido, usa-se a média do prazo da obra dividido pelo número de etapas —
 * assim um template sem tempos configurados ainda preenche a janela da obra em
 * vez de empilhar tudo na mesma data.
 *
 * O cronograma pode ultrapassar a previsão de fim da obra: isso é informação
 * real (o template não cabe no prazo) e aparece como atraso já na criação.
 *
 * @returns {{dataInicioP: string, dataFimP: string}[]} na ordem recebida
 */
function montarCronograma(etapasTemplate, inicio, previsaoFim) {
  const total = etapasTemplate.length;
  if (total === 0) return [];

  const janela   = Math.max(1, diasEntre(inicio, previsaoFim) + 1);
  const fallback = Math.max(1, Math.round(janela / total));

  let cursor = inicio;
  return etapasTemplate.map(toe => {
    const tp   = toe.tipoEtapa?.tempoPadrao;
    const dias = tp && tp > 0 ? tp : fallback;

    const dataInicioP = cursor;
    const dataFimP    = somarDias(cursor, dias - 1);
    cursor            = somarDias(dataFimP, 1);

    return { dataInicioP, dataFimP };
  });
}

// ─── Obras ────────────────────────────────────────────────────────────────────

router.get("/", async (req, res) => {
  const obras = await prisma.obra.findMany({
    where: { tenantId: req.user.tenantId },
    include: {
      etapas:   { include: { tipoEtapa: true } },
      acessos:  true,
      tipoObra: true,
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(obras);
});

router.post("/", checkPlanLimit("obras"), async (req, res) => {
  const { nome, local, responsavel, inicio, previsaoFim, orcamento, status, descricao, tipoObraId } = req.body;

  // Valida tipoObraId se fornecido
  let tipoObra = null;
  if (tipoObraId) {
    tipoObra = await prisma.tipoObra.findFirst({
      where: { id: parseInt(tipoObraId), tenantId: req.user.tenantId },
      include: {
        etapas: {
          include: { tipoEtapa: true },
          orderBy: { ordem: "asc" },
        },
      },
    });
    if (!tipoObra) return res.status(404).json({ error: "Tipo de obra não encontrado." });
  }

  const obra = await prisma.obra.create({
    data: {
      tenantId:   req.user.tenantId,
      nome,
      local,
      responsavel: responsavel  || null,
      inicio,
      previsaoFim,
      orcamento:  parseFloat(orcamento) || 0,
      status:     status || "Planejada",
      descricao:  descricao || null,
      tipoObraId: tipoObra ? tipoObra.id : null,
    },
  });

  // Auto-criação de etapas a partir do TipoObra, já encadeadas no tempo
  if (tipoObra && tipoObra.etapas.length > 0) {
    const cronograma = montarCronograma(tipoObra.etapas, inicio, previsaoFim);
    await prisma.etapaObra.createMany({
      data: tipoObra.etapas.map((toe, i) => ({
        tenantId:    req.user.tenantId,
        obraId:      obra.id,
        tipoEtapaId: toe.tipoEtapaId,
        dataInicioP: cronograma[i].dataInicioP,
        dataFimP:    cronograma[i].dataFimP,
        status:      "Pendente",
        progresso:   0,
        orcamento:   0,
      })),
    });
  }

  // Retorna obra completa com etapas incluídas
  const obraCompleta = await prisma.obra.findUnique({
    where: { id: obra.id },
    include: {
      etapas:   { include: { tipoEtapa: true }, orderBy: { dataInicioP: "asc" } },
      acessos:  true,
      tipoObra: true,
    },
  });
  res.status(201).json(obraCompleta);
});

router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const obra = await findObraDoTenant(id, req.user.tenantId);
  if (!obra) return res.status(404).json({ error: "Obra não encontrada." });

  const { nome, local, responsavel, inicio, previsaoFim, orcamento, status, descricao, tipoObraId } = req.body;

  // Valida tipoObraId se fornecido (null = remover vínculo)
  if (tipoObraId !== undefined && tipoObraId !== null) {
    const tipoObra = await prisma.tipoObra.findFirst({
      where: { id: parseInt(tipoObraId), tenantId: req.user.tenantId },
    });
    if (!tipoObra) return res.status(404).json({ error: "Tipo de obra não encontrado." });
  }

  const updated = await prisma.obra.update({
    where: { id },
    data: {
      nome,
      local,
      responsavel: responsavel  || null,
      inicio,
      previsaoFim,
      orcamento:  parseFloat(orcamento) || 0,
      status,
      descricao:  descricao || null,
      // undefined = não altera; null = desvincula; número = novo vínculo
      ...(tipoObraId !== undefined && {
        tipoObraId: tipoObraId === null ? null : parseInt(tipoObraId),
      }),
    },
    include: {
      etapas:   { include: { tipoEtapa: true } },
      acessos:  true,
      tipoObra: true,
    },
  });
  res.json(updated);
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const obra = await findObraDoTenant(id, req.user.tenantId);
  if (!obra) return res.status(404).json({ error: "Obra não encontrada." });
  await prisma.obra.delete({ where: { id } });
  res.json({ ok: true });
});

// ─── Etapas da Obra ───────────────────────────────────────────────────────────

router.get("/:id/etapas", async (req, res) => {
  const obraId = parseInt(req.params.id);
  const obra = await findObraDoTenant(obraId, req.user.tenantId);
  if (!obra) return res.status(404).json({ error: "Obra não encontrada." });
  const etapas = await prisma.etapaObra.findMany({
    where: { obraId },
    include: { tipoEtapa: true },
    orderBy: { dataInicioP: "asc" },
  });
  res.json(etapas);
});

router.post("/:id/etapas", async (req, res) => {
  const obraId = parseInt(req.params.id);
  const obra = await findObraDoTenant(obraId, req.user.tenantId);
  if (!obra) return res.status(404).json({ error: "Obra não encontrada." });
  const { tipoEtapaId, dataInicioP, dataFimP, dataInicioR, dataFimR, status, progresso } = req.body;
  const etapa = await prisma.etapaObra.create({
    data: {
      tenantId:    req.user.tenantId,
      obraId,
      tipoEtapaId: parseInt(tipoEtapaId),
      dataInicioP,
      dataFimP,
      dataInicioR: dataInicioR || null,
      dataFimR:    dataFimR    || null,
      status:      status      || "Pendente",
      progresso:   parseInt(progresso) || 0,
      orcamento:   parseFloat(req.body.orcamento) || 0,
    },
    include: { tipoEtapa: true },
  });
  res.status(201).json(etapa);
});

router.put("/:id/etapas/:etapaId", async (req, res) => {
  const obraId  = parseInt(req.params.id);
  const etapaId = parseInt(req.params.etapaId);
  const existing = await findEtapaDoTenant(etapaId, obraId, req.user.tenantId);
  if (!existing) return res.status(404).json({ error: "Etapa não encontrada." });
  const { tipoEtapaId, dataInicioP, dataFimP, dataInicioR, dataFimR, status, progresso, orcamento } = req.body;
  const updated = await prisma.etapaObra.update({
    where: { id: etapaId },
    data: {
      tipoEtapaId: parseInt(tipoEtapaId),
      dataInicioP,
      dataFimP,
      dataInicioR: dataInicioR || null,
      dataFimR:    dataFimR    || null,
      status,
      progresso:   parseInt(progresso) || 0,
      orcamento:   orcamento != null ? parseFloat(orcamento) : undefined,
    },
    include: { tipoEtapa: true },
  });
  res.json(updated);
});

router.delete("/:id/etapas/:etapaId", async (req, res) => {
  const obraId  = parseInt(req.params.id);
  const etapaId = parseInt(req.params.etapaId);
  const existing = await findEtapaDoTenant(etapaId, obraId, req.user.tenantId);
  if (!existing) return res.status(404).json({ error: "Etapa não encontrada." });
  await prisma.etapaObra.delete({ where: { id: etapaId } });
  res.json({ ok: true });
});

export default router;
