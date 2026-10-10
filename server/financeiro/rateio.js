import { ratearProporcional } from "./dinheiro.js";

/**
 * Linha de rateio: { obraId?, etapaId?, centroCustoId?, valorCent }.
 * Regras: obra OU centro de custo (pelo menos um); etapa só com obra; valor positivo;
 * a soma das linhas é exatamente o valor do documento.
 */
export function validarRateio(linhas, totalCent) {
  if (!Array.isArray(linhas) || !linhas.length) return "Informe ao menos uma linha de rateio.";
  let soma = 0;
  for (const [i, l] of linhas.entries()) {
    const n = i + 1;
    if (!l.obraId && !l.centroCustoId) return `Rateio, linha ${n}: escolha uma obra ou um centro de custo.`;
    if (l.etapaId && !l.obraId) return `Rateio, linha ${n}: a etapa exige uma obra.`;
    if (!Number.isInteger(l.valorCent) || l.valorCent <= 0) return `Rateio, linha ${n}: o valor deve ser maior que zero.`;
    soma += l.valorCent;
  }
  if (soma !== totalCent) {
    const dif = (totalCent - soma) / 100;
    return dif > 0
      ? `Falta ratear R$ ${dif.toFixed(2).replace(".", ",")}.`
      : `O rateio passa R$ ${Math.abs(dif).toFixed(2).replace(".", ",")} do valor.`;
  }
  return null;
}

/**
 * Distribui as linhas de rateio de um documento entre as suas parcelas fechando os DOIS lados:
 * cada parcela soma exatamente o seu valor e cada linha soma exatamente o que foi digitado.
 * (Escalar cada parcela isoladamente fecha só a parcela e deixa a linha 1 centavo fora.)
 *
 * Linha a linha, reparte o valor da linha proporcionalmente à capacidade que ainda resta em cada
 * parcela; a última linha recebe o que sobrou de cada parcela, o que fecha as somas.
 * Pré-condição: soma das linhas = soma das parcelas.
 * Devolve, para cada parcela, a lista de linhas com `valorCent` (linhas zeradas saem).
 */
export function distribuirRateio(linhas, parcelasCent) {
  const total = parcelasCent.reduce((a, b) => a + b, 0);
  if (linhas.reduce((a, l) => a + l.valorCent, 0) !== total) throw new Error("O rateio não fecha com as parcelas.");
  const capacidade = [...parcelasCent];
  const saida = parcelasCent.map(() => []);
  linhas.forEach((linha, j) => {
    const partes = j === linhas.length - 1 ? [...capacidade] : ratearProporcional(linha.valorCent, capacidade);
    partes.forEach((v, i) => {
      capacidade[i] -= v;
      if (v > 0) saida[i].push({ ...linha, valorCent: v });
    });
  });
  return saida;
}

/**
 * Reproduz o rateio do documento numa parcela de valor `parcelaCent`, mantendo as proporções
 * e fechando o centavo (método do maior resto).
 */
export function escalarRateio(linhas, parcelaCent) {
  const valores = ratearProporcional(parcelaCent, linhas.map(l => l.valorCent));
  return linhas.map((l, i) => ({ ...l, valorCent: valores[i] })).filter(l => l.valorCent > 0);
}

/**
 * Rateio proporcional a pesos (ex.: diárias por obra): cada chave recebe a sua fatia do total.
 * `partes`: [{ obraId?, etapaId?, centroCustoId?, peso }]
 */
export function ratearPorPesos(totalCent, partes) {
  const valores = ratearProporcional(totalCent, partes.map(p => p.peso));
  return partes.map(({ peso: _peso, ...resto }, i) => ({ ...resto, valorCent: valores[i] })).filter(l => l.valorCent > 0);
}
