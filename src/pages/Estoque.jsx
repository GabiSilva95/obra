import { useState, useRef } from "react";
import { C, F } from "../constants/tokens";
import { today, fmt } from "../utils/helpers";
import { Icon, Bar, Card, Modal, Inp, Sel, Btn, Hdr, DSel } from "../components/ui";

// ── Entrada de Insumos ────────────────────────────────────────────────────────
function EntradaInsumos({ data, setData, api, canWrite }) {
  const { obras, insumos, estoques } = data;
  const fileRef = useRef();
  const [modal, setModal] = useState(false);
  const [obraDestino, setObraDestino] = useState("");
  const [itensForm, setItensForm] = useState([{ insumoId: "", quantidade: "" }]);
  const addLinha = () => setItensForm(f => [...f, { insumoId: "", quantidade: "" }]);
  const remLinha = i => setItensForm(f => f.filter((_, j) => j !== i));
  const updLinha = (i, k, v) => setItensForm(f => f.map((l, j) => j === i ? { ...l, [k]: v } : l));

  const salvarEntrada = async () => {
    if (!obraDestino) return;
    const oId = parseInt(obraDestino);
    const linhas = itensForm.filter(l => l.insumoId && l.quantidade);
    try {
      for (const l of linhas) {
        const novo = await api.post("/estoque", { obraId: oId, insumoId: parseInt(l.insumoId), quantEntrada: parseFloat(l.quantidade), dataMov: today(), origem: "Manual" });
        setData(d => ({ ...d, estoques: [...d.estoques, novo] }));
      }
      setModal(false); setObraDestino(""); setItensForm([{ insumoId: "", quantidade: "" }]);
    } catch (err) { alert(err.message); }
  };

  const [impModal, setImpModal] = useState(false);
  const [step, setStep] = useState(1);
  const [impData, setImpData] = useState(null);
  const [impObra, setImpObra] = useState("");
  const [loading, setLoading] = useState(false);

  const onFile = e => {
    const file = e.target.files?.[0]; if (!file) return; setLoading(true);
    const ext = file.name.split(".").pop().toUpperCase();
    setTimeout(() => {
      setImpData({ fornecedor: "Distribuidora Santos Ltda", nfe: `NFE-${Math.floor(Math.random() * 90000 + 10000)}`, data: today(), itens: [{ nome: "Cimento CP-II 50kg", unidade: "saco 50kg", quantidade: 100, valorUnit: 39.90, categoria: "Material" }, { nome: "Areia Fina Lavada", unidade: "m³", quantidade: 15, valorUnit: 110.00, categoria: "Material" }, { nome: "Brita 1", unidade: "m³", quantidade: 10, valorUnit: 130.00, categoria: "Material" }], arquivo: file.name, tipo: ext });
      setLoading(false); setStep(2);
    }, 1800);
  };

  const confirmImp = async () => {
    if (!impObra) return;
    const oId = parseInt(impObra);
    try {
      for (const item of impData.itens) {
        let insumo = data.insumos.find(i => i.nome === item.nome);
        if (!insumo) {
          insumo = await api.post("/cadastros/insumos", { nome: item.nome, unidade: item.unidade, custoUnit: item.valorUnit, categoria: item.categoria, fornecedor: impData.fornecedor });
          setData(d => ({ ...d, insumos: [...d.insumos, insumo] }));
        }
        const novo = await api.post("/estoque", { obraId: oId, insumoId: insumo.id, quantEntrada: item.quantidade, dataMov: today(), origem: `Import. ${impData.tipo} - ${impData.nfe}` });
        setData(d => ({ ...d, estoques: [...d.estoques, novo] }));
      }
      setImpModal(false); setStep(1); setImpData(null); setImpObra("");
    } catch (err) { alert(err.message); }
  };

  const extrato = [...estoques].sort((a, b) => b.dataMov.localeCompare(a.dataMov));
  const lotes = extrato.reduce((acc, e) => {
    const key = `${e.obraId}||${e.dataMov}||${e.origem}`;
    if (!acc[key]) acc[key] = { obraId: e.obraId, dataMov: e.dataMov, origem: e.origem, itens: [] };
    acc[key].itens.push(e);
    return acc;
  }, {});
  const lotesArr = Object.values(lotes);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, ...F, letterSpacing: "-0.02em" }}>Entrada de Insumos</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Histórico de todas as entradas por obra</div>
        </div>
        {canWrite && (
          <div style={{ display: "flex", gap: 8 }}>
            <Btn v="outline" onClick={() => { setStep(1); setImpData(null); setImpObra(""); setImpModal(true); }} sx={{ fontSize: 11, padding: "6px 12px" }}><Icon n="upload" size={12} />Importar NF</Btn>
            <Btn onClick={() => setModal(true)} sx={{ fontSize: 11, padding: "6px 12px" }}><Icon n="plus" size={12} />Nova Entrada</Btn>
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {!lotesArr.length && <Card style={{ padding: "40px", textAlign: "center" }}><span style={{ color: C.dim, fontSize: 12 }}>Nenhuma entrada registrada.</span></Card>}
        {lotesArr.map((lote, idx) => {
          const obra = obras.find(o => o.id === lote.obraId);
          const total = lote.itens.reduce((s, e) => { const ins = insumos.find(x => x.id === e.insumoId); return s + (ins ? ins.custoUnit * e.quantEntrada : 0); }, 0);
          return (
            <Card key={idx} style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 16px", borderBottom: `1px solid ${C.borderLight}`, background: "rgba(255,255,255,.015)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: C.orangeDim, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon n="warehouse" size={13} color={C.orange} /></div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.text, ...F }}>{obra?.nome || "—"}</div>
                    <div style={{ fontSize: 10, color: C.dim, display: "flex", alignItems: "center", gap: 7, marginTop: 1 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Icon n="cal" size={9} color={C.dim} />{lote.dataMov}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Icon n="file" size={9} color={C.dim} />{lote.origem}</span>
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: C.dim }}>Total do lote</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: C.orange, ...F }}>{fmt(total)}</div>
                </div>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,.01)" }}>
                    {["Insumo", "Unidade", "Qtd. Entrada", "Custo Unit.", "Total"].map(h => (
                      <th key={h} style={{ padding: "8px 16px", textAlign: "left", color: C.dim, fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", ...F }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lote.itens.map(e => {
                    const ins = insumos.find(x => x.id === e.insumoId); if (!ins) return null;
                    return (
                      <tr key={e.id} style={{ borderTop: `1px solid ${C.borderLight}` }}>
                        <td style={{ padding: "9px 16px", fontWeight: 600, color: C.text, ...F }}>{ins.nome}</td>
                        <td style={{ padding: "9px 16px", color: C.muted }}>{ins.unidade}</td>
                        <td style={{ padding: "9px 16px", color: C.text }}>{e.quantEntrada}</td>
                        <td style={{ padding: "9px 16px", color: C.muted }}>{fmt(ins.custoUnit)}</td>
                        <td style={{ padding: "9px 16px", fontWeight: 700, color: C.orange }}>{fmt(ins.custoUnit * e.quantEntrada)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          );
        })}
      </div>

      {modal && (
        <Modal title="Nova Entrada de Insumos" onClose={() => setModal(false)} wide>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Sel label="Obra de Destino" value={obraDestino} onChange={e => setObraDestino(e.target.value)}>
              <option value="">— Selecione a obra —</option>
              {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
            </Sel>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 8, ...F }}>Itens da Entrada</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {itensForm.map((ln, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 140px 32px", gap: 8, alignItems: "end" }}>
                    <Sel label={i === 0 ? "Insumo" : undefined} value={ln.insumoId} onChange={e => updLinha(i, "insumoId", e.target.value)}>
                      <option value="">Selecione o insumo...</option>
                      {insumos.map(ins => <option key={ins.id} value={ins.id}>{ins.nome} ({ins.unidade})</option>)}
                    </Sel>
                    <Inp label={i === 0 ? "Quantidade" : undefined} type="number" placeholder="Qtd." value={ln.quantidade} onChange={e => updLinha(i, "quantidade", e.target.value)} />
                    <button onClick={() => remLinha(i)} disabled={itensForm.length === 1} style={{ height: 36, width: 32, border: `1px solid ${C.border}`, borderRadius: 9, background: "transparent", cursor: itensForm.length === 1 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: itensForm.length === 1 ? .3 : 1, flexShrink: 0 }}>
                      <Icon n="trash" size={13} color={C.dim} />
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={addLinha} style={{ marginTop: 8, background: "none", border: `1px dashed ${C.border}`, borderRadius: 9, padding: "7px 14px", cursor: "pointer", fontSize: 11, color: C.muted, ...F, display: "flex", alignItems: "center", gap: 6, width: "100%", justifyContent: "center" }}>
                <Icon n="plus" size={12} color={C.muted} />Adicionar item
              </button>
            </div>
            <div style={{ display: "flex", gap: 9, justifyContent: "flex-end", borderTop: `1px solid ${C.borderLight}`, paddingTop: 12 }}>
              <Btn v="secondary" onClick={() => setModal(false)}>Cancelar</Btn>
              <Btn disabled={!obraDestino || !itensForm.some(l => l.insumoId && l.quantidade)} onClick={salvarEntrada}><Icon n="check" size={13} />Registrar Entrada</Btn>
            </div>
          </div>
        </Modal>
      )}

      {impModal && (
        <Modal title="Importar Nota Fiscal" onClose={() => setImpModal(false)} wide>
          {step === 1 && (
            <div>
              <div style={{ background: C.orangeDim, border: "1px solid rgba(249,115,22,.2)", borderRadius: 10, padding: "11px 14px", marginBottom: 18, fontSize: 12, color: "rgba(249,115,22,.8)" }}>
                Formatos suportados: <b>XML (NF-e)</b>, <b>PDF</b>, <b>Excel (.xlsx)</b>.
              </div>
              <div style={{ border: `2px dashed ${C.border}`, borderRadius: 14, padding: "56px 40px", textAlign: "center", cursor: "pointer" }} onClick={() => fileRef.current?.click()}>
                <input ref={fileRef} type="file" accept=".xml,.pdf,.xlsx,.xls" style={{ display: "none" }} onChange={onFile} />
                {loading ? <div style={{ color: C.muted, fontSize: 13, ...F }}>Processando...</div> : (
                  <div>
                    <div style={{ width: 52, height: 52, borderRadius: 14, background: C.orangeDim, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}><Icon n="upload" size={22} color={C.orange} /></div>
                    <div style={{ fontWeight: 700, color: C.text, marginBottom: 5, fontSize: 13, ...F }}>Arraste ou clique para importar</div>
                    <div style={{ color: C.dim, fontSize: 11 }}>XML · PDF · Excel (.xlsx)</div>
                  </div>
                )}
              </div>
            </div>
          )}
          {step === 2 && impData && (
            <div>
              <div style={{ background: "rgba(34,197,94,.06)", border: "1px solid rgba(34,197,94,.18)", borderRadius: 10, padding: "11px 14px", marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, color: C.green, fontWeight: 700, fontSize: 12, marginBottom: 3 }}><Icon n="check" size={13} color={C.green} />Processado: {impData.arquivo}</div>
                <div style={{ fontSize: 11, color: "rgba(34,197,94,.65)" }}>Fornecedor: <b>{impData.fornecedor}</b> · NF: <b>{impData.nfe}</b></div>
              </div>
              <div style={{ marginBottom: 18 }}>
                <Sel label="Obra de Destino" value={impObra} onChange={e => setImpObra(e.target.value)}>
                  <option value="">— Selecione —</option>
                  {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
                </Sel>
              </div>
              <div style={{ display: "flex", gap: 9, justifyContent: "flex-end" }}>
                <Btn v="secondary" onClick={() => { setStep(1); setImpData(null); }}>← Voltar</Btn>
                <Btn disabled={!impObra} onClick={confirmImp}><Icon n="check" size={13} />Confirmar Importação</Btn>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

// ── Posição de Estoque ────────────────────────────────────────────────────────
function PosicaoEstoque({ data }) {
  const { obras, insumos, estoques } = data;
  const [obraId, setObraId] = useState(obras[0]?.id || null);
  const itens = estoques.filter(e => e.obraId === obraId);
  const totDisp = itens.reduce((s, e) => { const i = insumos.find(x => x.id === e.insumoId); return s + (i ? i.custoUnit * (e.quantEntrada - e.quantUtilizado) : 0); }, 0);
  const totUtil = itens.reduce((s, e) => { const i = insumos.find(x => x.id === e.insumoId); return s + (i ? i.custoUnit * e.quantUtilizado : 0); }, 0);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, ...F, letterSpacing: "-0.02em" }}>Posição de Estoque</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Saldo atual consolidado por obra</div>
        </div>
        <DSel value={obraId} onChange={e => setObraId(parseInt(e.target.value))}>
          {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </DSel>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
        <Card style={{ background: "rgba(34,197,94,.04)", borderColor: "rgba(34,197,94,.12)", padding: 16 }}>
          <div style={{ fontSize: 11, color: C.green, marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}><Icon n="warehouse" size={13} color={C.green} />Valor em Estoque</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.green, ...F, letterSpacing: "-0.04em" }}>{fmt(totDisp)}</div>
        </Card>
        <Card style={{ background: C.orangeDim, borderColor: "rgba(249,115,22,.18)", padding: 16 }}>
          <div style={{ fontSize: 11, color: C.orange, marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}><Icon n="link" size={13} color={C.orange} />Valor Consumido</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.orange, ...F, letterSpacing: "-0.04em" }}>{fmt(totUtil)}</div>
        </Card>
      </div>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,.02)" }}>
                {["Insumo", "Unid.", "Entrada", "Utilizado", "Disponível", "% Uso", "Custo Util.", "Custo Disp."].map(h => (
                  <th key={h} style={{ padding: "11px 14px", textAlign: "left", color: C.dim, fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", ...F, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {itens.map(item => {
                const ins = insumos.find(i => i.id === item.insumoId); if (!ins) return null;
                const disp = item.quantEntrada - item.quantUtilizado;
                const pct = Math.round((item.quantUtilizado / item.quantEntrada) * 100);
                return (
                  <tr key={item.id} style={{ borderTop: `1px solid ${C.borderLight}` }}>
                    <td style={{ padding: "11px 14px", fontWeight: 600, color: C.text, ...F }}>{ins.nome}</td>
                    <td style={{ padding: "11px 14px", color: C.muted }}>{ins.unidade}</td>
                    <td style={{ padding: "11px 14px", color: C.text }}>{item.quantEntrada}</td>
                    <td style={{ padding: "11px 14px", color: C.orange, fontWeight: 600 }}>{item.quantUtilizado}</td>
                    <td style={{ padding: "11px 14px", color: C.green, fontWeight: 600 }}>{disp}</td>
                    <td style={{ padding: "11px 14px" }}><div style={{ display: "flex", alignItems: "center", gap: 7 }}><div style={{ width: 52 }}><Bar val={pct} color={pct > 90 ? C.red : C.orange} /></div><span style={{ fontSize: 11, color: C.muted }}>{pct}%</span></div></td>
                    <td style={{ padding: "11px 14px", color: C.muted }}>{fmt(ins.custoUnit * item.quantUtilizado)}</td>
                    <td style={{ padding: "11px 14px", color: C.muted }}>{fmt(ins.custoUnit * disp)}</td>
                  </tr>
                );
              })}
              {!itens.length && <tr><td colSpan={8} style={{ padding: "48px", textAlign: "center", color: C.dim, fontSize: 12 }}>Nenhum insumo neste estoque.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ── Baixa de Estoque ─────────────────────────────────────────────────────────
function BaixaEstoque({ data, setData, api, canWrite }) {
  const { obras, insumos, estoques } = data;
  const [obraId, setObraId] = useState(obras[0]?.id || "");
  const [modal, setModal] = useState(false);
  const [itens, setItens] = useState([{ estoqueId: "", quantidade: "" }]);

  const obraEstoques = estoques.filter(e => e.obraId === parseInt(obraId));
  const comSaldo = obraEstoques.filter(e => (e.quantEntrada - e.quantUtilizado) > 0);

  const addLinha = () => setItens(f => [...f, { estoqueId: "", quantidade: "" }]);
  const remLinha = i => setItens(f => f.filter((_, j) => j !== i));
  const updLinha = (i, k, v) => setItens(f => f.map((l, j) => j === i ? { ...l, [k]: v } : l));

  const registrar = async () => {
    const validas = itens.filter(l => l.estoqueId && l.quantidade && parseFloat(l.quantidade) > 0);
    if (!validas.length) return;
    try {
      for (const l of validas) {
        const est = estoques.find(e => e.id === parseInt(l.estoqueId));
        if (!est) continue;
        const novoUtilizado = est.quantUtilizado + parseFloat(l.quantidade);
        const updated = await api.put(`/estoque/${est.id}`, { ...est, quantUtilizado: novoUtilizado });
        setData(d => ({ ...d, estoques: d.estoques.map(e => e.id === est.id ? { ...e, quantUtilizado: novoUtilizado } : e) }));
      }
      setModal(false); setItens([{ estoqueId: "", quantidade: "" }]);
    } catch (err) { alert(err.message); }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <DSel value={obraId} onChange={e => setObraId(e.target.value)}>
            {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
          </DSel>
        </div>
        {canWrite && <Btn onClick={() => { setItens([{ estoqueId: "", quantidade: "" }]); setModal(true); }} sx={{ fontSize: 12 }}><Icon n="minus" size={13} />Registrar Baixa</Btn>}
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "11px 14px", borderBottom: `1px solid ${C.borderLight}`, fontSize: 10, fontWeight: 700, color: C.dim, textTransform: "uppercase", letterSpacing: "0.08em", ...F }}>
          Saldo disponível — {obras.find(o => o.id === parseInt(obraId))?.nome}
        </div>
        {!comSaldo.length && <div style={{ padding: "48px", textAlign: "center", color: C.dim, fontSize: 12 }}>Sem estoque disponível para esta obra.</div>}
        {comSaldo.map(e => {
          const ins = insumos.find(i => i.id === e.insumoId);
          const saldo = e.quantEntrada - e.quantUtilizado;
          const pct = Math.round(e.quantUtilizado / e.quantEntrada * 100);
          return (
            <div key={e.id} style={{ padding: "13px 14px", borderBottom: `1px solid ${C.borderLight}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: C.orangeDim, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon n="cube" size={14} color={C.orange} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 12, color: C.text, ...F }}>{ins?.nome || "—"}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>
                      <span style={{ color: C.green, fontWeight: 600 }}>{saldo} {ins?.unidade}</span>
                      <span style={{ color: C.dim }}> disponível de {e.quantEntrada} {ins?.unidade} recebido</span>
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 11, color: pct > 80 ? C.red : pct > 50 ? C.yellow : C.muted }}>{pct}% consumido</div>
                </div>
              </div>
              <Bar val={pct} color={pct > 80 ? C.red : pct > 50 ? C.yellow : C.green} />
            </div>
          );
        })}
      </Card>

      {modal && (
        <Modal title="Registrar Baixa de Estoque" onClose={() => setModal(false)} wide>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 12, color: C.muted, background: "rgba(249,115,22,.05)", border: "1px solid rgba(249,115,22,.15)", borderRadius: 9, padding: "9px 13px" }}>
              <Icon n="alert" size={12} color={C.orange} /> Registre o consumo real de materiais da obra <b style={{ color: C.orange }}>{obras.find(o => o.id === parseInt(obraId))?.nome}</b>.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {itens.map((l, i) => {
                const est = estoques.find(e => e.id === parseInt(l.estoqueId));
                const saldo = est ? est.quantEntrada - est.quantUtilizado : 0;
                const ins = est ? insumos.find(x => x.id === est.insumoId) : null;
                return (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 160px 32px", gap: 8, alignItems: "flex-start" }}>
                    <Sel label={i === 0 ? "Insumo" : ""} value={l.estoqueId} onChange={e => updLinha(i, "estoqueId", e.target.value)}>
                      <option value="">Selecione...</option>
                      {comSaldo.map(e => { const ins = insumos.find(x => x.id === e.insumoId); return <option key={e.id} value={e.id}>{ins?.nome} (saldo: {e.quantEntrada - e.quantUtilizado} {ins?.unidade})</option>; })}
                    </Sel>
                    <Inp label={i === 0 ? "Quantidade" : ""} type="number" placeholder={ins ? `máx ${saldo}` : "0"} value={l.quantidade} onChange={e => updLinha(i, "quantidade", e.target.value)} />
                    {i > 0 && <button onClick={() => remLinha(i)} style={{ background: "none", border: "none", cursor: "pointer", color: C.dim, padding: "7px 0 0", alignSelf: "flex-end" }}><Icon n="trash" size={13} color={C.dim} /></button>}
                  </div>
                );
              })}
            </div>
            <button onClick={addLinha} style={{ background: "none", border: `1px dashed ${C.border}`, borderRadius: 9, padding: "7px 14px", cursor: "pointer", fontSize: 11, color: C.muted, ...F, display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
              <Icon n="plus" size={12} color={C.muted} />Adicionar item
            </button>
            <div style={{ display: "flex", gap: 9, justifyContent: "flex-end", borderTop: `1px solid ${C.borderLight}`, paddingTop: 12 }}>
              <Btn v="secondary" onClick={() => setModal(false)}>Cancelar</Btn>
              <Btn v="danger" disabled={!itens.some(l => l.estoqueId && l.quantidade)} onClick={registrar}><Icon n="check" size={13} />Confirmar Baixa</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Estoque (wrapper com abas) ────────────────────────────────────────────────
const ESTABS = [
  { id: "entradas", label: "Entrada de Insumos", icon: "upload" },
  { id: "baixa",    label: "Baixa de Estoque",   icon: "minus"   },
  { id: "posicao",  label: "Posição",             icon: "warehouse" },
];

export default function Estoque({ data, setData, api, canWrite }) {
  const [aba, setAba] = useState("entradas");
  return (
    <div>
      <Hdr title="Estoque" sub="Entradas, baixas e posição de estoque por obra" />
      <div style={{ display: "flex", gap: 2, marginBottom: 22, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 4, width: "fit-content" }}>
        {ESTABS.map(t => { const a = aba === t.id; return (
          <button key={t.id} onClick={() => setAba(t.id)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 15px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 12, fontWeight: a ? 700 : 500, transition: "all .15s", ...F, background: a ? C.orange : "transparent", color: a ? "#0a0a0a" : C.muted, letterSpacing: "-0.01em" }}>
            <Icon n={t.icon} size={13} color={a ? "#0a0a0a" : C.muted} />{t.label}
          </button>
        ); })}
      </div>
      {aba === "entradas" && <EntradaInsumos data={data} setData={setData} api={api} canWrite={canWrite} />}
      {aba === "baixa"    && <BaixaEstoque   data={data} setData={setData} api={api} canWrite={canWrite} />}
      {aba === "posicao"  && <PosicaoEstoque data={data} />}
    </div>
  );
}
