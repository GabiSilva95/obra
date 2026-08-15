export const fmt = n => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

// validate(form, rules) → { ok: bool, erros: { field: msg } }
// rules: { field: { required?, min?, label? } }
export const validate = (form, rules) => {
  const erros = {};
  for (const [field, rule] of Object.entries(rules)) {
    const val = form[field];
    const label = rule.label || field;
    const empty = val === undefined || val === null || String(val).trim() === "";
    if (rule.required && empty) { erros[field] = `${label} é obrigatório.`; continue; }
    if (!empty && rule.min !== undefined && Number(val) < rule.min) erros[field] = `${label} deve ser maior que ${rule.min}.`;
  }
  return { ok: Object.keys(erros).length === 0, erros };
};
export const nextId = arr => arr.length ? Math.max(...arr.map(i => i.id)) + 1 : 1;
export const today = () => new Date().toISOString().split("T")[0];
export const isAtrasada = e => {
  const n = today();
  if (e.status === "Concluída") return false;
  if (e.progresso < 100 && e.dataFimP < n) return true;
  if (e.dataInicioP < n && !e.dataInicioR && e.progresso === 0) return true;
  return false;
};
export const calcProg = (id, et) => {
  const a = et.filter(e => e.obraId === id);
  return a.length ? Math.round(a.reduce((s, e) => s + e.progresso, 0) / a.length) : 0;
};

// ─── Custos ───────────────────────────────────────────────────────────────────
//
// Todo custo tem uma única origem, com valor congelado na data do lançamento:
//   insumo    → ConsumoInsumo.custoUnitario
//   máquina   → Alocacao.custoUnitario
//   mão de obra → ApontamentoMO.valorDia
//   despesa   → Despesa.valor
//
// Lançamentos anteriores à mudança não têm snapshot; nesses casos há fallback
// para o valor atual do cadastro, sinalizado nas telas.

/** Custo de insumo: consumos registrados na baixa de estoque. */
export const calcIns = (id, consumos = [], insumos = []) =>
  consumos.filter(c => c.obraId === id).reduce((s, c) => {
    const cu = c.custoUnitario ?? (insumos.find(i => i.id === c.insumoId)?.custoUnit ?? 0);
    return s + cu * c.quantidade;
  }, 0);

/** Custo de máquina: horas alocadas × custo/hora congelado. */
export const calcMaq = (id, al, ma) =>
  al.filter(a => a.obraId === id && a.tipo === "maquina").reduce((s, a) => {
    const cu = a.custoUnitario ?? (ma.find(x => x.id === a.referenciaId)?.custoHora ?? 0);
    return s + cu * a.quantidade;
  }, 0);

/**
 * Custo de mão de obra: apontamentos por data.
 *
 * `vinculos` é o modelo antigo (total de dias acumulado, sem data). Ele só é
 * somado enquanto a obra não tiver nenhum apontamento — assim quem já migrou
 * não conta o mesmo custo duas vezes, e quem não migrou não perde o histórico.
 */
export const calcMO = (id, apontamentos = [], funcionarios = [], vinculos = []) => {
  const daObra = apontamentos.filter(a => a.obraId === id);
  if (daObra.length) {
    return daObra.reduce((s, a) => {
      const vd = a.valorDia ?? (funcionarios.find(f => f.id === a.funcionarioId)?.salarioDia ?? 0);
      return s + vd * a.dias;
    }, 0);
  }
  return vinculos.filter(v => v.obraId === id).reduce((s, v) => {
    const f = funcionarios.find(x => x.id === v.funcionarioId);
    return s + (f ? f.salarioDia * v.dias : 0);
  }, 0);
};

/** Despesas apropriadas a uma obra. Despesas gerais (sem obra) ficam de fora. */
export const calcDesp = (id, despesas = []) =>
  despesas.filter(d => d.obraId === id).reduce((s, d) => s + (d.valor || 0), 0);

/** Custo total de uma obra — a soma que todas as telas devem usar. */
export const calcCustoObra = (id, data) => {
  const { consumos = [], insumos = [], alocacoes = [], maquinas = [],
          apontamentos = [], funcionarios = [], funcionarioObra = [], despesas = [] } = data;
  return calcIns(id, consumos, insumos)
       + calcMaq(id, alocacoes, maquinas)
       + calcMO(id, apontamentos, funcionarios, funcionarioObra)
       + calcDesp(id, despesas);
};

/** Custo realizado de uma etapa — base do orçado × realizado. */
export const calcCustoEtapa = (etapaId, data) => {
  const { consumos = [], insumos = [], alocacoes = [], maquinas = [],
          apontamentos = [], funcionarios = [], despesas = [] } = data;

  const ins = consumos.filter(c => c.etapaId === etapaId).reduce((s, c) => {
    const cu = c.custoUnitario ?? (insumos.find(i => i.id === c.insumoId)?.custoUnit ?? 0);
    return s + cu * c.quantidade;
  }, 0);

  const maq = alocacoes.filter(a => a.etapaId === etapaId && a.tipo === "maquina").reduce((s, a) => {
    const cu = a.custoUnitario ?? (maquinas.find(m => m.id === a.referenciaId)?.custoHora ?? 0);
    return s + cu * a.quantidade;
  }, 0);

  const mo = apontamentos.filter(a => a.etapaId === etapaId).reduce((s, a) => {
    const vd = a.valorDia ?? (funcionarios.find(f => f.id === a.funcionarioId)?.salarioDia ?? 0);
    return s + vd * a.dias;
  }, 0);

  const desp = despesas.filter(d => d.etapaId === etapaId).reduce((s, d) => s + (d.valor || 0), 0);

  return { ins, maq, mo, desp, total: ins + maq + mo + desp };
};
