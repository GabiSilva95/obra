import { emCentavos, emReais } from "./dinheiro.js";
import { saldoCent, vencido } from "./status.js";
import { diasEntre } from "../utils/datas.js";

const ROTULO_ORIGEM = { despesa: "Despesa", receita: "Receita", compra: "Compra", mao_de_obra: "Diárias", locacao: "Locação", avulso: "Avulso" };

export const serializarBaixa = b => ({
  id: b.id, tituloId: b.tituloId, contaId: b.contaId, data: b.data, forma: b.forma, obs: b.obs,
  valor: Number(b.valor), juros: Number(b.juros), multa: Number(b.multa), desconto: Number(b.desconto),
  movimento: emReais(emCentavos(b.valor) + emCentavos(b.juros) + emCentavos(b.multa) - emCentavos(b.desconto)),
  estornadaEm: b.estornadaEm, lancamentoId: b.lancamentoId,
});

/** `ordens`: Map id → número da ordem de compra, para o rótulo "Compra #7". */
export function serializarTitulo(t, hoje, ordens = new Map()) {
  const baixas = (t.baixas || []).map(serializarBaixa);
  const valorCent = emCentavos(t.valor);
  const saldo = saldoCent(valorCent, baixas.map(b => ({ valorCent: emCentavos(b.valor), estornada: !!b.estornadaEm })));
  const venc = vencido({ status: t.status, vencimento: t.vencimento }, hoje);
  const rotuloOrigem = t.origemTipo === "compra" && t.origemId
    ? `Compra #${ordens.get(t.origemId) ?? t.origemId}`
    : (ROTULO_ORIGEM[t.origemTipo] || t.origemTipo);
  return {
    id: t.id, tipo: t.tipo, pessoaId: t.pessoaId, pessoa: t.pessoa ? { id: t.pessoa.id, nome: t.pessoa.nome } : null,
    descricao: t.descricao, documento: t.documento, categoria: t.categoria,
    valor: emReais(valorCent), saldo: emReais(saldo), pago: emReais(valorCent - saldo),
    emissao: t.emissao, vencimento: t.vencimento, parcela: t.parcela, totalParcelas: t.totalParcelas,
    grupoId: t.grupoId, recorrente: t.recorrente, pessoaTexto: t.pessoaTexto, status: t.status, vencido: venc, diasAtraso: venc ? diasEntre(t.vencimento, hoje) : 0,
    origemTipo: t.origemTipo, origemId: t.origemId, origem: rotuloOrigem, obs: t.obs,
    rateios: (t.rateios || []).map(r => ({ id: r.id, obraId: r.obraId, etapaId: r.etapaId, centroCustoId: r.centroCustoId, valor: Number(r.valor) })),
    baixas,
  };
}

export const serializarConta = (c, saldoAtual) => ({
  id: c.id, nome: c.nome, tipo: c.tipo, banco: c.banco, agencia: c.agencia, numero: c.numero,
  saldoInicial: Number(c.saldoInicial), dataSaldoInicial: c.dataSaldoInicial, ativa: c.ativa,
  saldo: saldoAtual != null ? emReais(saldoAtual) : undefined,
});
