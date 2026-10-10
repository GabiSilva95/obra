// Telefone brasileiro: guardado só com dígitos e o 55 do país (5511999990000), exibido como (11) 99999-0000.
// Arquivo puro: o servidor valida e o cadastro (front) usa a mesma regra para a máscara.

const soDigitos = v => String(v ?? "").replace(/\D/g, "");

/**
 * Devolve "55DDNNNNNNNNN" ou null se não for um telefone brasileiro plausível.
 * Celular: DDD + 9 dígitos começando em 9. Fixo: DDD + 8 dígitos começando em 2 a 5.
 * Recusa números de um dígito repetido (11111111111), que só servem para passar pelo formulário.
 */
export function normalizarTelefoneBR(valor) {
  let d = soDigitos(valor);
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2);
  if (d.length !== 10 && d.length !== 11) return null;
  const ddd = d.slice(0, 2), numero = d.slice(2);
  if (!/^[1-9][1-9]$/.test(ddd)) return null;
  if (numero.length === 9 ? numero[0] !== "9" : !/^[2-5]/.test(numero)) return null;
  if (/^(\d)\1+$/.test(numero)) return null;
  return `55${ddd}${numero}`;
}

/** "(11) 99999-0000" a partir de qualquer entrada que tenha dígitos; vazio se não houver nenhum. */
export function formatarTelefoneBR(valor) {
  let d = soDigitos(valor);
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2);
  d = d.slice(0, 11);
  if (!d) return "";
  const ddd = d.slice(0, 2), resto = d.slice(2);
  if (d.length <= 2) return `(${ddd}`;
  const corte = resto.length > 8 ? 5 : 4;
  return `(${ddd}) ${resto.slice(0, corte)}${resto.length > corte ? `-${resto.slice(corte)}` : ""}`;
}
