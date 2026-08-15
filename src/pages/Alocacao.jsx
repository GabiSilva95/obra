import { useState } from "react";
import { C, F } from "../constants/tokens";
import { today, fmt, validate } from "../utils/helpers";
import { Icon, Card, Modal, Inp, Sel, Txta, Btn, Hdr, DSel } from "../components/ui";
import { avisarErro, confirmar } from "../utils/aviso";

export default function Alocacao({ data, setData, api, canWrite }) {
  const { obras, maquinas, insumos, alocacoes, etapasObra = [], tiposEtapa = [] } = data;
  const [obraId, setObraId] = useState(obras[0]?.id || null);
  const [modal, setModal]   = useState(false);
  const [form, setForm]     = useState({ tipo: "maquina" });
  const etapasDaObra = etapasObra.filter(e => e.obraId === obraId);
  const [erros, setErros]   = useState({});

  const itens = alocacoes.filter(a => a.obraId === obraId).sort((a, b) => b.data.localeCompare(a.data));

  // ── Custo de uma alocação ──────────────────────────────────────────────────
  // Usa custoUnitario (snapshot persistido no banco) quando disponível.
  // Fallback para custo atual do recurso (retrocompatibilidade).
  const custoAlocacao = (a) => {
    if (a.tipo === "maquina") {
      const cu = a.custoUnitario ?? (maquinas.find(m => m.id === a.referenciaId)?.custoHora ?? 0);
      return cu * a.quantidade;
    }
    // Alocações de insumo anteriores à unificação: exibidas como histórico,
    // sem entrar no custo (que agora vem da baixa de estoque).
    const insumo = insumos.find(i => i.id === a.referenciaId);
    return insumo ? insumo.custoUnit * a.quantidade : 0;
  };

  const tMaq = itens.filter(a => a.tipo === "maquina").reduce((s, a) => s + custoAlocacao(a), 0);
  const tIns = itens.filter(a => a.tipo === "insumo").reduce((s, a) => s + custoAlocacao(a), 0);

  const save = async () => {
    const { ok, erros: e } = validate(form, {
      referenciaId: { required: true, label: "Máquina" },
      quantidade:   { required: true, min: 0.01, label: "Horas Utilizadas" },
      data:         { required: true, label: "Data" },
    });
    if (!ok) { setErros(e); return; }
    try {
      const nova = await api.post("/alocacao", {
        obraId,
        tipo:         form.tipo,
        referenciaId: parseInt(form.referenciaId),
        quantidade:   parseFloat(form.quantidade),
        data:         form.data || today(),
        etapaId:      form.etapaId ? parseInt(form.etapaId) : null,
        obs:          form.obs || "",
      });
      setData(d => ({
        ...d,
        alocacoes: [
          ...d.alocacoes,
          { ...nova, referenciaId: nova.maquinaId || nova.insumoId },
        ],
      }));
      setErros({}); setModal(false); setForm({ tipo: "maquina" });
    } catch (err) { if (!err.limitePlano) avisarErro(err.message); }
  };

  const del = async id => {
    if (!(await confirmar({ mensagem: "Remover?", confirmarRotulo: "Remover", perigo: true }))) return;
    try {
      await api.del(`/alocacao/${id}`);
      setData(d => ({ ...d, alocacoes: d.alocacoes.filter(a => a.id !== id) }));
    } catch (err) { if (!err.limitePlano) avisarErro(err.message); }
  };

  // Máquina selecionada no form (para preview de custo)
  const maqSelecionada = form.tipo === "maquina" && form.referenciaId
    ? maquinas.find(m => m.id === parseInt(form.referenciaId))
    : null;

  const custoPreviewMaq = maqSelecionada && form.quantidade > 0
    ? maqSelecionada.custoHora * parseFloat(form.quantidade)
    : null;

  return (
    <div>
      <Hdr
        title="Alocação de Máquinas"
        sub="Horas de equipamento por obra — material é lançado em Estoque › Baixa"
        action={
          <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
            <DSel value={obraId} onChange={e => setObraId(parseInt(e.target.value))}>
              {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
            </DSel>
            {canWrite && <Btn onClick={() => { setForm({ tipo: "maquina" }); setModal(true); }}><Icon n="plus" size={13} />Nova Alocação</Btn>}
          </div>
        }
      />

      {/* Totais */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
        <Card style={{ background: "rgba(96,165,250,.04)", borderColor: "rgba(96,165,250,.12)", padding: 16 }}>
          <div style={{ fontSize: 11, color: C.blue, marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
            <Icon n="excavator" size={13} color={C.blue} />Custo de Máquinas
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.blue, ...F, letterSpacing: "-0.04em" }}>{fmt(tMaq)}</div>
        </Card>
        <Card style={{ background: C.orangeDim, borderColor: "rgba(249,115,22,.18)", padding: 16 }}>
          <div style={{ fontSize: 11, color: C.orange, marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
            <Icon n="cube" size={13} color={C.orange} />Insumos (lançamentos antigos)
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.orange, ...F, letterSpacing: "-0.04em" }}>{fmt(tIns)}</div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
            Histórico anterior à unificação — o custo de material vem da baixa de estoque.
          </div>
        </Card>
      </div>

      {/* Lista de alocações */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "11px 14px", borderBottom: `1px solid ${C.borderLight}`, fontSize: 10, fontWeight: 700, color: C.dim, textTransform: "uppercase", letterSpacing: "0.08em", ...F }}>
          Alocações — {obras.find(o => o.id === obraId)?.nome}
        </div>
        {!itens.length && <div style={{ padding: "48px", textAlign: "center", color: C.dim, fontSize: 12 }}>Nenhuma alocação para esta obra.</div>}
        {itens.map(a => {
          const iM  = a.tipo === "maquina";
          const ref = iM ? maquinas.find(m => m.id === a.referenciaId) : insumos.find(i => i.id === a.referenciaId);
          const custo = custoAlocacao(a);
          // Taxa unitária exibida: snapshot salvo ou valor atual
          const taxaDisplay = iM
            ? (a.custoUnitario ?? ref?.custoHora ?? 0)
            : (ref?.custoUnit ?? 0);
          const isSnapshot = iM && a.custoUnitario != null;

          return (
            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 13, padding: "13px 14px", borderBottom: `1px solid ${C.borderLight}` }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: iM ? "rgba(96,165,250,.08)" : C.orangeDim, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon n={iM ? "excavator" : "cube"} size={15} color={iM ? C.blue : C.orange} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 12, color: C.text, ...F, letterSpacing: "-0.01em" }}>{ref?.nome || "—"}</div>
                <div style={{ fontSize: 11, color: C.muted, display: "flex", gap: 10, marginTop: 2, flexWrap: "wrap" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <Icon n="clock" size={10} color={C.dim} />
                    {iM ? `${a.quantidade}h` : `${a.quantidade} ${ref?.unidade || ""}`}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <Icon n="cal" size={10} color={C.dim} />{a.data}
                  </span>
                  {a.obs && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Icon n="file" size={10} color={C.dim} />{a.obs}</span>}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: C.text, ...F }}>{fmt(custo)}</div>
                <div style={{ fontSize: 10, color: C.dim, display: "flex", alignItems: "center", gap: 3, justifyContent: "flex-end" }}>
                  {iM ? `${fmt(taxaDisplay)}/h` : `${fmt(taxaDisplay)}/un`}
                  {isSnapshot && (
                    <span title="Custo registrado no momento da alocação" style={{ color: C.orange, marginLeft: 3 }}>●</span>
                  )}
                </div>
              </div>
              {canWrite && (
                <button onClick={() => del(a.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.dim, display: "flex", padding: 3, flexShrink: 0 }}>
                  <Icon n="trash" size={13} color={C.dim} />
                </button>
              )}
            </div>
          );
        })}
      </Card>

      {/* ── Modal Nova Alocação ──────────────────────────────────────────────── */}
      {modal && (
        <Modal title="Nova Alocação" onClose={() => { setModal(false); setErros({}); }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Sel
              label="Máquina"
              error={erros.referenciaId}
              value={form.referenciaId || ""}
              onChange={e => setForm(f => ({ ...f, referenciaId: e.target.value }))}>
              <option value="">Selecione...</option>
              {maquinas.map(m => (
                <option key={m.id} value={m.id}>
                  {m.nome} — {fmt(m.custoHora)}/h
                  {m.tipoPropriedade === "propria" ? " (própria)" : m.tipoPropriedade === "alugada" ? " (alugada)" : ""}
                </option>
              ))}
            </Sel>

            <Sel label="Etapa (opcional)" value={form.etapaId || ""} onChange={e => setForm(f => ({ ...f, etapaId: e.target.value }))}>
              <option value="">Sem etapa</option>
              {etapasDaObra.map(et => {
                const tp = tiposEtapa.find(t => t.id === et.tipoEtapaId);
                return <option key={et.id} value={et.id}>{tp?.nome || `Etapa ${et.id}`}</option>;
              })}
            </Sel>

            <Inp
              label="Horas Utilizadas"
              type="number"
              error={erros.quantidade}
              value={form.quantidade || ""}
              onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))} />

            {/* Preview de custo para máquinas */}
            {custoPreviewMaq != null && (
              <div style={{ background: "rgba(96,165,250,.06)", border: "1px solid rgba(96,165,250,.15)", borderRadius: 10, padding: "9px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: C.blue }}>Custo estimado</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: C.blue, ...F }}>{fmt(custoPreviewMaq)}</span>
              </div>
            )}

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
