// Verificação da Etapa A pela interface: sem acesso demo, "sem implantação" visível, cadastro com telefone e aceite.
// Cria uma empresa de teste ("Teste Cadastro UI ...") e apaga no fim.  Uso: npm run dev (em outro terminal) e
//   node --env-file=.env scripts/painel/ui-etapa-a.mjs
import { chromium } from "@playwright/test";
import prisma from "../../server/db.js";

const B = process.env.BASE || "http://localhost:3000";
let falhas = 0;
const ok = (c, m) => { console.log(`${c ? "ok  " : "FALHA"} ${m}`); if (!c) falhas++; };
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, reducedMotion: "reduce" });
const p = await ctx.newPage();
const ts = Date.now();

await p.goto(B + "/", { waitUntil: "networkidle" });
const texto = await p.locator("body").innerText();
ok(!/ver por dentro|credenciais de demonstra|demonstração/i.test(texto), "landing sem acesso demo");
ok(!/@|\(\d{2}\)\s?\d/.test(texto), "landing sem e-mail nem telefone");
ok(texto.includes("Sem implantação"), "landing mostra 'Sem implantação'");
ok(texto.includes("Preciso de implantação ou de alguém para configurar?"), "dúvida sobre implantação");
ok(texto.includes("Implantação") && texto.includes("a conta já vem pronta"), "comparativo com a linha Implantação");
ok(await p.getByRole("button", { name: "Ver como funciona" }).first().isVisible(), "botão 'Ver como funciona' no topo");

await p.getByRole("button", { name: "Ver como funciona" }).first().click(); await p.waitForTimeout(600);
ok(await p.evaluate(() => document.getElementById("veja-funcionando").getBoundingClientRect().top < 300), "'Ver como funciona' rola até os vídeos");

await p.goto(B + "/login", { waitUntil: "networkidle" });
const login = await p.locator("body").innerText();
ok(!/demonstra/i.test(login) && !(await p.getByRole("button", { name: /credenciais/i }).count()), "login sem botão de demonstração");

await p.goto(B + "/registro", { waitUntil: "networkidle" });
ok(await p.getByLabel("Telefone com DDD").isVisible(), "cadastro tem o campo de telefone");
ok(await p.getByRole("checkbox").isVisible(), "cadastro tem o checkbox de aceite");
await p.getByLabel("Telefone com DDD").fill("11987654321");
ok(await p.getByLabel("Telefone com DDD").inputValue() === "(11) 98765-4321", "telefone ganha máscara ao digitar");
await p.getByLabel("Nome da empresa").fill("Teste Cadastro UI " + ts);
await p.getByLabel("CNPJ").fill("TESTE-UI-" + ts);
await p.getByLabel("Seu nome").fill("Pessoa Teste");
await p.getByLabel("Seu e-mail").fill(`ui-${ts}@exemplo.test`);
await p.locator("input[type=password]").fill("teste123");
await p.getByRole("button", { name: "Começar meu teste grátis" }).click();
ok(await p.getByText("Para criar a conta, marque o aceite").isVisible(), "sem marcar o aceite, a conta não é criada");
await p.getByLabel("Telefone com DDD").fill("123");
await p.getByRole("checkbox").click();
await p.getByRole("button", { name: "Começar meu teste grátis" }).click();
ok(await p.getByText("Informe um telefone válido, com DDD.").isVisible(), "telefone inválido é recusado");
await p.getByLabel("Telefone com DDD").fill("11987654321");
await p.getByRole("button", { name: "Começar meu teste grátis" }).click();
await p.waitForURL("**/app/dashboard", { timeout: 20000 });
ok(true, "com tudo certo, a conta é criada e entra no sistema");
const sessao = await p.evaluate(() => JSON.parse(localStorage.getItem("session")));
ok(sessao.tenant.status === "trial" && !!sessao.tenant.trialAte && sessao.tenant.aceitouMensagens === true && !("notasInternas" in sessao.tenant), "sessão traz teste, fim do teste e aceite, sem campos internos");

await browser.close();
const apagados = await prisma.tenant.deleteMany({ where: { cnpj: { startsWith: "TESTE-UI-" }, razaoSocial: { startsWith: "Teste Cadastro UI " } } });
console.log(`empresas de teste apagadas: ${apagados.count}`);
await prisma.$disconnect();
process.exit(falhas ? 1 : 0);
