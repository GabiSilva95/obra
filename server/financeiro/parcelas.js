import { dividirIgual } from "./dinheiro.js";
import { somarDias, somarMeses } from "../utils/datas.js";

export const MAX_PARCELAS = 120;

/**
 * Gera as parcelas de um título.
 *
 * - modo "dividir": `valorCent` é o total do documento, repartido em `parcelas` partes.
 * - modo "repetir": `valorCent` é o valor de CADA parcela (conta fixa: aluguel, contador…).
 * - intervalo: { tipo: "mensal" } mantém o dia do mês (31/01 → 28/02 → 31/03);
 *              { tipo: "dias", dias: 15 } soma dias corridos.
 * Todos os vencimentos partem do primeiro, para o dia não "escorregar" ao passar por fevereiro.
 */
export function gerarParcelas({ valorCent, primeiroVencimento, parcelas = 1, intervalo = { tipo: "mensal" }, modo = "dividir" }) {
  if (!Number.isInteger(valorCent) || valorCent <= 0) throw new Error("O valor deve ser maior que zero.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(primeiroVencimento || "")) throw new Error("Informe o primeiro vencimento.");
  if (!Number.isInteger(parcelas) || parcelas < 1 || parcelas > MAX_PARCELAS) throw new Error(`O número de parcelas deve ficar entre 1 e ${MAX_PARCELAS}.`);
  if (intervalo.tipo === "dias" && !(intervalo.dias >= 1)) throw new Error("O intervalo em dias deve ser de pelo menos 1.");

  const valores = modo === "repetir" ? Array(parcelas).fill(valorCent) : dividirIgual(valorCent, parcelas);
  return valores.map((v, i) => ({
    parcela: i + 1,
    totalParcelas: parcelas,
    valorCent: v,
    vencimento: intervalo.tipo === "dias" ? somarDias(primeiroVencimento, i * intervalo.dias) : somarMeses(primeiroVencimento, i),
  }));
}

/** Parcelas que já vêm prontas (duplicatas da NF-e): ordenadas por vencimento e numeradas. */
export function parcelasDeDuplicatas(duplicatas) {
  const ord = [...duplicatas].sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  return ord.map((d, i) => ({ parcela: i + 1, totalParcelas: ord.length, valorCent: d.valorCent, vencimento: d.vencimento, documento: d.numero }));
}
