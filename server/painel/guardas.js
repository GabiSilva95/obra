import { temPermissao } from "../config/painel.js";

// Guardas sem banco de dados (por isso têm teste puro em painel.test.js)

/** Com PAINEL_HOST definido (produção), as rotas do painel só respondem nesse endereço. */
export function somenteHostDoPainel(req, res, next) {
  const esperado = process.env.PAINEL_HOST;
  if (esperado && req.hostname !== esperado) return res.status(404).json({ error: "Não encontrado." });
  next();
}

/** Exige uma das permissões (o administrador da equipe passa sempre). */
export const exigirPermissao = (...perms) => (req, res, next) =>
  perms.some(p => temPermissao(req.equipe, p)) ? next() : res.status(403).json({ error: "Sem permissão para esta área." });
