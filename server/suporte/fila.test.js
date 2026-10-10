import { test } from "node:test";
import assert from "node:assert/strict";
import {
  aposRespostaDoCliente, atendenteSumiu, atendentesComVaga, chatAberto, clienteSumiu, esperaEstimadaMin, mediaAtendimentoMin, ordenarChamados, ordenarFilaChat,
  podeMudarStatus, posicaoNaFila, prazoHoras, prioridadeInicial, situacaoPrazo, statusEfetivoAtendente, textoHorario, venceEm,
} from "./fila.js";
import { HORARIO_CHAT_PADRAO } from "../config/suporte.js";

const t = (id, minutos, extra = {}) => ({ id, entrouNaFilaEm: new Date(Date.UTC(2026, 9, 12, 12, minutos)), prioridade: "normal", ...extra });

test("chamados: urgentes primeiro, depois a ordem de solicitação; o número desempata", () => {
  const lista = [t(5, 10), t(3, 0, { prioridade: "alta" }), t(9, 20, { prioridade: "urgente" }), t(4, 0), t(2, 30, { prioridade: "urgente" })];
  assert.deepEqual(ordenarChamados(lista).map(x => x.id), [9, 2, 3, 4, 5]);
  assert.deepEqual(lista.map(x => x.id), [5, 3, 9, 4, 2], "não altera a lista de entrada");
});

test("fila do chat: só por ordem de chegada, sem furar; posição de cada um", () => {
  const fila = [t(7, 5), t(3, 1, { prioridade: "urgente" }), t(8, 3), t(1, 9)];
  assert.deepEqual(ordenarFilaChat(fila).map(x => x.id), [3, 8, 7, 1]);
  assert.equal(posicaoNaFila(fila, 3), 1);
  assert.equal(posicaoNaFila(fila, 1), 4);
  assert.equal(posicaoNaFila(fila, 99), null);
});

test("espera: média do histórico e estimativa que depende dos atendentes disponíveis", () => {
  assert.equal(mediaAtendimentoMin([]), 10);
  assert.equal(mediaAtendimentoMin([12, 8, 10]), 10);
  assert.equal(mediaAtendimentoMin([1, 1]), 3, "no mínimo 3");
  assert.equal(mediaAtendimentoMin([500]), 60, "no máximo 60");
  assert.equal(mediaAtendimentoMin([0, NaN, -4, 20]), 20, "ignora lixo");
  assert.equal(esperaEstimadaMin(1, 1, 10), 10);
  assert.equal(esperaEstimadaMin(3, 1, 10), 30);
  assert.equal(esperaEstimadaMin(3, 2, 10), 20);
  assert.equal(esperaEstimadaMin(2, 1, 7), 15, "arredonda para cima de 5 em 5");
  assert.equal(esperaEstimadaMin(50, 1, 30), 120, "teto de 2 horas");
  assert.equal(esperaEstimadaMin(2, 0), null, "sem atendente disponível, não promete tempo");
  assert.equal(esperaEstimadaMin(0, 2), null);
});

test("presença: cliente e atendente que somem", () => {
  const agora = Date.UTC(2026, 9, 12, 12, 0, 0);
  const haSeg = s => new Date(agora - s * 1000);
  assert.equal(clienteSumiu(haSeg(30), agora), false);
  assert.equal(clienteSumiu(haSeg(61), agora), true);
  assert.equal(clienteSumiu(null, agora), true);
  assert.equal(clienteSumiu(haSeg(120), agora, true), false, "conversando, tolera até 5 min");
  assert.equal(clienteSumiu(haSeg(301), agora, true), true);
  assert.equal(atendenteSumiu(haSeg(60), agora), false);
  assert.equal(atendenteSumiu(haSeg(91), agora), true);
  assert.equal(statusEfetivoAtendente({ statusAtendimento: "disponivel", ultimoSinalEm: haSeg(200) }, agora), "ausente", "esqueceu a aba aberta: conta como ausente");
  assert.equal(statusEfetivoAtendente({ statusAtendimento: "disponivel", ultimoSinalEm: haSeg(10) }, agora), "disponivel");
  assert.equal(statusEfetivoAtendente({ statusAtendimento: "ocupado", ultimoSinalEm: haSeg(10) }, agora), "ocupado");
});

test("vagas: só quem está disponível e abaixo da capacidade", () => {
  const agora = Date.UTC(2026, 9, 12, 12, 0, 0);
  const vivo = new Date(agora - 5000);
  const equipe = [
    { id: 1, ativo: true, statusAtendimento: "disponivel", ultimoSinalEm: vivo },
    { id: 2, ativo: true, statusAtendimento: "disponivel", ultimoSinalEm: vivo },
    { id: 3, ativo: true, statusAtendimento: "ocupado", ultimoSinalEm: vivo },
    { id: 4, ativo: true, statusAtendimento: "disponivel", ultimoSinalEm: new Date(agora - 600000) },
    { id: 5, ativo: false, statusAtendimento: "disponivel", ultimoSinalEm: vivo },
  ];
  assert.deepEqual(atendentesComVaga(equipe, { 1: 3, 2: 2 }, 3, agora).map(a => a.id), [2]);
  assert.deepEqual(atendentesComVaga(equipe, {}, 3, agora).map(a => a.id), [1, 2]);
});

