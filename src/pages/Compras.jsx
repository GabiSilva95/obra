import { useState, useRef } from "react";
import { C, F } from "../constants/tokens";
import { fmt, validate, today } from "../utils/helpers";
import { exportCsv } from "../utils/export";
import { Icon, Badge, Card, Modal, Inp, Btn, Hdr, DSel, MoneyInp } from "../components/ui";
import { avisarErro, avisarSucesso, confirmar } from "../utils/aviso";

const STATUS_LIST = ["Pendente", "Aprovada", "Entregue", "Cancelada"];
const STATUS_COLORS = { Pendente: "yellow", Aprovada: "blue", Entregue: "green", Cancelada: "red" };

function totalOrdem(ordem) {
  if (ordem.itens?.length) {
    return ordem.itens.reduce((s, i) => s + (i.quantidade || 0) * (i.valorUnit || 0), 0);
  }
  return (ordem.quantidade || 0) * (ordem.valorUnit || 0);
}

// ─── Linhas de itens do formulário ───────────────────────────────────────────

function LinhasItens({ itens, setItens, insumos }) {
  const add = () => setItens(f => [...f, { insumoId: "", descricao: "", quantidade: 1, valorUnit: "" }]);
  const rem = i => setItens(f => f.filter((_, j) => j !== i));
  const upd = (i, k, v) => setItens(f => f.map((l, j) => j === i ? { ...l, [k]: v } : l));

  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 8, ...F }}>
        Itens da ordem
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {itens.map((ln, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 110px 110px 32px", gap: 8, alignItems: "end" }}>
            {/* Insumo */}
            <div>
              {i === 0 && <div style={{ fontSize: 10, color: C.dim, fontWeight: 600, marginBottom: 4, ...F }}>Insumo</div>}
              <select
                value={ln.insumoId || ""}
                onChange={e => {
                  const ins = insumos.find(x => x.id === parseInt(e.target.value));
                  upd(i, "insumoId", e.target.value ? parseInt(e.target.value) : "");
                  if (ins) upd(i, "valorUnit", ins.custoUnit || "");
                }}
                style={{ width: "100%", background: "rgba(255,255,255,.04)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 10px", fontSize: 12, color: C.text, outline: "none", ...F }}
              >
                <option value="">Livre (descrição abaixo)</option>
                {insumos.map(ins => <option key={ins.id} value={ins.id}>{ins.nome} ({ins.unidade})</option>)}
              </select>
            </div>
            {/* Descrição */}
            <Inp
              label={i === 0 ? "Descrição" : undefined}
              placeholder="Descrição do item"
              value={ln.descricao || ""}
              onChange={e => upd(i, "descricao", e.target.value)}
            />
            {/* Quantidade */}
            <Inp
              label={i === 0 ? "Qtd." : undefined}
              type="number"
              placeholder="0"
              value={ln.quantidade || ""}
              onChange={e => upd(i, "quantidade", e.target.value)}
            />
            {/* Valor unit. */}
            <MoneyInp
              label={i === 0 ? "Valor Unit." : undefined}
              value={ln.valorUnit ?? ""}
              onChange={e => upd(i, "valorUnit", e.target.value)}
            />
            {/* Remover */}
            <button
              onClick={() => rem(i)}
              disabled={itens.length === 1}
              style={{ height: 36, width: 32, border: `1px solid ${C.border}`, borderRadius: 9, background: "transparent", cursor: itens.length === 1 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: itens.length === 1 ? 0.3 : 1, flexShrink: 0 }}
            >
              <Icon n="trash" size={13} color={C.dim} />
            </button>
          </div>
        ))}
      </div>
      {/* Subtotal por linha */}
      {itens.some(l => l.quantidade > 0 && l.valorUnit > 0) && (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 3 }}>
          {itens.filter(l => l.quantidade > 0 && l.valorUnit > 0).map((l, i) => {
            const ins = insumos.find(x => x.id === parseInt(l.insumoId));
            return (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.muted }}>
                <span>{ins?.nome || l.descricao || `Item ${i + 1}`}</span>
                <span style={{ fontWeight: 600, color: C.text }}>{fmt((l.quantidade || 0) * (l.valorUnit || 0))}</span>
              </div>
            );
          })}
        </div>
      )}
      <button
        onClick={add}
        style={{ marginTop: 10, background: "none", border: `1px dashed ${C.border}`, borderRadius: 9, padding: "7px 14px", cursor: "pointer", fontSize: 11, color: C.muted, ...F, display: "flex", alignItems: "center", gap: 6, width: "100%", justifyContent: "center" }}
      >
        <Icon n="plus" size={12} color={C.muted} />Adicionar item
      </button>
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
  const fileRef = useRef();
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
            {canWrite && <Btn v="outline" onClick={abrirNfModal} sx={{ fontSize: 11, padding: "6px 11px" }}><Icon n="file" size={12} />Importar NF</Btn>}
            {canWrite && <Btn onClick={abrirNova}><Icon n="plus" size={13} />Nova Ordem</Btn>}
          </div>
        }
      />

      {/* Stat row */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { l: "Pendentes",  v: fmt(totalPendente), c: "#f59e0b", n: compras.filter(c => c.status === "Pendente").length },
          { l: "Aprovadas",  v: fmt(totalAprovado), c: "#60a5fa", n: compras.filter(c => c.status === "Aprovada").length },
          { l: "Entregues",  v: fmt(totalEntregue), c: "#22c55e", n: compras.filter(c => c.status === "Entregue").length },
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
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {lista.map(c => {
            const obra  = obras.find(o => o.id === c.obraId);
            const total = totalOrdem(c);
            const itens = c.itens?.length ? c.itens : [];
            const aberto = expandido === c.id;

            return (
              <Card key={c.id} style={{ padding: 0, overflow: "hidden" }}>
                {/* Cabeçalho */}
                <div
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", cursor: "pointer" }}
                  onClick={() => setExpandido(aberto ? null : c.id)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 10, color: C.orange, fontWeight: 800, ...F, letterSpacing: "0.04em" }}>
                        OC #{c.numero ?? c.id}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: 13, color: C.text, ...F }}>
                        {c.fornecedorPessoa?.nome || c.fornecedor || "Sem fornecedor"}
                      </span>
                      {c.fornecedorPessoa && <span style={{ fontSize: 10, color: C.green, background: "rgba(34,197,94,.1)", borderRadius: 5, padding: "2px 6px" }}>cadastrado</span>}
                      <Badge v={STATUS_COLORS[c.status]}>{c.status}</Badge>
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>
                      {obra?.nome} · {new Date(c.data + "T12:00:00").toLocaleDateString("pt-BR")}
                      {itens.length > 0 && <span style={{ marginLeft: 8, color: C.dim }}>{itens.length} item{itens.length !== 1 ? "s" : ""}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: C.text, ...F }}>{total > 0 ? fmt(total) : "—"}</div>
                  </div>
                  {canWrite && (
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                      <select
                        value={c.status}
                        onChange={e => setStatus(c.id, e.target.value)}
                        style={{ background: "rgba(255,255,255,.04)", border: `1px solid ${C.border}`, borderRadius: 7, padding: "4px 8px", fontSize: 11, color: C.text, outline: "none", cursor: "pointer", ...F }}
                      >
                        {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <button onClick={() => abrirEditar(c)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><Icon n="edit" size={12} color={C.dim} /></button>
                      <button onClick={() => del(c.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><Icon n="trash" size={12} color={C.dim} /></button>
                    </div>
                  )}
                  <Icon n={aberto ? "chevron-up" : "chevron-down"} size={12} color={C.dim} />
                </div>

                {/* Itens expandidos */}
                {aberto && (
                  <div style={{ borderTop: `1px solid ${C.borderLight}` }}>
                    {itens.length > 0 ? (
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead>
                          <tr style={{ background: "rgba(255,255,255,.015)" }}>
                            {["Insumo / Descrição", "Qtd.", "Valor Unit.", "Total"].map(h => (
                              <th key={h} style={{ padding: "8px 16px", textAlign: "left", color: C.dim, fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", ...F }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {itens.map((item, idx) => {
                            const ins = item.insumo || insumos.find(i => i.id === item.insumoId);
                            return (
                              <tr key={idx} style={{ borderTop: `1px solid ${C.borderLight}` }}>
                                <td style={{ padding: "9px 16px", color: C.text, fontWeight: 500 }}>
                                  {ins?.nome || item.descricao || "—"}
                                  {item.descricao && ins && <span style={{ color: C.dim, fontSize: 10, marginLeft: 6 }}>{item.descricao}</span>}
                                </td>
                                <td style={{ padding: "9px 16px", color: C.muted }}>{item.quantidade} {ins?.unidade || ""}</td>
                                <td style={{ padding: "9px 16px", color: C.muted }}>{item.valorUnit > 0 ? fmt(item.valorUnit) : "—"}</td>
                                <td style={{ padding: "9px 16px", fontWeight: 700, color: C.text }}>{fmt(item.quantidade * item.valorUnit)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <div style={{ padding: "12px 16px", fontSize: 12, color: C.dim }}>Sem itens cadastrados.</div>
                    )}
                    {c.obs && (
                      <div style={{ padding: "10px 16px", fontSize: 11, color: C.muted, borderTop: `1px solid ${C.borderLight}` }}>
                        <span style={{ color: C.dim }}>Obs: </span>{c.obs}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Modal Importar NF ──────────────────────────────────────────────────── */}
      {nfModal && (
        <Modal title="Importar Nota Fiscal" onClose={() => { setNfModal(false); setNfStep(1); setNfData(null); setNfOcId(""); }} wide>
          {nfStep === 1 && (
            <div>
              <div style={{ border: `2px dashed ${C.border}`, borderRadius: 14, padding: "52px 40px", textAlign: "center", cursor: "pointer" }} onClick={() => fileRef.current?.click()}>
                <input ref={fileRef} type="file" accept=".xml" style={{ display: "none" }} onChange={onNfFile} />
                {nfLoading ? (
                  <div style={{ color: C.muted, fontSize: 13, ...F }}>Processando...</div>
                ) : (
                  <div>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: C.orangeDim, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}><Icon n="file" size={20} color={C.orange} /></div>
                    <div style={{ fontWeight: 700, color: C.text, fontSize: 13, ...F, marginBottom: 4 }}>Clique para selecionar o XML</div>
                    <div style={{ color: C.dim, fontSize: 11 }}>Apenas NF-e (.xml)</div>
                  </div>
                )}
              </div>
            </div>
          )}
          {nfStep === 2 && nfData && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Dados da NF */}
              <div style={{ background: "rgba(34,197,94,.05)", border: "1px solid rgba(34,197,94,.18)", borderRadius: 10, padding: "11px 14px" }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: C.green, marginBottom: 4 }}><Icon n="check" size={12} color={C.green} /> {nfData.arquivo}</div>
                <div style={{ fontSize: 11, color: "rgba(34,197,94,.75)", display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {nfData.fornecedor && <span>Fornecedor: <b>{nfData.fornecedor}</b></span>}
                  {nfData.nfe        && <span>NF: <b>{nfData.nfe}</b></span>}
                  {nfData.data       && <span>Emissão: <b>{new Date(nfData.data + "T12:00:00").toLocaleDateString("pt-BR")}</b></span>}
                </div>
              </div>

              {/* Itens da NF */}
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, maxHeight: 180, overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead><tr style={{ background: "rgba(255,255,255,.02)" }}>
                    {["Produto","Un.","Qtd.","Valor Unit."].map(h => <th key={h} style={{ padding: "7px 12px", textAlign: "left", color: C.dim, fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", ...F }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {nfData.itens.map((item, i) => (
                      <tr key={i} style={{ borderTop: `1px solid ${C.borderLight}` }}>
                        <td style={{ padding: "7px 12px", color: C.text }}>{item.nome}</td>
                        <td style={{ padding: "7px 12px", color: C.muted }}>{item.unidade}</td>
                        <td style={{ padding: "7px 12px", color: C.text }}>{item.quantidade}</td>
                        <td style={{ padding: "7px 12px", color: C.muted }}>{fmt(item.valorUnit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Vinculação a OC Aprovada */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 8, ...F }}>
                  Vincular a Ordem de Compra Aprovada
                </div>
                {!ocAprovadas.length ? (
                  <div style={{ fontSize: 12, color: C.muted, background: C.orangeDim, borderRadius: 9, padding: "10px 13px" }}>
                    Não há ordens com status <b>Aprovada</b>. Aprove uma OC antes de importar a NF.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {ocAprovadas.map(oc => {
                      const obra = obras.find(o => o.id === oc.obraId);
                      const sel  = nfOcId === String(oc.id);
                      return (
                        <div
                          key={oc.id}
                          onClick={() => setNfOcId(String(oc.id))}
                          style={{ cursor: "pointer", border: `1px solid ${sel ? C.orange : C.border}`, borderRadius: 10, padding: "10px 14px", background: sel ? C.orangeDim : "transparent", transition: "all .15s" }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <span style={{ fontSize: 11, fontWeight: 800, color: sel ? C.orange : C.text, ...F }}>OC #{oc.numero ?? oc.id}</span>
                              <span style={{ fontSize: 11, color: C.muted, marginLeft: 8 }}>{oc.fornecedorPessoa?.nome || oc.fornecedor || "Sem fornecedor"}</span>
                            </div>
                            <div style={{ fontSize: 11, color: C.muted }}>{obra?.nome} · {new Date(oc.data + "T12:00:00").toLocaleDateString("pt-BR")}</div>
                          </div>
                          <div style={{ fontSize: 10, color: C.dim, marginTop: 3 }}>
                            {oc.itens?.length ?? 0} item{oc.itens?.length !== 1 ? "s" : ""} · {fmt(totalOrdem(oc))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 9, justifyContent: "flex-end", borderTop: `1px solid ${C.borderLight}`, paddingTop: 12 }}>
                <Btn v="secondary" onClick={() => setNfStep(1)}>← Voltar</Btn>
                <Btn disabled={!nfOcId || vinculando} onClick={vincularNf}><Icon n="check" size={13} />{vinculando ? "Vinculando..." : "Confirmar e Dar Entrada"}</Btn>
              </div>
            </div>
          )}
        </Modal>
      )}

      {modal && (
        <Modal title={form.id ? "Editar Ordem de Compra" : "Nova Ordem de Compra"} onClose={() => { setModal(false); setErros({}); }} wide>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 6, ...F }}>Obra *</div>
                <select
                  value={form.obraId || ""}
                  onChange={e => setForm(f => ({ ...f, obraId: parseInt(e.target.value) }))}
                  style={{ width: "100%", background: "rgba(255,255,255,.04)", border: `1px solid ${erros.obraId ? "#ef4444" : C.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 12, color: C.text, outline: "none", ...F }}
                >
                  <option value="">Selecione...</option>
                  {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
                </select>
              </div>
              <Inp label="Data *" type="date" error={erros.data} value={form.data || ""} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 6, ...F }}>Fornecedor</div>
                {fornecedores.length > 0 ? (
                  <select
                    value={form.fornecedorId || ""}
                    onChange={e => {
                      const fId = e.target.value ? parseInt(e.target.value) : null;
                      const fObj = fornecedores.find(f => f.id === fId);
                      setForm(f => ({ ...f, fornecedorId: fId, fornecedor: fObj ? fObj.nome : f.fornecedor }));
                    }}
                    style={{ width: "100%", background: "rgba(255,255,255,.04)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 12, color: C.text, outline: "none", ...F, marginBottom: 6 }}
                  >
                    <option value="">— Selecionar do cadastro —</option>
                    {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                  </select>
                ) : null}
                <Inp
                  placeholder={fornecedores.length > 0 ? "Ou digite nome livre" : "Nome do fornecedor"}
                  value={form.fornecedor || ""}
                  onChange={e => setForm(f => ({ ...f, fornecedor: e.target.value, fornecedorId: null }))}
                />
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 6, ...F }}>Etapa (opcional)</div>
                <select
                  value={form.etapaId || ""}
                  onChange={e => setForm(f => ({ ...f, etapaId: e.target.value ? parseInt(e.target.value) : null }))}
                  style={{ width: "100%", background: "rgba(255,255,255,.04)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 12, color: C.text, outline: "none", ...F }}
                >
                  <option value="">Sem etapa</option>
                  {etapasObra.filter(e => e.obraId === parseInt(form.obraId || 0)).map(et => {
                    const tp = tiposEtapa.find(t => t.id === et.tipoEtapaId);
                    return <option key={et.id} value={et.id}>{tp?.nome || `Etapa ${et.id}`}</option>;
                  })}
                </select>
              </div>
            </div>

            <LinhasItens itens={itensForm} setItens={setItensForm} insumos={insumos} />
            {erros.itens && <div style={{ fontSize: 11, color: "#ef4444" }}>{erros.itens}</div>}

            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 6, ...F }}>Observações</div>
              <textarea value={form.obs || ""} onChange={e => setForm(f => ({ ...f, obs: e.target.value }))} rows={2} style={{ width: "100%", background: "rgba(255,255,255,.04)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 12, color: C.text, outline: "none", resize: "vertical", ...F, fontFamily: "inherit" }} />
            </div>

            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 6, ...F }}>Status</div>
              <select value={form.status || "Pendente"} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={{ width: "100%", background: "rgba(255,255,255,.04)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 12, color: C.text, outline: "none", ...F }}>
                {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {totalForm > 0 && (
              <div style={{ background: C.orangeDim, border: `1px solid ${C.orange}22`, borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: C.muted }}>Total da ordem</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: C.orange, ...F }}>{fmt(totalForm)}</span>
              </div>
            )}

            <div style={{ display: "flex", gap: 9, justifyContent: "flex-end", borderTop: `1px solid ${C.borderLight}`, paddingTop: 14 }}>
              <Btn v="secondary" onClick={() => { setModal(false); setErros({}); }}>Cancelar</Btn>
              <Btn disabled={salvando} onClick={save}><Icon n="check" size={13} />{salvando ? "Salvando..." : "Salvar Ordem"}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
