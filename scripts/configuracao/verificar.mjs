// Confere a configuração do e-mail (Resend) e do pagamento (Stripe) contra as contas de verdade. Só leitura por padrão; nunca imprime chave.
//
//   npm run config:verificar                        confere variáveis e consulta o Resend e o Stripe (leituras)
//   npm run config:verificar -- --enviar voce@x.com envia um e-mail de teste pelo Resend (um e-mail, para esse endereço)
//   npm run config:verificar -- --checkout          só com chave de TESTE do Stripe: cria um cliente e uma sessão de Checkout de teste e mostra o endereço
//
// Variáveis lidas do .env (ver .env.example). Sai com erro (código 1) se algo obrigatório estiver errado.
import { avaliarDominioDeEnvio, avaliarDominioDeRecebimento, avaliarPortalStripe, avaliarWebhookResend, avaliarWebhookStripe, modoDaChaveStripe } from "../../server/config/verificacao.js";
import { configEmail } from "../../server/email/config.js";
import { configStripe } from "../../server/pagamentos/stripe.js";
import { enderecoDoChamado } from "../../server/email/enderecos.js";

const args = process.argv.slice(2);
const flag = nome => args.includes(`--${nome}`);
const valor = nome => { const i = args.indexOf(`--${nome}`); return i > -1 ? args[i + 1] : undefined; };
const env = process.env;
let erros = 0, avisos = 0;
const ok = m => console.log(`  ✔ ${m}`);
const aviso = m => { avisos++; console.log(`  ⚠ ${m}`); };
const erro = m => { erros++; console.log(`  ✖ ${m}`); };
const secao = t => console.log(`\n${t}`);
const confere = (cond, msgOk, msgNao, nivel = erro) => (cond ? ok(msgOk) : nivel(msgNao));
const veredito = r => (r.ok ? ok(r.mensagem) : erro(r.mensagem));

async function pedir(url, opcoes = {}) {
  try {
    const r = await fetch(url, { ...opcoes, signal: AbortSignal.timeout(15000) });
    let corpo = {};
    try { corpo = await r.json(); } catch { /* resposta sem JSON */ }
    return { status: r.status, corpo, tipo: r.headers.get("content-type") ?? "" };
  } catch (e) { return { status: 0, corpo: {}, erroRede: e.message }; }
}

