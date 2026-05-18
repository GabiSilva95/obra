import { Router } from "express";
import prisma from "../db.js";
import { getLimites } from "../config/planos.js";

const router = Router();

/** Retorna o plano atual, limites e uso corrente do tenant. */
router.get("/uso", async (req, res) => {
  const { tenantId } = req.user;

  const [tenant, obras, funcionarios, usuarios, maquinas, insumos] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { plano: true, razaoSocial: true } }),
    prisma.obra.count({ where: { tenantId } }),
    prisma.funcionario.count({ where: { tenantId } }),
    prisma.user.count({ where: { tenantId } }),
    prisma.maquina.count({ where: { tenantId } }),
    prisma.insumo.count({ where: { tenantId } }),
  ]);

  const limites = getLimites(tenant.plano);

  res.json({
    plano: tenant.plano,
    razaoSocial: tenant.razaoSocial,
    limites: {
      obras:        isFinite(limites.obras)        ? limites.obras        : null,
      funcionarios: isFinite(limites.funcionarios) ? limites.funcionarios : null,
      usuarios:     isFinite(limites.usuarios)     ? limites.usuarios     : null,
      maquinas:     isFinite(limites.maquinas)     ? limites.maquinas     : null,
      insumos:      isFinite(limites.insumos)      ? limites.insumos      : null,
    },
    uso: { obras, funcionarios, usuarios, maquinas, insumos },
  });
});

export default router;
