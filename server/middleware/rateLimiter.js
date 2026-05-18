import rateLimit from "express-rate-limit";

/** Limita tentativas de login/registro: 10 req / 15 min por IP */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas tentativas. Aguarde 15 minutos e tente novamente." },
  skipSuccessfulRequests: true, // não penaliza logins bem-sucedidos
});

/** Limiter geral para todas as rotas da API: 200 req / min por IP */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas requisições. Tente novamente em instantes." },
});
