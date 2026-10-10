// Regras do financeiro que mexem no banco. Toda função recebe `tx` (cliente de transação do Prisma)
// e é chamada dentro de `prisma.$transaction`, para que título, rateio, baixa e linhas de custo
// nunca fiquem pela metade.
import { randomUUID } from "node:crypto";
import { hojeBR } from "../utils/datas.js";
import { emCentavos } from "./dinheiro.js";
import { gerarParcelas } from "./parcelas.js";
import { validarRateio, distribuirRateio } from "./rateio.js";
import { calcularStatus, saldoCent } from "./status.js";
import { ErroNegocio, dataValida } from "./erro.js";

/** Transação com folga: um documento de 120 parcelas faz muitas escritas. */
export const TX = { timeout: 30000, maxWait: 10000 };

const dec = c => (c / 100).toFixed(2);
const brl = c => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const TIPOS_COM_CUSTO = ["despesa", "receita"];

// ─── Entrada ─────────────────────────────────────────────────────────────────

/** Linhas de rateio vindas da API (valor em reais) → centavos. */
export const lerRateio = (linhas = []) => linhas.map(l => ({
  obraId: l.obraId ? parseInt(l.obraId) : null,
  etapaId: l.etapaId ? parseInt(l.etapaId) : null,
  centroCustoId: l.centroCustoId ? parseInt(l.centroCustoId) : null,
  valorCent: emCentavos(l.valor),
}));

/** Confere que obra, etapa, centro, pessoa e conta existem NESTE tenant (e que a etapa é da obra). */
export async function validarVinculos(db, tenantId, { linhas = [], pessoaId, contaId }) {
  const ids = campo => [...new Set(linhas.map(l => l[campo]).filter(Boolean))];
  const obras = ids("obraId");
  if (obras.length && (await db.obra.count({ where: { id: { in: obras }, tenantId } })) !== obras.length)
    throw new ErroNegocio("Obra não encontrada.", 404);
  const etapas = ids("etapaId");
  if (etapas.length) {
    const achadas = await db.etapaObra.findMany({ where: { id: { in: etapas }, tenantId }, select: { id: true, obraId: true } });
    for (const l of linhas.filter(x => x.etapaId)) {
      const e = achadas.find(x => x.id === l.etapaId);
      if (!e || e.obraId !== l.obraId) throw new ErroNegocio("A etapa não pertence à obra escolhida.");
    }
  }
  const centros = ids("centroCustoId");
  if (centros.length && (await db.centroCusto.count({ where: { id: { in: centros }, tenantId } })) !== centros.length)
    throw new ErroNegocio("Centro de custo não encontrado.", 404);
  if (pessoaId && !(await db.funcionario.findFirst({ where: { id: pessoaId, tenantId }, select: { id: true } })))
    throw new ErroNegocio("Pessoa não encontrada.", 404);
  if (contaId) {
    const c = await db.contaFinanceira.findFirst({ where: { id: contaId, tenantId } });
    if (!c) throw new ErroNegocio("Conta não encontrada.", 404);
    if (!c.ativa) throw new ErroNegocio("A conta está inativa.");
  }
}

/**
 * Parcelas a partir do bloco "Pagamento" do formulário.
 * modo: "avista" (já pago) | "prazo" | "parcelado" | "repetir" | "manual" (parcelas prontas, ex.: NF-e)
 */
export function montarParcelas({ valorCent, pagamento = {}, hoje = hojeBR() }) {
  const modo = pagamento.modo || "prazo";
  if (modo === "manual") {
    const ps = pagamento.parcelas || [];
    if (!ps.length) throw new ErroNegocio("Informe ao menos uma parcela.");
    return { parcelas: ps, recorrente: false, baixaImediata: null };
  }
  if (modo === "avista") {
    const data = pagamento.dataPagamento || hoje;
    if (!dataValida(data)) throw new ErroNegocio("Data do pagamento inválida.");
    if (!pagamento.contaId) throw new ErroNegocio("Escolha a conta de onde saiu ou entrou o dinheiro.");
    return {
      parcelas: gerarParcelas({ valorCent, primeiroVencimento: data }),
      recorrente: false,
      baixaImediata: { contaId: parseInt(pagamento.contaId), data, forma: pagamento.forma || "pix" },
    };
  }
  const venc = pagamento.vencimento;
  if (!dataValida(venc)) throw new ErroNegocio("Informe o vencimento.");
  const n = modo === "prazo" ? 1 : parseInt(pagamento.parcelas) || 1;
  const intervalo = pagamento.intervalo?.tipo === "dias" ? { tipo: "dias", dias: parseInt(pagamento.intervalo.dias) } : { tipo: "mensal" };
  try {
    return {
      parcelas: gerarParcelas({ valorCent, primeiroVencimento: venc, parcelas: n, intervalo, modo: modo === "repetir" ? "repetir" : "dividir" }),
      recorrente: modo === "repetir",
      baixaImediata: null,
    };
  } catch (e) { throw new ErroNegocio(e.message); }
}

