// Assinatura e cobrança pela interface (Playwright): o cliente vê o teste acabando, escolhe o plano (chamado pronto), atualiza o contato;
// a equipe ativa a assinatura com a primeira cobrança, registra o pagamento, gera o mês e exporta o CSV.
// Cria empresas e equipe de teste e apaga no fim.   npm run dev  e   node --env-file=.env scripts/painel/ui-assinatura.mjs
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
// Quando uma verificação falha, guarda a tela naquele instante (node_modules/.cache/painel-ui/falha-N.png) para ver o que apareceu no lugar
const vejo = async (loc, msg, ms = 10000) => {
  const achou = await loc.first().waitFor({ state: "visible", timeout: ms }).then(() => true, () => false);
  if (!achou) await loc.page().screenshot({ path: `${pasta}/falha-${++falhasVistas}.png` }).catch(() => {});
  return ok(achou, msg);
};
const sumiu = async (loc, msg, ms = 10000) => ok(await loc.first().waitFor({ state: "hidden", timeout: ms }).then(() => true, () => false), msg);

const empresas = [], hoje = hojeBR();
async function criarEmpresa(nome, dados, assinatura) {
  const t = await prisma.tenant.create({ data: { razaoSocial: `Teste UI Assinatura ${nome} ${marca}`, cnpj: `TESTE-UIASS-${marca}-${nome}`, email: `${marca}-${nome}@exemplo.test`, plano: "pro", ...dados } });
  empresas.push(t.id);
  const adm = await prisma.user.create({ data: { tenantId: t.id, nome: `Dono ${nome}`, email: `${marca}-${nome}-adm@exemplo.test`, senha: await bcrypt.hash(SENHA, 10), role: "tenant_admin", ocultarTour: true } });
  const comum = await prisma.user.create({ data: { tenantId: t.id, nome: `Pessoa ${nome}`, email: `${marca}-${nome}-u@exemplo.test`, senha: await bcrypt.hash(SENHA, 10), role: "user", permissoes: ["obras"], ocultarTour: true } });
  if (assinatura) await prisma.assinatura.create({ data: { tenantId: t.id, ...assinatura } });
  return { t, adm, comum };
}
const T = await criarEmpresa("alfa", { status: "trial", trialAte: somarDias(hoje, 3) });
const V = await criarEmpresa("beta", { status: "trial", trialAte: somarDias(hoje, -2) });
const U = await criarEmpresa("gama", { status: "ativo", plano: "starter", telefone: "5511987654321", aceiteMensagensEm: new Date(), aceiteMensagensTexto: "t" }, { valor: 149, diaVencimento: 10, ativadaEm: new Date() });
await prisma.cobranca.createMany({ data: [
  { tenantId: U.t.id, referencia: "2026-01", descricao: "Assinatura ConstruktPro Starter · 01/2026", plano: "starter", valor: 149, vencimento: "2026-01-10", status: "paga", pagaEm: "2026-01-09", valorPago: 149, forma: "pix" },
  { tenantId: U.t.id, referencia: "2026-02", descricao: "Assinatura ConstruktPro Starter · 02/2026", plano: "starter", valor: 149, vencimento: "2026-02-10", status: "aberta" },
] });
const equipe = await prisma.equipeUsuario.create({ data: { nome: "Carlos Financeiro", email: `${marca}-equipe@exemplo.test`, senha: await bcrypt.hash(SENHA, 10), papel: "equipe_admin", permissoes: IDS_PERMISSOES, trocarSenha: false } });

