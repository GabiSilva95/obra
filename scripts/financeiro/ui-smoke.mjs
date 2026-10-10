// Percorre o Financeiro como um usuário (Playwright), com a conta demo, e tira capturas de tela.
//
//   npm run dev                                   (app em http://localhost:3000)
//   node --env-file=.env scripts/financeiro/ui-smoke.mjs [pasta-das-capturas]
//
// Cria dados de teste (descrição "UI Teste …") e REMOVE tudo ao final.
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import path from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import prisma from "../../server/db.js";

const BASE = process.env.URL || "http://localhost:3000";
const PASTA = path.resolve(process.argv[2] || "node_modules/.cache/financeiro-ui");
mkdirSync(PASTA, { recursive: true });
// Campo de moeda: o cursor fica sempre no fim; Ctrl/Cmd+A seleciona tudo e a digitação substitui
const moeda = async (loc, digitos) => { await loc.focus(); await loc.page().waitForTimeout(120); await loc.page().keyboard.press("ControlOrMeta+A"); await loc.pressSequentially(digitos); };
const campo = (escopo, rotulo) => escopo.locator("label").filter({ has: escopo.page().locator("span", { hasText: new RegExp(`^\\*?\\s*${rotulo}\\s*$`) }) }).locator("input, select, textarea").first();

