import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularAtendimento, calcularClientes, montarPendencias } from "./indicadores.js";

const H = 3600000, MIN = 60000, DIA = 86400000;
const AGORA = new Date("2026-10-20T15:00:00-03:00").getTime();
const antes = ms => new Date(AGORA - ms);
const tk = (o = {}) => ({ canal: "ticket", status: "aberto", plano: "pro", setor: "obras", createdAt: antes(DIA), entrouNaFilaEm: antes(DIA), iniciadoEm: null, primeiraRespostaEm: null, avaliacao: null, ...o });

test("atendimento: o retrato de agora conta fila, abertos, sem resposta e prazos", () => {
  const r = calcularAtendimento({ agora: AGORA, dias: 30, criados: [], encerrados: [],
    chatsAtivos: [{ status: "na_fila" }, { status: "na_fila" }, { status: "em_atendimento" }],
    abertos: [
      tk({ entrouNaFilaEm: antes(30 * H) }),                 // plano pro = 24 h: estourado
      tk({ entrouNaFilaEm: antes(20 * H) }),                 // 20/24 h passou de 75%: perto
      tk({ entrouNaFilaEm: antes(2 * H) }),                  // ok
      tk({ status: "em_atendimento", primeiraRespostaEm: antes(H), entrouNaFilaEm: antes(40 * H) }), // já respondido: sem prazo
    ] }).agora;
  assert.deepEqual([r.chatsNaFila, r.chatsEmAtendimento, r.chamadosAbertos, r.semResposta, r.prazoEstourado, r.prazoPerto], [2, 1, 4, 3, 1, 1]);
  assert.equal(r.maisAntigoSemRespostaEm, antes(30 * H).toISOString());
});

test("atendimento: tempo até a primeira resposta e cumprimento do prazo por plano", () => {
  const p = calcularAtendimento({ agora: AGORA, dias: 30, abertos: [], chatsAtivos: [], encerrados: [], criados: [
    tk({ plano: "enterprise", entrouNaFilaEm: antes(10 * H), primeiraRespostaEm: antes(10 * H - 2 * H) }),   // 2 h, prazo 8 h: dentro
    tk({ plano: "enterprise", entrouNaFilaEm: antes(30 * H), primeiraRespostaEm: antes(30 * H - 9 * H) }),   // 9 h, prazo 8 h: fora
    tk({ plano: "starter", entrouNaFilaEm: antes(5 * DIA), primeiraRespostaEm: antes(5 * DIA - 47 * H) }),   // 47 h, prazo 48 h: dentro
    tk({ plano: "pro", entrouNaFilaEm: antes(3 * DIA) }),                                                     // sem resposta e já venceu: conta contra
    tk({ plano: "pro", entrouNaFilaEm: antes(2 * H) }),                                                       // sem resposta, ainda no prazo: fora da conta
  ] }).periodo;
  assert.equal(p.chamadosNovos, 5);
  assert.equal(p.respondidos, 3);
  assert.equal(p.tempoMedioRespostaMin, Math.round((2 * 60 + 9 * 60 + 47 * 60) / 3));
  assert.equal(p.tempoMedianoRespostaMin, 9 * 60);
  assert.equal(p.dentroDoPrazoPct, 50, "2 dentro de 4 (3 respondidos + 1 vencido sem resposta)");
});

