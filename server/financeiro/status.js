/** Regras de saldo e status do título. `baixas` = [{ valorCent, estornada }]. */

export const saldoCent = (valorCent, baixas = []) =>
  valorCent - baixas.filter(b => !b.estornada).reduce((s, b) => s + b.valorCent, 0);

/** Status persistido. "vencido" não existe aqui: é derivado pela data (ver `vencido`). */
export function calcularStatus({ valorCent, baixas = [], cancelado = false }) {
  if (cancelado) return "cancelado";
  const saldo = saldoCent(valorCent, baixas);
  if (saldo <= 0) return "quitado";
  return saldo < valorCent ? "parcial" : "aberto";
}

export const vencido = (titulo, hoje) =>
  (titulo.status === "aberto" || titulo.status === "parcial") && titulo.vencimento < hoje;

/** Dinheiro que realmente se move numa baixa: principal + juros + multa - desconto. */
export const movimentoCent = b => b.valorCent + (b.jurosCent || 0) + (b.multaCent || 0) - (b.descontoCent || 0);
