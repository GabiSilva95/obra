import { Router } from "express";
import prisma from "../db.js";

const router = Router();

const incluir = {
  apontamentos: { include: { funcionario: { select: { nome: true, cargo: true } } } },
};

router.get("/", async (req, res) => {
  try {
    const { obraId } = req.query;
    const where = { tenantId: req.user.tenantId };
    if (obraId) where.obraId = parseInt(obraId);
    const items = await prisma.diarioObra.findMany({
      where,
      include: incluir,
      orderBy: { data: "desc" },
    });
    res.json(items);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/**
 * Gera os apontamentos de mão de obra a partir da lista de presença do diário.
 *
 * `presencas` vem como [{ funcionarioId, dias? }]. O upsert por
 * (pessoa, obra, data) garante que reenviar o mesmo dia corrija em vez de
 * duplicar o custo. Pessoas retiradas da lista têm o apontamento removido.
 */
async function sincronizarPresencas(diario, presencas, tenantId) {
  if (!Array.isArray(presencas)) return;

  const ids = presencas.map(p => parseInt(p.funcionarioId)).filter(Boolean);

  // Só aceita pessoas do próprio tenant
  const pessoas = ids.length
    ? await prisma.funcionario.findMany({ where: { id: { in: ids }, tenantId } })
    : [];
  const porId = new Map(pessoas.map(p => [p.id, p]));

  for (const p of presencas) {
    const pessoa = porId.get(parseInt(p.funcionarioId));
    if (!pessoa) continue;
    const dias = p.dias != null ? parseFloat(p.dias) : 1;
    if (!(dias > 0)) continue;

    await prisma.apontamentoMO.upsert({
      where: {
        funcionarioId_obraId_data: {
          funcionarioId: pessoa.id,
          obraId:        diario.obraId,
          data:          diario.data,
        },
      },
      create: {
        tenantId,
        obraId:        diario.obraId,
        funcionarioId: pessoa.id,
        data:          diario.data,
        dias,
        valorDia:      pessoa.salarioDia ?? 0,
        diarioId:      diario.id,
      },
      update: { dias, diarioId: diario.id },
    });
  }

  // Remove quem saiu da lista — apenas apontamentos originados deste diário,
  // para não apagar lançamentos feitos direto na tela de mão de obra.
  await prisma.apontamentoMO.deleteMany({
    where: {
      tenantId,
      diarioId: diario.id,
      funcionarioId: { notIn: pessoas.map(p => p.id) },
    },
  });
}

router.post("/", async (req, res) => {
  try {
    const { obraId, data, clima, descricao, trabalhadores, obs, presencas } = req.body;
    const obra = await prisma.obra.findFirst({ where: { id: parseInt(obraId), tenantId: req.user.tenantId } });
    if (!obra) return res.status(404).json({ error: "Obra não encontrada." });

    const item = await prisma.diarioObra.create({
      data: {
        tenantId: req.user.tenantId,
        obraId: parseInt(obraId),
        data,
        clima,
        descricao,
        // Quando há lista de presença, o total vem dela; senão, do campo livre.
        trabalhadores: Array.isArray(presencas) && presencas.length
          ? presencas.length
          : parseInt(trabalhadores) || 0,
        obs,
      },
    });

    await sincronizarPresencas(item, presencas, req.user.tenantId);

    const completo = await prisma.diarioObra.findUnique({ where: { id: item.id }, include: incluir });
    res.status(201).json(completo);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.diarioObra.findFirst({ where: { id, tenantId: req.user.tenantId } });
    if (!existing) return res.status(404).json({ error: "Não encontrado." });

    const { data, clima, descricao, trabalhadores, obs, presencas } = req.body;
    const updated = await prisma.diarioObra.update({
      where: { id },
      data: {
        data,
        clima,
        descricao,
        trabalhadores: Array.isArray(presencas) && presencas.length
          ? presencas.length
          : parseInt(trabalhadores) || 0,
        obs,
      },
    });

    await sincronizarPresencas(updated, presencas, req.user.tenantId);

    const completo = await prisma.diarioObra.findUnique({ where: { id }, include: incluir });
    res.json(completo);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.diarioObra.findFirst({ where: { id, tenantId: req.user.tenantId } });
    if (!existing) return res.status(404).json({ error: "Não encontrado." });
    await prisma.diarioObra.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
