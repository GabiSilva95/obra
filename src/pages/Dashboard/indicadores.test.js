import { test } from "node:test";
import assert from "node:assert/strict";
import { fmtCompacto, indicadoresCompras, indicadoresEstoque, indicadoresFluxo, indicadoresObras, maxDoGrafico, totalOrdem } from "./indicadores.js";

const PASSADO = "2000-01-01", FUTURO = "2999-12-31";
const etapa = (id, obraId, progresso, extra = {}) => ({ id, obraId, progresso, status: progresso >= 100 ? "Concluída" : "Pendente", dataInicioP: PASSADO, dataFimP: FUTURO, dataInicioR: PASSADO, ...extra });

const obraA = { id: 1, nome: "Casa A", status: "Em andamento", orcamento: 100000 };
const obraB = { id: 2, nome: "Casa B", status: "Em andamento", orcamento: 50000 };
const obraC = { id: 3, nome: "Casa C", status: "Concluída", orcamento: 10000 };
const obraD = { id: 4, nome: "Casa D", status: "Planejada", orcamento: 0 };

const dados = {
  etapasObra: [
    etapa(1, 1, 100), etapa(2, 1, 40), etapa(3, 1, 0, { dataInicioP: FUTURO, dataInicioR: null }),
    etapa(4, 2, 20, { dataFimP: PASSADO }), etapa(5, 2, 0, { dataInicioP: PASSADO, dataInicioR: null }),
    etapa(6, 3, 100), etapa(7, 4, 0, { dataInicioP: FUTURO, dataInicioR: null }),
  ],
  despesas: [{ obraId: 1, valor: 30000 }, { obraId: 2, valor: 47500 }, { obraId: 3, valor: 9800 }],
};

test("obras: progresso médio das obras não concluídas e etapas fechando o total", () => {
  const r = indicadoresObras([obraA, obraB, obraC, obraD], dados);
  // A: (100+40+0)/3 = 47 ; B: (20+0)/2 = 10 ; D (planejada): 0 ; média = 19 (a concluída C fica de fora)
  assert.equal(r.progressoMedio, 19);
  assert.equal(r.ativas, 2);
  const e = r.etapas;
  assert.equal(e.total, 7);
  assert.equal(e.concluidas + e.atrasadas + e.emAndamento + e.aIniciar, e.total);
  assert.deepEqual([e.concluidas, e.atrasadas, e.emAndamento, e.aIniciar], [2, 2, 1, 2]);
  assert.deepEqual(r.comAtraso.map(l => [l.obra.id, l.atrasadas]), [[2, 2]]);
});

test("obras: sem obra aberta usa as concluídas, e sem etapas não há média", () => {
  assert.equal(indicadoresObras([obraC], dados).progressoMedio, 100);
  assert.equal(indicadoresObras([obraD], dados).progressoMedio, 0);
  assert.equal(indicadoresObras([obraD], { etapasObra: [] }).progressoMedio, null);
  assert.equal(indicadoresObras([], dados).progressoMedio, null);
});

test("obras: orçamento total, saldo, percentual e obras perto do limite", () => {
  const r = indicadoresObras([obraA, obraB, obraC, obraD], dados);
  assert.equal(r.orcamentoTotal, 160000);
  assert.equal(r.custoTotal, 87300);
  assert.equal(r.saldoOrcamento, 72700);
  assert.equal(r.pctUsado, 55);
  // B está em 95%; C fechou em 98% mas está concluída; D não tem orçamento
  assert.deepEqual(r.pertoDoLimite.map(l => [l.obra.id, l.pct]), [[2, 95]]);
  assert.equal(indicadoresObras([obraD], dados).pctUsado, null);
});

test("obras: estouro aparece com mais de 100%", () => {
  const r = indicadoresObras([obraB], { ...dados, despesas: [{ obraId: 2, valor: 61000 }] });
  assert.deepEqual(r.pertoDoLimite.map(l => l.pct), [122]);
});

test("estoque: valor pelo custo do lote, com o custo do cadastro como reserva, e só itens com saldo", () => {
  const insumos = [{ id: 1, nome: "Cimento", unidade: "sc", custoUnit: 30 }, { id: 2, nome: "Areia", unidade: "m3", custoUnit: 100 }, { id: 3, nome: "Tijolo", unidade: "un", custoUnit: 1 }];
  const estoques = [
    { obraId: 1, insumoId: 1, quantEntrada: 100, quantUtilizado: 40, custoUnit: 25 }, // 60 × 25 = 1500
    { obraId: 2, insumoId: 1, quantEntrada: 10, quantUtilizado: 0, custoUnit: 0 },    // 10 × 30 (cadastro) = 300
    { obraId: 1, insumoId: 2, quantEntrada: 5, quantUtilizado: 5, custoUnit: 100 },   // zerado
    { obraId: 3, insumoId: 3, quantEntrada: 1000, quantUtilizado: 0, custoUnit: 1 },  // obra fora do filtro
    { obraId: 1, insumoId: 99, quantEntrada: 5, quantUtilizado: 0, custoUnit: 5 },    // insumo apagado
  ];
  const r = indicadoresEstoque([obraA, obraB], { insumos, estoques });
  assert.equal(r.valorEmEstoque, 1800);
  assert.equal(r.valorConsumido, 1500); // 40 × 25 do cimento + 5 × 100 da areia já usada
  assert.equal(r.itens, 1);
  assert.deepEqual(r.maiores.map(m => [m.insumo.nome, m.saldo, m.valor]), [["Cimento", 70, 1800]]);
});

