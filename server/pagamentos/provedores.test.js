import { test } from "node:test";
import assert from "node:assert/strict";
import { falso, manual, obterProvedor, provedorAtivo } from "./provedores.js";

const com = (env, fn) => {
  const antes = { ...process.env };
  Object.assign(process.env, env);
  for (const [k, v] of Object.entries(env)) if (v === undefined) delete process.env[k];
  try { return fn(); } finally { for (const k of ["NODE_ENV", "PAGAMENTO_GATEWAY", "PAGAMENTO_WEBHOOK_SEGREDO"]) { if (antes[k] === undefined) delete process.env[k]; else process.env[k] = antes[k]; } }
};

test("sem configuração, o provedor é o manual e ele não recebe webhook", () => {
  com({ PAGAMENTO_GATEWAY: undefined, PAGAMENTO_WEBHOOK_SEGREDO: undefined }, () => {
    assert.equal(provedorAtivo().id, "manual");
    assert.equal(manual.automatico, false);
    assert.equal(obterProvedor("falso"), null, "o gateway de mentira não existe sem segredo");
    assert.equal(obterProvedor("asaas"), null);
  });
});

test("o gateway de mentira nunca existe em produção, mesmo com segredo", () => {
  com({ NODE_ENV: "production", PAGAMENTO_WEBHOOK_SEGREDO: "x".repeat(20), PAGAMENTO_GATEWAY: "falso" }, () => {
    assert.equal(obterProvedor("falso"), null);
    assert.equal(provedorAtivo().id, "manual", "nome indisponível cai no manual");
  });
});

test("o gateway de mentira confere o segredo e interpreta o aviso", () => {
  com({ NODE_ENV: "test", PAGAMENTO_WEBHOOK_SEGREDO: "segredo-de-teste-123" }, () => {
    assert.equal(obterProvedor("falso").id, "falso");
    assert.equal(falso.verificarWebhook({ headers: { "x-falso-segredo": "segredo-de-teste-123" } }), true);
    assert.equal(falso.verificarWebhook({ headers: { "x-falso-segredo": "errado" } }), false);
    assert.equal(falso.verificarWebhook({ headers: {} }), false);
    const e = falso.interpretarWebhook({ id: "ev1", tipo: "pagamento_confirmado", cobranca: "fk_9", valor: 349, pagoEm: "2026-10-12", forma: "pix" });
    assert.deepEqual([e.eventoId, e.tipo, e.cobrancaExterna, e.valor, e.pagoEm, e.forma], ["ev1", "pagamento_confirmado", "fk_9", 349, "2026-10-12", "pix"]);
    assert.equal(falso.interpretarWebhook({ tipo: "pagamento_confirmado" }), null, "sem id do evento não há como ser idempotente");
    assert.equal(falso.interpretarWebhook({ id: "ev2", tipo: "qualquer" }).tipo, "outro");
    assert.equal(falso.interpretarWebhook(null), null);
  });
});

test("o Stripe só existe com a chave e o segredo do webhook, e nunca vira o gateway de mentira", () => {
  const chaves = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "PAGAMENTO_GATEWAY", "PAGAMENTO_WEBHOOK_SEGREDO"];
  const antes = Object.fromEntries(chaves.map(k => [k, process.env[k]]));
  try {
    for (const k of chaves) delete process.env[k];
    assert.equal(obterProvedor("stripe"), null, "sem configuração");
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    assert.equal(obterProvedor("stripe"), null, "só a chave não basta: o webhook precisa do segredo");
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_x";
    assert.equal(obterProvedor("stripe").id, "stripe");
    assert.equal(obterProvedor("stripe").automatico, true);
    assert.equal(typeof obterProvedor("stripe").criarCobranca, "undefined", "as faturas nascem no Stripe, o sistema não cria cobrança por ele");
    process.env.PAGAMENTO_GATEWAY = "stripe";
    assert.equal(provedorAtivo().id, "stripe");
    delete process.env.STRIPE_WEBHOOK_SECRET;
    assert.equal(provedorAtivo().id, "manual", "configuração incompleta cai no manual");
  } finally { for (const k of chaves) { if (antes[k] === undefined) delete process.env[k]; else process.env[k] = antes[k]; } }
});
