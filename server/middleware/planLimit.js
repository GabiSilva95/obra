import prisma from "../db.js";
import { getLimites, RECURSOS_LIMITADOS } from "../config/planos.js";

/**
 * Modelos Prisma e campo de contagem para cada recurso controlado.
 * A contagem é feita por tenantId.
 *
 * Apenas obras e usuários têm limite — ver server/config/planos.js.
 */
const RECURSOS = {
  obras:    { model: "obra", field: "tenantId" },
  usuarios: { model: "user", field: "tenantId" },
};

/**
 * Middleware factory — verifica se o tenant ainda tem cota para criar
 * o recurso indicado antes de passar a requisição para o handler.
 *
 * Uso: router.post("/", checkPlanLimit("obras"), async (req, res) => { ... })
 */
export function checkPlanLimit(recurso) {
  // Recurso sem limite: middleware vira passagem direta, sem consultar o banco
  if (!RECURSOS_LIMITADOS.includes(recurso) || !RECURSOS[recurso]) {
    return (_req, _res, next) => next();
  }

  return async (req, res, next) => {
    try {
      const { tenantId } = req.user;

      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { plano: true } });
      if (!tenant) return res.status(404).json({ error: "Tenant não encontrado." });

      const limite = getLimites(tenant.plano)[recurso];
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
    } catch (e) {
      next(e);
    }
  };
}