const sessaoDe = async u => {
  const r = await fetch(`${API}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: u.email, senha: SENHA }) }).then(x => x.json());
  return JSON.stringify({ token: r.token, refreshToken: r.refreshToken, user: r.user, tenant: r.tenant, tourPendente: false });
};
async function respirar(minimo = 90) {
  const r = await fetch(`${API}/api/health`);
  const sobra = Number(r.headers.get("ratelimit-remaining")), espera = Number(r.headers.get("ratelimit-reset"));
  if (sobra < minimo && espera > 0) await new Promise(res => setTimeout(res, (espera + 1) * 1000));
}

await respirar(120);
const browser = await chromium.launch();
try {
  const erros = [];
  const novaAba = async (ctx, rotulo) => { const p = await ctx.newPage(); p.on("pageerror", e => erros.push(`${rotulo}: ${e.message}`)); return p; };

  // ── Cliente (administrador, em teste com 3 dias) ──
  const ctxC = await browser.newContext({ viewport: { width: 1366, height: 1000 } });
  await ctxC.addInitScript(s => { try { localStorage.setItem("session", s); } catch {} }, await sessaoDe(T.adm));
  const cli = await novaAba(ctxC, "cliente");
  await cli.goto(`${CLIENTE}/app/dashboard`, { waitUntil: "networkidle" });
  await vejo(cli.getByText("Faltam 3 dias do seu teste grátis"), "cliente: o topo avisa quantos dias faltam do teste");
  await vejo(cli.locator('[data-nav-id="assinatura"]'), "cliente: o administrador vê Assinatura no menu");
  await cli.screenshot({ path: `${pasta}/assinatura-aviso-teste.png` });
  await cli.locator('[data-nav-id="usuarios"]').click();
  await vejo(cli.getByRole("button", { name: "Plano e assinatura" }), "cliente: Usuários aponta para a Assinatura");
  ok(!(await cli.getByRole("button", { name: "Alterar plano" }).count()), "cliente: o botão de mudar plano de mentira saiu de Usuários");
  await cli.getByRole("button", { name: "Plano e assinatura" }).click();
  await cli.waitForURL("**/app/assinatura");
  await vejo(cli.getByText("Seu plano", { exact: true }), "cliente: tela Assinatura");
  await vejo(cli.getByText("Escolha o seu plano"), "cliente: em teste, o título é 'Escolha o seu plano'");
  await vejo(cli.getByText("Teste até"), "cliente: mostra até quando vai o teste");
  await cli.screenshot({ path: `${pasta}/assinatura-cliente.png`, fullPage: true });
  await cli.getByRole("button", { name: "Assinar Business" }).click();
  await cli.waitForURL("**/app/suporte");
  const novo = cli.getByRole("dialog").last();
  await vejo(novo.getByLabel("Assunto"), "cliente: Assinar abre o novo chamado");
  ok((await novo.getByLabel("Assunto").inputValue()) === "Quero assinar o plano Business (mensal)" && (await novo.getByLabel("Setor").inputValue()) === "assinatura", "cliente: chamado já vem com plano, ciclo e setor Assinatura e cobrança");
  await novo.getByRole("button", { name: "Cancelar" }).click();
  await cli.locator('[data-nav-id="assinatura"]').click();
  await cli.getByRole("tab", { name: /^Anual/ }).click();
  await vejo(cli.getByText(/Cobrado uma vez por ano: R\$ 3348/), "cliente: no anual mostra o valor cobrado por ano");
  await cli.getByRole("button", { name: "Assinar Starter" }).click();
  await vejo(cli.getByRole("dialog").last().getByLabel("Assunto"), "cliente: Assinar no anual abre o chamado");
  ok((await cli.getByRole("dialog").last().getByLabel("Assunto").inputValue()) === "Quero assinar o plano Starter (anual)", "cliente: o ciclo anual vai no chamado");
  await cli.getByRole("dialog").last().getByRole("button", { name: "Cancelar" }).click();

  // Contato
  await cli.locator('[data-nav-id="assinatura"]').click();
  await cli.getByLabel("Telefone com DDD").fill("21912345678");
  ok((await cli.getByLabel("Telefone com DDD").inputValue()) === "(21) 91234-5678", "cliente: o telefone ganha máscara");
  await cli.getByText(/Aceito receber mensagens e notificações/).click();
  await cli.getByRole("button", { name: "Salvar contato" }).click();
  await vejo(cli.getByText("Você aceita receber mensagens e notificações do ConstruktPro"), "cliente: depois de salvar, mostra que aceitou");
  const salvo = await prisma.tenant.findUnique({ where: { id: T.t.id }, select: { telefone: true, aceiteMensagensEm: true } });
  ok(salvo.telefone === "5521912345678" && !!salvo.aceiteMensagensEm, "cliente: telefone e aceite gravados");

  // Usuário comum não vê
  const ctxU = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  await ctxU.addInitScript(s => { try { localStorage.setItem("session", s); } catch {} }, await sessaoDe(T.comum));
  const comum = await novaAba(ctxU, "usuário comum");
  await comum.goto(`${CLIENTE}/app/dashboard`, { waitUntil: "networkidle" });
  await vejo(comum.locator('[data-nav-id="dashboard"]'), "usuário comum: o sistema abre");
  ok(!(await comum.locator('[data-nav-id="assinatura"]').count()), "usuário comum: não vê Assinatura no menu");
  await comum.goto(`${CLIENTE}/app/assinatura`, { waitUntil: "networkidle" });
  await vejo(comum.getByText("Acesso não permitido."), "usuário comum: abrir a URL dá 'Acesso não permitido'");
  ok(!(await comum.getByText(/Faltam \d+ dias/).count()), "usuário comum: não recebe o aviso do teste (é do administrador)");
  await ctxU.close();

  // ── Equipe ──
  await respirar(100);
  const ctxE = await browser.newContext({ viewport: { width: 1366, height: 1000 } });
  const eq = await novaAba(ctxE, "painel");
  await eq.goto(`${PAINEL}/login`, { waitUntil: "networkidle" });
  await eq.getByLabel("E-mail").fill(equipe.email);
  await eq.locator("input[type=password]").fill(SENHA);
  await eq.getByRole("button", { name: "Entrar" }).click();
  await eq.waitForURL("**/visao-geral", { timeout: 15000 });
  await eq.locator('[data-nav-id="financeiro"]').click();
  await eq.waitForURL("**/financeiro");
  await vejo(eq.getByText("Receita mensal (MRR)"), "equipe: Financeiro mostra a receita mensal");
  await vejo(eq.getByText("Receita anual (ARR)"), "equipe: e a anual");
  await vejo(eq.getByText("Recebido nos últimos 6 meses"), "equipe: e o gráfico de recebido");
  await vejo(eq.getByText(/empresa\(s\) ativa\(s\) sem assinatura configurada/), "equipe: avisa das empresas ativas sem assinatura (ex.: as reais ainda não configuradas)");
  await eq.screenshot({ path: `${pasta}/financeiro-geral.png`, fullPage: true });

  // Ativar assinatura da empresa em teste
  await eq.locator('[data-nav-id="clientes"]').click();
  await eq.getByLabel("Buscar").fill(`${marca}-alfa`);
  await eq.getByRole("cell", { name: /Teste UI Assinatura alfa/ }).click();
  await eq.waitForURL(/\/clientes\/.+/);
  await vejo(eq.getByText("Não configurado (lista: R$ 349,00)"), "equipe: a empresa em teste não tem valor combinado, mostra o de lista");
  await eq.getByRole("button", { name: "Ativar assinatura" }).click();
  const modal = eq.getByRole("dialog").last();
  await vejo(modal.getByText(/Preço de lista: R\$\s349,00 por mês/), "equipe: o modal de ativação mostra o preço de lista");
  ok((await modal.getByLabel("Valor por mês").inputValue()).includes("349,00"), "equipe: o valor já vem preenchido com o de lista");
  await modal.getByLabel("Valor por mês").fill("32000");
  ok((await modal.getByLabel("Valor por mês").inputValue()).includes("320,00"), "equipe: digita o valor combinado (o campo trabalha em centavos)");
  await modal.getByRole("button", { name: "Ativar", exact: true }).click();
  await vejo(eq.getByText(/Cobranças · 1/), "equipe: a primeira cobrança foi criada com a ativação");
  await vejo(eq.getByRole("cell", { name: /Em aberto/ }), "equipe: a cobrança está em aberto");
  await eq.screenshot({ path: `${pasta}/cliente-cobrancas.png`, fullPage: true });
  const ass = await prisma.assinatura.findUnique({ where: { tenantId: T.t.id } });
  ok(!!ass && !!ass.ativadaEm && Number(ass.valor) === 320 && (await prisma.tenant.findUnique({ where: { id: T.t.id }, select: { status: true } })).status === "ativo", "equipe: ativou a empresa e criou a assinatura com o valor combinado");

  // Cliente vê a fatura e o teste deixa de ser aviso
  await cli.reload({ waitUntil: "networkidle" });
  ok(!(await cli.getByText(/dias do seu teste grátis/).count()), "cliente: depois de ativada, o aviso do teste some");
  await vejo(cli.getByText("Em aberto").first(), "cliente: a fatura aparece em aberto");
  await vejo(cli.getByText("Mudar de plano"), "cliente: ativa, o título passa a 'Mudar de plano'");

  // Registrar o pagamento
  await eq.getByRole("button", { name: "Registrar pagamento" }).click();
  const pag = eq.getByRole("dialog").last();
  await vejo(pag.getByLabel("Pago em"), "equipe: o modal de pagamento abre");
  await pag.getByRole("button", { name: "Registrar", exact: true }).click();
  await vejo(eq.getByRole("cell", { name: /Paga/ }), "equipe: a cobrança aparece como paga");
  await cli.reload({ waitUntil: "networkidle" });
  await vejo(cli.getByText(/pago em/), "cliente: a fatura aparece como paga");
  await cli.screenshot({ path: `${pasta}/assinatura-cliente-ativa.png`, fullPage: true });

  // Financeiro: cobranças, filtro, gerar o mês e CSV
  await eq.locator('[data-nav-id="financeiro"]').click();
  await eq.getByRole("tab", { name: "Cobranças" }).click();
  await eq.getByLabel("Buscar").fill(marca);
  await vejo(eq.getByRole("cell", { name: /Teste UI Assinatura gama/ }), "equipe: a lista de cobranças mostra as da empresa gama");
  await eq.getByRole("tab", { name: "Atrasadas" }).click();
  await vejo(eq.getByRole("cell", { name: /02\/2026/ }), "equipe: o filtro Atrasadas mostra a fatura vencida");
  await sumiu(eq.getByRole("cell", { name: /01\/2026/ }), "equipe: e esconde a paga");
  await eq.screenshot({ path: `${pasta}/financeiro-cobrancas.png` });
  await eq.getByRole("tab", { name: "Todas" }).click();
  await eq.getByRole("button", { name: "Gerar cobranças do mês" }).click();
  const gerar = eq.getByRole("dialog").last();
  await vejo(gerar.getByText(/Teste UI Assinatura gama/), "equipe: a prévia do mês lista a empresa gama (ativa, sem cobrança no mês)");
  ok(!(await gerar.getByText(/Teste UI Assinatura alfa/).count()), "equipe: a prévia não lista a que já tem cobrança no mês");
  await eq.screenshot({ path: `${pasta}/financeiro-gerar-mes.png` });
  await gerar.getByRole("button", { name: "Cancelar" }).click();
  const [baixa] = await Promise.all([eq.waitForEvent("download"), eq.getByRole("button", { name: "Exportar CSV" }).click()]);
  ok(/^cobrancas-\d{4}-\d{2}-\d{2}\.csv$/.test(baixa.suggestedFilename()), `equipe: o CSV baixa com o nome ${baixa.suggestedFilename()}`);

  // ── Teste vencido: a tela de bloqueio mostra os planos e a equipe libera ──
  await respirar(80);
  const ctxB = await browser.newContext({ viewport: { width: 1366, height: 1000 } });
  await ctxB.addInitScript(s => { try { localStorage.setItem("session", s); } catch {} }, await sessaoDe(V.adm));
  const cb = await novaAba(ctxB, "cliente vencido");
  await cb.goto(`${CLIENTE}/app/dashboard`, { waitUntil: "networkidle" });
  await vejo(cb.getByText("O seu teste grátis terminou"), "cliente vencido: tela de teste acabado");
  await vejo(cb.getByRole("button", { name: "Assinar Business" }), "cliente vencido: o administrador já escolhe o plano na tela de bloqueio");
  await cb.screenshot({ path: `${pasta}/assinatura-bloqueada.png`, fullPage: true });
  await cb.getByRole("button", { name: "Assinar Professional" }).click();
  const nb = cb.getByRole("dialog").last();
  await vejo(nb.getByLabel("Assunto"), "cliente vencido: Assinar abre o chamado na aba Suporte");
  ok((await nb.getByLabel("Assunto").inputValue()) === "Quero assinar o plano Professional (mensal)", "cliente vencido: o plano escolhido vai no chamado");
  await nb.getByRole("button", { name: "Cancelar" }).click();

  // ── Celular ──
  await respirar(60);
  const cel = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await cel.addInitScript(s => { try { localStorage.setItem("session", s); } catch {} }, await sessaoDe(U.adm));
  const m = await novaAba(cel, "celular");
  await m.goto(`${CLIENTE}/app/assinatura`, { waitUntil: "networkidle" });
  await vejo(m.getByText("Seu plano", { exact: true }), "celular: tela Assinatura");
  ok(!(await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)), "celular: Assinatura sem rolagem lateral");
  await m.screenshot({ path: `${pasta}/assinatura-celular.png`, fullPage: true });
  await m.getByRole("button", { name: "Notificações" }).click();
  const janela = m.getByRole("dialog", { name: "Notificações" });
  await vejo(janela, "celular: o sino do sistema abre");
  const caixa = await janela.boundingBox();
  ok(caixa && caixa.x >= 0 && caixa.x + caixa.width <= 390, "celular: a janela do sino do cliente não passa da borda da tela");
  await m.keyboard.press("Escape").catch(() => {});
  const celE = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const me = await novaAba(celE, "painel celular");
  await me.goto(`${PAINEL}/login`, { waitUntil: "networkidle" });
  await me.getByLabel("E-mail").fill(equipe.email);
  await me.locator("input[type=password]").fill(SENHA);
  await me.getByRole("button", { name: "Entrar" }).click();
  await me.waitForURL("**/visao-geral", { timeout: 15000 });
  await me.goto(`${PAINEL}/financeiro`, { waitUntil: "networkidle" });
  await vejo(me.getByText("Receita mensal (MRR)"), "celular: Financeiro no painel");
  ok(!(await me.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)), "celular: Financeiro sem rolagem lateral");
  await me.screenshot({ path: `${pasta}/financeiro-celular.png`, fullPage: true });
  await celE.close(); await cel.close(); await ctxB.close(); await ctxC.close(); await ctxE.close();
  ok(erros.length === 0, `sem erros de página${erros.length ? `: ${erros[0]}` : ""}`);
} finally {
  await browser.close();
  await prisma.tenant.deleteMany({ where: { id: { in: empresas }, cnpj: { startsWith: "TESTE-UIASS-" } } });
  await prisma.auditoriaEquipe.deleteMany({ where: { equipeId: equipe.id } });
  await prisma.equipeUsuario.deleteMany({ where: { id: equipe.id, email: { startsWith: marca } } });
  console.log("limpeza: empresas e equipe de teste apagadas");
  await prisma.$disconnect();
}
console.log(totalFalhas() ? `\n${totalFalhas()} verificação(ões) com falha` : "\nTodas as verificações passaram");
process.exit(totalFalhas() ? 1 : 0);
