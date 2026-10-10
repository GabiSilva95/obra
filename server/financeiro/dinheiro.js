// Dinheiro em centavos inteiros: nenhuma conta de parcela, rateio ou saldo usa ponto flutuante.
// Valores entram e saem da API como número em reais; o banco guarda Decimal(14,2).

/** Reais (número, string ou Decimal do Prisma) → centavos inteiros. */
export const emCentavos = v => Math.round(Number(v) * 100);

/** Centavos inteiros → reais (número com 2 casas). */
export const emReais = c => c / 100;

/**
 * Divide `totalCent` em partes proporcionais aos `pesos`, sem perder nem criar centavo.
 * Método do maior resto: cada parte recebe o piso da sua cota e os centavos que sobram vão
 * para as maiores frações (empate: a parte que vem antes). Com pesos iguais, é a divisão em
 * partes iguais com os centavos extras nas primeiras partes.
 * Usa BigInt para que total x peso nunca estoure a precisão de um número.
 */
export function ratearProporcional(totalCent, pesos) {
  if (!Array.isArray(pesos) || !pesos.length) throw new Error("Informe ao menos uma parte.");
  const total = BigInt(Math.round(totalCent));
  // Pesos podem ser fracionários (meia diária): escala para inteiro
  const p = pesos.map(x => BigInt(Math.round(Number(x) * 1000)));
  if (p.some(x => x < 0n)) throw new Error("Pesos não podem ser negativos.");
  const soma = p.reduce((a, b) => a + b, 0n);
  if (soma === 0n) throw new Error("A soma dos pesos deve ser maior que zero.");

  const partes = p.map(x => ({ base: (total * x) / soma, resto: (total * x) % soma }));
  let sobra = total - partes.reduce((a, x) => a + x.base, 0n);
  const ordem = partes.map((x, i) => ({ i, resto: x.resto })).sort((a, b) => (a.resto === b.resto ? a.i - b.i : a.resto > b.resto ? -1 : 1));
  for (const { i } of ordem) { if (sobra <= 0n) break; partes[i].base += 1n; sobra -= 1n; }
  return partes.map(x => Number(x.base));
}

/** `n` partes iguais de `totalCent` (centavos extras nas primeiras partes). */
export const dividirIgual = (totalCent, n) => ratearProporcional(totalCent, Array(n).fill(1));

/** Converte percentuais (soma 100) em centavos, sem perder centavo. */
export function porPercentuais(totalCent, percentuais) {
  const soma = percentuais.reduce((a, b) => a + Number(b), 0);
  if (Math.abs(soma - 100) > 0.0001) throw new Error(`Os percentuais somam ${soma.toFixed(2)}%, e devem somar 100%.`);
  return ratearProporcional(totalCent, percentuais);
}
