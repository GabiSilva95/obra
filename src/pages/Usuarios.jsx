import { useState } from "react";
import { PLANOS, planoPorId } from "../constants/data";
import { validate } from "../utils/helpers";
import { avisarErro } from "../utils/aviso";
import { emitirLimiteAtingido } from "../utils/planoLimite";
import { Avatar, Badge, Banner, Button, Card, IconButton, Input, Modal, OptionRow, ProgressBar, Tag } from "../../design-system";
import { PageActions } from "../components/PageActions";

const ALL_PERMS = [
  { id: "obras", l: "Obras" }, { id: "maquinas", l: "Máquinas" }, { id: "cadastros", l: "Cadastros" },
  { id: "estoque", l: "Estoque" }, { id: "alocacao", l: "Alocação" }, { id: "relatorios", l: "Relatórios" },
];

export default function Usuarios({ data, setData, api, tenant, setTenant }) {
  const { obras } = data;
  const users = data.users;
  const plano = planoPorId(tenant.plano) || PLANOS[0];
  const ativos = users.filter(u => u.ativo).length;
  const limiteAtingido = ativos >= plano.usuarios;
  const [modal, setModal] = useState(false);
  const [planoModal, setPlanoModal] = useState(false);
  const [form, setForm] = useState({});
  const [erros, setErros] = useState({});
  const [salvando, setSalvando] = useState(false);

  const save = async () => {
    const rules = {
      nome:  { required: true, label: "Nome" },
      email: { required: true, label: "E-mail" },
    };
    if (!form.id) rules.senha = { required: true, label: "Senha" };
    const { ok, erros: e } = validate(form, rules);
    if (!ok) { setErros(e); return; }
    if (salvando) return;
    setSalvando(true);
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
    finally { setSalvando(false); }
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

  const planoAtual = planoPorId(tenant.plano)?.id;
  const fecharModal = () => { setModal(false); setErros({}); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <PageActions>
        <Button variant="secondary" iconLeft="shield-check" onClick={() => setPlanoModal(true)}>Alterar plano</Button>
        <Button iconLeft="plus" onClick={() => { if (limiteAtingido) { emitirLimiteAtingido({ recurso: "usuarios", limite: plano.usuarios, atual: ativos }); return; } setForm({ permissoes: [], obrasAcesso: [] }); setModal(true); }}>Novo usuário</Button>
      </PageActions>

      <Card title="Usuários ativos" action={<Tag tone="accent">Plano {plano.nome}</Tag>}>
        <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)" }}>
          <span>{ativos} de {plano.usuarios === 999 ? "ilimitados" : plano.usuarios} usuários</span>
          <span style={{ fontWeight: "var(--fw-bold)", color: limiteAtingido ? "var(--status-danger)" : "var(--text-primary)" }}>{plano.usuarios === 999 ? "Sem limite" : `${Math.round(ativos / plano.usuarios * 100)}%`}</span>
        </div>
        <ProgressBar value={plano.usuarios === 999 ? 20 : Math.round(ativos / plano.usuarios * 100)} color={limiteAtingido ? "var(--status-danger)" : "var(--accent)"} label="Uso do plano" />
      </Card>

      {limiteAtingido && (
        <Banner tone="danger" title="Limite de usuários atingido" action={<Button size="sm" variant="danger" onClick={() => setPlanoModal(true)}>Fazer upgrade</Button>}>
          Faça upgrade para adicionar mais usuários.
        </Banner>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {users.map(u => {
          const admin = u.role === "tenant_admin";
          return (
            <Card key={u.id} padding="var(--space-4) var(--space-5)" style={{ flexDirection: "row", alignItems: "flex-start", gap: "var(--space-4)" }}>
              <Avatar name={u.nome} size={44} />
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: "var(--fw-bold)" }}>{u.nome}</span>
                  {admin && <Badge size="sm" tone="dark">Administrador</Badge>}
                  <Badge size="sm" tone={u.ativo ? "success" : "neutral"}>{u.ativo ? "Ativo" : "Inativo"}</Badge>
                </div>
                <span style={{ color: "var(--text-secondary)" }}>{u.email}</span>
                {!admin && (
                  <>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-1-5)", alignItems: "center" }}>
                      <span style={{ fontSize: "var(--fs-p5-5)", color: "var(--text-secondary)" }}>Telas:</span>
                      {(u.permissoes || []).length ? (u.permissoes || []).map(p => { const pp = ALL_PERMS.find(x => x.id === p); return pp ? <Tag key={p} tone="neutral">{pp.l}</Tag> : null; }) : <span style={{ color: "var(--text-secondary)" }}>Nenhuma</span>}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-1-5)", alignItems: "center" }}>
                      <span style={{ fontSize: "var(--fs-p5-5)", color: "var(--text-secondary)" }}>Obras:</span>
                      {(u.obrasAcesso || []).length ? (u.obrasAcesso || []).map(id => { const o = obras.find(x => x.id === id); return o ? <Tag key={id} tone="accent">{o.nome}</Tag> : null; }) : <span style={{ color: "var(--text-secondary)" }}>Todas</span>}
                    </div>
                  </>
                )}
              </div>
              {!admin && (
                <div style={{ display: "flex", gap: "var(--space-2)", flexShrink: 0 }}>
                  <IconButton icon="pencil" variant="outline" label="Editar" onClick={() => { setForm({ ...u, permissoes: u.permissoes || [], obrasAcesso: u.obrasAcesso || [] }); setModal(true); }} />
                  <Button size="sm" variant={u.ativo ? "secondary" : "primary"} onClick={() => togAtivo(u)}>{u.ativo ? "Desativar" : "Ativar"}</Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {modal && (
        <Modal title={form.id ? "Editar usuário" : "Novo usuário"} onClose={fecharModal} wide
          footer={<><Button variant="secondary" onClick={fecharModal}>Cancelar</Button><Button iconLeft="check" loading={salvando} onClick={save}>Salvar usuário</Button></>}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-md),1fr))", gap: "var(--space-4)" }}>
              <Input label="Nome" required error={erros.nome} value={form.nome || ""} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
              <Input label="E-mail" required type="email" error={erros.email} value={form.email || ""} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            {!form.id && <Input label="Senha" required type="password" autoComplete="new-password" error={erros.senha} value={form.senha || ""} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))} />}
            <div>
              <h3 style={{ margin: 0, font: "var(--type-card-title)", fontSize: "var(--fs-p4)" }}>Telas permitidas</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(var(--col-min-sm),1fr))", columnGap: "var(--space-8)" }}>
                {ALL_PERMS.map(p => <OptionRow key={p.id} label={p.l} checked={(form.permissoes || []).includes(p.id)} onChange={() => togP(p.id)} />)}
              </div>
            </div>
            <div>
              <h3 style={{ margin: 0, font: "var(--type-card-title)", fontSize: "var(--fs-p4)" }}>Obras com acesso</h3>
              <p style={{ margin: "var(--space-1) 0 0", color: "var(--text-secondary)", fontSize: "var(--fs-p5-5)" }}>Deixe vazio para acesso a todas.</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(var(--col-min-md),1fr))", columnGap: "var(--space-8)" }}>
                {obras.map(o => <OptionRow key={o.id} icon="building-2" label={o.nome} checked={(form.obrasAcesso || []).includes(o.id)} onChange={() => togO(o.id)} />)}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {planoModal && (
        <Modal title="Alterar plano" onClose={() => setPlanoModal(false)} wide>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-sm),1fr))", gap: "var(--space-3)" }}>
              {PLANOS.map(p => {
                const curr = planoAtual === p.id;
                return (
                  <Card key={p.id} selected={curr} padding="var(--space-4)" title={p.nome}
                    action={curr ? <Badge size="sm" tone="accent">Atual</Badge> : p.popular ? <Badge size="sm" tone="neutral">Popular</Badge> : null}>
                    <div><span style={{ font: "var(--type-stat)", fontSize: "var(--fs-h4)" }}>R$ {p.preco.mensal}</span><span style={{ color: "var(--text-secondary)" }}> /mês</span></div>
                    <div style={{ color: "var(--text-secondary)", fontSize: "var(--fs-p5-5)" }}>
                      <div>{p.usuarios === 999 ? "Usuários ilimitados" : `Até ${p.usuarios} usuários`}</div>
                      <div>{p.obras === 999 ? "Obras ilimitadas" : `Até ${p.obras} obras`}</div>
                    </div>
                    {!curr && <Button size="sm" fullWidth onClick={() => { setTenant(t => ({ ...t, plano: p.id })); setPlanoModal(false); }}>Migrar para {p.nome}</Button>}
                  </Card>
                );
              })}
            </div>
            <p style={{ margin: 0, fontSize: "var(--fs-p5-5)", color: "var(--text-secondary)", textAlign: "center" }}>A migração de plano é imediata nesta demonstração.</p>
          </div>
        </Modal>
      )}
    </div>
  );
}
