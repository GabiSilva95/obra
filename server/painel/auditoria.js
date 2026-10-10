import prisma from "../db.js";

const ip = req => (req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "").toString().split(",")[0].trim().slice(0, 45) || null;

/** Registra uma ação da equipe. Nunca derruba a requisição: se a gravação falhar, só avisa no log. */
export async function registrarAuditoria(req, { acao, alvoTipo, alvoId, tenantId, ticketId, detalhe, equipeId }) {
  try {
    await prisma.auditoriaEquipe.create({
      data: {
        equipeId: equipeId ?? req.equipe?.id ?? null, acao, alvoTipo: alvoTipo ?? null, alvoId: alvoId != null ? String(alvoId) : null,
        tenantId: tenantId ?? null, ticketId: ticketId ?? null, detalhe: detalhe ? String(detalhe).slice(0, 500) : null, ip: ip(req),
      },
    });
  } catch (e) { console.error("[painel/auditoria] falha ao registrar:", acao, e.message); }
}
