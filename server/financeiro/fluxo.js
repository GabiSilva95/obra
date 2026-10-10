// Fluxo de caixa (realizado + previsto) e envelhecimento de contas em aberto. Funções puras.
import { diasEntre, somarDias } from "../utils/datas.js";
import { emCentavos, emReais, ratearProporcional } from "./dinheiro.js";
import { saldoCent } from "./status.js";

const mesInicio = d => `${d.slice(0, 7)}-01`;
/** Segunda-feira da semana de `d`. */
function segunda(d) {
  const [a, m, dia] = d.split("-").map(Number);
  const wd = (new Date(Date.UTC(a, m - 1, dia)).getUTCDay() + 6) % 7; // 0 = segunda
  return somarDias(d, -wd);
}

/** Início do período (a "chave") em que cai a data. */
export function chavePeriodo(data, agrupar) {
  if (agrupar === "dia") return data;
  if (agrupar === "mes") return mesInicio(data);
  return segunda(data);
}

function fimPeriodo(chave, agrupar) {
  if (agrupar === "dia") return chave;
  if (agrupar === "semana") return somarDias(chave, 6);
  const [a, m] = chave.split("-").map(Number);
  return new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
}

/** Todas as chaves de período entre `de` e `ate` (inclusive), para a tabela não ter buracos. */
function periodos(de, ate, agrupar) {
  const saida = [];
  let c = chavePeriodo(de, agrupar);
  const ultimo = chavePeriodo(ate, agrupar);
  while (c <= ultimo) {
    saida.push(c);
    if (agrupar === "dia") c = somarDias(c, 1);
    else if (agrupar === "semana") c = somarDias(c, 7);
    else { const [a, m] = c.split("-").map(Number); c = new Date(Date.UTC(a, m, 1)).toISOString().slice(0, 10); }
  }
  return saida;
}

/**
 * Parte do valor (em centavos) que cabe ao filtro de obra e/ou centro de custo, repartindo pelo rateio do título.
 * Sem filtro, é o valor inteiro. Com filtro e título sem rateio, não conta.
 */
export function parteDoFiltro(cent, rateios, { obraId, centroCustoId }) {
  if (!obraId && !centroCustoId) return cent;
  if (!rateios.length) return 0;
  const partes = ratearProporcional(Math.abs(cent), rateios.map(r => emCentavos(r.valor)));
  const dentro = rateios.reduce((s, r, i) => s + ((!obraId || r.obraId === obraId) && (!centroCustoId || r.centroCustoId === centroCustoId) ? partes[i] : 0), 0);
  return Math.sign(cent) * dentro;
}

/**
 * titulos: [{ tipo, status, vencimento, valor, rateios:[{obraId,centroCustoId,valor}], baixas:[{data,contaId,valor,juros,multa,desconto,estornadaEm}] }]
 * Realizado = baixas na data em que aconteceram. Previsto = saldo de cada título em aberto no vencimento;
 * o que já venceu e não foi pago ("em atraso") entra em `atrasado` e conta como previsto para hoje.
 */