// ─── Criação ─────────────────────────────────────────────────────────────────

/** Valor que o rateio precisa fechar: o total do documento, ou o de UMA parcela se for conta fixa repetida. */
const baseDoRateio = (parcelas, recorrente) => recorrente ? parcelas[0].valorCent : parcelas.reduce((s, p) => s + p.valorCent, 0);

/**
 * Cria um documento: as parcelas (títulos), o rateio de cada uma e, para despesa e receita,
 * as linhas de custo/faturamento da obra. `baixaImediata` quita na hora (pagamento à vista).
 */
export async function criarDocumento(tx, d) {
  const { tenantId, tipo, origemTipo = "avulso", origemId = null, parcelas, rateio, recorrente = false } = d;
  // Lançamento avulso (empréstimo, aporte, retirada) pode ficar sem classificação; os demais precisam de rateio
  if (origemTipo !== "avulso" || rateio.length) {
    const erro = validarRateio(rateio, baseDoRateio(parcelas, recorrente));
    if (erro) throw new ErroNegocio(erro);
  }

  const grupoId = d.grupoId || randomUUID();
  const criados = await tx.titulo.createManyAndReturn({
    data: parcelas.map(p => ({
      tenantId, tipo, grupoId, origemTipo, origemId, recorrente,
      pessoaId: d.pessoaId || null, pessoaTexto: d.pessoaId ? null : (d.pessoaTexto || null),
      descricao: d.descricao, documento: p.documento ?? d.documento ?? null, categoria: d.categoria || null, obs: d.obs || null,
      valor: dec(p.valorCent), emissao: d.emissao, vencimento: p.vencimento, parcela: p.parcela, totalParcelas: p.totalParcelas,
      status: "aberto",
    })),
  });
  const porParcela = new Map(parcelas.map(p => [p.parcela, p]));
  // Conta fixa: o rateio vale para cada parcela. Demais: reparte fechando parcela e linha ao centavo.
  const linhasPorParcela = recorrente || !rateio.length ? parcelas.map(() => rateio) : distribuirRateio(rateio, parcelas.map(p => p.valorCent));
  const indice = new Map(parcelas.map((p, i) => [p.parcela, i]));
  await tx.tituloRateio.createMany({
    data: criados.flatMap(t => linhasPorParcela[indice.get(t.parcela)].map(l => ({
      tenantId, tituloId: t.id, obraId: l.obraId, etapaId: l.etapaId, centroCustoId: l.centroCustoId, valor: dec(l.valorCent),
    }))),
  });

  if (d.baixaImediata) {
    for (const t of criados) {
      await baixarTitulo(tx, { tenantId, tituloId: t.id, valorCent: porParcela.get(t.parcela).valorCent, ...d.baixaImediata });
    }
  }
  if (TIPOS_COM_CUSTO.includes(origemTipo)) await sincronizarCompetencia(tx, tenantId, grupoId);
  return { grupoId, titulos: criados };
}

// ─── Competência (custo e faturamento da obra) ───────────────────────────────

/**
 * Recria as linhas de Despesa/Receita do documento a partir dos títulos e do rateio.
 * É o que mantém `calcCustoObra` e os relatórios certos sem eles saberem de rateio:
 * cada linha de rateio vira uma linha de despesa (ou receita) com sua obra, etapa e centro.
 * Conta fixa repetida gera uma linha por parcela, datada no vencimento; os demais, uma por
 * linha de rateio, na data do documento.
 */
