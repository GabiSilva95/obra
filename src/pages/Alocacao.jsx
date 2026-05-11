import { useState } from "react";
import { C, F } from "../constants/tokens";
import { today, fmt, validate } from "../utils/helpers";
import { Icon, Card, Modal, Inp, Sel, Txta, Btn, Hdr, DSel } from "../components/ui";

export default function Alocacao({ data, setData, api, canWrite }) {
  const { obras, maquinas, insumos, alocacoes } = data;
  const [obraId, setObraId] = useState(obras[0]?.id || null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ tipo: "maquina" });
  const [erros, setErros] = useState({});

  const itens = alocacoes.filter(a => a.obraId === obraId).sort((a, b) => b.data.localeCompare(a.data));
  const save = async () => {
    const { ok, erros: e } = validate(form, {
      referenciaId: { required: true, label: form.tipo === "maquina" ? "Máquina" : "Insumo" },
      quantidade:   { required: true, min: 0.01, label: form.tipo === "maquina" ? "Horas Utilizadas" : "Quantidade" },
      data:         { required: true, label: "Data" },
    });
    if (!ok) { setErros(e); return; }
    try {
      const nova = await api.post("/alocacao", { obraId, tipo: form.tipo, referenciaId: parseInt(form.referenciaId), quantidade: parseFloat(form.quantidade), data: form.data || today(), obs: form.obs || "" });
      setData(d => ({ ...d, alocacoes: [...d.alocacoes, { ...nova, referenciaId: nova.maquinaId || nova.insumoId }] }));
      setErros({}); setModal(false); setForm({ tipo: "maquina" });
    } catch (err) { alert(err.message); }
  };
  const del = async id => {
    if (!confirm("Remover?")) return;
    try {
      await api.del(`/alocacao/${id}`);
      setData(d => ({ ...d, alocacoes: d.alocacoes.filter(a => a.id !== id) }));
    } catch (err) { alert(err.message); }
  };
  const tMaq = itens.filter(a => a.tipo === "maquina").reduce((s, a) => { const m = maquinas.find(x => x.id === a.referenciaId); return s + (m ? m.custoHora * a.quantidade : 0); }, 0);
  const tIns = itens.filter(a => a.tipo === "insumo").reduce((s, a) => { const i = insumos.find(x => x.id === a.referenciaId); return s + (i ? i.custoUnit * a.quantidade : 0); }, 0);

  return (
    <div>
      <Hdr
        title="Lançamento de Alocação"
        sub="Registre uso de máquinas e insumos por obra"
        action={
          <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
            <DSel value={obraId} onChange={e => setObraId(parseInt(e.target.value))}>
              {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
            </DSel>
            {canWrite && <Btn onClick={() => { setForm({ tipo: "maquina" }); setModal(true); }}><Icon n="plus" size={13} />Nova Alocação</Btn>}
          </div>
        }
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
        <Card style={{ background: "rgba(96,165,250,.04)", borderColor: "rgba(96,165,250,.12)", padding: 16 }}>
          <div style={{ fontSize: 11, color: C.blue, marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}><Icon n="excavator" size={13} color={C.blue} />Custo de Máquinas</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.blue, ...F, letterSpacing: "-0.04em" }}>{fmt(tMaq)}</div>
        </Card>
        <Card style={{ background: C.orangeDim, borderColor: "rgba(249,115,22,.18)", padding: 16 }}>
          <div style={{ fontSize: 11, color: C.orange, marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}><Icon n="cube" size={13} color={C.orange} />Custo de Insumos</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.orange, ...F, letterSpacing: "-0.04em" }}>{fmt(tIns)}</div>
        </Card>
      </div>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "11px 14px", borderBottom: `1px solid ${C.borderLight}`, fontSize: 10, fontWeight: 700, color: C.dim, textTransform: "uppercase", letterSpacing: "0.08em", ...F }}>
          Alocações — {obras.find(o => o.id === obraId)?.nome}
        </div>
        {!itens.length && <div style={{ padding: "48px", textAlign: "center", color: C.dim, fontSize: 12 }}>Nenhuma alocação para esta obra.</div>}
        {itens.map(a => {
          const iM = a.tipo === "maquina";
          const ref = iM ? maquinas.find(m => m.id === a.referenciaId) : insumos.find(i => i.id === a.referenciaId);
          const custo = ref ? (iM ? ref.custoHora * a.quantidade : ref.custoUnit * a.quantidade) : 0;
          return (
            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 13, padding: "13px 14px", borderBottom: `1px solid ${C.borderLight}` }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: iM ? "rgba(96,165,250,.08)" : C.orangeDim, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon n={iM ? "excavator" : "cube"} size={15} color={iM ? C.blue : C.orange} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 12, color: C.text, ...F, letterSpacing: "-0.01em" }}>{ref?.nome || "—"}</div>
                <div style={{ fontSize: 11, color: C.muted, display: "flex", gap: 10, marginTop: 2 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Icon n="clock" size={10} color={C.dim} />{iM ? `${a.quantidade}h` : `${a.quantidade} ${ref?.unidade || ""}`}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Icon n="cal" size={10} color={C.dim} />{a.data}</span>
                  {a.obs && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Icon n="file" size={10} color={C.dim} />{a.obs}</span>}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: C.text, ...F }}>{fmt(custo)}</div>
                <div style={{ fontSize: 10, color: C.dim }}>{iM ? `${fmt(ref?.custoHora)}/h` : `${fmt(ref?.custoUnit)}/un`}</div>
              </div>
              {canWrite && <button onClick={() => del(a.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.dim, display: "flex", padding: 3, flexShrink: 0 }}><Icon n="trash" size={13} color={C.dim} /></button>}
            </div>
          );
        })}
      </Card>

      {modal && (
        <Modal title="Nova Alocação" onClose={() => { setModal(false); setErros({}); }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Sel label="Tipo" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value, referenciaId: "" }))}>
              <option value="maquina">Máquina / Equipamento</option>
              <option value="insumo">Insumo / Material</option>
            </Sel>
            <Sel label={form.tipo === "maquina" ? "Máquina" : "Insumo"} error={erros.referenciaId} value={form.referenciaId || ""} onChange={e => setForm(f => ({ ...f, referenciaId: e.target.value }))}>
              <option value="">Selecione...</option>
              {form.tipo === "maquina"
                ? maquinas.map(m => <option key={m.id} value={m.id}>{m.nome} ({fmt(m.custoHora)}/h)</option>)
                : insumos.map(i => <option key={i.id} value={i.id}>{i.nome} ({fmt(i.custoUnit)}/{i.unidade})</option>)}
            </Sel>
            <Inp label={form.tipo === "maquina" ? "Horas Utilizadas" : "Quantidade"} type="number" error={erros.quantidade} value={form.quantidade || ""} onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))} />
            <Inp label="Data" type="date" error={erros.data} value={form.data || today()} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
            <Txta label="Observações" rows={2} value={form.obs || ""} onChange={e => setForm(f => ({ ...f, obs: e.target.value }))} />
            <div style={{ display: "flex", gap: 9, justifyContent: "flex-end" }}>
              <Btn v="secondary" onClick={() => { setModal(false); setErros({}); }}>Cancelar</Btn>
              <Btn onClick={save}><Icon n="check" size={13} />Lançar</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
