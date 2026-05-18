import { Router } from "express";
import prisma from "../db.js";

const router = Router();

/** Apenas tenant_admin pode consultar o log de auditoria. */
router.get("/", async (req, res) => {
  if (req.user.role !== "tenant_admin")
    return res.status(403).json({ error: "Sem permissão." });

  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 50);
  const skip  = (page - 1) * limit;

  const [total, items] = await Promise.all([
    prisma.auditLog.count({ where: { tenantId: req.user.tenantId } }),
    prisma.auditLog.findMany({
      where:   { tenantId: req.user.tenantId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: { tenant: { select: { razaoSocial: true } } },
    }),
  ]);

  res.json({ total, page, limit, items });
});

export default router;