export function montarFluxo({ titulos, hoje, de, ate, agrupar = "semana", saldoInicialCent = 0, contaId = null, obraId = null, centroCustoId = null }) {
  const chaves = periodos(de, ate, agrupar);
  const linhas = new Map(chaves.map(c => [c, { chave: c, inicio: c < de ? de : c, fim: fimPeriodo(c, agrupar) > ate ? ate : fimPeriodo(c, agrupar), entradasReais: 0, saidasReais: 0, entradasPrev: 0, saidasPrev: 0 }]));
  const atrasado = { entradas: 0, saidas: 0 };
  const filtro = { obraId, centroCustoId };
  const somar = (linha, tipo, real, cent) => {
    const campo = tipo === "receber" ? (real ? "entradasReais" : "entradasPrev") : (real ? "saidasReais" : "saidasPrev");
    linha[campo] += cent;
  };

  for (const t of titulos) {
    if (t.status === "cancelado") continue;
    for (const b of t.baixas) {
      if (b.estornadaEm || b.data < de || b.data > ate) continue;
      if (contaId && b.contaId !== contaId) continue;
      const mov = emCentavos(b.valor) + emCentavos(b.juros) + emCentavos(b.multa) - emCentavos(b.desconto);
      const parte = parteDoFiltro(mov, t.rateios, filtro);
      if (parte) somar(linhas.get(chavePeriodo(b.data, agrupar)), t.tipo, true, Math.abs(parte));
    }
    if (t.status === "aberto" || t.status === "parcial") {
      const saldo = saldoCent(emCentavos(t.valor), t.baixas.map(b => ({ valorCent: emCentavos(b.valor), estornada: !!b.estornadaEm })));
      const parte = parteDoFiltro(saldo, t.rateios, filtro);
      if (parte <= 0) continue;
      if (t.vencimento < hoje) { if (t.tipo === "receber") atrasado.entradas += parte; else atrasado.saidas += parte; continue; }
      if (t.vencimento >= de && t.vencimento <= ate) somar(linhas.get(chavePeriodo(t.vencimento, agrupar)), t.tipo, false, parte);
    }
  }

  // O atraso entra no saldo projetado já no início do período (se o período alcança hoje)
  let acum = saldoInicialCent;
  const incluiAtraso = de <= hoje || hoje <= ate;
  if (incluiAtraso) acum += atrasado.entradas - atrasado.saidas;
  const saldoComAtraso = acum;
  const rows = chaves.map(c => {
    const l = linhas.get(c);
    const saldo = l.entradasReais - l.saidasReais + l.entradasPrev - l.saidasPrev;
    acum += saldo;
    return { chave: c, inicio: l.inicio, fim: l.fim, entradasReais: emReais(l.entradasReais), saidasReais: emReais(l.saidasReais), entradasPrev: emReais(l.entradasPrev), saidasPrev: emReais(l.saidasPrev), saldo: emReais(saldo), acumulado: emReais(acum), passado: l.fim < hoje };
  });
  return {
    saldoInicial: emReais(saldoInicialCent), atrasado: { entradas: emReais(atrasado.entradas), saidas: emReais(atrasado.saidas) }, saldoComAtraso: emReais(saldoComAtraso), periodos: rows,
    totais: {
      entradasReais: emReais([...linhas.values()].reduce((s, l) => s + l.entradasReais, 0)), saidasReais: emReais([...linhas.values()].reduce((s, l) => s + l.saidasReais, 0)),
      entradasPrev: emReais([...linhas.values()].reduce((s, l) => s + l.entradasPrev, 0)), saidasPrev: emReais([...linhas.values()].reduce((s, l) => s + l.saidasPrev, 0)),
    },
    saldoFinal: emReais(acum),
  };
}

export const FAIXAS = [
  { chave: "aVencer", rotulo: "A vencer" }, { chave: "f1_30", rotulo: "1 a 30 dias" }, { chave: "f31_60", rotulo: "31 a 60 dias" }, { chave: "f61_90", rotulo: "61 a 90 dias" }, { chave: "f90", rotulo: "Mais de 90 dias" },
];
const faixaDe = dias => (dias <= 0 ? "aVencer" : dias <= 30 ? "f1_30" : dias <= 60 ? "f31_60" : dias <= 90 ? "f61_90" : "f90");

/** Contas em aberto por pessoa e faixa de atraso. `titulos`: abertos/parciais com `baixas` e `pessoa`. */
export function envelhecimento(titulos, hoje) {
  const por = new Map();
  for (const t of titulos) {
    if (t.status !== "aberto" && t.status !== "parcial") continue;
    const saldo = saldoCent(emCentavos(t.valor), t.baixas.map(b => ({ valorCent: emCentavos(b.valor), estornada: !!b.estornadaEm })));
    if (saldo <= 0) continue;
    const nome = t.pessoa?.nome || t.pessoaTexto || "Sem pessoa";
    const l = por.get(nome) || { nome, aVencer: 0, f1_30: 0, f31_60: 0, f61_90: 0, f90: 0, total: 0, quantidade: 0 };
    l[faixaDe(diasEntre(t.vencimento, hoje))] += saldo; l.total += saldo; l.quantidade++;
    por.set(nome, l);
  }
  const linhas = [...por.values()].sort((a, b) => b.total - a.total).map(l => ({ ...l, aVencer: emReais(l.aVencer), f1_30: emReais(l.f1_30), f31_60: emReais(l.f31_60), f61_90: emReais(l.f61_90), f90: emReais(l.f90), total: emReais(l.total) }));
  const soma = campo => emReais(linhas.reduce((s, l) => s + emCentavos(l[campo]), 0));
  return { linhas, totais: { aVencer: soma("aVencer"), f1_30: soma("f1_30"), f31_60: soma("f31_60"), f61_90: soma("f61_90"), f90: soma("f90"), total: soma("total") } };
}
