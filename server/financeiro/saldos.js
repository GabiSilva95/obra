import { emCentavos } from "./dinheiro.js";

/**
 * Saldo de cada conta do tenant, em centavos: saldo inicial + recebimentos - pagamentos (com juros,
 * multa e desconto) + transferências, contando só movimentos a partir da data do saldo inicial.
 * `ate` (AAAA-MM-DD, opcional) calcula o saldo naquele dia, para o fechamento da conciliação.
 */
export async function saldosDasContas(db, tenantId, { ate = null } = {}) {
  const limite = ate || "9999-12-31";
  const linhas = await db.$queryRaw`
    SELECT c.id,
      c."saldoInicial"
      + COALESCE((SELECT SUM(CASE WHEN t.tipo = 'receber' THEN 1 ELSE -1 END * (b.valor + b.juros + b.multa - b.desconto))
                  FROM "Baixa" b JOIN "Titulo" t ON t.id = b."tituloId"
                  WHERE b."contaId" = c.id AND b."estornadaEm" IS NULL AND b.data >= c."dataSaldoInicial" AND b.data <= ${limite}), 0)
      + COALESCE((SELECT SUM(x.valor) FROM "TransferenciaConta" x WHERE x."paraContaId" = c.id AND x.data >= c."dataSaldoInicial" AND x.data <= ${limite}), 0)
      - COALESCE((SELECT SUM(x.valor) FROM "TransferenciaConta" x WHERE x."deContaId" = c.id AND x.data >= c."dataSaldoInicial" AND x.data <= ${limite}), 0)
      AS saldo
    FROM "ContaFinanceira" c WHERE c."tenantId" = ${tenantId}`;
  return new Map(linhas.map(l => [l.id, emCentavos(l.saldo)]));
}
