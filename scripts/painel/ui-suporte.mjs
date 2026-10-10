// O suporte pela interface, dos dois lados ao mesmo tempo (Playwright): o cliente abre chamado e entra na fila; a equipe vê, responde e atende.
// Cria uma empresa e uma equipe de teste e apaga no fim.   npm run dev  e   node --env-file=.env scripts/painel/ui-suporte.mjs
// Cliente em http://localhost:3000, painel em http://painel.localhost:3000. Capturas em node_modules/.cache/painel-ui.
import bcrypt from "bcryptjs";
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import prisma from "../../server/db.js";
import { IDS_PERMISSOES } from "../../server/config/painel.js";
import { marca, ok, totalFalhas } from "./lib.mjs";

const CLIENTE = process.env.CLIENTE_URL || "http://localhost:3000";
const PAINEL = process.env.PAINEL_URL || "http://painel.localhost:3000";
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

const tenant = await prisma.tenant.create({ data: { razaoSocial: `Teste UI Suporte ${marca}`, cnpj: `TESTE-UISUP-${marca}`, email: `${marca}-cli@exemplo.test`, plano: "pro" } });
const usuario = await prisma.user.create({ data: { tenantId: tenant.id, nome: "Marina Cliente", email: `${marca}-cli@exemplo.test`, senha: await bcrypt.hash(SENHA, 10), role: "tenant_admin", ocultarTour: true } });
const equipe = await prisma.equipeUsuario.create({ data: { nome: "Carlos Atendente", email: `${marca}-equipe@exemplo.test`, senha: await bcrypt.hash(SENHA, 10), papel: "equipe_admin", permissoes: IDS_PERMISSOES, trocarSenha: false } });
// O chat só abre em horário comercial: abre para o dia todo apenas nesta execução, restaurando depois
const cfgAntes = await prisma.configAtendimento.findUnique({ where: { id: 1 } });
await prisma.configAtendimento.upsert({ where: { id: 1 }, update: { horario: Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map(d => [d, ["00:00", "24:00"]])) }, create: { id: 1, horario: Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map(d => [d, ["00:00", "24:00"]])), capacidade: 3 } });

