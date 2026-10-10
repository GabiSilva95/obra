// Formatação do painel: o mesmo que o sistema do cliente usa (src/utils/tempo.js).
import { duracao } from "../utils/tempo.js";
export { dataBR, dataDoDia, dataHoraBR, duracao, haQuanto, horaBR } from "../utils/tempo.js";

/** "vence em 3 h" ou "estourado há 2 h": o prazo da primeira resposta do chamado. */
export function prazoTexto(prazo, agora = Date.now()) {
  if (!prazo?.venceEm) return "";
  const vence = new Date(prazo.venceEm).getTime();
  return vence >= agora ? `vence em ${duracao(new Date(agora), new Date(vence))}` : `estourado há ${duracao(new Date(vence), new Date(agora))}`;
}

/** Bipe curto quando entra alguém na fila (o navegador só deixa tocar depois de a pessoa interagir com a página). */
export function bipe() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator(), ganho = ctx.createGain();
    osc.frequency.value = 880; ganho.gain.value = 0.08;
    osc.connect(ganho); ganho.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.18);
    osc.onended = () => ctx.close();
  } catch { /* sem áudio: segue sem avisar */ }
}

/** 130 -> "2 h 10 min"; 45 -> "45 min"; 3000 -> "2 dias 2 h". null vira "-". */
export function duracaoMin(min) {
  if (min == null) return "-";
  const m = Math.round(min);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h${m % 60 ? ` ${m % 60} min` : ""}`;
  const d = Math.floor(h / 24);
  return `${d} ${d === 1 ? "dia" : "dias"}${h % 24 ? ` ${h % 24} h` : ""}`;
}