test("horário do chat: segunda a sexta, 8h às 18h em São Paulo (fim exclusivo)", () => {
  const h = HORARIO_CHAT_PADRAO;
  const sp = (dia, hh, mm = 0) => new Date(Date.UTC(2026, 9, dia, hh + 3, mm)); // 12/10/2026 é segunda-feira; SP = UTC-3
  assert.equal(chatAberto(sp(12, 7, 59), h), false);
  assert.equal(chatAberto(sp(12, 8, 0), h), true);
  assert.equal(chatAberto(sp(12, 17, 59), h), true);
  assert.equal(chatAberto(sp(12, 18, 0), h), false);
  assert.equal(chatAberto(sp(16, 12), h), true, "sexta ao meio-dia");
  assert.equal(chatAberto(sp(17, 12), h), false, "sábado");
  assert.equal(chatAberto(sp(18, 12), h), false, "domingo");
  assert.equal(chatAberto(sp(12, 12), {}), false, "sem horário configurado");
  // 23h de domingo em SP já é segunda em UTC: tem que valer o relógio de São Paulo
  assert.equal(chatAberto(new Date(Date.UTC(2026, 9, 19, 2, 0)), h), false, "domingo 23h em SP (segunda 02h UTC)");
});

test("texto do horário agrupa dias seguidos", () => {
  assert.equal(textoHorario(HORARIO_CHAT_PADRAO), "segunda a sexta, das 8h às 18h");
  assert.equal(textoHorario({ 1: ["08:00", "18:00"], 2: ["08:00", "18:00"], 6: ["09:00", "13:30"] }), "segunda a terça, das 8h às 18h; sábado, das 9h às 13h30");
  assert.equal(textoHorario({ 3: ["08:00", "12:00"] }), "quarta, das 8h às 12h");
  assert.equal(textoHorario({}), "sem horário de chat");
});

test("prazo de resposta pelo plano: 48 h, 24 h e 8 h; situação ok, perto e estourado", () => {
  assert.deepEqual(["starter", "pro", "enterprise", "desconhecido"].map(prazoHoras), [48, 24, 8, 48]);
  const base = new Date(Date.UTC(2026, 9, 12, 12, 0));
  const chamado = { canal: "ticket", status: "aberto", plano: "pro", entrouNaFilaEm: base, primeiraRespostaEm: null };
  assert.equal(venceEm(chamado).getTime(), base.getTime() + 24 * 3600000);
  const horas = h => base.getTime() + h * 3600000;
  assert.equal(situacaoPrazo(chamado, horas(10)), "ok");
  assert.equal(situacaoPrazo(chamado, horas(19)), "perto");
  assert.equal(situacaoPrazo(chamado, horas(25)), "estourado");
  assert.equal(situacaoPrazo({ ...chamado, primeiraRespostaEm: base }, horas(30)), null, "já respondido");
  assert.equal(situacaoPrazo({ ...chamado, canal: "chat" }, horas(30)), null, "chat não tem prazo de ticket");
  assert.equal(situacaoPrazo({ ...chamado, status: "resolvido" }, horas(30)), null);
});

test("chamado: prioridade inicial e o que acontece quando o cliente responde", () => {
  assert.equal(prioridadeInicial(true), "alta");
  assert.equal(prioridadeInicial(false), "normal");
  assert.deepEqual(aposRespostaDoCliente({ status: "aberto" }), { status: "aberto", reentra: false });
  assert.deepEqual(aposRespostaDoCliente({ status: "em_atendimento" }), { status: "em_atendimento", reentra: false });
  assert.deepEqual(aposRespostaDoCliente({ status: "aguardando_cliente", atribuidoId: 4 }), { status: "em_atendimento", reentra: false });
  assert.deepEqual(aposRespostaDoCliente({ status: "aguardando_cliente", atribuidoId: null }), { status: "aberto", reentra: false });
  assert.deepEqual(aposRespostaDoCliente({ status: "resolvido" }), { status: "aberto", reentra: true }, "reaberto, entra no fim da fila");
  assert.match(aposRespostaDoCliente({ status: "fechado" }).erro, /fechado/);
});

test("status: transições que a equipe pode fazer; só supervisor reabre fechado", () => {
  assert.equal(podeMudarStatus("aberto", "em_atendimento"), true);
  assert.equal(podeMudarStatus("em_atendimento", "aguardando_cliente"), true);
  assert.equal(podeMudarStatus("resolvido", "em_atendimento"), true);
  assert.equal(podeMudarStatus("resolvido", "aberto"), false);
  assert.equal(podeMudarStatus("fechado", "aberto"), false);
  assert.equal(podeMudarStatus("fechado", "aberto", { supervisor: true }), true);
  assert.equal(podeMudarStatus("na_fila", "resolvido"), false, "chat na fila só avança pelo 'atender próximo'");
  assert.equal(podeMudarStatus("aberto", "na_fila"), false);
});
