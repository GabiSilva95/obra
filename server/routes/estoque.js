import { Router } from "express";
import { extrairDadosNfe } from "../utils/nfe.js";
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
    const { obraId, insumoId, quantEntrada, dataMov, origem, custoUnit } = req.body;
    const obra = await prisma.obra.findFirst({ where: { id: parseInt(obraId), tenantId: req.user.tenantId } });
    if (!obra) return res.status(404).json({ error: "Obra não encontrada." });
    const item = await prisma.estoque.create({
      data: {
        tenantId: req.user.tenantId,
        obraId: parseInt(obraId),
        insumoId: parseInt(insumoId),
        quantEntrada: parseFloat(quantEntrada) || 0,
        quantUtilizado: 0,
        custoUnit: parseFloat(custoUnit) || 0,
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

// ─── Importação de NF-e XML ───────────────────────────────────────────────────

router.post("/importar-nf", async (req, res) => {
  try {
    const { xml } = req.body;
    if (!xml || typeof xml !== "string") {
      return res.status(400).json({ error: "Envie o campo 'xml' com o conteúdo da nota fiscal." });
    }
    const dados = extrairDadosNfe(xml);
    if (!dados.itens.length) {
      return res.status(422).json({ error: "Nenhum item encontrado no XML. Verifique se é uma NF-e válida." });
    }
    res.json(dados);
  } catch (err) {
    console.error("[importar-nf]", err.message);
    res.status(422).json({ error: err.message || "Erro ao processar o XML." });
  }
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
          custoUnitario: lote.custoUnit || lote.insumo.custoUnit || 0,
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

// ─── Transferência entre obras ───────────────────────────────────────────────

router.get("/transferencias", async (req, res) => {
  try {
    const { obraId } = req.query;
    const where = { tenantId: req.user.tenantId };
    if (obraId) {
      const id = parseInt(obraId);
      where.OR = [{ deObraId: id }, { paraObraId: id }];
    }
    const items = await prisma.transferencia.findMany({
      where,
      include: {
        deObra:   { select: { nome: true } },
        paraObra: { select: { nome: true } },
        insumo:   { select: { nome: true, unidade: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(items);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/transferencias", async (req, res) => {
  try {
    const { deObraId, paraObraId, insumoId, quantidade, data, obs } = req.body;
    const qtd = parseFloat(quantidade);
    const tenantId = req.user.tenantId;

    if (!deObraId || !paraObraId || !insumoId)
      return res.status(400).json({ error: "Informe obra origem, destino e insumo." });
    if (parseInt(deObraId) === parseInt(paraObraId))
      return res.status(400).json({ error: "Obra de origem e destino devem ser diferentes." });
    if (!(qtd > 0))
      return res.status(400).json({ error: "Quantidade deve ser maior que zero." });

    const [deObra, paraObra] = await Promise.all([
      prisma.obra.findFirst({ where: { id: parseInt(deObraId),   tenantId } }),
      prisma.obra.findFirst({ where: { id: parseInt(paraObraId), tenantId } }),
    ]);
    if (!deObra)   return res.status(404).json({ error: "Obra de origem não encontrada."  });
    if (!paraObra) return res.status(404).json({ error: "Obra de destino não encontrada." });

    const lotes = await prisma.estoque.findMany({
      where: { tenantId, obraId: parseInt(deObraId), insumoId: parseInt(insumoId) },
      orderBy: { id: "asc" },
    });

    const saldoTotal = lotes.reduce((s, l) => s + (l.quantEntrada - l.quantUtilizado), 0);
    if (saldoTotal < qtd) {
      const insumo = await prisma.insumo.findUnique({ where: { id: parseInt(insumoId) } });
      return res.status(400).json({
        error: `Saldo insuficiente: disponível ${saldoTotal} ${insumo?.unidade ?? ""}.`,
      });
    }

    const result = await prisma.$transaction(async tx => {
      const transf = await tx.transferencia.create({
        data: { tenantId, deObraId: parseInt(deObraId), paraObraId: parseInt(paraObraId),
          insumoId: parseInt(insumoId), quantidade: qtd, data, obs: obs || null },
      });

      // Debita lotes FIFO
      let restante = qtd;
      for (const lote of lotes) {
        if (restante <= 0) break;
        const saldo = lote.quantEntrada - lote.quantUtilizado;
        if (saldo <= 0) continue;
        const debitar = Math.min(saldo, restante);
        await tx.estoque.update({ where: { id: lote.id }, data: { quantUtilizado: { increment: debitar } } });
        restante -= debitar;
      }

      const entrada = await tx.estoque.create({
        data: { tenantId, obraId: parseInt(paraObraId), insumoId: parseInt(insumoId),
          quantEntrada: qtd, quantUtilizado: 0, dataMov: data, origem: `Transferência #${transf.id}` },
        include: { insumo: true },
      });

      return { transf, entrada };
    });

    res.status(201).json(result);
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
