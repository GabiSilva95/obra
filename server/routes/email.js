import { Router } from "express";
import { receberAvisoDoResend } from "../email/entrada.js";

/**
 * Avisos do provedor de e-mail (`/api/email/webhook/resend`). Rota PÚBLICA, montada antes da autenticação:
 * a autenticidade vem da assinatura do Resend, conferida sobre o corpo exato (`req.rawBody`) em `receberAvisoDoResend`.
 */
const router = Router();

router.post("/webhook/resend", async (req, res) => {
  try {
    if (!req.rawBody) return res.status(400).json({ error: "Aviso inválido." });
    const { http, corpo } = await receberAvisoDoResend({ corpoBruto: req.rawBody, headers: req.headers });
    res.status(http).json(corpo);
  } catch (e) {
    console.error("[email] webhook:", e);
    res.status(500).json({ error: "Falha ao processar." });
  }
});

export default router;
