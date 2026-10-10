import { useCallback, useEffect, useState } from "react";
import { Badge, Banner, Button, Card, Icon, Tag, Textarea, UploadBox } from "../../../design-system";
import { LIMITES_SUPORTE, rotuloStatus } from "../../../server/config/suporte.js";
import { avisarErro, confirmar } from "../../utils/aviso";
import { dataHoraBR } from "../../utils/tempo";
import Conversa from "./Conversa";
import { ACEITOS_ANEXO, lerArquivo, tamanhoLegivel, tomDoStatus, useIntervalo } from "./util";

const FINALIZADOS = ["resolvido", "fechado", "abandonado"];

/** Nota de 1 a 5 estrelas, para o atendimento que terminou. */
function Avaliacao({ nota, onAvaliar }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
      <span style={{ fontSize: "var(--fs-p5)", fontWeight: "var(--fw-semibold)" }}>{nota ? "Sua avaliação" : "Como foi o atendimento?"}</span>
      <span style={{ display: "inline-flex", gap: "var(--space-1)" }} role="group" aria-label="Nota do atendimento">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" aria-label={`Nota ${n}`} aria-pressed={nota === n} disabled={!!nota} onClick={() => onAvaliar(n)}
            style={{ border: 0, background: "transparent", padding: "var(--space-1)", cursor: nota ? "default" : "pointer", color: n <= (nota || 0) ? "var(--accent)" : "var(--text-faint)" }}>
            <Icon name="star" size={22} />
          </button>
        ))}
      </span>
    </div>
  );
}

/** Um chamado do cliente: a conversa, o prazo, responder com anexo, marcar como resolvido e avaliar. */
export default function Chamado({ api, id, prazoHoras, email, onVoltar, onMudou }) {
  const [c, setC] = useState(null);
  const [texto, setTexto] = useState("");
  const [anexo, setAnexo] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  const carregar = useCallback(() => api.get(`/suporte/chamados/${id}`).then(setC).catch(e => { if (e.status === 404) onVoltar(); else avisarErro(e.message); }), [api, id, onVoltar]);
  useEffect(() => { carregar(); }, [id]); // eslint-disable-line
  useIntervalo(carregar, 15000, { ativo: true, msEscondida: 60000 });

  const escolher = async ([arquivo]) => {
    if (!arquivo) return;
    if (arquivo.size > 3 * 1024 * 1024) return setErro("O arquivo passa de 3 MB.");
    try { setAnexo({ ...(await lerArquivo(arquivo)), tamanho: arquivo.size }); setErro(""); } catch (e) { setErro(e.message); }
  };

  const responder = async () => {
    if (enviando) return;
    if (!texto.trim()) return setErro("Escreva a mensagem.");
    setEnviando(true); setErro("");
    try {
      await api.post(`/suporte/chamados/${id}/mensagens`, { texto, anexo: anexo && { nome: anexo.nome, dados: anexo.dados } });
      setTexto(""); setAnexo(null);
      await carregar(); onMudou?.();
    } catch (e) { setErro(e.message); } finally { setEnviando(false); }
  };

  const resolver = async () => {
    if (!(await confirmar({ titulo: "Marcar como resolvido", mensagem: "O problema foi resolvido? Se voltar a acontecer, é só responder aqui e o chamado reabre.", confirmarRotulo: "Está resolvido" }))) return;
    try { await api.post(`/suporte/chamados/${id}/resolver`); await carregar(); onMudou?.(); } catch (e) { avisarErro(e.message); }
  };
  const avaliar = async nota => { try { await api.post(`/suporte/chamados/${id}/avaliar`, { nota }); await carregar(); } catch (e) { avisarErro(e.message); } };

  if (!c) return <span style={{ color: "var(--text-secondary)" }}>Carregando…</span>;
  const fechado = c.status === "fechado";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
        <Button variant="secondary" size="sm" iconLeft="chevron-left" onClick={onVoltar}>Seus chamados</Button>
        <span style={{ font: "var(--type-card-title)" }}>#{c.numero} · {c.assunto}</span>
        <Badge tone={tomDoStatus(c.status)}>{rotuloStatus(c.status)}</Badge>
        {c.canal === "chat" && <Tag tone="neutral">Chat ao vivo</Tag>}
        <Tag tone="neutral">{c.setorRotulo}</Tag>
      </div>
      <span style={{ fontSize: "var(--fs-p5-5)", color: "var(--text-secondary)" }}>Aberto em {dataHoraBR(c.createdAt)}</span>
      {c.status === "aberto" && (
        <Banner tone="info" title={c.posicaoFila ? `Você é o ${c.posicaoFila}º da fila de chamados` : "Chamado recebido"}>
          A equipe responde aqui nesta conversa{prazoHoras ? `, em até ${prazoHoras} horas no seu plano` : ""}. Você é avisado pelo sino{email?.ativo ? " e por e-mail" : ""}.
        </Banner>
      )}
      {c.status === "aguardando_cliente" && <Banner tone="warning" title="A equipe respondeu e aguarda você">Responda abaixo para continuar o atendimento.</Banner>}
      <Card>
        <Conversa mensagens={c.mensagens} api={api} minha={m => m.autorTipo === "cliente"} caminhoAnexo={(m, a) => `/suporte/chamados/${id}/anexos/${a.id}`} />
      </Card>
      {fechado ? <Banner tone="info">Este chamado foi fechado. Se o problema voltar, abra um novo chamado.</Banner> : (
        <Card title="Sua resposta">
          <Textarea label="Mensagem" rows={4} maxLength={LIMITES_SUPORTE.textoMax} value={texto} onChange={e => { setTexto(e.target.value); setErro(""); }} />
          {anexo ? (
            <Banner tone="success" action={<Button size="sm" variant="secondary" onClick={() => setAnexo(null)}>Remover</Button>}>{anexo.nome} · {tamanhoLegivel(anexo.tamanho)}</Banner>
          ) : (
            <UploadBox height={72} accept={ACEITOS_ANEXO} onFiles={escolher} title="Anexar arquivo" hint="Opcional · até 3 MB" />
          )}
          {erro && <Banner tone="danger">{erro}</Banner>}
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", justifyContent: "flex-end" }}>
            {!FINALIZADOS.includes(c.status) && <Button variant="secondary" iconLeft="check" onClick={resolver}>Marcar como resolvido</Button>}
            <Button iconLeft="send" loading={enviando} onClick={responder}>Enviar resposta</Button>
          </div>
        </Card>
      )}
      {FINALIZADOS.includes(c.status) && c.status !== "abandonado" && <Avaliacao nota={c.avaliacao} onAvaliar={avaliar} />}
    </div>
  );
}
