// Pagamento online e e-mail do chamado pela interface (Playwright). O cliente escolhe o plano e vai para o pagamento hospedado, volta e acompanha a
// confirmação (a API de pagamento é simulada no navegador: o servidor já é provado em e2e-stripe.mjs); a equipe vê o que é do Stripe e o estado do
// e-mail em cada mensagem (dados reais gravados no banco). Cria empresas e equipe de teste e apaga no fim.
//   npm run dev  e   node --env-file=.env scripts/painel/ui-pagamentos.mjs
import bcrypt from "bcryptjs";
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import prisma from "../../server/db.js";
import { IDS_PERMISSOES } from "../../server/config/painel.js";
import { hojeBR, somarDias } from "../../server/utils/datas.js";
import { marca, ok, totalFalhas } from "./lib.mjs";

const CLIENTE = process.env.CLIENTE_URL || "http://localhost:3000";
const PAINEL = process.env.PAINEL_URL || "http://painel.localhost:3000";
const API = CLIENTE.replace("3000", "3002");
const SENHA = "Senha-Teste-2026";
const pasta = "node_modules/.cache/painel-ui";
mkdirSync(pasta, { recursive: true });
let falhasVistas = 0;
const vejo = async (loc, msg, ms = 10000) => {
  const achou = await loc.first().waitFor({ state: "visible", timeout: ms }).then(() => true, () => false);
  if (!achou) await loc.page().screenshot({ path: `${pasta}/falha-${++falhasVistas}.png` }).catch(() => {});
  return ok(achou, msg);
};
async function respirar(minimo = 90) {
  const r = await fetch(`${API}/api/health`);
  const sobra = Number(r.headers.get("ratelimit-remaining")), espera = Number(r.headers.get("ratelimit-reset"));
  if (sobra < minimo && espera > 0) await new Promise(res => setTimeout(res, (espera + 1) * 1000));
}

const hoje = hojeBR(), empresas = [], equipe = [];
async function criarEmpresa(nome, dados = {}, assinatura = null) {
  const t = await prisma.tenant.create({ data: { razaoSocial: `Teste UI Pagamentos ${nome} ${marca}`, cnpj: `TESTE-UIPG-${marca}-${nome}`, email: `${marca}-${nome}@exemplo.test`, plano: "pro", status: "trial", trialAte: somarDias(hoje, -2), ...dados } });
  empresas.push(t.id);
  const u = await prisma.user.create({ data: { tenantId: t.id, nome: `Maria Dona ${nome}`, email: `${marca}-${nome}-adm@exemplo.test`, senha: await bcrypt.hash(SENHA, 10), role: "tenant_admin", ocultarTour: true } });
  if (assinatura) await prisma.assinatura.create({ data: { tenantId: t.id, ...assinatura } });
  return { t, u };
}
const A = await criarEmpresa("alfa");                                                                  // teste vencido: assina pelo cartão
const B = await criarEmpresa("beta", { status: "ativo", trialAte: null }, { valor: 349, gateway: "stripe", gatewayClienteId: "cus_ui_teste", gatewayAssinaturaId: "sub_ui_teste", ativadaEm: new Date() });
await prisma.cobranca.create({ data: { tenantId: B.t.id, referencia: hoje.slice(0, 7), descricao: "Assinatura ConstruktPro Business · teste", plano: "pro", valor: 349, vencimento: somarDias(hoje, 5), gateway: "stripe", gatewayId: "in_ui_teste", linkPagamento: "https://invoice.stripe.test/i/ui" } });
const equipeAdmin = await prisma.equipeUsuario.create({ data: { nome: "Carlos Financeiro", email: `${marca}-equipe@exemplo.test`, senha: await bcrypt.hash(SENHA, 10), papel: "equipe_admin", permissoes: IDS_PERMISSOES, trocarSenha: false } });
equipe.push(equipeAdmin.id);
// Chamado com mensagens nos três estados de e-mail
const chamado = await prisma.ticket.create({ data: { tenantId: B.t.id, abertoPorId: B.u.id, canal: "ticket", assunto: "Chamado com e-mail", setor: "assinatura", status: "em_atendimento", plano: "pro", atribuidoId: equipeAdmin.id } });
const msg = (o) => prisma.ticketMensagem.create({ data: { ticketId: chamado.id, tenantId: B.t.id, ...o } });
await msg({ autorTipo: "cliente", autorUserId: B.u.id, autorNome: B.u.nome, texto: "Primeira mensagem pelo sistema." });
await msg({ autorTipo: "equipe", autorEquipeId: equipeAdmin.id, autorNome: equipeAdmin.nome, texto: "Resposta enviada por e-mail.", emailStatus: "enviado", emailId: "em_ui_1" });
await msg({ autorTipo: "cliente", autorUserId: B.u.id, autorNome: B.u.nome, texto: "Respondi pelo e-mail.", origem: "email", emailMessageId: `<ui-${marca}@mail.exemplo>` });
await msg({ autorTipo: "equipe", autorEquipeId: equipeAdmin.id, autorNome: equipeAdmin.nome, texto: "Esta não foi.", emailStatus: "falhou" });

