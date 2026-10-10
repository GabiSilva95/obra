// Percorre o painel da equipe pela interface (Playwright). Cria uma equipe de teste e apaga no fim.
//
//   npm run dev (em outro terminal) e   node --env-file=.env scripts/painel/ui-smoke.mjs
// Abre http://painel.localhost:3000 (o painel só carrega em endereços "painel.*"). Capturas em node_modules/.cache/painel-ui.
import bcrypt from "bcryptjs";
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import prisma from "../../server/db.js";
import { IDS_PERMISSOES } from "../../server/config/painel.js";
import { marca, ok, totalFalhas } from "./lib.mjs";

const PAINEL = process.env.PAINEL_URL || "http://painel.localhost:3000";
const SENHA = "Senha-Admin-2026";
const pasta = "node_modules/.cache/painel-ui";
/** Espera o elemento aparecer (até 8 s) em vez de olhar uma vez só: a tela carrega os dados depois de abrir. */
const vejo = async (loc, msg) => ok(await loc.first().waitFor({ state: "visible", timeout: 8000 }).then(() => true, () => false), msg);
mkdirSync(pasta, { recursive: true });

const admin = await prisma.equipeUsuario.create({ data: { nome: "Admin UI", email: `${marca}-ui@exemplo.test`, senha: await bcrypt.hash(SENHA, 10), papel: "equipe_admin", permissoes: IDS_PERMISSOES, trocarSenha: false } });
const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const p = await ctx.newPage();
  const erros = []; p.on("pageerror", e => erros.push(e.message));

  // Login e proteção das telas
  await p.goto(`${PAINEL}/equipe`, { waitUntil: "networkidle" });
  ok(p.url().endsWith("/login"), "sem sessão, qualquer tela leva ao login");
  ok(await p.title() === "Painel da equipe · ConstruktPro", "título próprio do painel");
  ok(await p.locator('meta[name="robots"]').getAttribute("content") === "noindex, nofollow", "painel com noindex");
  await p.getByLabel("E-mail").fill(admin.email);
  await p.locator("input[type=password]").fill("senha errada 123");
  await p.getByRole("button", { name: "Entrar" }).click();
  await vejo(p.getByText("Credenciais inválidas."), "senha errada mostra erro");
  await p.locator("input[type=password]").fill(SENHA);
  await p.getByRole("button", { name: "Entrar" }).click();
  await p.waitForURL("**/visao-geral", { timeout: 15000 });
  ok(true, "login leva à primeira tela do menu (Visão geral)");
  await p.locator('[data-nav-id="equipe"]').click();
  await p.waitForURL("**/equipe");
  await vejo(p.getByRole("heading", { name: "Equipe", exact: true }), "cabeçalho Equipe");
  await vejo(p.getByText("Ninguém na equipe ainda.").or(p.getByText(admin.email)), "lista da equipe carrega");
  ok(await p.getByText("Painel da equipe").first().isVisible(), "identificação 'Painel da equipe' no menu");
  await p.screenshot({ path: `${pasta}/equipe.png` });

  // Criar pessoa e ver a senha provisória
  await p.getByRole("button", { name: "Nova pessoa" }).click();
  const modal = p.getByRole("dialog").last();
  await modal.getByLabel("Nome").fill("Atendente UI");
  await modal.getByLabel("E-mail").fill(`${marca}-atendente@exemplo.test`);
  ok(await modal.getByText("Atendimento e chamados").first().isVisible(), "permissões do perfil aparecem");
  await p.screenshot({ path: `${pasta}/nova-pessoa.png` });
  await modal.getByRole("button", { name: "Criar e gerar senha" }).click();
  const senhaModal = p.getByRole("dialog").last();
  await senhaModal.getByText("Ela aparece só agora").waitFor();
  const provisoria = (await senhaModal.locator("code").innerText()).trim();
  ok(provisoria.length === 14, "senha provisória de 14 caracteres exibida uma vez");
  await senhaModal.getByRole("button", { name: "Já anotei" }).click();
  await vejo(p.getByText("Atendente UI"), "pessoa nova aparece na lista");
  await vejo(p.getByText("Senha provisória", { exact: true }), "com a marca 'Senha provisória'");

  // Auditoria
  await p.locator('[data-nav-id="auditoria"], nav >> text=Auditoria').first().click();
  await p.waitForURL("**/auditoria");
  await vejo(p.getByRole("cell", { name: "Criou uma pessoa da equipe" }), "auditoria mostra a criação");
  await vejo(p.getByRole("cell", { name: "Entrou no painel" }), "auditoria mostra o login");
  await p.screenshot({ path: `${pasta}/auditoria.png` });

  // Troca de senha pelo menu
  await p.getByText("Trocar senha", { exact: true }).first().click();
  const trocar = p.getByRole("dialog").last();
  const cs = trocar.locator("input[type=password]");
  await cs.nth(0).fill(SENHA); await cs.nth(1).fill("Nova-Senha-2026"); await cs.nth(2).fill("Nova-Senha-2026");
  await trocar.getByRole("button", { name: "Salvar senha" }).click();
  await trocar.waitFor({ state: "detached", timeout: 10000 });
  ok(true, "troca de senha pelo menu fecha o modal");

  // A pessoa nova entra com a provisória e é obrigada a trocar
  const ctx2 = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const q = await ctx2.newPage();
  await q.goto(`${PAINEL}/login`, { waitUntil: "networkidle" });
  await q.getByLabel("E-mail").fill(`${marca}-atendente@exemplo.test`);
  await q.locator("input[type=password]").fill(provisoria);
  await q.getByRole("button", { name: "Entrar" }).click();
  await q.getByRole("heading", { name: "Crie sua senha" }).waitFor({ timeout: 15000 });
  ok(true, "senha provisória leva à tela obrigatória de nova senha");
  const campos = q.locator("input[type=password]");
  await campos.nth(0).fill(provisoria);
  await campos.nth(1).fill("Minha-Senha-2026");
  await campos.nth(2).fill("Minha-Senha-2026");
  await q.getByRole("button", { name: "Salvar senha" }).click();
  await q.getByRole("heading", { name: "Crie sua senha" }).waitFor({ state: "detached", timeout: 15000 });
  ok(true, "nova senha salva: o painel abre");
  await q.waitForTimeout(800);
  ok(!(await q.getByRole("link", { name: "Equipe" }).count()) && !(await q.locator('[data-nav-id="equipe"]').count()), "atendente sem a permissão não vê Equipe no menu");
  await q.goto(`${PAINEL}/equipe`, { waitUntil: "networkidle" });
  await vejo(q.getByText("Acesso não permitido."), "e não abre a tela Equipe pela URL");
  await ctx2.close();

  // Celular
  await ctx.close();
  const cel = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const m = await cel.newPage();
  await m.goto(`${PAINEL}/login`, { waitUntil: "networkidle" });
  await m.getByLabel("E-mail").fill(admin.email);
  await m.locator("input[type=password]").fill("Nova-Senha-2026");
  await m.getByRole("button", { name: "Entrar" }).click();
  await m.waitForURL("**/visao-geral", { timeout: 15000 });
  await m.goto(`${PAINEL}/equipe`, { waitUntil: "networkidle" });
  await m.waitForTimeout(800);
  ok(!(await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)), "celular: sem rolagem lateral na Equipe");
  await m.screenshot({ path: `${pasta}/equipe-celular.png` });
  await cel.close();
  ok(erros.length === 0, `sem erros de página${erros.length ? `: ${erros[0]}` : ""}`);
} finally {
  await browser.close();
  const ids = (await prisma.equipeUsuario.findMany({ where: { email: { startsWith: marca } }, select: { id: true } })).map(e => e.id);
  await prisma.auditoriaEquipe.deleteMany({ where: { OR: [{ equipeId: { in: ids } }, { acao: "login_falhou", detalhe: { startsWith: marca } }] } });
  const r = await prisma.equipeUsuario.deleteMany({ where: { email: { startsWith: marca } } });
  console.log(`limpeza: ${r.count} pessoa(s) da equipe de teste apagada(s)`);
  await prisma.$disconnect();
}
console.log(totalFalhas() ? `\n${totalFalhas()} verificação(ões) com falha` : "\nTodas as verificações passaram");
process.exit(totalFalhas() ? 1 : 0);
