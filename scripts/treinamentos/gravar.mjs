// Grava os vídeos da Central de treinamentos navegando no app de verdade (Playwright + Chromium).
//
//   npm run dev                                    (em outro terminal: API + Vite)
//   npm run treinamentos:gravar                    → grava todos os módulos
//   npm run treinamentos:gravar -- --so obras,diario
//
// Usa a conta de demonstração (prisma/seed.js) ou TREINAMENTO_EMAIL / TREINAMENTO_SENHA.
// Os roteiros (roteiros.mjs) só abrem e preenchem formulários; nada é salvo.
// Saída: public/treinamentos/<id>.webm e o hash das telas em src/treinamentos/manifesto.json.
import { chromium } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { MODULOS } from "../../src/treinamentos/conteudo.js";
import { ROTEIROS } from "./roteiros.mjs";
import { hashArquivos } from "./verificar.mjs";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = process.env.TREINAMENTO_URL || "http://localhost:3000";
const EMAIL = process.env.TREINAMENTO_EMAIL || "admin@teste.com";
const SENHA = process.env.TREINAMENTO_SENHA || "admin123";
const TELA = { width: 1280, height: 800 };
const saida = path.join(raiz, "public/treinamentos");
const arqManifesto = path.join(raiz, "src/treinamentos/manifesto.json");

const arg = process.argv.indexOf("--so");
const so = arg > -1 ? process.argv[arg + 1]?.split(",") : null;
const modulos = MODULOS.filter(m => !so || so.includes(m.id));
if (!modulos.length) { console.error(`Nenhum módulo com id ${so}.`); process.exit(1); }

// Cursor visível e legenda no rodapé, desenhados com os tokens do próprio app
const OVERLAY = () => {
  const montar = () => {
    if (document.getElementById("__trein-cursor")) return;
    const cursor = document.createElement("div");
    cursor.id = "__trein-cursor";
    cursor.style.cssText = "position:fixed;left:0;top:0;width:var(--space-5);height:var(--space-5);margin:calc(-1 * var(--space-2-5)) 0 0 calc(-1 * var(--space-2-5));border-radius:50%;background:var(--accent-soft);border:var(--border-w-thick) solid var(--accent);z-index:2147483647;pointer-events:none;transition:transform var(--dur-fast) var(--ease-standard)";
    const legenda = document.createElement("div");
    legenda.id = "__trein-legenda";
    legenda.style.cssText = "position:fixed;left:50%;bottom:var(--space-6);transform:translateX(-50%);max-width:min(var(--content-w-md),calc(100vw - 2 * var(--space-6)));display:none;align-items:center;gap:var(--space-3);padding:var(--space-3) var(--space-5);border-radius:var(--radius-lg);background:var(--surface-sidebar);color:var(--text-on-sidebar);box-shadow:var(--shadow-pop);font:var(--fw-semibold) var(--fs-p4)/var(--lh-snug) var(--font-sans);z-index:2147483646;pointer-events:none";
    document.body.append(cursor, legenda);
    addEventListener("mousemove", e => { cursor.style.left = `${e.clientX}px`; cursor.style.top = `${e.clientY}px`; }, true);
    addEventListener("mousedown", () => { cursor.style.transform = "scale(.7)"; }, true);
    addEventListener("mouseup", () => { cursor.style.transform = "none"; }, true);
  };
  window.__legenda = (numero, texto) => {
    montar();
    const el = document.getElementById("__trein-legenda");
    el.replaceChildren();
    if (numero) {
      const n = document.createElement("span");
      n.textContent = numero;
      n.style.cssText = "flex-shrink:0;width:var(--space-7);height:var(--space-7);border-radius:50%;background:var(--accent);color:var(--text-on-accent);display:flex;align-items:center;justify-content:center;font-size:var(--fs-p5);font-weight:var(--fw-bold)";
      el.append(n);
    }
    el.append(document.createTextNode(texto));
    el.style.display = "flex";
  };
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", montar); else montar();
};

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function helpers(page, modulo) {
  const modal = () => page.getByRole("dialog").last();
  // Campo pelo texto do label do Field (o "*" de obrigatório é ignorado); procura no modal aberto primeiro
  const campo = label => {
    const re = new RegExp(`^\\*?\\s*${esc(label)}$`);
    const porLabel = escopo => escopo.locator("label").filter({ has: page.locator(":scope > span").filter({ hasText: re }) }).locator("input, select, textarea").first();
    const porAria = escopo => escopo.getByLabel(label, { exact: true }).first();
    return { modal: [porLabel(modal()), porAria(modal())], pagina: [porLabel(page), porAria(page)] };
  };
  const resolver = async label => {
    const c = campo(label);
    const abertos = await page.getByRole("dialog").count();
    for (const loc of [...(abertos ? c.modal : []), ...c.pagina]) if (await loc.count() && await loc.isVisible()) return loc;
    throw new Error(`[${modulo.id}] campo "${label}" não encontrado`);
  };
  const pausa = ms => page.waitForTimeout(ms);
  const mover = async loc => {
    await loc.scrollIntoViewIfNeeded();
    const box = await loc.boundingBox();
    if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 20 });
    await pausa(250);
  };
  const t = {
    page, modal, pausa,
    legenda: async (texto, numero = "") => { await page.evaluate(([n, x]) => window.__legenda(n, x), [String(numero), texto]); await pausa(1800); },
    passo: n => t.legenda(modulo.passos[n - 1], n),
    // Aponta um elemento (locator ou label de campo). Se ele não existir nos dados da demo, só pausa.
    mostrar: async alvo => {
      const loc = typeof alvo === "string" ? await resolver(alvo).catch(() => null) : alvo;
      const visivel = loc && await loc.first().waitFor({ state: "visible", timeout: 3000 }).then(() => true, () => false);
      if (visivel) await mover(loc.first());
      await pausa(900);
    },
    clicar: async loc => { await mover(loc); await loc.click(); await pausa(700); },
    menu: async id => { await t.clicar(page.locator(`[data-nav-id="${id}"]`)); await pausa(500); },
    aba: nome => t.clicar(page.getByRole("tab", { name: nome })),
    botao: nome => t.clicar(page.locator('[data-tour="acoes"]').getByRole("button", { name: nome })),
    digitar: async (label, texto) => { const loc = await resolver(label); await t.clicar(loc); await loc.fill(""); await loc.pressSequentially(texto, { delay: 55 }); await pausa(300); },
    data: async (label, valor) => { const loc = await resolver(label); await mover(loc); await loc.fill(valor); await pausa(500); },
    escolher: async (label, opcao) => {
      const loc = await resolver(label);
      await mover(loc);
      await loc.selectOption(typeof opcao === "number" ? { index: opcao } : { label: opcao });
      await pausa(700);
    },
    cancelar: async () => {
      const botao = modal().getByRole("button", { name: "Cancelar" }).last();
      if (await botao.count()) await t.clicar(botao); else await page.keyboard.press("Escape");
      await pausa(500);
    },
  };
  return t;
}

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: EMAIL, senha: SENHA }) })
    .catch(() => {
      console.error(`O app não está respondendo em ${BASE}.\nRode \`npm run dev\` em outro terminal, espere subir e grave de novo.`);
      process.exit(1);
    });
  if (!res.ok) throw new Error(`Login falhou (${res.status}). O npm run dev está rodando?`);
  const { token, refreshToken, user, tenant } = await res.json();
  return { token, refreshToken, user, tenant, tourPendente: false, obtidoEm: Date.now() };
}

