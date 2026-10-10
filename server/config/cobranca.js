// Regras de assinatura e cobrança que o servidor, o painel e a tela do cliente precisam enxergar iguais.
// Arquivo puro (sem banco): o front importa. Dinheiro sempre em centavos inteiros (server/financeiro/dinheiro.js).
import { PLANOS, normalizarPlano } from "./planos.js";
import { somarMeses } from "../utils/datas.js";

export const FORMAS_PAGAMENTO = [
  { id: "pix", rotulo: "Pix" },
  { id: "boleto", rotulo: "Boleto" },
  { id: "cartao", rotulo: "Cartão" },
  { id: "transferencia", rotulo: "Transferência" },
  { id: "outro", rotulo: "Outro" },
];
export const rotuloForma = id => FORMAS_PAGAMENTO.find(f => f.id === id)?.rotulo || id || "";
export const formaValida = id => FORMAS_PAGAMENTO.some(f => f.id === id);

export const CICLOS = ["mensal", "anual"];

/** A situação que a pessoa vê. No banco só existem aberta, paga e cancelada: "atrasada" sai da data de vencimento. */
export const SITUACOES_COBRANCA = {
  aberta: { rotulo: "Em aberto", tom: "info" },
  atrasada: { rotulo: "Atrasada", tom: "danger" },
  paga: { rotulo: "Paga", tom: "success" },
  cancelada: { rotulo: "Cancelada", tom: "neutral" },
};
export const situacaoCobranca = (c, hoje) => (c.status === "aberta" && c.vencimento < hoje ? "atrasada" : c.status);

/** Preço de lista de UM período, em centavos: mensal = o mês; anual = o ano inteiro (12 vezes o preço mensal do anual). */
export function valorListaCent(plano, ciclo) {
  const p = PLANOS[normalizarPlano(plano)] ?? PLANOS.starter;
  return ciclo === "anual" ? p.preco.anual * 12 * 100 : p.preco.mensal * 100;
}

/** Quanto o período rende por mês (para a receita recorrente): o anual é dividido por 12. */
export const valorMensalCent = (valorPeriodoCent, ciclo) => (ciclo === "anual" ? Math.round(valorPeriodoCent / 12) : valorPeriodoCent);

/** "2026-11" a partir de uma data AAAA-MM-DD. */
export const referenciaDe = data => String(data).slice(0, 7);
export const referenciaValida = r => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(r));
export const dataValida = s => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T12:00:00Z`)) && new Date(`${s}T12:00:00Z`).toISOString().slice(0, 10) === s;

/** O vencimento no mês da referência, no dia combinado (nunca passa de 28, para existir em todo mês). */
export const vencimentoDoMes = (referencia, dia) => `${referencia}-${String(Math.min(Math.max(parseInt(dia, 10) || 10, 1), 28)).padStart(2, "0")}`;

/** Quantos meses seguidos a cobrança cobre: 1 no mensal, 12 no anual. */
export const mesesCobertos = ciclo => (ciclo === "anual" ? 12 : 1);

/** A cobrança (que não foi cancelada) cobre o mês `mes` (AAAA-MM)? */
export function cobrancaCobreMes(c, mes) {
  if (c.status === "cancelada") return false;
  const inicio = `${String(c.referencia).slice(0, 7)}-01`; // a referência de uma fatura adicional do gateway tem sufixo ("2026-11#abc12345")
  const alvo = `${mes}-01`;
  return alvo >= inicio && alvo < somarMeses(inicio, mesesCobertos(c.ciclo));
}

export const descricaoDaCobranca = (planoNome, ciclo, referencia) => {
  const [a, m] = referencia.split("-");
  return `Assinatura ConstruktPro ${planoNome} · ${ciclo === "anual" ? `anual a partir de ${m}/${a}` : `${m}/${a}`}`;
};

/**
 * Indicadores da receita recorrente. Só entra o que está configurado: uma empresa ativa sem assinatura
 * (ou em cortesia) não conta como receita, e aparece à parte em `semAssinatura`.
 *   assinaturas: [{ tenantId, valorCent, ciclo, cortesia, status, plano, ativadaEm, canceladaEm }]  (status = o da empresa)
 *   cobrancas:   [{ status, vencimento, valorCent, valorPagoCent, pagaEm, tenantId }]
 */
export function calcularIndicadores({ assinaturas, cobrancas, hoje }) {
  const mes = referenciaDe(hoje);
  const pagantes = assinaturas.filter(a => !a.cortesia && ["ativo", "inadimplente"].includes(a.status));
  const mrrCent = pagantes.reduce((s, a) => s + valorMensalCent(a.valorCent, a.ciclo), 0);

  const porPlano = {};
  for (const a of pagantes) {
    const x = (porPlano[a.plano] ??= { plano: a.plano, empresas: 0, mrrCent: 0 });
    x.empresas += 1; x.mrrCent += valorMensalCent(a.valorCent, a.ciclo);
  }

  const atrasadas = cobrancas.filter(c => situacaoCobranca(c, hoje) === "atrasada");
  const doMes = c => String(c.vencimento).startsWith(mes);
  const noMes = d => d && String(d).slice(0, 7) === mes;
  const recebido = c => c.status === "paga" && c.pagaEm;

  // Recebido nos últimos 6 meses (para o gráfico), do mais antigo ao atual
  const meses = Array.from({ length: 6 }, (_, i) => referenciaDe(somarMeses(`${mes}-01`, i - 5)));
  const serie = meses.map(m => ({ mes: m, valorCent: cobrancas.filter(c => recebido(c) && String(c.pagaEm).slice(0, 7) === m).reduce((s, c) => s + (c.valorPagoCent ?? c.valorCent), 0) }));

  return {
    mes,
    mrrCent, arrCent: mrrCent * 12, pagantes: pagantes.length,
    ticketMedioCent: pagantes.length ? Math.round(mrrCent / pagantes.length) : 0,
    porPlano: Object.values(porPlano).sort((a, b) => b.mrrCent - a.mrrCent),
    emAtraso: { valorCent: atrasadas.reduce((s, c) => s + c.valorCent, 0), cobrancas: atrasadas.length, empresas: new Set(atrasadas.map(c => c.tenantId)).size },
    recebidoNoMesCent: cobrancas.filter(c => recebido(c) && noMes(c.pagaEm)).reduce((s, c) => s + (c.valorPagoCent ?? c.valorCent), 0),
    aReceberNoMesCent: cobrancas.filter(c => c.status === "aberta" && doMes(c) && c.vencimento >= hoje).reduce((s, c) => s + c.valorCent, 0),
    novosNoMes: assinaturas.filter(a => !a.cortesia && noMes(a.ativadaEm)).length,
    cancelamentosNoMes: assinaturas.filter(a => !a.cortesia && noMes(a.canceladaEm)).length,
    serie,
  };
}
