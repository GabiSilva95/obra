import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { DORES, GARANTIAS_TOPO, SEM_IMPLANTACAO, economiaAnual, precoPorDia, reais, resultadoDiagnostico } from "./oferta.js";
import { PLANOS } from "../../constants/data.js";

test("preço por dia dos planos (mês de 30 dias) e a promessa do saco de cimento", () => {
  assert.deepEqual(PLANOS.map(p => precoPorDia(p.preco.mensal)), [4.97, 11.63, 24.97]);
  assert.deepEqual(PLANOS.map(p => precoPorDia(p.preco.anual)), [3.97, 9.3, 19.97]);
  // "Menos que um saco de cimento por dia": todo plano fica abaixo de R$ 25 por dia
  assert.ok(PLANOS.every(p => precoPorDia(p.preco.mensal) < 25));
  assert.equal(reais(precoPorDia(149)), "R$ 4,97");
  assert.equal(reais(1234.5), "R$ 1.234,50");
});

test("economia do plano anual", () => {
  assert.deepEqual(PLANOS.map(economiaAnual), [360, 840, 1800]);
});

test("resultado do Raio-X por quantidade de dores", () => {
  assert.equal(DORES.length, 5);
  assert.equal(resultadoDiagnostico(0).titulo, "0 de 5");
  assert.equal(resultadoDiagnostico(2).texto, "Já tem dinheiro escapando da sua obra.");
  assert.equal(resultadoDiagnostico(3).texto, "Sua obra está perdendo dinheiro em silêncio.");
  assert.equal(resultadoDiagnostico(5).titulo, "5 de 5");
});

test("sem implantação: o texto existe e a landing não tem acesso demo, e-mail nem telefone", () => {
  assert.ok(GARANTIAS_TOPO.some(g => g.startsWith("Sem implantação")));
  assert.match(SEM_IMPLANTACAO.apoioComoFunciona, /conta já nasce pronta/);
  assert.match(SEM_IMPLANTACAO.duvida.q, /implantação/i);
  // Regra do AGENTS.md: sem acesso demo, e-mail e telefone na landing. Lê o código das seções, não o texto do site.
  const pasta = path.dirname(fileURLToPath(import.meta.url));
  const arquivos = readdirSync(pasta).filter(f => f.endsWith(".jsx") || f === "oferta.js");
  for (const f of arquivos) {
    const codigo = readFileSync(path.join(pasta, f), "utf8");
    assert.doesNotMatch(codigo, /Ver por dentro|credenciais de demonstra|onDemo|entrarDemo|mailto:|wa\.me|@construktpro/i, `${f} não pode ter acesso demo, e-mail ou telefone`);
  }
});
