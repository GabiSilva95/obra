import { useMemo, useState } from "react";
import { Banner, Card, DataTable, ProgressBar, SegmentedTabs, Select, StatCard, Tag } from "../../../design-system";
import { PageActions } from "../../components/PageActions";
import { fmt, calcIns, calcMaq, calcMO, calcDesp, calcCustoObra } from "../../utils/helpers";

const COR_CUSTO = { Insumos: "var(--stat-4)", Maquinário: "var(--stat-1)", "Mão de obra": "var(--cp-data-purple)", Despesas: "var(--cp-data-pink)" };

/**
 * Resultado por competência: o que cada obra custou e faturou, em cima de consumo, máquinas,
 * diárias, despesas e receitas. É a visão de lucro e orçamento; o dinheiro que entrou e saiu
 * de fato está em Contas a pagar, Contas a receber e Fluxo de caixa.
 */
export default function Resultado({ ctx }) {
  const { data, base } = ctx;
  const { obras, receitas = [], insumos, alocacoes, maquinas, funcionarioObra, funcionarios, consumos = [], apontamentos = [], despesas = [] } = data;
  const [obraFiltro, setObraFiltro] = useState(obras[0]?.id || "");
  const [aba, setAba] = useState("resumo");
  const obrasSel = obraFiltro ? obras.filter(o => o.id === parseInt(obraFiltro)) : obras;
  const cor = v => (v >= 0 ? "var(--status-success-text)" : "var(--status-danger)");

  const totalReceitas = obrasSel.reduce((s, o) => s + receitas.filter(r => r.obraId === o.id).reduce((a, r) => a + r.valor, 0), 0);
  const totalCustos = obrasSel.reduce((s, o) => s + calcCustoObra(o.id, data), 0);
  // Despesas sem obra vinculada: custo da empresa, fora do rateio por obra
  const despesasGerais = despesas.filter(d => !d.obraId).reduce((s, d) => s + d.valor, 0);
  const lucro = totalReceitas - totalCustos;
  const margem = totalReceitas > 0 ? ((lucro / totalReceitas) * 100).toFixed(1) : "0.0";

  // Custo apropriado por mês (competência): consumo, horas de máquina, diárias e despesas. Não é caixa.
  const custoPorMes = useMemo(() => {
    const meses = {};
    const addMes = (d, tipo, valor) => {
      const m = d.slice(0, 7);
      if (!meses[m]) meses[m] = { mes: m, entradas: 0, saidas: 0 };
      meses[m][tipo === "entrada" ? "entradas" : "saidas"] += valor;
    };
    const daObra = x => !obraFiltro || x.obraId === parseInt(obraFiltro);
    receitas.filter(daObra).forEach(r => addMes(r.data, "entrada", r.valor));
    consumos.filter(daObra).forEach(c => { const cu = c.custoUnitario ?? (insumos.find(i => i.id === c.insumoId)?.custoUnit ?? 0); if (c.data) addMes(c.data, "saida", cu * c.quantidade); });
    alocacoes.filter(a => daObra(a) && a.tipo === "maquina").forEach(a => { const cu = a.custoUnitario ?? (maquinas.find(m => m.id === a.referenciaId)?.custoHora ?? 0); if (a.data) addMes(a.data, "saida", cu * a.quantidade); });
    apontamentos.filter(daObra).forEach(a => { const vd = a.valorDia ?? (funcionarios.find(f => f.id === a.funcionarioId)?.salarioDia ?? 0); if (a.data) addMes(a.data, "saida", vd * a.dias); });
    despesas.filter(daObra).forEach(d => { if (d.data) addMes(d.data, "saida", d.valor); });
    return Object.values(meses).sort((a, b) => a.mes.localeCompare(b.mes)).reduce((rows, m) => {
      const saldo = m.entradas - m.saidas;
      const acum = (rows.at(-1)?.acum ?? 0) + saldo;
      const [ano, mes] = m.mes.split("-");
      return [...rows, { ...m, saldo, acum, label: new Date(parseInt(ano), parseInt(mes) - 1).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }) }];
    }, []);
  }, [data, obraFiltro]); // eslint-disable-line

  // Por centro de custo: despesas e receitas lançadas, com ou sem obra
  const porCentro = useMemo(() => {
    const mapa = new Map();
    const linha = id => { const k = id ?? 0; if (!mapa.has(k)) mapa.set(k, { id: k, nome: k ? (base.centros.find(c => c.id === k)?.nome || `Centro ${k}`) : "Sem centro de custo", despesas: 0, receitas: 0 }); return mapa.get(k); };
    const daObra = x => !obraFiltro || x.obraId === parseInt(obraFiltro);
    despesas.filter(daObra).forEach(d => { linha(d.centroCustoId).despesas += d.valor; });
    receitas.filter(daObra).forEach(r => { linha(r.centroCustoId).receitas += r.valor; });
    return [...mapa.values()].map(l => ({ ...l, resultado: l.receitas - l.despesas })).sort((a, b) => b.despesas - a.despesas);
  }, [despesas, receitas, obraFiltro, base.centros]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <PageActions>
        <Select aria-label="Filtrar obra" style={{ height: "var(--control-h-sm)", minWidth: "var(--control-w-md)" }} value={obraFiltro} onChange={e => setObraFiltro(e.target.value)}>
          <option value="">Todas as obras</option>
          {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </Select>
      </PageActions>
      <p style={{ color: "var(--text-secondary)" }}>Custo e faturamento por competência: o que cada obra gastou e faturou, independente de já ter sido pago ou recebido.</p>
      <SegmentedTabs variant="light" value={aba} onChange={setAba} tabs={[{ value: "resumo", label: "Resumo" }, { value: "obras", label: "Por obra" }, { value: "centros", label: "Por centro de custo" }, { value: "mes", label: "Custo por mês" }]} />

      {aba === "resumo" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-md),1fr))", gap: "var(--space-6)" }}>
            <StatCard value={fmt(totalReceitas)} label="Total de receitas" color="var(--stat-3)" />
            <StatCard value={fmt(totalCustos)} label="Total de custos" color="var(--stat-4)" />
            <StatCard value={fmt(lucro)} label={`Lucro · margem ${margem}%`} color={lucro >= 0 ? "var(--stat-1)" : "var(--status-danger)"} />
          </div>
          {despesasGerais > 0 && <Banner tone="info" title={`${fmt(despesasGerais)} em despesas sem obra`}>Não entram no custo de nenhuma obra. Veja em "Por centro de custo".</Banner>}
          <Card title="Composição de custos">
            {obrasSel.map(o => {
              const partes = { Insumos: calcIns(o.id, consumos, insumos), Maquinário: calcMaq(o.id, alocacoes, maquinas), "Mão de obra": calcMO(o.id, apontamentos, funcionarios, funcionarioObra), Despesas: calcDesp(o.id, despesas) };
              const cT = Object.values(partes).reduce((a, b) => a + b, 0);
              const rec = receitas.filter(r => r.obraId === o.id).reduce((s, r) => s + r.valor, 0);
              const pOrc = cT > 0 && o.orcamento > 0 ? Math.min(100, Math.round(cT / o.orcamento * 100)) : 0;
              return (
                <div key={o.id} style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", paddingBottom: "var(--space-4)", borderBottom: "var(--border-w) solid var(--border-subtle)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-2)" }}>
                    <b>{o.nome}</b>
                    <span style={{ color: cor(rec - cT), fontWeight: "var(--fw-bold)" }}>{fmt(rec - cT)}</span>
                  </div>
                  <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                    {Object.entries(partes).map(([l, v]) => <Tag key={l} tone="neutral" dot={COR_CUSTO[l]}>{l}: {fmt(v)}</Tag>)}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                    <div style={{ flex: 1 }}><ProgressBar value={pOrc} color={pOrc >= 100 ? "var(--status-danger)" : pOrc > 80 ? "var(--status-warning)" : "var(--accent)"} label="Orçamento utilizado" /></div>
                    <span style={{ fontSize: "var(--fs-p6)", color: "var(--text-secondary)" }}>{pOrc}% do orçamento</span>
                  </div>
                </div>
              );
            })}
          </Card>
        </>
      )}

      {aba === "obras" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(var(--col-min-lg),1fr))", gap: "var(--space-6)" }}>
          {obrasSel.map(o => {
            const custos = calcCustoObra(o.id, data);
            const recsList = receitas.filter(r => r.obraId === o.id);
            const recs = recsList.reduce((s, r) => s + r.valor, 0);
            const lucroObra = recs - custos;
            const margemObra = recs > 0 ? ((lucroObra / recs) * 100).toFixed(1) : "—";
            return (
              <Card key={o.id} title={o.nome}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3) var(--space-6)" }}>
                  {[["Receitas", fmt(recs), "var(--status-success-text)"], ["Custos", fmt(custos), "var(--text-primary)"], ["Lucro", fmt(lucroObra), cor(lucroObra)], ["Margem", `${margemObra}%`, cor(lucroObra)]].map(([l, v, c]) => (
                    <div key={l} style={{ display: "flex", flexDirection: "column", gap: "var(--space-0-5)" }}>
                      <span style={{ fontSize: "var(--fs-p5-5)", color: "var(--text-secondary)" }}>{l}:</span>
                      <span style={{ fontWeight: "var(--fw-bold)", color: c }}>{v}</span>
                    </div>
                  ))}
                </div>
                {recsList.length > 0 && (
                  <div style={{ display: "flex", gap: "var(--space-1-5)", flexWrap: "wrap" }}>
                    {recsList.slice(0, 3).map(r => <Tag key={r.id} tone="success">{r.descricao}: {fmt(r.valor)}</Tag>)}
                    {recsList.length > 3 && <Tag tone="neutral">+{recsList.length - 3}</Tag>}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {aba === "centros" && (
        <>
          <p style={{ color: "var(--text-secondary)" }}>Despesas e receitas lançadas, agrupadas pelo centro de custo. Lançamentos sem centro aparecem juntos.</p>
          <DataTable minWidth={640} rows={porCentro} rowKey={c => c.id} empty="Nenhuma despesa ou receita lançada." columns={[
            { key: "nome", label: "Centro de custo", render: c => <b>{c.nome}</b> },
            { key: "despesas", label: "Despesas", align: "right", render: c => <span style={{ color: "var(--status-danger)" }}>{fmt(c.despesas)}</span> },
            { key: "receitas", label: "Receitas", align: "right", render: c => <span style={{ color: "var(--status-success-text)", fontWeight: "var(--fw-semibold)" }}>{fmt(c.receitas)}</span> },
            { key: "resultado", label: "Resultado", align: "right", render: c => <b style={{ color: cor(c.resultado) }}>{fmt(c.resultado)}</b> },
          ]} />
        </>
      )}

      {aba === "mes" && (
        <>
          <Banner tone="info" title="Custo por competência, não é caixa">Mostra o custo no mês em que aconteceu (consumo, horas de máquina, diárias, despesas). O dinheiro que entrou e saiu de fato está no Fluxo de caixa.</Banner>
          <DataTable minWidth={640} rows={custoPorMes} rowKey={m => m.mes} empty="Nenhum dado disponível." columns={[
            { key: "label", label: "Mês", render: m => <b style={{ textTransform: "capitalize" }}>{m.label}</b> },
            { key: "entradas", label: "Receitas", align: "right", render: m => <span style={{ color: "var(--status-success-text)", fontWeight: "var(--fw-semibold)" }}>{fmt(m.entradas)}</span> },
            { key: "saidas", label: "Custos", align: "right", render: m => <span style={{ color: "var(--status-danger)" }}>{fmt(m.saidas)}</span> },
            { key: "saldo", label: "Resultado do mês", align: "right", render: m => <b style={{ color: cor(m.saldo) }}>{fmt(m.saldo)}</b> },
            { key: "acum", label: "Resultado acumulado", align: "right", render: m => <b style={{ color: cor(m.acum) }}>{fmt(m.acum)}</b> },
          ]} />
        </>
      )}
    </div>
  );
}
