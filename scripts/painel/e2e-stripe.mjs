// Ponta a ponta do Stripe: abrir o Checkout, o portal, trocar de plano, e os avisos (webhook) que ativam, cobram, atrasam, suspendem e cancelam.
// Usa um Stripe de mentira (servidor local) e a API real com o banco real; apaga tudo o que cria.
//   node --env-file=.env scripts/painel/e2e-stripe.mjs
import bcrypt from "bcryptjs";
import http from "node:http";
import prisma from "../../server/db.js";
import { hojeBR, somarDias } from "../../server/utils/datas.js";
import { IDS_PERMISSOES } from "../../server/config/painel.js";
import { assinarStripe } from "../../server/pagamentos/stripe.js";
import { cliente, iniciarApi, marca, ok, totalFalhas } from "./lib.mjs";

const SENHA = "Senha-Teste-2026", SEGREDO = "whsec_stripe_e2e_segredo", PORTA_FAKE = 3031;
const hoje = hojeBR(), mes = hoje.slice(0, 7), agoraSeg = Math.floor(Date.now() / 1000);
const equipeCriada = [], empresasCriadas = [];

// ── Stripe de mentira ───────────────────────────────────────────────────────
const chamadas = [], falha = { tudo: false };
let seqCliente = 0;
const fake = http.createServer((req, res) => {
  let t = "";
  req.on("data", d => (t += d));
  req.on("end", () => {
    const json = (status, corpo) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(corpo)); };
    const form = Object.fromEntries(new URLSearchParams(t));
    chamadas.push({ metodo: req.method, caminho: req.url, form, auth: req.headers.authorization, idem: req.headers["idempotency-key"], tipo: req.headers["content-type"] });
    if (req.headers.authorization !== "Bearer sk_test_e2e") return json(401, { error: { message: "chave inválida" } });
    if (falha.tudo) return json(500, { error: { message: "erro de teste do Stripe" } });
    if (req.method === "POST" && req.url === "/v1/customers") return json(200, { id: `cus_e2e_${++seqCliente}` });
    if (req.method === "POST" && req.url === "/v1/checkout/sessions") return json(200, { id: "cs_test_1", url: "https://checkout.stripe.test/c/cs_test_1" });
    if (req.method === "POST" && req.url === "/v1/billing_portal/sessions") return json(200, { url: "https://billing.stripe.test/p/sess_1" });
    if (req.method === "GET" && /^\/v1\/subscriptions\/sub_[\w-]+$/.test(req.url)) return json(200, { id: req.url.split("/").pop(), items: { data: [{ id: "si_e2e" }] } });
    if (req.method === "POST" && /^\/v1\/subscriptions\/sub_[\w-]+$/.test(req.url)) return json(200, { id: req.url.split("/").pop() });
    json(404, { error: { message: "rota desconhecida no teste" } });
  });
});
await new Promise(r => fake.listen(PORTA_FAKE, "127.0.0.1", r));
const ultima = (metodo, caminho) => chamadas.filter(c => c.metodo === metodo && c.caminho === caminho).at(-1);

async function criarEquipe(nome, perms, papel = "atendente") {
  const e = await prisma.equipeUsuario.create({ data: { nome: `Equipe ${nome}`, email: `${marca}-${nome}@exemplo.test`, senha: await bcrypt.hash(SENHA, 10), papel, permissoes: perms, trocarSenha: false } });
  equipeCriada.push(e.id);
  return e;
}
async function criarEmpresa(nome, dados = {}, assinatura = null) {
  const t = await prisma.tenant.create({ data: { razaoSocial: `Teste Stripe ${nome} ${marca}`, cnpj: `TESTE-STR-${marca}-${nome}`, email: `${marca}-${nome}@exemplo.test`, plano: "pro", status: "trial", trialAte: somarDias(hoje, -2), ...dados } });
  empresasCriadas.push(t.id);
  const adm = await prisma.user.create({ data: { tenantId: t.id, nome: `Admin ${nome}`, email: `${marca}-${nome}-adm@exemplo.test`, senha: bcrypt.hashSync(SENHA, 10), role: "tenant_admin" } });
  const comum = await prisma.user.create({ data: { tenantId: t.id, nome: `Pessoa ${nome}`, email: `${marca}-${nome}-u@exemplo.test`, senha: bcrypt.hashSync(SENHA, 10), role: "user" } });
  if (assinatura) await prisma.assinatura.create({ data: { tenantId: t.id, ...assinatura } });
  return { t, adm, comum };
}

