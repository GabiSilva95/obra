import { useState } from "react";
import { C, F } from "../constants/tokens";
import { isAtrasada, calcProg, validate } from "../utils/helpers";
import { Icon, Badge, Bar, Card, Modal, Inp, Sel, Txta, Btn, Hdr, Fld } from "../components/ui";

export default function Obras({ data, setData, api, canWrite }) {
  const { obras, etapasObra, tiposEtapa } = data;
  const [modal, setModal] = useState(null);
  const [etModal, setEtModal] = useState(false);
  const [form, setForm] = useState({});
  const [etForm, setEtForm] = useState({});
  const [etObraId, setEtObraId] = useState(null);
  const [erros, setErros] = useState({});
  const [etErros, setEtErros] = useState({});

  const saveObra = async () => {
    const { ok, erros: e } = validate(form, {
      nome:        { required: true, label: "Nome" },
      local:       { required: true, label: "Local" },
      inicio:      { required: true, label: "Início" },
      previsaoFim: { required: true, label: "Previsão de Fim" },
      orcamento:   { required: true, min: 1, label: "Orçamento" },
    });
    if (!ok) { setErros(e); return; }
    try {
      if (modal === "new") {
        const nova = await api.post("/obras", form);
        setData(d => ({ ...d, obras: [...d.obras, nova] }));
      } else {
        const atualizada = await api.put(`/obras/${form.id}`, form);
        setData(d => ({ ...d, obras: d.obras.map(o => o.id === form.id ? atualizada : o) }));
      }
      setErros({}); setModal(null);
    } catch (err) { alert(err.message); }
  };
  const saveEt = async () => {
    const { ok, erros: e } = validate(etForm, {
      tipoEtapaId: { required: true, label: "Tipo de Etapa" },
      dataInicioP: { required: true, label: "Início Previsto" },
      dataFimP:    { required: true, label: "Fim Previsto" },
    });
    if (!ok) { setEtErros(e); return; }
    try {
      if (etForm.id) {
        const updated = await api.put(`/obras/${etObraId}/etapas/${etForm.id}`, etForm);
        setData(d => ({ ...d, etapasObra: d.etapasObra.map(x => x.id === etForm.id ? { ...updated, obraId: etObraId } : x) }));
      } else {
        const nova = await api.post(`/obras/${etObraId}/etapas`, { ...etForm, progresso: etForm.progresso || 0, status: etForm.status || "Pendente" });
        setData(d => ({ ...d, etapasObra: [...d.etapasObra, { ...nova, obraId: etObraId }] }));
      }
      setEtErros({}); setEtModal(false);
    } catch (err) { alert(err.message); }
  };
  const delEt = async id => {
    if (!confirm("Remover etapa?")) return;
    try {
      await api.del(`/obras/${etObraId}/etapas/${id}`);
      setData(d => ({ ...d, etapasObra: d.etapasObra.filter(e => e.id !== id) }));
    } catch (err) { alert(err.message); }
  };
  const delObra = async id => {
    if (!confirm("Remover obra?")) return;
    try {
      await api.del(`/obras/${id}`);
      setData(d => ({ ...d, obras: d.obras.filter(o => o.id !== id), etapasObra: d.etapasObra.filter(e => e.obraId !== id) }));
    } catch (err) { alert(err.message); }
  };
  const sc = { Planejada: "default", "Em andamento": "orange", Pausada: "yellow", Concluída: "green" };

  return (
    <div>
      <Hdr title="Obras" action={canWrite && <Btn onClick={() => { setForm({ status: "Planejada" }); setModal("new"); }}><Icon n="plus" size={13} />Nova Obra</Btn>} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(290px,1fr))", gap: 12 }}>
        {obras.map(o => {
          const et = etapasObra.filter(e => e.obraId === o.id);
          const prog = calcProg(o.id, etapasObra);
          const atrs = et.filter(e => isAtrasada(e)).length;
          return (
            <Card key={o.id}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 9 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: C.text, ...F, letterSpacing: "-0.02em", paddingRight: 8 }}>{o.nome}</div>
                <Badge v={sc[o.status] || "default"} dot>{o.status}</Badge>
              </div>
              <div style={{ fontSize: 11, color: C.muted, display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}><Icon n="pin" size={10} color={C.dim} />{o.local}</div>
              <div style={{ fontSize: 11, color: C.muted, display: "flex", alignItems: "center", gap: 4, marginBottom: 12 }}><Icon n="user" size={10} color={C.dim} />{o.responsavel}</div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}><span style={{ fontSize: 10, color: C.muted }}>Progresso</span><span style={{ fontSize: 10, fontWeight: 700, color: C.text }}>{prog}%</span></div>
                <Bar val={prog} color={C.orange} />
              </div>
              <div style={{ fontSize: 11, color: C.muted, display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
                <Icon n="cal" size={10} color={C.dim} />{o.inicio} → {o.previsaoFim}
                {atrs > 0 && <Badge v="red">{atrs} atraso{atrs > 1 ? "s" : ""}</Badge>}
              </div>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                <Btn v="outline" onClick={() => setEtObraId(o.id)} sx={{ fontSize: 11, padding: "5px 11px" }}><Icon n="checklist" size={12} />Etapas ({et.length})</Btn>
                {canWrite && (
                  <>
                    <Btn v="secondary" onClick={() => { setForm({ ...o }); setModal("edit"); }} sx={{ fontSize: 11, padding: "5px 11px" }}><Icon n="edit" size={12} />Editar</Btn>
                    <Btn v="danger" onClick={() => delObra(o.id)} sx={{ fontSize: 11, padding: "5px 11px" }}><Icon n="trash" size={12} /></Btn>
                  </>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {modal && (
        <Modal title={modal === "new" ? "Nova Obra" : "Editar Obra"} onClose={() => { setModal(null); setErros({}); }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Inp label="Nome" error={erros.nome} value={form.nome || ""} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
            <Inp label="Local" error={erros.local} value={form.local || ""} onChange={e => setForm(f => ({ ...f, local: e.target.value }))} />
            <Inp label="Responsável" value={form.responsavel || ""} onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Inp label="Início" type="date" error={erros.inicio} value={form.inicio || ""} onChange={e => setForm(f => ({ ...f, inicio: e.target.value }))} />
              <Inp label="Previsão de Fim" type="date" error={erros.previsaoFim} value={form.previsaoFim || ""} onChange={e => setForm(f => ({ ...f, previsaoFim: e.target.value }))} />
            </div>
            <Inp label="Orçamento (R$)" type="number" error={erros.orcamento} value={form.orcamento || ""} onChange={e => setForm(f => ({ ...f, orcamento: parseFloat(e.target.value) }))} />
            <Sel label="Status" value={form.status || "Planejada"} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              {["Planejada", "Em andamento", "Pausada", "Concluída"].map(s => <option key={s}>{s}</option>)}
            </Sel>
            <Txta label="Descrição" rows={3} value={form.descricao || ""} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
            <div style={{ display: "flex", gap: 9, justifyContent: "flex-end" }}>
              <Btn v="secondary" onClick={() => { setModal(null); setErros({}); }}>Cancelar</Btn>
              <Btn onClick={saveObra}><Icon n="check" size={13} />Salvar</Btn>
            </div>
          </div>
        </Modal>
      )}

      {etObraId !== null && (() => {
        const obra = obras.find(o => o.id === etObraId);
        const ets = etapasObra.filter(e => e.obraId === etObraId).sort((a, b) => new Date(a.dataInicioP) - new Date(b.dataInicioP));
        const smap = { Concluída: "green", "Em andamento": "orange", Atrasada: "red", Pendente: "default", Pausada: "yellow" };
        return (
          <Modal title={`Etapas — ${obra?.nome}`} onClose={() => setEtObraId(null)} wide>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
              {canWrite && <Btn onClick={() => { setEtForm({ obraId: etObraId }); setEtModal(true); }}><Icon n="plus" size={13} />Adicionar Etapa</Btn>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {ets.map(e => {
                const tp = tiposEtapa.find(t => t.id === e.tipoEtapaId);
                const at = isAtrasada(e);
                return (
                  <div key={e.id} style={{ background: at ? "rgba(239,68,68,.05)" : "rgba(255,255,255,.02)", border: `1px solid ${at ? "rgba(239,68,68,.18)" : C.borderLight}`, borderRadius: 11, padding: 13 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 7 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: C.orangeDim, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Icon n={tp?.icon || "checklist"} size={13} color={C.orange} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.text, ...F }}>{tp?.nome}</span>
                        {at && <Badge v="red"><Icon n="alert" size={9} />Atrasada</Badge>}
                        <Badge v={smap[e.status] || "default"}>{e.status}</Badge>
                      </div>
                      {canWrite && (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => { setEtForm({ ...e }); setEtModal(true); }} style={{ background: "none", border: "none", cursor: "pointer", color: C.dim, display: "flex" }}><Icon n="edit" size={12} color={C.dim} /></button>
                          <button onClick={() => delEt(e.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.dim, display: "flex" }}><Icon n="trash" size={12} color={C.dim} /></button>
                        </div>
                      )}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, fontSize: 11, color: C.muted, marginBottom: 9 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Icon n="cal" size={10} color={C.dim} />Prev: {e.dataInicioP} → {e.dataFimP}</span>
                      {e.dataInicioR && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Icon n="check" size={10} color={C.green} />Real: {e.dataInicioR} → {e.dataFimR || "Em andamento"}</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <div style={{ flex: 1 }}><Bar val={e.progresso} color={at ? C.red : e.progresso === 100 ? C.green : C.orange} /></div>
                      <span style={{ fontSize: 11, color: C.muted, width: 26, textAlign: "right" }}>{e.progresso}%</span>
                    </div>
                  </div>
                );
              })}
              {!ets.length && <div style={{ textAlign: "center", padding: "40px 0", color: C.dim, fontSize: 12 }}>Nenhuma etapa adicionada.</div>}
            </div>
          </Modal>
        );
      })()}

      {etModal && (
        <Modal title={etForm.id ? "Editar Etapa" : "Adicionar Etapa"} onClose={() => { setEtModal(false); setEtErros({}); }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Sel label="Tipo de Etapa" error={etErros.tipoEtapaId} value={etForm.tipoEtapaId || ""} onChange={e => setEtForm(f => ({ ...f, tipoEtapaId: parseInt(e.target.value) }))}>
              <option value="">Selecione...</option>
              {tiposEtapa.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </Sel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Inp label="Início Previsto" type="date" error={etErros.dataInicioP} value={etForm.dataInicioP || ""} onChange={e => setEtForm(f => ({ ...f, dataInicioP: e.target.value }))} />
              <Inp label="Fim Previsto" type="date" error={etErros.dataFimP} value={etForm.dataFimP || ""} onChange={e => setEtForm(f => ({ ...f, dataFimP: e.target.value }))} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Inp label="Início Real" type="date" value={etForm.dataInicioR || ""} onChange={e => setEtForm(f => ({ ...f, dataInicioR: e.target.value }))} />
              <Inp label="Fim Real" type="date" value={etForm.dataFimR || ""} onChange={e => setEtForm(f => ({ ...f, dataFimR: e.target.value }))} />
            </div>
            <Sel label="Status" value={etForm.status || "Pendente"} onChange={e => setEtForm(f => ({ ...f, status: e.target.value }))}>
              {["Pendente", "Em andamento", "Concluída", "Atrasada", "Pausada"].map(s => <option key={s}>{s}</option>)}
            </Sel>
            <Fld label={`Progresso: ${etForm.progresso || 0}%`}>
              <input type="range" min="0" max="100" value={etForm.progresso || 0} onChange={e => setEtForm(f => ({ ...f, progresso: parseInt(e.target.value) }))} style={{ width: "100%", accentColor: C.orange }} />
            </Fld>
            <div style={{ display: "flex", gap: 9, justifyContent: "flex-end" }}>
              <Btn v="secondary" onClick={() => { setEtModal(false); setEtErros({}); }}>Cancelar</Btn>
              <Btn onClick={saveEt}><Icon n="check" size={13} />Salvar</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
