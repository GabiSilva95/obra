import { test } from "node:test";
import assert from "node:assert/strict";
import { ACEITE_MENSAGENS, DIAS_TESTE, STATUS_CONTA } from "./conta.js";
import { tenantParaCliente } from "../utils/tenantPublico.js";

test("conta: teste de 14 dias, status e aceite versionado", () => {
  assert.equal(DIAS_TESTE, 14);
  assert.deepEqual(STATUS_CONTA, ["trial", "ativo", "inadimplente", "suspenso", "cancelado"]);
  assert.match(ACEITE_MENSAGENS.texto, /mensagens e notificações/);
  assert.match(ACEITE_MENSAGENS.versao, /^\d{4}-\d{2}-\d{2}$/);
});

test("conta: o cliente não recebe notas internas, motivo nem dados do aceite", () => {
  const publico = tenantParaCliente({
    id: "t1", razaoSocial: "Silva", cnpj: "1", email: "a@b.c", plano: "pro", createdAt: new Date(), status: "trial", trialAte: "2026-10-24", ciclo: "mensal", telefone: "5511987654321",
    notasInternas: "cliente difícil", motivoStatus: "inadimplência", aceiteMensagensEm: new Date(), aceiteMensagensIp: "1.2.3.4", aceiteMensagensTexto: "x", ultimoAcessoEm: new Date(),
  });
  for (const proibido of ["notasInternas", "motivoStatus", "aceiteMensagensIp", "aceiteMensagensTexto", "ultimoAcessoEm"]) assert.ok(!(proibido in publico), proibido);
  assert.equal(publico.aceitouMensagens, true);
  assert.equal(tenantParaCliente(null), null);
});

// ─── Situação efetiva, bloqueio e modo leitura ────────────────────────────────

import { DURACAO_LEITURA_MIN, caminhoLiberadoComContaBloqueada, contaBloqueada, diasRestantesTeste, ehContaInterna, leituraRecusa, statusEfetivo } from "./conta.js";

const HOJE = "2026-10-20";
const conta = (status, trialAte, email = "cliente@empresa.com") => ({ status, trialAte, email });

test("situação efetiva: o teste vale até o último dia e só depois vira 'teste acabado'", () => {
  assert.equal(statusEfetivo(conta("trial", "2026-10-21"), HOJE), "trial");
  assert.equal(statusEfetivo(conta("trial", HOJE), HOJE), "trial", "no último dia ainda vale");
  assert.equal(statusEfetivo(conta("trial", "2026-10-19"), HOJE), "trial_expirado");
  assert.equal(statusEfetivo(conta("trial", null), HOJE), "trial", "sem data: sem vencimento");
  assert.equal(statusEfetivo(conta("ativo", "2026-01-01"), HOJE), "ativo", "a data do teste só conta em teste");
});

test("bloqueio: teste acabado, suspenso e cancelado bloqueiam; ativo, em teste e inadimplente não", () => {
  assert.equal(contaBloqueada(conta("trial", "2026-10-19"), HOJE), true);
  assert.equal(contaBloqueada(conta("suspenso", null), HOJE), true);
  assert.equal(contaBloqueada(conta("cancelado", null), HOJE), true);
  assert.equal(contaBloqueada(conta("ativo", null), HOJE), false);
  assert.equal(contaBloqueada(conta("trial", HOJE), HOJE), false);
  assert.equal(contaBloqueada(conta("inadimplente", null), HOJE), false, "inadimplência só passa a bloquear com a cobrança automática");
  assert.equal(contaBloqueada(conta("status-estranho", null), HOJE), false, "status desconhecido não tranca ninguém");
});

test("conta interna da casa nunca é bloqueada", () => {
  const interna = conta("suspenso", "2020-01-01", "ADMIN@teste.com");
  assert.equal(ehContaInterna(interna), true);
  assert.equal(statusEfetivo(interna, HOJE), "ativo");
  assert.equal(contaBloqueada(interna, HOJE), false);
  assert.equal(diasRestantesTeste({ ...interna, status: "trial" }, HOJE), null);
  assert.equal(ehContaInterna(conta("ativo", null)), false);
});

test("dias restantes do teste", () => {
  assert.equal(diasRestantesTeste(conta("trial", "2026-10-24"), HOJE), 4);
  assert.equal(diasRestantesTeste(conta("trial", HOJE), HOJE), 0);
  assert.equal(diasRestantesTeste(conta("trial", "2026-10-18"), HOJE), -2);
  assert.equal(diasRestantesTeste(conta("ativo", "2026-10-24"), HOJE), null);
  assert.equal(diasRestantesTeste(conta("trial", null), HOJE), null);
  assert.equal(diasRestantesTeste(conta("trial", "2026-11-02"), "2026-10-30"), 3, "atravessa o fim do mês");
});

test("conta bloqueada só alcança assinatura, suporte e autenticação", () => {
  for (const ok of ["/assinatura", "/suporte/chamados", "/suporte/chat/3", "/auth/refresh", "/auth/login"]) assert.equal(caminhoLiberadoComContaBloqueada(ok), true, ok);
  for (const no of ["/obras", "/financeiro/titulos", "/usuarios", "/suporteX", "/assinaturas", "/me/preferencias", "/", "/painel/clientes"]) assert.equal(caminhoLiberadoComContaBloqueada(no), false, no);
});

test("modo leitura recusa tudo que altera, aceita só leitura", () => {
  const equipe = { userId: 1, leitura: true }, cliente = { userId: 1 };
  for (const m of ["POST", "PUT", "PATCH", "DELETE", "post"]) assert.equal(leituraRecusa(equipe, m), true, m);
  for (const m of ["GET", "HEAD", "OPTIONS"]) assert.equal(leituraRecusa(equipe, m), false, m);
  for (const m of ["POST", "DELETE", "GET"]) assert.equal(leituraRecusa(cliente, m), false, "cliente comum não é afetado");
  assert.equal(DURACAO_LEITURA_MIN, 30);
});

test("o cliente recebe a situação da conta e o bloqueio, nunca o motivo interno", () => {
  const p = tenantParaCliente({ id: "t", razaoSocial: "S", cnpj: "1", email: "a@b.c", plano: "pro", createdAt: new Date(), status: "suspenso", motivoStatus: "inadimplência", trialAte: null, ciclo: "mensal" }, HOJE);
  assert.equal(p.situacao, "suspenso");
  assert.equal(p.bloqueada, true);
  assert.equal(p.diasRestantes, null);
  assert.ok(!("motivoStatus" in p));
  const teste = tenantParaCliente({ id: "t", razaoSocial: "S", cnpj: "1", email: "a@b.c", plano: "pro", createdAt: new Date(), status: "trial", trialAte: "2026-10-23", ciclo: "mensal" }, HOJE);
  assert.deepEqual([teste.situacao, teste.bloqueada, teste.diasRestantes], ["trial", false, 3]);
});
