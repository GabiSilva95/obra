// Ligação entre Compras e o Financeiro: a compra entregue vira conta a pagar.
import { hojeBR, somarDias } from "../utils/datas.js";
import { emCentavos } from "./dinheiro.js";
import { gerarParcelas, parcelasDeDuplicatas } from "./parcelas.js";
import { criarDocumento, TX } from "./servico.js";
import { dataValida } from "./erro.js";
import { distribuirRateio } from "./rateio.js";

export { TX };

/** Total da ordem em centavos (itens da ordem; `ordem.itens` já vem normalizado, inclusive OCs antigas). */
export const totalCentOrdem = ordem =>
  (ordem.itens || []).reduce((s, i) => s + emCentavos((Number(i.quantidade) || 0) * (Number(i.valorUnit) || 0)), 0);

/** Dados da nota vindos do cliente: só passa o que é válido. */
export function sanearNf(nf) {
  if (!nf || typeof nf !== "object") return null;
  const total = Number(nf.total) > 0 ? Number(nf.total) : null;
  const duplicatas = (Array.isArray(nf.duplicatas) ? nf.duplicatas : [])
    .map(d => ({ numero: String(d.numero ?? "").slice(0, 30), vencimento: d.vencimento, valor: Number(d.valor) }))
    .filter(d => dataValida(d.vencimento) && d.valor > 0);
  return { nfe: nf.nfe ? String(nf.nfe).slice(0, 40) : null, data: dataValida(nf.data) ? nf.data : null, total, duplicatas };
}

const nomeOrdem = ordem => `Compra #${ordem.numero ?? ordem.id}${ordem.fornecedorPessoa?.nome || ordem.fornecedor ? ` · ${ordem.fornecedorPessoa?.nome || ordem.fornecedor}` : ""}`;

/**
 * Gera a conta a pagar de uma compra entregue. Idempotente: se já existe título desta ordem
 * (até cancelado, para não ressuscitar o que o financeiro cancelou de propósito), não faz nada.
 *
 * Valor: duplicatas da NF-e quando houver; senão o total da nota; senão o total dos itens.
 * Vencimento (sem duplicatas): o informado, ou hoje + prazo padrão da empresa.
 * `pago`: { contaId, data, forma } lança a baixa na hora (compra que já foi paga).
 */
export async function gerarTituloDaCompra(tx, { tenantId, ordem, nf = null, vencimento = null, pago = null }) {
  if (await tx.titulo.count({ where: { tenantId, origemTipo: "compra", origemId: ordem.id } })) return null;

  const dups = (nf?.duplicatas || []).map(d => ({ numero: d.numero, vencimento: d.vencimento, valorCent: emCentavos(d.valor) }));
  let parcelas;
  if (dups.length) {
    parcelas = parcelasDeDuplicatas(dups);
  } else {
    const valorCent = nf?.total ? emCentavos(nf.total) : totalCentOrdem(ordem);
    if (!(valorCent > 0)) return null;
    const cfg = await tx.configFinanceira.findUnique({ where: { tenantId } });
    const primeiro = pago?.data || vencimento || somarDias(hojeBR(), cfg?.prazoPadraoDias ?? 30);
    parcelas = gerarParcelas({ valorCent, primeiroVencimento: primeiro });
  }
  const total = parcelas.reduce((s, p) => s + p.valorCent, 0);
  return criarDocumento(tx, {
    tenantId, tipo: "pagar", origemTipo: "compra", origemId: ordem.id,
    pessoaId: ordem.fornecedorId ?? null, pessoaTexto: ordem.fornecedorId ? null : (ordem.fornecedor || null),
    descricao: nomeOrdem(ordem), documento: nf?.nfe ?? null, categoria: "Materiais", emissao: nf?.data || hojeBR(),
    parcelas, rateio: [{ obraId: ordem.obraId, etapaId: ordem.etapaId ?? null, centroCustoId: null, valorCent: total }],
    baixaImediata: pago ? { contaId: pago.contaId, data: pago.data, forma: pago.forma || "pix" } : null,
  });
}

/**
 * A ordem mudou depois de entregue. Se o título ainda é uma parcela única, sem pagamento e sem
 * cancelamento, acompanha o novo total e a nova obra/etapa. Em qualquer outro caso (parcelas da
 * NF-e, pagamento lançado) não mexe: a diferença aparece como "diverge" na lista.
 */
export async function sincronizarTitulosDaCompra(tx, { tenantId, ordem }) {
  const titulos = await tx.titulo.findMany({ where: { tenantId, origemTipo: "compra", origemId: ordem.id }, include: { baixas: true } });
  if (titulos.length !== 1) return;
  const [t] = titulos;
  if (t.status !== "aberto" || t.baixas.some(b => !b.estornadaEm)) return;
  const valorCent = totalCentOrdem(ordem);
  if (!(valorCent > 0)) return;
  await tx.tituloRateio.deleteMany({ where: { tituloId: t.id } });
  await tx.titulo.update({ where: { id: t.id }, data: { valor: (valorCent / 100).toFixed(2), descricao: nomeOrdem(ordem) } });
  const [linhas] = distribuirRateio([{ obraId: ordem.obraId, etapaId: ordem.etapaId ?? null, centroCustoId: null, valorCent }], [valorCent]);
  await tx.tituloRateio.createMany({ data: linhas.map(l => ({ tenantId, tituloId: t.id, obraId: l.obraId, etapaId: l.etapaId, centroCustoId: null, valor: (l.valorCent / 100).toFixed(2) })) });
}

/** Ordem cancelada: cancela os títulos sem pagamento. */
export async function cancelarTitulosDaCompra(tx, { tenantId, ordemId }) {
  const titulos = await tx.titulo.findMany({ where: { tenantId, origemTipo: "compra", origemId: ordemId, status: "aberto" }, include: { baixas: true } });
  const livres = titulos.filter(t => !t.baixas.some(b => !b.estornadaEm)).map(t => t.id);
  if (livres.length) await tx.titulo.updateMany({ where: { id: { in: livres } }, data: { status: "cancelado" } });
}

/** Ordem excluída: remove os títulos; com pagamento ativo, devolve o motivo para recusar a exclusão. */
export async function excluirTitulosDaCompra(tx, { tenantId, ordemId }) {
  const titulos = await tx.titulo.findMany({ where: { tenantId, origemTipo: "compra", origemId: ordemId }, include: { baixas: true } });
  if (titulos.some(t => t.baixas.some(b => !b.estornadaEm))) return "Esta compra tem pagamentos lançados no Financeiro: estorne antes de excluir.";
  await tx.titulo.deleteMany({ where: { tenantId, origemTipo: "compra", origemId: ordemId } });
  return null;
}