const appUrl = (env.APP_URL || env.FRONTEND_URL || "").replace(/\/+$/, "");
secao("Geral");
if (!appUrl) aviso("APP_URL não está definido: os e-mails saem sem o link do chamado e o pagamento não consegue voltar para o sistema.");
else if (!/^https:\/\//.test(appUrl)) aviso(`APP_URL (${appUrl}) não é https: o Stripe e o Resend em produção exigem https.`);
else ok(`APP_URL: ${appUrl}`);

// ─── Resend ───────────────────────────────────────────────────────────────────
secao("E-mail do chamado (Resend)");
const cfgEmail = configEmail();
const RESEND = cfgEmail.apiBase;
const STRIPE = configStripe().base;
if (env.EMAIL_PROVIDER !== "resend" && !env.RESEND_API_KEY) console.log("  (desligado: EMAIL_PROVIDER não é resend e não há RESEND_API_KEY)");
else {
  confere(env.EMAIL_PROVIDER === "resend", "EMAIL_PROVIDER=resend", 'EMAIL_PROVIDER não é "resend": o e-mail está DESLIGADO neste ambiente.', aviso);
  for (const [nome, v] of [["RESEND_API_KEY", env.RESEND_API_KEY], ["EMAIL_REMETENTE", env.EMAIL_REMETENTE], ["EMAIL_RECEBIMENTO_DOMINIO", env.EMAIL_RECEBIMENTO_DOMINIO], ["RESEND_WEBHOOK_SECRET", env.RESEND_WEBHOOK_SECRET]]) confere(!!v, `${nome} definido`, `${nome} não definido`);
  if (env.RESEND_WEBHOOK_SECRET && !/^whsec_/.test(env.RESEND_WEBHOOK_SECRET)) erro("RESEND_WEBHOOK_SECRET deveria começar com whsec_ (é o segredo do webhook, não a chave da API).");
  if (env.RESEND_API_KEY && !/^re_/.test(env.RESEND_API_KEY)) erro("RESEND_API_KEY deveria começar com re_.");
  if (env.RESEND_API_KEY) {
    const h = { Authorization: `Bearer ${env.RESEND_API_KEY}` };
    const dom = await pedir(`${RESEND}/domains`, { headers: h });
    if (dom.status === 401 || dom.status === 403) erro(`O Resend recusou a chave (${dom.status}): ${dom.corpo.message ?? "chave inválida ou sem permissão"}.`);
    else if (dom.status !== 200) erro(`Não consegui consultar os domínios do Resend (${dom.status || dom.erroRede}).`);
    else {
      if (env.EMAIL_REMETENTE) veredito(avaliarDominioDeEnvio(dom.corpo.data, env.EMAIL_REMETENTE));
      if (env.EMAIL_RECEBIMENTO_DOMINIO) veredito(avaliarDominioDeRecebimento(dom.corpo.data, env.EMAIL_RECEBIMENTO_DOMINIO));
      const wh = await pedir(`${RESEND}/webhooks`, { headers: h });
      if (!appUrl) aviso("Sem APP_URL, não dá para conferir o webhook do Resend.");
      else if (wh.status !== 200) aviso(`Não consegui listar os webhooks do Resend (${wh.status}): ${wh.corpo.message ?? ""}. Confira no painel se o webhook email.received aponta para ${appUrl}/api/email/webhook/resend.`);
      else veredito(avaliarWebhookResend(wh.corpo.data, appUrl));
    }
  }
  if (flag("enviar")) {
    const para = valor("enviar");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(para ?? "")) erro("Informe o destinatário: --enviar voce@dominio.com");
    else if (!cfgEmail.ligado) erro("O e-mail não está ligado neste ambiente (precisa de EMAIL_PROVIDER=resend, chave e remetente): nada enviado.");
    else {
      const r = await pedir(`${RESEND}/emails`, {
        method: "POST", headers: { Authorization: `Bearer ${cfgEmail.chaveApi}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: cfgEmail.remetente, to: [para], subject: "[Chamado #0] Teste de configuração do ConstruktPro",
          text: "Este é um e-mail de teste do ConstruktPro.\n\nSe ele chegou, o envio está funcionando. Responda este e-mail: o endereço de resposta é o de um chamado de teste (o aviso chega ao sistema, mas é ignorado porque o chamado #0 não existe).\n\n- - -\nTeste de configuração.",
          ...(cfgEmail.recebe ? { reply_to: [enderecoDoChamado(0, cfgEmail.dominioRecebimento, cfgEmail.segredoEnderecos)] } : {}),
        }),
      });
      confere(r.status === 200, `E-mail de teste enviado para ${para} (id ${r.corpo.id}). Confira a caixa de entrada e o spam.`, `O Resend recusou o envio (${r.status}): ${r.corpo.message ?? "erro"}.`);
    }
  }
}

// ─── Stripe ───────────────────────────────────────────────────────────────────
secao("Pagamento no cartão (Stripe)");
if (env.PAGAMENTO_GATEWAY !== "stripe" && !env.STRIPE_SECRET_KEY) console.log("  (desligado: PAGAMENTO_GATEWAY não é stripe e não há STRIPE_SECRET_KEY)");
else {
  confere(env.PAGAMENTO_GATEWAY === "stripe", "PAGAMENTO_GATEWAY=stripe", 'PAGAMENTO_GATEWAY não é "stripe": o pagamento online está DESLIGADO neste ambiente (a equipe registra à mão).', aviso);
  const chave = env.STRIPE_SECRET_KEY;
  confere(!!chave, `STRIPE_SECRET_KEY definida (modo ${chave ? modoDaChaveStripe(chave) : ""})`, "STRIPE_SECRET_KEY não definida");
  confere(!!env.STRIPE_WEBHOOK_SECRET, "STRIPE_WEBHOOK_SECRET definido", "STRIPE_WEBHOOK_SECRET não definido");
  if (env.STRIPE_WEBHOOK_SECRET && !/^whsec_/.test(env.STRIPE_WEBHOOK_SECRET)) erro("STRIPE_WEBHOOK_SECRET deveria começar com whsec_ (o segredo do endpoint, não a chave da API).");
  if (chave && /^pk_/.test(chave)) erro("Esta é uma chave PUBLICÁVEL (pk_): o servidor precisa da chave SECRETA (sk_ ou rk_).");
  else if (chave) {
    const h = { Authorization: `Bearer ${chave}` };
    const conta = await pedir(`${STRIPE}/v1/account`, { headers: h });
    if (conta.status === 401) erro("O Stripe recusou a chave (401): ela está errada, revogada ou é de outra conta.");
    else if (conta.status === 403 || conta.status === 0 || (conta.status !== 200 && conta.corpo.error?.code === "secret_key_required")) aviso(`Não consegui ler os dados da conta (${conta.status || conta.erroRede}); sigo com o resto.`);
    else if (conta.status === 200) {
      confere(conta.corpo.country === "BR", "Conta do Stripe no Brasil.", `A conta do Stripe é de ${conta.corpo.country ?? "país desconhecido"}, não do Brasil: a cobrança em reais pode não estar disponível.`, aviso);
      confere(conta.corpo.charges_enabled, "A conta pode cobrar (charges_enabled).", "A conta ainda não pode cobrar (charges_enabled falso): termine o cadastro no Stripe.", aviso);
    }
    const we = await pedir(`${STRIPE}/v1/webhook_endpoints?limit=100`, { headers: h });
    if (!appUrl) aviso("Sem APP_URL, não dá para conferir o endpoint de webhook do Stripe.");
    else if (we.status !== 200) aviso(`Não consegui listar os endpoints de webhook (${we.status}): ${we.corpo.error?.message ?? ""}. Confira no painel se existe um para ${appUrl}/api/pagamentos/webhook/stripe.`);
    else { veredito(avaliarWebhookStripe(we.corpo.data, appUrl)); aviso("O segredo do endpoint (whsec_) só aparece no painel do Stripe: confira que STRIPE_WEBHOOK_SECRET é o DESTE endpoint (um segredo errado faz todo aviso ser recusado com 401)."); }
    const portal = await pedir(`${STRIPE}/v1/billing_portal/configurations?limit=10`, { headers: h });
    if (portal.status === 200) veredito(avaliarPortalStripe(portal.corpo.data));
    else aviso(`Não consegui conferir o portal do cliente (${portal.status}).`);

    if (flag("checkout")) {
      if (modoDaChaveStripe(chave) !== "teste") erro("--checkout só roda com chave de TESTE (sk_test_): não vou criar cliente nem sessão em produção.");
      else if (!appUrl) erro("--checkout precisa de APP_URL (para os endereços de retorno).");
      else {
        const { stripeApi } = await import("../../server/pagamentos/stripe.js");
        try {
          const cliente = await stripeApi.criarCliente({ email: "verificacao@exemplo.test", nome: "Verificação de configuração", tenantId: "verificacao-config" });
          const sessao = await stripeApi.criarCheckout({ clienteId: cliente.id, nomeProduto: "ConstruktPro Teste (mensal)", valorCent: 5000, ciclo: "mensal", tenantId: "verificacao-config", plano: "starter", sucessoUrl: `${appUrl}/app/assinatura?checkout=ok`, cancelaUrl: `${appUrl}/app/assinatura?checkout=cancelado` });
          ok(`Sessão de Checkout de teste criada. Abra e pague com o cartão 4242 4242 4242 4242: ${sessao.url}`);
          ok("Depois confira, no painel do Stripe, se o evento foi entregue ao seu endpoint (e a resposta foi 200). A empresa de teste não existe, então o aviso volta como \"ignorado\".");
        } catch (e) { erro(`O Stripe recusou o Checkout de teste: ${e.message}`); }
      }
    }
  }
}

// ─── O sistema publicado ──────────────────────────────────────────────────────
if (appUrl && /^https?:\/\//.test(appUrl)) {
  secao(`O sistema em ${appUrl}`);
  const sonda = async (caminho, rotuloOk, rotuloOff) => {
    const r = await pedir(`${appUrl}${caminho}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    if (r.status === 0) return aviso(`${caminho}: sem resposta (${r.erroRede}).`);
    if (!/json/.test(r.tipo)) return aviso(`${caminho}: respondeu ${r.status} sem JSON. Se o projeto estiver protegido por senha na Vercel (Deployment Protection), o webhook nunca chega ao sistema.`);
    if (r.status === 401) return ok(`${caminho}: ${rotuloOk}`);
    if (r.status === 404) return aviso(`${caminho}: ${rotuloOff}`);
    aviso(`${caminho}: respondeu ${r.status}.`);
  };
  await sonda("/api/pagamentos/webhook/stripe", "o webhook do Stripe está de pé e exige assinatura (respondeu 401 sem ela).", "o webhook do Stripe não está disponível nesse ambiente (faltam STRIPE_SECRET_KEY e STRIPE_WEBHOOK_SECRET na Vercel, ou o deploy é antigo).");
  await sonda("/api/email/webhook/resend", "o webhook do Resend está de pé e exige assinatura (respondeu 401 sem ela).", "o webhook do Resend não está disponível nesse ambiente (faltam EMAIL_PROVIDER, chave, domínio de recebimento e segredo do webhook na Vercel, ou o deploy é antigo).");
}

console.log(`\n${erros ? `${erros} problema(s) a corrigir` : "Nada a corrigir"}${avisos ? `, ${avisos} aviso(s)` : ""}.`);
process.exit(erros ? 1 : 0);
