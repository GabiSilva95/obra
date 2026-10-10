import { test } from "node:test";
import assert from "node:assert/strict";
import { posicaoDoPopover } from "./popover.js";

test("popover: no computador, alinhado pela direita do botão", () => {
  assert.deepEqual(posicaoDoPopover({ right: 1300, bottom: 60 }, 1366, 340), { top: 68, left: 960, width: 340 });
});

test("popover: no celular, o botão perto da direita não empurra a janela para fora da tela", () => {
  // botão em x=305 numa tela de 390: alinhar pela direita deixaria a janela em -35
  const p = posicaoDoPopover({ right: 305, bottom: 72 }, 390, 340);
  assert.equal(p.left, 16, "vai para a margem esquerda, em vez de -35");
  assert.ok(p.left >= 16 && p.left + p.width <= 390 - 16);
});

test("popover: tela mais estreita que a janela: encolhe e respeita a margem", () => {
  const p = posicaoDoPopover({ right: 300, bottom: 50 }, 320, 340);
  assert.deepEqual([p.left, p.width], [16, 288]);
});

test("popover: botão no canto esquerdo não faz a janela sair pela esquerda", () => {
  assert.equal(posicaoDoPopover({ right: 60, bottom: 50 }, 1366, 340).left, 16);
});
