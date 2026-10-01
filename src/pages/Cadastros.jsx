import { useState } from "react";
import { PageActions } from "../components/PageActions";
import { validate, fmt } from "../utils/helpers";
import { avisarErro, avisarSucesso, confirmar } from "../utils/aviso";
import TiposEtapa from "./TiposEtapa";
import { Avatar, Badge, Banner, Button, Card, Checkbox, DataTable, Icon, IconButton, Input, Modal, MoneyInput, OptionRow, SegmentedTabs, Select, Tag } from "../../design-system";

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
  const [form, setForm]       = useState({});
  const [erros, setErros]     = useState({});
  const [salvando, setSalvando] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const custoPreview = calcCustoHoraPreview(form);
  const mostraCusto  = form.tipoPropriedade && custoPreview !== null;

  const save = async () => {
    if (salvando) return;
    const rules = { nome: { required: true, label: "Nome" } };
    if (!form.tipoPropriedade) {
      rules.custoHora = { required: true, min: 0.01, label: "Custo/Hora" };
    }
    const { ok, erros: e } = validate(form, rules);
    if (!ok) { setErros(e); return; }

    // Envia custoHora calculado pelo frontend para confirmar (backend recalcula)
    const payload = { ...form };
    if (mostraCusto) payload.custoHora = custoPreview;

    setSalvando(true);
    try {
      if (form.id) {
        const updated = await api.put(`/cadastros/maquinas/${form.id}`, payload);
        setData(d => ({ ...d, maquinas: d.maquinas.map(m => m.id === form.id ? updated : m) }));
      } else {
        const nova = await api.post("/cadastros/maquinas", payload);
        setData(d => ({ ...d, maquinas: [...d.maquinas, nova] }));
      }
      avisarSucesso("Máquina salva.");
      setErros({}); setModal(false);
    } catch (err) { if (!err.limitePlano) avisarErro(err.message); }
    finally { setSalvando(false); }
  };

  const del = async id => {
    if (!(await confirmar({ mensagem: "Remover máquina?", confirmarRotulo: "Remover", perigo: true }))) return;
    try {
      await api.del(`/cadastros/maquinas/${id}`);
      setData(d => ({ ...d, maquinas: d.maquinas.filter(m => m.id !== id) }));
    } catch (err) { if (!err.limitePlano) avisarErro(err.message); }
  };

  const propriedade = m => m.tipoPropriedade === "propria" ? <Tag tone="success">Própria</Tag>
    : m.tipoPropriedade === "alugada" ? <Tag tone="accent">Alugada</Tag> : <Tag tone="neutral">{m.tipo || "Custo manual"}</Tag>;
  const fechar = () => { setModal(false); setErros({}); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <PageActions>{canWrite && <Button iconLeft="plus" onClick={() => { setForm({}); setModal(true); }}>Nova máquina</Button>}</PageActions>
      <p style={{ color: "var(--text-secondary)" }}>Frota de máquinas e equipamentos com custo/hora automático.</p>
      <DataTable minWidth={760} rows={maquinas} rowKey={m => m.id} empty="Nenhuma máquina cadastrada." columns={[
        { key: "nome", label: "Máquina", render: m => (
          <span style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <Icon name="construction" size={20} />
            <span style={{ display: "flex", flexDirection: "column" }}><b>{m.nome}</b><span style={{ fontSize: "var(--fs-p6)", color: "var(--text-secondary)" }}>Modelo: {m.modelo || "—"}</span></span>
          </span>
        ) },
        { key: "categoria", label: "Categoria", render: m => m.categoria?.nome || "—" },
        { key: "propriedade", label: "Propriedade", render: propriedade },
        { key: "custoHora", label: "Custo/hora", align: "right", render: m => <b>{fmt(m.custoHora)}</b> },
        ...(canWrite ? [{ key: "acoes", label: "", width: "var(--space-24)", render: m => (
          <div style={{ display: "flex", gap: "var(--space-1)" }}>
            <IconButton icon="pencil" size={28} label="Editar" onClick={() => { setForm({ ...m }); setModal(true); }} />
            <IconButton icon="trash-2" variant="danger" size={28} label="Remover" onClick={() => del(m.id)} />
          </div>
        ) }] : []),
      ]} />

      {modal && (
        <Modal title={form.id ? "Editar máquina" : "Nova máquina"} onClose={fechar}
          footer={<><Button variant="secondary" onClick={fechar}>Cancelar</Button><Button iconLeft="check" loading={salvando} onClick={save}>Salvar</Button></>}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <Input label="Nome / identificação" required error={erros.nome} value={form.nome || ""} onChange={e => set("nome", e.target.value)} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
              <Select label="Categoria" value={form.categoriaId || ""} onChange={e => set("categoriaId", e.target.value ? parseInt(e.target.value) : null)}>
                <option value="">Sem categoria</option>
                {categoriasMaquina.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </Select>
              <Input label="Modelo" value={form.modelo || ""} onChange={e => set("modelo", e.target.value)} />
            </div>
            <Select label="Tipo de propriedade" value={form.tipoPropriedade || ""} onChange={e => set("tipoPropriedade", e.target.value || null)}>
              <option value="">Legado (custo manual)</option>
              <option value="propria">Própria</option>
              <option value="alugada">Alugada / terceirizada</option>
            </Select>

            {form.tipoPropriedade === "propria" && (
              <>
                <Banner tone="info">Custo/hora calculado por depreciação: valor de aquisição ÷ (vida útil × 12 meses × horas/mês).</Banner>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                  <MoneyInput label="Valor de aquisição" value={form.valorAquisicao ?? ""} onChange={e => set("valorAquisicao", e.target.value)} />
                  <Input label="Data de aquisição" type="date" value={form.dataAquisicao || ""} onChange={e => set("dataAquisicao", e.target.value)} />
                  <Input label="Vida útil (anos)" type="number" min="0" value={form.vidaUtilAnos || ""} onChange={e => set("vidaUtilAnos", e.target.value)} />
                  <Input label="Horas produtivas/mês" type="number" min="0" value={form.horasProdMes || ""} onChange={e => set("horasProdMes", e.target.value)} />
                </div>
              </>
            )}

            {form.tipoPropriedade === "alugada" && (
              <>
                <Select label="Tipo de cobrança" value={form.tipoCobranca || "hora"} onChange={e => set("tipoCobranca", e.target.value)}>
                  <option value="hora">Por hora</option>
                  <option value="mensal">Valor mensal fixo</option>
                </Select>
                <MoneyInput label={form.tipoCobranca === "mensal" ? "Valor mensal" : "Valor por hora"} value={form.valorLocacao ?? ""} onChange={e => set("valorLocacao", e.target.value)} />
                {form.tipoCobranca === "mensal" && (
                  <Input label="Horas produtivas/mês (para rateio)" type="number" min="0" placeholder="Padrão: 160" value={form.horasProdMes || ""} onChange={e => set("horasProdMes", e.target.value)} />
                )}
              </>
            )}

            {mostraCusto && <Banner tone="accent" title="Custo/hora calculado">{fmt(custoPreview)}/h</Banner>}

            {!form.tipoPropriedade && (
              <MoneyInput label="Custo/hora" required error={erros.custoHora} value={form.custoHora ?? ""} onChange={e => set("custoHora", e.target.value)} />
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Funcionários ──────────────────────────────────────────────────────────────
const PERFIL_LABEL = { isColaborador: "Colaborador", isFornecedor: "Fornecedor", isCliente: "Cliente" };
const PERFIL_TONE = { isColaborador: "neutral", isFornecedor: "success", isCliente: "accent" };

export function Funcionarios({ data, setData, api, canWrite }) {
  const { funcionarios, obras, funcionarioObra } = data;
  const [modal, setModal] = useState(false);
  const [vincModal, setVincModal] = useState(false);
  const [form, setForm] = useState({});
  const [vincForm, setVincForm] = useState({});
  const [erros, setErros] = useState({});
  const [vincErros, setVincErros] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [salvandoVinc, setSalvandoVinc] = useState(false);

  const togglePerfil = key => setForm(f => ({ ...f, [key]: !f[key] }));

  const save = async () => {
    if (salvando) return;
    const rules = { nome: { required: true, label: "Nome" } };
    if (form.isColaborador) {
      rules.cargo      = { required: true, label: "Cargo / Função" };
      rules.salarioDia = { required: true, min: 0.01, label: "Valor/Dia" };
    }
    const { ok, erros: e } = validate(form, rules);
    if (!ok) { setErros(e); return; }
    setSalvando(true);
    try {
      if (form.id) {
        const updated = await api.put(`/cadastros/funcionarios/${form.id}`, form);
        setData(d => ({ ...d, funcionarios: d.funcionarios.map(f => f.id === form.id ? updated : f) }));
      } else {
        const novo = await api.post("/cadastros/funcionarios", form);
        setData(d => ({ ...d, funcionarios: [...d.funcionarios, novo] }));
      }
      avisarSucesso("Pessoa salva.");
      setErros({}); setModal(false);
    } catch (err) { if (!err.limitePlano) avisarErro(err.message); }
    finally { setSalvando(false); }
  };

  const saveVinc = async () => {
    if (salvandoVinc) return;
    const { ok, erros: e } = validate(vincForm, {
      funcionarioId: { required: true, label: "Pessoa" },
      obraId:        { required: true, label: "Obra" },
      dias:          { required: true, min: 0.1, label: "Dias Trabalhados" },
    });
    if (!ok) { setVincErros(e); return; }
    setSalvandoVinc(true);
    try {
      const novo = await api.post(`/cadastros/funcionarios/${vincForm.funcionarioId}/obras`, { obraId: parseInt(vincForm.obraId), dias: parseFloat(vincForm.dias) });
      setData(d => ({ ...d, funcionarioObra: [...d.funcionarioObra, novo] }));
      avisarSucesso("Vínculo criado.");
      setVincErros({}); setVincModal(false);
    } catch (err) { if (!err.limitePlano) avisarErro(err.message); }
    finally { setSalvandoVinc(false); }
  };

  const perfisOf = f => Object.keys(PERFIL_LABEL).filter(k => f[k]);
  const fechar = () => { setModal(false); setErros({}); };
  const fecharVinc = () => { setVincModal(false); setVincErros({}); };
  const setF = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <>
      <PageActions>
        {canWrite && <Button iconLeft="link" variant="secondary" onClick={() => { setVincForm({}); setVincModal(true); }}>Vincular a obra</Button>}
        {canWrite && <Button iconLeft="plus" onClick={() => { setForm({}); setModal(true); }}>Nova pessoa</Button>}
      </PageActions>
      <p style={{ color: "var(--text-secondary)" }}>Fornecedores, colaboradores e clientes.</p>
      <DataTable minWidth={900} rows={funcionarios} rowKey={f => f.id} empty="Nenhuma pessoa cadastrada." columns={[
        { key: "nome", label: "Nome", render: f => (
          <span style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <Avatar name={f.nome} size={32} />
            <span style={{ display: "flex", flexDirection: "column" }}><b>{f.nome}</b>{f.isColaborador && f.cargo && <span style={{ fontSize: "var(--fs-p6)", color: "var(--text-secondary)" }}>{f.cargo}</span>}</span>
          </span>
        ) },
        { key: "perfis", label: "Perfis", render: f => { const ps = perfisOf(f); return ps.length ? <span style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-1)" }}>{ps.map(k => <Tag key={k} tone={PERFIL_TONE[k]}>{PERFIL_LABEL[k]}</Tag>)}</span> : "—"; } },
        { key: "cpfCnpj", label: "CPF/CNPJ", render: f => <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-p6)" }}>{f.cpfCnpj || "—"}</span> },
        { key: "contato", label: "Contato", render: f => (f.telefone || f.email) ? <span style={{ display: "flex", flexDirection: "column" }}>{f.telefone && <span>{f.telefone}</span>}{f.email && <span style={{ fontSize: "var(--fs-p6)", color: "var(--text-secondary)" }}>{f.email}</span>}</span> : "—" },
        { key: "obras", label: "Obras", render: f => { const vincs = funcionarioObra.filter(v => v.funcionarioId === f.id); return vincs.length ? <span style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-1)" }}>{vincs.map(v => { const ob = obras.find(o => o.id === v.obraId); return ob ? <Tag key={v.id} tone="neutral">{ob.nome}</Tag> : null; })}</span> : "—"; } },
        ...(canWrite ? [{ key: "acoes", label: "", width: "var(--space-14)", render: f => <IconButton icon="pencil" size={28} label="Editar" onClick={() => { setForm({ ...f }); setModal(true); }} /> }] : []),
      ]} />

      {modal && (
        <Modal title={form.id ? "Editar pessoa" : "Nova pessoa"} onClose={fechar}
          footer={<><Button variant="secondary" onClick={fechar}>Cancelar</Button><Button iconLeft="check" loading={salvando} onClick={save}>Salvar</Button></>}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <Input label="Nome completo / razão social" required error={erros.nome} value={form.nome || ""} onChange={setF("nome")} />
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              <span style={{ font: "var(--type-label)" }}>Perfil</span>
              <div style={{ display: "flex", gap: "var(--space-6)", flexWrap: "wrap" }}>
                {Object.entries(PERFIL_LABEL).map(([key, label]) => <Checkbox key={key} label={label} checked={!!form[key]} onChange={() => togglePerfil(key)} />)}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
              <Input label="CPF / CNPJ" value={form.cpfCnpj || ""} onChange={setF("cpfCnpj")} />
              <Input label="Telefone" prefix="+55" value={form.telefone || ""} onChange={setF("telefone")} />
            </div>
            <Input label="E-mail" type="email" icon="mail" value={form.email || ""} onChange={setF("email")} />
            <Input label="Endereço" icon="map-pin" value={form.endereco || ""} onChange={setF("endereco")} />
            {form.isColaborador && (
              <>
                <h3 style={{ margin: 0, font: "var(--type-card-title)", fontSize: "var(--fs-p4)" }}>Dados do colaborador</h3>
                <Input label="Cargo / função" required error={erros.cargo} value={form.cargo || ""} onChange={setF("cargo")} />
                <MoneyInput label="Valor/dia" required error={erros.salarioDia} value={form.salarioDia ?? ""} onChange={setF("salarioDia")} />
              </>
            )}
          </div>
        </Modal>
      )}
      {vincModal && (
        <Modal title="Vincular pessoa a obra" onClose={fecharVinc}
          footer={<><Button variant="secondary" onClick={fecharVinc}>Cancelar</Button><Button iconLeft="check" loading={salvandoVinc} onClick={saveVinc}>Vincular</Button></>}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <Banner tone="info" title="Prefira apontar pela presença no Diário">
              Lá cada dia é registrado com data e valor congelado, e o mesmo dia não pode ser lançado duas vezes. Este vínculo guarda só um total acumulado, sem data, e é ignorado no custo assim que a obra passa a ter apontamentos.
            </Banner>
            <Select label="Pessoa" required error={vincErros.funcionarioId} value={vincForm.funcionarioId || ""} onChange={e => setVincForm(f => ({ ...f, funcionarioId: e.target.value }))}><option value="">Selecione…</option>{funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}</Select>
            <Select label="Obra" required error={vincErros.obraId} value={vincForm.obraId || ""} onChange={e => setVincForm(f => ({ ...f, obraId: e.target.value }))}><option value="">Selecione…</option>{obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}</Select>
            <Input label="Dias trabalhados" required type="number" min="0" step="0.5" error={vincErros.dias} value={vincForm.dias || ""} onChange={e => setVincForm(f => ({ ...f, dias: e.target.value }))} />
          </div>
        </Modal>
      )}
    </>
  );
}

// ── Insumos ───────────────────────────────────────────────────────────────────
export function Insumos({ data, setData, api, canWrite }) {
  const { insumos } = data;
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [erros, setErros] = useState({});
  const [salvando, setSalvando] = useState(false);

  const save = async () => {
    if (salvando) return;
    const { ok, erros: e } = validate(form, {
      nome:      { required: true, label: "Nome" },
      unidade:   { required: true, label: "Unidade" },
      custoUnit: { required: true, min: 0.01, label: "Custo Unitário" },
    });
    if (!ok) { setErros(e); return; }
    setSalvando(true);
    try {
      if (form.id) {
        const updated = await api.put(`/cadastros/insumos/${form.id}`, form);
        setData(d => ({ ...d, insumos: d.insumos.map(i => i.id === form.id ? updated : i) }));
      } else {
        const novo = await api.post("/cadastros/insumos", form);
        setData(d => ({ ...d, insumos: [...d.insumos, novo] }));
      }
      avisarSucesso("Insumo salvo.");
      setErros({}); setModal(false);
    } catch (err) { if (!err.limitePlano) avisarErro(err.message); }
    finally { setSalvando(false); }
  };

  const fechar = () => { setModal(false); setErros({}); };
  const setF = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <>
      <PageActions>{canWrite && <Button iconLeft="plus" onClick={() => { setForm({ categoria: "Material" }); setModal(true); }}>Novo insumo</Button>}</PageActions>
      <p style={{ color: "var(--text-secondary)" }}>Catálogo de materiais. Entradas de estoque são lançadas por Compras (inclusive importação de NF-e).</p>
      <DataTable minWidth={760} rows={insumos} rowKey={i => i.id} empty="Nenhum insumo cadastrado." columns={[
        { key: "nome", label: "Nome", render: i => <span style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}><Icon name="box" size={20} /><b>{i.nome}</b></span> },
        { key: "unidade", label: "Unidade" },
        { key: "custoUnit", label: "Custo unit.", align: "right", render: i => <b>{fmt(i.custoUnit)}</b> },
        { key: "categoria", label: "Categoria", render: i => i.categoria ? <Tag tone="neutral">{i.categoria}</Tag> : "—" },
        { key: "fornecedor", label: "Fornecedor", render: i => i.fornecedor || "—" },
        ...(canWrite ? [{ key: "acoes", label: "", width: "var(--space-14)", render: i => <IconButton icon="pencil" size={28} label="Editar" onClick={() => { setForm({ ...i }); setModal(true); }} /> }] : []),
      ]} />
      {modal && (
        <Modal title={form.id ? "Editar insumo" : "Novo insumo"} onClose={fechar}
          footer={<><Button variant="secondary" onClick={fechar}>Cancelar</Button><Button iconLeft="check" loading={salvando} onClick={save}>Salvar</Button></>}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <Input label="Nome" required error={erros.nome} value={form.nome || ""} onChange={setF("nome")} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
              <Input label="Unidade" required placeholder="Ex.: m³, sc 50kg" error={erros.unidade} value={form.unidade || ""} onChange={setF("unidade")} />
              <MoneyInput label="Custo unitário" required error={erros.custoUnit} value={form.custoUnit ?? ""} onChange={setF("custoUnit")} />
            </div>
            <Input label="Categoria" value={form.categoria || ""} onChange={setF("categoria")} />
            <Input label="Fornecedor" value={form.fornecedor || ""} onChange={setF("fornecedor")} />
          </div>
        </Modal>
      )}
    </>
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
    if (salvando) return;
    const { ok, erros: e } = validate(form, { nome: { required: true, label: "Nome" } });
    if (!ok) { setErros(e); return; }
    setSalvando(true);
    try {
      if (form.id) {
        const updated = await api.put(`/cadastros/tipos-obra/${form.id}`, form);
        setData(d => ({ ...d, tiposObra: d.tiposObra.map(t => t.id === form.id ? updated : t) }));
      } else {
        const novo = await api.post("/cadastros/tipos-obra", form);
        setData(d => ({ ...d, tiposObra: [...d.tiposObra, novo] }));
      }
      avisarSucesso("Tipo de obra salvo.");
      setErros({}); setFormModal(false);
    } catch (err) { if (!err.limitePlano) avisarErro(err.message); }
    finally { setSalvando(false); }
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

  const fecharForm = () => { setFormModal(false); setErros({}); };

  return (
    <>
      <PageActions>{canWrite && <Button iconLeft="plus" onClick={() => { setForm({}); setFormModal(true); }}>Novo tipo</Button>}</PageActions>
      <p style={{ color: "var(--text-secondary)" }}>Modelos de etapas para novos projetos.</p>
      {!tiposObra.length && <p style={{ color: "var(--text-secondary)" }}>Nenhum tipo de obra cadastrado. Crie um para agilizar novos projetos.</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(var(--col-min-lg),1fr))", gap: "var(--space-6)" }}>
        {tiposObra.map(to => {
          const n = (to.etapas || []).length;
          return (
            <Card key={to.id} title={to.nome} icon={<Icon name="building-2" />} action={<Badge size="sm" tone={to.ativo ? "success" : "neutral"}>{to.ativo ? "Ativo" : "Inativo"}</Badge>}>
              {to.descricao && <p style={{ margin: 0, color: "var(--text-secondary)" }}>{to.descricao}</p>}
              <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                <Tag tone="neutral">{n} etapa{n !== 1 ? "s" : ""}</Tag>
                {to._count?.obras > 0 && <Tag tone="accent">{to._count.obras} obra{to._count.obras > 1 ? "s" : ""}</Tag>}
              </div>
              {canWrite && (
                <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
                  <Button iconLeft="square-check" size="sm" variant="secondary" onClick={() => abrirEtapas(to)}>Etapas</Button>
                  <span style={{ flex: 1 }} />
                  <IconButton icon="pencil" variant="outline" size={32} label="Editar" onClick={() => { setForm({ ...to }); setFormModal(true); }} />
                  <IconButton icon="trash-2" variant="danger" size={32} label="Excluir" onClick={() => del(to.id)} />
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {formModal && (
        <Modal title={form.id ? "Editar tipo de obra" : "Novo tipo de obra"} onClose={fecharForm}
          footer={<><Button variant="secondary" onClick={fecharForm}>Cancelar</Button><Button iconLeft="check" loading={salvando} onClick={saveForm}>Salvar</Button></>}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <Input label="Nome" required error={erros.nome} value={form.nome || ""} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
            <Input label="Descrição (opcional)" value={form.descricao || ""} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
            {form.id && (
              <Select label="Status" value={String(form.ativo ?? true)} onChange={e => setForm(f => ({ ...f, ativo: e.target.value === "true" }))}>
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </Select>
            )}
          </div>
        </Modal>
      )}

      {etapasAlvo && (
        <Modal title={`Etapas · ${etapasAlvo.nome}`} onClose={() => setEtapasAlvo(null)} wide
          footer={<><Button variant="secondary" onClick={() => setEtapasAlvo(null)}>Cancelar</Button><Button iconLeft="check" loading={salvando} onClick={saveEtapas}>Salvar etapas</Button></>}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <p style={{ margin: 0, color: "var(--text-secondary)" }}>Selecione as etapas criadas automaticamente ao vincular este tipo a uma nova obra.</p>
            <Input aria-label="Filtrar etapas" icon="search" placeholder="Filtrar etapas…" value={busca} onChange={e => setBusca(e.target.value)} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap" }}>
              <Checkbox disabled={!etapasFiltradas.length} checked={todasVisiveisMarcadas} onChange={alternarTodas}
                label={<span>{todasVisiveisMarcadas ? "Desmarcar todas" : "Selecionar todas"}{busca && <span style={{ color: "var(--text-secondary)" }}> ({etapasFiltradas.length} filtradas)</span>}</span>} />
              <Tag tone="neutral">{selecionadas.size} de {tiposEtapa.length} selecionadas</Tag>
            </div>
            <div style={{ maxHeight: "var(--scroll-h-md)", overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(var(--col-min-md),1fr))", columnGap: "var(--space-8)" }}>
              {etapasFiltradas.map(te => <OptionRow key={te.id} icon={te.icon || "square-check"} label={te.nome} checked={selecionadas.has(te.id)} onChange={() => toggleEtapa(te.id)} />)}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

// ── Cadastros (guia unificada) ────────────────────────────────────────────────
export default function Cadastros({ data, setData, api, canWrite }) {
  const [aba, setAba] = useState("etapas");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <SegmentedTabs variant="light" value={aba} onChange={setAba} tabs={[
        { value: "etapas", label: "Tipos de etapa" }, { value: "tiposObra", label: "Tipos de obra" },
        { value: "pessoas", label: "Pessoas" }, { value: "insumos", label: "Insumos" },
      ]} />
      {aba === "etapas"    && <TiposEtapa  data={data} setData={setData} api={api} canWrite={canWrite} />}
      {aba === "tiposObra" && <TiposObra   data={data} setData={setData} api={api} canWrite={canWrite} />}
      {aba === "pessoas"   && <Funcionarios data={data} setData={setData} api={api} canWrite={canWrite} />}
      {aba === "insumos"   && <Insumos      data={data} setData={setData} api={api} canWrite={canWrite} />}
    </div>
  );
}
