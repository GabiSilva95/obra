// Indicadores da Visão geral do painel. Funções puras: recebem linhas do banco já lidas e a hora, não tocam o banco.
// Datas de calendário são AAAA-MM-DD de São Paulo (`hojeBR`); nunca String(Date) nem toISOString() para dia ou mês.
import { prazoHoras, situacaoPrazo, venceEm } from "../suporte/fila.js";
import { SITUACOES, ehContaInterna, statusEfetivo, diasRestantesTeste } from "../config/conta.js";
import { rotuloSetor } from "../config/suporte.js";
import { diasEntre, hojeBR, somarDias } from "../utils/datas.js";

const MS_MIN = 60000, MS_H = 3600000, MS_DIA = 86400000;
const t = v => new Date(v).getTime();
const media = lista => (lista.length ? lista.reduce((a, b) => a + b, 0) / lista.length : null);
const mediana = lista => {
  if (!lista.length) return null;
  const o = [...lista].sort((a, b) => a - b), m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
};
const arred = (n, casas = 0) => (n == null ? null : Math.round(n * 10 ** casas) / 10 ** casas);

// ─── Atendimento ──────────────────────────────────────────────────────────────

/**
 * O atendimento: um retrato de agora (fila, chamados abertos, prazos) e o resultado do período.
 *   criados:    chamados e chats abertos no período   { canal, status, plano, setor, createdAt, entrouNaFilaEm, iniciadoEm, primeiraRespostaEm }
 *   encerrados: chamados e chats encerrados no período { canal, status, avaliacao }
 *   abertos:    chamados (ticket) em aberto agora, de qualquer época
 *   chatsAtivos: chats na fila ou em atendimento agora { status }
 */
export function calcularAtendimento({ criados, encerrados, abertos, chatsAtivos, agora = Date.now(), dias = 30 }) {
  const tickets = criados.filter(c => c.canal === "ticket");
  const chats = criados.filter(c => c.canal === "chat");

  // Agora
  const prazos = abertos.map(a => situacaoPrazo(a, agora));
  const semResposta = abertos.filter(a => !a.primeiraRespostaEm && a.status === "aberto");
  const maisAntigo = semResposta.length ? semResposta.reduce((m, a) => (t(a.entrouNaFilaEm) < t(m.entrouNaFilaEm) ? a : m)) : null;
  const instantaneo = {
    chatsNaFila: chatsAtivos.filter(c => c.status === "na_fila").length,
    chatsEmAtendimento: chatsAtivos.filter(c => c.status === "em_atendimento").length,
    chamadosAbertos: abertos.length,
    semResposta: semResposta.length,
    prazoEstourado: prazos.filter(p => p === "estourado").length,
    prazoPerto: prazos.filter(p => p === "perto").length,
    maisAntigoSemRespostaEm: maisAntigo ? new Date(maisAntigo.entrouNaFilaEm).toISOString() : null,
  };

  // Período: tempo até a primeira resposta e cumprimento do prazo (só chamados; o chat tem a espera na fila)
  const respondidos = tickets.filter(c => c.primeiraRespostaEm);
  const minResposta = respondidos.map(c => (t(c.primeiraRespostaEm) - t(c.entrouNaFilaEm)) / MS_MIN);
  const noPrazo = respondidos.filter(c => t(c.primeiraRespostaEm) - t(c.entrouNaFilaEm) <= prazoHoras(c.plano) * MS_H).length;
  const vencidosSemResposta = tickets.filter(c => !c.primeiraRespostaEm && agora > venceEm(c).getTime()).length;
  const baseDoPrazo = respondidos.length + vencidosSemResposta;

  const esperaChat = chats.filter(c => c.iniciadoEm).map(c => (t(c.iniciadoEm) - t(c.entrouNaFilaEm)) / MS_MIN);
  const notas = encerrados.map(c => c.avaliacao).filter(n => Number.isInteger(n));

  // Por setor (chamados e chats juntos) e por dia nos últimos 14 dias
  const porSetor = {};
  for (const c of criados) porSetor[c.setor] = (porSetor[c.setor] || 0) + 1;
  const hoje = hojeBR(new Date(agora));
  const nDias = Math.min(dias, 14);
  const porDia = Array.from({ length: nDias }, (_, i) => {
    const dia = somarDias(hoje, i - (nDias - 1));
    const doDia = criados.filter(c => hojeBR(new Date(c.createdAt)) === dia);
    return { dia, chamados: doDia.filter(c => c.canal === "ticket").length, chats: doDia.filter(c => c.canal === "chat").length };
  });

  return {
    agora: instantaneo,
    periodo: {
      dias,
      chamadosNovos: tickets.length,
      chatsPedidos: chats.length,
      resolvidos: encerrados.filter(c => c.canal === "ticket" && ["resolvido", "fechado"].includes(c.status)).length,
      chatsAtendidos: chats.filter(c => c.iniciadoEm).length,
      chatsAbandonados: chats.filter(c => c.status === "abandonado").length,
      respondidos: respondidos.length,
      tempoMedioRespostaMin: arred(media(minResposta)),
      tempoMedianoRespostaMin: arred(mediana(minResposta)),
      dentroDoPrazoPct: baseDoPrazo ? arred((noPrazo / baseDoPrazo) * 100) : null,
      esperaMediaChatMin: arred(media(esperaChat), 1),
      avaliacaoMedia: arred(media(notas), 2),
      avaliacoes: notas.length,
      porSetor: Object.entries(porSetor).map(([setor, total]) => ({ setor, rotulo: rotuloSetor(setor), total })).sort((a, b) => b.total - a.total || a.rotulo.localeCompare(b.rotulo, "pt-BR")),
      porDia,
    },
  };
}

