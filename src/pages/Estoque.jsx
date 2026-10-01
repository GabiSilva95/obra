import { useState } from "react";
import { today, fmt } from "../utils/helpers";
import { avisarErro, avisarSucesso, confirmar } from "../utils/aviso";
import { Banner, Button, DataTable, IconButton, Input, Modal, ProgressBar, SegmentedTabs, Select, StatCard, Tag } from "../../design-system";
import { PageActions } from "../components/PageActions";

const dataBR = d => new Date(d + "T12:00:00").toLocaleDateString("pt-BR");
const seletorObra = (value, onChange, obras) => (
  <Select aria-label="Obra" style={{ height: "var(--control-h-sm)", minWidth: "var(--control-w-md)" }} value={value ?? ""} onChange={onChange}>
    {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
  </Select>
);

// ── Posição de Estoque ────────────────────────────────────────────────────────
function PosicaoEstoque({ data }) {
  const { obras, insumos, estoques } = data;
  const [obraId, setObraId] = useState(obras[0]?.id || null);
  const itens = estoques.filter(e => e.obraId === obraId);
  const custoBatch = (e) => { const i = insumos.find(x => x.id === e.insumoId); return e.custoUnit || (i ? i.custoUnit : 0); };
  const totDisp = itens.reduce((s, e) => s + custoBatch(e) * (e.quantEntrada - e.quantUtilizado), 0);
  const totUtil = itens.reduce((s, e) => s + custoBatch(e) * e.quantUtilizado, 0);

  const linhas = itens.map(item => {
    const ins = insumos.find(i => i.id === item.insumoId);
    const disp = item.quantEntrada - item.quantUtilizado;
    return { ...item, ins, disp, pct: Math.round((item.quantUtilizado / (item.quantEntrada || 1)) * 100), cu: custoBatch(item) };
  }).filter(l => l.ins);

  return (
    <>
      <PageActions>{seletorObra(obraId, e => setObraId(parseInt(e.target.value)), obras)}</PageActions>
      <p style={{ color: "var(--text-secondary)" }}>Saldo atual consolidado por obra.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-md),1fr))", gap: "var(--space-6)" }}>
        <StatCard value={fmt(totDisp)} label="Valor em estoque" color="var(--stat-3)" />
        <StatCard value={fmt(totUtil)} label="Valor consumido" color="var(--stat-4)" />
      </div>
      <DataTable minWidth={900} rows={linhas} rowKey={l => l.id} empty="Nenhum insumo neste estoque." columns={[
        { key: "insumo", label: "Insumo", render: l => <b>{l.ins.nome}</b> },
        { key: "un", label: "Unid.", render: l => l.ins.unidade },
        { key: "quantEntrada", label: "Entrada", align: "right" },
        { key: "quantUtilizado", label: "Utilizado", align: "right" },
        { key: "disp", label: "Disponível", align: "right", render: l => <b style={{ color: "var(--status-success-text)" }}>{l.disp}</b> },
        { key: "pct", label: "% uso", width: "var(--col-min-sm)", render: l => (
          <span style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <span style={{ flex: 1 }}><ProgressBar value={l.pct} color={l.pct > 90 ? "var(--status-danger)" : "var(--accent)"} label="Uso" /></span>
            <span style={{ fontSize: "var(--fs-p6)", color: "var(--text-secondary)", width: "var(--space-8)", textAlign: "right" }}>{l.pct}%</span>
          </span>
        ) },
        { key: "cu", label: "Custo unit.", align: "right", render: l => fmt(l.cu) },
        { key: "cutil", label: "Custo utilizado", align: "right", render: l => fmt(l.cu * l.quantUtilizado) },
        { key: "cdisp", label: "Custo disponível", align: "right", render: l => <b>{fmt(l.cu * l.disp)}</b> },
      ]} />
    </>
  );
}