export async function sincronizarCompetencia(tx, tenantId, grupoId) {
  const titulos = await tx.titulo.findMany({
    where: { tenantId, grupoId }, include: { rateios: true, pessoa: { select: { nome: true } } }, orderBy: { parcela: "asc" },
  });
  const ref = titulos[0];
  await tx.despesa.deleteMany({ where: { tenantId, grupoId } });
  await tx.receita.deleteMany({ where: { tenantId, grupoId } });
  if (!ref || !TIPOS_COM_CUSTO.includes(ref.origemTipo) || titulos.every(t => t.status === "cancelado")) return;

  const baldes = ref.recorrente
    ? titulos.map(t => ({ data: t.vencimento, rateios: t.rateios }))
    : [{ data: ref.emissao, rateios: titulos.flatMap(t => t.rateios) }];

  const linhas = [];
  for (const b of baldes) {
    const soma = new Map();
    for (const r of b.rateios) {
      const k = `${r.obraId ?? ""}|${r.etapaId ?? ""}|${r.centroCustoId ?? ""}`;
      const atual = soma.get(k) || { obraId: r.obraId, etapaId: r.etapaId, centroCustoId: r.centroCustoId, cent: 0 };
      atual.cent += emCentavos(r.valor);
      soma.set(k, atual);
    }
    for (const l of soma.values()) linhas.push({ ...l, data: b.data });
  }

  if (ref.origemTipo === "despesa") {
    await tx.despesa.createMany({
      data: linhas.map(l => ({
        tenantId, grupoId, obraId: l.obraId, etapaId: l.etapaId, centroCustoId: l.centroCustoId,
        categoria: ref.categoria || "Outros", descricao: ref.descricao, valor: l.cent / 100, data: l.data,
        fornecedor: ref.pessoa?.nome || ref.pessoaTexto || null, obs: ref.obs || null,
      })),
    });
  } else {
    await tx.receita.createMany({
      data: linhas.map(l => ({
        tenantId, grupoId, obraId: l.obraId, centroCustoId: l.centroCustoId,
        descricao: ref.descricao, valor: l.cent / 100, data: l.data, tipo: ref.categoria || "Contrato",
      })),
    });
  }
}

// ─── Baixa, estorno, cancelamento ────────────────────────────────────────────

/** Trava a linha do título até o fim da transação: duas baixas simultâneas não pagam o mesmo saldo duas vezes. */
const travar = (tx, tenantId, tituloId) =>
  tx.$queryRaw`SELECT id FROM "Titulo" WHERE id = ${tituloId} AND "tenantId" = ${tenantId} FOR UPDATE`;

const baixasParaCalculo = baixas => baixas.map(b => ({ valorCent: emCentavos(b.valor), estornada: !!b.estornadaEm }));

async function recalcularStatus(tx, tituloId) {
  const t = await tx.titulo.findUnique({ where: { id: tituloId }, include: { baixas: true } });
  const status = calcularStatus({ valorCent: emCentavos(t.valor), baixas: baixasParaCalculo(t.baixas), cancelado: t.status === "cancelado" });
  if (status !== t.status) await tx.titulo.update({ where: { id: tituloId }, data: { status } });
  return status;
}

export async function baixarTitulo(tx, { tenantId, tituloId, contaId, data, valorCent, jurosCent = 0, multaCent = 0, descontoCent = 0, forma = "pix", obs = null, lancamentoId = null }) {
  if (!dataValida(data)) throw new ErroNegocio("Data da baixa inválida.");
  if (!Number.isInteger(valorCent) || valorCent <= 0) throw new ErroNegocio("O valor da baixa deve ser maior que zero.");
  if ([jurosCent, multaCent, descontoCent].some(v => !Number.isInteger(v) || v < 0)) throw new ErroNegocio("Juros, multa e desconto não podem ser negativos.");
  const FORMAS = ["pix", "boleto", "ted", "dinheiro", "cartao", "cheque"];
  if (!FORMAS.includes(forma)) throw new ErroNegocio("Forma de pagamento inválida.");

  await travar(tx, tenantId, tituloId);
  const t = await tx.titulo.findFirst({ where: { id: tituloId, tenantId }, include: { baixas: true } });
  if (!t) throw new ErroNegocio("Título não encontrado.", 404);
  if (t.status === "cancelado") throw new ErroNegocio("O título está cancelado.", 409);
  const saldo = saldoCent(emCentavos(t.valor), baixasParaCalculo(t.baixas));
  if (saldo <= 0) throw new ErroNegocio("O título já está quitado.", 409);
  if (valorCent > saldo) throw new ErroNegocio(`O valor (${brl(valorCent)}) passa o saldo do título (${brl(saldo)}).`);

  const conta = await tx.contaFinanceira.findFirst({ where: { id: contaId, tenantId } });
  if (!conta) throw new ErroNegocio("Conta não encontrada.", 404);
  if (!conta.ativa) throw new ErroNegocio("A conta está inativa.");

  const baixa = await tx.baixa.create({
    data: { tenantId, tituloId, contaId, data, valor: dec(valorCent), juros: dec(jurosCent), multa: dec(multaCent), desconto: dec(descontoCent), forma, obs, lancamentoId },
  });
  await recalcularStatus(tx, tituloId);
  return baixa;
}

