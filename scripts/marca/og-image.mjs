// Gera a imagem de compartilhamento da landing (Open Graph, 1200x630) com os tokens e o logo do design system.
// É a imagem que aparece quando o link é colado no WhatsApp, Instagram, LinkedIn etc.
//
//   node scripts/marca/og-image.mjs   → public/og-construktpro.png
//
// Mudou a frase principal da landing (src/pages/Landing/Topo.jsx)? Rode de novo.
import { chromium } from "@playwright/test";
import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const css = pathToFileURL(path.join(raiz, "design-system/styles.css")).href;
const logo = pathToFileURL(path.join(raiz, "design-system/assets/logo-negativo.svg")).href;
const saida = path.join(raiz, "public/og-construktpro.png");

const html = `<!doctype html><html data-theme="light"><head><meta charset="utf-8"><link rel="stylesheet" href="${css}">
<style>
  body { margin: 0; width: 100vw; height: 100vh; overflow: hidden; background: var(--surface-sidebar); color: var(--text-on-sidebar); font-family: var(--font-sans); }
  .grade { position: absolute; inset: 0; opacity: .5; background-image: linear-gradient(var(--surface-sidebar-hover) var(--border-w), transparent var(--border-w)), linear-gradient(90deg, var(--surface-sidebar-hover) var(--border-w), transparent var(--border-w)); background-size: var(--space-8) var(--space-8); }
  main { position: relative; height: 100%; box-sizing: border-box; padding: var(--space-16) var(--space-16); display: flex; flex-direction: column; justify-content: space-between; }
  h1 { margin: 0; font-size: var(--fs-hero); font-weight: var(--fw-black); line-height: var(--lh-hero); letter-spacing: var(--ls-tight); max-width: 90%; }
  .viga { background: linear-gradient(var(--accent), var(--accent)) no-repeat 0 92% / 100% var(--space-2); }
  .rodape { display: flex; justify-content: space-between; align-items: center; font-size: var(--fs-p1); font-weight: var(--fw-bold); }
  .selo { background: var(--accent); color: var(--text-on-accent); padding: var(--space-3) var(--space-5); border-radius: var(--radius-md); font-weight: var(--fw-extrabold); }
</style></head><body><div class="grade"></div><main>
  <img src="${logo}" alt="" style="height: var(--space-16); align-self: flex-start">
  <h1>Sua obra está dando lucro ou prejuízo? <span class="viga">Saiba hoje.</span></h1>
  <div class="rodape"><span style="color: var(--text-on-sidebar-muted)">construktpro.com.br</span><span class="selo">Teste grátis por 14 dias</span></div>
</main></body></html>`;

// Uma página em branco (setContent) não carrega CSS de arquivo local: abre o HTML como arquivo
const temp = mkdtempSync(path.join(tmpdir(), "og-"));
const arquivo = path.join(temp, "og.html");
writeFileSync(arquivo, html);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto(pathToFileURL(arquivo).href, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: saida });
await browser.close();
rmSync(temp, { recursive: true, force: true });
console.log(`Imagem salva em ${path.relative(raiz, saida)}`);
