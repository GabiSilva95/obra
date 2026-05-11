import { useState } from "react";
import { C, F } from "../constants/tokens";
import { fmt, validate } from "../utils/helpers";
import { exportCsv } from "../utils/export";
import { Icon, Badge, Card, Modal, Inp, Btn, Hdr, DSel } from "../components/ui";

const STATUS_LIST = ["Pendente", "Aprovada", "Entregue", "Cancelada"];
const STATUS_COLORS = { Pendente: "yellow", Aprovada: "blue", Entregue: "green", Cancelada: "red" };

export default function Compras({ data, setData, api, canWrite }) {
  const { obras, insumos, compras = [] } = data;
  const [obraFiltro, setObraFiltro] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [erros, setErros] = useState({});

  const lista = compras
    .filter(c => (!obraFiltro || c.obraId === parseInt(obraFiltro)) && (!statusFiltro || c.status === statusFiltro))
    .sort((a, b) => b.data.localeCompare(a.data));

  const totalPendente = compras.filter(c => c.status === "Pendente").reduce((s, c) => s + c.quantidade * c.valorUnit, 0);
  const totalAprovado = compras.filter(c => c.status === "Aprovada").reduce((s, c) => s + c.quantidade * c.valorUnit, 0);

  const save = async () => {
    const { ok, erros: e } = validate(form, {
      obraId: { required: true, label: "Obra" },
      descricao: { required: true, label: "Descrição" },
      data: { required: true, label: "Data" },
    });
    if (!ok) { setErros(e); return; }
    try {
      if (form.id) {
        const updated = await api.put(`/compras/${form.id}`, form);
        setData(d => ({ ...d, compras: d.compras.map(x => x.id === form.id ? updated : x) }));
      } else {
        const nova = await api.post("/compras", form);
        setData(d => ({ ...d, compras: [nova, ...(d.compras || [])] }));
      }
      setErros({}); setModal(false);
    } catch (err) { alert(err.message); }
  };

  const setStatus = async (id, status) => {
    try {
      await api.patch(`/compras/${id}/status`, { status });
      setData(d => ({ ...d, compras: d.compras.map(x => x.id === id ? { ...x, status } : x) }));
    } catch (err) { alert(err.message); }
  };

  const del = async id => {
    if (!confirm("Remover ordem de compra?")) return;
    try {
      await api.del(`/compras/${id}`);
      setData(d => ({ ...d, compras: d.compras.filter(x => x.id !== id) }));
    } catch (err) { alert(err.message); }
  };

  const handleExport = () => {
    const rows = lista.map(c => {
      const obra = obras.find(o => o.id === c.obraId);
      return [obra?.nome || "", c.descricao, c.fornecedor || "", c.quantidade, c.valorUnit, (c.quantidade * c.valorUnit).toFixed(2), c.status, c.data];
    });
    exportCsv("compras.csv", rows, ["Obra", "Descrição", "Fornecedor", "Qtd", "Valor Unit.", "Total", "Status", "Data"]);
  };

  return (
    <div>
      <Hdr
        title="Compras"
        sub="Ordens de compra e solicitações de materiais"
        action={
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <DSel value={obraFiltro} onChange={e => setObraFiltro(e.target.value)}>
              <option value="">Todas as obras</option>
              {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
            </DSel>
            <DSel value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)}>
              <option value="">Todos os status</option>
              {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
            </DSel>
            <Btn v="outline" onClick={handleExport} sx={{ fontSize: 11, padding: "6px 11px" }}><Icon n="upload" size={12} />CSV</Btn>
            {canWrite && (
              <Btn onClick={() => { setForm({ obraId: obraFiltro || obras[0]?.id, data: new Date().toISOString().slice(0, 10), status: "Pendente", quantidade: 1 }); setModal(true); }}>
                <Icon n="plus" size={13} />Nova Ordem
              </Btn>
            )}
          </div>
        }
      />

      {/* Stat row */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { l: "Pendentes", v: fmt(totalPendente), c: "#f59e0b", n: compras.filter(c => c.status === "Pendente").length },
          { l: "Aprovadas", v: fmt(totalAprovado), c: "#60a5fa", n: compras.filter(c => c.status === "Aprovada").length },
          { l: "Entregues", v: fmt(compras.filter(c => c.status === "Entregue").reduce((s, c) => s + c.quantidade * c.valorUnit, 0)), c: "#22c55e", n: compras.filter(c => c.status === "Entregue").length },
        ].map(k => (
          <div key={k.l} style={{ flex: 1, minWidth: 140, background: "rgba(255,255,255,.025)", borderRadius: 12, padding: "13px 16px" }}>
            <div style={{ fontSize: 10, color: C.dim, marginBottom: 5, ...F, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{k.l}</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: k.c, letterSpacing: "-0.03em", ...F }}>{k.v}</div>
            <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>{k.n} ordem{k.n !== 1 ? "s" : ""}</div>
          </div>
        ))}
      </div>

      {lista.length === 0 ? (
        <Card style={{ textAlign: "center", padding: "48px 24px", color: C.dim }}>
          <Icon n="checklist" size={32} color={C.border} />
          <div style={{ marginTop: 12, fontSize: 13 }}>Nenhuma ordem de compra</div>
        </Card>
      ) : (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,.02)" }}>
                {["Descrição", "Obra", "Fornecedor", "Qtd", "Valor Unit.", "Total", "Status", ""].map((h, i) => (
                  <th key={i} style={{ padding: "10px 14px", textAlign: "left", color: C.dim, fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", ...F, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.map(c => {
                const obra = obras.find(o => o.id === c.obraId);
                const total = c.quantidade * c.valorUnit;
                return (
                  <tr key={c.id} style={{ borderTop: `1px solid ${C.borderLight}` }}>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ fontWeight: 600, color: C.text, ...F }}>{c.descricao}</div>
                      {c.obs && <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>{c.obs}</div>}
                      <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>{new Date(c.data + "T12:00:00").toLocaleDateString("pt-BR")}</div>
                    </td>
                    <td style={{ padding: "11px 14px", color: C.muted, whiteSpace: "nowrap" }}>{obra?.nome || "—"}</td>
                    <td style={{ padding: "11px 14px", color: C.muted }}>{c.fornecedor || "—"}</td>
                    <td style={{ padding: "11px 14px", color: C.muted }}>{c.quantidade} {c.insumo?.unidade || ""}</td>
                    <td style={{ padding: "11px 14px", color: C.muted }}>{c.valorUnit > 0 ? fmt(c.valorUnit) : "—"}</td>
                    <td style={{ padding: "11px 14px", fontWeight: 700, color: C.text, ...F }}>{total > 0 ? fmt(total) : "—"}</td>
                    <td style={{ padding: "11px 14px" }}>
                      {canWrite ? (
                        <select value={c.status} onChange={e => setStatus(c.id, e.target.value)} style={{ background: "rgba(255,255,255,.04)", border: `1px solid ${C.border}`, borderRadius: 7, padding: "4px 8px", fontSize: 11, color: C.text, outline: "none", cursor: "pointer", ...F }}>
                          {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      ) : (
                        <Badge v={STATUS_COLORS[c.status]}>{c.status}</Badge>
                      )}
                    </td>
                    <td style={{ padding: "11px 14px", textAlign: "right" }}>
                      {canWrite && (
                        <div style={{ display: "flex", gap: 5, justifyContent: "flex-end" }}>
                          <button onClick={() => { setForm({ ...c }); setModal(true); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 3 }}><Icon n="edit" size={12} color={C.dim} /></button>
                          <button onClick={() => del(c.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 3 }}><Icon n="trash" size={12} color={C.dim} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {modal && (
        <Modal title={form.id ? "Editar Ordem de Compra" : "Nova Ordem de Compra"} onClose={() => { setModal(false); setErros({}); }} wide>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 6, ...F }}>Obra *</div>
                <select value={form.obraId || ""} onChange={e => setForm(f => ({ ...f, obraId: parseInt(e.target.value) }))} style={{ width: "100%", background: "rgba(255,255,255,.04)", border: `1px solid ${erros.obraId ? "#ef4444" : C.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 12, color: C.text, outline: "none", ...F }}>
                  <option value="">Selecione...</option>
                  {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
                </select>
              </div>
              <Inp label="Data *" type="date" error={erros.data} value={form.data || ""} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
            </div>
            <Inp label="Descrição *" error={erros.descricao} value={form.descricao || ""} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 6, ...F }}>Insumo (opcional)</div>
              <select value={form.insumoId || ""} onChange={e => {
                const ins = insumos.find(i => i.id === parseInt(e.target.value));
                setForm(f => ({ ...f, insumoId: e.target.value ? parseInt(e.target.value) : null, valorUnit: ins?.custoUnit || f.valorUnit || "" }));
              }} style={{ width: "100%", background: "rgba(255,255,255,.04)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 12, color: C.text, outline: "none", ...F }}>
                <option value="">Selecione ou preencha manualmente...</option>
                {insumos.map(i => <option key={i.id} value={i.id}>{i.nome} ({i.unidade})</option>)}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <Inp label="Quantidade" type="number" value={form.quantidade || ""} onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))} />
              <Inp label="Valor Unitário (R$)" type="number" value={form.valorUnit || ""} onChange={e => setForm(f => ({ ...f, valorUnit: e.target.value }))} />
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 6, ...F }}>Status</div>
                <select value={form.status || "Pendente"} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={{ width: "100%", background: "rgba(255,255,255,.04)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 12, color: C.text, outline: "none", ...F }}>
                  {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <Inp label="Fornecedor" value={form.fornecedor || ""} onChange={e => setForm(f => ({ ...f, fornecedor: e.target.value }))} />
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 6, ...F }}>Observações</div>
              <textarea value={form.obs || ""} onChange={e => setForm(f => ({ ...f, obs: e.target.value }))} rows={2} style={{ width: "100%", background: "rgba(255,255,255,.04)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 12, color: C.text, outline: "none", resize: "vertical", ...F, fontFamily: "inherit" }} />
            </div>
            {form.quantidade > 0 && form.valorUnit > 0 && (
              <div style={{ background: C.orangeDim, border: `1px solid ${C.orange}22`, borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: C.muted }}>Total da ordem</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: C.orange, ...F }}>{fmt(form.quantidade * form.valorUnit)}</span>
              </div>
            )}
            <div style={{ display: "flex", gap: 9, justifyContent: "flex-end", borderTop: `1px solid ${C.borderLight}`, paddingTop: 14 }}>
              <Btn v="secondary" onClick={() => { setModal(false); setErros({}); }}>Cancelar</Btn>
              <Btn onClick={save}><Icon n="check" size={13} />Salvar Ordem</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
