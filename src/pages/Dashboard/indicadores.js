// Indicadores da tela de Início. Funções puras: recebem os dados já carregados (`data`) e devolvem números.
// Extensão explícita nos imports para o `npm test` (node) conseguir carregar o arquivo.
import { calcProg, calcCustoObra, isAtrasada } from "../../utils/helpers.js";
import { diasEntre } from "../../../server/utils/datas.js";

const soma = (lista, f) => lista.reduce((s, x) => s + f(x), 0);

/** Valor de uma ordem de compra (itens, ou os campos antigos de ordem com um item só). Mesma regra da tela de Compras. */
export const totalOrdem = ordem => (ordem.itens?.length
  ? soma(ordem.itens, i => (i.quantidade || 0) * (i.valorUnit || 0))
  : (ordem.quantidade || 0) * (ordem.valorUnit || 0));

// ─── Obras ────────────────────────────────────────────────────────────────────

/**
 * `obras`: as obras que o usuário vê (já filtradas). Progresso médio considera as obras que têm cronograma e
 * ainda não foram concluídas (concluídas em 100% inflariam a média); se todas estiverem concluídas, usa todas.
 * Não depende do status "Em andamento": quem não atualiza o status (o padrão é "Planejada") continua com o número.
 * Orçamento considera todas as obras listadas, como o custo total que o painel já mostrava.
 */
export function indicadoresObras(obras, data) {
  const { etapasObra = [] } = data;
  const ids = new Set(obras.map(o => o.id));
  const etapas = etapasObra.filter(e => ids.has(e.obraId));

  const comCronograma = obras.filter(o => etapasObra.some(e => e.obraId === o.id));
  const abertas = comCronograma.filter(o => o.status !== "Concluída");
  const baseProgresso = abertas.length ? abertas : comCronograma;
  const progressoMedio = baseProgresso.length ? Math.round(soma(baseProgresso, o => calcProg(o.id, etapasObra)) / baseProgresso.length) : null;

  const contagem = { total: etapas.length, concluidas: 0, atrasadas: 0, emAndamento: 0, aIniciar: 0 };
  for (const e of etapas) {
    if (e.status === "Concluída" || e.progresso >= 100) contagem.concluidas++;
    else if (isAtrasada(e)) contagem.atrasadas++;
    else if (e.progresso > 0) contagem.emAndamento++;
    else contagem.aIniciar++;
  }

  const linhas = obras.map(obra => {
    const custo = calcCustoObra(obra.id, data);
    const orcamento = obra.orcamento || 0;
    return {
      obra, custo, orcamento,
      pct: orcamento > 0 ? Math.round((custo / orcamento) * 100) : null,
      atrasadas: etapas.filter(e => e.obraId === obra.id && isAtrasada(e)).length,
    };
  });
  const orcamentoTotal = soma(linhas, l => l.orcamento);
  const custoTotal = soma(linhas, l => l.custo);
  return {
    ativas: obras.filter(o => o.status === "Em andamento").length,
    progressoMedio,
    etapas: contagem,
    comAtraso: linhas.filter(l => l.atrasadas > 0).sort((a, b) => b.atrasadas - a.atrasadas),
    orcamentoTotal, custoTotal,
    saldoOrcamento: orcamentoTotal - custoTotal,
    pctUsado: orcamentoTotal > 0 ? Math.round((custoTotal / orcamentoTotal) * 100) : null,
    // obra concluída que fechou perto do orçamento não pede ação
    pertoDoLimite: linhas.filter(l => l.obra.status !== "Concluída" && l.pct !== null && l.pct >= 90).sort((a, b) => b.pct - a.pct),
  };
}

// ─── Estoque e compras ────────────────────────────────────────────────────────