test("estoque: ranking dos maiores saldos limitado a cinco", () => {
  const insumos = Array.from({ length: 8 }, (_, i) => ({ id: i + 1, nome: `I${i + 1}`, unidade: "un", custoUnit: i + 1 }));
  const estoques = insumos.map(i => ({ obraId: 1, insumoId: i.id, quantEntrada: 10, quantUtilizado: 0, custoUnit: i.custoUnit }));
  const r = indicadoresEstoque([obraA], { insumos, estoques });
  assert.equal(r.itens, 8);
  assert.deepEqual(r.maiores.map(m => m.insumo.nome), ["I8", "I7", "I6", "I5", "I4"]);
});

test("compras: total de ordem nova e antiga, abertas, do mês e as mais antigas sem entrega", () => {
  assert.equal(totalOrdem({ itens: [{ quantidade: 2, valorUnit: 10 }, { quantidade: 1, valorUnit: 5.5 }] }), 25.5);
  assert.equal(totalOrdem({ itens: [], quantidade: 3, valorUnit: 4 }), 12);
  const compras = [
    { id: 1, numero: 1, obraId: 1, status: "Pendente", data: "2026-10-01", itens: [{ quantidade: 1, valorUnit: 1000 }] },
    { id: 2, numero: 2, obraId: 1, status: "Aprovada", data: "2026-09-20", itens: [{ quantidade: 2, valorUnit: 500 }] },
    { id: 3, numero: 3, obraId: 2, status: "Entregue", data: "2026-10-03", itens: [{ quantidade: 1, valorUnit: 700 }] },
    { id: 4, numero: 4, obraId: 2, status: "Cancelada", data: "2026-10-04", itens: [{ quantidade: 1, valorUnit: 9999 }] },
    { id: 5, numero: 5, obraId: 3, status: "Pendente", data: "2026-10-02", itens: [{ quantidade: 1, valorUnit: 123 }] }, // outra obra
  ];
  const r = indicadoresCompras(compras, [obraA, obraB], "2026-10-07");
  assert.deepEqual(r.pendentes, { qtd: 1, valor: 1000 });
  assert.deepEqual(r.aprovadas, { qtd: 1, valor: 1000 });
  assert.deepEqual(r.emAberto, { qtd: 2, valor: 2000 });
  assert.deepEqual(r.doMes, { qtd: 2, valor: 1700 }); // pendente + entregue de outubro; cancelada e setembro ficam fora
  assert.deepEqual(r.aguardando.map(a => [a.ordem.numero, a.dias]), [[2, 17], [1, 6]]);
});

test("fluxo: semanas com realizado + previsto e a primeira semana de caixa negativo", () => {
  const p = (chave, er, sr, ep, sp, acumulado, fim) => ({ chave, inicio: chave, fim, entradasReais: er, saidasReais: sr, entradasPrev: ep, saidasPrev: sp, acumulado });
  const r = indicadoresFluxo({
    hoje: "2026-10-07", ate: "2026-11-01", saldoFinal: -300,
    atrasado: { entradas: 0, saidas: 500 }, totais: { entradasPrev: 800, saidasPrev: 1500 },
    periodos: [
      p("2026-09-28", 0, 0, 0, 0, -50, "2026-10-04"), // semana passada, já negativa: não é aviso
      p("2026-10-05", 100, 50, 400, 600, 150, "2026-10-11"),
      p("2026-10-12", 0, 0, 400, 900, -350, "2026-10-18"),
    ],
  });
  assert.deepEqual(r.semanas.map(s => [s.entradas, s.saidas]), [[0, 0], [500, 650], [400, 900]]);
  assert.equal(r.negativo.chave, "2026-10-12");
  assert.equal(r.saldoProjetado, -300);
  assert.equal(indicadoresFluxo({ hoje: "2026-10-07", ate: "2026-11-01", saldoFinal: 10, atrasado: { entradas: 0, saidas: 0 }, totais: { entradasPrev: 0, saidasPrev: 0 }, periodos: [] }).negativo, null);
});

test("gráfico: rótulo curto e topo do eixo redondo", () => {
  assert.equal(fmtCompacto(850), "R$ 850");
  assert.equal(fmtCompacto(12500), "R$ 12,5 mil");
  assert.equal(fmtCompacto(123456), "R$ 123 mil");
  assert.equal(fmtCompacto(2_300_000), "R$ 2,3 mi");
  assert.equal(fmtCompacto(-4000), "-R$ 4 mil");
  for (const v of [1, 87, 999, 12345, 123456, 5_400_000]) {
    const mx = maxDoGrafico([v]);
    assert.ok(mx >= v, `${mx} cobre ${v}`);
    assert.ok(mx < v * 2.1 + 4, `${mx} não passa muito de ${v}`);
  }
  assert.equal(maxDoGrafico([]), 100);
  assert.equal(maxDoGrafico([0, 0]), 100);
  assert.equal(maxDoGrafico([123456]), 160000);
});
