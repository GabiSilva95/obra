import { useState } from "react";
import { C, F } from "../constants/tokens";
import { validate } from "../utils/helpers";
import { Icon, Badge, Card, Modal, Inp, Btn, Hdr, DSel } from "../components/ui";

const CLIMAS = ["Ensolarado", "Nublado", "Chuvoso", "Parcialmente nublado", "Tempestade"];
const CLIMA_ICON = { Ensolarado: "sun", Nublado: "cloud", Chuvoso: "rain", "Parcialmente nublado": "cloud", Tempestade: "alert" };

export default function Diario({ data, setData, api, canWrite }) {
  const { obras, diario = [] } = data;
  const [obraFiltro, setObraFiltro] = useState(obras[0]?.id || "");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [erros, setErros] = useState({});

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
    try {
      if (form.id) {
        const updated = await api.put(`/diario/${form.id}`, form);
        setData(d => ({ ...d, diario: d.diario.map(x => x.id === form.id ? updated : x) }));
      } else {
        const novo = await api.post("/diario", form);
        setData(d => ({ ...d, diario: [novo, ...(d.diario || [])] }));
      }
      setErros({}); setModal(false);
    } catch (err) { alert(err.message); }
  };

  const del = async id => {
    if (!confirm("Remover registro do diário?")) return;
    try {
      await api.del(`/diario/${id}`);
      setData(d => ({ ...d, diario: d.diario.filter(x => x.id !== id) }));
    } catch (err) { alert(err.message); }
  };

  return (
    <div>
      <Hdr
        title="Diário de Obra"
        sub="Registro diário de atividades, equipe e condições"
        action={
          <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
            <DSel value={obraFiltro} onChange={e => setObraFiltro(e.target.value)}>
              <option value="">Todas as obras</option>
              {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
            </DSel>
            {canWrite && (
              <Btn onClick={() => { setForm({ obraId: obraFiltro || obras[0]?.id, data: new Date().toISOString().slice(0, 10) }); setModal(true); }}>
                <Icon n="plus" size={13} />Novo Registro
              </Btn>
            )}
          </div>
        }
      />

      {registros.length === 0 ? (
        <Card style={{ textAlign: "center", padding: "48px 24px", color: C.dim }}>
          <Icon n="book" size={32} color={C.border} />
          <div style={{ marginTop: 12, fontSize: 13 }}>Nenhum registro encontrado</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>Comece registrando as atividades do dia</div>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {registros.map(reg => {
            const obra = obras.find(o => o.id === reg.obraId);
            return (
              <Card key={reg.id}>
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: C.orangeDim, border: `1px solid ${C.orange}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon n={CLIMA_ICON[reg.clima] || "clock"} size={18} color={C.orange} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: C.text, ...F }}>
                        {new Date(reg.data + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
                      </span>
                      {obra && <Badge v="blue">{obra.nome}</Badge>}
                      {reg.clima && <Badge>{reg.clima}</Badge>}
                      {reg.trabalhadores > 0 && (
                        <span style={{ fontSize: 11, color: C.muted, display: "flex", alignItems: "center", gap: 4 }}>
                          <Icon n="users" size={10} color={C.dim} />{reg.trabalhadores} trabalhadores
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, margin: 0 }}>{reg.descricao}</p>
                    {reg.obs && <p style={{ fontSize: 11, color: C.dim, marginTop: 6, fontStyle: "italic" }}>{reg.obs}</p>}
                  </div>
                  {canWrite && (
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button onClick={() => { setForm({ ...reg }); setModal(true); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                        <Icon n="edit" size={13} color={C.dim} />
                      </button>
                      <button onClick={() => del(reg.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                        <Icon n="trash" size={13} color={C.dim} />
                      </button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {modal && (
        <Modal title={form.id ? "Editar Registro" : "Novo Registro Diário"} onClose={() => { setModal(false); setErros({}); }} wide>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 6, ...F }}>Obra</div>
                <select value={form.obraId || ""} onChange={e => setForm(f => ({ ...f, obraId: parseInt(e.target.value) }))} style={{ width: "100%", background: "rgba(255,255,255,.04)", border: `1px solid ${erros.obraId ? "#ef4444" : C.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 12, color: C.text, outline: "none", ...F }}>
                  <option value="">Selecione...</option>
                  {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
                </select>
                {erros.obraId && <div style={{ fontSize: 10, color: "#ef4444", marginTop: 4 }}>{erros.obraId}</div>}
              </div>
              <Inp label="Data" type="date" error={erros.data} value={form.data || ""} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 6, ...F }}>Clima</div>
                <select value={form.clima || ""} onChange={e => setForm(f => ({ ...f, clima: e.target.value }))} style={{ width: "100%", background: "rgba(255,255,255,.04)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 12, color: C.text, outline: "none", ...F }}>
                  <option value="">Não informado</option>
                  {CLIMAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <Inp label="Trabalhadores presentes" type="number" placeholder="0" value={form.trabalhadores || ""} onChange={e => setForm(f => ({ ...f, trabalhadores: e.target.value }))} />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 6, ...F }}>Descrição das atividades *</div>
              <textarea value={form.descricao || ""} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} rows={4} placeholder="Descreva as atividades realizadas no dia..." style={{ width: "100%", background: "rgba(255,255,255,.04)", border: `1px solid ${erros.descricao ? "#ef4444" : C.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 12, color: C.text, outline: "none", resize: "vertical", ...F, fontFamily: "inherit" }} />
              {erros.descricao && <div style={{ fontSize: 10, color: "#ef4444", marginTop: 4 }}>{erros.descricao}</div>}
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 6, ...F }}>Observações</div>
              <textarea value={form.obs || ""} onChange={e => setForm(f => ({ ...f, obs: e.target.value }))} rows={2} placeholder="Ocorrências, problemas, pendências..." style={{ width: "100%", background: "rgba(255,255,255,.04)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 12, color: C.text, outline: "none", resize: "vertical", ...F, fontFamily: "inherit" }} />
            </div>
            <div style={{ display: "flex", gap: 9, justifyContent: "flex-end", borderTop: `1px solid ${C.borderLight}`, paddingTop: 14 }}>
              <Btn v="secondary" onClick={() => { setModal(false); setErros({}); }}>Cancelar</Btn>
              <Btn onClick={save}><Icon n="check" size={13} />Salvar Registro</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