const login = await fetch(`${BASE}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "admin@teste.com", senha: "admin123" }) }).then(r => r.json());
const sessao = JSON.stringify({ token: login.token, refreshToken: login.refreshToken, user: login.user, tenant: login.tenant, tourPendente: false });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "pt-BR" });
await ctx.addInitScript(s => { try { if (!sessionStorage.getItem("__s")) { localStorage.setItem("session", s); sessionStorage.setItem("__s", "1"); } } catch {} }, sessao);
const page = await ctx.newPage();
const erros = [];
page.on("pageerror", e => erros.push(e.message));
page.on("console", m => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) erros.push(m.text()); });
let n = 0;
const foto = async nome => { n++; await page.screenshot({ path: path.join(PASTA, `${String(n).padStart(2, "0")}-${nome}.png`), fullPage: false }); };
const passo = t => console.log(`  - ${t}`);
const modal = () => page.getByRole("dialog").last();

try {
  await page.goto(`${BASE}/app/financeiro`);
  await page.getByRole("tab", { name: "Resumo" }).first().waitFor();
  passo("visão geral"); await foto("visao-geral");

  passo("conta nova");
  await page.getByRole("tab", { name: "Contas" }).click();
  await page.getByRole("button", { name: "Nova conta" }).click();
  await campo(modal(), "Nome da conta").fill("UI Teste Conta");
  await campo(modal(), "Saldo inicial").pressSequentially("500000");
  await modal().getByRole("button", { name: "Salvar conta" }).click();
  await page.getByText("UI Teste Conta").first().waitFor();
  await foto("contas");

  passo("conta a pagar parcelada e rateada");
  await page.getByRole("tab", { name: "A pagar" }).click();
  await page.getByRole("button", { name: "Nova conta a pagar" }).click();
  await campo(modal(), "Descrição").fill("UI Teste Cimento");
  await campo(modal(), "Valor").pressSequentially("100001");
  await campo(modal(), "Condição").selectOption("parcelado");
  await campo(modal(), "Primeiro vencimento").fill("2026-10-10");
  await campo(modal(), "Número de parcelas").fill("3");
  await modal().getByRole("button", { name: "Ratear em mais de uma linha" }).click();
  const obras = modal().locator("select[aria-label='Obra']");
  await obras.nth(0).selectOption({ index: 1 });
  await obras.nth(1).selectOption({ index: 2 });
  // Campo de moeda: seleciona tudo e digita por cima (fill("") não limpa)
  await moeda(modal().getByLabel("Valor da linha").nth(0), "60001");
  await moeda(modal().getByLabel("Valor da linha").nth(1), "40000");
  await page.waitForTimeout(300);
  await foto("form-rateio");
  assert.ok(await modal().getByText("Rateio fechado").isVisible(), "rateio deveria fechar: 600,01 + 400,00");
  await modal().getByRole("button", { name: "Salvar lançamento" }).click();
  await page.getByText("UI Teste Cimento").first().waitFor();
  await foto("a-pagar");
  assert.equal(await page.getByText("UI Teste Cimento").count(), 3, "3 parcelas na lista");

  passo("pagar a primeira parcela (parcial)");
  await page.getByRole("row").filter({ hasText: "UI Teste Cimento" }).filter({ hasText: "parcela 1/3" }).getByRole("button", { name: "Pagar" }).click();
  await campo(modal(), "Quanto").selectOption("outro");
  await moeda(campo(modal(), "Valor"), "10000");
  await foto("baixa");
  await modal().getByRole("button", { name: "Confirmar pagamento" }).click();
  await page.getByText("Parcial").first().waitFor();

  passo("detalhe e estorno");
  await page.getByText("UI Teste Cimento").first().click();
  await modal().getByRole("heading", { name: "Pagamentos" }).waitFor();
  await modal().getByText("3/3").first().waitFor(); // aguarda o detalhe carregar as 3 parcelas
  await foto("detalhe");
  await modal().getByRole("button", { name: "Estornar" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Estornar" }).click();
  await modal().getByText("Estornada em").waitFor();
  await foto("estornado");
  await page.keyboard.press("Escape");

  passo("pendências: compras entregues antigas aparecem para gerar a conta");
  await page.getByRole("tab", { name: "Pendências" }).click();
  await page.getByRole("heading", { name: "Compras entregues sem conta a pagar" }).waitFor();
  await foto("pendencias");
  await page.getByRole("button", { name: "Gerar conta" }).first().click();
  await modal().getByRole("heading", { name: /Conta a pagar da compra/ }).waitFor();
  await foto("pendencias-gerar");
  await modal().getByRole("button", { name: "Cancelar" }).click();

  passo("resultado: o custo das obras apareceu");
  await page.getByRole("tab", { name: "Resultado" }).click();
  await page.getByRole("tab", { name: "Por centro de custo" }).click();
  await foto("resultado-centros");

  passo("visão geral com saldo");
  await page.getByRole("tab", { name: "Resumo" }).first().click();
  await page.getByText("Saldo em contas").waitFor();
  await foto("visao-geral-final");
  passo("conciliação: importar OFX, conciliar o exato e lançar a tarifa");
  const chamar = (m, p, b) => fetch(`${BASE}/api${p}`, { method: m, headers: { "Content-Type": "application/json", Authorization: `Bearer ${login.token}` }, body: b ? JSON.stringify(b) : undefined }).then(r => r.json());
  const conta = (await chamar("GET", "/financeiro/base")).contas.find(c => c.nome === "UI Teste Conta");
  await chamar("POST", "/financeiro/documentos", { tipo: "pagar", natureza: "outro", descricao: "UI Teste Fornecedor Aço", valor: 500, data: "2026-10-05", pagamento: { modo: "avista", contaId: conta.id, dataPagamento: "2026-10-05", forma: "pix" } });
  const arquivoOfx = path.join(PASTA, "extrato-ui.ofx");
  writeFileSync(arquivoOfx, `OFXHEADER:100\nDATA:OFXSGML\nCHARSET:1252\n\n<OFX><BANKTRANLIST><DTSTART>20261001<DTEND>20261031\n<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261005<TRNAMT>-500.00<FITID>ui-1<MEMO>PIX ENVIADO ACO FORTE</STMTTRN>\n<STMTTRN><TRNTYPE>FEE<DTPOSTED>20261010<TRNAMT>-14.90<FITID>ui-2<MEMO>TARIFA MANUTENCAO DE CONTA</STMTTRN>\n</BANKTRANLIST><LEDGERBAL><BALAMT>5476.20<DTASOF>20261031</LEDGERBAL></OFX>`, "latin1");
  await page.getByRole("tab", { name: "Contas e conciliação" }).click();
  await page.getByRole("button", { name: "Importar extrato" }).click();
  await campo(modal(), "Conta do extrato").selectOption({ label: "UI Teste Conta" }); // o tenant demo já tem outras contas
  await modal().locator("input[type=file]").setInputFiles(arquivoOfx);
  await modal().getByText("Nada foi gravado ainda").waitFor();
  await foto("importar-previa");
  await modal().getByRole("button", { name: /^Importar 2 lançamentos/ }).click();
  await page.getByRole("heading", { name: /Conciliação:/ }).waitFor();
  await foto("conciliacao");
  await page.getByRole("button", { name: /^Conciliar 1 exato/ }).click();
  await page.getByText("PIX ENVIADO ACO FORTE").waitFor({ state: "detached" }); // a linha conciliada sai da lista de pendentes
  await page.getByRole("button", { name: "Tratar" }).click();
  await modal().getByRole("tab", { name: "Lançar novo" }).click();
  await campo(modal(), "Descrição").fill("UI Teste Tarifa"); // com o prefixo, a limpeza do final a encontra
  await foto("tratar-lancar");
  await modal().getByRole("button", { name: "Lançar e conciliar" }).click();
  await page.getByText("Nenhuma linha pendente").waitFor();
  await foto("conciliacao-fim");

  passo("fluxo de caixa e relatórios abrem sem erro");
  await page.getByRole("tab", { name: "Fluxo de caixa" }).click();
  await page.getByText("Saldo projetado em").waitFor();
  await foto("fluxo");
  await page.getByRole("tab", { name: "Relatórios" }).click();
  await page.getByRole("tab", { name: "Envelhecimento a pagar" }).waitFor();
  await page.getByText(/Total em aberto|Nenhuma conta a pagar em aberto/).waitFor();
  await foto("relatorios");

  assert.deepEqual(erros, [], `erros no console: ${erros.join(" | ")}`);
  console.log(`\nOK. Capturas em ${PASTA}`);
} catch (e) {
  await foto("falha").catch(() => {});
  console.error("\nFALHOU:", e.message.split("\n")[0]);
  console.error(erros.length ? `Console: ${erros.join(" | ")}` : "");
  process.exitCode = 1;
} finally {
  await browser.close();
  const grupos = (await prisma.titulo.findMany({ where: { descricao: { startsWith: "UI Teste" } }, select: { grupoId: true } })).map(t => t.grupoId);
  await prisma.lancamentoBancario.deleteMany({ where: { fitid: { in: ["ui-1", "ui-2"] } } });
  await prisma.importacaoExtrato.deleteMany({ where: { arquivo: "extrato-ui.ofx" } });
  await prisma.despesa.deleteMany({ where: { grupoId: { in: grupos } } });
  await prisma.receita.deleteMany({ where: { grupoId: { in: grupos } } });
  await prisma.titulo.deleteMany({ where: { grupoId: { in: grupos } } });
  const contas = await prisma.contaFinanceira.findMany({ where: { nome: { startsWith: "UI Teste" } }, select: { id: true } });
  await prisma.baixa.deleteMany({ where: { contaId: { in: contas.map(c => c.id) } } });
  await prisma.contaFinanceira.deleteMany({ where: { id: { in: contas.map(c => c.id) } } });
  await prisma.$disconnect();
}