// O access token dura 15 min e o login tem limite de tentativas: renova pelo refresh antes de expirar
async function renovar(s) {
  if (Date.now() - s.obtidoEm < 10 * 60 * 1000) return s;
  const res = await fetch(`${BASE}/api/auth/refresh`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refreshToken: s.refreshToken }) });
  if (!res.ok) throw new Error(`Renovação do token falhou (${res.status}).`);
  const { token, refreshToken } = await res.json();
  return { ...s, token, refreshToken, obtidoEm: Date.now() };
}

const manifesto = existsSync(arqManifesto) ? JSON.parse(readFileSync(arqManifesto, "utf8")) : {};
const tmp = path.join(raiz, "node_modules/.cache/treinamentos");
mkdirSync(saida, { recursive: true });
mkdirSync(tmp, { recursive: true });

let sessao = await login();
const browser = await chromium.launch();
const falhas = [];
for (const modulo of modulos) {
  const roteiro = ROTEIROS[modulo.id];
  if (!roteiro) { falhas.push(`${modulo.id}: sem roteiro em roteiros.mjs`); continue; }
  process.stdout.write(`● ${modulo.id}… `);
  sessao = await renovar(sessao);
  const ctx = await browser.newContext({ viewport: TELA, locale: "pt-BR", recordVideo: { dir: tmp, size: TELA } });
  await ctx.addInitScript(s => { try { if (!sessionStorage.getItem("__trein")) { localStorage.setItem("session", s); sessionStorage.setItem("__trein", "1"); } } catch {} }, JSON.stringify(sessao));
  await ctx.addInitScript(OVERLAY);
  const page = await ctx.newPage();
  const video = page.video();
  try {
    await page.goto(`${BASE}/app/dashboard`);
    await page.locator('[data-nav-id="dashboard"]').waitFor();
    await page.getByText("Carregando…").waitFor({ state: "detached" });
    const t = helpers(page, modulo);
    await t.legenda(modulo.titulo);
    await roteiro(t);
    await t.pausa(1200);
    await ctx.close();
    const destino = path.join(saida, `${modulo.id}.webm`);
    rmSync(destino, { force: true });
    renameSync(await video.path(), destino);
    manifesto[modulo.id] = { hash: hashArquivos(modulo.fonte), gravadoEm: new Date().toISOString().slice(0, 10) };
    console.log("ok");
  } catch (e) {
    console.log("falhou");
    falhas.push(`${modulo.id}: ${e.message.split("\n")[0]}`);
    await page.screenshot({ path: path.join(tmp, `${modulo.id}-erro.png`) }).catch(() => {});
    await ctx.close();
    await video.delete().catch(() => {});
  }
  await new Promise(r => setTimeout(r, 1500)); // respeita o rate limit da API
}
await browser.close();
writeFileSync(arqManifesto, JSON.stringify(Object.fromEntries(Object.entries(manifesto).sort()), null, 2) + "\n");

if (falhas.length) {
  console.error(`\n${falhas.length} vídeo(s) não gravado(s):\n  - ${falhas.join("\n  - ")}\nCapturas do erro em ${path.relative(raiz, tmp)}/`);
  process.exit(1);
}
console.log(`\n${modulos.length} vídeo(s) em public/treinamentos/.`);
