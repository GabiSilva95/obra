// Clientes e ciclo de vida pela interface (Playwright): a equipe suspende, estende, reativa e entra como o cliente,
// e o cliente, em outro navegador, vê a tela de conta bloqueada e volta quando liberam.
// Cria empresas e equipe de teste e apaga no fim.   npm run dev  e   node --env-file=.env scripts/painel/ui-clientes.mjs
// Cliente em http://localhost:3000, painel em http://painel.localhost:3000. Capturas em node_modules/.cache/painel-ui.
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
async function criarEmpresa(nome, dados) {
  const t = await prisma.tenant.create({ data: { razaoSocial: `Teste UI Clientes ${nome} ${marca}`, cnpj: `TESTE-UICLI-${marca}-${nome}`, email: `${marca}-${nome}@exemplo.test`, plano: "pro", telefone: "5511987654321", aceiteMensagensEm: new Date(), aceiteMensagensTexto: "teste", ...dados } });
  empresas.push(t.id);
  const u = await prisma.user.create({ data: { tenantId: t.id, nome: `Dono ${nome}`, email: `${marca}-${nome}-adm@exemplo.test`, senha: await bcrypt.hash(SENHA, 10), role: "tenant_admin", ocultarTour: true } });
  return { t, u };
}
const e1 = await criarEmpresa("alfa", { status: "trial", trialAte: somarDias(hoje, 10) });
const e2 = await criarEmpresa("beta", { status: "trial", trialAte: somarDias(hoje, -2) });
const equipe = await prisma.equipeUsuario.create({ data: { nome: "Carlos Atendente", email: `${marca}-equipe@exemplo.test`, senha: await bcrypt.hash(SENHA, 10), papel: "equipe_admin", permissoes: IDS_PERMISSOES, trocarSenha: false } });
const chamado = await prisma.ticket.create({ data: { tenantId: e1.t.id, abertoPorId: e1.u.id, canal: "ticket", assunto: "Preciso de ajuda com a obra", setor: "obras", status: "aberto", prioridade: "normal", plano: "pro", naoLidoEquipe: 1 } });
await prisma.ticketMensagem.create({ data: { ticketId: chamado.id, tenantId: e1.t.id, autorTipo: "cliente", autorUserId: e1.u.id, autorNome: e1.u.nome, texto: "Não acho onde cadastro a etapa." } });