// ─── Clientes ─────────────────────────────────────────────────────────────────

const DIAS_SEM_ACESSO = 14;

/**
 * Os clientes: quantas empresas em cada situação, quem se cadastrou, quem precisa de um contato e quanto do teste vira assinatura.
 *   empresas: { id, razaoSocial, email, plano, status, trialAte, createdAt, ultimoAcessoEm, telefone, ativadaEm }
 * A conta interna da casa não entra em nenhum número.
 */
export function calcularClientes({ empresas, agora = Date.now(), hoje = hojeBR(new Date(agora)) }) {
  const reais = empresas.filter(e => !ehContaInterna(e));
  const situacao = e => statusEfetivo(e, hoje);
  const porSituacao = Object.fromEntries(Object.keys(SITUACOES).map(s => [s, 0]));
  for (const e of reais) porSituacao[situacao(e)] += 1;
  const dia = v => hojeBR(new Date(v));

  const ref = e => ({ id: e.id, nome: e.razaoSocial, plano: e.plano, telefone: e.telefone, ultimoAcessoEm: e.ultimoAcessoEm ?? null });

  // Teste acabando (até 3 dias, incluindo o último dia) e teste que acabou nos últimos 14 dias sem virar assinatura
  const acabando = reais.filter(e => situacao(e) === "trial" && diasRestantesTeste(e, hoje) != null && diasRestantesTeste(e, hoje) <= 3)
    .map(e => ({ ...ref(e), diasRestantes: diasRestantesTeste(e, hoje) })).sort((a, b) => a.diasRestantes - b.diasRestantes);
  const acabaram = reais.filter(e => situacao(e) === "trial_expirado" && e.trialAte && diasEntre(e.trialAte, hoje) <= 14)
    .map(e => ({ ...ref(e), acabouHaDias: diasEntre(e.trialAte, hoje) })).sort((a, b) => a.acabouHaDias - b.acabouHaDias);

  // Conversão: das empresas cujo teste de 14 dias já terminou (cadastradas entre 90 e 14 dias atrás, e que passaram por teste),
  // quantas viraram assinatura. Contas antigas, anteriores ao teste, não entram (não têm `trialAte`).
  const coorte = reais.filter(e => e.trialAte && dia(e.createdAt) <= somarDias(hoje, -14) && dia(e.createdAt) >= somarDias(hoje, -90));
  const convertidas = coorte.filter(e => e.ativadaEm).length;

  // Ativas que sumiram: pagam (ou estão em dia) e não entram há mais de 14 dias
  const limite = somarDias(hoje, -DIAS_SEM_ACESSO);
  const semAcesso = reais.filter(e => ["ativo", "inadimplente"].includes(situacao(e)) && (!e.ultimoAcessoEm || dia(e.ultimoAcessoEm) < limite))
    .map(e => ({ ...ref(e), semAcessoHaDias: e.ultimoAcessoEm ? diasEntre(dia(e.ultimoAcessoEm), hoje) : null }))
    .sort((a, b) => (b.semAcessoHaDias ?? 1e9) - (a.semAcessoHaDias ?? 1e9));

  return {
    total: reais.length, porSituacao,
    novos7: reais.filter(e => t(e.createdAt) >= agora - 7 * MS_DIA).length,
    novos30: reais.filter(e => t(e.createdAt) >= agora - 30 * MS_DIA).length,
    testesAcabando: acabando, testesAcabaram: acabaram,
    conversao: { base: coorte.length, convertidas, pct: coorte.length ? arred((convertidas / coorte.length) * 100) : null },
    semAcesso: { diasSemAcesso: DIAS_SEM_ACESSO, total: semAcesso.length, itens: semAcesso.slice(0, 8) },
  };
}

// ─── Pendências (o sino do painel) ────────────────────────────────────────────

/** O que pede atenção agora, só das áreas que a pessoa pode ver (`null` = sem permissão para a área). */
export function montarPendencias({ atendimento, clientes, financeiro }) {
  return {
    atendimento: atendimento && { chatNaFila: atendimento.chatsNaFila, chamadosSemResposta: atendimento.semResposta, prazoEstourado: atendimento.prazoEstourado },
    clientes: clientes && { testesAcabando: clientes.testesAcabando.length, testesAcabaram: clientes.testesAcabaram.length },
    financeiro: financeiro && { cobrancasAtrasadas: financeiro.cobrancas, valorEmAtraso: financeiro.valor },
  };
}
