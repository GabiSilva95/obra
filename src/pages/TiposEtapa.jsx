import { useState } from "react";
import { C, F } from "../constants/tokens";
import { validate } from "../utils/helpers";
import { Icon, Card, Modal, Inp, Btn } from "../components/ui";

export default function TiposEtapa({ data, setData, api, canWrite }) {
  const tipos = data.tiposEtapa;
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [erros, setErros] = useState({});

  const save = async () => {
    const { ok, erros: e } = validate(form, { nome: { required: true, label: "Nome da Etapa" } });
    if (!ok) { setErros(e); return; }
    try {
      if (form.id) {
        const updated = await api.put(`/cadastros/tipos-etapa/${form.id}`, form);
        setData(d => ({ ...d, tiposEtapa: d.tiposEtapa.map(x => x.id === form.id ? updated : x) }));
      } else {
        const novo = await api.post("/cadastros/tipos-etapa", form);
        setData(d => ({ ...d, tiposEtapa: [...d.tiposEtapa, novo] }));
      }
      setErros({}); setModal(false);
    } catch (err) { alert(err.message); }
  };

  const del = async id => {
    if (!confirm("Remover tipo? Etapas já lançadas com este tipo não serão afetadas.")) return;
    try {
      await api.del(`/cadastros/tipos-etapa/${id}`);
      setData(d => ({ ...d, tiposEtapa: d.tiposEtapa.filter(x => x.id !== id) }));
    } catch (err) { alert(err.message); }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, ...F, letterSpacing: "-0.02em" }}>Tipos de Etapa</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Catálogo padrão com tempo estimado</div>
        </div>
        {canWrite && <Btn onClick={() => { setForm({}); setModal(true); }} sx={{ fontSize: 11, padding: "6px 12px" }}><Icon n="plus" size={12} />Novo Tipo</Btn>}
      </div>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,.02)" }}>
              {["", "Nome", "Tempo Padrão", "#", ""].map((h, i) => (
                <th key={i} style={{ padding: "10px 14px", textAlign: "left", color: C.dim, fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", ...F, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tipos.map(t => (
              <tr key={t.id} style={{ borderTop: `1px solid ${C.borderLight}` }}>
                <td style={{ padding: "10px 14px", width: 36 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: C.orangeDim, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon n={t.icon || "checklist"} size={13} color={C.orange} />
                  </div>
                </td>
                <td style={{ padding: "10px 14px", fontWeight: 600, color: C.text, ...F }}>{t.nome}</td>
                <td style={{ padding: "10px 14px" }}>
                  {t.tempoPadrao
                    ? <span style={{ display: "flex", alignItems: "center", gap: 5, color: C.muted, fontSize: 11 }}><Icon n="clock" size={11} color={C.dim} />{t.tempoPadrao} dias</span>
                    : <span style={{ color: C.dim, fontSize: 11 }}>—</span>}
                </td>
                <td style={{ padding: "10px 14px", color: C.dim, fontSize: 11 }}>#{t.id}</td>
                <td style={{ padding: "10px 14px", textAlign: "right" }}>
                  {canWrite && (
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <button onClick={() => { setForm({ ...t }); setModal(true); }} style={{ background: "none", border: "none", cursor: "pointer", color: C.dim, display: "flex", padding: 3 }}><Icon n="edit" size={12} color={C.dim} /></button>
                      <button onClick={() => del(t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.dim, display: "flex", padding: 3 }}><Icon n="trash" size={12} color={C.dim} /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {modal && (
        <Modal title={form.id ? "Editar Tipo" : "Novo Tipo de Etapa"} onClose={() => { setModal(false); setErros({}); }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            <Inp label="Nome da Etapa" error={erros.nome} value={form.nome || ""} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
            <Inp label="Tempo Padrão de Conclusão (dias)" type="number" placeholder="Ex: 30" value={form.tempoPadrao || ""} onChange={e => setForm(f => ({ ...f, tempoPadrao: e.target.value ? parseInt(e.target.value) : null }))} />
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