test("atendimento: chat (espera na fila, atendidos, abandonados), avaliação, resolvidos, setores e dias", () => {
  const p = calcularAtendimento({ agora: AGORA, dias: 7, abertos: [], chatsAtivos: [],
    criados: [
      tk({ canal: "chat", status: "encerrado", setor: "financeiro", entrouNaFilaEm: antes(2 * DIA), iniciadoEm: new Date(AGORA - 2 * DIA + 4 * MIN) }),
      tk({ canal: "chat", status: "resolvido", setor: "financeiro", entrouNaFilaEm: antes(DIA), iniciadoEm: new Date(AGORA - DIA + 2 * MIN) }),
      tk({ canal: "chat", status: "abandonado", setor: "obras", entrouNaFilaEm: antes(DIA) }),
      tk({ setor: "obras", createdAt: antes(3 * H), entrouNaFilaEm: antes(3 * H) }),
    ],
    encerrados: [
      { canal: "ticket", status: "resolvido", avaliacao: 5 }, { canal: "ticket", status: "fechado", avaliacao: null }, { canal: "ticket", status: "resolvido", avaliacao: 4 },
      { canal: "chat", status: "resolvido", avaliacao: 3 },
    ] }).periodo;
  assert.equal(p.chatsPedidos, 3); assert.equal(p.chatsAtendidos, 2); assert.equal(p.chatsAbandonados, 1);
  assert.equal(p.esperaMediaChatMin, 3, "(4 + 2) / 2 minutos");
  assert.equal(p.resolvidos, 3, "só chamados resolvidos ou fechados");
  assert.equal(p.avaliacoes, 3); assert.equal(p.avaliacaoMedia, 4);
  assert.deepEqual(p.porSetor.map(s => [s.setor, s.total]), [["financeiro", 2], ["obras", 2]], "do maior para o menor; empate pela ordem alfabética");
  assert.equal(p.porDia.length, 7, "com 7 dias, 7 barras");
  assert.equal(p.porDia.at(-1).dia, "2026-10-20");
  assert.equal(p.porDia.at(-1).chamados, 1);
  assert.equal(calcularAtendimento({ agora: AGORA, dias: 90, abertos: [], chatsAtivos: [], criados: [], encerrados: [] }).periodo.porDia.length, 14, "no máximo 14 barras");
});

test("atendimento: sem dados não dá divisão por zero nem número inventado", () => {
  const r = calcularAtendimento({ agora: AGORA, dias: 30, criados: [], encerrados: [], abertos: [], chatsAtivos: [] });
  assert.equal(r.periodo.tempoMedioRespostaMin, null); assert.equal(r.periodo.dentroDoPrazoPct, null);
  assert.equal(r.periodo.avaliacaoMedia, null); assert.equal(r.periodo.esperaMediaChatMin, null);
  assert.equal(r.agora.maisAntigoSemRespostaEm, null);
});

// ─── Clientes ─────────────────────────────────────────────────────────────────

const HOJE = "2026-10-20";
const emp = (id, o = {}) => ({ id, razaoSocial: `Empresa ${id}`, email: `e${id}@x.com`, plano: "pro", status: "ativo", trialAte: null, createdAt: new Date(AGORA - 100 * DIA), ultimoAcessoEm: new Date(AGORA - DIA), telefone: "5511999990000", ativadaEm: null, ...o });

test("clientes: contagem por situação efetiva, sem a conta interna", () => {
  const c = calcularClientes({ agora: AGORA, hoje: HOJE, empresas: [
    emp(1), emp(2, { status: "trial", trialAte: "2026-10-25" }), emp(3, { status: "trial", trialAte: "2026-10-10" }),
    emp(4, { status: "suspenso" }), emp(5, { status: "inadimplente" }), emp(6, { status: "cancelado" }),
    emp(7, { email: "admin@teste.com", status: "suspenso" }),
  ] });
  assert.equal(c.total, 6, "a interna fica de fora");
  assert.deepEqual(c.porSituacao, { trial: 1, trial_expirado: 1, ativo: 1, inadimplente: 1, suspenso: 1, cancelado: 1 });
});

test("clientes: novos cadastros em 7 e 30 dias", () => {
  const c = calcularClientes({ agora: AGORA, hoje: HOJE, empresas: [emp(1, { createdAt: new Date(AGORA - 2 * DIA) }), emp(2, { createdAt: new Date(AGORA - 20 * DIA) }), emp(3, { createdAt: new Date(AGORA - 40 * DIA) })] });
  assert.equal(c.novos7, 1); assert.equal(c.novos30, 2);
});

