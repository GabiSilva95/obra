import prisma from "../db.js";

/**
 * Exige a permissão de tela `perm` (administrador sempre passa).
 *
 * A permissão é lida do banco a cada chamada, e não do token: o token vive 15 minutos e
 * guarda só o papel, então uma permissão retirada pelo administrador valeria até o token expirar.
 *
 * `soEscrita: true` deixa as leituras (GET) abertas a qualquer usuário autenticado. É o caso de
 * /receitas e /despesas, cujos valores alimentam o custo exibido no painel, nas obras e nos relatórios.
 */
export function requirePermissao(perm, { soEscrita = false } = {}) {
  return async (req, res, next) => {
    try {
      if (soEscrita && req.method === "GET") return next();
      if (req.user?.role === "tenant_admin") return next();
      const u = await prisma.user.findFirst({
        where: { id: req.user.userId, tenantId: req.user.tenantId, ativo: true },
        select: { permissoes: true },
      });
      if (!u?.permissoes?.includes(perm)) return res.status(403).json({ error: "Sem permissão para esta área." });
      next();
    } catch (e) { next(e); }
  };
}
