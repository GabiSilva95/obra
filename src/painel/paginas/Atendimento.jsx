import { useCallback, useEffect, useRef, useState } from "react";
import { Badge, Banner, Button, Card, DataTable, SegmentedTabs, StatCard, Tag, useIsMobile } from "../../../design-system";
import { PageActions } from "../../components/PageActions";
import { temPermissao } from "../../../server/config/painel.js";
import { rotuloStatus } from "../../../server/config/suporte.js";
import { avisarErro } from "../../utils/aviso";
import { useIntervalo } from "../../utils/useIntervalo";
import { tomDoStatus } from "../../pages/Suporte/util";
import DetalheChamado from "./DetalheChamado";
import { bipe, duracao, prazoTexto } from "../util";

const SITUACAO = [{ value: "disponivel", label: "Disponível" }, { value: "ocupado", label: "Ocupado" }, { value: "ausente", label: "Ausente" }];
const TOM_ATENDENTE = { disponivel: "success", ocupado: "warning", ausente: "neutral" };
const ROTULO_ATENDENTE = { disponivel: "Disponível", ocupado: "Ocupado", ausente: "Ausente" };
const COR_PRAZO = { estourado: "var(--status-danger)", perto: "var(--status-warning-text)" };

const Titulo = ({ children, apoio }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
    <h2 style={{ margin: 0, font: "var(--type-card-title)" }}>{children}</h2>
    {apoio && <span style={{ fontSize: "var(--fs-p5-5)", color: "var(--text-secondary)" }}>{apoio}</span>}
  </div>
);

/**
 * Tela principal da equipe: quem está na fila do chat ao vivo (e há quanto tempo), quem está sendo atendido,
 * os chamados abertos (há quanto tempo, de qual setor) e os atendentes. Atualiza a cada 3 s.
 */