const sessaoDe = async u => {
  const r = await fetch(`${API}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: u.email, senha: SENHA }) }).then(x => x.json());
  return JSON.stringify({ token: r.token, refreshToken: r.refreshToken, user: r.user, tenant: r.tenant, tourPendente: false });
};
const tokenEquipe = async () => (await fetch(`${API}/api/painel/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: equipeAdmin.email, senha: SENHA }) }).then(x => x.json())).token;

await respirar(120);
const browser = await chromium.launch();
try {
  const erros = [];
  // ── Cliente: escolhe o plano e vai para o pagamento ──
  const ctxC = await browser.newContext({ viewport: { width: 1366, height: 1000 } });
  await ctxC.addInitScript(s => { try { localStorage.setItem("session", s); } catch {} }, await sessaoDe(A.u));
  const cli = await ctxC.newPage(); cli.on("pageerror", e => erros.push(`cliente: ${e.message}`));
  const pedidos = { checkout: [], portal: 0 };
  let ativarNaProximaConsulta = false;
  // A API de pagamento é simulada no navegador (resumo com pagamento online, checkout e portal); o resto é a API de verdade
  await cli.route("**/api/assinatura/resumo", async route => {
    const r = await route.fetch(); const corpo = await r.json();
    await route.fulfill({ response: r, json: { ...corpo, pagamento: { online: true, cartao: false } } });
  });
  await cli.route("**/api/assinatura/checkout", async route => { pedidos.checkout.push(route.request().postDataJSON()); await route.fulfill({ json: { url: "https://checkout.stripe.test/c/ui_1" } }); });
  await cli.route("https://checkout.stripe.test/**", route => route.fulfill({ contentType: "text/html", body: "<h1>Pagamento simulado</h1>" }));
  await cli.goto(`${CLIENTE}/app/dashboard`, { waitUntil: "networkidle" });
  await vejo(cli.getByText("O seu teste grátis terminou"), "cliente: teste vencido cai na tela de assinatura");
  await vejo(cli.getByText(/O pagamento é no cartão, em uma página segura do Stripe/), "cliente: com o pagamento online, a tela explica o cartão e a renovação");
  await cli.getByRole("tab", { name: /^Anual/ }).click();
  await cli.getByRole("button", { name: "Assinar Business" }).click();
  await cli.waitForURL("https://checkout.stripe.test/**", { timeout: 10000 });
  ok(pedidos.checkout.length === 1 && pedidos.checkout[0].plano === "business" && pedidos.checkout[0].ciclo === "anual", "cliente: Assinar vai para o pagamento com o plano e o ciclo escolhidos");
  await cli.screenshot({ path: `${pasta}/pagamento-hospedado.png` }).catch(() => {});

  // Volta do pagamento: confirma sozinha quando a conta é liberada
  await cli.goto(`${CLIENTE}/app/assinatura?checkout=ok`, { waitUntil: "networkidle" });
  await vejo(cli.getByText("Confirmando o seu pagamento"), "cliente: ao voltar, avisa que está confirmando o pagamento");
  ok(!cli.url().includes("checkout=ok"), "cliente: o parâmetro de retorno sai do endereço");
  await cli.screenshot({ path: `${pasta}/pagamento-confirmando.png` });
  // O aviso do Stripe ativa a empresa (aqui pela equipe, que também esquece o cache do bloqueio, como o webhook faz)
  const resp = await fetch(`${API}/api/painel/clientes/${A.t.id}/status`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await tokenEquipe()}` }, body: JSON.stringify({ status: "ativo" }) });
  ok(resp.status === 200, "simulação do aviso do Stripe: a empresa foi ativada");
  await vejo(cli.locator('[data-nav-id="obras"]'), "cliente: a conta é liberada sozinha e o sistema abre, sem recarregar", 20000);
  ativarNaProximaConsulta = true; void ativarNaProximaConsulta;

  // Cancelou no pagamento hospedado
  await cli.goto(`${CLIENTE}/app/assinatura?checkout=cancelado`, { waitUntil: "networkidle" });
  await vejo(cli.getByText("Pagamento cancelado"), "cliente: voltar sem pagar mostra 'nada foi cobrado'");

  // Quem já assina no cartão: Gerenciar pagamento
  const ctxB = await browser.newContext({ viewport: { width: 1366, height: 1000 } });
  await ctxB.addInitScript(s => { try { localStorage.setItem("session", s); } catch {} }, await sessaoDe(B.u));
  const cb = await ctxB.newPage(); cb.on("pageerror", e => erros.push(`cliente cartão: ${e.message}`));
  await cb.route("**/api/assinatura/resumo", async route => { const r = await route.fetch(); const corpo = await r.json(); await route.fulfill({ response: r, json: { ...corpo, pagamento: { online: true, cartao: true } } }); });
  await cb.route("**/api/assinatura/portal", async route => { pedidos.portal++; await route.fulfill({ json: { url: "https://billing.stripe.test/p/ui_1" } }); });
  await cb.route("https://billing.stripe.test/**", route => route.fulfill({ contentType: "text/html", body: "<h1>Portal simulado</h1>" }));
  await cb.goto(`${CLIENTE}/app/assinatura`, { waitUntil: "networkidle" });
  await vejo(cb.getByRole("button", { name: "Gerenciar pagamento" }), "cliente no cartão: botão Gerenciar pagamento");
  await vejo(cb.getByText(/Para mudar de plano, escolha o novo plano: abrimos um chamado/), "cliente no cartão: mudar de plano continua por chamado (a equipe faz a troca)");
  await cb.getByRole("button", { name: "Gerenciar pagamento" }).click();
  await cb.waitForURL("https://billing.stripe.test/**", { timeout: 10000 });
  ok(pedidos.portal === 1, "cliente no cartão: Gerenciar pagamento abre o portal");
  await ctxB.close(); await ctxC.close();

  // ── Equipe ──
  await respirar(100);
  const ctxE = await browser.newContext({ viewport: { width: 1366, height: 1100 } });
  const eq = await ctxE.newPage(); eq.on("pageerror", e => erros.push(`painel: ${e.message}`));
  await eq.goto(`${PAINEL}/login`, { waitUntil: "networkidle" });
  await eq.getByLabel("E-mail").fill(equipeAdmin.email);
  await eq.locator("input[type=password]").fill(SENHA);
  await eq.getByRole("button", { name: "Entrar" }).click();
  await eq.waitForURL("**/visao-geral", { timeout: 15000 });
  await eq.goto(`${PAINEL}/chamados/${chamado.id}`, { waitUntil: "networkidle" });
  await vejo(eq.getByText("Enviada também por e-mail"), "painel: a resposta enviada mostra 'Enviada também por e-mail'");
  await vejo(eq.getByText("Não foi possível enviar por e-mail"), "painel: a que falhou mostra o aviso de falha");
  await vejo(eq.getByText("Recebida por e-mail"), "painel: a resposta do cliente que veio por e-mail mostra 'Recebida por e-mail'");
  await eq.screenshot({ path: `${pasta}/chamado-email.png` });
  await eq.goto(`${PAINEL}/clientes/${B.t.id}`, { waitUntil: "networkidle" });
  await vejo(eq.getByText("Cartão, pelo Stripe"), "painel: a empresa do Stripe mostra a cobrança pelo cartão");
  await vejo(eq.getByText("cus_ui_teste"), "painel: e o cliente do Stripe, para achar lá");
  await vejo(eq.getByText("Cobrada pelo Stripe"), "painel: a fatura é marcada como cobrada pelo Stripe");
  ok(!(await eq.getByRole("button", { name: "Registrar pagamento" }).count()) && !(await eq.getByRole("button", { name: "Nova cobrança" }).count()), "painel: sem registrar pagamento à mão nem nova cobrança para a fatura do Stripe");
  ok(!(await eq.getByText(/Todo dia/).count()), "painel: sem 'todo dia X' (o Stripe decide o vencimento)");
  await eq.getByRole("button", { name: "Alterar plano" }).click();
  const modal = eq.getByRole("dialog").last();
  await vejo(modal.getByText("Esta empresa é cobrada pelo Stripe"), "painel: Alterar plano avisa que o preço no Stripe também muda");
  ok(await modal.getByLabel("Ciclo").isDisabled(), "painel: o ciclo não pode ser trocado numa empresa do Stripe");
  await eq.screenshot({ path: `${pasta}/cliente-stripe.png` });
  await ctxE.close();
  ok(erros.length === 0, `sem erros de página${erros.length ? `: ${erros[0]}` : ""}`);
} finally {
  await browser.close();
  await prisma.tenant.deleteMany({ where: { id: { in: empresas }, cnpj: { startsWith: "TESTE-UIPG-" } } });
  await prisma.auditoriaEquipe.deleteMany({ where: { equipeId: { in: equipe } } });
  await prisma.equipeUsuario.deleteMany({ where: { id: { in: equipe }, email: { startsWith: marca } } });
  console.log("limpeza: empresas, chamado e equipe de teste apagados");
  await prisma.$disconnect();
}
console.log(totalFalhas() ? `\n${totalFalhas()} verificação(ões) com falha` : "\nTodas as verificações passaram");
process.exit(totalFalhas() ? 1 : 0);
