// Visão geral do painel, o sino e o acabamento pela interface (Playwright): áreas por permissão, listas de contato, pendências no sino,
// a coluna Empresa da auditoria e uma varredura de todas as telas do painel no celular (sem rolagem lateral).
// Cria empresas, chamados e equipe de teste e apaga no fim.   npm run dev  e   node --env-file=.env scripts/painel/ui-visao-geral.mjs
import bcrypt from "bcryptjs";
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import prisma from "../../server/db.js";
import { IDS_PERMISSOES } from "../../server/config/painel.js";
import { hojeBR, somarDias } from "../../server/utils/datas.js";
import { marca, ok, totalFalhas } from "./lib.mjs";

const PAINEL = process.env.PAINEL_URL || "http://painel.localhost:3000";
const API = (process.env.CLIENTE_URL || "http://localhost:3000").replace("3000", "3002");
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

const hoje = hojeBR(), agora = Date.now(), DIA = 86400000, H = 3600000, empresas = [], equipe = [];
async function criarEquipe(nome, perms, papel = "atendente") {
  const e = await prisma.equipeUsuario.create({ data: { nome: `Equipe ${nome}`, email: `${marca}-${nome}@exemplo.test`, senha: await bcrypt.hash(SENHA, 10), papel, permissoes: perms, trocarSenha: false } });
  equipe.push(e.id);
  return e;
}
async function criarEmpresa(nome, dados = {}) {
  const t = await prisma.tenant.create({ data: { razaoSocial: `Teste UI Visao ${nome} ${marca}`, cnpj: `TESTE-UIVG-${marca}-${nome}`, email: `${marca}-${nome}@exemplo.test`, plano: "pro", status: "ativo", telefone: "5511987654321", ...dados } });
  empresas.push(t.id);
  const u = await prisma.user.create({ data: { tenantId: t.id, nome: `Dono ${nome}`, email: `${marca}-${nome}-adm@exemplo.test`, senha: await bcrypt.hash(SENHA, 10), role: "tenant_admin" } });
  return { t, u };
}
const admin = await criarEquipe("admin", IDS_PERMISSOES, "equipe_admin");
const soSuporte = await criarEquipe("sup", ["suporte"]);
const comercial = await criarEquipe("com", ["clientes", "financeiro"]);
const A = await criarEmpresa("alfa", { status: "trial", trialAte: somarDias(hoje, 1) });
await criarEmpresa("beta", { status: "trial", trialAte: somarDias(hoje, -4) });
const D = await criarEmpresa("delta", { ultimoAcessoEm: new Date(agora - 40 * DIA) });
await prisma.assinatura.create({ data: { tenantId: D.t.id, valor: 349 } });
await prisma.cobranca.create({ data: { tenantId: D.t.id, referencia: "2026-01", descricao: "Assinatura teste", plano: "pro", valor: 349, vencimento: somarDias(hoje, -12) } });
const tk = (o = {}) => prisma.ticket.create({ data: { tenantId: A.t.id, abertoPorId: A.u.id, canal: "ticket", assunto: "Chamado de teste da visão geral", setor: "financeiro", plano: "pro", status: "aberto", naoLidoEquipe: 1, ...o } });
const chamado = await tk({ entrouNaFilaEm: new Date(agora - 30 * H), createdAt: new Date(agora - 30 * H) });
await prisma.ticketMensagem.create({ data: { ticketId: chamado.id, tenantId: A.t.id, autorTipo: "cliente", autorUserId: A.u.id, autorNome: A.u.nome, texto: "Preciso de ajuda." } });
await tk({ canal: "chat", status: "na_fila", assunto: "Chat de teste", setor: "obras", ultimoSinalClienteEm: new Date(agora + 3600000) });
await prisma.auditoriaEquipe.create({ data: { equipeId: admin.id, acao: "cliente_notas", alvoTipo: "empresa", alvoId: A.t.id, tenantId: A.t.id, detalhe: `${marca} auditoria com empresa` } });

