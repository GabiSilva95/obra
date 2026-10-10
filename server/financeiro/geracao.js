// Pendências e geração de contas a pagar a partir de compras entregues, diárias e locações.
import prisma from "../db.js";
import { hojeBR, somarDias } from "../utils/datas.js";
import { emCentavos, emReais } from "./dinheiro.js";
import { gerarParcelas } from "./parcelas.js";
import { criarDocumento } from "./servico.js";
import { ErroNegocio, dataValida } from "./erro.js";
import { totalCentOrdem } from "./compras.js";

const dataBRs = d => d.split("-").reverse().join("/");

/** Bloco "já foi pago": { contaId, data, forma } ou null. */
export function lerPago(p) {
  if (!p) return null;
  if (!p.contaId) throw new ErroNegocio("Escolha a conta do pagamento.");
  if (!dataValida(p.data)) throw new ErroNegocio("Data do pagamento inválida.");
  return { contaId: parseInt(p.contaId), data: p.data, forma: p.forma || "pix" };
}

const noPeriodo = (data, de, ate) => (!de || data >= de) && (!ate || data <= ate);

// ─── Leitura ─────────────────────────────────────────────────────────────────

/** Diárias sem título, por colaborador, com o que cabe a cada obra. */
async function diariasPendentes(tenantId) {
  const aps = await prisma.apontamentoMO.findMany({ where: { tenantId, tituloId: null }, include: { funcionario: { select: { id: true, nome: true } } }, orderBy: { data: "asc" } });
  const por = new Map();
  for (const a of aps) {
    const cent = emCentavos((a.valorDia || 0) * (a.dias || 0));
    if (!(cent > 0)) continue;
    const f = por.get(a.funcionarioId) || { funcionarioId: a.funcionarioId, nome: a.funcionario.nome, dias: 0, cent: 0, de: a.data, ate: a.data, obras: new Map() };
    f.dias += a.dias; f.cent += cent; f.ate = a.data > f.ate ? a.data : f.ate; f.de = a.data < f.de ? a.data : f.de;
    f.obras.set(a.obraId, (f.obras.get(a.obraId) || 0) + cent);
    por.set(a.funcionarioId, f);
  }
  return [...por.values()].map(f => ({
    funcionarioId: f.funcionarioId, nome: f.nome, dias: f.dias, valor: emReais(f.cent), de: f.de, ate: f.ate,
    obras: [...f.obras].map(([obraId, c]) => ({ obraId, valor: emReais(c) })),
  })).sort((a, b) => a.nome.localeCompare(b.nome));
}

/** Locações (máquinas alugadas) sem título, por locador (ou por máquina, se não houver locador). */
async function locacoesPendentes(tenantId) {
  const als = await prisma.alocacao.findMany({
    where: { tenantId, tituloId: null, tipo: "maquina", maquina: { tipoPropriedade: "alugada" } },
    include: { maquina: { include: { locador: { select: { id: true, nome: true } } } } }, orderBy: { data: "asc" },
  });
  const por = new Map();
  for (const a of als) {
    const cu = a.custoUnitario ?? a.maquina?.custoHora ?? 0;
    const cent = emCentavos(cu * (a.quantidade || 0));
    if (!(cent > 0)) continue;
    const chave = a.maquina.locadorId ? `L${a.maquina.locadorId}` : `M${a.maquinaId}`;
    const g = por.get(chave) || { chave, locadorId: a.maquina.locadorId, nome: a.maquina.locador?.nome || a.maquina.nome, maquinas: new Set(), horas: 0, cent: 0, de: a.data, ate: a.data, obras: new Map() };
    g.maquinas.add(a.maquina.nome); g.horas += a.quantidade; g.cent += cent; g.ate = a.data > g.ate ? a.data : g.ate; g.de = a.data < g.de ? a.data : g.de;
    g.obras.set(a.obraId, (g.obras.get(a.obraId) || 0) + cent);
    por.set(chave, g);
  }
  return [...por.values()].map(g => ({
    chave: g.chave, locadorId: g.locadorId, nome: g.nome, semLocador: !g.locadorId, maquinas: [...g.maquinas], horas: g.horas, valor: emReais(g.cent), de: g.de, ate: g.ate,
    obras: [...g.obras].map(([obraId, c]) => ({ obraId, valor: emReais(c) })),
  })).sort((a, b) => a.nome.localeCompare(b.nome));
}

async function comprasPendentes(tenantId) {
  const [ordens, titulos] = await Promise.all([
    prisma.ordemCompra.findMany({ where: { tenantId, status: "Entregue" }, include: { itens: true, fornecedorPessoa: { select: { nome: true } } }, orderBy: { data: "desc" } }),
    prisma.titulo.findMany({ where: { tenantId, origemTipo: "compra" }, select: { origemId: true } }),
  ]);
  const com = new Set(titulos.map(t => t.origemId));
  return ordens.filter(o => !com.has(o.id)).map(o => {
    if (!o.itens.length && o.quantidade > 0) o.itens = [{ quantidade: o.quantidade, valorUnit: o.valorUnit }];
    return { id: o.id, numero: o.numero ?? o.id, fornecedor: o.fornecedorPessoa?.nome || o.fornecedor || null, obraId: o.obraId, data: o.data, valor: emReais(totalCentOrdem(o)) };
  }).filter(o => o.valor > 0);
}

export async function gerarPendencias(tenantId) {
  const [compras, diarias, locacoes] = await Promise.all([comprasPendentes(tenantId), diariasPendentes(tenantId), locacoesPendentes(tenantId)]);
  return { compras, diarias, locacoes };
}