export async function estornarBaixa(tx, { tenantId, baixaId }) {
  const b = await tx.baixa.findFirst({ where: { id: baixaId, tenantId } });
  if (!b) throw new ErroNegocio("Baixa não encontrada.", 404);
  await travar(tx, tenantId, b.tituloId);
  if (b.estornadaEm) throw new ErroNegocio("Esta baixa já foi estornada.", 409);
  await tx.baixa.update({ where: { id: baixaId }, data: { estornadaEm: hojeBR(), lancamentoId: null } });
  // A linha do extrato volta a ficar pendente se não sobrou nenhuma baixa ativa ligada a ela
  if (b.lancamentoId) {
    const restantes = await tx.baixa.count({ where: { lancamentoId: b.lancamentoId, estornadaEm: null, NOT: { id: baixaId } } });
    if (!restantes) await tx.lancamentoBancario.update({ where: { id: b.lancamentoId }, data: { status: "pendente" } });
  }
  await recalcularStatus(tx, b.tituloId);
}

/** Cancela um título que ainda não recebeu baixa (compra, diárias, locação e avulso). */
export async function cancelarTitulo(tx, { tenantId, tituloId }) {
  await travar(tx, tenantId, tituloId);
  const t = await tx.titulo.findFirst({ where: { id: tituloId, tenantId }, include: { baixas: true } });
  if (!t) throw new ErroNegocio("Título não encontrado.", 404);
  if (TIPOS_COM_CUSTO.includes(t.origemTipo)) throw new ErroNegocio("Este título é de uma despesa ou receita: exclua o lançamento.", 409);
  if (t.baixas.some(b => !b.estornadaEm)) throw new ErroNegocio("Há pagamentos lançados: estorne antes de cancelar.", 409);
  await tx.titulo.update({ where: { id: tituloId }, data: { status: "cancelado" } });
  // Diárias e locações voltam a ficar disponíveis para um novo pagamento
  await tx.apontamentoMO.updateMany({ where: { tituloId, tenantId }, data: { tituloId: null } });
  await tx.alocacao.updateMany({ where: { tituloId, tenantId }, data: { tituloId: null } });
}

/** Prorroga ou ajusta dados soltos de UMA parcela (vencimento, documento, observação). */
export async function ajustarTitulo(tx, { tenantId, tituloId, vencimento, documento, obs }) {
  const t = await tx.titulo.findFirst({ where: { id: tituloId, tenantId } });
  if (!t) throw new ErroNegocio("Título não encontrado.", 404);
  if (t.status === "quitado" || t.status === "cancelado") throw new ErroNegocio("Título quitado ou cancelado não pode ser alterado.", 409);
  const data = {};
  if (vencimento !== undefined) {
    if (!dataValida(vencimento)) throw new ErroNegocio("Vencimento inválido.");
    data.vencimento = vencimento;
  }
  if (documento !== undefined) data.documento = documento || null;
  if (obs !== undefined) data.obs = obs || null;
  const atualizado = await tx.titulo.update({ where: { id: tituloId }, data });
  if (data.vencimento && t.recorrente) await sincronizarCompetencia(tx, tenantId, t.grupoId);
  return atualizado;
}

// ─── Documento (todas as parcelas) ───────────────────────────────────────────

/** Exclui o documento inteiro (parcelas, rateio e linhas de custo). Só sem pagamento ativo. */
export async function excluirDocumento(tx, { tenantId, grupoId }) {
  const titulos = await tx.titulo.findMany({ where: { tenantId, grupoId }, include: { baixas: true } });
  if (!titulos.length) throw new ErroNegocio("Lançamento não encontrado.", 404);
  if (titulos.some(t => t.origemTipo === "compra" || t.origemTipo === "mao_de_obra" || t.origemTipo === "locacao"))
    throw new ErroNegocio("Este título vem de uma compra, diárias ou locação: use Cancelar.", 409);
  if (titulos.some(t => t.baixas.some(b => !b.estornadaEm))) throw new ErroNegocio("Há pagamentos lançados: estorne antes de excluir.", 409);
  await tx.despesa.deleteMany({ where: { tenantId, grupoId } });
  await tx.receita.deleteMany({ where: { tenantId, grupoId } });
  await tx.titulo.deleteMany({ where: { tenantId, grupoId } });
}

/**
 * Edita o documento. Classificação (descrição, categoria, pessoa, rateio) sempre pode mudar.
 * Valor e vencimentos só sem pagamento ativo, e só para despesa, receita e avulso
 * (nos demais, o valor vem da compra, das diárias ou da locação de origem).
 */
