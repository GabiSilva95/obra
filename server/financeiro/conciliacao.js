// Motor de sugestões da conciliação: casa linhas do extrato com baixas do sistema.
// Só sugere; quem confirma é o usuário.
import { createHash } from "node:crypto";
import { diasEntre } from "../utils/datas.js";
import { emCentavos } from "./dinheiro.js";

const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ");
const PALAVRAS_FRACAS = new Set(["de", "da", "do", "das", "dos", "ltda", "me", "epp", "sa", "s", "a", "e", "com", "comercio", "servicos"]);

/** Palavras do nome da pessoa que aparecem na descrição do extrato (0 a 1). */
export function afinidadeNome(nome, descricao) {
  const palavras = norm(nome).split(/\s+/).filter(p => p.length >= 3 && !PALAVRAS_FRACAS.has(p));
  if (!palavras.length) return 0;
  const alvo = ` ${norm(descricao)} `;
  return palavras.filter(p => alvo.includes(` ${p}`)).length / palavras.length;
}

/** Identificador estável de uma linha do extrato, para não importar a mesma duas vezes. */
export function hashLancamento({ fitid, data, valor, descricao }, ordem = 0) {
  const base = fitid ? `fit:${fitid}` : `${data}|${emCentavos(valor)}|${norm(descricao).trim()}|${ordem}`;
  return createHash("sha1").update(base).digest("hex");
}

/** Marca a ordem de repetição: duas linhas idênticas no mesmo arquivo (dois cafés no mesmo dia) não viram uma. */
export function comHashes(transacoes) {
  const vistos = new Map();
  return transacoes.map(t => {
    const chave = t.fitid ? `fit:${t.fitid}` : `${t.data}|${emCentavos(t.valor)}|${norm(t.descricao).trim()}`;
    const n = vistos.get(chave) || 0;
    vistos.set(chave, n + 1);
    return { ...t, hash: hashLancamento(t, n) };
  });
}

/**
 * Para cada lançamento pendente, procura baixas livres cujo movimento (com sinal) some exatamente o valor,
 * dentro da janela de dias. Considera uma baixa sozinha ou um grupo de até 4 baixas (pagamento em lote).
 *
 * lancamentos: [{ id, data, valorCent, descricao }]
 * baixas:      [{ id, data, movimentoCent (com sinal), pessoa }]
 * Devolve [{ lancamentoId, baixaIds, confianca: "alta"|"media", pontos, motivos }], melhor primeiro.
 */
export function sugerir(lancamentos, baixas, { janelaDias = 3, maxGrupo = 4 } = {}) {
  const usadasPorUnica = new Map(); // baixa -> quantas linhas a querem como par único
  const resultado = [];
  for (const l of lancamentos) {
    const candidatas = baixas.filter(b => Math.abs(diasEntre(b.data, l.data)) <= janelaDias && Math.sign(b.movimentoCent) === Math.sign(l.valorCent));
    const achados = [];
    for (const b of candidatas) if (b.movimentoCent === l.valorCent) achados.push([b]);
    if (!achados.length && candidatas.length > 1) {
      // Combinação: pagamento em lote debitado numa linha só (só vale com baixas da mesma data)
      const porData = new Map();
      for (const b of candidatas) porData.set(b.data, [...(porData.get(b.data) || []), b]);
      for (const grupo of porData.values()) combinar(grupo, l.valorCent, maxGrupo, achados);
    }
    for (const g of achados) {
      const dias = Math.max(...g.map(b => Math.abs(diasEntre(b.data, l.data))));
      const nome = Math.max(...g.map(b => afinidadeNome(b.pessoa, l.descricao)));
      const pontos = 50 + (3 - Math.min(dias, 3)) * 8 + Math.round(nome * 26) - (g.length > 1 ? 10 : 0);
      const motivos = ["valor igual", dias === 0 ? "mesma data" : `${dias} dia(s) de diferença`, ...(nome > 0 ? ["nome na descrição"] : []), ...(g.length > 1 ? [`${g.length} pagamentos somados`] : [])];
      resultado.push({ lancamentoId: l.id, baixaIds: g.map(b => b.id), pontos, motivos, concorrentes: achados.length });
      if (g.length === 1) usadasPorUnica.set(g[0].id, (usadasPorUnica.get(g[0].id) || 0) + 1);
    }
  }
  return resultado
    .map(r => ({ ...r, confianca: r.concorrentes === 1 && r.baixaIds.every(id => (usadasPorUnica.get(id) || 1) === 1) ? "alta" : "media" }))
    .sort((a, b) => b.pontos - a.pontos);
}

function combinar(baixas, alvo, max, saida) {
  const n = baixas.length;
  if (n > 14) return; // evita explosão: grupos grandes ficam para conciliação manual
  const rec = (inicio, escolhidas, soma) => {
    if (escolhidas.length >= 2 && soma === alvo) { saida.push(escolhidas.map(i => baixas[i])); return; }
    if (escolhidas.length >= max) return;
    for (let i = inicio; i < n; i++) rec(i + 1, [...escolhidas, i], soma + baixas[i].movimentoCent);
  };
  rec(0, [], 0);
}

/** Melhor sugestão por lançamento, sem reaproveitar a mesma baixa em duas linhas. */
export function melhoresSugestoes(sugestoes) {
  const usadas = new Set(), lancamentos = new Set(), saida = [];
  for (const s of sugestoes) {
    if (lancamentos.has(s.lancamentoId) || s.baixaIds.some(id => usadas.has(id))) continue;
    lancamentos.add(s.lancamentoId); s.baixaIds.forEach(id => usadas.add(id)); saida.push(s);
  }
  return saida;
}
