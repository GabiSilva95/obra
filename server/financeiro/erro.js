/** Erro de regra de negócio: vira resposta HTTP com a mensagem para o usuário. */
export class ErroNegocio extends Error {
  constructor(mensagem, status = 400) { super(mensagem); this.status = status; }
}

/** Envolve um handler async: ErroNegocio responde com o status dele, o resto vira 500. */
export const rota = fn => async (req, res) => {
  try { await fn(req, res); }
  catch (e) {
    if (e instanceof ErroNegocio) return res.status(e.status).json({ error: e.message });
    console.error(`[financeiro] ${req.method} ${req.originalUrl}:`, e);
    res.status(500).json({ error: e.message || "Erro interno." });
  }
};

export const dataValida = s => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T12:00:00Z`));
