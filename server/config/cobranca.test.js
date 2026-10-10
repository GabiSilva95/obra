import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularIndicadores, cobrancaCobreMes, dataValida, descricaoDaCobranca, referenciaDe, referenciaValida, situacaoCobranca, valorListaCent, valorMensalCent, vencimentoDoMes } from "./cobranca.js";

test("preço de lista de um período: o anual é o ano inteiro", () => {
  assert.equal(valorListaCent("starter", "mensal"), 14900);
  assert.equal(valorListaCent("starter", "anual"), 119 * 12 * 100);
  assert.equal(valorListaCent("business", "mensal"), 34900, "alias do plano do front");
  assert.equal(valorListaCent("professional", "anual"), 599 * 12 * 100);
  assert.equal(valorListaCent("inexistente", "mensal"), 14900, "plano desconhecido cai no starter");
});

test("receita mensal de um período: o anual divide por 12 sem perder centavo de arredondamento grosseiro", () => {
  assert.equal(valorMensalCent(14900, "mensal"), 14900);
  assert.equal(valorMensalCent(142800, "anual"), 11900);
  assert.equal(valorMensalCent(100000, "anual"), 8333);
});

test("vencimento: dia combinado, nunca além do 28", () => {
  assert.equal(vencimentoDoMes("2026-11", 10), "2026-11-10");
  assert.equal(vencimentoDoMes("2026-02", 31), "2026-02-28");
  assert.equal(vencimentoDoMes("2026-11", 0), "2026-11-10", "inválido volta ao padrão");
  assert.equal(vencimentoDoMes("2026-11", "5"), "2026-11-05");
});

test("situação da cobrança: atrasada vem da data, nunca é gravada", () => {
  const c = { status: "aberta", vencimento: "2026-10-10" };
  assert.equal(situacaoCobranca(c, "2026-10-10"), "aberta", "no dia do vencimento ainda não está atrasada");
  assert.equal(situacaoCobranca(c, "2026-10-11"), "atrasada");
  assert.equal(situacaoCobranca({ ...c, status: "paga" }, "2026-12-01"), "paga");
  assert.equal(situacaoCobranca({ ...c, status: "cancelada" }, "2026-12-01"), "cancelada");
});

test("validações de referência e data", () => {
  assert.equal(referenciaValida("2026-11"), true);
  for (const r of ["2026-13", "2026-00", "26-11", "2026-1", "", null]) assert.equal(referenciaValida(r), false, String(r));
  assert.equal(dataValida("2026-02-28"), true);
  assert.equal(dataValida("2026-02-30"), false);
  assert.equal(dataValida("2026-2-3"), false);
  assert.equal(referenciaDe("2026-11-05"), "2026-11");
});

test("cobertura: a mensal cobre o próprio mês, a anual cobre doze, cancelada não cobre nada", () => {
  const mensal = { referencia: "2026-11", ciclo: "mensal", status: "aberta" };
  assert.equal(cobrancaCobreMes(mensal, "2026-11"), true);
  assert.equal(cobrancaCobreMes(mensal, "2026-12"), false);
  assert.equal(cobrancaCobreMes(mensal, "2026-10"), false);
  const anual = { referencia: "2026-11", ciclo: "anual", status: "paga" };
  assert.equal(cobrancaCobreMes(anual, "2026-11"), true);
  assert.equal(cobrancaCobreMes(anual, "2027-10"), true, "o último mês do ano");
  assert.equal(cobrancaCobreMes(anual, "2027-11"), false, "o ano seguinte precisa de nova cobrança");
  assert.equal(cobrancaCobreMes(anual, "2026-10"), false);
  assert.equal(cobrancaCobreMes({ ...mensal, status: "cancelada" }, "2026-11"), false);
});

test("descrição da cobrança", () => {
  assert.equal(descricaoDaCobranca("Business", "mensal", "2026-11"), "Assinatura ConstruktPro Business · 11/2026");
  assert.equal(descricaoDaCobranca("Starter", "anual", "2026-03"), "Assinatura ConstruktPro Starter · anual a partir de 03/2026");
});

