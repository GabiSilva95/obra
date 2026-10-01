import { useState } from "react";
import { today, fmt, validate } from "../utils/helpers";
import { avisarErro, confirmar } from "../utils/aviso";
import { Banner, Button, DataTable, Icon, IconButton, Input, Modal, Select, StatCard, Tag, Textarea } from "../../design-system";
import { PageActions } from "../components/PageActions";

export default function Alocacao({ data, setData, api, canWrite }) {
  const { obras, maquinas, insumos, alocacoes, etapasObra = [], tiposEtapa = [] } = data;
  const [obraId, setObraId] = useState(obras[0]?.id || null);
  const [modal, setModal]   = useState(false);
  const [form, setForm]     = useState({ tipo: "maquina" });
  const etapasDaObra = etapasObra.filter(e => e.obraId === obraId);
  const [erros, setErros]   = useState({});
  const [salvando, setSalvando] = useState(false);

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
    if (salvando) return;
    setSalvando(true);
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
    finally { setSalvando(false); }
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

  const fechar = () => { setModal(false); setErros({}); };
  const linhas = itens.map(a => {
    const iM = a.tipo === "maquina";
    const ref = iM ? maquinas.find(m => m.id === a.referenciaId) : insumos.find(i => i.id === a.referenciaId);
    return { ...a, iM, ref, custo: custoAlocacao(a), taxa: iM ? (a.custoUnitario ?? ref?.custoHora ?? 0) : (ref?.custoUnit ?? 0), snapshot: iM && a.custoUnitario != null };
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <PageActions>
        <Select aria-label="Obra" style={{ height: "var(--control-h-sm)", minWidth: "var(--control-w-md)" }} value={obraId ?? ""} onChange={e => setObraId(parseInt(e.target.value))}>
          {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </Select>
        {canWrite && <Button iconLeft="plus" onClick={() => { setForm({ tipo: "maquina" }); setModal(true); }}>Nova alocação</Button>}
      </PageActions>
      <p style={{ color: "var(--text-secondary)" }}>Horas de equipamento por obra. Material é lançado em Estoque › Baixa.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-md),1fr))", gap: "var(--space-6)" }}>
        <StatCard value={fmt(tMaq)} label="Custo de máquinas" color="var(--stat-1)" icon={<Icon name="construction" color="var(--stat-1)" />} />
        <StatCard value={fmt(tIns)} label="Insumos (lançamentos antigos)" color="var(--stat-4)" icon={<Icon name="box" color="var(--stat-4)" />} />
      </div>
      {tIns > 0 && <Banner tone="info">Insumos exibidos como histórico anterior à unificação. O custo de material vem da baixa de estoque.</Banner>}

      <DataTable minWidth={760} rows={linhas} rowKey={r => r.id} empty="Nenhuma alocação para esta obra." columns={[
        { key: "ref", label: "Recurso", render: r => (
          <span style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <Icon name={r.iM ? "construction" : "box"} size={20} />
            <span style={{ display: "flex", flexDirection: "column" }}>
              <b>{r.ref?.nome || "—"}</b>
              {r.obs && <span style={{ fontSize: "var(--fs-p6)", color: "var(--text-secondary)" }}>{r.obs}</span>}
            </span>
          </span>
        ) },
        { key: "tipo", label: "Tipo", render: r => <Tag tone={r.iM ? "neutral" : "accent"}>{r.iM ? "Máquina" : "Insumo"}</Tag> },
        { key: "quantidade", label: "Quantidade", render: r => r.iM ? `${r.quantidade} h` : `${r.quantidade} ${r.ref?.unidade || ""}` },
        { key: "data", label: "Data" },
        { key: "taxa", label: "Valor unitário", align: "right", render: r => (
          <span title={r.snapshot ? "Custo registrado no momento da alocação" : undefined}>{fmt(r.taxa)}{r.iM ? "/h" : "/un"}{r.snapshot && " •"}</span>
        ) },
        { key: "custo", label: "Custo", align: "right", render: r => <b>{fmt(r.custo)}</b> },
        ...(canWrite ? [{ key: "acoes", label: "", width: "var(--space-14)", render: r => <IconButton icon="trash-2" variant="danger" size={28} label="Excluir" onClick={() => del(r.id)} /> }] : []),
      ]} />

      {modal && (
        <Modal title="Nova alocação" onClose={fechar}
          footer={<><Button variant="secondary" onClick={fechar}>Cancelar</Button><Button iconLeft="check" loading={salvando} onClick={save}>Lançar</Button></>}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <Select label="Máquina" required error={erros.referenciaId} value={form.referenciaId || ""} onChange={e => setForm(f => ({ ...f, referenciaId: e.target.value }))}>
              <option value="">Selecione…</option>
              {maquinas.map(m => (
                <option key={m.id} value={m.id}>
                  {m.nome} · {fmt(m.custoHora)}/h{m.tipoPropriedade === "propria" ? " (própria)" : m.tipoPropriedade === "alugada" ? " (alugada)" : ""}
                </option>
              ))}
            </Select>
            <Select label="Etapa (opcional)" value={form.etapaId || ""} onChange={e => setForm(f => ({ ...f, etapaId: e.target.value }))}>
              <option value="">Sem etapa</option>
              {etapasDaObra.map(et => {
                const tp = tiposEtapa.find(t => t.id === et.tipoEtapaId);
                return <option key={et.id} value={et.id}>{tp?.nome || `Etapa ${et.id}`}</option>;
              })}
            </Select>
            <Input label="Horas utilizadas" required type="number" min="0" step="0.5" error={erros.quantidade} value={form.quantidade || ""} onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))} />
            {custoPreviewMaq != null && <Banner tone="info" title="Custo estimado">{fmt(custoPreviewMaq)}</Banner>}
            <Input label="Data" required type="date" error={erros.data} value={form.data || today()} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
            <Textarea label="Observações" rows={2} maxLength={300} value={form.obs || ""} onChange={e => setForm(f => ({ ...f, obs: e.target.value }))} />
          </div>
        </Modal>
      )}
    </div>
  );
}
