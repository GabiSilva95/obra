import prisma from "../db.js";
import { getLimites } from "../config/planos.js";

/**
 * Modelos Prisma e campo de contagem para cada recurso controlado.
 * A contagem é feita por tenantId.
 */
const RECURSOS = {
  obras:        { model: "obra",        field: "tenantId" },
  funcionarios: { model: "funcionario", field: "tenantId" },
  usuarios:     { model: "user",        field: "tenantId" },
  maquinas:     { model: "maquina",     field: "tenantId" },
  insumos:      { model: "insumo",      field: "tenantId" },
};

/**
 * Middleware factory — verifica se o tenant ainda tem cota para criar
 * o recurso indicado antes de passar a requisição para o handler.
 *
 * Uso: router.post("/", checkPlanLimit("obras"), async (req, res) => { ... })
 */
export function checkPlanLimit(recurso) {
  return async (req, res, next) => {
    const { tenantId } = req.user;

    // Busca plano atual do tenant
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { plano: true } });
    if (!tenant) return res.status(404).json({ error: "Tenant não encontrado." });

    const limites = getLimites(tenant.plano);
    const limite = limites[recurso];

    // Plano sem limite para este recurso
    if (!isFinite(limite)) return next();

    const { model, field } = RECURSOS[recurso];
    const atual = await prisma[model].count({ where: { [field]: tenantId } });

    if (atual >= limite) {
      return res.status(403).json({
        error: `Limite do plano ${tenant.plano} atingido.`,
        recurso,
        limite,
        atual,
        upgrade: true,
      });
    }

    next();
  };
}