const HOJE = "2026-10-20";
const ass = (o = {}) => ({ tenantId: "t", valorCent: 34900, ciclo: "mensal", cortesia: false, status: "ativo", plano: "pro", ativadaEm: null, canceladaEm: null, ...o });
const cob = (o = {}) => ({ tenantId: "t", status: "aberta", vencimento: "2026-10-25", valorCent: 34900, valorPagoCent: null, pagaEm: null, ...o });

test("indicadores: MRR só de assinatura configurada, ativa ou inadimplente e fora de cortesia", () => {
  const i = calcularIndicadores({ hoje: HOJE, cobrancas: [], assinaturas: [
    ass({ tenantId: "a" }), ass({ tenantId: "b", ciclo: "anual", valorCent: 285600, plano: "starter" }),
    ass({ tenantId: "c", status: "inadimplente" }), ass({ tenantId: "d", cortesia: true }),
    ass({ tenantId: "e", status: "suspenso" }), ass({ tenantId: "f", status: "cancelado" }), ass({ tenantId: "g", status: "trial" }),
  ] });
  assert.equal(i.pagantes, 3, "ativo, anual e inadimplente");
  assert.equal(i.mrrCent, 34900 + 23800 + 34900);
  assert.equal(i.arrCent, i.mrrCent * 12);
  assert.equal(i.ticketMedioCent, Math.round(i.mrrCent / 3));
  assert.deepEqual(i.porPlano.map(p => [p.plano, p.empresas]), [["pro", 2], ["starter", 1]]);
});

test("indicadores: atraso, recebido e a receber do mês", () => {
  const i = calcularIndicadores({ hoje: HOJE, assinaturas: [], cobrancas: [
    cob({ vencimento: "2026-10-10", valorCent: 10000 }), cob({ vencimento: "2026-09-10", valorCent: 20000, tenantId: "x" }), cob({ vencimento: "2026-08-10", valorCent: 5000, tenantId: "x" }),
    cob({ vencimento: "2026-10-25", valorCent: 7000 }), cob({ vencimento: "2026-10-20", valorCent: 3000 }),
    cob({ status: "paga", pagaEm: "2026-10-05", valorCent: 30000, valorPagoCent: 29000, vencimento: "2026-10-05" }),
    cob({ status: "paga", pagaEm: "2026-09-28", valorCent: 40000, valorPagoCent: null, vencimento: "2026-09-28" }),
    cob({ status: "cancelada", vencimento: "2026-10-01", valorCent: 99999 }),
  ] });
  assert.deepEqual(i.emAtraso, { valorCent: 35000, cobrancas: 3, empresas: 2 });
  assert.equal(i.recebidoNoMesCent, 29000, "conta o valor pago, não o da fatura");
  assert.equal(i.aReceberNoMesCent, 10000, "abertas do mês que ainda não venceram");
  const set = i.serie.find(s => s.mes === "2026-09"), out = i.serie.find(s => s.mes === "2026-10");
  assert.equal(set.valorCent, 40000, "sem valor pago registrado, vale o da fatura");
  assert.equal(out.valorCent, 29000);
  assert.deepEqual(i.serie.map(s => s.mes), ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"]);
});

test("indicadores: novos e cancelamentos do mês, sem contar cortesia", () => {
  const i = calcularIndicadores({ hoje: HOJE, cobrancas: [], assinaturas: [
    ass({ ativadaEm: "2026-10-03T12:00:00.000Z" }), ass({ ativadaEm: "2026-09-30T12:00:00.000Z" }), ass({ cortesia: true, ativadaEm: "2026-10-04T12:00:00.000Z" }),
    ass({ status: "cancelado", canceladaEm: "2026-10-15T12:00:00.000Z" }),
  ] });
  assert.equal(i.novosNoMes, 1);
  assert.equal(i.cancelamentosNoMes, 1);
});

test("indicadores: sem dados, tudo zerado e sem divisão por zero", () => {
  const i = calcularIndicadores({ hoje: HOJE, assinaturas: [], cobrancas: [] });
  assert.equal(i.mrrCent, 0); assert.equal(i.ticketMedioCent, 0); assert.equal(i.emAtraso.cobrancas, 0); assert.equal(i.serie.length, 6);
});
