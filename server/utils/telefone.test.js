import { test } from "node:test";
import assert from "node:assert/strict";
import { formatarTelefoneBR, normalizarTelefoneBR } from "./telefone.js";

test("telefone: celular e fixo válidos, com ou sem máscara e com o 55", () => {
  assert.equal(normalizarTelefoneBR("(11) 98765-4321"), "5511987654321");
  assert.equal(normalizarTelefoneBR("11987654321"), "5511987654321");
  assert.equal(normalizarTelefoneBR("+55 11 98765-4321"), "5511987654321");
  assert.equal(normalizarTelefoneBR("(21) 3333-4455"), "552133334455");
  assert.equal(normalizarTelefoneBR(" 5521 33334455 "), "552133334455");
});

test("telefone: recusa o que não é plausível", () => {
  for (const ruim of ["", null, undefined, "123", "1198765432", "(11) 8765-43210", "(01) 98765-4321", "(11) 88765-4321", "(11) 1234-5678", "(11) 99999-9999", "(11) 11111-1111", "abc"]) {
    assert.equal(normalizarTelefoneBR(ruim), null, `deveria recusar ${JSON.stringify(ruim)}`);
  }
});

test("telefone: máscara enquanto digita e na exibição", () => {
  assert.equal(formatarTelefoneBR(""), "");
  assert.equal(formatarTelefoneBR("1"), "(1");
  assert.equal(formatarTelefoneBR("119"), "(11) 9");
  assert.equal(formatarTelefoneBR("1198765"), "(11) 9876-5");
  assert.equal(formatarTelefoneBR("11987654321"), "(11) 98765-4321");
  assert.equal(formatarTelefoneBR("5511987654321"), "(11) 98765-4321");
  assert.equal(formatarTelefoneBR("2133334455"), "(21) 3333-4455");
  assert.equal(formatarTelefoneBR("119876543219999"), "(11) 98765-4321");
});
