import prisma from "../db.js";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Middleware de auditoria — registra mutações na tabela AuditLog.
 * Só loga quando o usuário já está autenticado (req.user populado).
 * Não bloqueia a requisição em caso de falha na gravação.
 */
export function auditLogger(req, res, next) {
  if (!MUTATING.has(req.method)) return next();

  // Captura o statusCode ao finalizar a resposta
  const originalEnd = res.end.bind(res);
  res.end = function (...args) {
    // Dispara sem await para não atrasar a resposta
    if (req.user?.tenantId) {
      const ip = (req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "").toString().slice(0, 45);
      const userAgent = (req.headers["user-agent"] || "").slice(0, 200);
      prisma.auditLog
        .create({
          data: {
            tenantId:  req.user.tenantId,
            userId:    req.user.userId ?? null,
            metodo:    req.method,
            rota:      req.originalUrl.slice(0, 200),
            status:    res.statusCode,
            ip,
            userAgent,
          },
        })
        .catch(() => {}); // silencia erros de log para não afetar o fluxo
    }
    return originalEnd(...args);
  };

  next();
}