// ── Baixa de Estoque ─────────────────────────────────────────────────────────
function BaixaEstoque({ data, setData, api, canWrite }) {
  const { obras, insumos, estoques, consumos = [], etapasObra = [], tiposEtapa = [] } = data;
  const [obraId, setObraId] = useState(obras[0]?.id || "");
  const [modal, setModal] = useState(false);
  const [itens, setItens] = useState([{ estoqueId: "", quantidade: "" }]);
  const [dataBaixa, setDataBaixa] = useState(today());
  const [etapaId, setEtapaId]     = useState("");

  const etapasDaObra = etapasObra.filter(e => e.obraId === parseInt(obraId));
  const consumosDaObra = consumos
    .filter(c => c.obraId === parseInt(obraId))
    .sort((a, b) => b.data.localeCompare(a.data));

  const obraEstoques = estoques.filter(e => e.obraId === parseInt(obraId));
  const comSaldo = obraEstoques.filter(e => (e.quantEntrada - e.quantUtilizado) > 0);

  const addLinha = () => setItens(f => [...f, { estoqueId: "", quantidade: "" }]);
  const remLinha = i => setItens(f => f.filter((_, j) => j !== i));
  const updLinha = (i, k, v) => setItens(f => f.map((l, j) => j === i ? { ...l, [k]: v } : l));

  const [registrando, setRegistrando] = useState(false);

  const registrar = async () => {
    if (registrando) return;
    const validas = itens.filter(l => l.estoqueId && l.quantidade && parseFloat(l.quantidade) > 0);
    if (!validas.length) return;
    setRegistrando(true);
    try {
      for (const l of validas) {
        const consumo = await api.post("/estoque/consumos", {
          estoqueId:  parseInt(l.estoqueId),
          quantidade: parseFloat(l.quantidade),
          data:       dataBaixa,
          etapaId:    etapaId ? parseInt(etapaId) : null,
        });
        setData(d => ({
          ...d,
          consumos: [consumo, ...(d.consumos || [])],
          estoques: d.estoques.map(e => e.id === consumo.estoqueId
            ? { ...e, quantUtilizado: e.quantUtilizado + consumo.quantidade } : e),
        }));
      }
      avisarSucesso(`${validas.length} baixa(s) registrada(s).`);
      setModal(false); setItens([{ estoqueId: "", quantidade: "" }]); setEtapaId("");
    } catch (err) { if (!err.limitePlano) avisarErro(err.message); }
    finally { setRegistrando(false); }
  };

  const desfazer = async c => {
    if (!(await confirmar({ mensagem: "Desfazer esta baixa? A quantidade volta para o saldo.", confirmarRotulo: "Remover", perigo: true }))) return;
    try {
      await api.del(`/estoque/consumos/${c.id}`);
      setData(d => ({
        ...d,
        consumos: d.consumos.filter(x => x.id !== c.id),
        estoques: d.estoques.map(e => e.id === c.estoqueId
          ? { ...e, quantUtilizado: e.quantUtilizado - c.quantidade } : e),
      }));
    } catch (err) { if (!err.limitePlano) avisarErro(err.message); }
  };

  const nomeObra = obras.find(o => o.id === parseInt(obraId))?.nome;
  const saldoRows = comSaldo.map(e => {
    const ins = insumos.find(i => i.id === e.insumoId);
    return { ...e, ins, saldo: e.quantEntrada - e.quantUtilizado, pct: Math.round(e.quantUtilizado / (e.quantEntrada || 1) * 100) };
  });
  const corUso = p => (p > 80 ? "var(--status-danger)" : p > 50 ? "var(--status-warning)" : "var(--status-success)");

  return (
    <>
      <PageActions>
        {seletorObra(obraId, e => setObraId(e.target.value), obras)}
        {canWrite && <Button iconLeft="minus" onClick={() => { setItens([{ estoqueId: "", quantidade: "" }]); setModal(true); }}>Registrar baixa</Button>}
      </PageActions>
      <h2 style={{ margin: 0, font: "var(--type-card-title)" }}>Saldo disponível · {nomeObra}</h2>
      <DataTable minWidth={680} rows={saldoRows} rowKey={r => r.id} empty="Sem estoque disponível para esta obra." columns={[
        { key: "insumo", label: "Insumo", render: r => <b>{r.ins?.nome || "—"}</b> },
        { key: "saldo", label: "Disponível", align: "right", render: r => <b style={{ color: "var(--status-success-text)" }}>{r.saldo} {r.ins?.unidade}</b> },
        { key: "recebido", label: "Recebido", align: "right", render: r => `${r.quantEntrada} ${r.ins?.unidade || ""}` },
        { key: "pct", label: "Consumido", width: "var(--col-w-md)", render: r => (
          <span style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <span style={{ flex: 1 }}><ProgressBar value={r.pct} color={corUso(r.pct)} label="Consumido" /></span>
            <span style={{ fontSize: "var(--fs-p6)", color: "var(--text-secondary)", width: "var(--space-8)", textAlign: "right" }}>{r.pct}%</span>
          </span>
        ) },
      ]} />

      <h2 style={{ margin: 0, font: "var(--type-card-title)" }}>Baixas registradas</h2>
      <DataTable minWidth={720} rows={consumosDaObra} rowKey={c => c.id} empty="Nenhuma baixa registrada nesta obra." columns={[
        { key: "insumo", label: "Insumo", render: c => {
          const etapa = etapasObra.find(e => e.id === c.etapaId);
          const tp = etapa && tiposEtapa.find(t => t.id === etapa.tipoEtapaId);
          return <span style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}><b>{c.insumo?.nome || "—"}</b>{tp && <Tag tone="accent">{tp.nome}</Tag>}</span>;
        } },
        { key: "quantidade", label: "Quantidade", render: c => `${c.quantidade} ${c.insumo?.unidade || ""}` },
        { key: "data", label: "Data", render: c => dataBR(c.data) },
        { key: "cu", label: "Custo unit. na data", align: "right", render: c => fmt(c.custoUnitario) },
        { key: "total", label: "Custo", align: "right", render: c => <b>{fmt(c.custoUnitario * c.quantidade)}</b> },
        ...(canWrite ? [{ key: "acoes", label: "", width: "var(--space-14)", render: c => <IconButton icon="trash-2" variant="danger" size={28} label="Desfazer baixa" onClick={() => desfazer(c)} /> }] : []),
      ]} />

      {modal && (
        <Modal title="Registrar baixa de estoque" onClose={() => setModal(false)} wide
          footer={<><Button variant="secondary" onClick={() => setModal(false)}>Cancelar</Button><Button iconLeft="check" variant="danger" loading={registrando} disabled={!itens.some(l => l.estoqueId && l.quantidade)} onClick={registrar}>Confirmar baixa</Button></>}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <Banner tone="accent">Registre o consumo real de materiais da obra <b>{nomeObra}</b>.</Banner>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-md),1fr))", gap: "var(--space-3)" }}>
              <Input label="Data do consumo" required type="date" value={dataBaixa} onChange={e => setDataBaixa(e.target.value)} />
              <Select label="Etapa (opcional)" value={etapaId} onChange={e => setEtapaId(e.target.value)}>
                <option value="">Sem etapa</option>
                {etapasDaObra.map(et => {
                  const tp = tiposEtapa.find(t => t.id === et.tipoEtapaId);
                  return <option key={et.id} value={et.id}>{tp?.nome || `Etapa ${et.id}`}</option>;
                })}
              </Select>
            </div>
            {itens.map((l, i) => {
              const est = estoques.find(e => e.id === parseInt(l.estoqueId));
              const saldo = est ? est.quantEntrada - est.quantUtilizado : 0;
              return (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) var(--col-min-sm) var(--control-h-md)", gap: "var(--space-2)", alignItems: "end" }}>
                  <Select label={i === 0 ? "Insumo" : undefined} aria-label="Insumo" value={l.estoqueId} onChange={e => updLinha(i, "estoqueId", e.target.value)}>
                    <option value="">Selecione…</option>
                    {comSaldo.map(e => { const ins = insumos.find(x => x.id === e.insumoId); return <option key={e.id} value={e.id}>{ins?.nome} (saldo: {e.quantEntrada - e.quantUtilizado} {ins?.unidade})</option>; })}
                  </Select>
                  <Input label={i === 0 ? "Quantidade" : undefined} aria-label="Quantidade" type="number" min="0" max={est ? saldo : undefined} placeholder={est ? `máx. ${saldo}` : "0"} value={l.quantidade} onChange={e => updLinha(i, "quantidade", e.target.value)} />
                  <IconButton icon="trash-2" variant="outline" size={40} label="Remover item" disabled={i === 0} onClick={() => remLinha(i)} />
                </div>
              );
            })}
            <Button variant="secondary" iconLeft="plus" fullWidth onClick={addLinha}>Adicionar item</Button>
          </div>
        </Modal>
      )}
    </>
  );
}

