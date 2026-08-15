import { Router } from "express";
import prisma from "../db.js";
import { getLimites } from "../config/planos.js";

const router = Router();

/**
 * Plano atual, limites e uso corrente do tenant.
 *
 * Só obras e usuários são controlados; máquinas, insumos e funcionários são
 * ilimitados em todos os planos e por isso não aparecem aqui.
 */
router.get("/uso", async (req, res) => {
  try {
    const { tenantId } = req.user;

    const [tenant, obras, usuarios] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenantId }, select: { plano: true, razaoSocial: true } }),
      prisma.obra.count({ where: { tenantId } }),
      prisma.user.count({ where: { tenantId } }),
    ]);
    if (!tenant) return res.status(404).json({ error: "Tenant não encontrado." });

    const limites = getLimites(tenant.plano);

    res.json({
      plano: tenant.plano,
      razaoSocial: tenant.razaoSocial,
      // null = ilimitado
      limites: {
        obras:    isFinite(limites.obras)    ? limites.obras    : null,
        usuarios: isFinite(limites.usuarios) ? limites.usuarios : null,
      },
      uso: { obras, usuarios },
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