export async function atualizarDocumento(tx, { tenantId, grupoId, patch }) {
  const titulos = await tx.titulo.findMany({ where: { tenantId, grupoId }, include: { baixas: true, rateios: true }, orderBy: { parcela: "asc" } });
  if (!titulos.length) throw new ErroNegocio("Lançamento não encontrado.", 404);
  const ref = titulos[0];
  if (titulos.every(t => t.status === "cancelado")) throw new ErroNegocio("Título cancelado não pode ser alterado.", 409);
  const comBaixa = titulos.some(t => t.baixas.some(b => !b.estornadaEm));
  const mudaValores = patch.pagamento !== undefined || patch.valorCent !== undefined;

  if (mudaValores) {
    if (comBaixa) throw new ErroNegocio("Há pagamentos lançados: estorne antes de mudar valor ou vencimento.", 409);
    if (!["despesa", "receita", "avulso"].includes(ref.origemTipo))
      throw new ErroNegocio("O valor deste título vem da compra, diárias ou locação de origem.", 409);
    const valorCent = patch.valorCent ?? (ref.recorrente ? emCentavos(ref.valor) : titulos.reduce((s, t) => s + emCentavos(t.valor), 0));
    const { parcelas, recorrente, baixaImediata } = montarParcelas({ valorCent, pagamento: patch.pagamento || { modo: ref.recorrente ? "repetir" : "parcelado", vencimento: ref.vencimento, parcelas: ref.totalParcelas } });
    const rateio = patch.rateio ?? (ref.recorrente ? ref.rateios : titulos.flatMap(t => t.rateios)).reduce((acc, r) => {
      const k = `${r.obraId}|${r.etapaId}|${r.centroCustoId}`; const a = acc.get(k) || { obraId: r.obraId, etapaId: r.etapaId, centroCustoId: r.centroCustoId, valorCent: 0 };
      a.valorCent += emCentavos(r.valor); return acc.set(k, a);
    }, new Map()).values();
    await tx.titulo.deleteMany({ where: { tenantId, grupoId } });
    return criarDocumento(tx, {
      tenantId, grupoId, tipo: ref.tipo, origemTipo: ref.origemTipo, origemId: ref.origemId, recorrente, baixaImediata,
      pessoaId: patch.pessoaId !== undefined ? patch.pessoaId : ref.pessoaId, pessoaTexto: patch.pessoaTexto !== undefined ? patch.pessoaTexto : ref.pessoaTexto,
      descricao: patch.descricao ?? ref.descricao, documento: patch.documento !== undefined ? patch.documento : ref.documento,
      categoria: patch.categoria !== undefined ? patch.categoria : ref.categoria, obs: patch.obs !== undefined ? patch.obs : ref.obs,
      emissao: patch.emissao ?? ref.emissao, parcelas, rateio: [...rateio],
    });
  }

  const meta = {};
  for (const k of ["descricao", "documento", "categoria", "obs"]) if (patch[k] !== undefined) meta[k] = patch[k] || (k === "descricao" ? ref.descricao : null);
  if (patch.pessoaId !== undefined) { meta.pessoaId = patch.pessoaId || null; meta.pessoaTexto = patch.pessoaId ? null : (patch.pessoaTexto || null); }
  else if (patch.pessoaTexto !== undefined) meta.pessoaTexto = patch.pessoaTexto || null;
  if (Object.keys(meta).length) await tx.titulo.updateMany({ where: { tenantId, grupoId }, data: meta });

  if (patch.rateio) {
    const base = baseDoRateio(titulos.map(t => ({ valorCent: emCentavos(t.valor) })), ref.recorrente);
    const erro = validarRateio(patch.rateio, base);
    if (erro) throw new ErroNegocio(erro);
    await tx.tituloRateio.deleteMany({ where: { tenantId, tituloId: { in: titulos.map(t => t.id) } } });
    const porParcela = ref.recorrente ? titulos.map(() => patch.rateio) : distribuirRateio(patch.rateio, titulos.map(t => emCentavos(t.valor)));
    await tx.tituloRateio.createMany({
      data: titulos.flatMap((t, i) => porParcela[i].map(l => ({
        tenantId, tituloId: t.id, obraId: l.obraId, etapaId: l.etapaId, centroCustoId: l.centroCustoId, valor: dec(l.valorCent),
      }))),
    });
  }
  if (TIPOS_COM_CUSTO.includes(ref.origemTipo)) await sincronizarCompetencia(tx, tenantId, grupoId);
  return { grupoId };
}
