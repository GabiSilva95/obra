// Leitor de extrato em CSV (planilha exportada do internet banking).
import { numeroBR } from "./ofx.js";

/** Divide o texto em linhas de células, respeitando aspas e o separador (; , ou tab). */
export function lerCelulas(texto) {
  const t = texto.replace(/^﻿/, "");
  const primeira = t.split(/\r?\n/).find(l => l.trim()) || "";
  const sep = [";", "\t", ","].map(s => [s, primeira.split(s).length]).sort((a, b) => b[1] - a[1])[0][0];
  const linhas = []; let cel = "", linha = [], aspas = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (aspas) { if (c === '"' && t[i + 1] === '"') { cel += '"'; i++; } else if (c === '"') aspas = false; else cel += c; }
    else if (c === '"') aspas = true;
    else if (c === sep) { linha.push(cel.trim()); cel = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && t[i + 1] === "\n") i++; linha.push(cel.trim()); cel = ""; if (linha.some(Boolean)) linhas.push(linha); linha = []; }
    else cel += c;
  }
  linha.push(cel.trim()); if (linha.some(Boolean)) linhas.push(linha);
  return linhas;
}

/** "05/10/2026", "5/10/26" ou "2026-10-05" → "2026-10-05". */
export function dataCsv(v) {
  const s = String(v || "").trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/.exec(s);
  if (!m) return null;
  const ano = m[3].length === 2 ? `20${m[3]}` : m[3];
  const dia = Number(m[1]), mes = Number(m[2]);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

const norm = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const ACHAR = {
  data: /^(data|date|dt|lancamento|dt\.? ?lanc)/, descricao: /(descri|historico|memo|estabelecimento|detalhe|lancamento$)/,
  valor: /^(valor|amount|quantia|montante)/, credito: /(credito|entrada|receita)/, debito: /(debito|saida|despesa)/,
};

/** Sugere em qual coluna está cada informação, pelo nome do cabeçalho. */
export function detectarColunas(cabecalho) {
  const m = {};
  cabecalho.forEach((c, i) => {
    const n = norm(c);
    for (const [k, re] of Object.entries(ACHAR)) if (m[k] === undefined && re.test(n)) m[k] = i;
  });
  if (m.descricao === m.data) delete m.descricao;
  return m;
}

/** Valor com sinal: aceita "(123,45)", "123,45-", "123,45 D" e "123,45 C". */
function valorCsv(v) {
  let s = String(v || "").trim();
  if (!s) return NaN;
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
  if (/-$/.test(s)) { neg = true; s = s.slice(0, -1); }
  if (/\s*D$/i.test(s)) { neg = true; s = s.replace(/\s*D$/i, ""); } else s = s.replace(/\s*C$/i, "");
  const n = numeroBR(s);
  return neg ? -Math.abs(n) : n;
}

/** `mapeamento`: { data, descricao, valor } ou { data, descricao, credito, debito } (índices de coluna). */
export function lerCsv(texto, mapeamento) {
  const linhas = lerCelulas(texto);
  if (linhas.length < 2) throw new Error("O arquivo não tem lançamentos.");
  // O cabeçalho é a primeira linha que contém uma data reconhecível na linha seguinte
  let ini = linhas.findIndex((l, i) => i + 1 < linhas.length && l.every(c => !dataCsv(c)) && linhas[i + 1].some(c => dataCsv(c)));
  if (ini < 0) ini = 0;
  const cabecalho = linhas[ini];
  const sugerido = detectarColunas(cabecalho);
  const m = { ...sugerido, ...(mapeamento || {}) };
  const completo = m.data !== undefined && (m.valor !== undefined || (m.credito !== undefined && m.debito !== undefined));
  const transacoes = [];
  if (completo) {
    for (const l of linhas.slice(ini + 1)) {
      const data = dataCsv(l[m.data]);
      if (!data) continue;
      let valor;
      if (m.valor !== undefined) valor = valorCsv(l[m.valor]);
      else { const c = valorCsv(l[m.credito]), d = valorCsv(l[m.debito]); valor = (Number.isFinite(c) ? Math.abs(c) : 0) - (Number.isFinite(d) ? Math.abs(d) : 0); if (!c && !d) valor = NaN; }
      if (!Number.isFinite(valor) || valor === 0) continue;
      transacoes.push({ data, valor: Math.round(valor * 100) / 100, descricao: (m.descricao !== undefined ? l[m.descricao] : "") || "Lançamento", fitid: null, tipo: null });
    }
  }
  const datas = transacoes.map(t => t.data).sort();
  return { formato: "csv", cabecalho, mapeamento: m, completo, periodoInicio: datas[0] || null, periodoFim: datas.at(-1) || null, saldoFinal: null, dataSaldoFinal: null, transacoes };
}
