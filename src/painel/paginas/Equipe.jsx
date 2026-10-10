import { useCallback, useEffect, useState } from "react";
import { Badge, Banner, Button, DataTable, IconButton, Input, Modal, OptionRow, Select, Tag } from "../../../design-system";
import { PageActions } from "../../components/PageActions";
import { avisarErro, confirmar } from "../../utils/aviso";
import { PAPEL_ADMIN, PERFIS_EQUIPE, PERMISSOES_EQUIPE, permissoesValidas } from "../../../server/config/painel.js";
import { dataHoraBR } from "../util";

const rotuloPermissao = id => PERMISSOES_EQUIPE.find(p => p.id === id)?.rotulo || id;

/** Perfil que combina exatamente com o acesso da pessoa; "personalizado" se nenhum combinar. */
function perfilDe(p) {
  if (p.papel === PAPEL_ADMIN) return "administrador";
  const lista = [...p.permissoes].sort().join();
  return PERFIS_EQUIPE.find(x => x.papel !== PAPEL_ADMIN && [...x.permissoes].sort().join() === lista)?.id || "personalizado";
}
const nomePerfil = id => PERFIS_EQUIPE.find(p => p.id === id)?.rotulo || "Personalizado";

/** Mostra a senha provisória uma única vez, para quem criou entregar à pessoa. */
function SenhaProvisoria({ nome, senha, onFechar }) {
  const [copiado, setCopiado] = useState(false);
  const copiar = async () => { try { await navigator.clipboard.writeText(senha); setCopiado(true); } catch { /* o campo já está selecionável */ } };
  return (
    <Modal title="Senha provisória" onClose={onFechar} footer={<Button onClick={onFechar}>Já anotei</Button>}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <Banner tone="warning" title="Ela aparece só agora">Entregue esta senha a {nome}. Não fica guardada em lugar nenhum e precisa ser trocada no primeiro acesso.</Banner>
        <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
          <code style={{ flex: 1, padding: "var(--space-3) var(--space-4)", background: "var(--surface-sunken)", borderRadius: "var(--radius-sm)", fontFamily: "var(--font-mono)", fontSize: "var(--fs-p3)", fontWeight: "var(--fw-bold)", userSelect: "all", overflowWrap: "anywhere" }}>{senha}</code>
          <Button variant="secondary" iconLeft="copy" onClick={copiar}>{copiado ? "Copiada" : "Copiar"}</Button>
        </div>
      </div>
    </Modal>
  );
}

