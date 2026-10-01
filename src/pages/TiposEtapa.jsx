import { useState } from "react";
import { validate } from "../utils/helpers";
import { avisarErro, avisarSucesso, confirmar } from "../utils/aviso";
import { Button, DataTable, Icon, IconButton, Input, Modal } from "../../design-system";
import { PageActions } from "../components/PageActions";

export default function TiposEtapa({ data, setData, api, canWrite }) {
  const tipos = data.tiposEtapa;
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [erros, setErros] = useState({});
  const [salvando, setSalvando] = useState(false);

  const save = async () => {
    if (salvando) return;
    const { ok, erros: e } = validate(form, { nome: { required: true, label: "Nome da Etapa" } });
    if (!ok) { setErros(e); return; }
    setSalvando(true);
    try {
      if (form.id) {
        const updated = await api.put(`/cadastros/tipos-etapa/${form.id}`, form);
        setData(d => ({ ...d, tiposEtapa: d.tiposEtapa.map(x => x.id === form.id ? updated : x) }));
      } else {
        const novo = await api.post("/cadastros/tipos-etapa", form);
        setData(d => ({ ...d, tiposEtapa: [...d.tiposEtapa, novo] }));
      }
      avisarSucesso("Tipo de etapa salvo.");
      setErros({}); setModal(false);
    } catch (err) { if (!err.limitePlano) avisarErro(err.message); }
    finally { setSalvando(false); }
  };

  const del = async id => {
    if (!(await confirmar({ mensagem: "Remover tipo? Etapas já lançadas com este tipo não serão afetadas.", confirmarRotulo: "Remover", perigo: true }))) return;
    try {
      await api.del(`/cadastros/tipos-etapa/${id}`);
      setData(d => ({ ...d, tiposEtapa: d.tiposEtapa.filter(x => x.id !== id) }));
    } catch (err) { if (!err.limitePlano) avisarErro(err.message); }
  };

  const fechar = () => { setModal(false); setErros({}); };

  return (
    <>
      <PageActions>{canWrite && <Button iconLeft="plus" onClick={() => { setForm({}); setModal(true); }}>Novo tipo</Button>}</PageActions>
      <p style={{ color: "var(--text-secondary)" }}>Catálogo padrão de etapas com tempo estimado.</p>
      <DataTable minWidth={560} rows={tipos} rowKey={t => t.id} empty="Nenhum tipo de etapa cadastrado." columns={[
        { key: "nome", label: "Nome", render: t => <span style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}><Icon name={t.icon || "square-check"} size={20} /><b>{t.nome}</b></span> },
        { key: "tempoPadrao", label: "Tempo padrão", render: t => t.tempoPadrao
          ? <span style={{ display: "flex", alignItems: "center", gap: "var(--space-1-5)" }}><Icon name="clock" size={16} />{t.tempoPadrao} dias</span> : "—" },
        { key: "id", label: "Código", render: t => <span style={{ color: "var(--text-secondary)" }}>#{t.id}</span> },
        ...(canWrite ? [{ key: "acoes", label: "", width: "var(--space-24)", render: t => (
          <div style={{ display: "flex", gap: "var(--space-1)" }}>
            <IconButton icon="pencil" size={28} label="Editar" onClick={() => { setForm({ ...t }); setModal(true); }} />
            <IconButton icon="trash-2" variant="danger" size={28} label="Excluir" onClick={() => del(t.id)} />
          </div>
        ) }] : []),
      ]} />
      {modal && (
        <Modal title={form.id ? "Editar tipo de etapa" : "Novo tipo de etapa"} onClose={fechar}
          footer={<><Button variant="secondary" onClick={fechar}>Cancelar</Button><Button iconLeft="check" loading={salvando} onClick={save}>Salvar</Button></>}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <Input label="Nome da etapa" required error={erros.nome} value={form.nome || ""} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
            <Input label="Tempo padrão de conclusão (dias)" type="number" min="0" placeholder="Ex.: 30" value={form.tempoPadrao || ""} onChange={e => setForm(f => ({ ...f, tempoPadrao: e.target.value ? parseInt(e.target.value) : null }))} />
          </div>
        </Modal>
      )}
    </>
  );
}
