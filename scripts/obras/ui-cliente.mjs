// Cliente da obra pela interface (Playwright): campo obrigatório, cadastro rápido de cliente dentro da obra,
// aviso nas obras antigas sem cliente, edição, proteção ao excluir quem é cliente e celular.
// Cria uma empresa de teste e apaga no fim.   npm run dev  e   node --env-file=.env scripts/obras/ui-cliente.mjs
import bcrypt from "bcryptjs";
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import prisma from "../../server/db.js";
import { marca, ok, totalFalhas } from "../painel/lib.mjs";

const CLIENTE = process.env.CLIENTE_URL || "http://localhost:3000";
const API = CLIENTE.replace("3000", "3002");
const SENHA = "Senha-Teste-2026";
const pasta = "node_modules/.cache/obras-ui";
mkdirSync(pasta, { recursive: true });
let falhasVistas = 0;
const vejo = async (loc, msg, ms = 10000) => {
  const achou = await loc.first().waitFor({ state: "visible", timeout: ms }).then(() => true, () => false);
  if (!achou) await loc.page().screenshot({ path: `${pasta}/falha-${++falhasVistas}.png` }).catch(() => {});
  return ok(achou, msg);
};
const sumiu = async (loc, msg, ms = 10000) => ok(await loc.first().waitFor({ state: "hidden", timeout: ms }).then(() => true, () => false), msg);

