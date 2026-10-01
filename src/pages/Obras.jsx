import { useState } from "react";
import { isAtrasada, calcProg, validate, fmt, calcCustoEtapa } from "../utils/helpers";
import { avisarErro, avisarSucesso, confirmar } from "../utils/aviso";
import AnexosObra from "../components/AnexosObra";
import { Badge, Banner, Button, Card, Checkbox, Field, Icon, IconButton, Input, Modal, MoneyInput, ProgressBar, SegmentedTabs, Select, Tag, Textarea } from "../../design-system";
import { PageActions } from "../components/PageActions";

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
  const [filtroStatus, setFiltroStatus] = useState("Todas");
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

  const sc = { Planejada: "neutral", "Em andamento": "info", Pausada: "warning", Concluída: "success" };
  const smap = { Concluída: "success", "Em andamento": "info", Atrasada: "error", Pendente: "neutral", Pausada: "warning" };
  const lista = filtroStatus === "Todas" ? obras : obras.filter(o => o.status === filtroStatus);
  const fecharObra = () => { setModal(null); setErros({}); };
  const fecharEt = () => { setEtModal(false); setEtErros({}); };
  const setF = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const setEF = k => e => setEtForm(f => ({ ...f, [k]: e.target.value }));
  const setSub = k => ev => setEditSub(s => ({ ...s, [k]: ev.target.value }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <PageActions>
        {canWrite && <Button iconLeft="plus" onClick={() => { setForm({ status: "Planejada" }); setModal("new"); }}>Nova obra</Button>}
      </PageActions>
      <SegmentedTabs variant="light" value={filtroStatus} onChange={setFiltroStatus}
        tabs={["Todas", "Em andamento", "Planejada", "Pausada", "Concluída"].map(v => ({ value: v, label: v === "Todas" ? "Todas" : v, count: v === "Todas" ? obras.length : obras.filter(o => o.status === v).length }))} />

      {lista.length === 0 && <p style={{ color: "var(--text-secondary)" }}>Nenhuma obra neste filtro.</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(var(--col-min-lg),1fr))", gap: "var(--space-6)" }}>
        {lista.map(o => {
          const et   = etapasObra.filter(e => e.obraId === o.id);
          const prog = calcProg(o.id, etapasObra);
          const atrs = et.filter(e => isAtrasada(e)).length;
          return (
            <Card key={o.id} title={o.nome} action={<Badge size="sm" tone={sc[o.status] || "neutral"}>{o.status}</Badge>}>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1-5)", color: "var(--text-secondary)", marginTop: "calc(-1 * var(--space-2))" }}>
                {o.tipoObra && <Tag tone="accent" style={{ alignSelf: "flex-start" }}>{o.tipoObra.nome}</Tag>}
                <span style={{ display: "flex", alignItems: "center", gap: "var(--space-1-5)" }}><Icon name="map-pin" size={16} />{o.local}</span>
                {o.responsavel && <span style={{ display: "flex", alignItems: "center", gap: "var(--space-1-5)" }}><Icon name="user" size={16} />{o.responsavel}</span>}
                <span style={{ display: "flex", alignItems: "center", gap: "var(--space-1-5)", flexWrap: "wrap" }}>
                  <Icon name="calendar" size={16} />{o.inicio} → {o.previsaoFim}
                  {atrs > 0 && <Badge size="sm" tone="error">{atrs} atraso{atrs > 1 ? "s" : ""}</Badge>}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1-5)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", font: "var(--type-label)" }}><span style={{ color: "var(--text-secondary)" }}>Progresso</span><span>{prog}%</span></div>
                <ProgressBar value={prog} color="var(--accent)" label="Progresso" />
              </div>
              <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", alignItems: "center" }}>
                <Button iconLeft="square-check" size="sm" variant="secondary" onClick={() => setEtObraId(o.id)}>Etapas ({et.length})</Button>
                <Button iconLeft="file-text" size="sm" variant="secondary" onClick={() => setAnexObra(o)}>Anexos</Button>
                {canWrite && (
                  <>
                    <span style={{ flex: 1 }} />
                    <IconButton icon="pencil" variant="outline" size={32} label="Editar" onClick={() => { setForm({ ...o, tipoObraId: o.tipoObraId || "" }); setModal("edit"); }} />
                    <IconButton icon="trash-2" variant="danger" size={32} label="Excluir" onClick={() => delObra(o.id)} />
                  </>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {modal && (
        <Modal title={modal === "new" ? "Nova obra" : "Editar obra"} onClose={fecharObra}
          footer={<><Button variant="secondary" onClick={fecharObra}>Cancelar</Button><Button iconLeft="check" loading={salvando} onClick={saveObra}>Salvar</Button></>}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <Input label="Nome" required error={erros.nome} value={form.nome || ""} onChange={setF("nome")} />
            <Input label="Local" required icon="map-pin" error={erros.local} value={form.local || ""} onChange={setF("local")} />
            <Select label="Responsável" value={form.responsavel || ""} onChange={setF("responsavel")}>
              <option value="">Sem responsável</option>
              {colaboradores.map(c => <option key={c.id} value={c.nome}>{c.nome}{c.cargo ? ` · ${c.cargo}` : ""}</option>)}
            </Select>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
              <Input label="Início" required type="date" error={erros.inicio} value={form.inicio || ""} onChange={setF("inicio")} />
              <Input label="Previsão de fim" required type="date" error={erros.previsaoFim} value={form.previsaoFim || ""} onChange={setF("previsaoFim")} />
            </div>
            <MoneyInput label="Orçamento" required error={erros.orcamento} value={form.orcamento ?? ""} onChange={setF("orcamento")} />
            <Select label="Status" value={form.status || "Planejada"} onChange={setF("status")}>
              {["Planejada", "Em andamento", "Pausada", "Concluída"].map(s => <option key={s}>{s}</option>)}
            </Select>
            <Select label="Tipo de obra" info={modal === "new" ? "Opcional: cria as etapas automaticamente" : undefined}
              value={form.tipoObraId || ""} onChange={e => setForm(f => ({ ...f, tipoObraId: e.target.value ? parseInt(e.target.value) : null }))}>
              <option value="">Sem tipo (etapas manuais)</option>
              {tiposObra.filter(t => t.ativo !== false).map(t => (
                <option key={t.id} value={t.id}>{t.nome}{t.etapas?.length ? ` (${t.etapas.length} etapas)` : ""}</option>
              ))}
            </Select>
            {tipoSelecionado && (tipoSelecionado.etapas || []).length > 0 && (
              <Banner tone="accent" title={`${tipoSelecionado.etapas.length} etapas serão criadas automaticamente`}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-1-5)", marginTop: "var(--space-2)" }}>
                  {tipoSelecionado.etapas.map(e => <Tag key={e.id} tone="neutral">{e.tipoEtapa?.nome}</Tag>)}
                </div>
              </Banner>
            )}
            <Textarea label="Descrição" rows={3} maxLength={1000} value={form.descricao || ""} onChange={setF("descricao")} />
          </div>
        </Modal>
      )}

      {anexObra && <AnexosObra obra={anexObra} api={api} canWrite={canWrite} onClose={() => setAnexObra(null)} />}

      {etObraId !== null && (() => {
        const obra = obras.find(o => o.id === etObraId);
        const ets  = etapasObra.filter(e => e.obraId === etObraId).sort((a, b) => new Date(a.dataInicioP) - new Date(b.dataInicioP));
        return (
          <Modal title={`Etapas · ${obra?.nome}`} onClose={() => setEtObraId(null)} wide
            footer={canWrite ? <Button iconLeft="plus" onClick={() => { setEtForm({ obraId: etObraId }); setEtModal(true); }}>Adicionar etapa</Button> : undefined}>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {!ets.length && <p style={{ textAlign: "center", padding: "var(--space-10) 0", color: "var(--text-secondary)" }}>Nenhuma etapa adicionada.</p>}
              {ets.map(e => {
                const tp = tiposEtapa.find(t => t.id === e.tipoEtapaId);
                const at = isAtrasada(e);
                const c = calcCustoEtapa(e.id, data);
                const pct = e.orcamento > 0 ? Math.round(c.total / e.orcamento * 100) : null;
                const estourou = pct != null && pct > 100;
                return (
                  <div key={e.id} style={{ background: "var(--surface-sunken)", borderRadius: "var(--radius-md)", padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-3)", boxShadow: at ? "inset var(--border-w-thick) 0 0 var(--status-danger)" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
                      <Icon name={tp?.icon || "square-check"} size={20} />
                      <span style={{ fontWeight: "var(--fw-bold)" }}>{tp?.nome}</span>
                      {at && <Badge size="sm" tone="error">Atrasada</Badge>}
                      <Badge size="sm" tone={smap[e.status] || "neutral"}>{e.status}</Badge>
                      <span style={{ flex: 1 }} />
                      {canWrite && <>
                        <IconButton icon="pencil" size={28} label="Editar etapa" onClick={() => { setEtForm({ ...e }); setEtModal(true); }} />
                        <IconButton icon="trash-2" size={28} label="Excluir etapa" onClick={() => delEt(e.id)} />
                      </>}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-1) var(--space-6)", fontSize: "var(--fs-p5-5)", color: "var(--text-secondary)" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}><Icon name="calendar" size={14} />Previsto: {e.dataInicioP} → {e.dataFimP}</span>
                      {e.dataInicioR && <span style={{ display: "flex", alignItems: "center", gap: "var(--space-1)", color: "var(--status-success-text)" }}><Icon name="check" size={14} />Real: {e.dataInicioR} → {e.dataFimR || "em andamento"}</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                      <div style={{ flex: 1 }}><ProgressBar value={e.progresso} color={at ? "var(--status-danger)" : e.progresso === 100 ? "var(--status-success)" : "var(--accent)"} label="Progresso da etapa" /></div>
                      <span style={{ font: "var(--type-label)", width: "var(--space-8)", textAlign: "right" }}>{e.progresso}%</span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
                      {(e.subetapas || []).map(sub => (
                        <div key={sub.id} style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)", paddingBottom: "var(--space-1)", borderBottom: "var(--border-w) solid var(--border-subtle)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                            <Checkbox checked={!!sub.concluida} onChange={() => toggleSubetapa(e.id, sub)}
                              label={<span style={{ color: sub.concluida ? "var(--text-secondary)" : "var(--text-primary)", textDecoration: sub.concluida ? "line-through" : "none" }}>{sub.nome}</span>} />
                            <span style={{ flex: 1 }} />
                            {canWrite && <>
                              <IconButton icon="pencil" size={28} label="Editar subetapa" onClick={() => setEditSub(editSub?.id === sub.id ? null : { ...sub, etapaId: e.id })} />
                              <IconButton icon="trash-2" size={28} label="Excluir subetapa" onClick={() => delSubetapa(e.id, sub.id)} />
                            </>}
                          </div>
                          {(sub.dataInicioP || sub.dataInicioR) && editSub?.id !== sub.id && (
                            <div style={{ display: "flex", gap: "var(--space-4)", marginLeft: "var(--space-8)", fontSize: "var(--fs-p6)", color: "var(--text-secondary)" }}>
                              {sub.dataInicioP && <span>Previsto: {sub.dataInicioP}{sub.dataFimP ? ` → ${sub.dataFimP}` : ""}</span>}
                              {sub.dataInicioR && <span style={{ color: "var(--status-success-text)" }}>Real: {sub.dataInicioR}{sub.dataFimR ? ` → ${sub.dataFimR}` : " → em andamento"}</span>}
                            </div>
                          )}
                          {editSub?.id === sub.id && (
                            <div style={{ marginLeft: "var(--space-8)", display: "flex", flexDirection: "column", gap: "var(--space-2)", padding: "var(--space-2) 0" }}>
                              <Input label="Nome da subetapa" value={editSub.nome || ""} onChange={setSub("nome")} />
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-sm),1fr))", gap: "var(--space-2)" }}>
                                <Input label="Início previsto" type="date" value={editSub.dataInicioP || ""} onChange={setSub("dataInicioP")} />
                                <Input label="Fim previsto" type="date" value={editSub.dataFimP || ""} onChange={setSub("dataFimP")} />
                                <Input label="Início real" type="date" value={editSub.dataInicioR || ""} onChange={setSub("dataInicioR")} />
                                <Input label="Fim real" type="date" value={editSub.dataFimR || ""} onChange={setSub("dataFimR")} />
                              </div>
                              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                                <Button size="sm" iconLeft="check" loading={salvandoSub} onClick={saveSubetapa}>Salvar</Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditSub(null)}>Cancelar</Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      {canWrite && (
                        <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "flex-end", marginTop: "var(--space-1)" }}>
                          <div style={{ flex: 1 }}>
                            <Input aria-label="Nova subetapa" placeholder="Nova subetapa…" value={novaSubetapa[e.id] || ""}
                              onChange={ev => setNovaSubetapa(s => ({ ...s, [e.id]: ev.target.value }))}
                              onKeyDown={ev => ev.key === "Enter" && addSubetapa(e.id)} />
                          </div>
                          <IconButton icon="plus" variant="dark" size={40} label="Adicionar subetapa" onClick={() => addSubetapa(e.id)} />
                        </div>
                      )}
                    </div>

                    {(c.total > 0 || e.orcamento > 0) && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1-5)", paddingTop: "var(--space-3)", borderTop: "var(--border-w) solid var(--border-default)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--fs-p5-5)" }}>
                          <span style={{ color: "var(--text-secondary)" }}>Realizado <b style={{ color: estourou ? "var(--status-danger)" : "var(--text-primary)" }}>{fmt(c.total)}</b>{e.orcamento > 0 && ` de ${fmt(e.orcamento)}`}</span>
                          {pct != null && <b style={{ color: estourou ? "var(--status-danger)" : pct > 80 ? "var(--status-warning-text)" : "var(--status-success-text)" }}>{pct}%</b>}
                        </div>
                        {e.orcamento > 0 && <ProgressBar value={Math.min(100, pct)} color={estourou ? "var(--status-danger)" : pct > 80 ? "var(--status-warning)" : "var(--status-success)"} label="Orçamento da etapa" />}
                        {c.total > 0 && (
                          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                            {[["Insumos", c.ins, "var(--stat-4)"], ["Máquina", c.maq, "var(--stat-1)"], ["Mão de obra", c.mo, "var(--cp-data-purple)"], ["Despesas", c.desp, "var(--cp-data-pink)"]]
                              .filter(([, v]) => v > 0)
                              .map(([l, v, col]) => <Tag key={l} tone="neutral" dot={col}>{l}: {fmt(v)}</Tag>)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Modal>
        );
      })()}

      {etModal && (
        <Modal title={etForm.id ? "Editar etapa" : "Adicionar etapa"} onClose={fecharEt}
          footer={<><Button variant="secondary" onClick={fecharEt}>Cancelar</Button><Button iconLeft="check" loading={salvandoEt} onClick={saveEt}>Salvar</Button></>}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <Select label="Tipo de etapa" required error={etErros.tipoEtapaId} value={etForm.tipoEtapaId || ""} onChange={e => setEtForm(f => ({ ...f, tipoEtapaId: parseInt(e.target.value) }))}>
              <option value="">Selecione…</option>
              {tiposEtapa.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </Select>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
              <Input label="Início previsto" required type="date" error={etErros.dataInicioP} value={etForm.dataInicioP || ""} onChange={setEF("dataInicioP")} />
              <Input label="Fim previsto" required type="date" error={etErros.dataFimP} value={etForm.dataFimP || ""} onChange={setEF("dataFimP")} />
              <Input label="Início real" type="date" value={etForm.dataInicioR || ""} onChange={setEF("dataInicioR")} />
              <Input label="Fim real" type="date" value={etForm.dataFimR || ""} onChange={setEF("dataFimR")} />
            </div>
            <Select label="Status" value={etForm.status || "Pendente"} onChange={setEF("status")}>
              {["Pendente", "Em andamento", "Concluída", "Atrasada", "Pausada"].map(s => <option key={s}>{s}</option>)}
            </Select>
            <MoneyInput label="Orçamento da etapa" value={etForm.orcamento ?? ""} onChange={setEF("orcamento")} />
            {!(etForm.subetapas?.length) ? (
              <Field label={`Progresso: ${etForm.progresso || 0}%`}>
                <input type="range" min="0" max="100" value={etForm.progresso || 0} onChange={e => setEtForm(f => ({ ...f, progresso: parseInt(e.target.value) }))} style={{ width: "100%", accentColor: "var(--accent)" }} />
              </Field>
            ) : (
              <Banner tone="info">Progresso calculado automaticamente pelas subetapas ({etForm.progresso || 0}%).</Banner>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