/** Posição do estoque das obras listadas. Custo do lote, como na tela de Estoque (cai no custo do cadastro se o lote não tem). */
export function indicadoresEstoque(obras, data) {
  const { estoques = [], insumos = [] } = data;
  const ids = new Set(obras.map(o => o.id));
  const insumoPorId = new Map(insumos.map(i => [i.id, i]));
  let valorEmEstoque = 0, valorConsumido = 0;
  const porInsumo = new Map();
  for (const e of estoques) {
    const ins = insumoPorId.get(e.insumoId);
    if (!ids.has(e.obraId) || !ins) continue;
    const saldo = e.quantEntrada - e.quantUtilizado;
    const cu = e.custoUnit || ins.custoUnit || 0;
    valorEmEstoque += cu * saldo;
    valorConsumido += cu * e.quantUtilizado;
    if (saldo > 1e-9) {
      const l = porInsumo.get(ins.id) || { insumo: ins, saldo: 0, valor: 0 };
      l.saldo += saldo; l.valor += cu * saldo;
      porInsumo.set(ins.id, l);
    }
  }
  return {
    valorEmEstoque, valorConsumido,
    itens: porInsumo.size,
    maiores: [...porInsumo.values()].sort((a, b) => b.valor - a.valor).slice(0, 5),
  };
}

/** Ordens de compra das obras listadas: abertas (pendentes e aprovadas), as mais antigas sem entrega e o total do mês. */
export function indicadoresCompras(compras, obras, hoje) {
  const ids = new Set(obras.map(o => o.id));
  const doFiltro = compras.filter(c => ids.has(c.obraId));
  const por = status => { const l = doFiltro.filter(c => c.status === status); return { qtd: l.length, valor: soma(l, totalOrdem) }; };
  const pendentes = por("Pendente"), aprovadas = por("Aprovada");
  const doMes = doFiltro.filter(c => c.status !== "Cancelada" && c.data?.slice(0, 7) === hoje.slice(0, 7));
  return {
    pendentes, aprovadas,
    emAberto: { qtd: pendentes.qtd + aprovadas.qtd, valor: pendentes.valor + aprovadas.valor },
    doMes: { qtd: doMes.length, valor: soma(doMes, totalOrdem) },
    aguardando: doFiltro.filter(c => c.status === "Pendente" || c.status === "Aprovada")
      .map(ordem => ({ ordem, dias: Math.max(0, diasEntre(ordem.data, hoje)), valor: totalOrdem(ordem) }))
      .sort((a, b) => b.dias - a.dias).slice(0, 4),
  };
}

// ─── Fluxo de caixa ───────────────────────────────────────────────────────────

/** Resposta de /financeiro/fluxo em semanas: entradas e saídas (realizado + previsto), saldo acumulado e a primeira semana negativa. */
export function indicadoresFluxo(r) {
  return {
    semanas: r.periodos.map(p => ({
      chave: p.chave, inicio: p.inicio, fim: p.fim,
      entradas: p.entradasReais + p.entradasPrev, saidas: p.saidasReais + p.saidasPrev, acumulado: p.acumulado,
    })),
    entradasPrev: r.totais.entradasPrev, saidasPrev: r.totais.saidasPrev,
    atrasado: r.atrasado, saldoProjetado: r.saldoFinal, ate: r.ate,
    negativo: r.periodos.find(p => p.fim >= r.hoje && p.acumulado < 0) || null,
  };
}

// ─── Gráfico ──────────────────────────────────────────────────────────────────

/** "R$ 12 mil", "R$ 1,2 mi": rótulo curto para o eixo do gráfico. */
export function fmtCompacto(v) {
  const a = Math.abs(v), s = v < 0 ? "-" : "";
  const n = (x, d) => x.toLocaleString("pt-BR", { maximumFractionDigits: d });
  if (a >= 1e6) return `${s}R$ ${n(a / 1e6, 1)} mi`;
  if (a >= 1e3) return `${s}R$ ${n(a / 1e3, a >= 1e5 ? 0 : 1)} mil`;
  return `${s}R$ ${n(a, 0)}`;
}

/** Topo do eixo do gráfico: o menor valor "redondo" que cobre o maior, com degraus que dividem bem em `ticks`. */
export function maxDoGrafico(valores, ticks = 4) {
  const mx = Math.max(...valores, 0);
  if (mx <= 0) return 100;
  const alvo = mx / ticks;
  const base = 10 ** Math.floor(Math.log10(alvo));
  return [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map(f => f * base).find(p => p >= alvo - 1e-9) * ticks;
}
