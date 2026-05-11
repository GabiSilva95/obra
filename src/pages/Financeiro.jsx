import { useState } from "react";
import { C, F } from "../constants/tokens";
import { fmt, calcIns, calcMaq, calcMO, validate } from "../utils/helpers";
import { Icon, Badge, Bar, Card, Modal, Inp, Btn, Hdr, DSel } from "../components/ui";

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
  const { obras, receitas = [], estoques, insumos, alocacoes, maquinas, funcionarioObra, funcionarios } = data;
  const [obraFiltro, setObraFiltro] = useState(obras[0]?.id || "");
  const [aba, setAba] = useState("resumo");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [erros, setErros] = useState({});

  const obrasSel = obraFiltro ? obras.filter(o => o.id === parseInt(obraFiltro)) : obras;

  const totalReceitas = obrasSel.reduce((s, o) => s + receitas.filter(r => r.obraId === o.id).reduce((a, r) => a + r.valor, 0), 0);
  const totalCustos = obrasSel.reduce((s, o) => {
    return s + calcIns(o.id, estoques, insumos) + calcMaq(o.id, alocacoes, maquinas) + calcMO(o.id, funcionarioObra, funcionarios);
  }, 0);
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
    } catch (err) { alert(err.message); }
  };

  const del = async id => {
    if (!confirm("Remover receita?")) return;
    try {
      await api.del(`/receitas/${id}`);
      setData(d => ({ ...d, receitas: d.receitas.filter(x => x.id !== id) }));
    } catch (err) { alert(err.message); }
  };

  const ABAS = [
    { id: "resumo", label: "Resumo", icon: "barchart" },
    { id: "receitas", label: "Receitas", icon: "money" },
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
              const cIns = calcIns(o.id, estoques, insumos);
              const cMaq = calcMaq(o.id, alocacoes, maquinas);
              const cMO = calcMO(o.id, funcionarioObra, funcionarios);
              const cT = cIns + cMaq + cMO;
              const rec = receitas.filter(r => r.obraId === o.id).reduce((s, r) => s + r.valor, 0);
              const pOrc = cT > 0 && o.orcamento > 0 ? Math.min(100, Math.round(cT / o.orcamento * 100)) : 0;
              return (
                <div key={o.id} style={{ marginBottom: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.text, ...F }}>{o.nome}</span>
                    <span style={{ fontSize: 11, color: rec - cT >= 0 ? "#22c55e" : "#ef4444", fontWeight: 700 }}>{fmt(rec - cT)}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                    {[["Insumos", cIns, C.orange], ["Maquinário", cMaq, "#60a5fa"], ["Mão de obra", cMO, "#a78bfa"]].map(([l, v, c]) => (
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

      {aba === "obras" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {obrasSel.map(o => {
            const cIns = calcIns(o.id, estoques, insumos);
            const cMaq = calcMaq(o.id, alocacoes, maquinas);
            const cMO = calcMO(o.id, funcionarioObra, funcionarios);
            const custos = cIns + cMaq + cMO;
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
        receitas.filter(r => !obraFiltro || r.obraId === parseInt(obraFiltro)).forEach(r => addMes(r.data, "entrada", r.valor));
        estoques.filter(e => !obraFiltro || e.obraId === parseInt(obraFiltro)).forEach(e => {
          const ins = insumos.find(i => i.id === e.insumoId);
          if (ins && e.dataMov) addMes(e.dataMov, "saida", ins.custoUnit * e.quantEntrada);
        });
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
              <Inp label="Valor (R$)" type="number" error={erros.valor} value={form.valor || ""} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} />
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