await respirar(120);
const browser = await chromium.launch();
try {
  const erros = [];
  const entrar = async (ctx, pessoa, rotulo, esperar = "**/*") => {
    const p = await ctx.newPage(); p.on("pageerror", e => erros.push(`${rotulo}: ${e.message}`));
    await p.goto(`${PAINEL}/login`, { waitUntil: "networkidle" });
    await p.getByLabel("E-mail").fill(pessoa.email);
    await p.locator("input[type=password]").fill(SENHA);
    await p.getByRole("button", { name: "Entrar" }).click();
    await p.waitForURL(esperar, { timeout: 15000 });
    return p;
  };

  // ── Administrador no computador ──
  const ctxA = await browser.newContext({ viewport: { width: 1366, height: 1100 } });
  const ad = await entrar(ctxA, admin, "administrador", "**/visao-geral");
  ok(ad.url().endsWith("/visao-geral"), "administrador: a Visão geral abre ao entrar");
  const itensMenu = await ad.locator("[data-nav-id]").evaluateAll(els => els.map(e => e.getAttribute("data-nav-id")));
  ok(itensMenu[0] === "visao-geral" && itensMenu[1] === "atendimento", `administrador: a Visão geral é a primeira do menu (${itensMenu.slice(0, 3).join(", ")})`);
  await vejo(ad.getByRole("heading", { name: "Atendimento", exact: true }), "visão geral: área Atendimento");
  await vejo(ad.getByRole("heading", { name: "Clientes", exact: true }), "visão geral: área Clientes");
  await vejo(ad.getByRole("heading", { name: "Financeiro", exact: true }), "visão geral: área Financeiro");
  await vejo(ad.getByText("Na fila do chat"), "atendimento: cartão da fila do chat");
  await vejo(ad.getByText(/Prazo estourado/).first(), "atendimento: cartão de prazo estourado");
  await vejo(ad.getByText("Respondidos dentro do prazo do plano"), "atendimento: cumprimento do prazo");
  await vejo(ad.getByText("Chamados e chats por dia (14 dias)"), "atendimento: gráfico por dia");
  await vejo(ad.getByRole("cell", { name: "Financeiro", exact: true }).first(), "atendimento: tabela por setor");
  await vejo(ad.getByText(/Teste acabando em até 3 dias · /), "clientes: lista de teste acabando, com a contagem");
  await vejo(ad.getByRole("cell", { name: /Teste UI Visao alfa/ }).first(), "clientes: a empresa com teste acabando aparece");
  await vejo(ad.getByText("(11) 98765-4321").first(), "clientes: com o telefone para ligar");
  await vejo(ad.getByRole("cell", { name: /Teste UI Visao beta/ }).first(), "clientes: o teste que acabou há pouco aparece");
  await vejo(ad.getByRole("cell", { name: /Teste UI Visao delta/ }).first(), "clientes: a ativa sem acesso há 40 dias aparece");
  await vejo(ad.getByText("Receita mensal (MRR)").first(), "financeiro: receita mensal na visão geral");
  await ad.screenshot({ path: `${pasta}/visao-geral.png`, fullPage: true });
  // período
  await ad.getByRole("tab", { name: "7 dias" }).click();
  await vejo(ad.getByText("Agora e nos últimos 7 dias"), "visão geral: o período de 7 dias atualiza o título");
  await ad.getByRole("tab", { name: "30 dias" }).click();
  // atalhos
  await ad.getByRole("cell", { name: /Teste UI Visao alfa/ }).first().click();
  await ad.waitForURL(/\/clientes\/.+/);
  ok(true, "clientes: clicar numa empresa da lista abre o detalhe dela");
  await ad.goBack();
  await ad.getByRole("button", { name: "Abrir financeiro" }).click();
  await ad.waitForURL("**/financeiro");
  ok(true, "financeiro: o atalho abre a tela completa");

  // sino
  await ad.getByRole("button", { name: "Pendências da equipe" }).click();
  const sino = ad.getByRole("dialog", { name: "Pendências da equipe" });
  await vejo(sino.getByText(/na fila do chat/), "sino: avisa quem está na fila do chat");
  await vejo(sino.getByText(/sem resposta/), "sino: avisa os chamados sem resposta");
  await vejo(sino.getByText(/teste acabando em até 3 dias/), "sino: avisa o teste acabando");
  await vejo(sino.getByText(/em atraso/), "sino: avisa cobrança em atraso");
  await ad.screenshot({ path: `${pasta}/sino-painel.png` });
  await sino.getByText(/na fila do chat/).click();
  await ad.waitForURL("**/atendimento");
  ok(true, "sino: clicar leva à tela certa");

  // auditoria com empresa
  await ad.locator('[data-nav-id="auditoria"]').click();
  await vejo(ad.getByRole("columnheader", { name: "Empresa" }), "auditoria: coluna Empresa");
  await vejo(ad.getByRole("button", { name: /Teste UI Visao alfa/ }).first(), "auditoria: a linha traz o nome da empresa, com atalho");
  await ctxA.close();

  // ── Quem só atende ──
  await respirar(100);
  const ctxS = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const su = await entrar(ctxS, soSuporte, "suporte", "**/atendimento");
  await vejo(su.locator('[data-nav-id="atendimento"]'), "suporte: abre no Atendimento");
  ok(!(await su.locator('[data-nav-id="visao-geral"]').count()) && !(await su.locator('[data-nav-id="financeiro"]').count()) && !(await su.locator('[data-nav-id="clientes"]').count()), "suporte: o menu só tem o que ele pode usar");
  await su.goto(`${PAINEL}/visao-geral`, { waitUntil: "networkidle" });
  await vejo(su.getByText("Acesso não permitido."), "suporte: abrir a Visão geral pela URL dá 'Acesso não permitido'");
  await su.getByRole("button", { name: "Pendências da equipe" }).click();
  const sinoS = su.getByRole("dialog", { name: "Pendências da equipe" });
  await vejo(sinoS.getByText(/na fila do chat/), "suporte: o sino mostra a fila");
  ok(!(await sinoS.getByText(/em atraso|teste acabando/).count()), "suporte: o sino não mostra cobrança nem teste");
  await ctxS.close();

  // ── Comercial (clientes e financeiro, sem atendimento) ──
  await respirar(100);
  const ctxC = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const co = await entrar(ctxC, comercial, "comercial", "**/visao-geral");
  ok(co.url().endsWith("/visao-geral"), "comercial: sem atendimento, abre na Visão geral");
  await vejo(co.getByRole("heading", { name: "Clientes", exact: true }), "comercial: vê Clientes");
  await vejo(co.getByRole("heading", { name: "Financeiro", exact: true }), "comercial: vê Financeiro");
  ok(!(await co.getByRole("heading", { name: "Atendimento", exact: true }).count()), "comercial: não vê a área Atendimento");
  await ctxC.close();

  // ── Celular: todas as telas do painel, sem rolagem lateral ──
  await respirar(110);
  const cel = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const m = await entrar(cel, admin, "celular", "**/visao-geral");
  const rotas = ["atendimento", "visao-geral", "chamados", `chamados/${chamado.id}`, "clientes", `clientes/${A.t.id}`, "financeiro", "equipe", "auditoria"];
  for (const rota of rotas) {
    await m.goto(`${PAINEL}/${rota}`, { waitUntil: "networkidle" });
    await m.waitForTimeout(500);
    const largura = await m.evaluate(() => ({ pagina: document.documentElement.scrollWidth, janela: window.innerWidth }));
    ok(largura.pagina <= largura.janela, `celular: /${rota} sem rolagem lateral (${largura.pagina} de ${largura.janela})`);
    if (["visao-geral", "financeiro", "clientes"].includes(rota)) await m.screenshot({ path: `${pasta}/celular-${rota}.png`, fullPage: true });
  }
  await m.goto(`${PAINEL}/visao-geral`, { waitUntil: "networkidle" });
  await m.getByRole("button", { name: "Pendências da equipe" }).click();
  await vejo(m.getByRole("dialog", { name: "Pendências da equipe" }).getByText(/na fila do chat/), "celular: o sino abre e cabe na tela");
  const caixa = await m.getByRole("dialog", { name: "Pendências da equipe" }).boundingBox();
  ok(caixa && caixa.x >= 0 && caixa.x + caixa.width <= 390, "celular: a janela do sino não passa da borda");
  await m.screenshot({ path: `${pasta}/celular-sino.png` });
  await cel.close();
  ok(erros.length === 0, `sem erros de página${erros.length ? `: ${erros[0]}` : ""}`);
} finally {
  await browser.close();
  await prisma.tenant.deleteMany({ where: { id: { in: empresas }, cnpj: { startsWith: "TESTE-UIVG-" } } });
  await prisma.auditoriaEquipe.deleteMany({ where: { equipeId: { in: equipe } } });
  await prisma.equipeUsuario.deleteMany({ where: { id: { in: equipe }, email: { startsWith: marca } } });
  console.log("limpeza: empresas, chamados e equipe de teste apagados");
  await prisma.$disconnect();
}
console.log(totalFalhas() ? `\n${totalFalhas()} verificação(ões) com falha` : "\nTodas as verificações passaram");
process.exit(totalFalhas() ? 1 : 0);
