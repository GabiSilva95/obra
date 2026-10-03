// Confere se a Central de treinamentos acompanha o código das telas.
//
//   npm run treinamentos:verificar            → lista o que está desatualizado e sai com erro
//   npm run treinamentos:verificar -- --avisar → só lista (não quebra o build)
//
// Regras:
//  1. Todo campo de formulário (label de Input/Select/Textarea/MoneyInput/Field) nos arquivos `fonte`
//     de um módulo precisa estar descrito em `campos` de algum módulo que usa o mesmo arquivo.
//  2. Todo item do menu (MENU em src/components/Sidebar.jsx) precisa ter pelo menos um módulo.
//  3. O vídeo de cada módulo precisa existir e ter sido gravado depois da última mudança nos
//     arquivos `fonte` (hash em src/treinamentos/manifesto.json, escrito por gravar.mjs).
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { MODULOS } from "../../src/treinamentos/conteudo.js";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ler = rel => readFileSync(path.join(raiz, rel), "utf8");
const norm = s => s.normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase();

export const hashArquivos = arquivos =>
  createHash("sha256").update(arquivos.map(a => `${a}\n${ler(a)}`).join("\n")).digest("hex").slice(0, 16);

// Labels estáticos dos controles de formulário. Pega label="X", label={"X"}, os ramos de ternários
// (label={cond ? "A" : "B"}) e o texto fixo antes de ${} em template literals. Seletores sem label
// visível (filtros do topo) entram pelo aria-label; o UploadBox, pelo title.
const ATRIBUTOS = [
  ["Input|Select|Textarea|MoneyInput|Field", "label"],
  ["Input|Select", "aria-label"],
  ["UploadBox", "title"],
];
const textosDaExpressao = valor => {
  if (valor.startsWith('"')) return [valor.slice(1, -1)];
  const expr = valor.slice(1, -1).trim();
  if (/^"[^"]*"$/.test(expr)) return [expr.slice(1, -1)];
  const tpl = /^`([^`]*)`$/.exec(expr);
  if (tpl) return [tpl[1].split("${")[0].replace(/[:·\s]+$/, "")];
  return [...expr.matchAll(/[?:]\s*"([^"]+)"/g)].map(m => m[1]);
};
export function labelsDoArquivo(codigo) {
  const achados = new Set();
  for (const [tags, attr] of ATRIBUTOS) {
    const re = new RegExp(`<(?:${tags})\\b[^>]*?\\s${attr}=(\\{(?:[^{}]|\\{[^{}]*\\})*\\}|"[^"]*")`, "gs");
    for (const [, valor] of codigo.matchAll(re)) for (const t of textosDaExpressao(valor)) achados.add(t);
  }
  return [...achados].filter(l => l && !/^(undefined|null)$/.test(l));
}

export function verificar() {
  const problemas = [];
  const manifesto = existsSync(path.join(raiz, "src/treinamentos/manifesto.json"))
    ? JSON.parse(ler("src/treinamentos/manifesto.json")) : {};

  // 1. Campos documentados
  const porArquivo = new Map();
  for (const m of MODULOS) for (const f of m.fonte) {
    if (!existsSync(path.join(raiz, f))) { problemas.push(`[${m.id}] arquivo de fonte não existe: ${f}`); continue; }
    if (!porArquivo.has(f)) porArquivo.set(f, new Set());
    for (const c of m.campos) for (const r of [c.nome, ...(c.rotulos || [])]) porArquivo.get(f).add(norm(r));
  }
  for (const [arquivo, documentados] of porArquivo) {
    for (const label of labelsDoArquivo(ler(arquivo))) {
      if (!documentados.has(norm(label))) {
        const mods = MODULOS.filter(m => m.fonte.includes(arquivo)).map(m => m.id).join(", ");
        problemas.push(`[${mods}] campo "${label}" de ${arquivo} não está descrito em src/treinamentos/conteudo.js`);
      }
    }
  }

  // 2. Menu coberto
  const ids = [...ler("src/components/Sidebar.jsx").matchAll(/\{\s*id:\s*"([^"]+)"/g)].map(m => m[1]);
  for (const id of ids) {
    if (["treinamentos", "sair", "menu"].includes(id)) continue;
    if (!MODULOS.some(m => m.menuId === id)) problemas.push(`item de menu "${id}" não tem módulo na Central de treinamentos`);
  }

  // 3. Vídeos atualizados
  for (const m of MODULOS) {
    const video = path.join(raiz, "public/treinamentos", `${m.id}.webm`);
    if (!existsSync(video)) { problemas.push(`[${m.id}] vídeo não gravado: public/treinamentos/${m.id}.webm`); continue; }
    if (m.fonte.every(f => existsSync(path.join(raiz, f))) && manifesto[m.id]?.hash !== hashArquivos(m.fonte)) {
      problemas.push(`[${m.id}] tela mudou depois da gravação do vídeo (${m.fonte.join(", ")})`);
    }
  }
  return problemas;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const avisar = process.argv.includes("--avisar");
  const problemas = verificar();
  if (!problemas.length) { console.log("Central de treinamentos em dia com as telas."); process.exit(0); }
  console.log(`Central de treinamentos desatualizada (${problemas.length}):`);
  for (const p of problemas) console.log(`  - ${p}`);
  console.log("\nAtualize src/treinamentos/conteudo.js e scripts/treinamentos/roteiros.mjs, depois regrave:");
  console.log("  npm run treinamentos:gravar -- --so <id>   (com npm run dev rodando)");
  process.exit(avisar ? 0 : 1);
}
