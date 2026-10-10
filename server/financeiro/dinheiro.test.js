import test from "node:test";
import assert from "node:assert/strict";
import { emCentavos, ratearProporcional, dividirIgual, porPercentuais } from "./dinheiro.js";
import { gerarParcelas, parcelasDeDuplicatas } from "./parcelas.js";
import { validarRateio, escalarRateio, ratearPorPesos, distribuirRateio } from "./rateio.js";
import { calcularStatus, saldoCent, vencido, movimentoCent } from "./status.js";
import { somarMeses, somarDias, diasEntre, hojeBR } from "../utils/datas.js";

const soma = a => a.reduce((x, y) => x + y, 0);

test("emCentavos converte sem erro de ponto flutuante", () => {
  assert.equal(emCentavos(1234.56), 123456);
  assert.equal(emCentavos("0.1"), 10);
  assert.equal(emCentavos(0.1 + 0.2), 30);
  assert.equal(emCentavos("130000.00"), 13000000);
});

test("dividirIgual não perde nem cria centavo", () => {
  assert.deepEqual(dividirIgual(10000, 3), [3334, 3333, 3333]);
  assert.deepEqual(dividirIgual(1000, 6), [167, 167, 167, 167, 166, 166]);
  for (const [t, n] of [[1, 3], [99999999, 7], [100, 100], [5, 1]]) assert.equal(soma(dividirIgual(t, n)), t);
});

test("ratearProporcional respeita pesos e fecha o total", () => {
  assert.deepEqual(ratearProporcional(10000, [1, 1]), [5000, 5000]);
  assert.deepEqual(ratearProporcional(10000, [3, 1]), [7500, 2500]);
  // meia diária
  const r = ratearProporcional(100000, [2.5, 1, 0.5]);
  assert.equal(soma(r), 100000);
  assert.deepEqual(r, [62500, 25000, 12500]);
  // total enorme (R$ 9 bilhões) continua exato
  const g = ratearProporcional(900000000000, [1, 2, 3]);
  assert.equal(soma(g), 900000000000);
  assert.throws(() => ratearProporcional(100, [0, 0]));
  assert.throws(() => ratearProporcional(100, []));
});

test("porPercentuais exige 100%", () => {
  assert.deepEqual(porPercentuais(10000, [60, 40]), [6000, 4000]);
  assert.equal(soma(porPercentuais(10001, [33.33, 33.33, 33.34])), 10001);
  assert.throws(() => porPercentuais(10000, [60, 30]), /somam 90/);
});

test("datas: fim de mês e fuso", () => {
  assert.equal(somarMeses("2026-01-31", 1), "2026-02-28");
  assert.equal(somarMeses("2026-01-31", 2), "2026-03-31");
  assert.equal(somarMeses("2024-01-31", 1), "2024-02-29");
  assert.equal(somarMeses("2026-11-15", 3), "2027-02-15");
  assert.equal(somarDias("2026-12-25", 10), "2027-01-04");
  assert.equal(diasEntre("2026-10-01", "2026-10-31"), 30);
  // 22h em São Paulo (UTC-3) já é o dia seguinte em UTC
  assert.equal(hojeBR(new Date("2026-10-06T01:00:00Z")), "2026-10-05");
  assert.equal(hojeBR(new Date("2026-10-06T12:00:00Z")), "2026-10-06");
});

test("gerarParcelas: dividir, repetir e vencimentos", () => {
  const p = gerarParcelas({ valorCent: 100000, primeiroVencimento: "2026-01-31", parcelas: 3 });
  assert.deepEqual(p.map(x => x.vencimento), ["2026-01-31", "2026-02-28", "2026-03-31"]);
  assert.deepEqual(p.map(x => x.valorCent), [33334, 33333, 33333]);
  assert.equal(p[2].totalParcelas, 3);

  const r = gerarParcelas({ valorCent: 250000, primeiroVencimento: "2026-10-05", parcelas: 12, modo: "repetir" });
  assert.equal(r.length, 12);
  assert.ok(r.every(x => x.valorCent === 250000));
  assert.equal(r[11].vencimento, "2027-09-05");

  const d = gerarParcelas({ valorCent: 9000, primeiroVencimento: "2026-10-01", parcelas: 3, intervalo: { tipo: "dias", dias: 15 } });
  assert.deepEqual(d.map(x => x.vencimento), ["2026-10-01", "2026-10-16", "2026-10-31"]);

  assert.throws(() => gerarParcelas({ valorCent: 0, primeiroVencimento: "2026-10-01" }), /maior que zero/);
  assert.throws(() => gerarParcelas({ valorCent: 100, primeiroVencimento: "01/10/2026" }), /primeiro vencimento/);
  assert.throws(() => gerarParcelas({ valorCent: 100, primeiroVencimento: "2026-10-01", parcelas: 0 }), /entre 1 e/);
  assert.throws(() => gerarParcelas({ valorCent: 100, primeiroVencimento: "2026-10-01", parcelas: 121 }), /entre 1 e/);
});

test("parcelasDeDuplicatas ordena por vencimento", () => {
  const p = parcelasDeDuplicatas([
    { numero: "002", vencimento: "2026-12-01", valorCent: 5000 },
    { numero: "001", vencimento: "2026-11-01", valorCent: 7000 },
  ]);
  assert.deepEqual(p.map(x => [x.parcela, x.documento, x.valorCent]), [[1, "001", 7000], [2, "002", 5000]]);
});

