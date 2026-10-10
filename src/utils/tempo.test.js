import { test } from "node:test";
import assert from "node:assert/strict";
import { dataHoraBR, duracao, haQuanto } from "./tempo.js";

test("tempo decorrido: minutos, horas e dias", () => {
  const base = Date.UTC(2026, 9, 12, 15, 0);
  const antes = min => new Date(base - min * 60000);
  assert.equal(haQuanto(antes(0), base), "agora");
  assert.equal(haQuanto(antes(1), base), "há 1 min");
  assert.equal(haQuanto(antes(59), base), "há 59 min");
  assert.equal(haQuanto(antes(60), base), "há 1 h");
  assert.equal(haQuanto(antes(130), base), "há 2 h 10 min");
  assert.equal(haQuanto(antes(24 * 60), base), "há 1 dia");
  assert.equal(haQuanto(antes(3 * 24 * 60 + 5), base), "há 3 dias");
  assert.equal(haQuanto(null), "");
  assert.equal(haQuanto(new Date(base + 600000), base), "agora", "data no futuro não dá tempo negativo");
  assert.equal(duracao(antes(15), base), "15 min");
  assert.equal(duracao(antes(0), base), "menos de 1 min");
});

test("data e hora no fuso de São Paulo", () => {
  assert.equal(dataHoraBR(new Date(Date.UTC(2026, 9, 12, 2, 30))), "11/10/2026 23:30");
  assert.equal(dataHoraBR(null), "");
});
