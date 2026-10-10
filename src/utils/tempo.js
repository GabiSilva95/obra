// Datas e tempo decorrido legíveis (horário de São Paulo). Usado pelo sistema do cliente e pelo painel da equipe.
const fmtData = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" });
const fmtHora = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });

export const dataHoraBR = v => (v ? `${fmtData.format(new Date(v))} ${fmtHora.format(new Date(v))}` : "");
export const dataBR = v => (v ? fmtData.format(new Date(v)) : "");
export const horaBR = v => (v ? fmtHora.format(new Date(v)) : "");

/** "há 5 min", "há 2 h 10 min", "há 3 dias": tempo decorrido entre `desde` e `agora` (ms ou data). */
export function haQuanto(desde, agora = Date.now()) {
  if (!desde) return "";
  const min = Math.max(0, Math.floor((new Date(agora).getTime() - new Date(desde).getTime()) / 60000));
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h${min % 60 ? ` ${min % 60} min` : ""}`;
  const d = Math.floor(h / 24);
  return `há ${d} ${d === 1 ? "dia" : "dias"}`;
}

/** "5 min", "1 h 05", "2 dias": duração sem o "há" (para espera e tempo de atendimento). */
export function duracao(desde, agora = Date.now()) {
  return haQuanto(desde, agora).replace(/^há /, "").replace(/^agora$/, "menos de 1 min");
}

/** "2026-11-05" (data de calendário, sem hora) em dd/mm/aaaa, sem o deslocamento de fuso. */
export const dataDoDia = s => (s ? s.split("-").reverse().join("/") : "");