test("validarRateio", () => {
  const ok = [{ obraId: 1, valorCent: 6000 }, { centroCustoId: 2, valorCent: 4000 }];
  assert.equal(validarRateio(ok, 10000), null);
  assert.match(validarRateio(ok, 12000), /Falta ratear R\$ 20,00/);
  assert.match(validarRateio(ok, 9000), /passa R\$ 10,00/);
  assert.match(validarRateio([{ valorCent: 100 }], 100), /obra ou um centro/);
  assert.match(validarRateio([{ etapaId: 3, centroCustoId: 1, valorCent: 100 }], 100), /etapa exige uma obra/);
  assert.match(validarRateio([{ obraId: 1, valorCent: 0 }], 0), /maior que zero/);
  assert.match(validarRateio([], 100), /ao menos uma linha/);
});

test("escalarRateio mantém proporção e fecha a parcela", () => {
  const linhas = [{ obraId: 1, valorCent: 60000 }, { obraId: 2, valorCent: 40000 }];
  const parcelas = gerarParcelas({ valorCent: 100000, primeiroVencimento: "2026-10-01", parcelas: 3 });
  let total = 0;
  for (const p of parcelas) {
    const esc = escalarRateio(linhas, p.valorCent);
    assert.equal(soma(esc.map(l => l.valorCent)), p.valorCent);
    total += soma(esc.map(l => l.valorCent));
  }
  assert.equal(total, 100000);
  assert.deepEqual(escalarRateio(linhas, 10000).map(l => l.valorCent), [6000, 4000]);
});

test("ratearPorPesos (diárias por obra)", () => {
  const r = ratearPorPesos(150000, [{ obraId: 1, peso: 4 }, { obraId: 2, peso: 1 }, { obraId: 3, peso: 1 }]);
  assert.equal(soma(r.map(l => l.valorCent)), 150000);
  assert.deepEqual(r.map(l => l.obraId), [1, 2, 3]);
  assert.deepEqual(r.map(l => l.valorCent), [100000, 25000, 25000]);
  assert.ok(!("peso" in r[0]));
});

test("status e saldo do título", () => {
  assert.equal(calcularStatus({ valorCent: 10000, baixas: [] }), "aberto");
  assert.equal(calcularStatus({ valorCent: 10000, baixas: [{ valorCent: 4000 }] }), "parcial");
  assert.equal(calcularStatus({ valorCent: 10000, baixas: [{ valorCent: 4000 }, { valorCent: 6000 }] }), "quitado");
  // estorno devolve o saldo
  assert.equal(calcularStatus({ valorCent: 10000, baixas: [{ valorCent: 10000, estornada: true }] }), "aberto");
  assert.equal(calcularStatus({ valorCent: 10000, baixas: [], cancelado: true }), "cancelado");
  assert.equal(saldoCent(10000, [{ valorCent: 2500 }, { valorCent: 9999, estornada: true }]), 7500);
  assert.equal(vencido({ status: "aberto", vencimento: "2026-10-01" }, "2026-10-02"), true);
  assert.equal(vencido({ status: "aberto", vencimento: "2026-10-02" }, "2026-10-02"), false);
  assert.equal(vencido({ status: "quitado", vencimento: "2026-01-01" }, "2026-10-02"), false);
  // juros e multa aumentam o dinheiro que sai; desconto diminui
  assert.equal(movimentoCent({ valorCent: 10000, jurosCent: 150, multaCent: 200, descontoCent: 50 }), 10300);
});

test("distribuirRateio fecha parcela E linha ao centavo", () => {
  // o caso real: R$ 1.000,01 em 3 parcelas, 60,00% / 40% das linhas
  const linhas = [{ obraId: 1, valorCent: 60001 }, { obraId: 2, valorCent: 40000 }];
  const parcelas = [33334, 33334, 33333];
  const m = distribuirRateio(linhas, parcelas);
  parcelas.forEach((p, i) => assert.equal(soma(m[i].map(l => l.valorCent)), p, `parcela ${i + 1}`));
  assert.equal(soma(m.flatMap(x => x).filter(l => l.obraId === 1).map(l => l.valorCent)), 60001);
  assert.equal(soma(m.flatMap(x => x).filter(l => l.obraId === 2).map(l => l.valorCent)), 40000);
  assert.throws(() => distribuirRateio(linhas, [100]), /não fecha/);
});

test("distribuirRateio: propriedade com muitos casos aleatórios", () => {
  let seed = 12345;
  const rnd = n => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
  for (let k = 0; k < 400; k++) {
    const nLinhas = 1 + rnd(5), nParc = 1 + rnd(12);
    const parcelas = Array.from({ length: nParc }, () => 1 + rnd(500000));
    const total = soma(parcelas);
    const cortes = Array.from({ length: nLinhas - 1 }, () => rnd(total + 1)).sort((a, b) => a - b);
    const valores = [...cortes, total].map((c, i) => c - (i ? cortes[i - 1] : 0));
    const linhas = valores.map((v, i) => ({ obraId: i + 1, valorCent: v })).filter(l => l.valorCent > 0);
    const m = distribuirRateio(linhas, parcelas);
    parcelas.forEach((p, i) => assert.equal(soma(m[i].map(l => l.valorCent)), p));
    for (const l of linhas) assert.equal(soma(m.flatMap(x => x).filter(x => x.obraId === l.obraId).map(x => x.valorCent)), l.valorCent);
    assert.ok(m.flatMap(x => x).every(l => l.valorCent > 0));
  }
});
