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
export const calcIns = (id, es, in_) =>
  es.filter(e => e.obraId === id).reduce((s, e) => {
    const i = in_.find(x => x.id === e.insumoId);
    return s + (i ? i.custoUnit * e.quantUtilizado : 0);
  }, 0);
export const calcMaq = (id, al, ma) =>
  al.filter(a => a.obraId === id && a.tipo === "maquina").reduce((s, a) => {
    const m = ma.find(x => x.id === a.referenciaId);
    return s + (m ? m.custoHora * a.quantidade : 0);
  }, 0);
export const calcMO = (id, fo, fn) =>
  fo.filter(f => f.obraId === id).reduce((s, f) => {
    const x = fn.find(y => y.id === f.funcionarioId);
    return s + (x ? x.salarioDia * f.dias : 0);
  }, 0);
