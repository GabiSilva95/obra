import { useState } from "react";
import { C, F } from "../constants/tokens";
import { isAtrasada, calcProg, validate, fmt, calcCustoEtapa } from "../utils/helpers";
import { Icon, Badge, Bar, Card, Modal, Inp, Sel, Txta, Btn, Hdr, Fld, MoneyInp } from "../components/ui";
import { avisarErro, confirmar } from "../utils/aviso";
import AnexosObra from "../components/AnexosObra";

export default function Obras({ data, setData, api, canWrite }) {
  const { obras, etapasObra, tiposEtapa, tiposObra = [] } = data;
  const [modal, setModal]       = useState(null);
  const [etModal, setEtModal]   = useState(false);
  const [form, setForm]         = useState({});
  const [etForm, setEtForm]     = useState({});
  const [etObraId, setEtObraId] = useState(null);
  const [anexObra, setAnexObra] = useState(null);   // obra com anexos abertos
  const [erros, setErros]       = useState({});
  const [etErros, setEtErros]   = useState({});

  // Preview das etapas do tipo selecionado (só na criação)
  const tipoSelecionado = modal === "new" && form.tipoObraId
    ? tiposObra.find(t => t.id === parseInt(form.tipoObraId))
    : null;

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
        // O backend retorna obra com etapas e tipoObra embutidos
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
      setErros({}); setModal(null);
    } catch (err) { if (!err.limitePlano) avisarErro(err.message); }
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
    } catch (err) { if (!err.limitePlano) avisarErro(err.message); }
  };

  const delEt = async id => {
    if (!(await confirmar({ mensagem: "Remover etapa?", confirmarRotulo: "Remover", perigo: true }))) return;
    try {
      await api.del(`/obras/${etObraId}/etapas/${id}`);
      setData(d => ({ ...d, etapasObra: d.etapasObra.filter(e => e.id !== id) }));
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
            <Inp label="Responsável" value={form.responsavel || ""} onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))} />
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
              <Btn onClick={saveObra}><Icon n="check" size={13} />Salvar</Btn>
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
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <div style={{ flex: 1 }}><Bar val={e.progresso} color={at ? C.red : e.progresso === 100 ? C.green : C.orange} /></div>
                      <span style={{ fontSize: 11, color: C.muted, width: 26, textAlign: "right" }}>{e.progresso}%</span>
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
