import { useState } from "react";
import { C, F } from "../constants/tokens";
import { isAtrasada, calcProg, validate, fmt, calcCustoEtapa } from "../utils/helpers";
import { Icon, Badge, Bar, Card, Modal, Inp, Sel, Txta, Btn, Hdr, Fld, MoneyInp } from "../components/ui";
import { avisarErro, avisarSucesso, confirmar } from "../utils/aviso";
import AnexosObra from "../components/AnexosObra";

export default function Obras({ data, setData, api, canWrite }) {
  const { obras, etapasObra, tiposEtapa, tiposObra = [], funcionarios = [] } = data;
  const colaboradores = funcionarios.filter(f => f.isColaborador);
  const [modal, setModal]           = useState(null);
  const [etModal, setEtModal]       = useState(false);
  const [form, setForm]             = useState({});
  const [etForm, setEtForm]         = useState({});
  const [etObraId, setEtObraId]     = useState(null);
  const [anexObra, setAnexObra]     = useState(null);
  const [erros, setErros]           = useState({});
  const [etErros, setEtErros]       = useState({});
  const [novaSubetapa, setNovaSubetapa] = useState({});
  const [editSub, setEditSub]           = useState(null);
  const [salvando, setSalvando]         = useState(false);
  const [salvandoEt, setSalvandoEt]     = useState(false);
  const [salvandoSub, setSalvandoSub]   = useState(false);

  // Preview das etapas do tipo selecionado (só na criação)
  const tipoSelecionado = modal === "new" && form.tipoObraId
    ? tiposObra.find(t => t.id === parseInt(form.tipoObraId))
    : null;

  const saveObra = async () => {
    if (salvando) return;
    const { ok, erros: e } = validate(form, {
      nome:        { required: true, label: "Nome" },
      local:       { required: true, label: "Local" },
      inicio:      { required: true, label: "Início" },
      previsaoFim: { required: true, label: "Previsão de Fim" },
      orcamento:   { required: true, min: 1, label: "Orçamento" },
    });
    if (!ok) { setErros(e); return; }
    setSalvando(true);
    try {
      if (modal === "new") {
        const nova = await api.post("/obras", form);
        const { etapas: novasEtapas = [], acessos: _, ...obraLimpa } = nova;
        setData(d => ({
          ...d,
          obras:     [...d.obras, obraLimpa],
          etapasObra: [
            ...d.etapasObra,
            ...novasEtapas.map(e => ({ ...e, obraId: nova.id })),
          ],
        }));
      } else {
        const atualizada = await api.put(`/obras/${form.id}`, form);
        const { etapas: _, acessos: _a, ...obraLimpa } = atualizada;
        setData(d => ({ ...d, obras: d.obras.map(o => o.id === form.id ? obraLimpa : o) }));
      }
      avisarSucesso("Obra salva.");
      setErros({}); setModal(null);
    } catch (err) { if (!err.limitePlano) avisarErro(err.message); }
    finally { setSalvando(false); }
  };

  const saveEt = async () => {
    if (salvandoEt) return;
    const { ok, erros: e } = validate(etForm, {
      tipoEtapaId: { required: true, label: "Tipo de Etapa" },
      dataInicioP: { required: true, label: "Início Previsto" },
      dataFimP:    { required: true, label: "Fim Previsto" },
    });
    if (!ok) { setEtErros(e); return; }
    setSalvandoEt(true);
    try {
      if (etForm.id) {
        const updated = await api.put(`/obras/${etObraId}/etapas/${etForm.id}`, etForm);
        setData(d => ({ ...d, etapasObra: d.etapasObra.map(x => x.id === etForm.id ? { ...updated, obraId: etObraId } : x) }));
      } else {
        const nova = await api.post(`/obras/${etObraId}/etapas`, { ...etForm, progresso: etForm.progresso || 0, status: etForm.status || "Pendente" });
        setData(d => ({ ...d, etapasObra: [...d.etapasObra, { ...nova, obraId: etObraId }] }));
      }
      avisarSucesso("Etapa salva.");
      setEtErros({}); setEtModal(false);
    } catch (err) { if (!err.limitePlano) avisarErro(err.message); }
    finally { setSalvandoEt(false); }
  };

  const delEt = async id => {
    if (!(await confirmar({ mensagem: "Remover etapa?", confirmarRotulo: "Remover", perigo: true }))) return;
    try {
      await api.del(`/obras/${etObraId}/etapas/${id}`);
      setData(d => ({ ...d, etapasObra: d.etapasObra.filter(e => e.id !== id) }));
    } catch (err) { if (!err.limitePlano) avisarErro(err.message); }
  };

  const updateEtapaProgresso = (etapaId, progresso, subetapas) => {
    setData(d => ({ ...d, etapasObra: d.etapasObra.map(e => e.id === etapaId ? { ...e, progresso, subetapas } : e) }));
  };

  const addSubetapa = async (etapaId) => {
    const nome = (novaSubetapa[etapaId] || "").trim();
    if (!nome) return;
    try {
      const sub = await api.post(`/obras/${etObraId}/etapas/${etapaId}/subetapas`, { nome });
      setData(d => ({ ...d, etapasObra: d.etapasObra.map(e => e.id === etapaId ? { ...e, subetapas: [...(e.subetapas || []), sub] } : e) }));
      setNovaSubetapa(s => ({ ...s, [etapaId]: "" }));
    } catch (err) { if (!err.limitePlano) avisarErro(err.message); }
  };

  const toggleSubetapa = async (etapaId, sub) => {
    try {
      const res = await api.put(`/obras/${etObraId}/etapas/${etapaId}/subetapas/${sub.id}`, { concluida: !sub.concluida });
      setData(d => ({ ...d, etapasObra: d.etapasObra.map(e => {
        if (e.id !== etapaId) return e;
        const subs = (e.subetapas || []).map(s => s.id === sub.id ? { ...s, concluida: !s.concluida } : s);
        return { ...e, progresso: res.progressoEtapa ?? e.progresso, subetapas: subs };
      }) }));
    } catch (err) { if (!err.limitePlano) avisarErro(err.message); }
  };

  const saveSubetapa = async () => {
    if (!editSub || salvandoSub) return;
    setSalvandoSub(true);
    try {
      const { id, etapaId, nome, dataInicioP, dataFimP, dataInicioR, dataFimR } = editSub;
      const res = await api.put(`/obras/${etObraId}/etapas/${etapaId}/subetapas/${id}`, { nome, dataInicioP, dataFimP, dataInicioR, dataFimR });
      setData(d => ({ ...d, etapasObra: d.etapasObra.map(e => {
        if (e.id !== etapaId) return e;
        const subs = (e.subetapas || []).map(s => s.id === id ? { ...s, nome, dataInicioP, dataFimP, dataInicioR, dataFimR } : s);
        return { ...e, progresso: res.progressoEtapa ?? e.progresso, subetapas: subs };
      }) }));
      avisarSucesso("Subetapa salva.");
      setEditSub(null);
    } catch (err) { if (!err.limitePlano) avisarErro(err.message); }
    finally { setSalvandoSub(false); }
  };

  const delSubetapa = async (etapaId, subId) => {
    try {
      await api.del(`/obras/${etObraId}/etapas/${etapaId}/subetapas/${subId}`);
      setData(d => ({ ...d, etapasObra: d.etapasObra.map(e => {
        if (e.id !== etapaId) return e;
        const subs = (e.subetapas || []).filter(s => s.id !== subId);
        const prog = subs.length ? Math.round(subs.filter(s => s.concluida).length / subs.length * 100) : e.progresso;
        return { ...e, progresso: prog, subetapas: subs };
      }) }));
    } catch (err) { if (!err.limitePlano) avisarErro(err.message); }
  };

  const delObra = async id => {
    if (!(await confirmar({ mensagem: "Remover obra?", confirmarRotulo: "Remover", perigo: true }))) return;
    try {
      await api.del(`/obras/${id}`);
      setData(d => ({ ...d, obras: d.obras.filter(o => o.id !== id), etapasObra: d.etapasObra.filter(e => e.obraId !== id) }));
    } catch (err) { if (!err.limitePlano) avisarErro(err.message); }
  };

  const sc = { Planejada: "default", "Em andamento": "orange", Pausada: "yellow", Concluída: "green" };

  return (
    <div>
      <Hdr title="Obras" action={canWrite && <Btn onClick={() => { setForm({ status: "Planejada" }); setModal("new"); }}><Icon n="plus" size={13} />Nova Obra</Btn>} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(290px,1fr))", gap: 12 }}>
        {obras.map(o => {
          const et   = etapasObra.filter(e => e.obraId === o.id);
          const prog = calcProg(o.id, etapasObra);
          const atrs = et.filter(e => isAtrasada(e)).length;
          return (
            <Card key={o.id}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 9 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: C.text, ...F, letterSpacing: "-0.02em", paddingRight: 8 }}>{o.nome}</div>
                <Badge v={sc[o.status] || "default"} dot>{o.status}</Badge>
              </div>
              {/* Tipo de obra */}
              {o.tipoObra && (
                <div style={{ fontSize: 10, color: C.orange, marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                  <Icon n="building" size={9} color={C.orange} />{o.tipoObra.nome}
                </div>
              )}
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
                <Btn v="outline" onClick={() => setAnexObra(o)} sx={{ fontSize: 11, padding: "5px 11px" }}><Icon n="file" size={12} />Anexos</Btn>
                {canWrite && (
                  <>
                    <Btn v="secondary" onClick={() => { setForm({ ...o, tipoObraId: o.tipoObraId || "" }); setModal("edit"); }} sx={{ fontSize: 11, padding: "5px 11px" }}><Icon n="edit" size={12} />Editar</Btn>
                    <Btn v="danger" onClick={() => delObra(o.id)} sx={{ fontSize: 11, padding: "5px 11px" }}><Icon n="trash" size={12} /></Btn>
                  </>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* ── Modal Nova / Editar Obra ────────────────────────────────────────── */}
      {modal && (
        <Modal title={modal === "new" ? "Nova Obra" : "Editar Obra"} onClose={() => { setModal(null); setErros({}); }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Inp label="Nome" error={erros.nome} value={form.nome || ""} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
            <Inp label="Local" error={erros.local} value={form.local || ""} onChange={e => setForm(f => ({ ...f, local: e.target.value }))} />
            <Sel label="Responsável" value={form.responsavel || ""} onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))}>
              <option value="">Sem responsável</option>
              {colaboradores.map(c => <option key={c.id} value={c.nome}>{c.nome}{c.cargo ? ` — ${c.cargo}` : ""}</option>)}
            </Sel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Inp label="Início" type="date" error={erros.inicio} value={form.inicio || ""} onChange={e => setForm(f => ({ ...f, inicio: e.target.value }))} />
              <Inp label="Previsão de Fim" type="date" error={erros.previsaoFim} value={form.previsaoFim || ""} onChange={e => setForm(f => ({ ...f, previsaoFim: e.target.value }))} />
            </div>
            <MoneyInp label="Orçamento" error={erros.orcamento} value={form.orcamento ?? ""} onChange={e => setForm(f => ({ ...f, orcamento: e.target.value }))} />
            <Sel label="Status" value={form.status || "Planejada"} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              {["Planejada", "Em andamento", "Pausada", "Concluída"].map(s => <option key={s}>{s}</option>)}
            </Sel>

            {/* Tipo de Obra */}
            <Sel
              label={modal === "new" ? "Tipo de Obra (opcional — cria etapas automaticamente)" : "Tipo de Obra"}
              value={form.tipoObraId || ""}
              onChange={e => setForm(f => ({ ...f, tipoObraId: e.target.value ? parseInt(e.target.value) : null }))}>
              <option value="">Sem tipo (etapas manuais)</option>
              {tiposObra.filter(t => t.ativo !== false).map(t => (
                <option key={t.id} value={t.id}>{t.nome}{t.etapas?.length ? ` (${t.etapas.length} etapas)` : ""}</option>
              ))}
            </Sel>

            {/* Preview das etapas que serão auto-criadas */}
            {tipoSelecionado && (tipoSelecionado.etapas || []).length > 0 && (
              <div style={{ background: C.orangeDim, border: "1px solid rgba(249,115,22,.2)", borderRadius: 10, padding: "11px 14px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.orange, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon n="checklist" size={12} color={C.orange} />
                  {tipoSelecionado.etapas.length} etapas serão criadas automaticamente
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {tipoSelecionado.etapas.map(e => (
                    <span key={e.id} style={{ fontSize: 10, color: C.muted, background: "rgba(255,255,255,.05)", border: `1px solid ${C.borderLight}`, borderRadius: 5, padding: "2px 8px" }}>
                      {e.tipoEtapa?.nome}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <Txta label="Descrição" rows={3} value={form.descricao || ""} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
            <div style={{ display: "flex", gap: 9, justifyContent: "flex-end" }}>
              <Btn v="secondary" onClick={() => { setModal(null); setErros({}); }}>Cancelar</Btn>
              <Btn disabled={salvando} onClick={saveObra}><Icon n="check" size={13} />{salvando ? "Salvando..." : "Salvar"}</Btn>
            </div>
          </div>
        </Modal>
      )}

      {anexObra && (
        <AnexosObra obra={anexObra} api={api} canWrite={canWrite} onClose={() => setAnexObra(null)} />
      )}

      {/* ── Modal Etapas da Obra ────────────────────────────────────────────── */}
      {etObraId !== null && (() => {
        const obra = obras.find(o => o.id === etObraId);
        const ets  = etapasObra.filter(e => e.obraId === etObraId).sort((a, b) => new Date(a.dataInicioP) - new Date(b.dataInicioP));
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
                    <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
                      <div style={{ flex: 1 }}><Bar val={e.progresso} color={at ? C.red : e.progresso === 100 ? C.green : C.orange} /></div>
                      <span style={{ fontSize: 11, color: C.muted, width: 26, textAlign: "right" }}>{e.progresso}%</span>
                    </div>

                    {/* ── Subetapas ── */}
                    <div style={{ marginBottom: 6 }}>
                      {(e.subetapas || []).map(sub => (
                        <div key={sub.id} style={{ borderBottom: `1px solid ${C.borderLight}`, paddingBottom: 6, marginBottom: 6 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                            <button onClick={() => toggleSubetapa(e.id, sub)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", flexShrink: 0 }}>
                              <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${sub.concluida ? C.green : C.border}`, background: sub.concluida ? C.green : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                {sub.concluida && <Icon n="check" size={9} color="#fff" />}
                              </div>
                            </button>
                            <span style={{ flex: 1, fontSize: 12, color: sub.concluida ? C.dim : C.text, textDecoration: sub.concluida ? "line-through" : "none", ...F }}>{sub.nome}</span>
                            {canWrite && <>
                              <button onClick={() => setEditSub(editSub?.id === sub.id ? null : { ...sub, etapaId: e.id })} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", opacity: 0.5 }}><Icon n="edit" size={10} color={C.dim} /></button>
                              <button onClick={() => delSubetapa(e.id, sub.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", opacity: 0.4 }}><Icon n="trash" size={10} color={C.dim} /></button>
                            </>}
                          </div>
                          {/* Datas resumidas */}
                          {(sub.dataInicioP || sub.dataInicioR) && editSub?.id !== sub.id && (
                            <div style={{ display: "flex", gap: 10, marginTop: 4, marginLeft: 23, fontSize: 10, color: C.dim }}>
                              {sub.dataInicioP && <span><Icon n="cal" size={9} color={C.dim} /> Prev: {sub.dataInicioP}{sub.dataFimP ? ` → ${sub.dataFimP}` : ""}</span>}
                              {sub.dataInicioR && <span style={{ color: C.green }}><Icon n="check" size={9} color={C.green} /> Real: {sub.dataInicioR}{sub.dataFimR ? ` → ${sub.dataFimR}` : " → em andamento"}</span>}
                            </div>
                          )}
                          {/* Formulário inline de edição */}
                          {editSub?.id === sub.id && (
                            <div style={{ marginTop: 8, marginLeft: 23, display: "flex", flexDirection: "column", gap: 7 }}>
                              <input value={editSub.nome || ""} onChange={ev => setEditSub(s => ({ ...s, nome: ev.target.value }))} placeholder="Nome da subetapa" style={{ background: "rgba(255,255,255,.04)", border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 8px", color: C.text, fontSize: 12, outline: "none", ...F }} />
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                                <label style={{ fontSize: 10, color: C.muted }}>Início previsto<input type="date" value={editSub.dataInicioP || ""} onChange={ev => setEditSub(s => ({ ...s, dataInicioP: ev.target.value }))} style={{ display: "block", width: "100%", marginTop: 2, background: "rgba(255,255,255,.04)", border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 7px", color: C.text, fontSize: 11, outline: "none" }} /></label>
                                <label style={{ fontSize: 10, color: C.muted }}>Fim previsto<input type="date" value={editSub.dataFimP || ""} onChange={ev => setEditSub(s => ({ ...s, dataFimP: ev.target.value }))} style={{ display: "block", width: "100%", marginTop: 2, background: "rgba(255,255,255,.04)", border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 7px", color: C.text, fontSize: 11, outline: "none" }} /></label>
                                <label style={{ fontSize: 10, color: C.muted }}>Início real<input type="date" value={editSub.dataInicioR || ""} onChange={ev => setEditSub(s => ({ ...s, dataInicioR: ev.target.value }))} style={{ display: "block", width: "100%", marginTop: 2, background: "rgba(255,255,255,.04)", border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 7px", color: C.text, fontSize: 11, outline: "none" }} /></label>
                                <label style={{ fontSize: 10, color: C.muted }}>Fim real<input type="date" value={editSub.dataFimR || ""} onChange={ev => setEditSub(s => ({ ...s, dataFimR: ev.target.value }))} style={{ display: "block", width: "100%", marginTop: 2, background: "rgba(255,255,255,.04)", border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 7px", color: C.text, fontSize: 11, outline: "none" }} /></label>
                              </div>
                              <div style={{ display: "flex", gap: 6 }}>
                                <button disabled={salvandoSub} onClick={saveSubetapa} style={{ background: C.orange, border: "none", borderRadius: 6, padding: "4px 12px", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", ...F }}>{salvandoSub ? "Salvando..." : "Salvar"}</button>
                                <button onClick={() => setEditSub(null)} style={{ background: "rgba(255,255,255,.06)", border: "none", borderRadius: 6, padding: "4px 10px", color: C.muted, fontSize: 11, cursor: "pointer" }}>Cancelar</button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      {canWrite && (
                        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                          <input
                            placeholder="Nova subetapa..."
                            value={novaSubetapa[e.id] || ""}
                            onChange={ev => setNovaSubetapa(s => ({ ...s, [e.id]: ev.target.value }))}
                            onKeyDown={ev => ev.key === "Enter" && addSubetapa(e.id)}
                            style={{ flex: 1, background: "rgba(255,255,255,.04)", border: `1px solid ${C.border}`, borderRadius: 7, padding: "5px 9px", color: C.text, fontSize: 12, outline: "none", ...F }}
                          />
                          <button onClick={() => addSubetapa(e.id)} style={{ background: C.orangeDim, border: "none", borderRadius: 7, padding: "5px 10px", cursor: "pointer", color: C.orange, display: "flex", alignItems: "center" }}>
                            <Icon n="plus" size={12} color={C.orange} />
                          </button>
                        </div>
                      )}
                    </div>

                    {(() => {
                      // Custo realizado da etapa: lançamentos apropriados a ela
                      const c = calcCustoEtapa(e.id, data);
                      if (!c.total && !e.orcamento) return null;
                      const pct = e.orcamento > 0 ? Math.round(c.total / e.orcamento * 100) : null;
                      const estourou = pct != null && pct > 100;
                      return (
                        <div style={{ marginTop: 9, paddingTop: 9, borderTop: `1px solid ${C.borderLight}` }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                            <span style={{ fontSize: 10, color: C.muted }}>
                              Realizado <b style={{ color: estourou ? C.red : C.text, ...F }}>{fmt(c.total)}</b>
                              {e.orcamento > 0 && <span style={{ color: C.dim }}> de {fmt(e.orcamento)}</span>}
                            </span>
                            {pct != null && (
                              <span style={{ fontSize: 10, fontWeight: 700, color: estourou ? C.red : pct > 80 ? C.yellow : C.green, ...F }}>{pct}%</span>
                            )}
                          </div>
                          {e.orcamento > 0 && <Bar val={Math.min(100, pct)} color={estourou ? C.red : pct > 80 ? C.yellow : C.green} />}
                          {c.total > 0 && (
                            <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginTop: 5 }}>
                              {[["Insumos", c.ins, C.orange], ["Máquina", c.maq, "#60a5fa"], ["Mão de obra", c.mo, "#a78bfa"], ["Despesas", c.desp, "#f472b6"]]
                                .filter(([, v]) => v > 0)
                                .map(([l, v, col]) => (
                                  <span key={l} style={{ fontSize: 10, color: C.dim }}>
                                    <span style={{ color: col, fontWeight: 700 }}>●</span> {l}: {fmt(v)}
                                  </span>
                                ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
              {!ets.length && <div style={{ textAlign: "center", padding: "40px 0", color: C.dim, fontSize: 12 }}>Nenhuma etapa adicionada.</div>}
            </div>
          </Modal>
        );
      })()}

      {/* ── Modal Adicionar / Editar Etapa ──────────────────────────────────── */}
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
            <MoneyInp label="Orçamento da Etapa"
              value={etForm.orcamento ?? ""} onChange={e => setEtForm(f => ({ ...f, orcamento: e.target.value }))} />
            {!(etForm.subetapas?.length) && (
              <Fld label={`Progresso: ${etForm.progresso || 0}%`}>
                <input type="range" min="0" max="100" value={etForm.progresso || 0} onChange={e => setEtForm(f => ({ ...f, progresso: parseInt(e.target.value) }))} style={{ width: "100%", accentColor: C.orange }} />
              </Fld>
            )}
            {!!(etForm.subetapas?.length) && (
              <div style={{ fontSize: 11, color: C.muted, background: "rgba(167,139,250,.06)", border: "1px solid rgba(167,139,250,.18)", borderRadius: 9, padding: "8px 12px" }}>
                Progresso calculado automaticamente pelas subetapas ({etForm.progresso || 0}%)
              </div>
            )}
            <div style={{ display: "flex", gap: 9, justifyContent: "flex-end" }}>
              <Btn v="secondary" onClick={() => { setEtModal(false); setEtErros({}); }}>Cancelar</Btn>
              <Btn disabled={salvandoEt} onClick={saveEt}><Icon n="check" size={13} />{salvandoEt ? "Salvando..." : "Salvar"}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