const envStripe = { PAGAMENTO_GATEWAY: "stripe", STRIPE_SECRET_KEY: "sk_test_e2e", STRIPE_WEBHOOK_SECRET: SEGREDO, APP_URL: "https://app.exemplo.test", STRIPE_API_BASE: `http://127.0.0.1:${PORTA_FAKE}` };
const api = await iniciarApi(3023, envStripe);
const manual = await iniciarApi(3024, { PAGAMENTO_GATEWAY: "manual", STRIPE_SECRET_KEY: "", STRIPE_WEBHOOK_SECRET: "" });
try {
  const anon = cliente(api.base);
  const loginCliente = async (u, base = api.base) => cliente(base, (await cliente(base).post("/api/auth/login", { email: u.email, senha: SENHA })).corpo.token);
  const loginEquipe = async (e, base = api.base) => cliente(base, (await cliente(base).post("/api/painel/auth/login", { email: e.email, senha: SENHA })).corpo.token);
  const webhook = (corpo, { base = api.base, segredo = SEGREDO, ts, adulterar = false, semAssinatura = false } = {}) => new Promise((resolve, reject) => {
    const dados = JSON.stringify(corpo);
    const cab = assinarStripe({ corpo: Buffer.from(dados), segredo, timestamp: ts ?? Math.floor(Date.now() / 1000) });
    const enviar = adulterar ? `${dados} ` : dados;
    const url = new URL(`${base}/api/pagamentos/webhook/stripe`);
    const req = http.request({ hostname: url.hostname, port: url.port, path: url.pathname, method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(enviar), ...(semAssinatura ? {} : { "Stripe-Signature": cab }) } }, res => {
      let t = ""; res.on("data", d => (t += d)); res.on("end", () => { let c = {}; try { c = JSON.parse(t); } catch { /* vazio */ } resolve({ status: res.statusCode, corpo: c }); });
    });
    req.on("error", reject); req.write(enviar); req.end();
  });
  let seq = 0;
  const evento = (type, objeto, id) => ({ id: id ?? `evt_${marca}_${++seq}`, type, data: { object: objeto } });
  const invoice = (o = {}) => ({
    id: `in_${marca}_${++seq}`, object: "invoice", customer: o.customer, subscription: o.subscription ?? "sub_e2e_1", currency: "brl", status: "paid", billing_reason: "subscription_create", collection_method: "charge_automatically",
    total: 34900, amount_due: 34900, amount_paid: 34900, created: agoraSeg, due_date: null, hosted_invoice_url: "https://invoice.stripe.test/i/x", status_transitions: { paid_at: agoraSeg },
    lines: { data: [{ subscription_item: "si_e2e", period: { start: agoraSeg, end: agoraSeg + 2_592_000 }, price: { recurring: { interval: "month" } } }] },
    parent: { type: "subscription_details", subscription_details: { subscription: o.subscription ?? "sub_e2e_1", metadata: o.meta ?? {} } },
    ...o.extra,
  });

  const fin = await criarEquipe("fin", ["financeiro", "clientes", "clientes_editar"]);
  const ST = await loginEquipe(await criarEquipe("tudo", IDS_PERMISSOES, "equipe_admin")), SF = await loginEquipe(fin);

  const A = await criarEmpresa("a");                                  // teste vencido (bloqueada): vai assinar pelo Checkout
  const CA = await loginCliente(A.adm), CAu = await loginCliente(A.comum);
  const CAmanual = await loginCliente(A.adm, manual.base);

  // ── Disponibilidade ──────────────────────────────────────────────────────
  ok((await CA.get("/api/assinatura/resumo")).corpo.pagamento.online === true, "resumo: com o Stripe configurado, o pagamento online está disponível");
  ok((await CAmanual.get("/api/assinatura/resumo")).corpo.pagamento.online === false, "resumo: sem o Stripe configurado, não está");
  ok((await CAmanual.post("/api/assinatura/checkout", { plano: "pro", ciclo: "mensal" })).status === 409, "checkout: sem o Stripe configurado: 409 com a orientação de abrir chamado");
  ok((await webhook(evento("invoice.paid", invoice({ customer: "cus_x" })), { base: manual.base })).status === 404, "webhook: instância sem o Stripe configurado não recebe (404)");

  // ── Checkout ─────────────────────────────────────────────────────────────
  ok((await CAu.post("/api/assinatura/checkout", { plano: "pro", ciclo: "mensal" })).status === 403, "checkout: usuário comum não assina pela empresa (403)");
  ok((await CA.post("/api/assinatura/checkout", { plano: "inventado", ciclo: "mensal" })).status === 400, "checkout: plano inválido: 400");
  ok((await CA.post("/api/assinatura/checkout", { plano: "pro", ciclo: "trimestral" })).status === 400, "checkout: ciclo inválido: 400");
  ok((await anon.post("/api/assinatura/checkout", { plano: "pro", ciclo: "mensal" })).status === 401, "checkout: sem login: 401");
  const ck = await CA.post("/api/assinatura/checkout", { plano: "pro", ciclo: "mensal" });
  ok(ck.status === 200 && ck.corpo.url === "https://checkout.stripe.test/c/cs_test_1", "checkout: devolve o endereço do pagamento hospedado");
  const cli = ultima("POST", "/v1/customers");
  ok(cli.form.email === A.t.email && cli.form.name === A.t.razaoSocial && cli.form["metadata[tenantId]"] === A.t.id && cli.idem === `cliente-${A.t.id}` && cli.auth === "Bearer sk_test_e2e" && /x-www-form-urlencoded/.test(cli.tipo), "checkout: cria o cliente no Stripe com e-mail, nome e a empresa nos metadados, em formulário e com chave de idempotência");
  const s1 = ultima("POST", "/v1/checkout/sessions").form;
  ok(s1.mode === "subscription" && s1.customer === "cus_e2e_1" && s1.client_reference_id === A.t.id && s1.locale === "pt-BR", "checkout: sessão em modo assinatura, ligada ao cliente e à empresa, em português");
  ok(s1["line_items[0][price_data][currency]"] === "brl" && s1["line_items[0][price_data][unit_amount]"] === "34900" && s1["line_items[0][price_data][recurring][interval]"] === "month" && s1["line_items[0][quantity]"] === "1", "checkout: preço de lista do Business mensal, em reais e em centavos");
  ok(s1["line_items[0][price_data][product_data][name]"] === "ConstruktPro Business (mensal)", "checkout: nome do produto com o plano e o ciclo");
  ok(s1["metadata[plano]"] === "pro" && s1["metadata[ciclo]"] === "mensal" && s1["subscription_data[metadata][tenantId]"] === A.t.id && s1["subscription_data[metadata][plano]"] === "pro", "checkout: plano, ciclo e empresa também nos metadados da assinatura (voltam em cada fatura)");
  ok(s1.success_url === "https://app.exemplo.test/app/assinatura?checkout=ok" && s1.cancel_url === "https://app.exemplo.test/app/assinatura?checkout=cancelado", "checkout: volta para a tela Assinatura do próprio sistema");
  const apos = await prisma.assinatura.findUnique({ where: { tenantId: A.t.id } });
  ok(apos.gatewayClienteId === "cus_e2e_1" && apos.gateway === "manual" && apos.gatewayAssinaturaId === null, "checkout: guarda o cliente do Stripe, mas a empresa só passa a ser cobrada lá quando a assinatura existir");
  const ck2 = await CA.post("/api/assinatura/checkout", { plano: "enterprise", ciclo: "anual" });
  const s2 = ultima("POST", "/v1/checkout/sessions").form;
  ok(ck2.status === 200 && s2.customer === "cus_e2e_1" && chamadas.filter(c => c.caminho === "/v1/customers").length === 1, "checkout: o segundo reaproveita o cliente do Stripe (não cria outro)");
  ok(s2["line_items[0][price_data][unit_amount]"] === "718800" && s2["line_items[0][price_data][recurring][interval]"] === "year", "checkout: o anual cobra o ano inteiro (599 x 12) com intervalo anual");
  await prisma.assinatura.update({ where: { tenantId: A.t.id }, data: { valor: 300 } });
  await CA.post("/api/assinatura/checkout", { plano: "pro", ciclo: "mensal" });
  ok(ultima("POST", "/v1/checkout/sessions").form["line_items[0][price_data][unit_amount]"] === "30000", "checkout: o mesmo plano e ciclo do preço combinado usa o valor combinado");
  await prisma.assinatura.update({ where: { tenantId: A.t.id }, data: { valor: 349 } });
  falha.tudo = true;
  const fk = await CA.post("/api/assinatura/checkout", { plano: "pro", ciclo: "mensal" });
  falha.tudo = false;
  ok(fk.status === 502 && !JSON.stringify(fk.corpo).includes("sk_test") && /Tente de novo/.test(fk.corpo.error), "checkout: falha do Stripe vira 502 com mensagem amigável, sem vazar chave nem detalhe");
  ok((await prisma.tenant.findUnique({ where: { id: A.t.id }, select: { status: true } })).status === "trial", "checkout: abrir o pagamento não ativa a conta (só o pagamento ativa)");
  ok((await CA.post("/api/assinatura/portal")).status === 409, "portal: quem ainda não assina no cartão não tem portal (409)");

  // ── Avisos: autenticidade ────────────────────────────────────────────────
  const evtTeste = evento("invoice.paid", invoice({ customer: "cus_e2e_1" }));
  ok((await webhook(evtTeste, { segredo: "whsec_errado" })).status === 401, "webhook: segredo errado: 401");
  ok((await webhook(evtTeste, { semAssinatura: true })).status === 401, "webhook: sem assinatura: 401");
  ok((await webhook(evtTeste, { adulterar: true })).status === 401, "webhook: corpo alterado depois de assinado: 401");
  ok((await webhook(evtTeste, { ts: Math.floor(Date.now() / 1000) - 3600 })).status === 401, "webhook: assinatura antiga (repetição): 401");
  ok((await prisma.cobranca.count({ where: { tenantId: A.t.id } })) === 0, "webhook: avisos recusados não criaram nada");
  ok((await anon.post("/api/pagamentos/webhook/asaas", {})).status === 404, "webhook: gateway desconhecido: 404");

  // ── Checkout concluído e primeira fatura paga ────────────────────────────
  ok((await CA.get("/api/obras")).status === 402, "antes de pagar: a empresa com teste vencido está bloqueada");
  const metaA = { tenantId: A.t.id, plano: "enterprise", ciclo: "anual" };
  const ckEvt = await webhook(evento("checkout.session.completed", { mode: "subscription", customer: "cus_e2e_1", subscription: "sub_e2e_1", client_reference_id: A.t.id, metadata: { plano: "enterprise", ciclo: "anual" } }));
  const aCk = await prisma.assinatura.findUnique({ where: { tenantId: A.t.id } });
  ok(ckEvt.status === 200 && aCk.gateway === "stripe" && aCk.gatewayAssinaturaId === "sub_e2e_1" && aCk.gatewayClienteId === "cus_e2e_1", "checkout concluído: a empresa passa a ser cobrada pelo Stripe");
  ok((await prisma.tenant.findUnique({ where: { id: A.t.id }, select: { status: true, plano: true, ciclo: true } })).status === "trial", "checkout concluído: ainda não ativa (a fatura paga é que ativa)");
  const f1 = invoice({ customer: "cus_e2e_1", meta: metaA, extra: { total: 718800, amount_due: 718800, amount_paid: 718800, lines: { data: [{ subscription_item: "si_e2e", period: { start: agoraSeg, end: agoraSeg + 31_536_000 }, price: { recurring: { interval: "year" } } }] } } });
  const pago = await webhook(evento("invoice.paid", f1));
  ok(pago.status === 200 && /paga/.test(pago.corpo.resultado) && /passou a ativo/.test(pago.corpo.resultado), `fatura paga: 200 e a empresa passa a ativa (${pago.corpo.resultado})`);
  const tA = await prisma.tenant.findUnique({ where: { id: A.t.id } });
  ok(tA.status === "ativo" && tA.plano === "enterprise" && tA.ciclo === "anual", "fatura paga: ativa a empresa com o plano e o ciclo que o cliente escolheu no Checkout");
  const cb = await prisma.cobranca.findFirst({ where: { tenantId: A.t.id, gatewayId: f1.id } });
  ok(cb && cb.status === "paga" && cb.gateway === "stripe" && Number(cb.valor) === 7188 && Number(cb.valorPago) === 7188 && cb.forma === "cartao" && cb.pagaEm === hoje && cb.ciclo === "anual" && cb.linkPagamento === "https://invoice.stripe.test/i/x" && cb.referencia === mes, "fatura paga: vira cobrança paga (valor, forma cartão, data, ciclo anual, link da fatura)");
  const aPago = await prisma.assinatura.findUnique({ where: { tenantId: A.t.id } });
  ok(Number(aPago.valor) === 7188 && !!aPago.ativadaEm, "fatura paga: o valor da assinatura é o da primeira fatura e a data de ativação é marcada");
  ok((await CA.get("/api/obras")).status === 200, "fatura paga: a conta bloqueada é liberada na hora");
  ok((await ST.get(`/api/painel/clientes/${A.t.id}`)).corpo.assinatura.gatewayClienteId === "cus_e2e_1", "painel: a equipe vê o cliente do Stripe da empresa");
  const rs = (await CA.get("/api/assinatura/resumo")).corpo;
  ok(rs.pagamento.cartao === true && rs.faturas.some(f => f.situacao === "paga" && f.linkPagamento === null) && !JSON.stringify(rs).includes("gatewayId") && !JSON.stringify(rs).includes("cus_e2e"), "cliente: vê a fatura paga e que assina no cartão, sem id do gateway");

  // Idempotência, ordem e rajada
  const rep = await webhook(evento("invoice.paid", f1, `evt_${marca}_1`));
  ok(rep.status === 200, "avisos repetidos: aceitos sem erro");
  const mesmoId = evento("invoice.paid", f1, `evt_${marca}_repete`);
  const [r1, r2] = [await webhook(mesmoId), await webhook(mesmoId)];
  ok(r2.corpo.resultado === "duplicado" && (await prisma.cobranca.count({ where: { tenantId: A.t.id, gatewayId: f1.id } })) === 1, "o mesmo evento reenviado: duplicado, e uma cobrança só");
  void r1;
  await webhook(evento("invoice.finalized", { ...f1, status: "open", status_transitions: {} }));
  ok((await prisma.cobranca.findFirst({ where: { gatewayId: f1.id } })).status === "paga", "fora de ordem: um aviso atrasado de 'fatura aberta' não desfaz o pagamento");
  const fR = invoice({ customer: "cus_e2e_1", meta: metaA, extra: { billing_reason: "subscription_cycle", created: agoraSeg + 40 * 86400 } });
  const mesmoPago = evento("invoice.paid", fR, `evt_${marca}_rajada`);
  const rajada = await Promise.all(Array.from({ length: 6 }, () => webhook(mesmoPago)));
  ok(rajada.every(r => r.status === 200), "rajada do mesmo evento: todos respondem 200");
  ok((await prisma.cobranca.count({ where: { tenantId: A.t.id, gatewayId: fR.id } })) === 1, "rajada do mesmo evento: uma cobrança só");
  ok((await prisma.eventoPagamento.count({ where: { gateway: "stripe", eventoId: `evt_${marca}_rajada` } })) === 1, "rajada: um registro de evento");

  // Fatura adicional no mesmo mês (troca de plano proporcional): não colide com a do mês
  const fExtra = invoice({ customer: "cus_e2e_1", meta: metaA, extra: { billing_reason: "subscription_update", total: 5000, amount_due: 5000, amount_paid: 5000 } });
  await webhook(evento("invoice.paid", fExtra));
  const cExtra = await prisma.cobranca.findFirst({ where: { gatewayId: fExtra.id } });
  ok(!!cExtra && cExtra.status === "paga" && cExtra.referencia.startsWith(`${mes}#`), "fatura adicional no mesmo mês: vira outra cobrança, com a referência marcada (não colide)");

  // ── Falha, atraso, falta de pagamento, cancelamento ──────────────────────
  const fFalha = invoice({ customer: "cus_e2e_1", meta: metaA, extra: { billing_reason: "subscription_cycle", status: "open", status_transitions: {}, amount_paid: 0, created: agoraSeg + 80 * 86400 } });
  const falhou = await webhook(evento("invoice.payment_failed", fFalha));
  ok(falhou.status === 200 && (await prisma.tenant.findUnique({ where: { id: A.t.id }, select: { status: true } })).status === "inadimplente", "pagamento recusado: a empresa ativa fica inadimplente (sem bloquear)");
  ok((await prisma.cobranca.findFirst({ where: { gatewayId: fFalha.id } })).status === "aberta", "pagamento recusado: a fatura fica em aberto");
  ok((await CA.get("/api/obras")).status === 200, "inadimplente não bloqueia o acesso");
  await webhook(evento("invoice.paid", { ...fFalha, status: "paid", amount_paid: 34900, status_transitions: { paid_at: agoraSeg } }));
  ok((await prisma.tenant.findUnique({ where: { id: A.t.id }, select: { status: true } })).status === "ativo", "depois de pagar a fatura recusada, a empresa volta a ativa");
  await webhook(evento("customer.subscription.updated", { id: "sub_e2e_1", customer: "cus_e2e_1", status: "past_due", metadata: {} }));
  ok((await prisma.tenant.findUnique({ where: { id: A.t.id }, select: { status: true } })).status === "inadimplente", "assinatura em atraso no Stripe: inadimplente");
  await webhook(evento("customer.subscription.updated", { id: "sub_e2e_1", customer: "cus_e2e_1", status: "unpaid", metadata: {} }));
  const susp = await prisma.tenant.findUnique({ where: { id: A.t.id }, select: { status: true, motivoStatus: true } });
  ok(susp.status === "suspenso" && susp.motivoStatus.startsWith("Stripe:"), "assinatura sem pagamento no Stripe: a empresa é suspensa, com o motivo marcado como vindo do Stripe");
  ok((await CA.get("/api/obras")).status === 402, "suspensa pelo Stripe: o acesso é bloqueado");
  await webhook(evento("invoice.paid", invoice({ customer: "cus_e2e_1", meta: metaA, extra: { billing_reason: "subscription_cycle", created: agoraSeg + 120 * 86400 } })));
  ok((await prisma.tenant.findUnique({ where: { id: A.t.id }, select: { status: true } })).status === "ativo" && (await CA.get("/api/obras")).status === 200, "pagou depois: a empresa suspensa pelo Stripe volta a ativa e o acesso volta");
  // Suspensa à mão pela equipe NÃO é reativada por pagamento
  await ST.post(`/api/painel/clientes/${A.t.id}/status`, { status: "suspenso", motivo: "Fraude suspeita" });
  await webhook(evento("invoice.paid", invoice({ customer: "cus_e2e_1", meta: metaA, extra: { billing_reason: "subscription_cycle", created: agoraSeg + 150 * 86400 } })));
  ok((await prisma.tenant.findUnique({ where: { id: A.t.id }, select: { status: true } })).status === "suspenso", "suspensa pela equipe (outro motivo): o pagamento não a reativa sozinho");
  await ST.post(`/api/painel/clientes/${A.t.id}/status`, { status: "ativo" });
  await webhook(evento("customer.subscription.deleted", { id: "sub_e2e_1", customer: "cus_e2e_1", status: "canceled", metadata: {} }));
  const canc = await prisma.tenant.findUnique({ where: { id: A.t.id }, select: { status: true, motivoStatus: true } });
  ok(canc.status === "cancelado" && canc.motivoStatus.startsWith("Stripe:") && (await prisma.assinatura.findUnique({ where: { tenantId: A.t.id } })).canceladaEm !== null, "assinatura cancelada no Stripe: a empresa é cancelada e a data de cancelamento marcada");

  // ── Sem efeito (200, nunca erro) ─────────────────────────────────────────
  const sem = async (obj, esp, msg) => { const r = await webhook(obj); ok(r.status === 200 && new RegExp(esp).test(r.corpo.resultado), `${msg} (${r.corpo.resultado})`); };
  await sem(evento("invoice.paid", invoice({ customer: "cus_desconhecido" })), "^ignorado: nenhuma empresa", "aviso de um cliente que não é nosso: ignorado");
  await sem(evento("invoice.paid", invoice({ customer: "cus_e2e_1", extra: { currency: "usd" } })), "^ignorado: fatura em usd", "fatura em dólar: ignorada");
  await sem(evento("invoice.created", invoice({ customer: "cus_e2e_1", extra: { status: "draft" } })), "^ignorado: fatura em rascunho", "fatura em rascunho: ignorada");
  await sem(evento("charge.refunded", { id: "ch_1" }), "^ignorado: charge.refunded", "evento que o sistema não trata: registrado e ignorado");
  await sem(evento("customer.subscription.updated", { id: "sub_x", customer: "cus_e2e_1", status: "incomplete" }), "^ignorado", "assinatura incompleta: ignorada");

  // ── Empresa identificada só pelos metadados; cobrança manual adotada ─────
  const B = await criarEmpresa("b", { status: "ativo", trialAte: null }, { valor: 349, diaVencimento: 10 });
  const manualAberta = await ST.post("/api/painel/financeiro/cobrancas", { tenantId: B.t.id, referencia: mes });
  ok(manualAberta.status === 201 && manualAberta.corpo.gateway === "manual", "cobrança criada à mão: marcada como manual (o Stripe não gera cobrança por aqui)");
  const fB = invoice({ customer: "cus_e2e_B", subscription: "sub_e2e_B", meta: { tenantId: B.t.id, plano: "pro", ciclo: "mensal" }, extra: { billing_reason: "subscription_cycle", status: "open", status_transitions: {}, amount_paid: 0 } });
  await webhook(evento("invoice.finalized", fB));
  const aB = await prisma.assinatura.findUnique({ where: { tenantId: B.t.id } });
  ok(aB.gateway === "stripe" && aB.gatewayClienteId === "cus_e2e_B", "fatura de empresa conhecida só pelos metadados: liga o cliente do Stripe à empresa");
  const cobsB = await prisma.cobranca.findMany({ where: { tenantId: B.t.id } });
  ok(cobsB.length === 1 && cobsB[0].id === manualAberta.corpo.id && cobsB[0].gateway === "stripe" && cobsB[0].gatewayId === fB.id, "a cobrança em aberto criada à mão para o mês é adotada pela fatura do Stripe (não duplica)");
  ok((await ST.post("/api/painel/financeiro/cobrancas", { tenantId: B.t.id, referencia: `${Number(mes.slice(0, 4)) + 1}-01` })).status === 409, "empresa cobrada pelo Stripe: criar cobrança à mão é recusado (409)");
  ok((await ST.get(`/api/painel/financeiro/cobrancas/previa?mes=${Number(mes.slice(0, 4)) + 1}-02`)).corpo.itens.every(i => i.tenantId !== B.t.id), "gerar o mês não inclui quem o Stripe cobra");

  // Fatura do Stripe não se mexe à mão
  const cStripe = cobsB[0];
  ok((await ST.post(`/api/painel/financeiro/cobrancas/${cStripe.id}/pagamento`, {})).status === 409, "fatura do Stripe: registrar o pagamento à mão é recusado (409)");
  ok((await ST.post(`/api/painel/financeiro/cobrancas/${cStripe.id}/cancelar`, { motivo: "teste" })).status === 409, "fatura do Stripe: cancelar à mão é recusado (409)");
  ok((await prisma.cobranca.findUnique({ where: { id: cStripe.id } })).status === "aberta", "fatura do Stripe: continua em aberto");

  // ── Portal ───────────────────────────────────────────────────────────────
  const CB = await loginCliente(B.adm);
  const portal = await CB.post("/api/assinatura/portal");
  ok(portal.status === 200 && portal.corpo.url === "https://billing.stripe.test/p/sess_1", "portal: quem assina no cartão recebe o endereço do portal");
  const pf = ultima("POST", "/v1/billing_portal/sessions").form;
  ok(pf.customer === "cus_e2e_B" && pf.return_url === "https://app.exemplo.test/app/assinatura", "portal: pede o portal do cliente certo e volta para a tela Assinatura");
  ok((await (await loginCliente(B.comum)).post("/api/assinatura/portal")).status === 403, "portal: usuário comum não abre (403)");
  ok((await CB.post("/api/assinatura/checkout", { plano: "pro", ciclo: "mensal" })).status === 409, "checkout: quem já assina no cartão e está em dia é mandado para o portal (409)");

  // ── Troca de plano pela equipe ───────────────────────────────────────────
  await prisma.tenant.update({ where: { id: B.t.id }, data: { ciclo: "mensal" } });
  ok((await ST.post(`/api/painel/clientes/${B.t.id}/plano`, { plano: "enterprise", ciclo: "anual" })).status === 409, "plano: mudar o ciclo de uma empresa do Stripe é recusado (409)");
  falha.tudo = true;
  const planoFalha = await ST.post(`/api/painel/clientes/${B.t.id}/plano`, { plano: "enterprise", ciclo: "mensal" });
  falha.tudo = false;
  ok(planoFalha.status === 502 && (await prisma.tenant.findUnique({ where: { id: B.t.id }, select: { plano: true } })).plano === "pro", "plano: se o Stripe falhar, o plano NÃO muda aqui (502)");
  const trocou = await ST.post(`/api/painel/clientes/${B.t.id}/plano`, { plano: "enterprise", ciclo: "mensal" });
  ok(trocou.status === 200, "plano: troca com o Stripe disponível");
  const upd = ultima("POST", "/v1/subscriptions/sub_e2e_B").form;
  ok(upd["items[0][id]"] === "si_e2e" && upd["items[0][price_data][unit_amount]"] === "74900" && upd["items[0][price_data][recurring][interval]"] === "month" && upd.proration_behavior === "create_prorations" && upd["metadata[plano]"] === "enterprise", "plano: atualiza a assinatura do Stripe com o item certo, o preço novo e cobrança proporcional");
  const tB = await prisma.tenant.findUnique({ where: { id: B.t.id }, select: { plano: true } });
  ok(tB.plano === "enterprise" && Number((await prisma.assinatura.findUnique({ where: { tenantId: B.t.id } })).valor) === 749, "plano: o plano e o valor da assinatura acompanham");

  // ── Leitura, auditoria e registro de eventos ─────────────────────────────
  const entrar = await ST.post(`/api/painel/clientes/${B.t.id}/entrar`, { chamadoId: (await prisma.ticket.create({ data: { tenantId: B.t.id, abertoPorId: B.adm.id, canal: "ticket", assunto: "x", setor: "assinatura", status: "aberto", plano: "pro" } })).id });
  ok((await cliente(api.base, entrar.corpo.token).post("/api/assinatura/checkout", { plano: "pro", ciclo: "mensal" })).status === 403, "modo leitura da equipe não abre pagamento (403)");
  const evs = await prisma.eventoPagamento.findMany({ where: { gateway: "stripe", eventoId: { contains: marca } }, select: { resultado: true } });
  ok(evs.length >= 15 && evs.every(e => e.resultado), "todos os avisos ficaram registrados, com o resultado");
  void SF;
} finally {
  await api.parar(); await manual.parar(); fake.close();
  const r = await prisma.tenant.deleteMany({ where: { id: { in: empresasCriadas }, cnpj: { startsWith: "TESTE-STR-" } } });
  const ev = await prisma.eventoPagamento.deleteMany({ where: { gateway: "stripe", eventoId: { contains: marca } } });
  await prisma.auditoriaEquipe.deleteMany({ where: { OR: [{ equipeId: { in: equipeCriada } }, { acao: "login_falhou", detalhe: { startsWith: marca } }] } });
  const q = await prisma.equipeUsuario.deleteMany({ where: { id: { in: equipeCriada }, email: { startsWith: marca } } });
  console.log(`limpeza: ${r.count} empresa(s), ${ev.count} evento(s) de pagamento e ${q.count} pessoa(s) da equipe de teste apagados`);
  await prisma.$disconnect();
}
console.log(totalFalhas() ? `\n${totalFalhas()} verificação(ões) com falha` : "\nTodas as verificações passaram");
process.exit(totalFalhas() ? 1 : 0);