const tenant = await prisma.tenant.create({ data: { razaoSocial: `Teste UI Cliente Obra ${marca}`, cnpj: `TESTE-UICO-${marca}`, email: `${marca}@exemplo.test`, plano: "pro" } });
const adm = await prisma.user.create({ data: { tenantId: tenant.id, nome: "Dona da Empresa", email: `${marca}-adm@exemplo.test`, senha: await bcrypt.hash(SENHA, 10), role: "tenant_admin", ocultarTour: true } });
const base = { tenantId: tenant.id, local: "Rua 1", inicio: "2026-10-05", previsaoFim: "2027-04-30", orcamento: 100000 };
const antiga = await prisma.obra.create({ data: { ...base, nome: "Obra antiga sem cliente" } });
const login = await fetch(`${API}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: adm.email, senha: SENHA }) }).then(x => x.json());
const sessao = JSON.stringify({ token: login.token, refreshToken: login.refreshToken, user: login.user, tenant: login.tenant, tourPendente: false });

const browser = await chromium.launch();
try {
  const erros = [];
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 1000 } });
  await ctx.addInitScript(s => { try { localStorage.setItem("session", s); } catch {} }, sessao);
  const p = await ctx.newPage();
  p.on("pageerror", e => erros.push(e.message));
  await p.goto(`${CLIENTE}/app/obras`, { waitUntil: "networkidle" });

  // ── Obra antiga: avisos ──
  await vejo(p.getByText("1 obra está sem cliente"), "a tela avisa que há obra sem cliente");
  await vejo(p.getByText("Sem cliente", { exact: true }), "o cartão da obra antiga mostra 'Sem cliente'");
  await p.screenshot({ path: `${pasta}/obras-sem-cliente.png` });

  // ── Nova obra: sem nenhum cliente cadastrado ──
  await p.getByRole("button", { name: "Nova obra" }).click();
  const modal = p.getByRole("dialog").last();
  await vejo(modal.getByLabel("Cliente"), "Nova obra: o campo Cliente existe");
  ok((await modal.getByLabel("Cliente").locator("option").allTextContents()).includes("Nenhum cliente cadastrado"), "sem clientes, o campo diz 'Nenhum cliente cadastrado'");
  await vejo(modal.getByRole("button", { name: "Cadastrar novo cliente" }), "há o atalho para cadastrar o cliente ali mesmo");

  // ── Salvar sem cliente é recusado na tela ──
  await modal.getByLabel("Nome").fill("Residência Silva");
  await modal.getByLabel("Local").fill("Rua das Flores, 120");
  await modal.getByLabel("Início").fill("2026-10-05");
  await modal.getByLabel("Previsão de fim").fill("2027-04-30");
  await modal.getByLabel("Orçamento").fill("450000,00");
  await modal.getByRole("button", { name: "Salvar" }).click();
  await vejo(modal.getByText("Cliente é obrigatório."), "salvar sem cliente mostra 'Cliente é obrigatório.'");
  ok((await prisma.obra.count({ where: { tenantId: tenant.id } })) === 1, "nada foi gravado sem o cliente");

  // ── Cadastro rápido do cliente ──
  await modal.getByRole("button", { name: "Cadastrar novo cliente" }).click();
  const rapido = p.getByRole("dialog").last();
  await vejo(rapido.getByText("Novo cliente"), "abre o cadastro rápido de cliente");
  await rapido.getByRole("button", { name: "Salvar" }).click();
  await vejo(rapido.getByText("Nome é obrigatório."), "o cadastro rápido exige o nome");
  await rapido.getByLabel("Nome completo / razão social").fill("Silva Empreendimentos");
  await rapido.getByLabel("CPF / CNPJ").fill("12.345.678/0001-90");
  await p.screenshot({ path: `${pasta}/cadastro-rapido.png` });
  await rapido.getByRole("button", { name: "Salvar" }).click();
  await sumiu(p.getByText("Novo cliente", { exact: true }), "o cadastro rápido fecha ao salvar");
  const pessoa = await prisma.funcionario.findFirst({ where: { tenantId: tenant.id, nome: "Silva Empreendimentos" } });
  ok(pessoa?.isCliente === true && pessoa.cpfCnpj === "12.345.678/0001-90", "o cliente foi gravado no cadastro com o perfil Cliente");
  ok((await modal.getByLabel("Cliente").inputValue()) === String(pessoa?.id), "o cliente novo já vem escolhido na obra");
  ok(!(await modal.getByText("Cliente é obrigatório.").count()), "o aviso de cliente obrigatório some");

  // ── Salvar a obra ──
  await modal.getByRole("button", { name: "Salvar" }).click();
  await vejo(p.getByText("Cliente: Silva Empreendimentos"), "o cartão da nova obra mostra o cliente");
  const nova = await prisma.obra.findFirst({ where: { tenantId: tenant.id, nome: "Residência Silva" } });
  ok(nova?.clienteId === pessoa?.id, "a obra foi gravada ligada ao cliente");
  await p.getByRole("alertdialog").getByRole("button", { name: "Entendi" }).click().catch(() => {});

  // ── Obra antiga: só salva com cliente ──
  // O cartão da obra antiga: o ancestral mais próximo do título que tem o botão Editar
  await p.getByText("Obra antiga sem cliente", { exact: true }).locator("xpath=ancestor::*[.//button[@aria-label='Editar']][1]").getByRole("button", { name: "Editar" }).click();
  const ed = p.getByRole("dialog").last();
  await vejo(ed.getByText("Editar obra"), "abre a edição da obra antiga");
  ok((await ed.getByLabel("Cliente").inputValue()) === "", "a obra antiga abre com o cliente em branco");
  await ed.getByRole("button", { name: "Salvar" }).click();
  await vejo(ed.getByText("Cliente é obrigatório."), "a obra antiga não salva sem escolher o cliente");
  await ed.getByLabel("Cliente").selectOption({ label: "Silva Empreendimentos · 12.345.678/0001-90" });
  await ed.getByRole("button", { name: "Salvar" }).click();
  await sumiu(p.getByText("Sem cliente", { exact: true }), "depois de escolher, o 'Sem cliente' some");
  await sumiu(p.getByText("1 obra está sem cliente"), "o aviso do topo some");
  ok((await prisma.obra.findUnique({ where: { id: antiga.id } })).clienteId === pessoa?.id, "a obra antiga ficou ligada ao cliente");
  await p.getByRole("alertdialog").getByRole("button", { name: "Entendi" }).click().catch(() => {});
  await p.screenshot({ path: `${pasta}/obras-com-cliente.png` });

  // ── Cadastros: quem é cliente de obra não se exclui ──
  await p.goto(`${CLIENTE}/app/cadastros`, { waitUntil: "networkidle" });
  await p.getByRole("tab", { name: "Pessoas" }).click();
  await vejo(p.getByText("Silva Empreendimentos").first(), "Cadastros lista o cliente");
  await p.getByRole("button", { name: "Editar" }).first().click();
  const pe = p.getByRole("dialog").last();
  await pe.getByText("Cliente", { exact: true }).click(); // o checkbox do perfil (desmarca)
  await pe.getByRole("button", { name: "Salvar" }).click();
  await vejo(p.getByText(/é o cliente de: .*Troque o cliente dessas obras/), "tirar o perfil Cliente de quem tem obra é recusado, com a lista das obras");
  await p.getByRole("alertdialog").getByRole("button", { name: "Entendi" }).click().catch(() => {});
  await pe.getByRole("button", { name: "Cancelar" }).click();

  // ── Celular ──
  const cel = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await cel.addInitScript(s => { try { localStorage.setItem("session", s); } catch {} }, sessao);
  const m = await cel.newPage();
  m.on("pageerror", e => erros.push(`celular: ${e.message}`));
  await m.goto(`${CLIENTE}/app/obras`, { waitUntil: "networkidle" });
  await vejo(m.getByText("Cliente: Silva Empreendimentos").first(), "celular: o cartão mostra o cliente");
  ok(!(await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)), "celular: Obras sem rolagem lateral");
  await m.getByRole("button", { name: "Nova obra" }).click();
  const mm = m.getByRole("dialog").last();
  await vejo(mm.getByLabel("Cliente"), "celular: o campo Cliente aparece no formulário");
  await mm.getByRole("button", { name: "Cadastrar novo cliente" }).scrollIntoViewIfNeeded();
  await m.screenshot({ path: `${pasta}/celular-nova-obra.png` });
  await cel.close(); await ctx.close();
  ok(erros.length === 0, `sem erros de página${erros.length ? `: ${erros[0]}` : ""}`);
} finally {
  await browser.close();
  await prisma.tenant.deleteMany({ where: { id: tenant.id, cnpj: { startsWith: "TESTE-UICO-" } } });
  console.log("limpeza: empresa de teste apagada");
  await prisma.$disconnect();
}
console.log(totalFalhas() ? `\n${totalFalhas()} verificação(ões) com falha` : "\nTodas as verificações passaram");
process.exit(totalFalhas() ? 1 : 0);
