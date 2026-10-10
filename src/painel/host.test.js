import { test } from "node:test";
import assert from "node:assert/strict";
import { ehHostDoPainel, urlDoCliente } from "./host.js";

test("o painel só abre no endereço que começa com painel.", () => {
  assert.equal(ehHostDoPainel("painel.construktpro.com.br"), true);
  assert.equal(ehHostDoPainel("painel.localhost"), true);
  assert.equal(ehHostDoPainel("PAINEL.construktpro.com.br"), true);
  for (const outro of ["construktpro.com.br", "www.construktpro.com.br", "localhost", "obra-two.vercel.app", "meupainel.com", "x.painel.com", "", null, undefined]) assert.equal(ehHostDoPainel(outro), false, String(outro));
});

test("o endereço do cliente é o do painel sem o prefixo painel.", () => {
  assert.equal(urlDoCliente({ protocol: "https:", host: "painel.construktpro.com.br" }), "https://construktpro.com.br");
  assert.equal(urlDoCliente({ protocol: "http:", host: "painel.localhost:3000" }), "http://localhost:3000");
});
