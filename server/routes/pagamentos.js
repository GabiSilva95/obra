import { Router } from "express";
import { receberWebhook } from "../pagamentos/webhook.js";

/**
 * Avisos de gateways de pagamento (`/api/pagamentos/webhook/:gateway`). Rota PÚBLICA, montada antes da autenticação:
 * a autenticidade vem do próprio provedor (token ou assinatura), conferida em `receberWebhook`.
 */
const router = Router();

router.post("/webhook/:gateway", async (req, res) => {
  try {
    const { http, corpo } = await receberWebhook(String(req.params.gateway).slice(0, 30), req);
    res.status(http).json(corpo);
  } catch (e) {
    console.error("[pagamentos] webhook:", e);
    res.status(500).json({ error: "Falha ao processar." });
  }
});

export default router;
