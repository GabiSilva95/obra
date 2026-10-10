import { CATEGORIAS_DESPESA } from "../routes/despesas.js";

export const CATEGORIAS_RECEITA = ["Contrato", "Medição", "Adiantamento", "Retenção liberada", "Outro"];
export const CENTROS_PADRAO = ["Administrativo", "Frota e equipamentos", "Comercial"];

/**
 * Cria categorias, centros de custo e configuração na primeira vez que a empresa abre o Financeiro.
 * A existência da linha de configuração é a marca de que isso já foi feito: quem apagar uma categoria
 * de propósito não a vê voltar.
 */
/** Categorias usadas pelos lançamentos automáticos (compra, diárias, locação): sempre existem. */
const CATEGORIAS_DO_SISTEMA = ["Materiais", "Mão de obra", "Locação de equipamentos"];

export async function garantirPadroes(db, tenantId) {
  await db.categoriaFinanceira.createMany({ data: CATEGORIAS_DO_SISTEMA.map(nome => ({ tenantId, tipo: "pagar", nome })), skipDuplicates: true });
  if (await db.configFinanceira.findUnique({ where: { tenantId } })) return;
  await db.configFinanceira.createMany({ data: [{ tenantId }], skipDuplicates: true });
  await db.categoriaFinanceira.createMany({
    data: [
      ...CATEGORIAS_DESPESA.map(nome => ({ tenantId, tipo: "pagar", nome })),
      ...CATEGORIAS_RECEITA.map(nome => ({ tenantId, tipo: "receber", nome })),
    ],
    skipDuplicates: true,
  });
  await db.centroCusto.createMany({ data: CENTROS_PADRAO.map(nome => ({ tenantId, nome })), skipDuplicates: true });
}
