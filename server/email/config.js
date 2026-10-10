import { createHmac } from "node:crypto";

/**
 * Configuração do e-mail, lida do ambiente a cada uso (nada fica guardado em memória).
 *   EMAIL_PROVIDER           "resend" liga o envio e o recebimento; qualquer outro valor (ou nenhum) = e-mail desligado
 *   RESEND_API_KEY           chave da API do Resend
 *   EMAIL_REMETENTE          "ConstruktPro Suporte <suporte@seu-dominio>" (domínio verificado no Resend)
 *   EMAIL_RECEBIMENTO_DOMINIO domínio que recebe as respostas (o do Resend: <id>.resend.app, ou um seu com MX). Sem ele, os e-mails
 *                            saem sem "responder por e-mail" e pedem para responder no sistema
 *   RESEND_WEBHOOK_SECRET    segredo (whsec_...) do webhook do Resend, para conferir os avisos de e-mail recebido
 *   EMAIL_SEGREDO            (opcional) chave dos endereços de resposta; sem ela, deriva do JWT_SECRET
 *   APP_URL                  endereço do sistema (para o link do chamado nos e-mails)
 */
export function configEmail(env = process.env) {
  const ligado = env.EMAIL_PROVIDER === "resend" && !!env.RESEND_API_KEY && !!env.EMAIL_REMETENTE;
  return {
    ligado,
    remetente: env.EMAIL_REMETENTE || "",
    chaveApi: env.RESEND_API_KEY || "",
    dominioRecebimento: (env.EMAIL_RECEBIMENTO_DOMINIO || "").trim().toLowerCase(),
    segredoWebhook: env.RESEND_WEBHOOK_SECRET || "",
    appUrl: (env.APP_URL || env.FRONTEND_URL || "").replace(/\/+$/, ""),
    // Só pode receber respostas quem tem o provedor ligado, o domínio de recebimento e o segredo do webhook
    recebe: ligado && !!env.EMAIL_RECEBIMENTO_DOMINIO && !!env.RESEND_WEBHOOK_SECRET,
    segredoEnderecos: env.EMAIL_SEGREDO || createHmac("sha256", env.JWT_SECRET || "sem-segredo").update("email-chamado").digest("hex"),
    apiBase: (env.NODE_ENV !== "production" && env.RESEND_API_BASE) || "https://api.resend.com",
  };
}
