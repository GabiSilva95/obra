// Regras da fila de atendimento (chamados e chat ao vivo). Funções puras: recebem os dados e a hora, não tocam o banco.
import { CHAT, FUSO, PRAZO_RESPOSTA_HORAS } from "../config/suporte.js";

const MS_H = 3600000;
const tempo = v => new Date(v).getTime();

// ─── Ordem ────────────────────────────────────────────────────────────────────

/**
 * Chamados (ticket) na ordem em que serão atendidos: os urgentes primeiro, depois a ordem de solicitação.
 * Dentro de cada grupo, vale quem entrou antes (e o número do chamado desempata).
 */
export function ordenarChamados(lista) {
  const grupo = t => (t.prioridade === "urgente" ? 0 : 1);
  return [...lista].sort((a, b) => grupo(a) - grupo(b) || tempo(a.entrouNaFilaEm) - tempo(b.entrouNaFilaEm) || a.id - b.id);
}

/** Fila do chat ao vivo: estritamente por ordem de chegada, sem furar. */
export function ordenarFilaChat(lista) {
  return [...lista].sort((a, b) => tempo(a.entrouNaFilaEm) - tempo(b.entrouNaFilaEm) || a.id - b.id);
}

/** Posição (1, 2, 3...) de um chat na fila, ou null se ele não está nela. */
export function posicaoNaFila(fila, id) {
  const i = ordenarFilaChat(fila).findIndex(t => t.id === id);
  return i === -1 ? null : i + 1;
}

// ─── Espera ───────────────────────────────────────────────────────────────────

/** Duração média (min) dos últimos atendimentos, entre 3 e 60; sem histórico, o padrão. */
export function mediaAtendimentoMin(duracoesMin) {
  const validas = (duracoesMin || []).filter(d => Number.isFinite(d) && d > 0).slice(-20);
  if (!validas.length) return CHAT.mediaPadraoMin;
  const media = validas.reduce((s, d) => s + d, 0) / validas.length;
  return Math.min(60, Math.max(3, Math.round(media)));
}

/** Espera estimada em minutos (de 5 em 5, no máximo 120), ou null se não há atendente disponível agora. */
export function esperaEstimadaMin(posicao, atendentesDisponiveis, mediaMin = CHAT.mediaPadraoMin) {
  if (!posicao || atendentesDisponiveis < 1) return null;
  const bruto = Math.ceil(posicao / atendentesDisponiveis) * mediaMin;
  return Math.min(120, Math.max(5, Math.ceil(bruto / 5) * 5));
}

// ─── Presença ─────────────────────────────────────────────────────────────────

/** O cliente que esperava na fila (ou conversava) sumiu: sem sinal além do limite. */
export function clienteSumiu(ultimoSinalEm, agora = Date.now(), emAtendimento = false) {
  if (!ultimoSinalEm) return true;
  const limite = (emAtendimento ? CHAT.clienteSumiuEmAtendimentoSeg : CHAT.clienteSumiuSeg) * 1000;
  return tempo(agora) - tempo(ultimoSinalEm) > limite;
}

/** O atendente sumiu (aba fechada, rede caída): sem sinal além do limite. */
export function atendenteSumiu(ultimoSinalEm, agora = Date.now()) {
  if (!ultimoSinalEm) return true;
  return tempo(agora) - tempo(ultimoSinalEm) > CHAT.atendenteSumiuSeg * 1000;
}

/** Situação que vale agora: quem está sem sinal conta como ausente, mesmo que tenha deixado "disponível". */
export const statusEfetivoAtendente = (a, agora = Date.now()) => (atendenteSumiu(a.ultimoSinalEm, agora) ? "ausente" : a.statusAtendimento);

/** Atendentes que podem pegar mais um chat agora: presentes, não ausentes e abaixo da capacidade. */
export function atendentesComVaga(atendentes, chatsAtivosPorAtendente, capacidade, agora = Date.now()) {
  return atendentes.filter(a => a.ativo !== false && statusEfetivoAtendente(a, agora) === "disponivel" && (chatsAtivosPorAtendente[a.id] || 0) < capacidade);
}

// ─── Horário do chat ──────────────────────────────────────────────────────────

const DIAS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const NOMES_DIA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const emMin = hhmm => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };

function relogioSP(data) {
  const partes = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: FUSO, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(data)).map(p => [p.type, p.value]));
  return { dia: DIAS[partes.weekday], min: Number(partes.hour) * 60 + Number(partes.minute) };
}

/** O chat está aberto agora? Início inclusive, fim exclusivo, no horário de São Paulo. */
export function chatAberto(agora, horario) {
  const { dia, min } = relogioSP(agora);
  const faixa = horario?.[dia];
  return !!faixa && min >= emMin(faixa[0]) && min < emMin(faixa[1]);
}

/** "segunda a sexta, das 8h às 18h" (agrupa dias seguidos com o mesmo horário). */
export function textoHorario(horario) {
  const hora = hhmm => { const [h, m] = hhmm.split(":").map(Number); return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`; };
  const grupos = [];
  for (const dia of [1, 2, 3, 4, 5, 6, 0]) {
    const faixa = horario?.[dia];
    if (!faixa) continue;
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.faixa[0] === faixa[0] && ultimo.faixa[1] === faixa[1] && ultimo.fim === (dia + 6) % 7) ultimo.fim = dia;
    else grupos.push({ inicio: dia, fim: dia, faixa });
  }
  if (!grupos.length) return "sem horário de chat";
  return grupos.map(g => `${g.inicio === g.fim ? NOMES_DIA[g.inicio] : `${NOMES_DIA[g.inicio]} a ${NOMES_DIA[g.fim]}`}, das ${hora(g.faixa[0])} às ${hora(g.faixa[1])}`).join("; ");
}

// ─── Prazo de resposta do chamado ─────────────────────────────────────────────

/** Prazo da primeira resposta, em horas, pelo plano (starter, pro, enterprise). Plano desconhecido vale o do menor. */
export const prazoHoras = plano => PRAZO_RESPOSTA_HORAS[plano] ?? PRAZO_RESPOSTA_HORAS.starter;

/** Quando vence a primeira resposta de um chamado. */
export const venceEm = t => new Date(tempo(t.entrouNaFilaEm) + prazoHoras(t.plano) * MS_H);

/**
 * Situação do prazo da primeira resposta: "ok", "perto" (passou de 75%) ou "estourado".
 * Só vale enquanto ninguém respondeu; depois da primeira resposta, devolve null.
 */
export function situacaoPrazo(t, agora = Date.now()) {
  if (t.canal === "chat" || t.primeiraRespostaEm || t.status !== "aberto") return null;
  const total = prazoHoras(t.plano) * MS_H;
  const gasto = tempo(agora) - tempo(t.entrouNaFilaEm);
  return gasto > total ? "estourado" : gasto > total * 0.75 ? "perto" : "ok";
}

// ─── Estados do chamado ───────────────────────────────────────────────────────

/** "Isto me impede de trabalhar?" sobe a prioridade para alta. A equipe ajusta depois. */
export const prioridadeInicial = bloqueante => (bloqueante ? "alta" : "normal");

/**
 * O que acontece com o chamado quando o cliente escreve de novo.
 * Resolvido que volta a ser respondido reabre e entra no fim da fila (não fura quem espera). Fechado não reabre.
 */
export function aposRespostaDoCliente(t) {
  switch (t.status) {
    case "aberto": case "em_atendimento": return { status: t.status, reentra: false };
    case "aguardando_cliente": return { status: t.atribuidoId ? "em_atendimento" : "aberto", reentra: false };
    case "resolvido": return { status: "aberto", reentra: true };
    default: return { erro: "Este chamado foi fechado. Abra um novo chamado." };
  }
}

const TRANSICOES_EQUIPE = {
  aberto: ["em_atendimento", "aguardando_cliente", "resolvido", "fechado"],
  em_atendimento: ["aberto", "aguardando_cliente", "resolvido", "fechado"],
  aguardando_cliente: ["em_atendimento", "resolvido", "fechado"],
  resolvido: ["em_atendimento", "fechado"],
  fechado: [],
  na_fila: [],
  abandonado: [],
};

/** A equipe pode mudar de `de` para `para`? Só o supervisor reabre um chamado fechado. */
export function podeMudarStatus(de, para, { supervisor = false } = {}) {
  if (de === "fechado" && para === "aberto") return supervisor;
  return (TRANSICOES_EQUIPE[de] || []).includes(para);
}
