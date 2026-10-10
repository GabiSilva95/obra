import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Badge, Banner, Button, Card, Checkbox, DataTable, Input, SegmentedTabs, Tag, useIsMobile } from "../../../design-system";
import { ACEITE_MENSAGENS, SITUACOES } from "../../../server/config/conta.js";
import { SITUACOES_COBRANCA } from "../../../server/config/cobranca.js";
import { formatarTelefoneBR } from "../../../server/utils/telefone.js";
import { PLANOS, planoPorId } from "../../constants/data";
import { avisarErro } from "../../utils/aviso";
import { fmt } from "../../utils/helpers";
import { useIntervalo } from "../../utils/useIntervalo";
import { dataDoDia } from "../../utils/tempo";

const Linha = ({ rotulo, children }) => (
  <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-3)", fontSize: "var(--fs-p5-5)" }}>
    <span style={{ color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{rotulo}</span><span style={{ fontWeight: "var(--fw-semibold)", textAlign: "right", overflowWrap: "anywhere" }}>{children}</span>
  </div>
);

/** O pedido que abre o chamado já preenchido (setor Assinatura e cobrança): o caminho de assinar e mudar de plano enquanto o pagamento é combinado com a equipe. */
export function pedidoDePlano(plano, ciclo, assinando) {
  const valor = ciclo === "anual" ? plano.preco.anual : plano.preco.mensal;
  const cicloTxt = ciclo === "anual" ? "anual" : "mensal";
  return {
    setor: "assinatura",
    assunto: `${assinando ? "Quero assinar" : "Quero mudar para"} o plano ${plano.nome} (${cicloTxt})`,
    texto: `Gostaria de ${assinando ? "assinar" : "mudar para"} o plano ${plano.nome}, ciclo ${cicloTxt}, a R$ ${valor} por mês${ciclo === "anual" ? " (cobrado uma vez por ano)" : ""}. Como seguimos?`,
  };
}

/**
 * A assinatura da empresa: o plano e o que paga, a escolha de plano, as faturas e o contato (telefone e aceite de mensagens).
 * Só o administrador vê. Enquanto não há pagamento automático, assinar e mudar de plano abre um chamado já preenchido e a equipe combina e ativa.
 * Também aparece na tela de conta bloqueada (`bloqueada`), onde é por aqui que a pessoa vê o que houve e pede para voltar.
 */
export default function Assinatura({ api, tenant, onPedido, atualizarTenant, bloqueada = false }) {
  const mobile = useIsMobile();
  const [r, setR] = useState(null);
  const [semAcesso, setSemAcesso] = useState(false);
  const [ciclo, setCiclo] = useState(tenant.ciclo === "anual" ? "anual" : "mensal");
  const [tel, setTel] = useState(formatarTelefoneBR((tenant.telefone || "").replace(/^55/, "")));
  const [aceite, setAceite] = useState(!!tenant.aceitouMensagens);
  const [salvando, setSalvando] = useState(false);
  const [abrindo, setAbrindo] = useState(false);
  // Voltando do pagamento hospedado: "ok" (confirma a assinatura acompanhando a conta) ou "cancelado" (nada foi cobrado)
  const { search, pathname } = useLocation();
  const navigate = useNavigate();
  const [retorno, setRetorno] = useState(() => new URLSearchParams(search).get("checkout"));
  const [confirmando, setConfirmando] = useState(retorno === "ok");
  const tentativas = useRef(0);
  useEffect(() => { if (retorno) navigate(pathname, { replace: true }); }, []); // eslint-disable-line

  useEffect(() => {
    api.get("/assinatura/resumo").then(setR).catch(e => { if (e.status === 403) setSemAcesso(true); else avisarErro(e.message); });
  }, []); // eslint-disable-line

  const plano = planoPorId(tenant.plano) || PLANOS[0];
  const situacao = tenant.situacao || "ativo";
  const assinando = ["trial", "trial_expirado"].includes(situacao);
  const faturas = r?.faturas ?? [];
  const emAtraso = r?.emAtraso ?? 0;

  // O pagamento confirma por aviso do Stripe, alguns segundos depois da volta: acompanha a conta até ficar ativa (no máximo ~2 min)
  useIntervalo(async () => {
    tentativas.current += 1;
    try {
      const nova = await api.get("/assinatura");
      if (nova.situacao === "ativo") { setConfirmando(false); setRetorno("confirmado"); atualizarTenant?.(nova); api.get("/assinatura/resumo").then(setR).catch(() => {}); }
    } catch { /* tenta de novo no próximo ciclo */ }
    if (tentativas.current >= 40) setConfirmando(false);
  }, 3000, { ativo: confirmando });

  const escolher = async (p, assinandoAgora) => {
    if (!r?.pagamento?.online) return onPedido(pedidoDePlano(p, ciclo, assinandoAgora));
    setAbrindo(true);
    try { window.location.assign((await api.post("/assinatura/checkout", { plano: p.id, ciclo })).url); }
    catch (e) { avisarErro(e.message); setAbrindo(false); }
  };
  const gerenciarPagamento = async () => {
    setAbrindo(true);
    try { window.location.assign((await api.post("/assinatura/portal")).url); }
    catch (e) { avisarErro(e.message); setAbrindo(false); }
  };

  const salvarContato = async () => {
    setSalvando(true);
    try {
      const nova = await api.patch("/assinatura/contato", { telefone: tel, aceiteMensagens: aceite && !tenant.aceitouMensagens ? true : undefined });
      atualizarTenant?.(nova);
      setAceite(!!nova.aceitouMensagens);
    } catch (e) { avisarErro(e.message); }
    setSalvando(false);
  };
  const contatoMudou = useMemo(() => tel.replace(/\D/g, "") !== (tenant.telefone || "").replace(/^55/, "").replace(/\D/g, "") || (aceite && !tenant.aceitouMensagens), [tel, aceite, tenant]);

  if (semAcesso) return <Banner tone="info">Só o administrador da empresa vê a assinatura e as faturas.</Banner>;

  const aviso = bloqueada ? null : (() => { // na tela de conta bloqueada o aviso já está no topo
    if (situacao === "trial") {
      const d = tenant.diasRestantes;
      return { tone: d <= 3 ? "warning" : "info", titulo: d > 1 ? `Faltam ${d} dias do seu teste grátis` : d === 1 ? "Falta 1 dia do seu teste grátis" : "Hoje é o último dia do seu teste grátis", texto: "Para continuar usando depois do teste, escolha um plano abaixo. Os seus dados ficam guardados." };
    }
    if (situacao === "trial_expirado") return { tone: "warning", titulo: "O seu teste grátis terminou", texto: "Escolha um plano para voltar a usar. Os seus dados estão guardados." };
    if (situacao === "suspenso") return { tone: "danger", titulo: "A sua conta está suspensa", texto: "Fale com a nossa equipe para regularizar. Os seus dados estão guardados." };
    if (situacao === "cancelado") return { tone: "danger", titulo: "A sua conta foi cancelada", texto: "Se quiser voltar, fale com a nossa equipe pelo suporte." };
    if (situacao === "inadimplente" || emAtraso > 0) return { tone: "warning", titulo: emAtraso > 1 ? `Você tem ${emAtraso} faturas em atraso` : "Você tem uma fatura em atraso", texto: "Regularize o pagamento para evitar a suspensão da conta. Se já pagou, fale com a nossa equipe pelo suporte." };
    return null;
  })();

  const valorAtual = r?.assinatura ? r.assinatura.valor : r?.plano?.valorLista;
  const cobradoPorAno = (r?.plano?.ciclo ?? tenant.ciclo) === "anual";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      {!bloqueada && <p style={{ color: "var(--text-secondary)" }}>O seu plano, as faturas e os dados de contato da empresa.</p>}
      {retorno === "ok" && confirmando && <Banner tone="info" title="Confirmando o seu pagamento">Em instantes a sua conta é liberada. Pode ficar nesta tela: ela atualiza sozinha.</Banner>}
      {retorno === "ok" && !confirmando && <Banner tone="warning" title="Ainda não recebemos a confirmação">O pagamento pode levar alguns minutos para aparecer. Se a conta não for liberada logo, abra um chamado no Suporte e a equipe confere.</Banner>}
      {retorno === "confirmado" && <Banner tone="success" title="Assinatura ativa">Pagamento confirmado. Obrigado! A sua conta está liberada.</Banner>}
      {retorno === "cancelado" && <Banner tone="info" title="Pagamento cancelado">Nada foi cobrado. Quando quiser, escolha um plano abaixo.</Banner>}
      {aviso && retorno !== "confirmado" && <Banner tone={aviso.tone} title={aviso.titulo}>{aviso.texto}</Banner>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-lg),1fr))", gap: "var(--space-5)", alignItems: "start" }}>
        <Card title="Seu plano" action={<Badge size="sm" tone={SITUACOES[situacao]?.tom || "neutral"}>{SITUACOES[situacao]?.rotulo || situacao}</Badge>}>
          <Linha rotulo="Plano">{plano.nome}</Linha>
          <Linha rotulo="Cobrança">{cobradoPorAno ? "Anual" : "Mensal"}</Linha>
          {r?.cortesia
            ? <Linha rotulo="Valor">Cortesia</Linha>
            : valorAtual != null && !assinando && <Linha rotulo="Valor">{fmt(valorAtual)} por {cobradoPorAno ? "ano" : "mês"}</Linha>}
          {r?.assinatura && !assinando && <Linha rotulo="Vencimento">Todo dia {r.assinatura.diaVencimento}</Linha>}
          <Linha rotulo="Obras">{r?.plano?.obras == null && r ? "Sem limite" : `Até ${r?.plano?.obras ?? plano.obras}`}</Linha>
          <Linha rotulo="Usuários">{r?.plano?.usuarios == null && r ? "Sem limite" : `Até ${r?.plano?.usuarios ?? plano.usuarios}`}</Linha>
          {assinando && tenant.trialAte && situacao === "trial" && <Linha rotulo="Teste até">{dataDoDia(tenant.trialAte)}</Linha>}
          {r?.pagamento?.cartao && <div><Button size="sm" variant="secondary" iconLeft="settings" loading={abrindo} onClick={gerenciarPagamento}>Gerenciar pagamento</Button></div>}
        </Card>

        <Card title="Contato da empresa">
          <Input label="Telefone com DDD" type="tel" icon="phone" autoComplete="tel-national" inputMode="tel" placeholder="(11) 99999-0000"
            helper="Para a equipe falar com você sobre a conta, os chamados e a assinatura." value={tel} onChange={e => setTel(formatarTelefoneBR(e.target.value))} />
          {tenant.aceitouMensagens
            ? <Tag tone="success">Você aceita receber mensagens e notificações do ConstruktPro</Tag>
            : <Checkbox checked={aceite} onChange={setAceite} label={ACEITE_MENSAGENS.texto} />}
          <div><Button size="sm" variant="secondary" loading={salvando} disabled={!contatoMudou} onClick={salvarContato}>Salvar contato</Button></div>
        </Card>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, font: "var(--type-card-title)" }}>{assinando ? "Escolha o seu plano" : "Mudar de plano"}</h2>
          <SegmentedTabs variant="light" value={ciclo} onChange={setCiclo} tabs={[{ value: "mensal", label: "Mensal" }, { value: "anual", label: "Anual (economize)" }]} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(3,minmax(0,1fr))", gap: "var(--space-4)" }}>
          {PLANOS.map(p => {
            const atual = p.id === plano.id && (ciclo === (cobradoPorAno ? "anual" : "mensal"));
            const doPlano = p.id === plano.id;
            return (
              <Card key={p.id} selected={doPlano && !assinando} title={p.nome} action={doPlano && !assinando ? <Badge size="sm" tone="accent">Atual</Badge> : p.popular ? <Badge size="sm" tone="neutral">Popular</Badge> : null}>
                <div><span style={{ font: "var(--type-stat)", fontSize: "var(--fs-h4)" }}>R$ {ciclo === "anual" ? p.preco.anual : p.preco.mensal}</span><span style={{ color: "var(--text-secondary)" }}> por mês</span></div>
                {ciclo === "anual" && <span style={{ fontSize: "var(--fs-p6)", color: "var(--text-secondary)" }}>Cobrado uma vez por ano: R$ {p.preco.anual * 12}</span>}
                <div style={{ color: "var(--text-secondary)", fontSize: "var(--fs-p5-5)" }}>
                  <div>{p.usuarios === 999 ? "Usuários ilimitados" : `Até ${p.usuarios} usuários`}</div>
                  <div>{p.obras === 999 ? "Obras ilimitadas" : `Até ${p.obras} obras`}</div>
                </div>
                <Button fullWidth variant={doPlano && assinando ? "primary" : "secondary"} disabled={(atual && !assinando) || abrindo} onClick={() => escolher(p, assinando)}>
                  {atual && !assinando ? "Plano atual" : assinando ? `Assinar ${p.nome}` : `Mudar para ${p.nome}`}
                </Button>
              </Card>
            );
          })}
        </div>
        <span style={{ fontSize: "var(--fs-p5-5)", color: "var(--text-secondary)" }}>
          {r?.pagamento?.online && assinando
            ? "O pagamento é no cartão, em uma página segura do Stripe, e se renova sozinho todo mês ou ano. Assim que for confirmado, a sua conta é liberada. Você pode cancelar quando quiser."
            : r?.pagamento?.online
              ? "Para mudar de plano, escolha o novo plano: abrimos um chamado já preenchido e a equipe faz a troca, com cobrança proporcional."
              : "A assinatura é combinada com a nossa equipe: ao escolher, abrimos um chamado já preenchido e você acompanha a resposta pelo sino. Assim que o pagamento for confirmado, a sua conta é liberada."}
        </span>
      </div>

      <Card title="Faturas" padding="var(--space-4)">
        {!r ? <span style={{ color: "var(--text-secondary)" }}>Carregando…</span> : (
          <DataTable dense minWidth={620} rows={faturas} rowKey={f => f.id} empty="Você ainda não tem faturas. Elas aparecem aqui assim que a assinatura começar." columns={[
            { key: "d", label: "Fatura", render: f => <span style={{ display: "flex", flexDirection: "column" }}><b>{f.referencia}</b><span style={{ fontSize: "var(--fs-p6)", color: "var(--text-secondary)" }}>{f.descricao}</span></span> },
            { key: "v", label: "Vencimento", render: f => dataDoDia(f.vencimento) },
            { key: "$", label: "Valor", align: "right", render: f => fmt(f.valor) },
            { key: "s", label: "Situação", render: f => (
              <span style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)", alignItems: "flex-start" }}>
                <Badge size="sm" tone={SITUACOES_COBRANCA[f.situacao].tom}>{SITUACOES_COBRANCA[f.situacao].rotulo}</Badge>
                {f.pagaEm && <span style={{ fontSize: "var(--fs-p6)", color: "var(--text-secondary)" }}>pago em {dataDoDia(f.pagaEm)}</span>}
              </span>
            ) },
            { key: "l", label: "", render: f => f.linkPagamento && <a href={f.linkPagamento} target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-accent)", fontWeight: "var(--fw-semibold)" }}>Pagar</a> },
          ]} />
        )}
      </Card>
    </div>
  );
}
