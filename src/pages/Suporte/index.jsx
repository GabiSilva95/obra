import { useCallback, useEffect, useState } from "react";
import { Badge, Banner, Button, Card, DataTable, Icon, SegmentedTabs, Tag, useIsMobile } from "../../../design-system";
import { PageActions } from "../../components/PageActions";
import { avisarErro } from "../../utils/aviso";
import { dataBR, haQuanto } from "../../utils/tempo";
import { rotuloStatus } from "../../../server/config/suporte.js";
import Chamado from "./Chamado";
import EntrarNaFila from "./EntrarNaFila";
import NovoChamado from "./NovoChamado";
import { tomDoStatus, useIntervalo } from "./util";

/**
 * Suporte do cliente: abrir um chamado (ticket) ou falar ao vivo (entra na fila e é atendido na ordem),
 * e acompanhar os chamados. O chat mora numa janela do sistema (ChatSuporte) que segue o cliente pelas telas.
 */
export default function Suporte({ api, chatAtivo, abrirChat, atualizarResumo, novoInicial }) {
  const mobile = useIsMobile();
  const [cfg, setCfg] = useState(null);
  const [lista, setLista] = useState(null);
  const [filtro, setFiltro] = useState("todos");
  const [abertoId, setAbertoId] = useState(null);
  const [novo, setNovo] = useState(!!novoInicial); // abre já preenchido quando vem de um atalho (ex.: "Quero assinar")
  const [inicial, setInicial] = useState(novoInicial); // só vale para a primeira abertura
  const [fila, setFila] = useState(false);

  const carregar = useCallback(() => api.get(`/suporte/chamados${filtro === "abertos" ? "?status=abertos" : ""}`).then(setLista).catch(e => avisarErro(e.message)), [api, filtro]);
  useEffect(() => { api.get("/suporte/config").then(setCfg).catch(e => avisarErro(e.message)); }, []); // eslint-disable-line
  useEffect(() => { carregar(); }, [carregar]);
  useIntervalo(carregar, 30000, { ativo: !abertoId, msEscondida: 120000 });

  const voltar = useCallback(() => { setAbertoId(null); carregar(); atualizarResumo?.(); }, [carregar, atualizarResumo]);

  if (abertoId) return <Chamado api={api} id={abertoId} prazoHoras={cfg?.prazoRespostaHoras} email={cfg?.email} onVoltar={voltar} onMudou={atualizarResumo} />;

  const chatAberto = cfg?.chat.aberto;
  const opcao = (icone, titulo, texto, acao) => (
    <Card title={titulo} icon={<Icon name={icone} size={22} />} style={{ flex: 1 }}>
      <p style={{ margin: 0, fontSize: "var(--fs-p5)", color: "var(--text-secondary)", lineHeight: "var(--lh-body)" }}>{texto}</p>
      {acao}
    </Card>
  );

  return (
    <>
      <PageActions>
        <Button iconLeft="plus" onClick={() => setNovo(true)}>Novo chamado</Button>
      </PageActions>
      <p style={{ color: "var(--text-secondary)" }}>Fale com a equipe do ConstruktPro: abra um chamado ou converse ao vivo. Tudo fica registrado aqui, na ordem em que chegou.</p>

      <div style={{ display: "flex", flexDirection: mobile ? "column" : "row", gap: "var(--space-6)" }}>
        {opcao("clipboard-list", "Abrir um chamado", `Conte o que aconteceu, com um print se ajudar. Respondemos aqui, no seu chamado${cfg ? `, em até ${cfg.prazoRespostaHoras} horas no seu plano` : ""}, e avisamos pelo sino${cfg?.email?.ativo ? " e por e-mail" : ""}.${cfg?.email?.responder ? " Você pode responder o e-mail e a resposta entra no chamado." : ""}`,
          <Button variant="secondary" iconLeft="plus" onClick={() => setNovo(true)}>Abrir chamado</Button>)}
        {opcao("message-circle", "Falar ao vivo",
          !cfg ? "Carregando…" : chatAtivo ? "Você já está em um chat. Continue por lá." : chatAberto ? `Atendimento ao vivo ${cfg.chat.horario}. Você entra na fila e é atendido na ordem em que chegou.` : `O chat funciona ${cfg.chat.horario}. Agora está fora do horário: abra um chamado e respondemos por aqui.`,
          chatAtivo ? <Button iconLeft="message-circle" onClick={() => abrirChat(chatAtivo.id)}>Voltar ao chat</Button>
            : <Button iconLeft="message-circle" disabled={!chatAberto} onClick={() => setFila(true)}>Entrar na fila</Button>)}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, font: "var(--type-card-title)" }}>Seus chamados</h2>
        <SegmentedTabs variant="light" value={filtro} onChange={setFiltro} tabs={[{ value: "todos", label: "Todos" }, { value: "abertos", label: "Em aberto" }]} />
      </div>
      {!lista ? <span style={{ color: "var(--text-secondary)" }}>Carregando…</span> : lista.length === 0 ? (
        <Banner tone="info" title="Nenhum chamado por aqui">Quando precisar de ajuda, abra um chamado ou entre no chat ao vivo.</Banner>
      ) : (
        <DataTable minWidth={720} rows={lista} rowKey={t => t.id} onRowClick={t => setAbertoId(t.id)} columns={[
          { key: "n", label: "Nº", width: "var(--space-16)", render: t => <b>#{t.numero}</b> },
          { key: "a", label: "Assunto", render: t => (
            <span style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
              {t.naoLido > 0 && <span aria-label="Resposta nova" style={{ width: "var(--space-2)", height: "var(--space-2)", borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />}
              <b>{t.assunto}</b>{t.canal === "chat" && <Tag tone="neutral">Chat</Tag>}
            </span>
          ) },
          { key: "s", label: "Setor", render: t => t.setorRotulo },
          { key: "st", label: "Situação", render: t => <Badge size="sm" tone={tomDoStatus(t.status)}>{rotuloStatus(t.status)}</Badge> },
          { key: "d", label: "Aberto em", render: t => dataBR(t.createdAt) },
          { key: "u", label: "Última atividade", render: t => <span style={{ color: "var(--text-secondary)" }}>{haQuanto(t.ultimaMensagemEm)}</span> },
        ]} />
      )}

      {novo && <NovoChamado api={api} prazoHoras={cfg?.prazoRespostaHoras} email={cfg?.email} inicial={inicial} onFechar={() => { setNovo(false); setInicial(null); }} onCriado={c => { setNovo(false); setInicial(null); setAbertoId(c.id); atualizarResumo?.(); }} />}
      {fila && <EntrarNaFila api={api} horario={cfg?.chat.horario} onFechar={() => setFila(false)} onEntrou={id => { setFila(false); abrirChat(id); atualizarResumo?.(); }} />}
    </>
  );
}
