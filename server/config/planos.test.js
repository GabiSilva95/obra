import { test } from "node:test";
import assert from "node:assert/strict";
import { PLANOS as SERVIDOR } from "./planos.js";
import { PLANOS as FRONT } from "../../src/constants/data.js";

// O front chama os planos de starter, business e professional; o servidor, de starter, pro e enterprise
const CHAVE = { starter: "starter", business: "pro", professional: "enterprise" };

test("preços e limites do servidor são iguais aos da oferta (landing, cadastro e cobrança)", () => {
  assert.equal(FRONT.length, 3);
  for (const f of FRONT) {
    const s = SERVIDOR[CHAVE[f.id]];
    assert.ok(s, `plano ${f.id} sem correspondente no servidor`);
    assert.deepEqual(s.preco, f.preco, `preço de ${f.id}`);
    assert.equal(s.label, f.nome, `nome de ${f.id}`);
    if (Number.isFinite(s.obras)) assert.equal(s.obras, f.obras, `obras de ${f.id}`);
    if (Number.isFinite(s.usuarios)) assert.equal(s.usuarios, f.usuarios, `usuários de ${f.id}`);
  }
});

test("as promessas de suporte dos planos são as que o sistema cumpre: chamado e chat, com o prazo do servidor", async () => {
  const { PLANOS: planosDoFront } = await import("../../src/constants/data.js");
  const { PRAZO_RESPOSTA_HORAS } = await import("./suporte.js");
  const horas = { starter: PRAZO_RESPOSTA_HORAS.starter, business: PRAZO_RESPOSTA_HORAS.pro, professional: PRAZO_RESPOSTA_HORAS.enterprise };
  for (const p of planosDoFront) {
    const suporte = p.features.filter(f => /suporte/i.test(f));
    assert.equal(suporte.length, 1, p.id);
    assert.match(suporte[0], new RegExp(`chamado e chat.*${horas[p.id]} h`), `${p.id}: o prazo da oferta é o mesmo do atendimento`);
    assert.ok(!p.features.some(f => /e-mail|email|whatsapp/i.test(f)), `${p.id}: não promete e-mail nem WhatsApp enquanto não existirem`);
  }
});

import { resolverPlano } from "./planos.js";
test("validar o plano de uma entrada: reconhece os ids e os apelidos, e recusa o resto (sem cair no starter)", () => {
  assert.equal(resolverPlano("starter"), "starter");
  assert.equal(resolverPlano("pro"), "pro");
  assert.equal(resolverPlano("business"), "pro");
  assert.equal(resolverPlano("professional"), "enterprise");
  assert.equal(resolverPlano("inventado"), null);
  assert.equal(resolverPlano(""), null);
  assert.equal(resolverPlano(undefined), null);
});
