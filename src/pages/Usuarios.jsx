import { useState } from "react";
import { C, F } from "../constants/tokens";
import { PLANOS } from "../constants/data";
import { validate } from "../utils/helpers";
import { Icon, Badge, Bar, Card, Modal, Inp, Btn, Hdr } from "../components/ui";
import { avisarErro } from "../utils/aviso";
import { emitirLimiteAtingido } from "../utils/planoLimite";

const ALL_PERMS = [
  { id: "obras", l: "Obras" }, { id: "maquinas", l: "Máquinas" }, { id: "cadastros", l: "Cadastros" },
  { id: "estoque", l: "Estoque" }, { id: "alocacao", l: "Alocação" }, { id: "relatorios", l: "Relatórios" },
];

export default function Usuarios({ data, setData, api, tenant, setTenant }) {
  const { obras } = data;
  const users = data.users;
  const plano = PLANOS.find(p => p.id === tenant.plano) || PLANOS[0];
  const ativos = users.filter(u => u.ativo).length;
  const limiteAtingido = ativos >= plano.usuarios;
  const [modal, setModal] = useState(false);
  const [planoModal, setPlanoModal] = useState(false);
  const [form, setForm] = useState({});
  const [erros, setErros] = useState({});

  const save = async () => {
    const rules = {
      nome:  { required: true, label: "Nome" },
      email: { required: true, label: "E-mail" },
    };
    if (!form.id) rules.senha = { required: true, label: "Senha" };
    const { ok, erros: e } = validate(form, rules);
    if (!ok) { setErros(e); return; }
    try {
      if (form.id) {
        const updated = await api.put(`/usuarios/${form.id}`, { ...form, obrasAcesso: form.obrasAcesso || [], permissoes: form.permissoes || [] });
        setData(d => ({ ...d, users: d.users.map(u => u.id === form.id ? { ...updated, obrasAcesso: form.obrasAcesso || [] } : u) }));
      } else {
        const novo = await api.post("/usuarios", { ...form, permissoes: form.permissoes || [], obrasAcesso: form.obrasAcesso || [] });
        setData(d => ({ ...d, users: [...d.users, { ...novo, obrasAcesso: form.obrasAcesso || [] }] }));
      }
      setErros({}); setModal(false);
    } catch (err) { if (!err.limitePlano) avisarErro(err.message); }
  };
  const togP = p => { const pp = form.permissoes || []; setForm(f => ({ ...f, permissoes: pp.includes(p) ? pp.filter(x => x !== p) : [...pp, p] })); };
  const togO = id => { const oa = form.obrasAcesso || []; setForm(f => ({ ...f, obrasAcesso: oa.includes(id) ? oa.filter(x => x !== id) : [...oa, id] })); };
  const togAtivo = async u => {
    if (u.role === "tenant_admin") return;
    try {
      await api.patch(`/usuarios/${u.id}/ativo`, { ativo: !u.ativo });
      setData(d => ({ ...d, users: d.users.map(x => x.id === u.id ? { ...x, ativo: !x.ativo } : x) }));
    } catch (err) { if (!err.limitePlano) avisarErro(err.message); }
  };

  return (
    <div>
      <Hdr
        title="Usuários"
        sub={`Plano ${plano.nome} — ${ativos} de ${plano.usuarios === 999 ? "∞" : plano.usuarios} usuários ativos`}
        action={
          <div style={{ display: "flex", gap: 9 }}>
            <Btn v="outline" onClick={() => setPlanoModal(true)} sx={{ fontSize: 11, padding: "6px 13px" }}><Icon n="shield" size={12} />Alterar Plano</Btn>
            <Btn onClick={() => { if (limiteAtingido) { emitirLimiteAtingido({ recurso: "usuarios", limite: plano.usuarios, atual: ativos }); return; } setForm({ permissoes: [], obrasAcesso: [] }); setModal(true); }} sx={{ opacity: limiteAtingido ? .5 : 1 }}><Icon n="plus" size={13} />Novo Usuário</Btn>
          </div>
        }
      />

      <Card style={{ padding: "13px 16px", marginBottom: 18, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: C.muted }}>Usuários ativos</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: limiteAtingido ? C.red : C.text }}>{ativos}{plano.usuarios !== 999 && ` / ${plano.usuarios}`}</span>
          </div>
          <Bar val={plano.usuarios === 999 ? 20 : Math.round(ativos / plano.usuarios * 100)} color={limiteAtingido ? C.red : C.orange} />
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: C.dim }}>Plano atual</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: plano.cor || C.orange, ...F }}>{plano.nome}</div>
        </div>
      </Card>

      {limiteAtingido && (
        <div style={{ marginBottom: 16, background: "rgba(239,68,68,.06)", border: "1px solid rgba(239,68,68,.18)", borderRadius: 11, padding: "11px 15px", display: "flex", alignItems: "center", gap: 10 }}>
          <Icon n="alert" size={16} color={C.red} />
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.red }}>Limite de usuários atingido. </span>
            <span style={{ fontSize: 12, color: "rgba(239,68,68,.65)" }}>Faça upgrade para adicionar mais usuários.</span>
          </div>
          <Btn v="danger" onClick={() => setPlanoModal(true)} sx={{ fontSize: 11, padding: "5px 13px" }}>Upgrade</Btn>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {users.map(u => (
          <Card key={u.id}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 13 }}>
              <div style={{ width: 42, height: 42, borderRadius: 13, background: u.role === "tenant_admin" ? C.orangeDim : "rgba(255,255,255,.04)", border: `1px solid ${u.role === "tenant_admin" ? C.orange : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: u.role === "tenant_admin" ? C.orange : C.muted, flexShrink: 0, ...F }}>
                {u.nome[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 3 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: C.text, ...F, letterSpacing: "-0.02em" }}>{u.nome}</span>
                  {u.role === "tenant_admin" && <Badge v="orange"><Icon n="shield" size={9} />Admin</Badge>}
                  <Badge v={u.ativo ? "green" : "red"} dot>{u.ativo ? "Ativo" : "Inativo"}</Badge>
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 7 }}>{u.email}</div>
                {u.role !== "tenant_admin" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
                      <span style={{ fontSize: 10, color: C.dim, marginRight: 2 }}>Telas:</span>
                      {(u.permissoes || []).length ? (u.permissoes || []).map(p => { const pp = ALL_PERMS.find(x => x.id === p); return pp ? <Badge key={p}>{pp.l}</Badge> : null; }) : <span style={{ fontSize: 11, color: C.dim }}>Nenhuma</span>}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
                      <span style={{ fontSize: 10, color: C.dim, marginRight: 2 }}>Obras:</span>
                      {(u.obrasAcesso || []).length ? (u.obrasAcesso || []).map(id => { const o = obras.find(x => x.id === id); return o ? <Badge key={id} v="blue">{o.nome}</Badge> : null; }) : <span style={{ fontSize: 11, color: C.dim }}>Todas</span>}
                    </div>
                  </div>
                )}
              </div>
              {u.role !== "tenant_admin" && (
                <div style={{ display: "flex", gap: 7, flexShrink: 0 }}>
                  <Btn v="secondary" onClick={() => { setForm({ ...u, permissoes: u.permissoes || [], obrasAcesso: u.obrasAcesso || [] }); setModal(true); }} sx={{ fontSize: 11, padding: "5px 11px" }}><Icon n="edit" size={12} />Editar</Btn>
                  <Btn v={u.ativo ? "danger" : "secondary"} onClick={() => togAtivo(u)} sx={{ fontSize: 11, padding: "5px 11px" }}>{u.ativo ? "Desativar" : "Ativar"}</Btn>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {modal && (
        <Modal title={form.id ? "Editar Usuário" : "Novo Usuário"} onClose={() => { setModal(false); setErros({}); }} wide>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Inp label="Nome" error={erros.nome} value={form.nome || ""} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
              <Inp label="E-mail" type="email" error={erros.email} value={form.email || ""} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            {!form.id && <Inp label="Senha" type="password" error={erros.senha} value={form.senha || ""} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))} />}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 8, ...F }}>Telas Permitidas</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 7 }}>
                {ALL_PERMS.map(p => { const ch = (form.permissoes || []).includes(p.id); return (
                  <label key={p.id} onClick={() => togP(p.id)} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", background: ch ? C.orangeDim : "rgba(255,255,255,.025)", border: `1px solid ${ch ? C.orange : C.border}`, borderRadius: 9, padding: "7px 10px", transition: "all .15s" }}>
                    <div style={{ width: 14, height: 14, borderRadius: 4, background: ch ? C.orange : "rgba(255,255,255,.05)", border: `1px solid ${ch ? C.orange : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {ch && <Icon n="check" size={9} color="#0a0a0a" />}
                    </div>
                    <span style={{ fontSize: 11, color: ch ? C.orange : C.muted, ...F }}>{p.l}</span>
                  </label>
                ); })}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 4, ...F }}>Obras com Acesso</div>
              <div style={{ fontSize: 10, color: C.dim, marginBottom: 8 }}>Deixe vazio para acesso a todas</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                {obras.map(o => { const ch = (form.obrasAcesso || []).includes(o.id); return (
                  <label key={o.id} onClick={() => togO(o.id)} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", background: ch ? "rgba(96,165,250,.07)" : "rgba(255,255,255,.025)", border: `1px solid ${ch ? C.blue : C.border}`, borderRadius: 9, padding: "7px 10px", transition: "all .15s" }}>
                    <div style={{ width: 14, height: 14, borderRadius: 4, background: ch ? C.blue : "rgba(255,255,255,.05)", border: `1px solid ${ch ? C.blue : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {ch && <Icon n="check" size={9} color="#fff" />}
                    </div>
                    <span style={{ fontSize: 11, color: ch ? C.blue : C.muted, ...F }}>{o.nome}</span>
                  </label>
                ); })}
              </div>
            </div>
            <div style={{ display: "flex", gap: 9, justifyContent: "flex-end", borderTop: `1px solid ${C.borderLight}`, paddingTop: 14 }}>
              <Btn v="secondary" onClick={() => { setModal(false); setErros({}); }}>Cancelar</Btn>
              <Btn onClick={save}><Icon n="check" size={13} />Salvar Usuário</Btn>
            </div>
          </div>
        </Modal>
      )}

      {planoModal && (
        <Modal title="Alterar Plano" onClose={() => setPlanoModal(false)} wide>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 18 }}>
            {PLANOS.map(p => { const curr = tenant.plano === p.id; return (
              <div key={p.id} onClick={() => !curr && setTenant(t => ({ ...t, plano: p.id }))} style={{ background: curr ? "rgba(249,115,22,.06)" : "rgba(255,255,255,.02)", border: `2px solid ${curr ? C.orange : C.border}`, borderRadius: 14, padding: "18px 16px", cursor: curr ? "default" : "pointer", transition: "all .18s", position: "relative" }}>
                {curr && <div style={{ position: "absolute", top: 10, right: 10, width: 16, height: 16, borderRadius: "50%", background: C.orange, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon n="check" size={9} color="#0a0a0a" /></div>}
                {p.popular && <div style={{ fontSize: 9, fontWeight: 800, color: C.orange, marginBottom: 6, letterSpacing: "0.07em" }}>★ POPULAR</div>}
                <div style={{ fontSize: 12, fontWeight: 700, color: p.cor, ...F, marginBottom: 4 }}>{p.nome}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: "-0.04em", marginBottom: 4 }}>R$ {p.preco.mensal}<span style={{ fontSize: 11, fontWeight: 400, color: C.muted }}>/mês</span></div>
                <div style={{ fontSize: 11, color: C.muted }}>{p.usuarios === 999 ? "Usuários ilimitados" : `Até ${p.usuarios} usuários`}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{p.obras === 999 ? "Obras ilimitadas" : `Até ${p.obras} obras`}</div>
                {curr && <div style={{ marginTop: 10, fontSize: 10, color: C.orange, fontWeight: 700 }}>Plano atual</div>}
                {!curr && <Btn onClick={() => { setTenant(t => ({ ...t, plano: p.id })); setPlanoModal(false); }} sx={{ marginTop: 12, width: "100%", justifyContent: "center", fontSize: 11, padding: "7px" }}>Migrar para {p.nome}</Btn>}
              </div>
            ); })}
          </div>
          <div style={{ fontSize: 11, color: C.dim, textAlign: "center" }}>A migração de plano é imediata nesta demonstração.</div>
        </Modal>
      )}
    </div>
  );
}
