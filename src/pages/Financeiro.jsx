import { useState } from "react";
import { fmt, calcIns, calcMaq, calcMO, calcDesp, calcCustoObra, validate, today } from "../utils/helpers";
import { avisarErro, confirmar } from "../utils/aviso";
import { Badge, Banner, Button, Card, DataTable, IconButton, Input, Modal, MoneyInput, ProgressBar, SegmentedTabs, Select, StatCard, Tag } from "../../design-system";
import { PageActions } from "../components/PageActions";

const TIPOS_RECEITA = ["Contrato", "Medição", "Adiantamento", "Retenção liberada", "Outro"];
const COR_CUSTO = { Insumos: "var(--stat-4)", Maquinário: "var(--stat-1)", "Mão de obra": "var(--cp-data-purple)", Despesas: "var(--cp-data-pink)" };
const dataBR = d => new Date(d + "T12:00:00").toLocaleDateString("pt-BR");

export default function Financeiro({ data, setData, api, canWrite }) {
  const { obras, receitas = [], insumos, alocacoes, maquinas, funcionarioObra, funcionarios,
          consumos = [], apontamentos = [], despesas = [] } = data;
  const [despModal, setDespModal] = useState(false);
  const [despForm, setDespForm]   = useState({});
  const [despErros, setDespErros] = useState({});
  const [obraFiltro, setObraFiltro] = useState(obras[0]?.id || "");
  const [aba, setAba] = useState("resumo");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [erros, setErros] = useState({});
  const [salvando, setSalvando] = useState(false);

  const obrasSel = obraFiltro ? obras.filter(o => o.id === parseInt(obraFiltro)) : obras;

  const totalReceitas = obrasSel.reduce((s, o) => s + receitas.filter(r => r.obraId === o.id).reduce((a, r) => a + r.valor, 0), 0);
  const totalCustos = obrasSel.reduce((s, o) => s + calcCustoObra(o.id, data), 0);
  // Despesas sem obra vinculada: custo da empresa, fora do rateio por obra
  const despesasGerais = despesas.filter(d => !d.obraId).reduce((s, d) => s + d.valor, 0);
  const lucro = totalReceitas - totalCustos;
  const margem = totalReceitas > 0 ? ((lucro / totalReceitas) * 100).toFixed(1) : "0.0";

  const receitasFiltradas = receitas
    .filter(r => !obraFiltro || r.obraId === parseInt(obraFiltro))
    .sort((a, b) => b.data.localeCompare(a.data));

  const save = async () => {
    const { ok, erros: e } = validate(form, {
      obraId: { required: true, label: "Obra" },
      descricao: { required: true, label: "Descrição" },
      valor: { required: true, label: "Valor", min: 0.01 },
      data: { required: true, label: "Data" },
    });
    if (!ok) { setErros(e); return; }
    if (salvando) return;
    setSalvando(true);
    try {
      if (form.id) {
        const updated = await api.put(`/receitas/${form.id}`, form);
        setData(d => ({ ...d, receitas: d.receitas.map(x => x.id === form.id ? updated : x) }));
      } else {
        const nova = await api.post("/receitas", form);
        setData(d => ({ ...d, receitas: [nova, ...(d.receitas || [])] }));
      }
      setErros({}); setModal(false);
    } catch (err) { if (!err.limitePlano) avisarErro(err.message); }
    finally { setSalvando(false); }
  };

  const del = async id => {
    if (!(await confirmar({ mensagem: "Remover receita?", confirmarRotulo: "Remover", perigo: true }))) return;
    try {
      await api.del(`/receitas/${id}`);
      setData(d => ({ ...d, receitas: d.receitas.filter(x => x.id !== id) }));
    } catch (err) { if (!err.limitePlano) avisarErro(err.message); }
  };

  // ── Despesas ────────────────────────────────────────────────────────────────
  const CATEGORIAS_DESPESA = ["Combustível","Manutenção","Aluguel","Transporte","Alimentação","Tributos e Taxas","Administrativo","Segurança e EPI","Serviços de Terceiros","Outros"];

  const despesasFiltradas = despesas
    .filter(d => !obraFiltro || d.obraId === parseInt(obraFiltro))
    .sort((a, b) => b.data.localeCompare(a.data));

  const etapasDaObra = etapaId => (data.etapasObra || []).filter(e => e.obraId === parseInt(despForm.obraId || 0));

  const saveDespesa = async () => {
    const { ok, erros: e } = validate(despForm, {
      categoria: { required: true, label: "Categoria" },
      descricao: { required: true, label: "Descrição" },
      valor:     { required: true, label: "Valor", min: 0.01 },
      data:      { required: true, label: "Data" },
    });
    if (!ok) { setDespErros(e); return; }
    const payload = {
      ...despForm,
      obraId:  despForm.obraId  ? parseInt(despForm.obraId)  : null,
      etapaId: despForm.etapaId ? parseInt(despForm.etapaId) : null,
      valor:   parseFloat(despForm.valor),
    };
    if (salvando) return;
    setSalvando(true);
    try {
      if (despForm.id) {
        const upd = await api.put(`/despesas/${despForm.id}`, payload);
        setData(d => ({ ...d, despesas: d.despesas.map(x => x.id === despForm.id ? upd : x) }));
      } else {
        const nova = await api.post("/despesas", payload);
        setData(d => ({ ...d, despesas: [nova, ...(d.despesas || [])] }));
      }
      setDespErros({}); setDespModal(false);
    } catch (err) { if (!err.limitePlano) avisarErro(err.message); }
    finally { setSalvando(false); }
  };

  const delDespesa = async id => {
    if (!(await confirmar({ mensagem: "Remover despesa?", confirmarRotulo: "Remover", perigo: true }))) return;
    try {
      await api.del(`/despesas/${id}`);
      setData(d => ({ ...d, despesas: d.despesas.filter(x => x.id !== id) }));
    } catch (err) { if (!err.limitePlano) avisarErro(err.message); }
  };

  // Monthly cash flow: revenue in, and the same cost base as the summary out (material, machines, labour, expenses)
  const fluxo = (() => {
    const meses = {};
    const addMes = (d, tipo, valor) => {
      const m = d.slice(0, 7);
      if (!meses[m]) meses[m] = { mes: m, entradas: 0, saidas: 0 };
      meses[m][tipo === "entrada" ? "entradas" : "saidas"] += valor;
    };
    const daObra = x => !obraFiltro || x.obraId === parseInt(obraFiltro);
    receitas.filter(daObra).forEach(r => addMes(r.data, "entrada", r.valor));
    consumos.filter(daObra).forEach(c => {
      const cu = c.custoUnitario ?? (insumos.find(i => i.id === c.insumoId)?.custoUnit ?? 0);
      if (c.data) addMes(c.data, "saida", cu * c.quantidade);
    });
    alocacoes.filter(a => daObra(a) && a.tipo === "maquina").forEach(a => {
      const cu = a.custoUnitario ?? (maquinas.find(m => m.id === a.referenciaId)?.custoHora ?? 0);
      if (a.data) addMes(a.data, "saida", cu * a.quantidade);
    });
    apontamentos.filter(daObra).forEach(a => {
      const vd = a.valorDia ?? (funcionarios.find(f => f.id === a.funcionarioId)?.salarioDia ?? 0);
      if (a.data) addMes(a.data, "saida", vd * a.dias);
    });
    despesas.filter(daObra).forEach(d => { if (d.data) addMes(d.data, "saida", d.valor); });
    return Object.values(meses).sort((a, b) => a.mes.localeCompare(b.mes)).reduce((rows, m) => {
      const saldo = m.entradas - m.saidas;
      const acum = (rows.at(-1)?.acum ?? 0) + saldo;
      const [ano, mes] = m.mes.split("-");
      return [...rows, { ...m, saldo, acum, label: new Date(parseInt(ano), parseInt(mes) - 1).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }) }];
    }, []);
  })();

  const cor = v => (v >= 0 ? "var(--status-success-text)" : "var(--status-danger)");
  const fecharReceita = () => { setModal(false); setErros({}); };
  const fecharDespesa = () => { setDespModal(false); setDespErros({}); };
  const setD = k => e => setDespForm(f => ({ ...f, [k]: e.target.value }));
  const setR = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <PageActions>
        <Select aria-label="Filtrar obra" style={{ height: "var(--control-h-sm)", minWidth: "var(--control-w-md)" }} value={obraFiltro} onChange={e => setObraFiltro(e.target.value)}>
          <option value="">Todas as obras</option>
          {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </Select>
        {canWrite && aba === "despesas" && <Button iconLeft="plus" onClick={() => { setDespForm({ obraId: obraFiltro || "", data: today(), categoria: "Combustível" }); setDespModal(true); }}>Nova despesa</Button>}
        {canWrite && aba === "receitas" && <Button iconLeft="plus" onClick={() => { setForm({ obraId: obraFiltro || obras[0]?.id, data: today(), tipo: "Contrato" }); setModal(true); }}>Nova receita</Button>}
      </PageActions>
      <p style={{ color: "var(--text-secondary)" }}>Receitas, custos e lucratividade.</p>
      <SegmentedTabs variant="light" value={aba} onChange={setAba} tabs={[
        { value: "resumo", label: "Resumo" }, { value: "receitas", label: "Receitas", count: receitasFiltradas.length },
        { value: "despesas", label: "Despesas", count: despesasFiltradas.length }, { value: "obras", label: "Por obra" }, { value: "fluxo", label: "Fluxo de caixa" },
      ]} />

      {aba === "resumo" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-md),1fr))", gap: "var(--space-6)" }}>
            <StatCard value={fmt(totalReceitas)} label="Total de receitas" color="var(--stat-3)" />
            <StatCard value={fmt(totalCustos)} label="Total de custos" color="var(--stat-4)" />
            <StatCard value={fmt(lucro)} label={`Lucro · margem ${margem}%`} color={lucro >= 0 ? "var(--stat-1)" : "var(--status-danger)"} />
          </div>
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

      {aba === "receitas" && (
        <DataTable minWidth={720} rows={receitasFiltradas} rowKey={r => r.id} empty="Nenhuma receita registrada." columns={[
          { key: "descricao", label: "Descrição", render: r => <b>{r.descricao}</b> },
          { key: "tipo", label: "Tipo", render: r => <Tag tone="success">{r.tipo}</Tag> },
          { key: "obra", label: "Obra", render: r => obras.find(o => o.id === r.obraId)?.nome || "—" },
          { key: "data", label: "Data", render: r => dataBR(r.data) },
          { key: "valor", label: "Valor", align: "right", render: r => <b style={{ color: "var(--status-success-text)" }}>{fmt(r.valor)}</b> },
          ...(canWrite ? [{ key: "acoes", label: "", width: "var(--space-24)", render: r => (
            <div style={{ display: "flex", gap: "var(--space-1)" }}>
              <IconButton icon="pencil" size={28} label="Editar" onClick={() => { setForm({ ...r }); setModal(true); }} />
              <IconButton icon="trash-2" variant="danger" size={28} label="Excluir" onClick={() => del(r.id)} />
            </div>
          ) }] : []),
        ]} />
      )}

      {aba === "despesas" && (
        <>
          {despesasGerais > 0 && <Banner tone="info" title={`${fmt(despesasGerais)} em despesas gerais da empresa`}>Sem obra vinculada: não entram no custo de nenhuma obra.</Banner>}
          <DataTable minWidth={820} rows={despesasFiltradas} rowKey={r => r.id} empty="Nenhuma despesa registrada. Combustível, manutenção, aluguel, tributos e administrativo." columns={[
            { key: "descricao", label: "Descrição", render: d => (
              <span style={{ display: "flex", flexDirection: "column" }}><b>{d.descricao}</b>{d.fornecedor && <span style={{ fontSize: "var(--fs-p6)", color: "var(--text-secondary)" }}>{d.fornecedor}</span>}</span>
            ) },
            { key: "categoria", label: "Categoria", render: d => <Tag tone="neutral">{d.categoria}</Tag> },
            { key: "obra", label: "Obra / etapa", render: d => {
              const obra = obras.find(o => o.id === d.obraId);
              const etapa = (data.etapasObra || []).find(e => e.id === d.etapaId);
              const tp = etapa && (data.tiposEtapa || []).find(t => t.id === etapa.tipoEtapaId);
              return obra ? <span>{obra.nome}{tp && <span style={{ color: "var(--text-secondary)" }}> · {tp.nome}</span>}</span> : <Badge size="sm" tone="warning">Geral</Badge>;
            } },
            { key: "data", label: "Data", render: d => dataBR(d.data) },
            { key: "valor", label: "Valor", align: "right", render: d => <b>{fmt(d.valor)}</b> },
            ...(canWrite ? [{ key: "acoes", label: "", width: "var(--space-24)", render: d => (
              <div style={{ display: "flex", gap: "var(--space-1)" }}>
                <IconButton icon="pencil" size={28} label="Editar" onClick={() => { setDespForm({ ...d }); setDespModal(true); }} />
                <IconButton icon="trash-2" variant="danger" size={28} label="Excluir" onClick={() => delDespesa(d.id)} />
              </div>
            ) }] : []),
          ]} />
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

      {aba === "fluxo" && (
        <DataTable minWidth={640} rows={fluxo} rowKey={m => m.mes} empty="Nenhum dado disponível." columns={[
          { key: "label", label: "Mês", render: m => <b style={{ textTransform: "capitalize" }}>{m.label}</b> },
          { key: "entradas", label: "Entradas", align: "right", render: m => <span style={{ color: "var(--status-success-text)", fontWeight: "var(--fw-semibold)" }}>{fmt(m.entradas)}</span> },
          { key: "saidas", label: "Saídas", align: "right", render: m => <span style={{ color: "var(--status-danger)" }}>{fmt(m.saidas)}</span> },
          { key: "saldo", label: "Saldo do mês", align: "right", render: m => <b style={{ color: cor(m.saldo) }}>{fmt(m.saldo)}</b> },
          { key: "acum", label: "Saldo acumulado", align: "right", render: m => <b style={{ color: cor(m.acum) }}>{fmt(m.acum)}</b> },
        ]} />
      )}

      {despModal && (
        <Modal title={despForm.id ? "Editar despesa" : "Nova despesa"} onClose={fecharDespesa} wide
          footer={<><Button variant="secondary" onClick={fecharDespesa}>Cancelar</Button><Button iconLeft="check" loading={salvando} onClick={saveDespesa}>Salvar despesa</Button></>}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-md),1fr))", gap: "var(--space-4)" }}>
              <Select label="Categoria" required error={despErros.categoria} value={despForm.categoria || ""} onChange={setD("categoria")} options={CATEGORIAS_DESPESA} />
              <Input label="Data" required type="date" error={despErros.data} value={despForm.data || ""} onChange={setD("data")} />
            </div>
            <Input label="Descrição" required error={despErros.descricao} value={despForm.descricao || ""} onChange={setD("descricao")} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-md),1fr))", gap: "var(--space-4)" }}>
              <MoneyInput label="Valor" required error={despErros.valor} value={despForm.valor ?? ""} onChange={setD("valor")} />
              <Input label="Fornecedor" value={despForm.fornecedor || ""} onChange={setD("fornecedor")} />
              <Select label="Obra" value={despForm.obraId || ""} onChange={e => setDespForm(f => ({ ...f, obraId: e.target.value, etapaId: "" }))}>
                <option value="">Geral da empresa</option>
                {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
              </Select>
              <Select label="Etapa (opcional)" disabled={!despForm.obraId} value={despForm.etapaId || ""} onChange={setD("etapaId")}>
                <option value="">Sem etapa</option>
                {etapasDaObra().map(et => {
                  const tp = (data.tiposEtapa || []).find(t => t.id === et.tipoEtapaId);
                  return <option key={et.id} value={et.id}>{tp?.nome || `Etapa ${et.id}`}</option>;
                })}
              </Select>
            </div>
            <Banner tone="info">Sem obra vinculada, a despesa entra apenas no consolidado da empresa.</Banner>
          </div>
        </Modal>
      )}

      {modal && (
        <Modal title={form.id ? "Editar receita" : "Nova receita"} onClose={fecharReceita}
          footer={<><Button variant="secondary" onClick={fecharReceita}>Cancelar</Button><Button iconLeft="check" loading={salvando} onClick={save}>Salvar</Button></>}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <Select label="Obra" required error={erros.obraId} value={form.obraId || ""} onChange={e => setForm(f => ({ ...f, obraId: parseInt(e.target.value) }))}>
              <option value="">Selecione…</option>
              {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
            </Select>
            <Input label="Descrição" required error={erros.descricao} value={form.descricao || ""} onChange={setR("descricao")} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
              <MoneyInput label="Valor" required error={erros.valor} value={form.valor ?? ""} onChange={setR("valor")} />
              <Input label="Data" required type="date" error={erros.data} value={form.data || ""} onChange={setR("data")} />
            </div>
            <Select label="Tipo" value={form.tipo || "Contrato"} onChange={setR("tipo")} options={TIPOS_RECEITA} />
          </div>
        </Modal>
      )}
    </div>
  );
}