// ── Transferência entre Obras ─────────────────────────────────────────────────
function TransferenciaEstoque({ data, setData, api, canWrite }) {
  const { obras, insumos, estoques, transferencias = [] } = data;
  const [modal, setModal]   = useState(false);
  const [deObra, setDeObra] = useState(obras[0]?.id?.toString() || "");
  const [paraObra, setParaObra] = useState("");
  const [insumoId, setInsumoId] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [dataTransf, setDataTransf] = useState(today());
  const [obs, setObs] = useState("");

  const resetForm = () => { setDeObra(obras[0]?.id?.toString() || ""); setParaObra(""); setInsumoId(""); setQuantidade(""); setDataTransf(today()); setObs(""); };

  // Insumos com saldo na obra de origem
  const lotesOrigem = estoques.filter(e => e.obraId === parseInt(deObra));
  const insumosComSaldo = insumos.filter(ins => {
    const saldo = lotesOrigem.filter(e => e.insumoId === ins.id).reduce((s, e) => s + (e.quantEntrada - e.quantUtilizado), 0);
    return saldo > 0;
  });
  const saldoInsumo = insumoId ? lotesOrigem.filter(e => e.insumoId === parseInt(insumoId)).reduce((s, e) => s + (e.quantEntrada - e.quantUtilizado), 0) : 0;
  const insumoDados = insumos.find(i => i.id === parseInt(insumoId));

  const [salvandoTransf, setSalvandoTransf] = useState(false);

  const salvar = async () => {
    if (!deObra || !paraObra || !insumoId || !quantidade || salvandoTransf) return;
    setSalvandoTransf(true);
    try {
      const result = await api.post("/estoque/transferencias", { deObraId: parseInt(deObra), paraObraId: parseInt(paraObra), insumoId: parseInt(insumoId), quantidade: parseFloat(quantidade), data: dataTransf, obs: obs || undefined });
      // Atualiza estado local: nova transferência + nova entrada de estoque + debita lotes de origem
      setData(d => {
        const novosEstoques = [...d.estoques, result.entrada];
        // Ajusta quantUtilizado nos lotes da origem (mesma lógica FIFO do backend)
        let restante = parseFloat(quantidade);
        const estsAtualizados = d.estoques.map(e => {
          if (e.obraId !== parseInt(deObra) || e.insumoId !== parseInt(insumoId) || restante <= 0) return e;
          const saldo = e.quantEntrada - e.quantUtilizado;
          if (saldo <= 0) return e;
          const debitar = Math.min(saldo, restante);
          restante -= debitar;
          return { ...e, quantUtilizado: e.quantUtilizado + debitar };
        });
        return { ...d, estoques: [...estsAtualizados, result.entrada], transferencias: [result.transf, ...(d.transferencias || [])] };
      });
      avisarSucesso(`${parseFloat(quantidade)} ${insumoDados?.unidade ?? ""} transferido(s) com sucesso.`);
      setModal(false); resetForm();
    } catch (err) { if (!err.limitePlano) avisarErro(err.message); }
    finally { setSalvandoTransf(false); }
  };

  const nomeObraT = (id, fallback) => obras.find(o => o.id === id)?.nome ?? fallback?.nome ?? "—";

  return (
    <>
      <PageActions>
        {canWrite && <Button iconLeft="arrow-right-left" onClick={() => { resetForm(); setModal(true); }}>Nova transferência</Button>}
      </PageActions>
      <p style={{ color: "var(--text-secondary)" }}>Mova insumos do estoque de uma obra para outra.</p>
      <DataTable minWidth={760} rows={transferencias} rowKey={t => t.id} empty="Nenhuma transferência registrada." columns={[
        { key: "insumo", label: "Insumo", render: t => { const ins = insumos.find(i => i.id === t.insumoId) ?? t.insumo; return <span style={{ display: "flex", flexDirection: "column" }}><b>{ins?.nome ?? "—"}</b>{t.obs && <span style={{ fontSize: "var(--fs-p6)", color: "var(--text-secondary)" }}>{t.obs}</span>}</span>; } },
        { key: "quantidade", label: "Quantidade", render: t => { const ins = insumos.find(i => i.id === t.insumoId) ?? t.insumo; return `${t.quantidade} ${ins?.unidade ?? ""}`; } },
        { key: "rota", label: "De → para", render: t => (
          <span style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
            <Tag tone="neutral">{nomeObraT(t.deObraId, t.deObra)}</Tag><span aria-hidden="true">→</span><Tag tone="success">{nomeObraT(t.paraObraId, t.paraObra)}</Tag>
          </span>
        ) },
        { key: "data", label: "Data", render: t => dataBR(t.data) },
      ]} />

      {modal && (
        <Modal title="Nova transferência de estoque" onClose={() => setModal(false)} wide
          footer={<><Button variant="secondary" onClick={() => setModal(false)}>Cancelar</Button><Button iconLeft="check" loading={salvandoTransf} disabled={!deObra || !paraObra || !insumoId || !(parseFloat(quantidade) > 0)} onClick={salvar}>Confirmar transferência</Button></>}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-md),1fr))", gap: "var(--space-3)" }}>
              <Select label="Obra de origem" required value={deObra} onChange={e => { setDeObra(e.target.value); setInsumoId(""); setQuantidade(""); }}>
                {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
              </Select>
              <Select label="Obra de destino" required value={paraObra} onChange={e => setParaObra(e.target.value)}>
                <option value="">Selecione…</option>
                {obras.filter(o => o.id.toString() !== deObra).map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
              </Select>
            </div>
            <Select label="Insumo" required value={insumoId} onChange={e => { setInsumoId(e.target.value); setQuantidade(""); }}>
              <option value="">Selecione o insumo…</option>
              {insumosComSaldo.map(i => {
                const saldo = lotesOrigem.filter(e => e.insumoId === i.id).reduce((s, e) => s + (e.quantEntrada - e.quantUtilizado), 0);
                return <option key={i.id} value={i.id}>{i.nome} (saldo: {saldo} {i.unidade})</option>;
              })}
            </Select>
            {!insumosComSaldo.length && deObra && <Banner tone="warning">Nenhum insumo com saldo disponível nesta obra.</Banner>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-md),1fr))", gap: "var(--space-3)" }}>
              <Input label="Quantidade" required type="number" min="0" helper={insumoDados ? `Máximo ${saldoInsumo} ${insumoDados.unidade}` : undefined} placeholder="0" value={quantidade} onChange={e => setQuantidade(e.target.value)} />
              <Input label="Data" required type="date" value={dataTransf} onChange={e => setDataTransf(e.target.value)} />
            </div>
            <Input label="Observação (opcional)" value={obs} onChange={e => setObs(e.target.value)} placeholder="Ex.: sobra de material" />
          </div>
        </Modal>
      )}
    </>
  );
}

// ── Estoque (wrapper com abas) ────────────────────────────────────────────────
export default function Estoque({ data, setData, api, canWrite }) {
  const [aba, setAba] = useState("posicao");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <SegmentedTabs variant="light" value={aba} onChange={setAba} tabs={[{ value: "posicao", label: "Posição" }, { value: "baixa", label: "Baixa" }, { value: "transferencia", label: "Transferências" }]} />
      {aba === "posicao"       && <PosicaoEstoque       data={data} />}
      {aba === "baixa"         && <BaixaEstoque         data={data} setData={setData} api={api} canWrite={canWrite} />}
      {aba === "transferencia" && <TransferenciaEstoque data={data} setData={setData} api={api} canWrite={canWrite} />}
    </div>
  );
}
