// Diário de obra pela interface (Playwright): anexos do registro e relatório (PDF e CSV).
// Cria uma empresa de teste e apaga no fim.   npm run dev  e   node --env-file=.env scripts/obras/ui-diario.mjs
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
const vejo = async (loc, msg, ms = 10000) => ok(await loc.first().waitFor({ state: "visible", timeout: ms }).then(() => true, () => false), msg);

const t = await prisma.tenant.create({ data: { razaoSocial: `Teste UI Diario ${marca}`, cnpj: `TESTE-UID-${marca}`, email: `${marca}@exemplo.test`, plano: "pro" } });
const adm = await prisma.user.create({ data: { tenantId: t.id, nome: "Dona", email: `${marca}@exemplo.test`, senha: await bcrypt.hash(SENHA, 10), role: "tenant_admin", ocultarTour: true } });
const cli = await prisma.funcionario.create({ data: { tenantId: t.id, nome: "Cliente", isCliente: true } });
const obra = await prisma.obra.create({ data: { tenantId: t.id, nome: "Casa Teste", local: "x", inicio: "2026-10-01", previsaoFim: "2027-01-01", clienteId: cli.id } });
await prisma.diarioObra.create({ data: { tenantId: t.id, obraId: obra.id, data: "2026-10-12", descricao: "Concretagem <b>laje</b>", clima: "Ensolarado" } });
const login = await fetch(`${API}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: adm.email, senha: SENHA }) }).then(x => x.json());
const sessao = JSON.stringify({ token: login.token, refreshToken: login.refreshToken, user: login.user, tenant: login.tenant, tourPendente: false });

const browser = await chromium.launch();
try {
  const erros = [];
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 1000 }, acceptDownloads: true });
  await ctx.addInitScript(s => { try { localStorage.setItem("session", s); } catch {} }, sessao);
  const p = await ctx.newPage();
  p.on("pageerror", e => erros.push(e.message));
  await p.goto(`${CLIENTE}/app/diario`, { waitUntil: "networkidle" });
  await vejo(p.getByRole("button", { name: "Anexos", exact: true }), "o cartão do dia tem o botão Anexos");
  await p.getByRole("button", { name: "Anexos", exact: true }).click();
  const m = p.getByRole("dialog").last();
  await vejo(m.getByText("Nenhum arquivo anexado a este registro."), "sem anexos: a mensagem fala do registro");
  await m.locator("input[type=file]").setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: Buffer.from("PNGDATA") });
  await vejo(m.getByText("foto.png"), "o arquivo enviado aparece na lista");
  await vejo(m.getByText("1 arquivo ·"), "terminou o envio (a lista mostra o total)");
  const gravados = await prisma.anexo.findMany({ where: { tenantId: t.id }, select: { diarioId: true } });
  ok(gravados.length === 1 && gravados[0].diarioId !== null, "ficou ligado ao registro do diário");
  await m.getByRole("button", { name: "Fechar" }).last().click();
  await vejo(p.getByRole("button", { name: "Anexos (1)" }), "o botão passa a mostrar a contagem: Anexos (1)");

  await p.getByRole("button", { name: "Relatório", exact: true }).click();
  const r = p.getByRole("dialog").last();
  await vejo(r.getByText("Relatório do diário"), "abre o relatório do diário");
  const [dl] = await Promise.all([p.waitForEvent("download"), r.getByRole("button", { name: "Baixar CSV" }).click()]);
  ok(/^diario-.*\.csv$/.test(dl.suggestedFilename()), `baixa o CSV (${dl.suggestedFilename()})`);
  await p.getByRole("button", { name: "Relatório", exact: true }).click();
  const r2 = p.getByRole("dialog").last();
  // A janela de impressão se fecha sozinha: troca window.open por um gravador do HTML que seria impresso
  await p.evaluate(() => { window.__pdf = ""; window.open = () => ({ document: { write: h => { window.__pdf += h; }, close() {} } }); });
  await r2.getByRole("button", { name: "Gerar PDF" }).click();
  const html = await p.evaluate(() => window.__pdf);
  ok(html.includes("Relatório do diário de obra") && html.includes("Casa Teste") && html.includes("Concretagem &lt;b&gt;laje&lt;/b&gt;"), "o PDF traz a obra e o texto, com o HTML escapado");
  ok(html.includes("1 arquivo guardado"), "o PDF cita os anexos do dia");
  await p.getByRole("button", { name: "Relatório", exact: true }).click();
  const r3 = p.getByRole("dialog").last();
  await r3.getByLabel("De").fill("2030-01-01");
  await r3.getByRole("button", { name: "Gerar PDF" }).click();
  await vejo(p.getByText("Nenhum registro do diário nesse filtro"), "sem registros no período: avisa em vez de gerar vazio");
  await p.screenshot({ path: `${pasta}/diario.png` });
  ok(erros.length === 0, `sem erros de página${erros.length ? ": " + erros[0] : ""}`);
} finally {
  await browser.close();
  await prisma.tenant.deleteMany({ where: { id: t.id, cnpj: { startsWith: "TESTE-UID-" } } });
  await prisma.$disconnect();
}
console.log(totalFalhas() ? `\n${totalFalhas()} verificação(ões) com falha` : "\nTodas as verificações passaram");
process.exit(totalFalhas() ? 1 : 0);