/** Usuários do painel, com perfis prontos e permissões. Só administrador concede administração e a permissão Equipe. */
export default function Equipe({ api, equipe: eu }) {
  const [lista, setLista] = useState(null);
  const [form, setForm] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [senha, setSenha] = useState(null);
  const souAdmin = eu.papel === PAPEL_ADMIN;

  const carregar = useCallback(() => api.get("/painel/equipe").then(setLista).catch(e => avisarErro(e.message)), [api]);
  useEffect(() => { carregar(); }, []); // eslint-disable-line

  const abrirNovo = () => { setErro(""); setForm({ nome: "", email: "", perfil: "atendente", permissoes: [...PERFIS_EQUIPE.find(p => p.id === "atendente").permissoes] }); };
  const abrirEdicao = p => { setErro(""); setForm({ id: p.id, nome: p.nome, email: p.email, perfil: perfilDe(p), permissoes: [...p.permissoes], propria: p.id === eu.id, admin: p.papel === PAPEL_ADMIN }); };
  const trocarPerfil = perfil => setForm(f => {
    const pronto = PERFIS_EQUIPE.find(p => p.id === perfil);
    return { ...f, perfil, permissoes: pronto ? [...pronto.permissoes] : f.permissoes };
  });
  const alternar = id => setForm(f => {
    const tem = f.permissoes.includes(id);
    const permissoes = tem ? f.permissoes.filter(x => x !== id) : [...f.permissoes, id];
    return { ...f, permissoes, perfil: "personalizado" };
  });

  const salvar = async () => {
    if (salvando) return;
    if (!form.nome.trim()) return setErro("Informe o nome.");
    setSalvando(true); setErro("");
    try {
      const corpo = { nome: form.nome, ...(form.perfil !== "personalizado" ? { perfil: form.perfil } : { permissoes: permissoesValidas(form.permissoes) }) };
      if (form.id) await api.put(`/painel/equipe/${form.id}`, form.propria ? { nome: form.nome } : corpo);
      else {
        const criada = await api.post("/painel/equipe", { ...corpo, email: form.email });
        setSenha({ nome: criada.nome, senha: criada.senhaTemporaria });
      }
      setForm(null);
      await carregar();
    } catch (e) { setErro(e.message); } finally { setSalvando(false); }
  };

  const alternarAtivo = async p => {
    if (!p.ativo || (await confirmar({ titulo: "Desativar acesso", mensagem: `${p.nome} perde o acesso ao painel agora. Dá para reativar depois.`, confirmarRotulo: "Desativar", perigo: true }))) {
      try { await api.put(`/painel/equipe/${p.id}`, { ativo: !p.ativo }); await carregar(); } catch (e) { avisarErro(e.message); }
    }
  };
  const redefinir = async p => {
    if (!(await confirmar({ titulo: "Redefinir senha", mensagem: `Gerar uma senha provisória nova para ${p.nome}? A senha atual deixa de valer e as sessões abertas são encerradas.`, confirmarRotulo: "Redefinir", perigo: true }))) return;
    try { const r = await api.post(`/painel/equipe/${p.id}/redefinir-senha`); setSenha({ nome: p.nome, senha: r.senhaTemporaria }); await carregar(); } catch (e) { avisarErro(e.message); }
  };

  const podeMexer = p => p.papel !== PAPEL_ADMIN || souAdmin;
  const perfisDisponiveis = PERFIS_EQUIPE.filter(p => souAdmin || p.papel !== PAPEL_ADMIN);
  const permissoesDisponiveis = PERMISSOES_EQUIPE.filter(p => souAdmin || p.id !== "equipe");

  return (
    <>
      <PageActions><Button iconLeft="plus" onClick={abrirNovo}>Nova pessoa</Button></PageActions>
      <p style={{ color: "var(--text-secondary)" }}>Quem acessa o painel e o que pode fazer. A pessoa recebe uma senha provisória e a troca no primeiro acesso.</p>
      {!lista ? <span style={{ color: "var(--text-secondary)" }}>Carregando…</span> : (
        <DataTable minWidth={880} rows={lista} rowKey={p => p.id} empty="Ninguém na equipe ainda." columns={[
          { key: "nome", label: "Pessoa", render: p => (
            <span style={{ display: "flex", flexDirection: "column", gap: "var(--space-0-5)" }}>
              <b>{p.nome}{p.id === eu.id ? " (você)" : ""}</b>
              <span style={{ fontSize: "var(--fs-p6)", color: "var(--text-secondary)" }}>{p.email}</span>
            </span>
          ) },
          { key: "acesso", label: "Acesso", render: p => (
            <span style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
              <b>{nomePerfil(perfilDe(p))}</b>
              {p.papel !== PAPEL_ADMIN && <span style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-1)" }}>{p.permissoes.length ? p.permissoes.map(x => <Tag key={x} tone="neutral">{rotuloPermissao(x)}</Tag>) : <span style={{ color: "var(--text-secondary)", fontSize: "var(--fs-p6)" }}>Nenhuma permissão</span>}</span>}
            </span>
          ) },
          { key: "situacao", label: "Situação", render: p => (
            <span style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)", alignItems: "flex-start" }}>
              <Badge size="sm" tone={p.ativo ? "success" : "neutral"}>{p.ativo ? "Ativo" : "Desativado"}</Badge>
              {p.trocarSenha && <Tag tone="neutral">Senha provisória</Tag>}
            </span>
          ) },
          { key: "ultimo", label: "Último acesso", render: p => (p.ultimoLoginEm ? dataHoraBR(p.ultimoLoginEm) : <span style={{ color: "var(--text-secondary)" }}>Nunca entrou</span>) },
          { key: "acoes", label: "", width: "var(--col-min-md)", render: p => podeMexer(p) && (
            <span style={{ display: "flex", gap: "var(--space-1)", justifyContent: "flex-end", alignItems: "center" }}>
              <IconButton icon="pencil" variant="outline" size={28} label="Editar" onClick={() => abrirEdicao(p)} />
              {p.id !== eu.id && <IconButton icon="key" variant="outline" size={28} label="Redefinir senha" onClick={() => redefinir(p)} />}
              {p.id !== eu.id && <Button size="sm" variant={p.ativo ? "secondary" : "primary"} onClick={() => alternarAtivo(p)}>{p.ativo ? "Desativar" : "Reativar"}</Button>}
            </span>
          ) },
        ]} />
      )}

      {form && (
        <Modal title={form.id ? "Editar pessoa" : "Nova pessoa"} onClose={() => setForm(null)} wide
          footer={<><Button variant="secondary" onClick={() => setForm(null)}>Cancelar</Button><Button iconLeft="check" loading={salvando} onClick={salvar}>{form.id ? "Salvar" : "Criar e gerar senha"}</Button></>}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-md),1fr))", gap: "var(--space-4)" }}>
              <Input label="Nome" required value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
              <Input label="E-mail" required type="email" disabled={!!form.id} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            {form.propria ? <Banner tone="info">Você não pode mudar o próprio acesso. Peça a outro administrador.</Banner> : (
              <>
                <Select label="Perfil" value={form.perfil} onChange={e => trocarPerfil(e.target.value)} helper="O perfil só preenche as permissões abaixo. Você pode ajustá-las.">
                  {perfisDisponiveis.map(p => <option key={p.id} value={p.id}>{p.rotulo}</option>)}
                  <option value="personalizado">Personalizado</option>
                </Select>
                {form.perfil === "administrador" ? <Banner tone="accent">O administrador tem acesso a tudo e pode gerenciar a equipe.</Banner> : (
                  <div>
                    <h3 style={{ margin: 0, font: "var(--type-card-title)", fontSize: "var(--fs-p4)" }}>Permissões</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(var(--col-min-lg),1fr))", columnGap: "var(--space-8)" }}>
                      {permissoesDisponiveis.map(p => <OptionRow key={p.id} label={p.rotulo} checked={form.permissoes.includes(p.id)} onChange={() => alternar(p.id)} />)}
                    </div>
                  </div>
                )}
              </>
            )}
            {erro && <Banner tone="danger">{erro}</Banner>}
          </div>
        </Modal>
      )}
      {senha && <SenhaProvisoria nome={senha.nome} senha={senha.senha} onFechar={() => setSenha(null)} />}
    </>
  );
}
