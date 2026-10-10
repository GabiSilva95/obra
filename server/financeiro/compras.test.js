import test from "node:test";
import assert from "node:assert/strict";
import { totalCentOrdem, sanearNf } from "./compras.js";

test("totalCentOrdem soma os itens em centavos, sem erro de ponto flutuante", () => {
  assert.equal(totalCentOrdem({ itens: [{ quantidade: 3, valorUnit: 1.1 }, { quantidade: 0.1, valorUnit: 3 }] }), 360);
  assert.equal(totalCentOrdem({ itens: [{ quantidade: 100, valorUnit: 38.9 }, { quantidade: 10, valorUnit: 120 }] }), 509000);
  assert.equal(totalCentOrdem({ itens: [] }), 0);
});

test("sanearNf descarta o que é inválido e mantém o resto", () => {
  assert.equal(sanearNf(null), null);
  const nf = sanearNf({ nfe: "123", data: "2026-10-05", total: "5090", duplicatas: [
    { numero: "1", vencimento: "2026-11-05", valor: 2545 }, { numero: "2", vencimento: "05/12/2026", valor: 2545 }, { numero: "3", vencimento: "2026-12-05", valor: -1 },
  ] });
  assert.equal(nf.total, 5090);
  assert.equal(nf.duplicatas.length, 1);
  assert.equal(nf.duplicatas[0].vencimento, "2026-11-05");
  assert.equal(sanearNf({ data: "ontem", total: 0 }).data, null);
});
