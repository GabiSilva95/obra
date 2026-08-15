import { Router } from "express";
import prisma from "../db.js";

const router = Router();

// ─── Entradas de estoque (lotes) ─────────────────────────────────────────────

router.get("/", async (req, res) => {
  try {
    const { obraId } = req.query;
    const where = { tenantId: req.user.tenantId };
    if (obraId) where.obraId = parseInt(obraId);
    const items = await prisma.estoque.findMany({
      where,
      include: { insumo: true, obra: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(items);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/", async (req, res) => {
  try {
    const { obraId, insumoId, quantEntrada, dataMov, origem } = req.body;
    const obra = await prisma.obra.findFirst({ where: { id: parseInt(obraId), tenantId: req.user.tenantId } });
    if (!obra) return res.status(404).json({ error: "Obra não encontrada." });
    const item = await prisma.estoque.create({
      data: {
        tenantId: req.user.tenantId,
        obraId: parseInt(obraId),
        insumoId: parseInt(insumoId),
        quantEntrada: parseFloat(quantEntrada) || 0,
        quantUtilizado: 0,
        dataMov,
        origem,
      },
      include: { insumo: true },
    });
    res.status(201).json(item);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.estoque.findFirst({ where: { id, tenantId: req.user.tenantId } });
    if (!existing) return res.status(404).json({ error: "Não encontrado." });
    const { quantEntrada, dataMov, origem } = req.body;
    // quantUtilizado não é editável por aqui: é derivado dos consumos.
    const item = await prisma.estoque.update({
      where: { id },
      data: {
        quantEntrada: quantEntrada != null ? parseFloat(quantEntrada) : existing.quantEntrada,
        dataMov:      dataMov      ?? existing.dataMov,
        origem:       origem       ?? existing.origem,
      },
      include: { insumo: true },
    });
    res.json(item);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.estoque.findFirst({ where: { id, tenantId: req.user.tenantId } });
    if (!existing) return res.status(404).json({ error: "Não encontrado." });
    await prisma.estoque.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Consumo (baixa) — caminho único para gasto de material ──────────────────

router.get("/consumos", async (req, res) => {
  try {
    const { obraId } = req.query;
    const where = { tenantId: req.user.tenantId };
    if (obraId) where.obraId = parseInt(obraId);
    const items = await prisma.consumoInsumo.findMany({
      where,
      include: { insumo: { select: { nome: true, unidade: true } } },
      orderBy: [{ data: "desc" }, { id: "desc" }],
    });
    res.json(items);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/**
 * Registra a baixa de um lote.
 *
 * Grava o custo unitário vigente como snapshot e mantém
 * Estoque.quantUtilizado como saldo derivado, na mesma transação — as telas de
 * disponibilidade continuam lendo o campo sem precisar somar consumos.
 */
router.post("/consumos", async (req, res) => {
  try {
    const { estoqueId, quantidade, data, etapaId, obs } = req.body;
    const qtd = parseFloat(quantidade);
    if (!estoqueId) return res.status(400).json({ error: "Informe o lote de estoque." });
    if (!(qtd > 0))  return res.status(400).json({ error: "Quantidade deve ser maior que zero." });
    if (!data)       return res.status(400).json({ error: "Informe a data do consumo." });

    const lote = await prisma.estoque.findFirst({
      where: { id: parseInt(estoqueId), tenantId: req.user.tenantId },
      include: { insumo: true },
    });
    if (!lote) return res.status(404).json({ error: "Lote de estoque não encontrado." });

    const saldo = lote.quantEntrada - lote.quantUtilizado;
    if (qtd > saldo) {
      return res.status(400).json({
        error: `Saldo insuficiente: disponível ${saldo} ${lote.insumo.unidade}.`,
      });
    }

    // Etapa é opcional, mas precisa ser da mesma obra
    let etapaValida = null;
    if (etapaId) {
      etapaValida = await prisma.etapaObra.findFirst({
        where: { id: parseInt(etapaId), obraId: lote.obraId, tenantId: req.user.tenantId },
      });
      if (!etapaValida) return res.status(404).json({ error: "Etapa não encontrada nesta obra." });
    }

    const [consumo] = await prisma.$transaction([
      prisma.consumoInsumo.create({
        data: {
          tenantId:      req.user.tenantId,
          obraId:        lote.obraId,
          estoqueId:     lote.id,
          insumoId:      lote.insumoId,
          etapaId:       etapaValida ? etapaValida.id : null,
          quantidade:    qtd,
          custoUnitario: lote.insumo.custoUnit ?? 0,
          data,
          obs: obs || null,
        },
        include: { insumo: { select: { nome: true, unidade: true } } },
      }),
      prisma.estoque.update({
        where: { id: lote.id },
        data:  { quantUtilizado: { increment: qtd } },
      }),
    ]);

    res.status(201).json(consumo);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/consumos/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const consumo = await prisma.consumoInsumo.findFirst({ where: { id, tenantId: req.user.tenantId } });
    if (!consumo) return res.status(404).json({ error: "Não encontrado." });

    // Devolve a quantidade ao saldo do lote
    await prisma.$transaction([
      prisma.consumoInsumo.delete({ where: { id } }),
      prisma.estoque.update({
        where: { id: consumo.estoqueId },
        data:  { quantUtilizado: { decrement: consumo.quantidade } },
      }),
    ]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
