import { ErroNegocio } from "../financeiro/erro.js";

export { ErroNegocio };

/** Envolve um handler async do painel: ErroNegocio responde com o status dele; o resto vira 500 sem vazar detalhe. */
export const rota = fn => async (req, res) => {
  try { await fn(req, res); }
  catch (e) {
    if (e instanceof ErroNegocio) return res.status(e.status).json({ error: e.message });
    console.error(`[painel] ${req.method} ${req.originalUrl}:`, e);
    res.status(500).json({ error: "Erro interno." });
  }
};
