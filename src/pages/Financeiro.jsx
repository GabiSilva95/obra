import { useState } from "react";
import { C, F } from "../constants/tokens";
import { fmt, calcIns, calcMaq, calcMO, calcDesp, calcCustoObra, validate, today } from "../utils/helpers";
import { Icon, Badge, Bar, Card, Modal, Inp, Btn, Hdr, DSel, MoneyInp } from "../components/ui";
import { avisarErro, confirmar } from "../utils/aviso";

const TIPOS_RECEITA = ["Contrato", "Medição", "Adiantamento", "Retenção liberada", "Outro"];
const STATUS_COLORS = { positivo: C.green || "#22c55e", negativo: "#ef4444", neutro: C.muted };

function StatCard({ label, value, icon, color, sub }) {
  return (
    <div style={{ background: "rgba(255,255,255,.025)", borderRadius: 12, padding: "14px 16px", flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <Icon n={icon} size={13} color={color || C.dim} />
        <span style={{ fontSize: 10, color: C.dim, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", ...F }}>{label}</span>
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color: color || C.text, letterSpacing: "-0.03em", ...F }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: C.dim, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

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
  };

  const delDespesa = async id => {
    if (!(await confirmar({ mensagem: "Remover despesa?", confirmarRotulo: "Remover", perigo: true }))) return;
    try {
      await api.del(`/despesas/${id}`);
      setData(d => ({ ...d, despesas: d.despesas.filter(x => x.id !== id) }));
    } catch (err) { if (!err.limitePlano) avisarErro(err.message); }
  };

  const ABAS = [
    { id: "resumo", label: "Resumo", icon: "barchart" },
    { id: "receitas", label: "Receitas", icon: "money" },
    { id: "despesas", label: "Despesas", icon: "cube" },
    { id: "obras", label: "Por Obra", icon: "building" },
    { id: "fluxo", label: "Fluxo de Caixa", icon: "trending" },
  ];

  return (
    <div>
      <Hdr
        title="Financeiro"
        sub="Receitas, custos e lucratividade"
        action={
          <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
            <DSel value={obraFiltro} onChange={e => setObraFiltro(e.target.value)}>
              <option value="">Todas as obras</option>
              {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
            </DSel>
            {canWrite && aba === "despesas" && (
              <Btn onClick={() => { setDespForm({ obraId: obraFiltro || "", data: today(), categoria: "Combustível" }); setDespModal(true); }}>
                <Icon n="plus" size={13} />Nova Despesa
              </Btn>
            )}
            {canWrite && aba === "receitas" && (
              <Btn onClick={() => { setForm({ obraId: obraFiltro || obras[0]?.id, data: new Date().toISOString().slice(0, 10), tipo: "Contrato" }); setModal(true); }}>
                <Icon n="plus" size={13} />Nova Receita
              </Btn>
            )}
          </div>
        }
      />

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, marginBottom: 20, background: "rgba(255,255,255,.03)", borderRadius: 12, padding: 4, border: `1px solid ${C.borderLight}` }}>
        {ABAS.map(a => (
          <button key={a.id} onClick={() => setAba(a.id)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 12px", borderRadius: 9, border: "none", cursor: "pointer", background: aba === a.id ? "rgba(249,115,22,.12)" : "transparent", color: aba === a.id ? C.orange : C.muted, fontSize: 11, fontWeight: aba === a.id ? 700 : 500, transition: "all .15s", ...F }}>
            <Icon n={a.icon} size={12} color={aba === a.id ? C.orange : C.dim} />{a.label}
          </button>
        ))}
      </div>

      {aba === "resumo" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <StatCard label="Total Receitas" value={fmt(totalReceitas)} icon="money" color="#22c55e" />
            <StatCard label="Total Custos" value={fmt(totalCustos)} icon="barchart" color={C.orange} />
            <StatCard label="Lucro" value={fmt(lucro)} icon="trending" color={lucro >= 0 ? "#22c55e" : "#ef4444"} sub={`Margem: ${margem}%`} />
          </div>
          <Card style={{ padding: "16px 20px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 14, ...F }}>Composição de custos</div>
            {obrasSel.map(o => {
              const cIns = calcIns(o.id, consumos, insumos);
              const cMaq = calcMaq(o.id, alocacoes, maquinas);
              const cMO = calcMO(o.id, apontamentos, funcionarios, funcionarioObra);
              const cDesp = calcDesp(o.id, despesas);
              const cT = cIns + cMaq + cMO + cDesp;
              const rec = receitas.filter(r => r.obraId === o.id).reduce((s, r) => s + r.valor, 0);
              const pOrc = cT > 0 && o.orcamento > 0 ? Math.min(100, Math.round(cT / o.orcamento * 100)) : 0;
              return (
                <div key={o.id} style={{ marginBottom: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.text, ...F }}>{o.nome}</span>
                    <span style={{ fontSize: 11, color: rec - cT >= 0 ? "#22c55e" : "#ef4444", fontWeight: 700 }}>{fmt(rec - cT)}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                    {[["Insumos", cIns, C.orange], ["Maquinário", cMaq, "#60a5fa"], ["Mão de obra", cMO, "#a78bfa"], ["Despesas", cDesp, "#f472b6"]].map(([l, v, c]) => (
                      <span key={l} style={{ fontSize: 10, color: C.dim }}><span style={{ color: c, fontWeight: 700 }}>●</span> {l}: {fmt(v)}</span>
                    ))}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <Bar val={pOrc} color={pOrc > 100 ? "#ef4444" : pOrc > 80 ? "#f59e0b" : C.orange} />
                    </div>
                    <span style={{ fontSize: 10, color: C.dim, flexShrink: 0 }}>{pOrc}% do orç.</span>
                  </div>
                </div>
              );
            })}
          </Card>
        </div>
      )}

      {aba === "receitas" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {receitasFiltradas.length === 0 ? (
            <Card style={{ textAlign: "center", padding: "48px 24px", color: C.dim }}>
              <Icon n="money" size={32} color={C.border} />
              <div style={{ marginTop: 12, fontSize: 13 }}>Nenhuma receita registrada</div>
            </Card>
          ) : receitasFiltradas.map(r => {
            const obra = obras.find(o => o.id === r.obraId);
            return (
              <Card key={r.id}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 11, background: "rgba(34,197,94,.08)", border: "1px solid rgba(34,197,94,.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon n="money" size={16} color="#22c55e" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap", marginBottom: 3 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: C.text, ...F }}>{r.descricao}</span>
                      <Badge v="green">{r.tipo}</Badge>
                      {obra && <Badge v="blue">{obra.nome}</Badge>}
                    </div>
                    <span style={{ fontSize: 11, color: C.dim }}>{new Date(r.data + "T12:00:00").toLocaleDateString("pt-BR")}</span>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: "#22c55e", ...F, flexShrink: 0 }}>{fmt(r.valor)}</div>
                  {canWrite && (
                    <div style={{ display: "flex", gap: 5 }}>
                      <button onClick={() => { setForm({ ...r }); setModal(true); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                        <Icon n="edit" size={13} color={C.dim} />
                      </button>
                      <button onClick={() => del(r.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                        <Icon n="trash" size={13} color={C.dim} />
                      </button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {aba === "despesas" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {despesasGerais > 0 && (
            <Card style={{ padding: "12px 16px", background: "rgba(244,114,182,.05)", borderColor: "rgba(244,114,182,.18)" }}>
              <div style={{ fontSize: 11, color: "#f472b6", fontWeight: 700, ...F }}>
                {fmt(despesasGerais)} em despesas gerais da empresa
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                Sem obra vinculada — não entram no custo de nenhuma obra.
              </div>
            </Card>
          )}
          {despesasFiltradas.length === 0 ? (
            <Card style={{ textAlign: "center", padding: "48px 24px", color: C.dim }}>
              <Icon n="cube" size={32} color={C.border} />
              <div style={{ marginTop: 12, fontSize: 13 }}>Nenhuma despesa registrada</div>
              <div style={{ marginTop: 4, fontSize: 11 }}>Combustível, manutenção, aluguel, tributos e administrativo.</div>
            </Card>
          ) : despesasFiltradas.map(d => {
            const obra  = obras.find(o => o.id === d.obraId);
            const etapa = (data.etapasObra || []).find(e => e.id === d.etapaId);
            const tp    = etapa && (data.tiposEtapa || []).find(t => t.id === etapa.tipoEtapaId);
            return (
              <Card key={d.id}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 11, background: "rgba(244,114,182,.08)", border: "1px solid rgba(244,114,182,.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon n="cube" size={16} color="#f472b6" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap", marginBottom: 3 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: C.text, ...F }}>{d.descricao}</span>
                      <Badge>{d.categoria}</Badge>
                      {obra ? <Badge v="blue">{obra.nome}</Badge> : <Badge v="yellow">Geral</Badge>}
                      {tp && <Badge v="orange">{tp.nome}</Badge>}
                    </div>
                    <span style={{ fontSize: 11, color: C.dim }}>
                      {new Date(d.data + "T12:00:00").toLocaleDateString("pt-BR")}
                      {d.fornecedor ? ` · ${d.fornecedor}` : ""}
                    </span>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: "#f472b6", ...F, flexShrink: 0 }}>{fmt(d.valor)}</div>
                  {canWrite && (
                    <div style={{ display: "flex", gap: 5 }}>
                      <button onClick={() => { setDespForm({ ...d }); setDespModal(true); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                        <Icon n="edit" size={13} color={C.dim} />
                      </button>
                      <button onClick={() => delDespesa(d.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                        <Icon n="trash" size={13} color={C.dim} />
                      </button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {aba === "obras" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {obrasSel.map(o => {
            const custos = calcCustoObra(o.id, data);
            const recsList = receitas.filter(r => r.obraId === o.id);
            const recs = recsList.reduce((s, r) => s + r.valor, 0);
            const lucroObra = recs - custos;
            const margem = recs > 0 ? ((lucroObra / recs) * 100).toFixed(1) : "—";
            return (
              <Card key={o.id}>
                <div style={{ fontWeight: 700, fontSize: 13, color: C.text, marginBottom: 14, ...F }}>{o.nome}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 12 }}>
                  {[
                    { l: "Receitas", v: fmt(recs), c: "#22c55e" },
                    { l: "Custos", v: fmt(custos), c: C.orange },
                    { l: "Lucro", v: fmt(lucroObra), c: lucroObra >= 0 ? "#22c55e" : "#ef4444" },
                    { l: "Margem", v: `${margem}%`, c: lucroObra >= 0 ? "#22c55e" : "#ef4444" },
                  ].map(k => (
                    <div key={k.l} style={{ background: "rgba(255,255,255,.025)", borderRadius: 9, padding: "10px 12px" }}>
                      <div style={{ fontSize: 10, color: C.dim, marginBottom: 3 }}>{k.l}</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: k.c, ...F }}>{k.v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {recsList.slice(0, 3).map(r => (
                    <span key={r.id} style={{ fontSize: 10, color: C.dim, background: "rgba(255,255,255,.03)", border: `1px solid ${C.borderLight}`, borderRadius: 6, padding: "3px 8px" }}>
                      {r.descricao}: <span style={{ color: "#22c55e", fontWeight: 700 }}>{fmt(r.valor)}</span>
                    </span>
                  ))}
                  {recsList.length > 3 && <span style={{ fontSize: 10, color: C.dim }}>+{recsList.length - 3} mais</span>}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {aba === "fluxo" && (() => {
        // Build monthly cash flow from receitas and estoque movements
        const meses = {};
        const addMes = (data, tipo, valor) => {
          const m = data.slice(0, 7);
          if (!meses[m]) meses[m] = { mes: m, entradas: 0, saidas: 0 };
          if (tipo === "entrada") meses[m].entradas += valor;
          else meses[m].saidas += valor;
        };
        const daObra = x => !obraFiltro || x.obraId === parseInt(obraFiltro);

        // Entradas: receitas lançadas
        receitas.filter(daObra).forEach(r => addMes(r.data, "entrada", r.valor));

        // Saídas: a mesma base do Resumo — material consumido, máquina, mão de
        // obra e despesas, cada um na sua data. Antes só a entrada de estoque
        // era considerada, o que dava um custo diferente do resto da tela.
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
        despesas.filter(d => !obraFiltro ? true : d.obraId === parseInt(obraFiltro))
          .forEach(d => { if (d.data) addMes(d.data, "saida", d.valor); });
        const sorted = Object.values(meses).sort((a, b) => a.mes.localeCompare(b.mes));
        let saldoAcum = 0;
        return (
          <Card style={{ padding: "16px 20px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 14, ...F }}>Fluxo de Caixa Mensal</div>
            {sorted.length === 0 ? (
              <div style={{ fontSize: 12, color: C.dim, textAlign: "center", padding: "24px 0" }}>Nenhum dado disponível</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,.02)" }}>
                    {["Mês", "Entradas", "Saídas", "Saldo Mês", "Saldo Acum."].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: C.dim, fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", ...F, borderBottom: `1px solid ${C.borderLight}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(m => {
                    const saldoMes = m.entradas - m.saidas;
                    saldoAcum += saldoMes;
                    const [ano, mes] = m.mes.split("-");
                    const label = new Date(parseInt(ano), parseInt(mes) - 1).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
                    return (
                      <tr key={m.mes} style={{ borderBottom: `1px solid ${C.borderLight}` }}>
                        <td style={{ padding: "10px 12px", fontWeight: 600, color: C.text, ...F }}>{label}</td>
                        <td style={{ padding: "10px 12px", color: "#22c55e", fontWeight: 600 }}>{fmt(m.entradas)}</td>
                        <td style={{ padding: "10px 12px", color: "#ef4444" }}>{fmt(m.saidas)}</td>
                        <td style={{ padding: "10px 12px", color: saldoMes >= 0 ? "#22c55e" : "#ef4444", fontWeight: 700 }}>{fmt(saldoMes)}</td>
                        <td style={{ padding: "10px 12px", color: saldoAcum >= 0 ? "#22c55e" : "#ef4444", fontWeight: 800, ...F }}>{fmt(saldoAcum)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Card>
        );
      })()}

      {despModal && (
        <Modal title={despForm.id ? "Editar Despesa" : "Nova Despesa"} onClose={() => { setDespModal(false); setDespErros({}); }} wide>
          <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 6, ...F }}>Categoria *</div>
                <select value={despForm.categoria || ""} onChange={e => setDespForm(f => ({ ...f, categoria: e.target.value }))}
                  style={{ width: "100%", background: "rgba(255,255,255,.04)", border: `1px solid ${despErros.categoria ? "#ef4444" : C.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 12, color: C.text, outline: "none", ...F }}>
                  {CATEGORIAS_DESPESA.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <Inp label="Data *" type="date" error={despErros.data} value={despForm.data || ""} onChange={e => setDespForm(f => ({ ...f, data: e.target.value }))} />
            </div>

            <Inp label="Descrição *" error={despErros.descricao} value={despForm.descricao || ""} onChange={e => setDespForm(f => ({ ...f, descricao: e.target.value }))} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <MoneyInp label="Valor *" error={despErros.valor} value={despForm.valor ?? ""} onChange={e => setDespForm(f => ({ ...f, valor: e.target.value }))} />
              <Inp label="Fornecedor" value={despForm.fornecedor || ""} onChange={e => setDespForm(f => ({ ...f, fornecedor: e.target.value }))} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 6, ...F }}>Obra</div>
                <select value={despForm.obraId || ""} onChange={e => setDespForm(f => ({ ...f, obraId: e.target.value, etapaId: "" }))}
                  style={{ width: "100%", background: "rgba(255,255,255,.04)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 12, color: C.text, outline: "none", ...F }}>
                  <option value="">Geral da empresa</option>
                  {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 6, ...F }}>Etapa (opcional)</div>
                <select value={despForm.etapaId || ""} disabled={!despForm.obraId} onChange={e => setDespForm(f => ({ ...f, etapaId: e.target.value }))}
                  style={{ width: "100%", background: "rgba(255,255,255,.04)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 12, color: despForm.obraId ? C.text : C.dim, outline: "none", ...F }}>
                  <option value="">Sem etapa</option>
                  {etapasDaObra().map(et => {
                    const tp = (data.tiposEtapa || []).find(t => t.id === et.tipoEtapaId);
                    return <option key={et.id} value={et.id}>{tp?.nome || `Etapa ${et.id}`}</option>;
                  })}
                </select>
              </div>
            </div>

            <div style={{ fontSize: 11, color: C.muted, background: "rgba(255,255,255,.03)", borderRadius: 9, padding: "9px 13px" }}>
              Sem obra vinculada, a despesa entra apenas no consolidado da empresa.
            </div>

            <div style={{ display: "flex", gap: 9, justifyContent: "flex-end", borderTop: `1px solid ${C.borderLight}`, paddingTop: 13 }}>
              <Btn v="secondary" onClick={() => { setDespModal(false); setDespErros({}); }}>Cancelar</Btn>
              <Btn onClick={saveDespesa}><Icon n="check" size={13} />Salvar Despesa</Btn>
            </div>
          </div>
        </Modal>
      )}

      {modal && (
        <Modal title={form.id ? "Editar Receita" : "Nova Receita"} onClose={() => { setModal(false); setErros({}); }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 6, ...F }}>Obra</div>
              <select value={form.obraId || ""} onChange={e => setForm(f => ({ ...f, obraId: parseInt(e.target.value) }))} style={{ width: "100%", background: "rgba(255,255,255,.04)", border: `1px solid ${erros.obraId ? "#ef4444" : C.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 12, color: C.text, outline: "none", ...F }}>
                <option value="">Selecione...</option>
                {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
              </select>
            </div>
            <Inp label="Descrição" error={erros.descricao} value={form.descricao || ""} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <MoneyInp label="Valor" error={erros.valor} value={form.valor ?? ""} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} />
              <Inp label="Data" type="date" error={erros.data} value={form.data || ""} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 6, ...F }}>Tipo</div>
              <select value={form.tipo || "Contrato"} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} style={{ width: "100%", background: "rgba(255,255,255,.04)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 12, color: C.text, outline: "none", ...F }}>
                {TIPOS_RECEITA.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: 9, justifyContent: "flex-end", borderTop: `1px solid ${C.borderLight}`, paddingTop: 12 }}>
              <Btn v="secondary" onClick={() => { setModal(false); setErros({}); }}>Cancelar</Btn>
              <Btn onClick={save}><Icon n="check" size={13} />Salvar</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