export default function Atendimento({ api, equipe }) {
  const mobile = useIsMobile();
  const [e, setE] = useState(null);
  const [atendentes, setAtendentes] = useState([]);
  const [aberto, setAberto] = useState(null); // id do chamado ou chat aberto no painel
  const [presenca, setPresenca] = useState("ausente");
  const [pegando, setPegando] = useState(false);
  const filaAnterior = useRef(null);
  const supervisor = temPermissao(equipe, "suporte_supervisor");

  const carregar = useCallback(async () => {
    try {
      const r = await api.get("/painel/atendimento/estado");
      setE(r);
      const eu = r.atendentes.find(a => a.id === equipe.id);
      if (eu) setPresenca(eu.status);
      if (filaAnterior.current !== null && r.fila.length > filaAnterior.current && eu?.status === "disponivel") bipe();
      filaAnterior.current = r.fila.length;
      document.title = `${r.fila.length ? `(${r.fila.length}) ` : ""}Atendimento · Painel da equipe`;
    } catch { /* a próxima consulta tenta de novo */ }
  }, [api, equipe.id]);
  useEffect(() => { carregar(); api.get("/painel/atendimento/atendentes").then(setAtendentes).catch(() => {}); return () => { document.title = "Painel da equipe · ConstruktPro"; }; }, []); // eslint-disable-line
  useIntervalo(carregar, 3000, { msEscondida: 8000 });

  const mudarPresenca = async status => {
    setPresenca(status);
    try { await api.post("/painel/atendimento/presenca", { status }); await carregar(); } catch (err) { avisarErro(err.message); }
  };
  const atender = async ticketId => {
    if (pegando) return;
    setPegando(true);
    try { const c = await api.post("/painel/atendimento/proximo", ticketId ? { ticketId } : {}); await carregar(); setAberto(c.id); }
    catch (err) { avisarErro(err.message, "Não foi possível atender"); await carregar(); } finally { setPegando(false); }
  };

  if (aberto) return <DetalheChamado api={api} id={aberto} equipe={equipe} atendentes={atendentes} onVoltar={() => { setAberto(null); carregar(); }} onMudou={carregar} />;
  if (!e) return <span style={{ color: "var(--text-secondary)" }}>Carregando…</span>;

  const eu = e.atendentes.find(a => a.id === equipe.id);
  const comVaga = (eu?.chatsAtivos ?? 0) < e.capacidade;
  const disponiveis = e.atendentes.filter(a => a.status === "disponivel").length;
  const maisAntigo = e.chamados.filter(c => c.status === "aberto").sort((a, b) => new Date(a.entrouNaFilaEm) - new Date(b.entrouNaFilaEm))[0];

  return (
    <>
      <PageActions>
        <SegmentedTabs variant="light" value={presenca} onChange={mudarPresenca} tabs={SITUACAO} />
        <Button iconLeft="message-circle" loading={pegando} disabled={!e.fila.length || !comVaga} onClick={() => atender()}>
          Atender próximo{e.fila.length ? ` (${e.fila.length})` : ""}
        </Button>
      </PageActions>

      {presenca !== "disponivel" && <Banner tone="info" title="Você não está disponível">Ninguém é encaminhado a você enquanto estiver {presenca === "ocupado" ? "ocupado" : "ausente"}. Mude para Disponível no topo para atender.</Banner>}
      {e.fila.length > 0 && disponiveis === 0 && <Banner tone="warning" title="Há gente esperando e nenhum atendente disponível">Quem entra na fila vê que não há previsão. Deixe-se Disponível ou chame alguém da equipe.</Banner>}
      {!e.chat.aberto && <Banner tone="info">Fora do horário do chat ({e.chat.horario}). Quem ainda está na fila continua sendo atendido; novos clientes só abrem chamado.</Banner>}

      <div style={{ display: "grid", gridTemplateColumns: mobile ? "repeat(2,minmax(0,1fr))" : "repeat(4,minmax(0,1fr))", gap: mobile ? "var(--space-3)" : "var(--space-6)" }}>
        <StatCard value={e.fila.length} label="Na fila do chat" color={e.fila.length ? "var(--stat-4)" : "var(--stat-2)"} />
        <StatCard value={e.emAtendimento.length} label="Em atendimento agora" color="var(--stat-1)" />
        <StatCard value={e.chamados.length} label="Chamados abertos" color="var(--stat-3)" />
        <StatCard value={maisAntigo ? duracao(maisAntigo.entrouNaFilaEm).replace("menos de 1 min", "< 1 min") : "—"} label="Chamado sem resposta mais antigo" color={maisAntigo?.prazo.situacao === "estourado" ? "var(--status-danger)" : "var(--stat-2)"} />
      </div>

      <Card>
        <Titulo apoio="Na ordem em que chegaram. O botão Atender próximo sempre pega o primeiro.">Fila do chat ao vivo</Titulo>
        <DataTable dense minWidth={760} rows={e.fila} rowKey={f => f.id} empty="Ninguém esperando agora." columns={[
          { key: "p", label: "Posição", width: "var(--space-16)", render: f => <b style={{ fontSize: "var(--fs-p3)" }}>{f.posicao}º</b> },
          { key: "c", label: "Cliente", render: f => <span style={{ display: "flex", flexDirection: "column" }}><b>{f.solicitante || "Cliente"}</b><span style={{ fontSize: "var(--fs-p6)", color: "var(--text-secondary)" }}>{f.empresa.nome}</span></span> },
          { key: "pl", label: "Plano", render: f => <Tag tone="neutral">{f.empresa.plano}</Tag> },
          { key: "s", label: "Setor", render: f => f.setorRotulo },
          { key: "t", label: "Esperando", render: f => <b>{duracao(f.entrouNaFilaEm)}</b> },
          { key: "a", label: "", width: "var(--col-min-sm)", render: f => (f.posicao === 1
            ? <Button size="sm" iconLeft="message-circle" loading={pegando} disabled={!comVaga} onClick={() => atender()}>Atender</Button>
            : supervisor ? <Button size="sm" variant="secondary" loading={pegando} disabled={!comVaga} onClick={() => atender(f.id)}>Atender este</Button> : null) },
        ]} />
      </Card>

      <Card>
        <Titulo apoio="Conversas em andamento. Clique para abrir.">Em atendimento agora</Titulo>
        <DataTable dense minWidth={760} rows={e.emAtendimento} rowKey={c => c.id} onRowClick={c => setAberto(c.id)} empty="Nenhum chat em andamento." columns={[
          { key: "c", label: "Cliente", render: c => (
            <span style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              {c.naoLidoEquipe > 0 && <span aria-label="Mensagem nova" style={{ width: "var(--space-2)", height: "var(--space-2)", borderRadius: "50%", background: "var(--accent)" }} />}
              <span style={{ display: "flex", flexDirection: "column" }}><b>{c.solicitante || "Cliente"}</b><span style={{ fontSize: "var(--fs-p6)", color: "var(--text-secondary)" }}>{c.empresa.nome}</span></span>
            </span>
          ) },
          { key: "s", label: "Setor", render: c => c.setorRotulo },
          { key: "at", label: "Atendente", render: c => <b>{c.atendente?.id === equipe.id ? "Você" : c.atendente?.nome}</b> },
          { key: "h", label: "Em atendimento há", render: c => duracao(c.iniciadoEm) },
        ]} />
      </Card>

      <Card>
        <Titulo apoio="Urgentes primeiro, depois a ordem de solicitação. A cor do prazo vem do plano do cliente.">Chamados abertos</Titulo>
        <DataTable dense minWidth={960} rows={e.chamados} rowKey={c => c.id} onRowClick={c => setAberto(c.id)} empty="Nenhum chamado aberto." columns={[
          { key: "n", label: "Nº", width: "var(--space-16)", render: c => (
            <span style={{ display: "flex", alignItems: "center", gap: "var(--space-1-5)" }}>
              {c.naoLidoEquipe > 0 && <span aria-label="Resposta nova do cliente" style={{ width: "var(--space-2)", height: "var(--space-2)", borderRadius: "50%", background: "var(--accent)" }} />}<b>#{c.numero}</b>
            </span>
          ) },
          { key: "c", label: "Cliente", render: c => <span style={{ display: "flex", flexDirection: "column" }}><b>{c.empresa.nome}</b><span style={{ fontSize: "var(--fs-p6)", color: "var(--text-secondary)" }}>{c.solicitante}</span></span> },
          { key: "pl", label: "Plano", render: c => <Tag tone="neutral">{c.empresa.plano}</Tag> },
          { key: "s", label: "Setor", render: c => c.setorRotulo },
          { key: "as", label: "Assunto", render: c => <span style={{ display: "flex", alignItems: "center", gap: "var(--space-1-5)", flexWrap: "wrap" }}>{c.assunto}{c.prioridade === "urgente" && <Tag tone="danger">Urgente</Tag>}{c.bloqueante && c.prioridade !== "urgente" && <Tag tone="accent">Impede o trabalho</Tag>}</span> },
          { key: "h", label: "Aberto há", render: c => <span style={{ display: "flex", flexDirection: "column" }}><b>{duracao(c.entrouNaFilaEm)}</b>{c.prazo.situacao && <span style={{ fontSize: "var(--fs-p6)", color: COR_PRAZO[c.prazo.situacao] || "var(--text-secondary)" }}>{prazoTexto(c.prazo)}</span>}</span> },
          { key: "st", label: "Situação", render: c => <Badge size="sm" tone={tomDoStatus(c.status)}>{rotuloStatus(c.status)}</Badge> },
          { key: "at", label: "Atendente", render: c => c.atendente?.id === equipe.id ? <b>Você</b> : (c.atendente?.nome || <span style={{ color: "var(--text-secondary)" }}>Ninguém</span>) },
        ]} />
      </Card>

      <Card>
        <Titulo>Atendentes</Titulo>
        <DataTable dense minWidth={0} rows={e.atendentes} rowKey={a => a.id} empty="Ninguém com acesso ao atendimento." columns={[
          { key: "n", label: "Pessoa", render: a => <b>{a.nome}{a.id === equipe.id ? " (você)" : ""}</b> },
          { key: "s", label: "Situação", render: a => <Badge size="sm" tone={TOM_ATENDENTE[a.status]}>{ROTULO_ATENDENTE[a.status]}</Badge> },
          { key: "c", label: "Chats", align: "right", render: a => `${a.chatsAtivos} de ${e.capacidade}` },
        ]} />
      </Card>
    </>
  );
}
