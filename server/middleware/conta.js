import prisma from "../db.js";
import { caminhoLiberadoComContaBloqueada, contaBloqueada, leituraRecusa, statusEfetivo } from "../config/conta.js";
import { hojeBR } from "../utils/datas.js";

// Duas travas da conta do cliente, depois do authMiddleware:
//  - modoLeitura: a equipe que "entra como o cliente" só consegue ler (token com `leitura: true`);
//  - contaAtiva: conta em teste vencido, suspensa ou cancelada só alcança a assinatura, o suporte e a autenticação.

export function modoLeitura(req, res, next) {
  if (leituraRecusa(req.user, req.method)) {
    return res.status(403).json({ error: "Você está vendo esta conta só para leitura. Nada pode ser alterado por aqui.", codigo: "MODO_LEITURA" });
  }
  next();
}

// ─── Cache curto da situação da empresa (uma consulta por minuto, no máximo, por empresa e por instância) ─────

const TTL_MS = 60_000;
const cache = new Map(); // tenantId -> { dados, ate }

/** Esquece a empresa guardada (a equipe acabou de mudar o status ou o plano). Vale só para esta instância; as outras renovam em até 1 minuto. */
export const invalidarConta = tenantId => { cache.delete(tenantId); };

async function lerConta(tenantId, agora = Date.now()) {
  const guardado = cache.get(tenantId);
  if (guardado && guardado.ate > agora) return guardado.dados;
  const dados = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { status: true, trialAte: true, email: true } });
  if (cache.size > 2000) cache.clear();
  cache.set(tenantId, { dados, ate: agora + TTL_MS });
  return dados;
}

const MENSAGENS = {
  trial_expirado: "O seu período de teste terminou. Escolha um plano ou fale com o suporte para continuar usando.",
  suspenso: "A sua conta está suspensa. Fale com o suporte para regularizar.",
  cancelado: "A sua conta foi cancelada. Fale com o suporte se quiser reativá-la.",
};

export async function contaAtiva(req, res, next) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Sem tenant" });
    // A equipe em modo leitura enxerga o que o cliente tem mesmo com a conta bloqueada: só lê, e é para isso que entra
    if (req.user.leitura) return next();
    const conta = await lerConta(tenantId);
    if (!conta) return res.status(401).json({ error: "Conta não encontrada." });
    const hoje = hojeBR();
    if (contaBloqueada(conta, hoje) && !caminhoLiberadoComContaBloqueada(req.path.replace(/^\/api/, ""))) {
      const situacao = statusEfetivo(conta, hoje);
      return res.status(402).json({ error: MENSAGENS[situacao] || "O acesso à conta está bloqueado.", codigo: "CONTA_BLOQUEADA", situacao });
    }
    next();
  } catch (e) { next(e); }
}
