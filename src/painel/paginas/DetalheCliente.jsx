import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Badge, Banner, Button, Card, Checkbox, DataTable, Input, Modal, MoneyInput, Select, Tag, Textarea } from "../../../design-system";
import { PLANOS } from "../../../server/config/planos.js";
import { DURACAO_LEITURA_MIN, MAX_DIAS_EXTENSAO, SITUACOES } from "../../../server/config/conta.js";
import { rotuloStatus } from "../../../server/config/suporte.js";
import { temPermissao } from "../../../server/config/painel.js";
import { formatarTelefoneBR } from "../../../server/utils/telefone.js";
import { avisarErro, confirmar } from "../../utils/aviso";
import { tomDoStatus } from "../../pages/Suporte/util";
import { entrarComoCliente } from "../entrarComoCliente";
import { textoTeste } from "./Clientes";
import { fmt, today } from "../../utils/helpers";
import { somarDias } from "../../../server/utils/datas.js";
import TabelaCobrancas from "./TabelaCobrancas";
import { dataBR, dataHoraBR, haQuanto } from "../util";

const Linha = ({ rotulo, children }) => (
  <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-3)", fontSize: "var(--fs-p5-5)" }}>
    <span style={{ color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{rotulo}</span><span style={{ fontWeight: "var(--fw-semibold)", textAlign: "right", overflowWrap: "anywhere" }}>{children}</span>
  </div>
);
const limiteTexto = (n, lim) => (lim == null ? `${n} (sem limite)` : `${n} de ${lim}`);
const dataDoDia = s => dataBR(`${s}T12:00:00Z`);

/** Uma empresa por dentro: dados, assinatura, uso, usuários e chamados, com as ações da equipe (auditadas). */
export default function DetalheCliente({ api, equipe }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [c, setC] = useState(null);
  const [modal, setModal] = useState(null); // plano | teste | suspender | cancelar | entrar
  const [form, setForm] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [notas, setNotas] = useState("");
  const podeEditar = temPermissao(equipe, "clientes_editar");

  const carregar = useCallback(() => api.get(`/painel/clientes/${id}`).then(r => { setC(r); setNotas(r.notasInternas || ""); }).catch(e => avisarErro(e.message)), [api, id]);
  useEffect(() => { setC(null); carregar(); }, [id]); // eslint-disable-line

  const abrir = (qual, inicial = {}) => { setForm(inicial); setModal(qual); };
  const fechar = () => { setModal(null); setSalvando(false); };
  // Sem pop-up de sucesso: a tela já mostra a mudança (situação, teste, plano)
  const enviar = async (caminho, corpo) => {
    setSalvando(true);
    try {
      const r = await api.post(`/painel/clientes/${id}/${caminho}`, corpo);
      fechar(); await carregar();
      if (r?.avisoCobranca) avisarErro(r.avisoCobranca, "A conta foi ativada, mas a cobrança não foi criada");
    } catch (e) { setSalvando(false); avisarErro(e.message); }
  };
  const salvarAssinatura = async () => {
    setSalvando(true);
    try { await api.put(`/painel/clientes/${id}/assinatura`, { valor: form.valor, diaVencimento: Number(form.dia), cortesia: !!form.cortesia }); fechar(); await carregar(); }
    catch (e) { setSalvando(false); avisarErro(e.message); }
  };
  const criarCobranca = async () => {
    setSalvando(true);
    try { await api.post("/painel/financeiro/cobrancas", { tenantId: id, referencia: form.referencia, valor: form.valor, vencimento: form.vencimento || undefined }); fechar(); await carregar(); }
    catch (e) { setSalvando(false); avisarErro(e.message); }
  };

  if (!c) return <span style={{ color: "var(--text-secondary)" }}>Carregando…</span>;
  const sit = SITUACOES[c.situacao];
  const podeEstenderTeste = podeEditar && c.status === "trial";
  const podeSuspender = podeEditar && !c.interna && !["suspenso", "cancelado"].includes(c.status);
  const podeCancelar = podeEditar && !c.interna && c.status !== "cancelado";
  const podeAtivar = podeEditar && !c.interna && c.status !== "ativo";
  const verFinanceiro = c.assinatura !== null && c.assinatura !== undefined; // a API só devolve a assinatura a quem tem a permissão Financeiro
  const podeInadimplente = podeEditar && !c.interna && c.status === "ativo";
  const podeEntrar = temPermissao(equipe, "clientes");

  const salvarNotas = async () => {
    try { await api.patch(`/painel/clientes/${id}/notas`, { notas }); await carregar(); } catch (e) { avisarErro(e.message); }
  };
  const abrirAtivar = () => {
    const v = c.assinatura?.valorLista ?? 0;
    const venc = somarDias(today(), 5);
    abrir("ativar", { valor: c.assinatura?.valor ?? v, dia: String(Math.min(28, Number(venc.slice(8)))), cortesia: false, gerar: true, referencia: venc.slice(0, 7), vencimento: venc });
  };
  const ativar = async () => {
    if (c.status === "trial" && verFinanceiro) return abrirAtivar();
    if (!(await confirmar({ titulo: "Ativar a conta", mensagem: `Liberar o acesso de ${c.razaoSocial} como cliente ativo (assinatura em dia)? O cliente volta a usar na hora.`, confirmarRotulo: "Ativar" }))) return;
    await enviar("status", { status: "ativo" });
  };

  // Plano novo menor que o uso atual: avisa (não bloqueia; só impede novos cadastros)
  const planoNovo = PLANOS[form.plano];
  const excedeObras = planoNovo && Number.isFinite(planoNovo.obras) && c.uso.obras > planoNovo.obras;
  const excedeUsuarios = planoNovo && Number.isFinite(planoNovo.usuarios) && c.uso.usuarios > planoNovo.usuarios;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
        <Button variant="secondary" size="sm" iconLeft="chevron-left" onClick={() => navigate("/clientes")}>Voltar</Button>
        <span style={{ font: "var(--type-card-title)" }}>{c.razaoSocial}</span>
        <Badge tone={sit.tom}>{sit.rotulo}</Badge>
        <Tag tone="neutral">{c.planoNome}{c.ciclo === "anual" ? " · anual" : ""}</Tag>
        {c.interna && <Tag tone="dark">Conta interna</Tag>}
      </div>

      {c.bloqueada && <Banner tone="danger" title="Esta conta está bloqueada">O cliente entra, mas só alcança a assinatura e o suporte. {c.status === "trial" ? "O teste acabou." : c.motivoStatus ? `Motivo registrado: ${c.motivoStatus}` : ""}</Banner>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-lg),1fr))", gap: "var(--space-5)", alignItems: "start" }}>
        <Card title="Assinatura">
          <Linha rotulo="Situação"><Badge size="sm" tone={sit.tom}>{sit.rotulo}</Badge></Linha>
          <Linha rotulo="Plano">{c.planoNome}</Linha>
          <Linha rotulo="Ciclo">{c.ciclo === "anual" ? "Anual" : "Mensal"}</Linha>
          {verFinanceiro && !c.interna && (
            <>
              <Linha rotulo="Valor">{c.assinatura.valor == null ? <span style={{ color: "var(--status-warning-text)" }}>Não configurado (lista: {fmt(c.assinatura.valorLista)})</span> : <>{fmt(c.assinatura.valor)} por {c.ciclo === "anual" ? "ano" : "mês"}{c.assinatura.cortesia && <> <Badge size="sm" tone="neutral">Cortesia</Badge></>}</>}</Linha>
              {c.assinatura.valor != null && <Linha rotulo="Vencimento">Todo dia {c.assinatura.diaVencimento}</Linha>}
              {c.assinatura.ativadaEm && <Linha rotulo="Ativada em">{dataBR(c.assinatura.ativadaEm)}</Linha>}
            </>
          )}
          {c.status === "trial" && c.trialAte && <Linha rotulo="Teste até">{dataDoDia(c.trialAte)}{textoTeste(c) ? ` · ${textoTeste(c)}` : ""}</Linha>}
          {c.motivoStatus && ["suspenso", "cancelado"].includes(c.status) && <Linha rotulo="Motivo">{c.motivoStatus}</Linha>}
          <Linha rotulo="Obras">{limiteTexto(c.uso.obras, c.uso.obrasLimite)}</Linha>
          <Linha rotulo="Usuários">{limiteTexto(c.uso.usuarios, c.uso.usuariosLimite)}</Linha>
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
            {podeEditar && <Button size="sm" variant="secondary" iconLeft="refresh-cw" onClick={() => abrir("plano", { plano: c.plano, ciclo: c.ciclo })}>Alterar plano</Button>}
            {podeEstenderTeste && <Button size="sm" variant="secondary" iconLeft="clock" onClick={() => abrir("teste", { dias: "7", motivo: "" })}>Estender teste</Button>}
            {podeAtivar && <Button size="sm" iconLeft="check" onClick={ativar}>{c.status === "trial" ? "Ativar assinatura" : "Reativar conta"}</Button>}
            {verFinanceiro && !c.interna && <Button size="sm" variant="secondary" iconLeft="wallet" onClick={() => abrir("assinatura", { valor: c.assinatura.valor ?? c.assinatura.valorLista, dia: String(c.assinatura.diaVencimento ?? 10), cortesia: !!c.assinatura.cortesia })}>Configurar assinatura</Button>}
            {podeInadimplente && <Button size="sm" variant="secondary" onClick={() => abrir("inadimplente", { motivo: "" })}>Marcar inadimplente</Button>}
            {podeSuspender && <Button size="sm" variant="secondary" iconLeft="triangle-alert" onClick={() => abrir("suspender", { motivo: "" })}>Suspender</Button>}
            {podeCancelar && <Button size="sm" variant="secondary" onClick={() => abrir("cancelar", { motivo: "" })}>Cancelar conta</Button>}
          </div>
          {c.interna && <span style={{ fontSize: "var(--fs-p6)", color: "var(--text-secondary)" }}>Conta da casa (vídeos e testes): nunca é suspensa nem cancelada.</span>}
        </Card>

        <Card title="Empresa">
          <Linha rotulo="CNPJ">{c.cnpj}</Linha>
          <Linha rotulo="E-mail">{c.email}</Linha>
          <Linha rotulo="Telefone">{c.telefone ? formatarTelefoneBR(c.telefone.replace(/^55/, "")) : "Não informado"}</Linha>
          <Linha rotulo="Cadastro">{dataHoraBR(c.createdAt)}</Linha>
          <Linha rotulo="Último acesso">{c.ultimoAcessoEm ? `${dataHoraBR(c.ultimoAcessoEm)} (${haQuanto(c.ultimoAcessoEm)})` : "Nunca"}</Linha>
          <Linha rotulo="Mensagens e notificações">{c.aceite.em ? <Badge size="sm" tone="success">Aceitou em {dataBR(c.aceite.em)}</Badge> : <Badge size="sm" tone="warning">Sem aceite (conta antiga)</Badge>}</Linha>
          {c.aceite.em && <span style={{ fontSize: "var(--fs-p6)", color: "var(--text-secondary)", overflowWrap: "anywhere" }}>{c.aceite.texto}{c.aceite.ip ? ` · IP ${c.aceite.ip}` : ""}</span>}
        </Card>

        <Card title="Notas internas">
          <Textarea aria-label="Notas internas" rows={5} maxLength={4000} value={notas} readOnly={!podeEditar} placeholder="Só a equipe vê. O cliente nunca."
            onChange={e => setNotas(e.target.value)} />
          {podeEditar && <div><Button size="sm" variant="secondary" disabled={notas === (c.notasInternas || "")} onClick={salvarNotas}>Salvar notas</Button></div>}
        </Card>
      </div>

      <Card title={`Usuários (${c.usuariosLista.length})`} padding="var(--space-4)">
        <DataTable dense minWidth={560} rows={c.usuariosLista} rowKey={u => u.id} empty="Nenhum usuário." columns={[
          { key: "n", label: "Nome", render: u => <b>{u.nome}</b> },
          { key: "e", label: "E-mail", render: u => u.email },
          { key: "r", label: "Perfil", render: u => (u.role === "tenant_admin" ? "Administrador" : "Usuário") },
          { key: "a", label: "Situação", render: u => <Badge size="sm" tone={u.ativo ? "success" : "neutral"}>{u.ativo ? "Ativo" : "Inativo"}</Badge> },
        ]} />
      </Card>

      {c.cobrancas && (
        <Card title={`Cobranças · ${c.cobrancas.length}`} padding="var(--space-4)"
          action={!c.interna && !c.assinatura?.cortesia && <Button size="sm" iconLeft="plus" onClick={() => abrir("cobranca", { referencia: today().slice(0, 7), valor: c.assinatura?.valor ?? c.assinatura?.valorLista ?? "", vencimento: "" })}>Nova cobrança</Button>}>
          <TabelaCobrancas api={api} itens={c.cobrancas} aoMudar={carregar} podeEditar statusEmpresa={c.status} vazio="Nenhuma cobrança desta empresa." />
        </Card>
      )}

      <Card title={`Chamados${c.chamadosAbertos ? ` · ${c.chamadosAbertos} em aberto` : ""}`} padding="var(--space-4)"
        action={podeEntrar && <Button size="sm" iconLeft="eye" onClick={() => abrir("entrar", { chamadoId: c.chamados[0]?.id ? String(c.chamados[0].id) : "" })}>Entrar como o cliente</Button>}>
        <DataTable dense minWidth={640} rows={c.chamados} rowKey={t => t.id} onRowClick={t => navigate(`/chamados/${t.id}`)} empty="Nenhum chamado desta empresa." columns={[
          { key: "n", label: "Nº", width: "var(--space-16)", render: t => <b>#{t.id}</b> },
          { key: "a", label: "Assunto", render: t => <span style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>{t.assunto}{t.canal === "chat" && <Tag tone="dark">Chat</Tag>}</span> },
          { key: "s", label: "Setor", render: t => t.setorRotulo },
          { key: "st", label: "Situação", render: t => <Badge size="sm" tone={tomDoStatus(t.status)}>{rotuloStatus(t.status)}</Badge> },
          { key: "d", label: "Aberto em", render: t => dataBR(t.createdAt) },
        ]} />
      </Card>

      {modal === "plano" && (
        <Modal title="Alterar plano" onClose={fechar}
          footer={<><Button variant="secondary" onClick={fechar}>Cancelar</Button><Button loading={salvando} onClick={() => enviar("plano", { plano: form.plano, ciclo: form.ciclo })}>Salvar</Button></>}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <Select label="Plano" value={form.plano} onChange={e => setForm(f => ({ ...f, plano: e.target.value }))}>
              {Object.entries(PLANOS).map(([pid, p]) => <option key={pid} value={pid}>{p.label} · R$ {p.preco.mensal}/mês</option>)}
            </Select>
            <Select label="Ciclo" value={form.ciclo} onChange={e => setForm(f => ({ ...f, ciclo: e.target.value }))}>
              <option value="mensal">Mensal</option><option value="anual">Anual</option>
            </Select>
            {(excedeObras || excedeUsuarios) && (
              <Banner tone="warning" title="A empresa já usa mais do que este plano permite">
                {excedeObras ? `Tem ${c.uso.obras} obras e o plano permite ${planoNovo.obras}. ` : ""}{excedeUsuarios ? `Tem ${c.uso.usuarios} usuários e o plano permite ${planoNovo.usuarios}. ` : ""}
                Nada é apagado: ela só não consegue cadastrar mais até se ajustar.
              </Banner>
            )}
          </div>
        </Modal>
      )}

      {modal === "teste" && (
        <Modal title="Estender o teste" onClose={fechar}
          footer={<><Button variant="secondary" onClick={fechar}>Cancelar</Button><Button loading={salvando} onClick={() => enviar("estender-teste", { dias: Number(form.dias), motivo: form.motivo })}>Estender</Button></>}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <Banner tone="info">{c.trialAte && c.trialAte >= today() ? `O teste vai até ${dataDoDia(c.trialAte)}; os dias novos são somados a essa data.` : "O teste já acabou: os dias novos contam a partir de hoje e o cliente volta a acessar na hora."}</Banner>
            <Select label="Quantos dias" value={form.dias} onChange={e => setForm(f => ({ ...f, dias: e.target.value }))}>
              {[3, 7, 14, 30].map(d => <option key={d} value={d}>{d} dias</option>)}
              {MAX_DIAS_EXTENSAO > 30 && <option value={MAX_DIAS_EXTENSAO}>{MAX_DIAS_EXTENSAO} dias</option>}
            </Select>
            <Input label="Motivo (opcional)" maxLength={200} placeholder="Ex.: pediu mais tempo para testar com a equipe" value={form.motivo} onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))} />
          </div>
        </Modal>
      )}

      {(modal === "suspender" || modal === "cancelar" || modal === "inadimplente") && (
        <Modal title={{ suspender: "Suspender a conta", cancelar: "Cancelar a conta", inadimplente: "Marcar como inadimplente" }[modal]} onClose={fechar}
          footer={<><Button variant="secondary" onClick={fechar}>Voltar</Button>
            <Button loading={salvando} disabled={form.motivo.trim().length < 3} onClick={() => enviar("status", { status: { suspender: "suspenso", cancelar: "cancelado", inadimplente: "inadimplente" }[modal], motivo: form.motivo })}>{{ suspender: "Suspender", cancelar: "Cancelar conta", inadimplente: "Marcar inadimplente" }[modal]}</Button></>}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            {modal === "inadimplente"
              ? <Banner tone="info" title="O cliente continua usando">Inadimplente não bloqueia o acesso: marca a situação para a equipe acompanhar. Quando a cobrança vencida for paga, a empresa volta a ativa sozinha. Para bloquear, suspenda.</Banner>
              : <Banner tone="warning" title="O cliente perde o acesso na hora">Ele ainda entra e vê a tela de assinatura, mas só consegue falar com o suporte. Os dados ficam guardados e você reativa quando quiser.</Banner>}
            <Textarea label="Motivo" required rows={3} maxLength={300} helper="Fica na auditoria e nas notas da empresa. O cliente não vê o motivo." value={form.motivo} onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))} />
          </div>
        </Modal>
      )}

      {modal === "ativar" && (
        <Modal title="Ativar assinatura" onClose={fechar} wide
          footer={<><Button variant="secondary" onClick={fechar}>Cancelar</Button>
            <Button iconLeft="check" loading={salvando} onClick={() => enviar("status", { status: "ativo", assinatura: { valor: form.valor, diaVencimento: Number(form.dia), cortesia: !!form.cortesia, primeiraCobranca: form.gerar && !form.cortesia ? { referencia: form.referencia, vencimento: form.vencimento } : undefined } })}>Ativar</Button></>}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <Banner tone="info">A empresa passa a cliente ativa e volta a usar na hora. Plano {c.planoNome}, ciclo {c.ciclo === "anual" ? "anual" : "mensal"}. Preço de lista: {fmt(c.assinatura.valorLista)} por {c.ciclo === "anual" ? "ano" : "mês"}.</Banner>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-md),1fr))", gap: "var(--space-4)" }}>
              <MoneyInput label={`Valor por ${c.ciclo === "anual" ? "ano" : "mês"}`} value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} helper="Mude só se combinou outro preço." />
              <Input label="Dia do vencimento" type="number" min={1} max={28} value={form.dia} onChange={e => setForm(f => ({ ...f, dia: e.target.value }))} helper="De 1 a 28, todo mês." />
            </div>
            <Checkbox checked={!!form.cortesia} onChange={v => setForm(f => ({ ...f, cortesia: v }))} label="Cortesia (não cobra e não entra na receita)" />
            {!form.cortesia && <Checkbox checked={!!form.gerar} onChange={v => setForm(f => ({ ...f, gerar: v }))} label="Gerar a primeira cobrança agora" />}
            {!form.cortesia && form.gerar && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-md),1fr))", gap: "var(--space-4)" }}>
                <Input label="Mês da cobrança" type="month" value={form.referencia} onChange={e => setForm(f => ({ ...f, referencia: e.target.value }))} />
                <Input label="Vencimento" type="date" value={form.vencimento} onChange={e => setForm(f => ({ ...f, vencimento: e.target.value }))} />
              </div>
            )}
          </div>
        </Modal>
      )}

      {modal === "assinatura" && (
        <Modal title="Configurar assinatura" onClose={fechar}
          footer={<><Button variant="secondary" onClick={fechar}>Cancelar</Button><Button loading={salvando} onClick={salvarAssinatura}>Salvar</Button></>}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <Banner tone="info">Só entra na receita recorrente e nas cobranças do mês a assinatura configurada e ativa. Preço de lista: {fmt(c.assinatura.valorLista)} por {c.ciclo === "anual" ? "ano" : "mês"}.</Banner>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-md),1fr))", gap: "var(--space-4)" }}>
              <MoneyInput label={`Valor por ${c.ciclo === "anual" ? "ano" : "mês"}`} value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} />
              <Input label="Dia do vencimento" type="number" min={1} max={28} value={form.dia} onChange={e => setForm(f => ({ ...f, dia: e.target.value }))} helper="De 1 a 28, todo mês." />
            </div>
            <Checkbox checked={!!form.cortesia} onChange={v => setForm(f => ({ ...f, cortesia: v }))} label="Cortesia (não cobra e não entra na receita)" />
          </div>
        </Modal>
      )}

      {modal === "cobranca" && (
        <Modal title="Nova cobrança" onClose={fechar}
          footer={<><Button variant="secondary" onClick={fechar}>Cancelar</Button><Button loading={salvando} iconLeft="plus" onClick={criarCobranca}>Criar</Button></>}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <Banner tone="info">Uma cobrança por mês (a anual cobre doze). O mês já coberto por outra cobrança é recusado.</Banner>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-md),1fr))", gap: "var(--space-4)" }}>
              <Input label="Mês da cobrança" type="month" value={form.referencia} onChange={e => setForm(f => ({ ...f, referencia: e.target.value }))} />
              <MoneyInput label="Valor" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} />
              <Input label="Vencimento" type="date" value={form.vencimento} onChange={e => setForm(f => ({ ...f, vencimento: e.target.value }))} helper="Em branco: o dia combinado da assinatura." />
            </div>
          </div>
        </Modal>
      )}

      {modal === "entrar" && (
        <Modal title="Entrar como o cliente" onClose={fechar}
          footer={<><Button variant="secondary" onClick={fechar}>Cancelar</Button>
            <Button iconLeft="eye" loading={salvando} disabled={!form.chamadoId} onClick={async () => { setSalvando(true); const ok = await entrarComoCliente(api, id, Number(form.chamadoId)); if (ok) fechar(); else setSalvando(false); }}>Entrar em modo leitura</Button></>}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <Banner tone="info" title="Só leitura, por causa de um chamado">
              Você vê o sistema como esta empresa vê, por {DURACAO_LEITURA_MIN} minutos, numa aba nova. Não dá para alterar nada. O cliente é avisado na conversa do chamado e a entrada fica na auditoria.
            </Banner>
            {c.chamados.length === 0
              ? <Banner tone="warning">Esta empresa ainda não tem chamados. Peça ao cliente para abrir um chamado (ou atenda o chat) antes de entrar na conta.</Banner>
              : (
                <Select label="Chamado" required value={form.chamadoId} onChange={e => setForm(f => ({ ...f, chamadoId: e.target.value }))}>
                  {c.chamados.map(t => <option key={t.id} value={t.id}>#{t.id} · {t.assunto}</option>)}
                </Select>
              )}
          </div>
        </Modal>
      )}
    </div>
  );
}
