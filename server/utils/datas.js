// Datas do sistema são strings AAAA-MM-DD no horário de São Paulo.
// `toISOString()` devolve UTC e, depois das 21h no Brasil, já é o dia seguinte.
const fmtSP = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });

/** Data de hoje (AAAA-MM-DD) em São Paulo. */
export const hojeBR = (base = new Date()) => fmtSP.format(base);

/** Soma `dias` a uma data AAAA-MM-DD (sem depender do fuso do servidor). */
export function somarDias(data, dias) {
  const [a, m, d] = data.split("-").map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d + dias));
  return dt.toISOString().slice(0, 10);
}

/** Soma `meses` a uma data, mantendo o dia ou caindo no último dia do mês (31/01 + 1 mês = 28/02). */
export function somarMeses(data, meses) {
  const [a, m, d] = data.split("-").map(Number);
  const alvo = new Date(Date.UTC(a, m - 1 + meses, 1));
  const ultimo = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate();
  alvo.setUTCDate(Math.min(d, ultimo));
  return alvo.toISOString().slice(0, 10);
}

/** Diferença em dias inteiros (b - a) entre duas datas AAAA-MM-DD. */
export function diasEntre(a, b) {
  const t = s => { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((t(b) - t(a)) / 86400000);
}
