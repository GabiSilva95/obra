import { Router } from "express";
import prisma from "../db.js";

const router = Router();

/**
 * Despesas: custos que não são material, máquina nem mão de obra.
 * Sem obra vinculada, a despesa é geral da empresa e não entra no custo de
 * nenhuma obra — aparece só no consolidado.
 */

export const CATEGORIAS_DESPESA = [
  "Combustível",
  "Manutenção",
  "Aluguel",
  "Transporte",
  "Alimentação",
  "Tributos e Taxas",
  "Administrativo",
  "Segurança e EPI",
  "Serviços de Terceiros",
  "Outros",
];

router.get("/categorias", (_req, res) => res.json(CATEGORIAS_DESPESA));

router.get("/", async (req, res) => {
  try {
    const { obraId } = req.query;
    const where = { tenantId: req.user.tenantId };
    if (obraId) where.obraId = parseInt(obraId);
    const items = await prisma.despesa.findMany({
      where,
      orderBy: [{ data: "desc" }, { id: "desc" }],
    });
    res.json(items);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/** Valida que obra e etapa (quando informadas) são do tenant e combinam entre si. */
async function resolverVinculos(body, tenantId) {
  const { obraId, etapaId } = body;

  let obra = null;
  if (obraId) {
    obra = await prisma.obra.findFirst({ where: { id: parseInt(obraId), tenantId } });
    if (!obra) return { erro: "Obra não encontrada." };
  }

  let etapa = null;
  if (etapaId) {
    if (!obra) return { erro: "Para vincular a etapa, informe a obra." };
    etapa = await prisma.etapaObra.findFirst({
      where: { id: parseInt(etapaId), obraId: obra.id, tenantId },
    });
    if (!etapa) return { erro: "Etapa não encontrada nesta obra." };
  }

  return { obraId: obra ? obra.id : null, etapaId: etapa ? etapa.id : null };
}

router.post("/", async (req, res) => {
  try {
    const { categoria, descricao, valor, data, fornecedor, obs } = req.body;
    if (!categoria?.trim()) return res.status(400).json({ error: "Categoria é obrigatória." });
    if (!descricao?.trim()) return res.status(400).json({ error: "Descrição é obrigatória." });
    if (!data)              return res.status(400).json({ error: "Data é obrigatória." });
    if (!(parseFloat(valor) > 0)) return res.status(400).json({ error: "Valor deve ser maior que zero." });

    const vinc = await resolverVinculos(req.body, req.user.tenantId);
    if (vinc.erro) return res.status(404).json({ error: vinc.erro });

    const item = await prisma.despesa.create({
      data: {
        tenantId:   req.user.tenantId,
        obraId:     vinc.obraId,
        etapaId:    vinc.etapaId,
        categoria:  categoria.trim(),
        descricao:  descricao.trim(),
        valor:      parseFloat(valor),
        data,
        fornecedor: fornecedor || null,
        obs:        obs || null,
      },
    });
    res.status(201).json(item);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.despesa.findFirst({ where: { id, tenantId: req.user.tenantId } });
    if (!existing) return res.status(404).json({ error: "Não encontrado." });

    const vinc = await resolverVinculos(req.body, req.user.tenantId);
    if (vinc.erro) return res.status(404).json({ error: vinc.erro });

    const { categoria, descricao, valor, data, fornecedor, obs } = req.body;
    const item = await prisma.despesa.update({
      where: { id },
      data: {
        obraId:     req.body.obraId  !== undefined ? vinc.obraId  : existing.obraId,
        etapaId:    req.body.etapaId !== undefined ? vinc.etapaId : existing.etapaId,
        categoria:  categoria?.trim() || existing.categoria,
        descricao:  descricao?.trim() || existing.descricao,
        valor:      valor != null ? parseFloat(valor) : existing.valor,
        data:       data  ?? existing.data,
        fornecedor: fornecedor !== undefined ? (fornecedor || null) : existing.fornecedor,
        obs:        obs        !== undefined ? (obs || null)        : existing.obs,
      },
    });
    res.json(item);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.despesa.findFirst({ where: { id, tenantId: req.user.tenantId } });
    if (!existing) return res.status(404).json({ error: "Não encontrado." });
    await prisma.despesa.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
