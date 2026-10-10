import test from "node:test";
import assert from "node:assert/strict";
import { montarFluxo, envelhecimento, chavePeriodo, parteDoFiltro } from "./fluxo.js";

const T = (o) => ({ status: "aberto", baixas: [], rateios: [], tipo: "pagar", valor: 100, ...o });
const baixa = (data, valor, extra = {}) => ({ data, contaId: 1, valor, juros: 0, multa: 0, desconto: 0, estornadaEm: null, ...extra });

test("períodos: semana começa na segunda, mês no dia 1", () => {
  assert.equal(chavePeriodo("2026-10-07", "semana"), "2026-10-05"); // quarta → segunda
  assert.equal(chavePeriodo("2026-10-04", "semana"), "2026-09-28"); // domingo → segunda anterior
  assert.equal(chavePeriodo("2026-10-31", "mes"), "2026-10-01");
  assert.equal(chavePeriodo("2026-10-07", "dia"), "2026-10-07");
});

test("fluxo: realizado nas datas das baixas, previsto no vencimento do saldo", () => {
  const titulos = [
    T({ tipo: "receber", valor: 1000, vencimento: "2026-10-02", status: "quitado", baixas: [baixa("2026-10-02", 1000)] }),
    T({ tipo: "pagar", valor: 600, vencimento: "2026-10-03", status: "parcial", baixas: [baixa("2026-10-03", 200)] }), // sobra 400, vencida
    T({ tipo: "pagar", valor: 300, vencimento: "2026-10-12" }),
    T({ tipo: "receber", valor: 500, vencimento: "2026-10-14" }),
    T({ tipo: "pagar", valor: 999, vencimento: "2026-10-20", status: "cancelado" }),
  ];
  const f = montarFluxo({ titulos, hoje: "2026-10-08", de: "2026-10-01", ate: "2026-10-18", agrupar: "semana", saldoInicialCent: 100000 });
  assert.deepEqual(f.periodos.map(p => p.chave), ["2026-09-28", "2026-10-05", "2026-10-12"]);
  assert.equal(f.periodos[0].entradasReais, 1000); assert.equal(f.periodos[0].saidasReais, 200);
  assert.equal(f.atrasado.saidas, 400, "o saldo vencido e não pago fica em atraso");
  assert.equal(f.periodos[2].saidasPrev, 300); assert.equal(f.periodos[2].entradasPrev, 500);
  assert.equal(f.saldoInicial, 1000);
  assert.equal(f.saldoComAtraso, 600);
  assert.equal(f.periodos[0].acumulado, 600 + 800);
  assert.equal(f.saldoFinal, 600 + 800 + 200, "1000 inicial - 400 atraso + 800 realizado + 200 previsto");
  assert.equal(f.periodos[0].passado, true); assert.equal(f.periodos[2].passado, false);
});

test("fluxo: baixa estornada e fora do período não contam; juros e desconto mudam o dinheiro", () => {
  const titulos = [T({ tipo: "pagar", valor: 100, status: "quitado", baixas: [baixa("2026-10-05", 100, { juros: 5, desconto: 2 }), baixa("2026-10-06", 50, { estornadaEm: "2026-10-07" }), baixa("2026-09-01", 10)] })];
  const f = montarFluxo({ titulos, hoje: "2026-10-10", de: "2026-10-01", ate: "2026-10-31", agrupar: "mes" });
  assert.equal(f.periodos[0].saidasReais, 103);
});

test("fluxo: filtro por conta limita o realizado; filtro por obra reparte pelo rateio", () => {
  const rateios = [{ obraId: 1, centroCustoId: null, valor: 60 }, { obraId: 2, centroCustoId: null, valor: 40 }];
  const titulos = [T({ tipo: "pagar", valor: 100, status: "quitado", rateios, baixas: [baixa("2026-10-05", 100, { contaId: 1 })] }), T({ tipo: "pagar", valor: 100, vencimento: "2026-10-20", rateios })];
  const base = { titulos, hoje: "2026-10-10", de: "2026-10-01", ate: "2026-10-31", agrupar: "mes" };
  assert.equal(montarFluxo({ ...base, obraId: 1 }).periodos[0].saidasReais, 60);
  assert.equal(montarFluxo({ ...base, obraId: 2 }).periodos[0].saidasPrev, 40);
  assert.equal(montarFluxo({ ...base, contaId: 2 }).periodos[0].saidasReais, 0);
  assert.equal(montarFluxo({ ...base, obraId: 99 }).periodos[0].saidasReais, 0);
  assert.equal(parteDoFiltro(-100, [], { obraId: 1 }), 0);
  assert.equal(parteDoFiltro(-100, rateios, {}), -100);
});

test("envelhecimento por pessoa e faixa", () => {
  const titulos = [
    T({ valor: 100, vencimento: "2026-10-20", pessoa: { nome: "A" } }),
    T({ valor: 200, vencimento: "2026-10-01", pessoa: { nome: "A" } }),              // 9 dias
    T({ valor: 300, vencimento: "2026-08-01", pessoa: { nome: "B" }, status: "parcial", baixas: [baixa("2026-08-05", 100)] }), // 70 dias, saldo 200
    T({ valor: 50, vencimento: "2026-01-01", pessoaTexto: "C" }),                     // > 90
    T({ valor: 70, vencimento: "2026-01-01", status: "quitado" }),
  ];
  const e = envelhecimento(titulos, "2026-10-10");
  assert.deepEqual(e.linhas.map(l => [l.nome, l.total]), [["A", 300], ["B", 200], ["C", 50]]);
  assert.deepEqual([e.totais.aVencer, e.totais.f1_30, e.totais.f61_90, e.totais.f90, e.totais.total], [100, 200, 200, 50, 550]);
});