const sessaoDe = async u => {
  const r = await fetch(`${API}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: u.email, senha: SENHA }) }).then(x => x.json());
  return JSON.stringify({ token: r.token, refreshToken: r.refreshToken, user: r.user, tenant: r.tenant, tourPendente: false });
};

/** A API de desenvolvimento limita 200 requisições por minuto por IP; as telas fazem muitas. Espera a janela renovar quando está perto do teto. */
async function respirar(minimo = 90) {
  const r = await fetch(`${API}/api/health`);
  const sobra = Number(r.headers.get("ratelimit-remaining")), espera = Number(r.headers.get("ratelimit-reset"));
  if (sobra < minimo && espera > 0) await new Promise(res => setTimeout(res, (espera + 1) * 1000));
}

await respirar(120); // uma execução logo depois de outra ainda carrega as requisições da anterior
const browser = await chromium.launch();
try {
  const erros = [];
  const novaAba = async (ctx, rotulo) => { const p = await ctx.newPage(); p.on("pageerror", e => erros.push(`${rotulo}: ${e.message}`)); return p; };

  // ── Equipe ──
  const ctxE = await browser.newContext({ viewport: { width: 1366, height: 1000 } });
  const eq = await novaAba(ctxE, "painel");
  await eq.goto(`${PAINEL}/login`, { waitUntil: "networkidle" });
  await eq.getByLabel("E-mail").fill(equipe.email);
  await eq.locator("input[type=password]").fill(SENHA);
  await eq.getByRole("button", { name: "Entrar" }).click();
  await eq.waitForURL("**/visao-geral", { timeout: 15000 });
  await eq.locator('[data-nav-id="clientes"]').click();
  await eq.waitForURL("**/clientes");
  await vejo(eq.getByRole("tab", { name: /^Todas/ }), "equipe: tela Clientes com as abas de situação");
  await eq.getByLabel("Buscar").fill(marca);
  await vejo(eq.getByRole("cell", { name: /Teste UI Clientes alfa/ }), "equipe: a busca acha a empresa em teste");
  await vejo(eq.getByRole("cell", { name: /Teste UI Clientes beta/ }), "equipe: e a de teste vencido");
  await vejo(eq.getByText("faltam 10 dias"), "equipe: mostra quantos dias faltam do teste");
  await vejo(eq.getByText("acabou há 2 dias"), "equipe: e quando o teste acabou");
  await vejo(eq.getByText("Teste acabado").last(), "equipe: situação 'Teste acabado' do vencido");
  await eq.getByRole("tab", { name: /^Teste acabado/ }).click();
  await vejo(eq.getByRole("cell", { name: /Teste UI Clientes beta/ }), "equipe: o filtro Teste acabado mostra o vencido");
  await sumiu(eq.getByRole("cell", { name: /Teste UI Clientes alfa/ }), "equipe: e esconde o que está em dia");
  await eq.screenshot({ path: `${pasta}/clientes-lista.png` });
  await eq.getByRole("tab", { name: /^Todas/ }).click();

  await eq.getByRole("cell", { name: /Teste UI Clientes alfa/ }).click();
  await eq.waitForURL(/\/clientes\/.+/);
  await vejo(eq.getByRole("heading", { name: "Assinatura" }).or(eq.getByText("Assinatura", { exact: true })), "equipe: detalhe da empresa abre");
  await vejo(eq.getByText("Aceitou em"), "equipe: vê o aceite de mensagens");
  await vejo(eq.getByText("(11) 98765-4321"), "equipe: vê o telefone formatado");
  await vejo(eq.getByRole("cell", { name: "Preciso de ajuda com a obra" }), "equipe: vê os chamados da empresa");
  await eq.screenshot({ path: `${pasta}/cliente-detalhe.png`, fullPage: true });

  // Cliente alfa abre o sistema normalmente (navegador separado)
  const ctxC = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  await ctxC.addInitScript(s => { try { localStorage.setItem("session", s); } catch {} }, await sessaoDe(e1.u));
  const cli = await novaAba(ctxC, "cliente");
  await cli.goto(`${CLIENTE}/app/dashboard`, { waitUntil: "networkidle" });
  await vejo(cli.locator('[data-nav-id="obras"]'), "cliente: o sistema abre normalmente com o teste em dia");

  // Notas internas
  await eq.getByLabel("Notas internas").fill("Prefere WhatsApp");
  await eq.getByRole("button", { name: "Salvar notas" }).click();
  await vejo(eq.getByRole("button", { name: "Salvar notas" }).and(eq.locator("[disabled]")), "equipe: notas salvas (botão volta a desabilitado)");

  // Suspender
  await eq.getByRole("button", { name: "Suspender", exact: true }).click();
  const susp = eq.getByRole("dialog").last();
  await vejo(susp.getByText("O cliente perde o acesso na hora"), "equipe: o modal avisa o efeito da suspensão");
  ok(await susp.getByRole("button", { name: "Suspender", exact: true }).isDisabled(), "equipe: suspender exige o motivo (botão desabilitado)");
  await susp.getByLabel("Motivo").fill("Pagamento não confirmado");
  await susp.getByRole("button", { name: "Suspender", exact: true }).click();
  await vejo(eq.getByText("Esta conta está bloqueada"), "equipe: o detalhe mostra a conta bloqueada");
  await vejo(eq.getByText("Motivo registrado: Pagamento não confirmado"), "equipe: e o motivo registrado");
  await eq.screenshot({ path: `${pasta}/cliente-suspenso.png` });

  // O cliente, sem recarregar, cai na tela de bloqueio ao mudar de tela
  await cli.locator('[data-nav-id="obras"]').click();
  await vejo(cli.getByText("A sua conta está suspensa"), "cliente: ao navegar, cai na tela de conta suspensa", 15000);
  ok(!(await cli.getByText("Pagamento não confirmado").count()), "cliente: não vê o motivo interno");
  ok(await cli.locator('[data-nav-id="obras"]').count() === 0, "cliente: o menu do sistema some");
  await cli.screenshot({ path: `${pasta}/cliente-bloqueado.png` });
  await cli.getByRole("button", { name: "Já foi liberado" }).click();
  await vejo(cli.getByText("A conta ainda está bloqueada"), "cliente: 'Já foi liberado' avisa que ainda está bloqueada");
  await cli.getByRole("button", { name: "Entendi" }).click();

  // Pedido de ajuda já preenchido
  await cli.getByRole("button", { name: "Quero regularizar" }).click();
  const novo = cli.getByRole("dialog").last();
  await vejo(novo.getByLabel("Assunto"), "cliente: abre o novo chamado");
  ok((await novo.getByLabel("Assunto").inputValue()).includes("regularizar") && (await novo.getByLabel("Setor").inputValue()) === "assinatura", "cliente: o chamado já vem com assunto e setor Assinatura e cobrança");
  await cli.screenshot({ path: `${pasta}/cliente-bloqueado-chamado.png` });
  await novo.getByRole("button", { name: "Cancelar" }).click();
  await cli.getByRole("tab", { name: "Minha assinatura" }).click();
  await cli.getByRole("tab", { name: "Suporte" }).click();
  ok(!(await cli.getByRole("dialog").count()), "cliente: o pedido pronto não reabre ao voltar à aba");

  // Entrar como o cliente (leitura), com a conta suspensa
  await respirar(60);
  await eq.getByRole("button", { name: "Entrar como o cliente" }).click();
  const entrar = eq.getByRole("dialog").last();
  await vejo(entrar.getByText("Só leitura, por causa de um chamado"), "equipe: o modal explica o modo leitura");
  ok((await entrar.getByLabel("Chamado").locator("option").allTextContents()).some(t => /#\d+ · Preciso de ajuda com a obra/.test(t)), "equipe: pede o chamado ligado ao acesso");
  const [aba] = await Promise.all([ctxE.waitForEvent("page"), entrar.getByRole("button", { name: "Entrar em modo leitura" }).click()]);
  aba.on("pageerror", e => erros.push(`leitura: ${e.message}`));
  await aba.waitForURL(/\/app\/dashboard/, { timeout: 15000 });
  await vejo(aba.getByText(/Modo leitura: Teste UI Clientes alfa/), "leitura: a faixa de modo leitura aparece", 15000);
  await vejo(aba.getByText(/por causa do chamado #\d+/), "leitura: diz o chamado");
  await vejo(aba.getByText(/Para o cliente, esta conta está bloqueada \(suspensa\)/), "leitura: avisa que a conta está bloqueada para o cliente");
  await vejo(aba.locator('[data-nav-id="obras"]'), "leitura: mesmo suspensa, a equipe vê o sistema do cliente");
  ok(!aba.url().includes("leitura="), "leitura: o acesso sai do endereço depois de lido");
  ok(await aba.evaluate(() => !localStorage.getItem("session")), "leitura: não grava sessão no armazenamento do navegador");
  const bloqueio = await aba.evaluate(async () => {
    const d = JSON.parse(sessionStorage.getItem("construktpro:leitura"));
    const r = await fetch("/api/obras", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${d.token}` }, body: JSON.stringify({ nome: "x" }) });
    return { status: r.status, corpo: await r.json() };
  });
  ok(bloqueio.status === 403 && bloqueio.corpo.codigo === "MODO_LEITURA", "leitura: tentar criar algo é recusado pelo servidor");
  await aba.screenshot({ path: `${pasta}/modo-leitura.png` });
  await aba.locator('[data-nav-id="financeiro"]').click();
  await vejo(aba.getByRole("heading", { name: /Financeiro/ }).or(aba.getByText("Contas a pagar").first()), "leitura: navega pelas telas do cliente", 15000);
  await aba.close();
  // O cliente foi avisado no chamado
  await cli.reload({ waitUntil: "networkidle" });
  const msg = await prisma.ticketMensagem.findFirst({ where: { ticketId: chamado.id, autorTipo: "sistema" }, select: { texto: true } });
  ok(!!msg && /consultou a sua conta em modo leitura/.test(msg.texto), "o chamado ganhou o aviso de que a conta foi consultada");

  // Reativar: o cliente volta
  await eq.getByRole("button", { name: "Reativar conta" }).click();
  await eq.getByRole("alertdialog").getByRole("button", { name: "Ativar" }).click();
  await sumiu(eq.getByText("Esta conta está bloqueada"), "equipe: depois de reativar, a empresa deixa de aparecer bloqueada");
  await cli.getByRole("button", { name: "Já foi liberado" }).click();
  await vejo(cli.locator('[data-nav-id="obras"]'), "cliente: 'Já foi liberado' reabre o sistema completo", 15000);
  await vejo(cli.getByText("Início").first(), "cliente: está de volta ao sistema");
  await cli.screenshot({ path: `${pasta}/cliente-liberado.png` });

  // ── Teste vencido: login pela tela, bloqueio, estender, volta ──
  await respirar(110);
  const ctxB = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const cb = await novaAba(ctxB, "cliente beta");
  await cb.goto(`${CLIENTE}/login`, { waitUntil: "networkidle" });
  await cb.getByLabel("E-mail").fill(e2.u.email);
  await cb.locator("input[type=password]").fill(SENHA);
  await cb.getByRole("button", { name: "Entrar" }).click();
  await vejo(cb.getByText("O seu teste grátis terminou"), "cliente com teste vencido: o login leva à tela de teste acabado", 15000);
  await vejo(cb.getByRole("button", { name: "Quero assinar" }), "cliente com teste vencido: oferece assinar");
  await vejo(cb.getByText(/Os seus dados estão guardados/).first(), "cliente com teste vencido: tranquiliza que os dados estão guardados");
  await cb.screenshot({ path: `${pasta}/cliente-teste-acabado.png` });
  await eq.getByRole("button", { name: "Voltar" }).click();
  await eq.getByLabel("Buscar").fill(marca);
  await eq.getByRole("cell", { name: /Teste UI Clientes beta/ }).click();
  await eq.getByRole("button", { name: "Estender teste" }).click();
  const est = eq.getByRole("dialog").last();
  await vejo(est.getByText(/o teste já acabou|começa de hoje|a partir de hoje/i), "equipe: o modal explica que um teste vencido recomeça de hoje");
  await est.getByRole("button", { name: "Estender", exact: true }).click();
  await vejo(eq.getByText(/faltam 7 dias/), "equipe: o teste foi estendido (a tela mostra os dias novos)");
  await cb.getByRole("button", { name: "Já foi liberado" }).click();
  await vejo(cb.locator('[data-nav-id="obras"]'), "cliente com teste vencido: depois de estendido, entra no sistema", 15000);

  // ── Celular ──
  await respirar();
  const cel = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await cel.addInitScript(s => { try { localStorage.setItem("session", s); } catch {} }, await sessaoDe(e2.u));
  // beta está liberado agora: a equipe suspende (pela API do painel, que esquece o cache da conta) só para ver a tela no celular
  const tokenEquipe = (await fetch(`${API}/api/painel/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: equipe.email, senha: SENHA }) }).then(x => x.json())).token;
  const rs = await fetch(`${API}/api/painel/clientes/${e2.t.id}/status`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenEquipe}` }, body: JSON.stringify({ status: "suspenso", motivo: "teste no celular" }) });
  ok(rs.status === 200, `celular: a equipe suspendeu a empresa de teste (resposta ${rs.status})`);
  const m = await novaAba(cel, "celular");
  await m.goto(`${CLIENTE}/app/dashboard`, { waitUntil: "networkidle" });
  await vejo(m.getByText("A sua conta está suspensa"), "celular: tela de conta bloqueada");
  ok(!(await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)), "celular: bloqueio sem rolagem lateral");
  await m.screenshot({ path: `${pasta}/cliente-bloqueado-celular.png` });
  const celE = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const me = await novaAba(celE, "painel celular");
  await me.goto(`${PAINEL}/login`, { waitUntil: "networkidle" });
  await me.getByLabel("E-mail").fill(equipe.email);
  await me.locator("input[type=password]").fill(SENHA);
  await me.getByRole("button", { name: "Entrar" }).click();
  await me.waitForURL("**/visao-geral", { timeout: 15000 });
  await me.goto(`${PAINEL}/clientes`, { waitUntil: "networkidle" });
  await vejo(me.getByRole("tab", { name: /^Todas/ }), "celular: Clientes no painel");
  ok(!(await me.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)), "celular: Clientes sem rolagem lateral");
  await me.screenshot({ path: `${pasta}/clientes-celular.png` });
  await me.goto(`${PAINEL}/clientes/${e1.t.id}`, { waitUntil: "networkidle" });
  await vejo(me.getByText("Aceitou em"), "celular: detalhe da empresa");
  ok(!(await me.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)), "celular: detalhe sem rolagem lateral");
  await me.screenshot({ path: `${pasta}/cliente-detalhe-celular.png`, fullPage: true });
  await celE.close(); await cel.close(); await ctxB.close(); await ctxC.close(); await ctxE.close();
  ok(erros.length === 0, `sem erros de página${erros.length ? `: ${erros[0]}` : ""}`);
} finally {
  await browser.close();
  await prisma.tenant.deleteMany({ where: { id: { in: empresas }, cnpj: { startsWith: "TESTE-UICLI-" } } });
  await prisma.auditoriaEquipe.deleteMany({ where: { equipeId: equipe.id } });
  await prisma.equipeUsuario.deleteMany({ where: { id: equipe.id, email: { startsWith: marca } } });
  console.log("limpeza: empresas e equipe de teste apagadas");
  await prisma.$disconnect();
}
console.log(totalFalhas() ? `\n${totalFalhas()} verificação(ões) com falha` : "\nTodas as verificações passaram");
process.exit(totalFalhas() ? 1 : 0);
