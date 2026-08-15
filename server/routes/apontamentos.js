import { Router } from "express";
import prisma from "../db.js";

const router = Router();

/**
 * Apontamento de mão de obra: presença de uma pessoa em uma obra, num dia.
 *
 * Substitui o vínculo com total de dias acumulado, que não tinha data nem
 * como ser corrigido. O valor/dia é congelado no lançamento, então reajustar
 * a pessoa depois não reescreve o custo já apropriado.
 */

const incluir = {
  funcionario: { select: { nome: true, cargo: true } },
};

router.get("/", async (req, res) => {
  try {
    const { obraId, de, ate } = req.query;
    const where = { tenantId: req.user.tenantId };
    if (obraId) where.obraId = parseInt(obraId);
    if (de || ate) {
      where.data = {};
      if (de)  where.data.gte = de;
      if (ate) where.data.lte = ate;
    }
    const items = await prisma.apontamentoMO.findMany({
      where,
      include: incluir,
      orderBy: [{ data: "desc" }, { id: "desc" }],
    });
    res.json(items);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/**
 * Cria (ou atualiza) o apontamento de uma pessoa num dia.
 *
 * A chave única (funcionário, obra, data) faz o upsert: relançar o mesmo dia
 * corrige o registro em vez de somar um segundo custo.
 */
router.post("/", async (req, res) => {
  try {
    const { obraId, funcionarioId, data, dias, etapaId, obs, diarioId } = req.body;
    if (!obraId || !funcionarioId || !data) {
      return res.status(400).json({ error: "Obra, pessoa e data são obrigatórios." });
    }

    const [obra, funcionario] = await Promise.all([
      prisma.obra.findFirst({ where: { id: parseInt(obraId), tenantId: req.user.tenantId } }),
      prisma.funcionario.findFirst({ where: { id: parseInt(funcionarioId), tenantId: req.user.tenantId } }),
    ]);
    if (!obra)        return res.status(404).json({ error: "Obra não encontrada." });
    if (!funcionario) return res.status(404).json({ error: "Pessoa não encontrada." });

    let etapaValida = null;
    if (etapaId) {
      etapaValida = await prisma.etapaObra.findFirst({
        where: { id: parseInt(etapaId), obraId: obra.id, tenantId: req.user.tenantId },
      });
      if (!etapaValida) return res.status(404).json({ error: "Etapa não encontrada nesta obra." });
    }

    const fracao = dias != null ? parseFloat(dias) : 1;
    if (!(fracao > 0)) return res.status(400).json({ error: "Dias deve ser maior que zero." });

    const item = await prisma.apontamentoMO.upsert({
      where: {
        funcionarioId_obraId_data: { funcionarioId: funcionario.id, obraId: obra.id, data },
      },
      create: {
        tenantId:      req.user.tenantId,
        obraId:        obra.id,
        funcionarioId: funcionario.id,
        etapaId:       etapaValida ? etapaValida.id : null,
        data,
        dias:          fracao,
        valorDia:      funcionario.salarioDia ?? 0,
        diarioId:      diarioId ? parseInt(diarioId) : null,
        obs:           obs || null,
      },
      update: {
        dias: fracao,
        // Só mexe na etapa se ela veio no corpo — relançar o dia sem informar
        // etapa não deve desfazer a apropriação já feita.
        ...(etapaId !== undefined ? { etapaId: etapaValida ? etapaValida.id : null } : {}),
        ...(obs     !== undefined ? { obs: obs || null } : {}),
      },
      include: incluir,
    });

    res.status(201).json(item);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.apontamentoMO.findFirst({ where: { id, tenantId: req.user.tenantId } });
    if (!existing) return res.status(404).json({ error: "Não encontrado." });

    const { dias, etapaId, obs, valorDia } = req.body;
    const item = await prisma.apontamentoMO.update({
      where: { id },
      data: {
        dias:     dias     != null ? parseFloat(dias)     : existing.dias,
        valorDia: valorDia != null ? parseFloat(valorDia) : existing.valorDia,
        etapaId:  etapaId  !== undefined ? (etapaId ? parseInt(etapaId) : null) : existing.etapaId,
        obs:      obs      !== undefined ? (obs || null) : existing.obs,
      },
      include: incluir,
    });
    res.json(item);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.apontamentoMO.findFirst({ where: { id, tenantId: req.user.tenantId } });
    if (!existing) return res.status(404).json({ error: "Não encontrado." });
    await prisma.apontamentoMO.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