const browser = await chromium.launch();
try {
  // ── Cliente ──
  const ctxC = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const cli = await ctxC.newPage();
  const erros = []; cli.on("pageerror", e => erros.push(e.message));
  const login = await fetch(`${CLIENTE.replace("3000", "3002")}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: usuario.email, senha: SENHA }) }).then(r => r.json());
  await ctxC.addInitScript(s => { try { localStorage.setItem("session", s); } catch {} }, JSON.stringify({ token: login.token, refreshToken: login.refreshToken, user: login.user, tenant: login.tenant, tourPendente: false }));
  await cli.goto(`${CLIENTE}/app/dashboard`, { waitUntil: "networkidle" });
  await cli.locator('[data-nav-id="suporte"]').click();
  await cli.waitForURL("**/app/suporte");
  await vejo(cli.getByRole("heading", { name: "Abrir um chamado" }), "cliente: tela Suporte com as duas opções");
  await vejo(cli.getByRole("heading", { name: "Falar ao vivo" }), "cliente: opção de chat ao vivo");
  await cli.screenshot({ path: `${pasta}/suporte-cliente.png` });

  await cli.getByRole("button", { name: "Novo chamado" }).first().click();
  const modal = cli.getByRole("dialog").last();
  await modal.getByRole("button", { name: "Enviar chamado" }).click();
  await vejo(modal.getByText("Escolha o setor do problema."), "cliente: chamado sem setor mostra o erro");
  await modal.getByLabel("Setor").selectOption({ label: "Financeiro" });
  await modal.getByLabel("Assunto").fill("Contas a pagar não aparecem");
  await modal.getByLabel("Descrição").fill("Lancei uma despesa parcelada e as parcelas não aparecem na lista.");
  await modal.getByText("Isto está me impedindo de trabalhar").click();
  await modal.getByRole("button", { name: "Enviar chamado" }).click();
  await vejo(cli.getByText("Contas a pagar não aparecem").first(), "cliente: chamado aberto, a conversa aparece");
  await vejo(cli.getByText(/Você é o \d+º da fila de chamados/), "cliente: vê a posição na fila de chamados");
  await cli.screenshot({ path: `${pasta}/chamado-cliente.png` });
  await cli.getByRole("button", { name: "Seus chamados" }).click();
  await vejo(cli.getByRole("cell", { name: "Contas a pagar não aparecem" }), "cliente: o chamado aparece na lista");

  // Entra na fila do chat
  await cli.getByRole("button", { name: "Entrar na fila" }).click();
  const fila = cli.getByRole("dialog").last();
  await fila.getByLabel("Setor do problema").selectOption({ label: "Estoque e Compras" });
  await fila.getByRole("button", { name: "Entrar na fila" }).click();
  await vejo(cli.getByRole("dialog", { name: "Chat com o suporte" }).getByText(/1º|2º|3º/), "cliente: a janela do chat mostra a posição na fila");
  await vejo(cli.getByRole("dialog", { name: "Chat com o suporte" }).getByText("Na fila"), "cliente: situação Na fila");
  await cli.locator('[data-nav-id="obras"]').click();
  await cli.waitForTimeout(600);
  ok(await cli.getByRole("dialog", { name: "Chat com o suporte" }).isVisible(), "cliente: a janela do chat acompanha pelas telas do sistema");
  await cli.screenshot({ path: `${pasta}/chat-fila-cliente.png` });

  // ── Equipe ──
  const ctxE = await browser.newContext({ viewport: { width: 1366, height: 1000 } });
  const eq = await ctxE.newPage();
  eq.on("pageerror", e => erros.push(`painel: ${e.message}`));
  await eq.goto(`${PAINEL}/login`, { waitUntil: "networkidle" });
  await eq.getByLabel("E-mail").fill(equipe.email);
  await eq.locator("input[type=password]").fill(SENHA);
  await eq.getByRole("button", { name: "Entrar" }).click();
  await eq.waitForURL("**/visao-geral", { timeout: 15000 });
  await eq.locator('[data-nav-id="atendimento"]').click();
  await eq.waitForURL("**/atendimento");
  ok(true, "equipe: o painel abre na Visão geral e o menu leva ao Atendimento");
  await vejo(eq.getByRole("heading", { name: "Fila do chat ao vivo" }), "equipe: seção Fila do chat ao vivo");
  await vejo(eq.getByRole("heading", { name: "Chamados abertos" }), "equipe: seção Chamados abertos");
  await vejo(eq.getByRole("cell", { name: /Marina Cliente/ }).first(), "equipe: vê quem está na fila (solicitante)");
  await vejo(eq.getByRole("cell", { name: /Estoque e Compras/ }).first(), "equipe: vê o setor do chat");
  await vejo(eq.getByRole("cell", { name: /Teste UI Suporte/ }).first(), "equipe: vê a empresa");
  await vejo(eq.getByRole("cell", { name: "Contas a pagar não aparecem" }).first(), "equipe: vê o chamado aberto com o assunto");
  await vejo(eq.getByRole("cell", { name: "Financeiro", exact: true }).first(), "equipe: e o setor do chamado");
  await vejo(eq.getByText(/menos de 1 min|\d+ min/).first(), "equipe: e há quanto tempo está esperando");
  await eq.getByRole("tab", { name: "Disponível" }).click();
  await eq.screenshot({ path: `${pasta}/atendimento-equipe.png` });

  // Atende o próximo
  await eq.getByRole("button", { name: /Atender próximo/ }).click();
  await vejo(eq.getByText(/assumiu o seu atendimento/), "equipe: ao atender, a conversa abre com a mensagem de sistema");
  await vejo(cli.getByRole("dialog", { name: "Chat com o suporte" }).getByText("Em atendimento"), "cliente: a janela passa para Em atendimento", 15000);
  await cli.getByRole("dialog", { name: "Chat com o suporte" }).getByLabel("Mensagem do chat").fill("Oi, preciso de ajuda com o estoque.");
  await cli.keyboard.press("Enter");
  await vejo(eq.getByText("Oi, preciso de ajuda com o estoque."), "equipe: recebe a mensagem do cliente em poucos segundos", 15000);
  await eq.getByLabel("Resposta no chat").fill("Olá! Pode me contar o que aconteceu?");
  await eq.keyboard.press("Enter");
  await vejo(cli.getByRole("dialog", { name: "Chat com o suporte" }).getByText("Olá! Pode me contar o que aconteceu?"), "cliente: recebe a resposta em poucos segundos", 15000);
  await eq.screenshot({ path: `${pasta}/chat-equipe.png` });
  await cli.screenshot({ path: `${pasta}/chat-cliente.png` });
  await eq.getByRole("button", { name: "Encerrar chat" }).click();
  await eq.getByRole("alertdialog").getByRole("button", { name: "Resolver" }).click();
  await vejo(cli.getByRole("dialog", { name: "Chat com o suporte" }).getByText("Atendimento encerrado"), "cliente: vê que o atendimento foi encerrado", 15000);
  await cli.getByRole("dialog", { name: "Chat com o suporte" }).getByRole("button", { name: "Nota 5" }).click();
  await cli.getByRole("dialog", { name: "Chat com o suporte" }).getByRole("button", { name: "Fechar", exact: true }).click();

  // Responde o chamado
  await eq.getByRole("button", { name: "Voltar" }).click();
  await eq.getByRole("cell", { name: "Contas a pagar não aparecem" }).first().click();
  await eq.getByLabel("Resposta ao cliente").fill("Vamos verificar as parcelas agora mesmo.");
  await eq.getByRole("button", { name: "Enviar", exact: true }).click();
  await vejo(eq.getByText("Vamos verificar as parcelas agora mesmo."), "equipe: a resposta ao chamado aparece na conversa");
  await cli.reload({ waitUntil: "networkidle" });
  await cli.getByRole("button", { name: "Notificações" }).click();
  await vejo(cli.getByText(/Chamado #\d+ respondido/), "cliente: o sino avisa que o chamado foi respondido");
  await cli.screenshot({ path: `${pasta}/sino-cliente.png` });

  // Chamados e auditoria no painel
  await eq.locator('[data-nav-id="chamados"], nav >> text=Chamados').first().click();
  await vejo(eq.getByRole("cell", { name: "Contas a pagar não aparecem" }), "equipe: tela Chamados lista o chamado");
  await eq.screenshot({ path: `${pasta}/chamados-equipe.png` });

  // Celular
  const cel = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const m = await cel.newPage();
  await cel.addInitScript(s => { try { localStorage.setItem("session", s); } catch {} }, JSON.stringify({ token: login.token, refreshToken: login.refreshToken, user: login.user, tenant: login.tenant, tourPendente: false }));
  await m.goto(`${CLIENTE}/app/suporte`, { waitUntil: "networkidle" });
  await vejo(m.getByRole("heading", { name: "Abrir um chamado" }), "celular: tela Suporte do cliente");
  ok(!(await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)), "celular: Suporte sem rolagem lateral");
  await m.screenshot({ path: `${pasta}/suporte-celular.png` });
  await cel.close(); await ctxC.close(); await ctxE.close();
  ok(erros.length === 0, `sem erros de página${erros.length ? `: ${erros[0]}` : ""}`);
} finally {
  await browser.close();
  if (cfgAntes) await prisma.configAtendimento.update({ where: { id: 1 }, data: { horario: cfgAntes.horario } });
  else await prisma.configAtendimento.deleteMany({ where: { id: 1 } });
  await prisma.tenant.deleteMany({ where: { id: tenant.id, cnpj: { startsWith: "TESTE-UISUP-" } } });
  await prisma.auditoriaEquipe.deleteMany({ where: { equipeId: equipe.id } });
  await prisma.equipeUsuario.deleteMany({ where: { id: equipe.id, email: { startsWith: marca } } });
  console.log("limpeza: empresa e equipe de teste apagadas; horário do chat restaurado");
  await prisma.$disconnect();
}
console.log(totalFalhas() ? `\n${totalFalhas()} verificação(ões) com falha` : "\nTodas as verificações passaram");
process.exit(totalFalhas() ? 1 : 0);
