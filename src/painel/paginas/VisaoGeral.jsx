import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Banner, BarChart, Button, Card, DataTable, SegmentedTabs, StatCard } from "../../../design-system";
import { PLANOS } from "../../../server/config/planos.js";
import { formatarTelefoneBR } from "../../../server/utils/telefone.js";
import { avisarErro } from "../../utils/aviso";
import { fmt } from "../../utils/helpers";
import { useIntervalo } from "../../utils/useIntervalo";
import { fmtCompacto, maxDoGrafico } from "../../pages/Dashboard/indicadores";
import { duracao, duracaoMin, haQuanto } from "../util";

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const GRADE = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-sm),1fr))", gap: "var(--space-4)" };
const GRADE_LISTAS = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-lg),1fr))", gap: "var(--space-5)", alignItems: "start" };
/** Teto do eixo de uma contagem: múltiplo de 4 (4 divisões), para os números do eixo serem inteiros e diferentes (0, 1, 2, 3, 4). */
const eixoDeContagem = valores => Math.max(4, Math.ceil(Math.max(0, ...valores) / 4) * 4);
const tel = t => (t ? formatarTelefoneBR(t.replace(/^55/, "")) : "Sem telefone");

/** Uma área da visão geral: título, o que mostra e o atalho para a tela completa. */
const Secao = ({ titulo, apoio, para, rotulo, children }) => (
  <section style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
        <h2 style={{ margin: 0, font: "var(--type-card-title)" }}>{titulo}</h2>
        {apoio && <span style={{ fontSize: "var(--fs-p5-5)", color: "var(--text-secondary)" }}>{apoio}</span>}
      </div>
      {para && <Button size="sm" variant="secondary" iconRight="chevron-right" onClick={para}>{rotulo}</Button>}
    </div>
    {children}
  </section>
);

/** Lista curta de empresas que pedem um contato; clicar abre a empresa. */
function ListaEmpresas({ titulo, vazio, itens, colunas, abrir }) {
  return (
    <Card title={`${titulo}${itens.length ? ` · ${itens.length}` : ""}`} padding="var(--space-4)">
      <DataTable dense minWidth={320} rows={itens} rowKey={e => e.id} onRowClick={e => abrir(e.id)} empty={vazio} columns={[
        { key: "n", label: "Empresa", render: e => <b>{e.nome}</b> },
        ...colunas,
      ]} />
    </Card>
  );
}

/**
 * Visão geral: o que a equipe precisa saber de relance, por área (atendimento, clientes e financeiro).
 * Cada pessoa vê só as áreas a que tem acesso (o servidor já devolve as outras vazias). Atualiza sozinha a cada minuto.
 */
