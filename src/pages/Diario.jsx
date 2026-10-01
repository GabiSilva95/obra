import { useState } from "react";
import { validate, fmt } from "../utils/helpers";
import { avisarErro, confirmar } from "../utils/aviso";
import { Banner, Button, Card, Checkbox, Icon, IconButton, Input, Modal, Select, Tag, Textarea } from "../../design-system";
import { PageActions } from "../components/PageActions";

const CLIMAS = ["Ensolarado", "Nublado", "Chuvoso", "Parcialmente nublado", "Tempestade"];
const CLIMA_ICON = { Ensolarado: "sun", Nublado: "cloud", Chuvoso: "cloud-rain", "Parcialmente nublado": "cloud", Tempestade: "zap" };

export default function Diario({ data, setData, api, canWrite }) {
  const { obras, diario = [], funcionarios = [] } = data;
  const [obraFiltro, setObraFiltro] = useState(obras[0]?.id || "");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [erros, setErros] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [presencas, setPresencas] = useState([]);   // [{ funcionarioId, dias }]

  const togglePresenca = id => setPresencas(p =>
    p.some(x => x.funcionarioId === id)
      ? p.filter(x => x.funcionarioId !== id)
      : [...p, { funcionarioId: id, dias: 1 }]);

  const setDiasPresenca = (id, dias) => setPresencas(p =>
    p.map(x => x.funcionarioId === id ? { ...x, dias } : x));

  const custoDia = presencas.reduce((s, p) => {
    const f = funcionarios.find(x => x.id === p.funcionarioId);
    return s + (f ? f.salarioDia * p.dias : 0);
  }, 0);

  const abrirNovo = () => {
    setForm({ obraId: obraFiltro || obras[0]?.id, data: new Date().toISOString().slice(0, 10) });
    setPresencas([]);
    setModal(true);
  };

  const abrirEdicao = reg => {
    setForm({ ...reg });
    setPresencas((reg.apontamentos || []).map(a => ({ funcionarioId: a.funcionarioId, dias: a.dias })));
    setModal(true);
  };

  const registros = diario
    .filter(d => !obraFiltro || d.obraId === parseInt(obraFiltro))
    .sort((a, b) => b.data.localeCompare(a.data));

  const save = async () => {
    const { ok, erros: e } = validate(form, {
      obraId: { required: true, label: "Obra" },
      data: { required: true, label: "Data" },
      descricao: { required: true, label: "Descrição" },
    });
    if (!ok) { setErros(e); return; }
    if (salvando) return;
    setSalvando(true);
    try {
      const payload = { ...form, presencas };
      if (form.id) {
        const updated = await api.put(`/diario/${form.id}`, payload);
        setData(d => ({
          ...d,
          diario: d.diario.map(x => x.id === form.id ? updated : x),
          // Os apontamentos do dia foram regravados pelo backend
          apontamentos: [
            ...(d.apontamentos || []).filter(a => a.diarioId !== form.id),
            ...(updated.apontamentos || []),
          ],
        }));
      } else {
        const novo = await api.post("/diario", payload);
        setData(d => ({
          ...d,
          diario: [novo, ...(d.diario || [])],
          apontamentos: [...(d.apontamentos || []), ...(novo.apontamentos || [])],
        }));
      }
      setErros({}); setModal(false); setPresencas([]);
    } catch (err) { if (!err.limitePlano) avisarErro(err.message); }
    finally { setSalvando(false); }
  };

  const del = async id => {
    if (!(await confirmar({ mensagem: "Remover registro do diário?", confirmarRotulo: "Remover", perigo: true }))) return;
    try {
      await api.del(`/diario/${id}`);
      setData(d => ({ ...d, diario: d.diario.filter(x => x.id !== id) }));
    } catch (err) { if (!err.limitePlano) avisarErro(err.message); }
  };

  const fechar = () => { setModal(false); setErros({}); };
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <PageActions>
        <Select aria-label="Filtrar obra" style={{ height: "var(--control-h-sm)", minWidth: "var(--control-w-md)" }} value={obraFiltro} onChange={e => setObraFiltro(e.target.value)}>
          <option value="">Todas as obras</option>
          {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </Select>
        {canWrite && <Button iconLeft="plus" onClick={abrirNovo}>Novo registro</Button>}
      </PageActions>
      <p style={{ color: "var(--text-secondary)" }}>Registro diário de atividades, equipe e condições.</p>

      {registros.length === 0 ? (
        <Card style={{ alignItems: "center", textAlign: "center", padding: "var(--space-12) var(--space-6)", color: "var(--text-secondary)" }}>
          <Icon name="book-open" size={32} />
          <div style={{ fontWeight: "var(--fw-semibold)", color: "var(--text-primary)" }}>Nenhum registro encontrado</div>
          <div>Comece registrando as atividades do dia.</div>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {registros.map(reg => {
            const obra = obras.find(o => o.id === reg.obraId);
            return (
              <Card key={reg.id} padding="var(--space-4) var(--space-5)" style={{ flexDirection: "row", alignItems: "flex-start", gap: "var(--space-4)" }}>
                <span style={{ width: "var(--space-11)", height: "var(--space-11)", borderRadius: "var(--radius-md)", background: "var(--accent)", color: "var(--text-on-accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon name={CLIMA_ICON[reg.clima] || "clock"} size={22} />
                </span>
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
                    <span style={{ fontWeight: "var(--fw-bold)" }}>
                      {(d => d[0].toUpperCase() + d.slice(1))(new Date(reg.data + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }))}
                    </span>
                    {obra && <Tag tone="accent">{obra.nome}</Tag>}
                    {reg.clima && <Tag tone="neutral">{reg.clima}</Tag>}
                    {reg.trabalhadores > 0 && (
                      <span style={{ fontSize: "var(--fs-p5-5)", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
                        <Icon name="users" size={16} />{reg.trabalhadores} trabalhadores
                      </span>
                    )}
                  </div>
                  <p style={{ margin: 0, lineHeight: "var(--lh-body)" }}>{reg.descricao}</p>
                  {reg.obs && <p style={{ margin: 0, fontSize: "var(--fs-p5-5)", color: "var(--text-secondary)" }}><b>Nota:</b> {reg.obs}</p>}
                </div>
                {canWrite && (
                  <div style={{ display: "flex", gap: "var(--space-1)", flexShrink: 0 }}>
                    <IconButton icon="pencil" label="Editar" onClick={() => abrirEdicao(reg)} />
                    <IconButton icon="trash-2" label="Excluir" onClick={() => del(reg.id)} />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {modal && (
        <Modal title={form.id ? "Editar registro" : "Novo registro diário"} onClose={fechar} wide
          footer={<><Button variant="secondary" onClick={fechar}>Cancelar</Button><Button iconLeft="check" loading={salvando} onClick={save}>Salvar registro</Button></>}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-md),1fr))", gap: "var(--space-4)" }}>
              <Select label="Obra" required error={erros.obraId} value={form.obraId || ""} onChange={e => setForm(f => ({ ...f, obraId: parseInt(e.target.value) }))}>
                <option value="">Selecione…</option>
                {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
              </Select>
              <Input label="Data" required type="date" error={erros.data} value={form.data || ""} onChange={set("data")} />
              <Select label="Clima" value={form.clima || ""} onChange={set("clima")}>
                <option value="">Não informado</option>
                {CLIMAS.map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
              <Input label="Trabalhadores presentes" type="number" min="0" placeholder="0" value={presencas.length || form.trabalhadores || ""} disabled={presencas.length > 0} onChange={set("trabalhadores")} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-2)" }}>
                <h3 style={{ margin: 0, font: "var(--type-card-title)", fontSize: "var(--fs-p4)" }}>Equipe presente</h3>
                {presencas.length > 0 && <Tag tone="accent">{presencas.length} presente{presencas.length > 1 ? "s" : ""} · {fmt(custoDia)}</Tag>}
              </div>
              {!funcionarios.length ? (
                <Banner tone="info">Nenhuma pessoa cadastrada. Cadastre em Cadastros › Pessoas para apontar presença.</Banner>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", maxHeight: "var(--scroll-h-sm)", overflowY: "auto", border: "var(--border-w) solid var(--border-default)", borderRadius: "var(--radius-md)" }}>
                  {funcionarios.map(f => {
                    const p = presencas.find(x => x.funcionarioId === f.id);
                    return (
                      <div key={f.id} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", padding: "var(--space-2) var(--space-3)", borderBottom: "var(--border-w) solid var(--border-subtle)", background: p ? "var(--surface-row-hover)" : "transparent" }}>
                        <Checkbox checked={!!p} onChange={() => togglePresenca(f.id)} label={
                          <span style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontWeight: "var(--fw-semibold)" }}>{f.nome}</span>
                            <span style={{ fontSize: "var(--fs-p6)", color: "var(--text-secondary)" }}>{f.cargo || "—"} · {fmt(f.salarioDia)}/dia</span>
                          </span>
                        } />
                        <span style={{ flex: 1 }} />
                        {p && (
                          <Select aria-label="Período" style={{ height: "var(--control-h-sm)", minWidth: "var(--control-w-sm)" }} value={p.dias} onChange={e => setDiasPresenca(f.id, parseFloat(e.target.value))}>
                            <option value={1}>Dia cheio</option>
                            <option value={0.5}>Meio período</option>
                          </Select>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <span style={{ fontSize: "var(--fs-p6)", color: "var(--text-secondary)" }}>Cada pessoa marcada vira um apontamento na data: é o que alimenta o custo de mão de obra.</span>
            </div>

            <Textarea label="Descrição das atividades" required rows={4} maxLength={2000} error={erros.descricao} placeholder="Descreva as atividades realizadas no dia…" value={form.descricao || ""} onChange={set("descricao")} />
            <Textarea label="Observações" rows={2} maxLength={1000} placeholder="Ocorrências, problemas, pendências…" value={form.obs || ""} onChange={set("obs")} />
          </div>
        </Modal>
      )}
    </div>
  );
}
