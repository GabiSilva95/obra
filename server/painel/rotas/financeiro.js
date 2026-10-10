import { Router } from "express";
import { rota } from "../rota.js";
import { registrarAuditoria } from "../auditoria.js";
import { rotuloForma } from "../../config/cobranca.js";
import * as cobranca from "../../cobranca/servico.js";

/**
 * Financeiro do painel (`/api/painel/financeiro`, permissão `financeiro`): receita recorrente, cobranças e pagamentos.
 * O dinheiro entra e sai em reais; as contas são em centavos (server/config/cobranca.js). Toda mudança vai para a auditoria.
 */
const router = Router();
const aud = (req, c, acao, detalhe) => registrarAuditoria(req, { acao, alvoTipo: "cobranca", alvoId: c.id, tenantId: c.tenantId, detalhe });
const filtros = q => ({ status: q.status, mes: q.mes, q: q.q, tenantId: q.tenantId });

router.get("/resumo", rota(async (req, res) => res.json(await cobranca.resumoFinanceiro())));

router.get("/cobrancas", rota(async (req, res) => res.json(await cobranca.listarCobrancas(filtros(req.query), { pagina: req.query.pagina, limite: req.query.limite }))));

router.get("/cobrancas.csv", rota(async (req, res) => {
  const texto = await cobranca.exportarCsv(filtros(req.query));
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="cobrancas.csv"');
  await registrarAuditoria(req, { acao: "cobranca_exportou", detalhe: `CSV de cobranças${req.query.status ? ` (${req.query.status})` : ""}` });
  res.send(texto);
}));

router.get("/cobrancas/previa", rota(async (req, res) => res.json(await cobranca.previaDoMes(String(req.query.mes ?? "")))));

router.post("/cobrancas/gerar", rota(async (req, res) => {
  const r = await cobranca.gerarDoMes(String(req.body?.mes ?? ""), { registradaPorId: req.equipe.id });
  await registrarAuditoria(req, { acao: "cobranca_gerou_mes", detalhe: `${r.mes}: ${r.criadas} criada(s), ${r.ignoradas} já existia(m)` });
  res.json(r);
}));

router.post("/cobrancas", rota(async (req, res) => {
  const c = await cobranca.criarCobranca({ tenantId: req.body?.tenantId, referencia: req.body?.referencia, valor: req.body?.valor, vencimento: req.body?.vencimento, registradaPorId: req.equipe.id });
  await aud(req, c, "cobranca_criou", `${c.referencia}, R$ ${c.valor.toFixed(2)}, vence ${c.vencimento}`);
  res.status(201).json(c);
}));

router.post("/cobrancas/:id/pagamento", rota(async (req, res) => {
  const r = await cobranca.pagarCobranca(req.params.id, { pagaEm: req.body?.pagaEm, forma: req.body?.forma, valorPago: req.body?.valorPago, registradaPorId: req.equipe.id });
  await aud(req, r.cobranca, "cobranca_pagamento", `${r.cobranca.referencia}, R$ ${r.cobranca.valorPago.toFixed(2)} em ${r.cobranca.pagaEm}${r.cobranca.forma ? ` (${rotuloForma(r.cobranca.forma)})` : ""}${r.statusNovo ? `. A empresa passou a ${r.statusNovo}` : ""}`);
  res.json(r.cobranca);
}));

router.post("/cobrancas/:id/estornar", rota(async (req, res) => {
  const r = await cobranca.estornarCobranca(req.params.id);
  const c = await cobranca.lerCobranca(r.id);
  await aud(req, c, "cobranca_estorno", `${c.referencia} voltou para em aberto`);
  res.json(c);
}));

router.post("/cobrancas/:id/cancelar", rota(async (req, res) => {
  const r = await cobranca.cancelarCobranca(req.params.id, req.body?.motivo);
  const c = await cobranca.lerCobranca(r.id);
  await aud(req, c, "cobranca_cancelou", `${c.referencia}: ${c.motivoCancelamento}`);
  res.json(c);
}));

router.post("/cobrancas/:id/reabrir", rota(async (req, res) => {
  const r = await cobranca.reabrirCobranca(req.params.id);
  const c = await cobranca.lerCobranca(r.id);
  await aud(req, c, "cobranca_reabriu", `${c.referencia} voltou para em aberto`);
  res.json(c);
}));

export default router;
