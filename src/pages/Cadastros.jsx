import { useState, useRef } from "react";
import { C, F } from "../constants/tokens";
import { validate, fmt } from "../utils/helpers";
import { Icon, Badge, Card, Modal, Inp, Sel, Btn, MoneyInp } from "../components/ui";
import { avisarErro, confirmar } from "../utils/aviso";
import TiposEtapa from "./TiposEtapa";

// ── Helpers de custo ─────────────────────────────────────────────────────────

function calcCustoHoraPreview({ tipoPropriedade, tipoCobranca, valorLocacao, valorAquisicao, vidaUtilAnos, horasProdMes }) {
  if (tipoPropriedade === "propria") {
    const va  = parseFloat(valorAquisicao) || 0;
    const vu  = parseInt(vidaUtilAnos)     || 0;
    const hpm = parseInt(horasProdMes)     || 0;
    if (va > 0 && vu > 0 && hpm > 0) return va / (vu * 12 * hpm);
    return null;
  }
  if (tipoPropriedade === "alugada") {
    const vl  = parseFloat(valorLocacao) || 0;
    const hpm = parseInt(horasProdMes)   || 160;
    if (vl <= 0) return null;
    return tipoCobranca === "hora" ? vl : vl / hpm;
  }
  return null;
}

// ── Máquinas ──────────────────────────────────────────────────────────────────
export function Maquinas({ data, setData, api, canWrite }) {
  const { maquinas, categoriasMaquina = [] } = data;
  const [modal, setModal] = useState(false);
  const [form, setForm]   = useState({});
  const [erros, setErros] = useState({});

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const custoPreview = calcCustoHoraPreview(form);
  const mostraCusto  = form.tipoPropriedade && custoPreview !== null;

  const save = async () => {
    const rules = { nome: { required: true, label: "Nome" } };
    if (!form.tipoPropriedade) {
      rules.custoHora = { required: true, min: 0.01, label: "Custo/Hora" };
    }
    const { ok, erros: e } = validate(form, rules);
    if (!ok) { setErros(e); return; }

    // Envia custoHora calculado pelo frontend para confirmar (backend recalcula)
    const payload = { ...form };
    if (mostraCusto) payload.custoHora = custoPreview;

    try {
      if (form.id) {
        const updated = await api.put(`/cadastros/maquinas/${form.id}`, payload);
        setData(d => ({ ...d, maquinas: d.maquinas.map(m => m.id === form.id ? updated : m) }));
      } else {
        const nova = await api.post("/cadastros/maquinas", payload);
        setData(d => ({ ...d, maquinas: [...d.maquinas, nova] }));
      }
      setErros({}); setModal(false);
    } catch (err) { if (!err.limitePlano) avisarErro(err.message); }
  };

  const del = async id => {
    if (!(await confirmar({ mensagem: "Remover máquina?", confirmarRotulo: "Remover", perigo: true }))) return;
    try {
      await api.del(`/cadastros/maquinas/${id}`);
      setData(d => ({ ...d, maquinas: d.maquinas.filter(m => m.id !== id) }));
    } catch (err) { if (!err.limitePlano) avisarErro(err.message); }
  };

  const tipoBadge = m => {
    if (m.tipoPropriedade === "propria")  return { label: "Própria",  v: "green"   };
    if (m.tipoPropriedade === "alugada")  return { label: "Alugada",  v: "orange"  };
    return { label: m.tipo || "—", v: "default" };
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, ...F, letterSpacing: "-0.02em" }}>Máquinas e Equipamentos</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Frota de máquinas com custo/hora automático</div>
        </div>
        {canWrite && <Btn onClick={() => { setForm({}); setModal(true); }}><Icon n="plus" size={13} />Nova Máquina</Btn>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12 }}>
        {maquinas.map(m => {
          const tb = tipoBadge(m);
          return (
            <Card key={m.id}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: C.orangeDim, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon n="excavator" size={17} color={C.orange} />
                </div>
                <Badge v={tb.v}>{tb.label}</Badge>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, ...F, letterSpacing: "-0.02em", marginBottom: 2 }}>{m.nome}</div>
              {m.categoria && (
                <div style={{ fontSize: 11, color: C.orange, marginBottom: 2 }}>{m.categoria.nome}</div>
              )}
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>Modelo: {m.modelo || "—"}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.orange, marginBottom: 12 }}>
                {fmt(m.custoHora)}<span style={{ fontSize: 10, fontWeight: 400, color: C.muted }}>/hora</span>
              </div>
              {canWrite && (
                <div style={{ display: "flex", gap: 7, borderTop: `1px solid ${C.borderLight}`, paddingTop: 11 }}>
                  <Btn v="secondary" onClick={() => { setForm({ ...m }); setModal(true); }} sx={{ fontSize: 11, padding: "5px 11px" }}><Icon n="edit" size={12} />Editar</Btn>
                  <Btn v="danger"    onClick={() => del(m.id)}                              sx={{ fontSize: 11, padding: "5px 11px" }}><Icon n="trash" size={12} />Remover</Btn>
                </div>
              )}
            </Card>
          );
        })}
        {!maquinas.length && (
          <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "40px 0", color: C.dim, fontSize: 12 }}>
            Nenhuma máquina cadastrada.
          </div>
        )}
      </div>

      {modal && (
        <Modal title={form.id ? "Editar Máquina" : "Nova Máquina"} onClose={() => { setModal(false); setErros({}); }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Nome */}
            <Inp label="Nome / Identificação" error={erros.nome} value={form.nome || ""}
              onChange={e => set("nome", e.target.value)} />

            {/* Categoria + Modelo */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Sel label="Categoria" value={form.categoriaId || ""}
                onChange={e => set("categoriaId", e.target.value ? parseInt(e.target.value) : null)}>
                <option value="">Sem categoria</option>
                {categoriasMaquina.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </Sel>
              <Inp label="Modelo" value={form.modelo || ""}
                onChange={e => set("modelo", e.target.value)} />
            </div>

            {/* Tipo de Propriedade */}
            <Sel label="Tipo de Propriedade" value={form.tipoPropriedade || ""}
              onChange={e => set("tipoPropriedade", e.target.value || null)}>
              <option value="">Legado (custo manual)</option>
              <option value="propria">Própria</option>
              <option value="alugada">Alugada / Terceirizada</option>
            </Sel>

            {/* ── Máquina Própria ──────────────────────────────────────── */}
            {form.tipoPropriedade === "propria" && (
              <>
                <div style={{ padding: "10px 14px", background: "rgba(34,197,94,.05)", border: "1px solid rgba(34,197,94,.15)", borderRadius: 10, fontSize: 11, color: "rgba(34,197,94,.7)" }}>
                  Custo/hora calculado por depreciação: Valor Aquisição ÷ (Vida Útil × 12 meses × Horas/mês)
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <MoneyInp label="Valor de Aquisição"
                    value={form.valorAquisicao ?? ""}
                    onChange={e => set("valorAquisicao", e.target.value)} />
                  <Inp label="Data de Aquisição" type="date"
                    value={form.dataAquisicao || ""}
                    onChange={e => set("dataAquisicao", e.target.value)} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Inp label="Vida Útil (anos)" type="number"
                    value={form.vidaUtilAnos || ""}
                    onChange={e => set("vidaUtilAnos", e.target.value)} />
                  <Inp label="Horas Produtivas/Mês" type="number"
                    value={form.horasProdMes || ""}
                    onChange={e => set("horasProdMes", e.target.value)} />
                </div>
              </>
            )}

            {/* ── Máquina Alugada ──────────────────────────────────────── */}
            {form.tipoPropriedade === "alugada" && (
              <>
                <Sel label="Tipo de Cobrança" value={form.tipoCobranca || "hora"}
                  onChange={e => set("tipoCobranca", e.target.value)}>
                  <option value="hora">Por Hora</option>
                  <option value="mensal">Valor Mensal Fixo</option>
                </Sel>
                <MoneyInp
                  label={form.tipoCobranca === "mensal" ? "Valor Mensal" : "Valor por Hora"}
                  value={form.valorLocacao ?? ""}
                  onChange={e => set("valorLocacao", e.target.value)} />
                {form.tipoCobranca === "mensal" && (
                  <Inp label="Horas Produtivas/Mês (para rateio)" type="number"
                    placeholder="Padrão: 160"
                    value={form.horasProdMes || ""}
                    onChange={e => set("horasProdMes", e.target.value)} />
                )}
              </>
            )}

            {/* ── Custo calculado (preview) ─────────────────────────── */}
            {mostraCusto && (
              <div style={{ background: C.orangeDim, border: "1px solid rgba(249,115,22,.25)", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: C.muted }}>Custo/hora calculado</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: C.orange, ...F }}>{fmt(custoPreview)}<span style={{ fontSize: 10, fontWeight: 400, color: C.muted }}>/h</span></span>
              </div>
            )}

            {/* ── Legado: custo manual ──────────────────────────────── */}
            {!form.tipoPropriedade && (
              <MoneyInp label="Custo/Hora" error={erros.custoHora}
                value={form.custoHora ?? ""}
                onChange={e => set("custoHora", e.target.value)} />
            )}

            <div style={{ display: "flex", gap: 9, justifyContent: "flex-end" }}>
              <Btn v="secondary" onClick={() => { setModal(false); setErros({}); }}>Cancelar</Btn>
              <Btn onClick={save}><Icon n="check" size={13} />Salvar</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Funcionários ──────────────────────────────────────────────────────────────
export function Funcionarios({ data, setData, api, canWrite }) {
  const { funcionarios, obras, funcionarioObra } = data;
  const [modal, setModal] = useState(false);
  const [vincModal, setVincModal] = useState(false);
  const [form, setForm] = useState({});
  const [vincForm, setVincForm] = useState({});
  const [erros, setErros] = useState({});
  const [vincErros, setVincErros] = useState({});

  const save = async () => {
    const { ok, erros: e } = validate(form, {
      nome:       { required: true, label: "Nome" },
      cargo:      { required: true, label: "Cargo / Função" },
      salarioDia: { required: true, min: 0.01, label: "Valor/Dia" },
    });
    if (!ok) { setErros(e); return; }
    try {
      if (form.id) {
        const updated = await api.put(`/cadastros/funcionarios/${form.id}`, form);
        setData(d => ({ ...d, funcionarios: d.funcionarios.map(f => f.id === form.id ? updated : f) }));
      } else {
        const novo = await api.post("/cadastros/funcionarios", form);
        setData(d => ({ ...d, funcionarios: [...d.funcionarios, novo] }));
      }
      setErros({}); setModal(false);
    } catch (err) { if (!err.limitePlano) avisarErro(err.message); }
  };

  const saveVinc = async () => {
    const { ok, erros: e } = validate(vincForm, {
      funcionarioId: { required: true, label: "Pessoa" },
      obraId:        { required: true, label: "Obra" },
      dias:          { required: true, min: 0.1, label: "Dias Trabalhados" },
    });
    if (!ok) { setVincErros(e); return; }
    try {
      const novo = await api.post(`/cadastros/funcionarios/${vincForm.funcionarioId}/obras`, { obraId: parseInt(vincForm.obraId), dias: parseFloat(vincForm.dias) });
      setData(d => ({ ...d, funcionarioObra: [...d.funcionarioObra, novo] }));
      setVincErros({}); setVincModal(false);
    } catch (err) { if (!err.limitePlano) avisarErro(err.message); }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, ...F, letterSpacing: "-0.02em" }}>Pessoas</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Funcionários e prestadores</div>
        </div>
        {canWrite && (
          <div style={{ display: "flex", gap: 8 }}>
            <Btn v="outline" onClick={() => { setVincForm({}); setVincModal(true); }} sx={{ fontSize: 11, padding: "6px 12px" }}><Icon n="link" size={12} />Vincular a Obra</Btn>
            <Btn onClick={() => { setForm({ tipo: "Funcionário" }); setModal(true); }} sx={{ fontSize: 11, padding: "6px 12px" }}><Icon n="plus" size={12} />Nova Pessoa</Btn>
          </div>
        )}
      </div>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,.02)" }}>
              {["", "Nome", "Cargo", "CPF/CNPJ", "Valor/dia", "Obras", ""].map((h, i) => (
                <th key={i} style={{ padding: "10px 14px", textAlign: "left", color: C.dim, fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", ...F, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {funcionarios.map(f => {
              const vincs = funcionarioObra.filter(v => v.funcionarioId === f.id);
              return (
                <tr key={f.id} style={{ borderTop: `1px solid ${C.borderLight}` }}>
                  <td style={{ padding: "10px 14px", width: 36 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: C.orangeDim, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, color: C.orange, ...F }}>{f.nome[0]}</div>
                  </td>
                  <td style={{ padding: "10px 14px", fontWeight: 600, color: C.text, ...F }}>{f.nome}</td>
                  <td style={{ padding: "10px 14px", color: C.muted }}>{f.cargo}</td>
                  <td style={{ padding: "10px 14px", color: C.muted, fontFamily: "monospace", fontSize: 11 }}>{f.cpf || "—"}</td>
                  <td style={{ padding: "10px 14px", fontWeight: 700, color: C.orange }}>{fmt(f.salarioDia)}</td>
                  <td style={{ padding: "10px 14px" }}>
                    {vincs.length > 0
                      ? <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{vincs.map(v => { const ob = obras.find(o => o.id === v.obraId); return ob ? <Badge key={v.id} v="default">{ob.nome.split(" ")[0]}</Badge> : null; })}</div>
                      : <span style={{ color: C.dim, fontSize: 11 }}>—</span>}
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "right" }}>
                    {canWrite && <button onClick={() => { setForm({ ...f }); setModal(true); }} style={{ background: "none", border: "none", cursor: "pointer", color: C.dim, display: "flex", padding: 3 }}><Icon n="edit" size={12} color={C.dim} /></button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
      {modal && (
        <Modal title={form.id ? "Editar Pessoa" : "Nova Pessoa"} onClose={() => { setModal(false); setErros({}); }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Inp label="Nome" error={erros.nome} value={form.nome || ""} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
            <Inp label="Cargo / Função" error={erros.cargo} value={form.cargo || ""} onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))} />
            <Inp label="CPF / CNPJ" value={form.cpf || ""} onChange={e => setForm(f => ({ ...f, cpf: e.target.value }))} />
            <MoneyInp label="Valor/Dia" error={erros.salarioDia} value={form.salarioDia ?? ""} onChange={e => setForm(f => ({ ...f, salarioDia: e.target.value }))} />
            <div style={{ display: "flex", gap: 9, justifyContent: "flex-end" }}>
              <Btn v="secondary" onClick={() => { setModal(false); setErros({}); }}>Cancelar</Btn>
              <Btn onClick={save}><Icon n="check" size={13} />Salvar</Btn>
            </div>
          </div>
        </Modal>
      )}
      {vincModal && (
        <Modal title="Vincular Pessoa a Obra" onClose={() => { setVincModal(false); setVincErros({}); }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 11, color: C.muted, background: "rgba(167,139,250,.06)", border: "1px solid rgba(167,139,250,.18)", borderRadius: 9, padding: "10px 13px", lineHeight: 1.5 }}>
              <b style={{ color: "#a78bfa" }}>Prefira apontar pela presença no Diário.</b> Lá cada dia é
              registrado com data e valor congelado, e o mesmo dia não pode ser lançado duas vezes.
              Este vínculo guarda só um total acumulado, sem data — e é ignorado no custo assim que a
              obra passa a ter apontamentos.
            </div>
            <Sel label="Pessoa" error={vincErros.funcionarioId} value={vincForm.funcionarioId || ""} onChange={e => setVincForm(f => ({ ...f, funcionarioId: e.target.value }))}><option value="">Selecione...</option>{funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}</Sel>
            <Sel label="Obra" error={vincErros.obraId} value={vincForm.obraId || ""} onChange={e => setVincForm(f => ({ ...f, obraId: e.target.value }))}><option value="">Selecione...</option>{obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}</Sel>
            <Inp label="Dias Trabalhados" type="number" error={vincErros.dias} value={vincForm.dias || ""} onChange={e => setVincForm(f => ({ ...f, dias: e.target.value }))} />
            <div style={{ display: "flex", gap: 9, justifyContent: "flex-end" }}>
              <Btn v="secondary" onClick={() => { setVincModal(false); setVincErros({}); }}>Cancelar</Btn>
              <Btn onClick={saveVinc}><Icon n="check" size={13} />Vincular</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Insumos ───────────────────────────────────────────────────────────────────
export function Insumos({ data, setData, api, canWrite }) {
  const { insumos, obras } = data;
  const [modal, setModal] = useState(false);
  const [impModal, setImpModal] = useState(false);
  const [form, setForm] = useState({});
  const [erros, setErros] = useState({});
  const [step, setStep] = useState(1);
  const [impData, setImpData] = useState(null);
  const [impObra, setImpObra] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef();

  const save = async () => {
    const { ok, erros: e } = validate(form, {
      nome:      { required: true, label: "Nome" },
      unidade:   { required: true, label: "Unidade" },
      custoUnit: { required: true, min: 0.01, label: "Custo Unitário" },
    });
    if (!ok) { setErros(e); return; }
    try {
      if (form.id) {
        const updated = await api.put(`/cadastros/insumos/${form.id}`, form);
        setData(d => ({ ...d, insumos: d.insumos.map(i => i.id === form.id ? updated : i) }));
      } else {
        const novo = await api.post("/cadastros/insumos", form);
        setData(d => ({ ...d, insumos: [...d.insumos, novo] }));
      }
      setErros({}); setModal(false);
    } catch (err) { if (!err.limitePlano) avisarErro(err.message); }
  };

  const onFile = e => {
    const file = e.target.files?.[0]; if (!file) return; setLoading(true);
    const ext = file.name.split(".").pop().toUpperCase();
    setTimeout(() => {
      setImpData({ fornecedor: "Distribuidora Santos Ltda", nfe: `NFE-${Math.floor(Math.random() * 90000 + 10000)}`, data: new Date().toISOString().split("T")[0], itens: [{ nome: "Cimento CP-II 50kg", unidade: "saco 50kg", quantidade: 100, valorUnit: 39.90, categoria: "Material" }, { nome: "Areia Fina Lavada", unidade: "m³", quantidade: 15, valorUnit: 110.00, categoria: "Material" }, { nome: "Brita 1", unidade: "m³", quantidade: 10, valorUnit: 130.00, categoria: "Material" }], arquivo: file.name, tipo: ext });
      setLoading(false); setStep(2);
    }, 1800);
  };

  const confirmImp = async () => {
    if (!impObra) return;
    const oId = parseInt(impObra);
    try {
      for (const item of impData.itens) {
        let insumo = insumos.find(i => i.nome === item.nome);
        if (!insumo) {
          insumo = await api.post("/cadastros/insumos", { nome: item.nome, unidade: item.unidade, custoUnit: item.valorUnit, categoria: item.categoria, fornecedor: impData.fornecedor });
          setData(d => ({ ...d, insumos: [...d.insumos, insumo] }));
        }
        const novoEstoque = await api.post("/estoque", { obraId: oId, insumoId: insumo.id, quantEntrada: item.quantidade, dataMov: impData.data, origem: `Import. ${impData.tipo} - ${impData.nfe}` });
        setData(d => ({ ...d, estoques: [...d.estoques, novoEstoque] }));
      }
      setImpModal(false); setStep(1); setImpData(null); setImpObra("");
    } catch (err) { if (!err.limitePlano) avisarErro(err.message); }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, ...F, letterSpacing: "-0.02em" }}>Insumos</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Catálogo de materiais</div>
        </div>
        {canWrite && (
          <div style={{ display: "flex", gap: 8 }}>
            <Btn v="outline" onClick={() => { setStep(1); setImpData(null); setImpObra(""); setImpModal(true); }} sx={{ fontSize: 11, padding: "6px 12px" }}><Icon n="upload" size={12} />Importar NF</Btn>
            <Btn onClick={() => { setForm({ categoria: "Material" }); setModal(true); }} sx={{ fontSize: 11, padding: "6px 12px" }}><Icon n="plus" size={12} />Novo Insumo</Btn>
          </div>
        )}
      </div>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,.02)" }}>
              {["", "Nome", "Unidade", "Custo Unit.", "Categoria", "Fornecedor", ""].map((h, i) => (
                <th key={i} style={{ padding: "10px 14px", textAlign: "left", color: C.dim, fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", ...F, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {insumos.map(i => (
              <tr key={i.id} style={{ borderTop: `1px solid ${C.borderLight}` }}>
                <td style={{ padding: "10px 14px", width: 36 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: C.orangeDim, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon n="cube" size={13} color={C.orange} /></div>
                </td>
                <td style={{ padding: "10px 14px", fontWeight: 600, color: C.text, ...F }}>{i.nome}</td>
                <td style={{ padding: "10px 14px", color: C.muted }}>{i.unidade}</td>
                <td style={{ padding: "10px 14px", fontWeight: 700, color: C.orange }}>{fmt(i.custoUnit)}</td>
                <td style={{ padding: "10px 14px" }}><Badge v="default">{i.categoria}</Badge></td>
                <td style={{ padding: "10px 14px", color: C.muted }}>{i.fornecedor}</td>
                <td style={{ padding: "10px 14px", textAlign: "right" }}>
                  {canWrite && <button onClick={() => { setForm({ ...i }); setModal(true); }} style={{ background: "none", border: "none", cursor: "pointer", color: C.dim, display: "flex", padding: 3 }}><Icon n="edit" size={12} color={C.dim} /></button>}
                </td>
              </tr>
            ))}
            {!insumos.length && <tr><td colSpan={7} style={{ padding: "40px", textAlign: "center", color: C.dim, fontSize: 12 }}>Nenhum insumo cadastrado.</td></tr>}
          </tbody>
        </table>
      </Card>
      {modal && (
        <Modal title={form.id ? "Editar Insumo" : "Novo Insumo"} onClose={() => { setModal(false); setErros({}); }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Inp label="Nome" error={erros.nome} value={form.nome || ""} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Inp label="Unidade" error={erros.unidade} value={form.unidade || ""} onChange={e => setForm(f => ({ ...f, unidade: e.target.value }))} />
              <MoneyInp label="Custo Unitário" error={erros.custoUnit} value={form.custoUnit ?? ""} onChange={e => setForm(f => ({ ...f, custoUnit: e.target.value }))} />
            </div>
            <Inp label="Categoria" value={form.categoria || ""} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} />
            <Inp label="Fornecedor" value={form.fornecedor || ""} onChange={e => setForm(f => ({ ...f, fornecedor: e.target.value }))} />
            <div style={{ display: "flex", gap: 9, justifyContent: "flex-end" }}>
              <Btn v="secondary" onClick={() => { setModal(false); setErros({}); }}>Cancelar</Btn>
              <Btn onClick={save}><Icon n="check" size={13} />Salvar</Btn>
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
              <div style={{ border: `2px dashed ${C.border}`, borderRadius: 14, padding: "56px 40px", textAlign: "center", cursor: "pointer" }}>
                <input ref={el => fileRef.current = el} type="file" accept=".xml,.pdf,.xlsx,.xls" style={{ display: "none" }} onChange={onFile} />
                {loading ? <div style={{ color: C.muted, fontSize: 13, ...F }}>Processando...</div> : (
                  <div>
                    <div style={{ width: 52, height: 52, borderRadius: 14, background: C.orangeDim, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}><Icon n="upload" size={22} color={C.orange} /></div>
                    <div style={{ fontWeight: 700, color: C.text, marginBottom: 5, fontSize: 13, ...F }}>Arraste ou clique para importar</div>
                    <div style={{ color: C.dim, fontSize: 11 }}>XML · PDF · Excel (.xlsx)</div>
                    <Btn onClick={() => fileRef.current?.click()} sx={{ marginTop: 14 }}>Selecionar arquivo</Btn>
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

// ── Tipos de Obra ─────────────────────────────────────────────────────────────
export function TiposObra({ data, setData, api, canWrite }) {
  const tiposObra  = data.tiposObra  || [];
  const tiposEtapa = data.tiposEtapa || [];

  const [formModal, setFormModal]       = useState(false);
  const [form, setForm]                 = useState({});
  const [erros, setErros]               = useState({});

  // Modal de gerenciamento de etapas
  const [etapasAlvo, setEtapasAlvo]     = useState(null);   // tipoObra sendo editado
  const [selecionadas, setSelecionadas] = useState(new Set());
  const [salvando, setSalvando]         = useState(false);
  const [busca, setBusca]               = useState("");

  const saveForm = async () => {
    const { ok, erros: e } = validate(form, { nome: { required: true, label: "Nome" } });
    if (!ok) { setErros(e); return; }
    try {
      if (form.id) {
        const updated = await api.put(`/cadastros/tipos-obra/${form.id}`, form);
        setData(d => ({ ...d, tiposObra: d.tiposObra.map(t => t.id === form.id ? updated : t) }));
      } else {
        const novo = await api.post("/cadastros/tipos-obra", form);
        setData(d => ({ ...d, tiposObra: [...d.tiposObra, novo] }));
      }
      setErros({}); setFormModal(false);
    } catch (err) { if (!err.limitePlano) avisarErro(err.message); }
  };

  const del = async id => {
    if (!(await confirmar({ mensagem: "Remover tipo de obra? Obras existentes perderão o vínculo.", confirmarRotulo: "Remover", perigo: true }))) return;
    try {
      await api.del(`/cadastros/tipos-obra/${id}`);
      setData(d => ({ ...d, tiposObra: d.tiposObra.filter(t => t.id !== id) }));
    } catch (err) { if (!err.limitePlano) avisarErro(err.message); }
  };

  const abrirEtapas = to => {
    setEtapasAlvo(to);
    setSelecionadas(new Set((to.etapas || []).map(e => e.tipoEtapaId)));
    setBusca("");
  };

  const toggleEtapa = id => {
    setSelecionadas(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const saveEtapas = async () => {
    setSalvando(true);
    try {
      // Monta array preservando ordem original; novos vão ao final
      const originais = etapasAlvo.etapas || [];
      const ordenadas = [];
      // Primeiro: já vinculadas que permanecem selecionadas (mantém ordem)
      for (const oe of originais) {
        if (selecionadas.has(oe.tipoEtapaId)) {
          ordenadas.push({ tipoEtapaId: oe.tipoEtapaId, ordem: oe.ordem });
        }
      }
      // Depois: recém-adicionadas
      for (const id of selecionadas) {
        if (!originais.find(oe => oe.tipoEtapaId === id)) {
          ordenadas.push({ tipoEtapaId: id, ordem: ordenadas.length });
        }
      }
      // Renumera sequencialmente
      const etapas = ordenadas.map((e, i) => ({ ...e, ordem: i }));

      const updated = await api.put(`/cadastros/tipos-obra/${etapasAlvo.id}/etapas`, { etapas });
      setData(d => ({ ...d, tiposObra: d.tiposObra.map(t => t.id === etapasAlvo.id ? updated : t) }));
      setEtapasAlvo(null);
    } catch (err) { if (!err.limitePlano) avisarErro(err.message); }
    setSalvando(false);
  };

  const etapasFiltradas = tiposEtapa.filter(t =>
    !busca || t.nome.toLowerCase().includes(busca.toLowerCase())
  );

  // Seleção em massa: age sobre a lista visível, para que filtrar e marcar
  // todas seja uma combinação útil (ex.: buscar "pintura" e marcar o grupo).
  const visiveisSelecionadas = etapasFiltradas.filter(t => selecionadas.has(t.id)).length;
  const todasVisiveisMarcadas = etapasFiltradas.length > 0 && visiveisSelecionadas === etapasFiltradas.length;

  const alternarTodas = () => {
    setSelecionadas(prev => {
      const next = new Set(prev);
      if (todasVisiveisMarcadas) etapasFiltradas.forEach(t => next.delete(t.id));
      else                       etapasFiltradas.forEach(t => next.add(t.id));
      return next;
    });
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, ...F, letterSpacing: "-0.02em" }}>Tipos de Obra</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Templates de etapas para novos projetos</div>
        </div>
        {canWrite && <Btn onClick={() => { setForm({}); setFormModal(true); }} sx={{ fontSize: 11, padding: "6px 12px" }}><Icon n="plus" size={12} />Novo Tipo</Btn>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
        {tiposObra.map(to => (
          <Card key={to.id}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: C.orangeDim, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon n="building" size={16} color={C.orange} />
              </div>
              <Badge v={to.ativo ? "green" : "default"}>{to.ativo ? "Ativo" : "Inativo"}</Badge>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, ...F, letterSpacing: "-0.02em", marginBottom: 3 }}>{to.nome}</div>
            {to.descricao && <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>{to.descricao}</div>}
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 12, display: "flex", alignItems: "center", gap: 5 }}>
              <Icon n="checklist" size={11} color={C.dim} />
              {(to.etapas || []).length} etapa{(to.etapas || []).length !== 1 ? "s" : ""} vinculada{(to.etapas || []).length !== 1 ? "s" : ""}
              {to._count?.obras > 0 && (
                <span style={{ marginLeft: 4 }}>· {to._count.obras} obra{to._count.obras > 1 ? "s" : ""}</span>
              )}
            </div>
            {canWrite && (
              <div style={{ display: "flex", gap: 7, borderTop: `1px solid ${C.borderLight}`, paddingTop: 11 }}>
                <Btn v="outline" onClick={() => abrirEtapas(to)} sx={{ fontSize: 11, padding: "5px 11px" }}><Icon n="checklist" size={12} />Etapas</Btn>
                <Btn v="secondary" onClick={() => { setForm({ ...to }); setFormModal(true); }} sx={{ fontSize: 11, padding: "5px 11px" }}><Icon n="edit" size={12} />Editar</Btn>
                <Btn v="danger" onClick={() => del(to.id)} sx={{ fontSize: 11, padding: "5px 11px" }}><Icon n="trash" size={12} /></Btn>
              </div>
            )}
          </Card>
        ))}
        {!tiposObra.length && (
          <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "40px 0", color: C.dim, fontSize: 12 }}>
            Nenhum tipo de obra cadastrado. Crie um para agilizar novos projetos.
          </div>
        )}
      </div>

      {/* Modal criar/editar tipo */}
      {formModal && (
        <Modal title={form.id ? "Editar Tipo de Obra" : "Novo Tipo de Obra"} onClose={() => { setFormModal(false); setErros({}); }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Inp label="Nome" error={erros.nome} value={form.nome || ""}
              onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
            <Inp label="Descrição (opcional)" value={form.descricao || ""}
              onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
            {form.id && (
              <Sel label="Status" value={form.ativo ?? true}
                onChange={e => setForm(f => ({ ...f, ativo: e.target.value === "true" }))}>
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </Sel>
            )}
            <div style={{ display: "flex", gap: 9, justifyContent: "flex-end" }}>
              <Btn v="secondary" onClick={() => { setFormModal(false); setErros({}); }}>Cancelar</Btn>
              <Btn onClick={saveForm}><Icon n="check" size={13} />Salvar</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal gerenciar etapas */}
      {etapasAlvo && (
        <Modal title={`Etapas — ${etapasAlvo.nome}`} onClose={() => setEtapasAlvo(null)} wide>
          <div style={{ marginBottom: 12, fontSize: 11, color: C.muted }}>
            Selecione as etapas que serão criadas automaticamente ao vincular este tipo a uma nova obra.
          </div>

          {/* Barra de busca */}
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Filtrar etapas..."
            style={{ width: "100%", background: "rgba(255,255,255,.04)", border: `1px solid ${C.border}`, borderRadius: 9, padding: "8px 12px", fontSize: 12, color: C.text, outline: "none", marginBottom: 12, ...F }}
          />

          {/* Selecionar todas + contagem */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
            <label style={{
              display: "flex", alignItems: "center", gap: 8, cursor: etapasFiltradas.length ? "pointer" : "default",
              padding: "6px 11px", borderRadius: 9, userSelect: "none",
              background: todasVisiveisMarcadas ? C.orangeDim : "rgba(255,255,255,.03)",
              border: `1px solid ${todasVisiveisMarcadas ? "rgba(249,115,22,.3)" : C.borderLight}`,
              opacity: etapasFiltradas.length ? 1 : .45,
            }}>
              <input
                type="checkbox"
                disabled={!etapasFiltradas.length}
                checked={todasVisiveisMarcadas}
                ref={el => { if (el) el.indeterminate = visiveisSelecionadas > 0 && !todasVisiveisMarcadas; }}
                onChange={alternarTodas}
                style={{ accentColor: C.orange, width: 14, height: 14, cursor: "pointer" }}
              />
              <span style={{ fontSize: 11, fontWeight: 700, color: todasVisiveisMarcadas ? C.orange : C.text, ...F }}>
                {todasVisiveisMarcadas ? "Desmarcar todas" : "Selecionar todas"}
                {busca && <span style={{ fontWeight: 400, color: C.muted }}> ({etapasFiltradas.length} filtradas)</span>}
              </span>
            </label>

            <span style={{ fontSize: 11, color: C.muted }}>
              {selecionadas.size} de {tiposEtapa.length} selecionadas
            </span>
          </div>

          {/* Lista de etapas */}
          <div style={{ maxHeight: 380, overflowY: "auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, paddingRight: 4 }}>
            {etapasFiltradas.map(te => {
              const sel = selecionadas.has(te.id);
              return (
                <label key={te.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 12px", borderRadius: 9, cursor: "pointer", background: sel ? C.orangeDim : "rgba(255,255,255,.02)", border: `1px solid ${sel ? "rgba(249,115,22,.25)" : C.borderLight}`, transition: "all .12s", userSelect: "none" }}>
                  <input type="checkbox" checked={sel} onChange={() => toggleEtapa(te.id)} style={{ accentColor: C.orange, width: 14, height: 14, flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: sel ? C.orange : C.text, ...F, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{te.nome}</div>
                    {te.ordem && <div style={{ fontSize: 10, color: C.dim }}>#{te.ordem}</div>}
                  </div>
                </label>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 9, justifyContent: "flex-end", marginTop: 16 }}>
            <Btn v="secondary" onClick={() => setEtapasAlvo(null)}>Cancelar</Btn>
            <Btn onClick={saveEtapas} disabled={salvando}><Icon n="check" size={13} />{salvando ? "Salvando..." : "Salvar Etapas"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Cadastros (guia unificada) ────────────────────────────────────────────────
const CADS = [
  { id: "etapas",    label: "Tipos de Etapa", icon: "checklist" },
  { id: "tiposObra", label: "Tipos de Obra",  icon: "building"  },
  { id: "maquinas",  label: "Máquinas",       icon: "excavator" },
  { id: "pessoas",   label: "Pessoas",        icon: "people"    },
  { id: "insumos",   label: "Insumos",        icon: "cube"      },
];

export default function Cadastros({ data, setData, api, canWrite }) {
  const [aba, setAba] = useState("etapas");
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 26, gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: 0, letterSpacing: "-0.03em", ...F }}>Cadastros</h1>
          <p style={{ fontSize: 11, color: C.muted, marginTop: 4, ...F }}>Tipos de etapa, tipos de obra, máquinas, pessoas e insumos</p>
        </div>
      </div>
      <div style={{ display: "flex", gap: 2, marginBottom: 22, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 4, width: "fit-content", flexWrap: "wrap" }}>
        {CADS.map(c => { const a = aba === c.id; return (
          <button key={c.id} onClick={() => setAba(c.id)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 15px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 12, fontWeight: a ? 700 : 500, transition: "all .15s", ...F, background: a ? C.orange : "transparent", color: a ? "#0a0a0a" : C.muted, letterSpacing: "-0.01em" }}>
            <Icon n={c.icon} size={13} color={a ? "#0a0a0a" : C.muted} />{c.label}
          </button>
        ); })}
      </div>
      {aba === "etapas"    && <TiposEtapa  data={data} setData={setData} api={api} canWrite={canWrite} />}
      {aba === "tiposObra" && <TiposObra   data={data} setData={setData} api={api} canWrite={canWrite} />}
      {aba === "maquinas"  && <Maquinas    data={data} setData={setData} api={api} canWrite={canWrite} />}
      {aba === "pessoas"   && <Funcionarios data={data} setData={setData} api={api} canWrite={canWrite} />}
      {aba === "insumos"   && <Insumos     data={data} setData={setData} api={api} canWrite={canWrite} />}
    </div>
  );
}
