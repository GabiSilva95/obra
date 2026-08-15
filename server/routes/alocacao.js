import { Router } from "express";
import prisma from "../db.js";

const router = Router();

router.get("/", async (req, res) => {
  const { obraId } = req.query;
  const where = { tenantId: req.user.tenantId };
  if (obraId) where.obraId = parseInt(obraId);
  const items = await prisma.alocacao.findMany({
    where,
    include: { maquina: { include: { categoria: true } }, insumo: true },
    orderBy: { data: "desc" },
  });
  res.json(items);
});

router.post("/", async (req, res) => {
  try {
    const { obraId, tipo, referenciaId, quantidade, data, etapaId, obs } = req.body;

    // Consumo de material passou a ser lançado só pela baixa de estoque, que
    // guarda data e congela o custo. Manter os dois caminhos fazia o mesmo
    // gasto sumir do custo ou ser contado duas vezes.
    if (tipo === "insumo") {
      return res.status(400).json({
        error: "Consumo de insumo agora é lançado em Estoque › Baixa, que registra data e congela o custo.",
      });
    }

    // Valida obra
    const obra = await prisma.obra.findFirst({
      where: { id: parseInt(obraId), tenantId: req.user.tenantId },
    });
    if (!obra) return res.status(404).json({ error: "Obra não encontrada." });

    const refId = parseInt(referenciaId);

    const maquina = await prisma.maquina.findFirst({
      where: { id: refId, tenantId: req.user.tenantId },
    });
    if (!maquina) return res.status(404).json({ error: "Máquina não encontrada." });

    // Snapshot do custo/hora vigente: editar a máquina depois não altera
    // alocações passadas.
    const custoUnitario = maquina.custoHora ?? 0;

    // Etapa é opcional, mas precisa ser da mesma obra
    let etapaValida = null;
    if (etapaId) {
      etapaValida = await prisma.etapaObra.findFirst({
        where: { id: parseInt(etapaId), obraId: obra.id, tenantId: req.user.tenantId },
      });
      if (!etapaValida) return res.status(404).json({ error: "Etapa não encontrada nesta obra." });
    }

    const item = await prisma.alocacao.create({
      data: {
        tenantId:   req.user.tenantId,
        obraId:     obra.id,
        tipo:       "maquina",
        maquinaId:  refId,
        insumoId:   null,
        etapaId:    etapaValida ? etapaValida.id : null,
        quantidade: parseFloat(quantidade),
        data,
        obs:        obs || null,
        custoUnitario,
      },
      include: { maquina: { include: { categoria: true } } },
    });
    res.status(201).json(item);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const existing = await prisma.alocacao.findFirst({
    where: { id, tenantId: req.user.tenantId },
  });
  if (!existing) return res.status(404).json({ error: "Não encontrado." });
  await prisma.alocacao.delete({ where: { id } });
  res.json({ ok: true });
});

export default router;
