import { Router } from "express";
import prisma from "../../db.js";
import { rota } from "../rota.js";

const router = Router();
const dataValida = s => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

/** Auditoria da equipe: quem fez o quê, em qual empresa, quando. Filtros por pessoa, ação, empresa e período. */
router.get("/", rota(async (req, res) => {
  const q = req.query;
  const pagina = Math.max(1, parseInt(q.pagina) || 1);
  const limite = Math.min(100, Math.max(1, parseInt(q.limite) || 50));
  const where = {};
  if (parseInt(q.equipeId)) where.equipeId = parseInt(q.equipeId);
  if (q.acao) where.acao = String(q.acao).slice(0, 60);
  if (q.tenantId) where.tenantId = String(q.tenantId).slice(0, 40);
  if (dataValida(q.de) || dataValida(q.ate)) where.createdAt = { ...(dataValida(q.de) ? { gte: new Date(`${q.de}T00:00:00-03:00`) } : {}), ...(dataValida(q.ate) ? { lte: new Date(`${q.ate}T23:59:59.999-03:00`) } : {}) };
  const [total, itens] = await Promise.all([
    prisma.auditoriaEquipe.count({ where }),
    prisma.auditoriaEquipe.findMany({ where, orderBy: { id: "desc" }, skip: (pagina - 1) * limite, take: limite, include: { equipe: { select: { nome: true, email: true } } } }),
  ]);
  // O nome da empresa de cada linha (a auditoria guarda só o id: a empresa pode ter sido apagada, e então fica sem nome)
  const ids = [...new Set(itens.map(i => i.tenantId).filter(Boolean))];
  const empresas = ids.length ? await prisma.tenant.findMany({ where: { id: { in: ids } }, select: { id: true, razaoSocial: true } }) : [];
  const nome = new Map(empresas.map(e => [e.id, e.razaoSocial]));
  res.json({ total, pagina, limite, itens: itens.map(i => ({ ...i, empresa: i.tenantId ? { id: i.tenantId, nome: nome.get(i.tenantId) ?? null } : null })) });
}));

export default router;