export default function VisaoGeral({ api }) {
  const navigate = useNavigate();
  const [dias, setDias] = useState(30);
  const [r, setR] = useState(null);
  const ultima = useRef(0);

  const carregar = useCallback(() => {
    const minha = ++ultima.current; // só vale a resposta da consulta mais recente
    return api.get(`/painel/visao-geral?dias=${dias}`).then(res => { if (minha === ultima.current) setR(res); }).catch(e => { if (minha === ultima.current) avisarErro(e.message); });
  }, [api, dias]);
  useEffect(() => { carregar(); }, [carregar]);
  useIntervalo(carregar, 60000, { ativo: true, msEscondida: 300000 });

  if (!r) return <span style={{ color: "var(--text-secondary)" }}>Carregando…</span>;
  const { atendimento: a, clientes: c, financeiro: f } = r;
  const abrirEmpresa = id => navigate(`/clientes/${id}`);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap" }}>
        <p style={{ color: "var(--text-secondary)", margin: 0 }}>O retrato de agora e o resultado do período, só das áreas a que você tem acesso.</p>
        <SegmentedTabs variant="light" value={dias} onChange={setDias} tabs={[{ value: 7, label: "7 dias" }, { value: 30, label: "30 dias" }, { value: 90, label: "90 dias" }]} />
      </div>

      {a && (
        <Secao titulo="Atendimento" apoio={`Agora e nos últimos ${dias} dias`} para={() => navigate("/atendimento")} rotulo="Abrir atendimento">
          <div style={GRADE}>
            <StatCard value={a.agora.chatsNaFila} label="Na fila do chat" color={a.agora.chatsNaFila ? "var(--stat-4)" : "var(--stat-2)"} />
            <StatCard value={a.agora.chatsEmAtendimento} label="Em atendimento agora" color="var(--stat-1)" />
            <StatCard value={a.agora.chamadosAbertos} label="Chamados abertos" color="var(--stat-3)" />
            <StatCard value={a.agora.semResposta} label={a.agora.maisAntigoSemRespostaEm ? `Sem resposta · o mais antigo há ${duracao(a.agora.maisAntigoSemRespostaEm)}` : "Sem resposta"} color={a.agora.semResposta ? "var(--stat-4)" : "var(--stat-2)"} />
            <StatCard value={a.agora.prazoEstourado} label={a.agora.prazoPerto ? `Prazo estourado · ${a.agora.prazoPerto} perto de estourar` : "Prazo estourado"} color={a.agora.prazoEstourado ? "var(--status-danger)" : "var(--stat-2)"} />
          </div>
          <div style={GRADE}>
            <StatCard value={a.periodo.chamadosNovos} label={`Chamados novos · ${a.periodo.resolvidos} resolvidos`} color="var(--stat-3)" />
            <StatCard value={duracaoMin(a.periodo.tempoMedioRespostaMin)} label={a.periodo.respondidos ? `Tempo médio até a 1ª resposta · mediana ${duracaoMin(a.periodo.tempoMedianoRespostaMin)}` : "Tempo médio até a 1ª resposta"} color="var(--stat-1)" />
            <StatCard value={a.periodo.dentroDoPrazoPct == null ? "-" : `${a.periodo.dentroDoPrazoPct}%`} label="Respondidos dentro do prazo do plano" color={a.periodo.dentroDoPrazoPct != null && a.periodo.dentroDoPrazoPct < 80 ? "var(--status-danger)" : "var(--status-success)"} />
            <StatCard value={a.periodo.chatsAtendidos} label={`Chats atendidos · espera média ${a.periodo.esperaMediaChatMin == null ? "-" : duracaoMin(a.periodo.esperaMediaChatMin)}${a.periodo.chatsAbandonados ? ` · ${a.periodo.chatsAbandonados} abandonado(s)` : ""}`} color="var(--stat-2)" />
            <StatCard value={a.periodo.avaliacaoMedia == null ? "-" : `${String(a.periodo.avaliacaoMedia).replace(".", ",")} / 5`} label={a.periodo.avaliacoes ? `Avaliação média · ${a.periodo.avaliacoes} avaliação(ões)` : "Avaliação média"} color="var(--stat-4)" />
          </div>
          <div style={GRADE_LISTAS}>
            <Card title="Chamados e chats por dia (14 dias)">
              <BarChart height={160} max={eixoDeContagem(a.periodo.porDia.flatMap(d => [d.chamados, d.chats]))} format={v => String(Math.round(v))}
                series={[{ key: "chamados", label: "Chamados", color: "var(--accent)" }, { key: "chats", label: "Chats", color: "var(--text-primary)" }]}
                data={a.periodo.porDia.map((d, i) => ({ label: i % 2 ? "" : d.dia.slice(8) + "/" + d.dia.slice(5, 7), chamados: d.chamados, chats: d.chats }))} />
            </Card>
            <Card title="Por setor" padding="var(--space-4)">
              <DataTable dense minWidth={280} rows={a.periodo.porSetor} rowKey={s => s.setor} empty="Nenhum chamado no período."
                columns={[{ key: "s", label: "Setor", render: s => <b>{s.rotulo}</b> }, { key: "t", label: "Chamados e chats", align: "right", render: s => s.total }]} />
            </Card>
          </div>
        </Secao>
      )}

      {c && (
        <Secao titulo="Clientes" apoio={`${c.total} empresas · ${c.novos7} novas em 7 dias, ${c.novos30} em 30`} para={() => navigate("/clientes")} rotulo="Abrir clientes">
          <div style={GRADE}>
            <StatCard value={c.porSituacao.trial} label="Em teste" color="var(--stat-1)" />
            <StatCard value={c.porSituacao.trial_expirado} label="Teste acabado, sem assinar" color={c.porSituacao.trial_expirado ? "var(--stat-4)" : "var(--stat-2)"} />
            <StatCard value={c.porSituacao.ativo} label="Ativas" color="var(--status-success)" />
            <StatCard value={c.porSituacao.inadimplente} label="Inadimplentes" color={c.porSituacao.inadimplente ? "var(--status-danger)" : "var(--stat-2)"} />
            <StatCard value={c.porSituacao.suspenso + c.porSituacao.cancelado} label={`Suspensas ou canceladas`} color="var(--stat-3)" />
            <StatCard value={c.conversao.pct == null ? "-" : `${c.conversao.pct}%`} label={c.conversao.base ? `Testes que viraram assinatura (${c.conversao.convertidas} de ${c.conversao.base}, até 90 dias)` : "Testes que viraram assinatura (ainda sem testes encerrados)"} color="var(--stat-2)" />
          </div>
          <div style={GRADE_LISTAS}>
            <ListaEmpresas titulo="Teste acabando em até 3 dias" vazio="Nenhum teste acabando." itens={c.testesAcabando} abrir={abrirEmpresa}
              colunas={[{ key: "d", label: "Falta", render: e => <Badge size="sm" tone="warning">{e.diasRestantes === 0 ? "Último dia" : `${e.diasRestantes} dia(s)`}</Badge> }, { key: "t", label: "Telefone", render: e => tel(e.telefone) }]} />
            <ListaEmpresas titulo="Teste acabou há pouco e não assinou" vazio="Ninguém nesta situação." itens={c.testesAcabaram} abrir={abrirEmpresa}
              colunas={[{ key: "d", label: "Acabou", render: e => `há ${e.acabouHaDias} dia(s)` }, { key: "t", label: "Telefone", render: e => tel(e.telefone) }]} />
            <ListaEmpresas titulo={`Ativas sem acesso há ${c.semAcesso.diasSemAcesso}+ dias`} vazio="Todas as ativas entraram há pouco." itens={c.semAcesso.itens} abrir={abrirEmpresa}
              colunas={[{ key: "d", label: "Último acesso", render: e => (e.ultimoAcessoEm ? haQuanto(e.ultimoAcessoEm) : "Nunca entrou") }, { key: "p", label: "Plano", render: e => PLANOS[e.plano]?.label || e.plano }]} />
          </div>
          {c.semAcesso.total > c.semAcesso.itens.length && <span style={{ fontSize: "var(--fs-p5-5)", color: "var(--text-secondary)" }}>Mostrando {c.semAcesso.itens.length} de {c.semAcesso.total} ativas sem acesso recente.</span>}
        </Secao>
      )}

      {f && (
        <Secao titulo="Financeiro" apoio={`Mês ${f.mes.slice(5)}/${f.mes.slice(0, 4)}`} para={() => navigate("/financeiro")} rotulo="Abrir financeiro">
          {f.semAssinatura.length > 0 && (
            <Banner tone="warning" title={`${f.semAssinatura.length} empresa(s) ativa(s) sem assinatura configurada`}
              action={<Button size="sm" variant="secondary" onClick={() => navigate("/financeiro")}>Ver quais</Button>}>
              Não entram na receita recorrente até você combinar o valor em Clientes.
            </Banner>
          )}
          <div style={GRADE}>
            <StatCard value={fmt(f.mrr)} label="Receita mensal (MRR)" color="var(--stat-1)" />
            <StatCard value={fmt(f.arr)} label="Receita anual (ARR)" color="var(--stat-2)" />
            <StatCard value={fmt(f.recebidoNoMes)} label={`Recebido no mês · ${fmt(f.aReceberNoMes)} a receber`} color="var(--status-success)" />
            <StatCard value={fmt(f.emAtraso.valor)} label={f.emAtraso.cobrancas ? `Em atraso · ${f.emAtraso.cobrancas} cobrança(s) de ${f.emAtraso.empresas} empresa(s)` : "Em atraso"} color={f.emAtraso.valor > 0 ? "var(--status-danger)" : "var(--stat-2)"} />
          </div>
          <Card title="Recebido nos últimos 6 meses">
            <BarChart height={140} max={maxDoGrafico(f.serie.map(s => s.valor))} format={fmtCompacto} series={[{ key: "valor", label: "Recebido", color: "var(--status-success)" }]}
              data={f.serie.map(s => ({ label: `${MESES[Number(s.mes.slice(5)) - 1]}/${s.mes.slice(2, 4)}`, valor: s.valor }))} />
          </Card>
        </Secao>
      )}

      {!a && !c && !f && <Banner tone="info">Você não tem acesso a nenhuma área da visão geral. Peça a um administrador da equipe.</Banner>}
    </>
  );
}