test("clientes: teste acabando em até 3 dias e teste que acabou há pouco, do mais urgente ao menos", () => {
  const c = calcularClientes({ agora: AGORA, hoje: HOJE, empresas: [
    emp(1, { status: "trial", trialAte: "2026-10-22" }), emp(2, { status: "trial", trialAte: "2026-10-20" }), emp(3, { status: "trial", trialAte: "2026-10-23" }), emp(4, { status: "trial", trialAte: "2026-10-24" }),
    emp(5, { status: "trial", trialAte: "2026-10-18" }), emp(6, { status: "trial", trialAte: "2026-10-01" }), emp(7, { status: "trial", trialAte: "2026-10-19" }),
  ] });
  assert.deepEqual(c.testesAcabando.map(e => [e.id, e.diasRestantes]), [[2, 0], [1, 2], [3, 3]]);
  assert.deepEqual(c.testesAcabaram.map(e => [e.id, e.acabouHaDias]), [[7, 1], [5, 2]], "o de 19 dias atrás passou de 14 e sai");
});

test("clientes: conversão só do teste que já terminou e só de quem passou por teste", () => {
  const criada = dias => new Date(AGORA - dias * DIA);
  const c = calcularClientes({ agora: AGORA, hoje: HOJE, empresas: [
    emp(1, { trialAte: "2026-09-01", createdAt: criada(50), ativadaEm: new Date(AGORA - 30 * DIA), status: "ativo" }),   // converteu
    emp(2, { trialAte: "2026-09-01", createdAt: criada(50), status: "trial" }),                                          // não converteu
    emp(3, { trialAte: "2026-09-10", createdAt: criada(40), status: "suspenso", ativadaEm: new Date(AGORA - 20 * DIA) }), // converteu e depois suspendeu: conta
    emp(4, { trialAte: "2026-10-25", createdAt: criada(5), status: "trial" }),                                           // teste ainda rolando: fora
    emp(5, { trialAte: null, createdAt: criada(60), status: "ativo" }),                                                  // conta antiga, sem teste: fora
    emp(6, { trialAte: "2026-05-01", createdAt: criada(120), status: "trial" }),                                         // além de 90 dias: fora
  ] });
  assert.deepEqual(c.conversao, { base: 3, convertidas: 2, pct: 67 });
  assert.equal(calcularClientes({ agora: AGORA, hoje: HOJE, empresas: [emp(1)] }).conversao.pct, null, "sem base, sem percentual");
});

test("clientes: ativas que sumiram há mais de 14 dias, as mais antigas primeiro", () => {
  const c = calcularClientes({ agora: AGORA, hoje: HOJE, empresas: [
    emp(1, { ultimoAcessoEm: new Date(AGORA - 3 * DIA) }), emp(2, { ultimoAcessoEm: new Date(AGORA - 15 * DIA) }), emp(3, { ultimoAcessoEm: new Date(AGORA - 60 * DIA) }),
    emp(4, { ultimoAcessoEm: null }), emp(5, { status: "suspenso", ultimoAcessoEm: new Date(AGORA - 90 * DIA) }), emp(6, { status: "trial", trialAte: "2026-10-30", ultimoAcessoEm: null }),
  ] }).semAcesso;
  assert.equal(c.total, 3);
  assert.deepEqual(c.itens.map(e => e.id), [4, 3, 2], "sem nenhum acesso primeiro, depois do mais antigo ao mais recente");
  assert.equal(c.itens[0].semAcessoHaDias, null);
  assert.equal(c.itens[2].semAcessoHaDias, 15);
});

test("pendências: só das áreas permitidas", () => {
  const dados = { atendimento: { chatsNaFila: 2, semResposta: 3, prazoEstourado: 1 }, clientes: { testesAcabando: [1, 2], testesAcabaram: [1] }, financeiro: { cobrancas: 4, valor: 900 } };
  assert.deepEqual(montarPendencias(dados), { atendimento: { chatNaFila: 2, chamadosSemResposta: 3, prazoEstourado: 1 }, clientes: { testesAcabando: 2, testesAcabaram: 1 }, financeiro: { cobrancasAtrasadas: 4, valorEmAtraso: 900 } });
  assert.deepEqual(montarPendencias({ atendimento: null, clientes: null, financeiro: dados.financeiro }), { atendimento: null, clientes: null, financeiro: { cobrancasAtrasadas: 4, valorEmAtraso: 900 } });
});
