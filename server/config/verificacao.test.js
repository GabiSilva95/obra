import { test } from "node:test";
import assert from "node:assert/strict";
import { avaliarDominioDeEnvio, avaliarDominioDeRecebimento, avaliarPortalStripe, avaliarWebhookResend, avaliarWebhookStripe, modoDaChaveStripe } from "./verificacao.js";
import { EVENTOS_STRIPE } from "../pagamentos/stripe.js";

test("webhook do Stripe: precisa do endereço certo, ativo e com todos os eventos", () => {
  const app = "https://app.exemplo.com.br/";
  const url = "https://app.exemplo.com.br/api/pagamentos/webhook/stripe";
  assert.equal(avaliarWebhookStripe([], app).ok, false);
  assert.equal(avaliarWebhookStripe([{ url: "https://outro.com/x", status: "enabled", enabled_events: ["*"] }], app).ok, false);
  assert.equal(avaliarWebhookStripe([{ url, status: "disabled", enabled_events: EVENTOS_STRIPE }], app).ok, false);
  const falta = avaliarWebhookStripe([{ url, status: "enabled", enabled_events: EVENTOS_STRIPE.slice(1) }], app);
  assert.equal(falta.ok, false);
  assert.ok(falta.mensagem.includes(EVENTOS_STRIPE[0]), "diz qual evento falta");
  assert.equal(avaliarWebhookStripe([{ url, status: "enabled", enabled_events: EVENTOS_STRIPE }], app).ok, true);
  assert.equal(avaliarWebhookStripe([{ url: url + "/", status: "enabled", enabled_events: ["*"] }], app).ok, true, "barra no fim e curinga valem");
  assert.equal(EVENTOS_STRIPE.length, 8);
});

test("portal do Stripe e modo da chave", () => {
  assert.equal(avaliarPortalStripe([]).ok, false);
  assert.equal(avaliarPortalStripe([{ active: false }]).ok, false);
  assert.equal(avaliarPortalStripe([{ active: true }]).ok, true);
  assert.equal(modoDaChaveStripe("sk_test_abc"), "teste");
  assert.equal(modoDaChaveStripe("rk_live_abc"), "produção");
  assert.equal(modoDaChaveStripe("qualquer"), "desconhecido");
  assert.equal(modoDaChaveStripe(undefined), "desconhecido");
});

test("Resend: domínio de envio verificado, recebimento e webhook", () => {
  const doms = [{ name: "exemplo.com.br", status: "verified", capabilities: { sending: "enabled", receiving: "enabled" } }, { name: "novo.com.br", status: "not_started", capabilities: { sending: "enabled", receiving: "disabled" } }, { name: "so-envio.com.br", status: "verified", capabilities: { sending: "enabled", receiving: "disabled" } }];
  assert.equal(avaliarDominioDeEnvio(doms, "ConstruktPro <suporte@exemplo.com.br>").ok, true);
  assert.equal(avaliarDominioDeEnvio(doms, "suporte@EXEMPLO.com.br").ok, true);
  assert.equal(avaliarDominioDeEnvio(doms, "x@novo.com.br").ok, false, "não verificado");
  assert.equal(avaliarDominioDeEnvio(doms, "x@fora.com.br").ok, false, "não está no Resend");
  assert.equal(avaliarDominioDeEnvio(doms, "sem-email").ok, false);
  assert.equal(avaliarDominioDeRecebimento(doms, "abc123.resend.app").ok, true, "o endereço do Resend não precisa de DNS");
  assert.equal(avaliarDominioDeRecebimento(doms, "exemplo.com.br").ok, true);
  assert.equal(avaliarDominioDeRecebimento(doms, "so-envio.com.br").ok, false, "recebimento desabilitado");
  assert.equal(avaliarDominioDeRecebimento(doms, "").ok, false);
  const app = "https://app.exemplo.com.br";
  assert.equal(avaliarWebhookResend([{ endpoint: `${app}/api/email/webhook/resend`, status: "enabled", events: ["email.received"] }], app).ok, true);
  assert.equal(avaliarWebhookResend([{ endpoint: `${app}/api/email/webhook/resend`, status: "enabled", events: ["email.sent"] }], app).ok, false);
  assert.equal(avaliarWebhookResend([{ endpoint: `${app}/api/email/webhook/resend`, status: "disabled", events: ["email.received"] }], app).ok, false);
  assert.equal(avaliarWebhookResend([], app).ok, false);
});
