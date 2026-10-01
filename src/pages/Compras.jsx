import { useState } from "react";
import { fmt, validate } from "../utils/helpers";
import { exportCsv } from "../utils/export";
import { avisarErro, avisarSucesso, confirmar } from "../utils/aviso";
import { Badge, Banner, Button, Card, DataTable, IconButton, Input, Modal, MoneyInput, SegmentedTabs, Select, StatCard, Tag, Textarea, UploadBox, useIsMobile } from "../../design-system";
import { PageActions } from "../components/PageActions";

const STATUS_LIST = ["Pendente", "Aprovada", "Entregue", "Cancelada"];
const STATUS_COLORS = { Pendente: "warning", Aprovada: "info", Entregue: "success", Cancelada: "error" };

function totalOrdem(ordem) {
  if (ordem.itens?.length) {
    return ordem.itens.reduce((s, i) => s + (i.quantidade || 0) * (i.valorUnit || 0), 0);
  }
  return (ordem.quantidade || 0) * (ordem.valorUnit || 0);
}

// ─── Linhas de itens do formulário ───────────────────────────────────────────

const dataBR = d => new Date(d + "T12:00:00").toLocaleDateString("pt-BR");

function LinhasItens({ itens, setItens, insumos }) {
  const mobile = useIsMobile();
  const add = () => setItens(f => [...f, { insumoId: "", descricao: "", quantidade: 1, valorUnit: "" }]);
  const rem = i => setItens(f => f.filter((_, j) => j !== i));
  const upd = (i, k, v) => setItens(f => f.map((l, j) => j === i ? { ...l, [k]: v } : l));
  const cols = mobile ? "1fr 1fr" : "minmax(0,1.3fr) minmax(0,1fr) var(--col-min-xs) var(--col-min-xs) var(--control-h-md)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <h3 style={{ margin: 0, font: "var(--type-card-title)", fontSize: "var(--fs-p4)" }}>Itens da ordem</h3>
      {itens.map((ln, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: cols, gap: "var(--space-2)", alignItems: "end" }}>
          <Select label={i === 0 || mobile ? "Insumo" : undefined} aria-label="Insumo" value={ln.insumoId || ""}
            onChange={e => {
              const ins = insumos.find(x => x.id === parseInt(e.target.value));
              upd(i, "insumoId", e.target.value ? parseInt(e.target.value) : "");
              if (ins) upd(i, "valorUnit", ins.custoUnit || "");
            }}>
            <option value="">Livre (descrição ao lado)</option>
            {insumos.map(ins => <option key={ins.id} value={ins.id}>{ins.nome} ({ins.unidade})</option>)}
          </Select>
          <Input label={i === 0 || mobile ? "Descrição" : undefined} aria-label="Descrição" placeholder="Descrição do item" value={ln.descricao || ""} onChange={e => upd(i, "descricao", e.target.value)} />
          <Input label={i === 0 || mobile ? "Qtd." : undefined} aria-label="Quantidade" type="number" min="0" placeholder="0" value={ln.quantidade || ""} onChange={e => upd(i, "quantidade", e.target.value)} />
          <MoneyInput label={i === 0 || mobile ? "Valor unit." : undefined} aria-label="Valor unitário" value={ln.valorUnit ?? ""} onChange={e => upd(i, "valorUnit", e.target.value)} />
          <IconButton icon="trash-2" variant="outline" size={40} label="Remover item" disabled={itens.length === 1} onClick={() => rem(i)} />
        </div>
      ))}
      {itens.some(l => l.quantidade > 0 && l.valorUnit > 0) && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)", fontSize: "var(--fs-p5-5)" }}>
          {itens.filter(l => l.quantidade > 0 && l.valorUnit > 0).map((l, i) => {
            const ins = insumos.find(x => x.id === parseInt(l.insumoId));
            return (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)" }}>
                <span>{ins?.nome || l.descricao || `Item ${i + 1}`}</span>
                <b style={{ color: "var(--text-primary)" }}>{fmt((l.quantidade || 0) * (l.valorUnit || 0))}</b>
              </div>
            );
          })}
        </div>
      )}
      <Button variant="secondary" iconLeft="plus" fullWidth onClick={add}>Adicionar item</Button>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Compras({ data, setData, api, canWrite }) {
  const { obras, insumos, compras = [], etapasObra = [], tiposEtapa = [], funcionarios = [] } = data;
  const fornecedores = funcionarios.filter(f => f.isFornecedor);
  const [obraFiltro, setObraFiltro] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [itensForm, setItensForm] = useState([{ insumoId: "", descricao: "", quantidade: 1, valorUnit: "" }]);
  const [erros, setErros] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [expandido, setExpandido] = useState(null);

  // ── Importação NF ─────────────────────────────────────────────────────────
  const [nfStep, setNfStep]     = useState(1); // 1=upload 2=vincular
  const [nfData, setNfData]     = useState(null);
  const [nfModal, setNfModal]   = useState(false);
  const [nfOcId, setNfOcId]     = useState("");
  const [nfLoading, setNfLoading] = useState(false);
  const [vinculando, setVinculando] = useState(false);

  const ocAprovadas = compras.filter(c => c.status === "Aprovada");

  const onNfFile = e => {
    const file = e.target.files?.[0]; if (!file) return;
    if (!file.name.toLowerCase().endsWith(".xml")) {
      avisarErro("Por enquanto apenas arquivos XML NF-e são suportados."); return;
    }
    setNfLoading(true);
    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        const xml = ev.target.result;
        const dados = await api.post("/compras/importar-nf", { xml });
        setNfData({ ...dados, arquivo: file.name });
        setNfStep(2);
      } catch (err) { avisarErro(err.message || "Erro ao processar o XML."); }
      finally { setNfLoading(false); }
    };
    reader.readAsText(file, "UTF-8");
  };

  const vincularNf = async () => {
    if (!nfOcId || vinculando) return;
    setVinculando(true);
    try {
      const { estoquesGerados = [], ...updated } = await api.patch(`/compras/${nfOcId}/status`, { status: "Entregue" });
      setData(d => ({
        ...d,
        compras:  d.compras.map(x => x.id === parseInt(nfOcId) ? { ...x, status: "Entregue" } : x),
        estoques: estoquesGerados.length ? [...d.estoques, ...estoquesGerados] : d.estoques,
      }));
      const n = estoquesGerados.length;
      avisarSucesso(`NF vinculada. Ordem marcada como Entregue.${n ? ` ${n} lote(s) no estoque.` : ""}`, "Importação concluída");
      setNfModal(false); setNfStep(1); setNfData(null); setNfOcId("");
    } catch (err) { avisarErro(err.message || "Erro ao vincular NF."); }
    finally { setVinculando(false); }
  };

  const abrirNfModal = () => { setNfStep(1); setNfData(null); setNfOcId(""); setNfModal(true); };

  const lista = compras
    .filter(c => (!obraFiltro || c.obraId === parseInt(obraFiltro)) && (!statusFiltro || c.status === statusFiltro))
    .sort((a, b) => b.data.localeCompare(a.data));

  const totalPendente  = compras.filter(c => c.status === "Pendente").reduce((s, c)  => s + totalOrdem(c), 0);
  const totalAprovado  = compras.filter(c => c.status === "Aprovada").reduce((s, c)  => s + totalOrdem(c), 0);
  const totalEntregue  = compras.filter(c => c.status === "Entregue").reduce((s, c)  => s + totalOrdem(c), 0);

  const abrirNova = () => {
    setForm({ obraId: obraFiltro || obras[0]?.id, data: new Date().toISOString().slice(0, 10), status: "Pendente" });
    setItensForm([{ insumoId: "", descricao: "", quantidade: 1, valorUnit: "" }]);
    setModal(true);
  };

  const abrirEditar = c => {
    setForm({ id: c.id, obraId: c.obraId, etapaId: c.etapaId, fornecedor: c.fornecedor, fornecedorId: c.fornecedorId, status: c.status, data: c.data, obs: c.obs });
    setItensForm(
      c.itens?.length
        ? c.itens.map(i => ({ insumoId: i.insumoId || "", descricao: i.descricao || "", quantidade: i.quantidade, valorUnit: i.valorUnit }))
        : [{ insumoId: c.insumoId || "", descricao: c.descricao || "", quantidade: c.quantidade || 1, valorUnit: c.valorUnit || "" }]
    );
    setModal(true);
  };

  const save = async () => {
    if (salvando) return;
    const { ok, erros: e } = validate(form, {
      obraId: { required: true, label: "Obra" },
      data:   { required: true, label: "Data" },
    });
    const linhasValidas = itensForm.filter(l => l.quantidade > 0 && (l.insumoId || l.descricao));
    if (!ok || !linhasValidas.length) {
      setErros({ ...e, ...(linhasValidas.length === 0 ? { itens: "Adicione ao menos um item com quantidade." } : {}) });
      return;
    }
    setSalvando(true);
    try {
      const payload = { ...form, itens: linhasValidas };
      if (form.id) {
        const { estoquesGerados = [], ...updated } = await api.put(`/compras/${form.id}`, payload);
        setData(d => ({
          ...d,
          compras:  d.compras.map(x => x.id === form.id ? updated : x),
          estoques: estoquesGerados.length ? [...d.estoques, ...estoquesGerados] : d.estoques,
        }));
        avisarSucesso("Ordem de compra atualizada.");
      } else {
        const nova = await api.post("/compras", payload);
        setData(d => ({ ...d, compras: [nova, ...(d.compras || [])] }));
        avisarSucesso("Ordem de compra criada.");
      }
      setErros({}); setModal(false);
    } catch (err) { if (!err.limitePlano) avisarErro(err.message); }
    finally { setSalvando(false); }
  };

  const setStatus = async (id, status) => {
    try {
      const { estoquesGerados = [], ...updated } = await api.patch(`/compras/${id}/status`, { status });
      setData(d => ({
        ...d,
        compras:  d.compras.map(x => x.id === id ? { ...x, status } : x),
        estoques: estoquesGerados.length ? [...d.estoques, ...estoquesGerados] : d.estoques,
      }));
      if (estoquesGerados.length) {
        avisarSucesso(`${estoquesGerados.length} lote(s) de material deram entrada no estoque da obra.`, "Entrada registrada");
      }
    } catch (err) { if (!err.limitePlano) avisarErro(err.message); }
  };

  const del = async id => {
    if (!(await confirmar({ mensagem: "Remover ordem de compra?", confirmarRotulo: "Remover", perigo: true }))) return;
    try {
      await api.del(`/compras/${id}`);
      setData(d => ({ ...d, compras: d.compras.filter(x => x.id !== id) }));
    } catch (err) { if (!err.limitePlano) avisarErro(err.message); }
  };

  const handleExport = () => {
    const rows = [];
    lista.forEach(c => {
      const obra = obras.find(o => o.id === c.obraId);
      const itens = c.itens?.length ? c.itens : [{ descricao: c.descricao, quantidade: c.quantidade, valorUnit: c.valorUnit, insumo: c.insumo }];
      itens.forEach(item => {
        const ins = item.insumo || insumos.find(i => i.id === item.insumoId);
        rows.push([obra?.nome || "", item.descricao || ins?.nome || "", c.fornecedor || "", item.quantidade, item.valorUnit, (item.quantidade * item.valorUnit).toFixed(2), c.status, c.data]);
      });
    });
    exportCsv("compras.csv", rows, ["Obra", "Descrição", "Fornecedor", "Qtd", "Valor Unit.", "Total", "Status", "Data"]);
  };

  const totalForm = itensForm.reduce((s, l) => s + (parseFloat(l.quantidade) || 0) * (parseFloat(l.valorUnit) || 0), 0);

  const mobile = useIsMobile();
  const fecharOc = () => { setModal(false); setErros({}); };
  const fecharNf = () => { setNfModal(false); setNfStep(1); setNfData(null); setNfOcId(""); };
  const ocAberta = compras.find(c => c.id === expandido);
  const nomeFornecedor = c => c.fornecedorPessoa?.nome || c.fornecedor || "Sem fornecedor";
  const contar = st => compras.filter(c => c.status === st).length;
  const statusCell = c => canWrite ? (
    <div onClick={e => e.stopPropagation()}>
      <Select aria-label={`Status da OC ${c.numero ?? c.id}`} style={{ height: "var(--control-h-sm)", minWidth: "var(--control-w-sm)" }} value={c.status} onChange={e => setStatus(c.id, e.target.value)} options={STATUS_LIST} />
    </div>
  ) : <Badge size="sm" tone={STATUS_COLORS[c.status]}>{c.status}</Badge>;
  const acoes = c => canWrite && (
    <div style={{ display: "flex", gap: "var(--space-1)" }} onClick={e => e.stopPropagation()}>
      <IconButton icon="pencil" size={28} label="Editar" onClick={() => abrirEditar(c)} />
      <IconButton icon="trash-2" variant="danger" size={28} label="Excluir" onClick={() => del(c.id)} />
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <PageActions>
        <Select aria-label="Filtrar obra" style={{ height: "var(--control-h-sm)", minWidth: "var(--control-w-md)" }} value={obraFiltro} onChange={e => setObraFiltro(e.target.value)}>
          <option value="">Todas as obras</option>
          {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </Select>
        <Button iconLeft="download" size="sm" variant="secondary" onClick={handleExport}>CSV</Button>
        {canWrite && <Button iconLeft="file-text" size="sm" variant="secondary" onClick={abrirNfModal}>Importar NF</Button>}
        {canWrite && <Button iconLeft="plus" onClick={abrirNova}>Nova ordem</Button>}
      </PageActions>
      <p style={{ color: "var(--text-secondary)" }}>Ordens de compra e solicitações de materiais.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-md),1fr))", gap: "var(--space-6)" }}>
        <StatCard value={fmt(totalPendente)} label={`Pendentes · ${contar("Pendente")} ordem(ns)`} color="var(--stat-2)" />
        <StatCard value={fmt(totalAprovado)} label={`Aprovadas · ${contar("Aprovada")} ordem(ns)`} color="var(--stat-1)" />
        <StatCard value={fmt(totalEntregue)} label={`Entregues · ${contar("Entregue")} ordem(ns)`} color="var(--stat-3)" />
      </div>

      <SegmentedTabs variant="light" value={statusFiltro} onChange={setStatusFiltro}
        tabs={[{ value: "", label: "Todos", count: compras.length }, ...STATUS_LIST.map(st => ({ value: st, label: st, count: contar(st) }))]} />

      {mobile ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {lista.length === 0 && <p style={{ color: "var(--text-secondary)", textAlign: "center" }}>Nenhuma ordem de compra.</p>}
          {lista.map(c => (
            <Card key={c.id} padding="var(--space-4)" onClick={() => setExpandido(c.id)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-2)" }}>
                <b>OC #{c.numero ?? c.id}</b><Badge size="sm" tone={STATUS_COLORS[c.status]}>{c.status}</Badge>
              </div>
              <span style={{ fontWeight: "var(--fw-semibold)" }}>{nomeFornecedor(c)}</span>
              <span style={{ fontSize: "var(--fs-p5-5)", color: "var(--text-secondary)" }}>{obras.find(o => o.id === c.obraId)?.nome} · {dataBR(c.data)}</span>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Tag tone="neutral">{(c.itens || []).length} item(ns)</Tag><b>{totalOrdem(c) > 0 ? fmt(totalOrdem(c)) : "—"}</b>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <DataTable minWidth={980} rows={lista} rowKey={c => c.id} onRowClick={c => setExpandido(c.id)} empty="Nenhuma ordem de compra." columns={[
          { key: "numero", label: "Pedido", render: c => <b>OC #{c.numero ?? c.id}</b> },
          { key: "fornecedor", label: "Fornecedor", render: c => (
            <span style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontWeight: "var(--fw-semibold)" }}>{nomeFornecedor(c)}</span>
              {c.fornecedorPessoa && <span style={{ fontSize: "var(--fs-p6)", color: "var(--text-secondary)" }}>Cadastrado</span>}
            </span>
          ) },
          { key: "obra", label: "Obra", render: c => obras.find(o => o.id === c.obraId)?.nome || "—" },
          { key: "itens", label: "Itens", render: c => <Tag tone="neutral">{(c.itens || []).length} item(ns)</Tag> },
          { key: "data", label: "Data", render: c => dataBR(c.data) },
          { key: "valor", label: "Valor", align: "right", render: c => <b>{totalOrdem(c) > 0 ? fmt(totalOrdem(c)) : "—"}</b> },
          { key: "status", label: "Status", render: statusCell },
          ...(canWrite ? [{ key: "acoes", label: "", width: "var(--space-24)", render: acoes }] : []),
        ]} />
      )}

      {ocAberta && (
        <Modal title={`OC #${ocAberta.numero ?? ocAberta.id} · ${nomeFornecedor(ocAberta)}`} onClose={() => setExpandido(null)} wide
          footer={canWrite ? <><Button variant="secondary" iconLeft="pencil" onClick={() => { setExpandido(null); abrirEditar(ocAberta); }}>Editar</Button><Button onClick={() => setExpandido(null)}>Fechar</Button></> : <Button onClick={() => setExpandido(null)}>Fechar</Button>}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2) var(--space-10)" }}>
              {[["Obra", obras.find(o => o.id === ocAberta.obraId)?.nome || "—"], ["Data", dataBR(ocAberta.data)], ["Status", <Badge key="s" size="sm" tone={STATUS_COLORS[ocAberta.status]}>{ocAberta.status}</Badge>], ["Total", fmt(totalOrdem(ocAberta))]].map(([l, v]) => (
                <div key={l} style={{ display: "flex", flexDirection: "column", gap: "var(--space-0-5)" }}><span style={{ fontSize: "var(--fs-p5-5)", color: "var(--text-secondary)" }}>{l}:</span><span style={{ fontWeight: "var(--fw-semibold)" }}>{v}</span></div>
              ))}
            </div>
            <DataTable dense minWidth={0} rows={ocAberta.itens || []} rowKey={(r, i) => i} empty="Sem itens cadastrados." columns={[
              { key: "item", label: "Insumo / descrição", render: item => { const ins = item.insumo || insumos.find(i => i.id === item.insumoId); return <span>{ins?.nome || item.descricao || "—"}{item.descricao && ins && <span style={{ color: "var(--text-secondary)" }}> · {item.descricao}</span>}</span>; } },
              { key: "qtd", label: "Qtd.", render: item => `${item.quantidade} ${(item.insumo || insumos.find(i => i.id === item.insumoId))?.unidade || ""}` },
              { key: "vu", label: "Valor unit.", align: "right", render: item => item.valorUnit > 0 ? fmt(item.valorUnit) : "—" },
              { key: "tot", label: "Total", align: "right", render: item => <b>{fmt(item.quantidade * item.valorUnit)}</b> },
            ]} />
            {ocAberta.obs && <p style={{ margin: 0 }}><b>Obs.:</b> {ocAberta.obs}</p>}
          </div>
        </Modal>
      )}

      {nfModal && (
        <Modal title="Importar nota fiscal" onClose={fecharNf} wide
          footer={nfStep === 2 ? <><Button variant="secondary" iconLeft="chevron-left" onClick={() => setNfStep(1)}>Voltar</Button><Button iconLeft="check" disabled={!nfOcId} loading={vinculando} onClick={vincularNf}>Confirmar e dar entrada</Button></> : undefined}>
          {nfStep === 1 && (
            <UploadBox title="Selecionar XML" hint="Escolha o XML da NF-e ou arraste aqui." formats="Apenas NF-e (.xml)" accept=".xml" busy={nfLoading}
              onFiles={files => onNfFile({ target: { files } })} />
          )}
          {nfStep === 2 && nfData && (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <Banner tone="success" title={nfData.arquivo}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-1) var(--space-4)" }}>
                  {nfData.fornecedor && <span>Fornecedor: <b>{nfData.fornecedor}</b></span>}
                  {nfData.nfe && <span>NF: <b>{nfData.nfe}</b></span>}
                  {nfData.data && <span>Emissão: <b>{dataBR(nfData.data)}</b></span>}
                </div>
              </Banner>
              <DataTable dense minWidth={0} rows={nfData.itens} rowKey={(r, i) => i} columns={[
                { key: "nome", label: "Produto" }, { key: "unidade", label: "Un." }, { key: "quantidade", label: "Qtd.", align: "right" },
                { key: "valorUnit", label: "Valor unit.", align: "right", render: item => fmt(item.valorUnit) },
              ]} />
              <h3 style={{ margin: 0, font: "var(--type-card-title)", fontSize: "var(--fs-p4)" }}>Vincular a uma ordem aprovada</h3>
              {!ocAprovadas.length ? (
                <Banner tone="warning">Não há ordens com status <b>Aprovada</b>. Aprove uma OC antes de importar a NF.</Banner>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  {ocAprovadas.map(oc => (
                    <Card key={oc.id} padding="var(--space-3) var(--space-4)" selected={nfOcId === String(oc.id)} onClick={() => setNfOcId(String(oc.id))} style={{ gap: "var(--space-1)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-2)", flexWrap: "wrap" }}>
                        <span><b>OC #{oc.numero ?? oc.id}</b> <span style={{ color: "var(--text-secondary)" }}>· {nomeFornecedor(oc)}</span></span>
                        <span style={{ color: "var(--text-secondary)" }}>{obras.find(o => o.id === oc.obraId)?.nome} · {dataBR(oc.data)}</span>
                      </div>
                      <span style={{ fontSize: "var(--fs-p6)", color: "var(--text-secondary)" }}>{oc.itens?.length ?? 0} item(ns) · {fmt(totalOrdem(oc))}</span>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </Modal>
      )}

      {modal && (
        <Modal title={form.id ? "Editar ordem de compra" : "Nova ordem de compra"} onClose={fecharOc} wide
          footer={<><Button variant="secondary" onClick={fecharOc}>Cancelar</Button><Button iconLeft="check" loading={salvando} onClick={save}>Salvar ordem</Button></>}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-md),1fr))", gap: "var(--space-4)" }}>
              <Select label="Obra" required error={erros.obraId} value={form.obraId || ""} onChange={e => setForm(f => ({ ...f, obraId: parseInt(e.target.value) }))}>
                <option value="">Selecione…</option>
                {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
              </Select>
              <Input label="Data" required type="date" error={erros.data} value={form.data || ""} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
              {fornecedores.length > 0 && (
                <Select label="Fornecedor cadastrado" value={form.fornecedorId || ""}
                  onChange={e => {
                    const fId = e.target.value ? parseInt(e.target.value) : null;
                    const fObj = fornecedores.find(f => f.id === fId);
                    setForm(f => ({ ...f, fornecedorId: fId, fornecedor: fObj ? fObj.nome : f.fornecedor }));
                  }}>
                  <option value="">Selecionar do cadastro…</option>
                  {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </Select>
              )}
              <Input label={fornecedores.length > 0 ? "Ou fornecedor livre" : "Fornecedor"} placeholder="Nome do fornecedor" value={form.fornecedor || ""}
                onChange={e => setForm(f => ({ ...f, fornecedor: e.target.value, fornecedorId: null }))} />
              <Select label="Etapa (opcional)" value={form.etapaId || ""} onChange={e => setForm(f => ({ ...f, etapaId: e.target.value ? parseInt(e.target.value) : null }))}>
                <option value="">Sem etapa</option>
                {etapasObra.filter(e => e.obraId === parseInt(form.obraId || 0)).map(et => {
                  const tp = tiposEtapa.find(t => t.id === et.tipoEtapaId);
                  return <option key={et.id} value={et.id}>{tp?.nome || `Etapa ${et.id}`}</option>;
                })}
              </Select>
              <Select label="Status" value={form.status || "Pendente"} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} options={STATUS_LIST} />
            </div>
            <LinhasItens itens={itensForm} setItens={setItensForm} insumos={insumos} />
            {erros.itens && <Banner tone="danger">{erros.itens}</Banner>}
            <Textarea label="Observações" rows={2} maxLength={1000} value={form.obs || ""} onChange={e => setForm(f => ({ ...f, obs: e.target.value }))} />
            {totalForm > 0 && <Banner tone="accent" title="Total da ordem">{fmt(totalForm)}</Banner>}
          </div>
        </Modal>
      )}
    </div>
  );
}