export async function contarPendencias(tenantId) {
  const p = await gerarPendencias(tenantId);
  return { compras: p.compras.length, diarias: p.diarias.length, locacoes: p.locacoes.length };
}

// ─── Geração ─────────────────────────────────────────────────────────────────

async function vencimentoPadrao(tx, tenantId, vencimento, pago) {
  if (pago) return pago.data;
  if (vencimento) return vencimento;
  const cfg = await tx.configFinanceira.findUnique({ where: { tenantId } });
  return somarDias(hojeBR(), cfg?.prazoPadraoDias ?? 30);
}

/** Linhas de rateio a partir de um mapa "obra|etapa" → centavos. */
const linhasDoMapa = mapa => [...mapa].map(([k, valorCent]) => {
  const [o, e] = k.split("|");
  return { obraId: parseInt(o), etapaId: e ? parseInt(e) : null, centroCustoId: null, valorCent };
});

/**
 * Um título por colaborador, rateado entre as obras (e etapas) em que trabalhou, e as diárias
 * ficam marcadas com o título para não serem pagas duas vezes. Se outra pessoa gerar o mesmo
 * pagamento ao mesmo tempo, a marcação não fecha e a transação inteira volta atrás.
 */
export async function gerarTitulosDeDiarias(tx, { tenantId, funcionarioIds, de, ate, vencimento, pago }) {
  const gerados = [];
  const venc = await vencimentoPadrao(tx, tenantId, vencimento, pago);
  for (const funcionarioId of funcionarioIds) {
    const f = await tx.funcionario.findFirst({ where: { id: funcionarioId, tenantId }, select: { id: true, nome: true } });
    if (!f) throw new ErroNegocio("Colaborador não encontrado.", 404);
    const aps = (await tx.apontamentoMO.findMany({ where: { tenantId, funcionarioId, tituloId: null }, orderBy: { data: "asc" } }))
      .filter(a => noPeriodo(a.data, de, ate) && emCentavos((a.valorDia || 0) * (a.dias || 0)) > 0);
    if (!aps.length) continue;
    const mapa = new Map();
    for (const a of aps) { const k = `${a.obraId}|${a.etapaId ?? ""}`; mapa.set(k, (mapa.get(k) || 0) + emCentavos(a.valorDia * a.dias)); }
    const total = [...mapa.values()].reduce((s, v) => s + v, 0);
    const r = await criarDocumento(tx, {
      tenantId, tipo: "pagar", origemTipo: "mao_de_obra", pessoaId: f.id, descricao: `Diárias de ${f.nome} (${dataBRs(aps[0].data)} a ${dataBRs(aps.at(-1).data)})`,
      categoria: "Mão de obra", emissao: hojeBR(), parcelas: gerarParcelas({ valorCent: total, primeiroVencimento: venc }),
      rateio: linhasDoMapa(mapa), baixaImediata: pago,
    });
    const ids = aps.map(a => a.id);
    const marcadas = await tx.apontamentoMO.updateMany({ where: { id: { in: ids }, tituloId: null }, data: { tituloId: r.titulos[0].id } });
    if (marcadas.count !== ids.length) throw new ErroNegocio("Essas diárias acabaram de ser incluídas em outro pagamento. Atualize a tela.", 409);
    gerados.push(r.grupoId);
  }
  return gerados;
}

/** Um título por locador (ou por máquina sem locador cadastrado), rateado entre as obras. */
export async function gerarTitulosDeLocacoes(tx, { tenantId, chaves, de, ate, vencimento, pago }) {
  const gerados = [];
  const venc = await vencimentoPadrao(tx, tenantId, vencimento, pago);
  const todas = await tx.alocacao.findMany({
    where: { tenantId, tituloId: null, tipo: "maquina", maquina: { tipoPropriedade: "alugada" } },
    include: { maquina: { include: { locador: { select: { id: true, nome: true } } } } }, orderBy: { data: "asc" },
  });
  for (const chave of chaves) {
    const als = todas.filter(a => (a.maquina.locadorId ? `L${a.maquina.locadorId}` : `M${a.maquinaId}`) === chave)
      .filter(a => noPeriodo(a.data, de, ate) && emCentavos((a.custoUnitario ?? a.maquina.custoHora ?? 0) * a.quantidade) > 0);
    if (!als.length) continue;
    const mapa = new Map();
    for (const a of als) { const k = `${a.obraId}|${a.etapaId ?? ""}`; mapa.set(k, (mapa.get(k) || 0) + emCentavos((a.custoUnitario ?? a.maquina.custoHora ?? 0) * a.quantidade)); }
    const total = [...mapa.values()].reduce((s, v) => s + v, 0);
    const locador = als[0].maquina.locador;
    const nomes = [...new Set(als.map(a => a.maquina.nome))].join(", ");
    const r = await criarDocumento(tx, {
      tenantId, tipo: "pagar", origemTipo: "locacao", pessoaId: locador?.id ?? null, pessoaTexto: locador ? null : als[0].maquina.nome,
      descricao: `Locação: ${nomes} (${dataBRs(als[0].data)} a ${dataBRs(als.at(-1).data)})`, categoria: "Locação de equipamentos", emissao: hojeBR(),
      parcelas: gerarParcelas({ valorCent: total, primeiroVencimento: venc }), rateio: linhasDoMapa(mapa), baixaImediata: pago,
    });
    const ids = als.map(a => a.id);
    const marcadas = await tx.alocacao.updateMany({ where: { id: { in: ids }, tituloId: null }, data: { tituloId: r.titulos[0].id } });
    if (marcadas.count !== ids.length) throw new ErroNegocio("Essas locações acabaram de ser incluídas em outro pagamento. Atualize a tela.", 409);
    gerados.push(r.grupoId);
  }
  return gerados;
}
