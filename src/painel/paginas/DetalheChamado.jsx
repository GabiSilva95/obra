import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Banner, Button, Card, Checkbox, Select, Tag, Textarea, UploadBox } from "../../../design-system";
import { PRIORIDADES, SETORES, LIMITES_SUPORTE, rotuloStatus } from "../../../server/config/suporte.js";
import { PAPEL_ADMIN, temPermissao } from "../../../server/config/painel.js";
import { avisarErro, confirmar } from "../../utils/aviso";
import { useIntervalo } from "../../utils/useIntervalo";
import Conversa from "../../pages/Suporte/Conversa";
import { ACEITOS_ANEXO, lerArquivo, tamanhoLegivel, tomDoStatus } from "../../pages/Suporte/util";
import { entrarComoCliente } from "../entrarComoCliente";
import { dataHoraBR, duracao, prazoTexto } from "../util";

const TRANSICOES = {
  aberto: ["em_atendimento", "aguardando_cliente", "resolvido", "fechado"],
  em_atendimento: ["aberto", "aguardando_cliente", "resolvido", "fechado"],
  aguardando_cliente: ["em_atendimento", "resolvido", "fechado"],
  resolvido: ["em_atendimento", "fechado"],
  fechado: [],
};
const TOM_PRIORIDADE = { urgente: "danger", alta: "accent", normal: "neutral", baixa: "neutral" };

const Linha = ({ rotulo, children }) => (
  <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-3)", fontSize: "var(--fs-p5-5)" }}>
    <span style={{ color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{rotulo}</span><span style={{ fontWeight: "var(--fw-semibold)", textAlign: "right", overflowWrap: "anywhere" }}>{children}</span>
  </div>
);

/**
 * A conversa e os dados de um chamado ou chat, para a equipe: responder (ou deixar nota interna), mudar situação,
 * prioridade e setor, assumir ou atribuir. Chat em atendimento atualiza a cada 3 s; os demais, a cada 15 s.
 */
export default function DetalheChamado({ api, id, equipe, atendentes, onVoltar, onMudou }) {
  const [c, setC] = useState(null);
  const [texto, setTexto] = useState("");
  const [interna, setInterna] = useState(false);
  const [depois, setDepois] = useState("aguardando_cliente");
  const [anexo, setAnexo] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const ultimo = useRef(0);
  const supervisor = temPermissao(equipe, "suporte_supervisor");
  const navigate = useNavigate();
  const podeVerEmpresa = temPermissao(equipe, "clientes");
  const [entrando, setEntrando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const cursor = ultimo.current; // com cursor, o servidor devolve só as mensagens novas
      const r = await api.get(`/painel/chamados/${id}${cursor ? `?depois=${cursor}` : ""}`);
      if (r.mensagens.length) ultimo.current = r.mensagens.at(-1).id;
      setC(prev => ({ ...r, mensagens: cursor && prev?.id === r.id ? [...prev.mensagens, ...r.mensagens] : r.mensagens }));
    } catch (e) { avisarErro(e.message); }
  }, [api, id]);
  useEffect(() => { ultimo.current = 0; setC(null); carregar(); }, [id]); // eslint-disable-line
  const aoVivo = c?.canal === "chat" && c?.status === "em_atendimento";
  useIntervalo(carregar, aoVivo ? 3000 : 15000, { ativo: true, msEscondida: 15000 });

  const mudar = async campos => {
    setErro("");
    try {
      const r = await api.patch(`/painel/chamados/${id}`, campos);
      setC(prev => ({ ...prev, ...r }));
      onMudou?.();
    } catch (e) { avisarErro(e.message); }
  };

  const escolher = async ([arquivo]) => {
    if (!arquivo) return;
    if (arquivo.size > 3 * 1024 * 1024) return setErro("O arquivo passa de 3 MB.");
    try { setAnexo({ ...(await lerArquivo(arquivo)), tamanho: arquivo.size }); setErro(""); } catch (e) { setErro(e.message); }
  };

  const enviar = async () => {
    if (enviando || !texto.trim()) { if (!texto.trim()) setErro("Escreva a mensagem."); return; }
    setEnviando(true); setErro("");
    try {
      const corpo = { texto, interna, anexo: anexo && { nome: anexo.nome, dados: anexo.dados }, ...(c.canal === "ticket" && !interna ? { depois } : {}) };
      const r = await api.post(`/painel/chamados/${id}/mensagens`, corpo);
      setTexto(""); setAnexo(null); setInterna(false);
      setC(prev => ({ ...prev, ...r, mensagens: prev.mensagens }));
      await carregar(); onMudou?.();
    } catch (e) { setErro(e.message); } finally { setEnviando(false); }
  };

  const encerrar = async status => {
    const rotulo = status === "fechado" ? "Fechar" : "Resolver";
    if (!(await confirmar({ titulo: `${rotulo} ${c.canal === "chat" ? "o chat" : "o chamado"}`, mensagem: `${rotulo} #${c.numero}? O cliente é avisado.`, confirmarRotulo: rotulo }))) return;
    mudar({ status });
  };

  if (!c) return <span style={{ color: "var(--text-secondary)" }}>Carregando…</span>;
  const souEu = c.atendente?.id === equipe.id;
  const finalizado = ["resolvido", "fechado", "abandonado"].includes(c.status);
  const podeEscrever = c.canal === "chat" ? aoVivo && (souEu || supervisor) : true;
  const statusPossiveis = TRANSICOES[c.status] || [];
  const ehAdmin = equipe.papel === PAPEL_ADMIN;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
        {onVoltar && <Button variant="secondary" size="sm" iconLeft="chevron-left" onClick={onVoltar}>Voltar</Button>}
        <span style={{ font: "var(--type-card-title)" }}>#{c.numero} · {c.assunto}</span>
        <Badge tone={tomDoStatus(c.status)}>{rotuloStatus(c.status)}</Badge>
        {c.canal === "chat" && <Tag tone="dark">Chat ao vivo</Tag>}
        <Tag tone="neutral">{c.setorRotulo}</Tag>
        {c.prioridade !== "normal" && <Tag tone={TOM_PRIORIDADE[c.prioridade]}>{PRIORIDADES.find(p => p.id === c.prioridade)?.rotulo}</Tag>}
        {c.bloqueante && <Tag tone="danger">Impede o trabalho</Tag>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-lg),1fr))", gap: "var(--space-5)", alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", gridColumn: "span 2", minWidth: 0 }}>
          <Card>
            <Conversa mensagens={c.mensagens} api={api} minha={m => m.autorTipo === "equipe"} rotuloAutor={m => (m.autorTipo === "equipe" ? `${m.autorNome} (equipe)` : m.autorNome)} caminhoAnexo={(m, a) => `/painel/chamados/${id}/anexos/${a.id}`} altura="var(--scroll-h-lg)" />
          </Card>
          {podeEscrever && c.status !== "fechado" ? (
            <Card padding="var(--space-4)">
              <Textarea label={interna ? "Nota interna" : c.canal === "chat" ? "Resposta no chat" : "Resposta ao cliente"} rows={c.canal === "chat" ? 3 : 5} maxLength={LIMITES_SUPORTE.textoMax} value={texto} onChange={e => { setTexto(e.target.value); setErro(""); }}
                onKeyDown={e => { if (c.canal === "chat" && e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }} />
              <div style={{ display: "flex", gap: "var(--space-4)", alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
                <Checkbox checked={interna} onChange={setInterna} label="Nota interna (o cliente não vê)" />
                {c.canal === "ticket" && !interna && c.emailAtivo && c.solicitante?.email && <span style={{ fontSize: "var(--fs-p6)", color: "var(--text-secondary)" }}>Também vai por e-mail para {c.solicitante.email}.</span>}
                {c.canal === "ticket" && !interna && (
                  <Select aria-label="Depois de enviar" value={depois} onChange={e => setDepois(e.target.value)} style={{ minWidth: "var(--control-w-md)" }}>
                    <option value="aguardando_cliente">Depois de enviar: aguardar o cliente</option>
                    <option value="em_atendimento">Depois de enviar: manter em atendimento</option>
                    <option value="resolvido">Depois de enviar: marcar como resolvido</option>
                  </Select>
                )}
              </div>
              {anexo ? <Banner tone="success" action={<Button size="sm" variant="secondary" onClick={() => setAnexo(null)}>Remover</Button>}>{anexo.nome} · {tamanhoLegivel(anexo.tamanho)}</Banner>
                : <UploadBox height={64} accept={ACEITOS_ANEXO} onFiles={escolher} title="Anexar arquivo" hint="Opcional · até 3 MB" />}
              {erro && <Banner tone="danger">{erro}</Banner>}
              <div style={{ display: "flex", justifyContent: "flex-end" }}><Button iconLeft="send" loading={enviando} onClick={enviar}>{interna ? "Salvar nota" : "Enviar"}</Button></div>
            </Card>
          ) : <Banner tone="info">{c.status === "fechado" ? "Chamado fechado." : c.canal === "chat" ? (finalizado ? "Chat encerrado." : "Este chat está com outro atendente.") : ""}</Banner>}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", minWidth: 0 }}>
          <Card title="Cliente">
            <Linha rotulo="Empresa">{c.empresa.nome}</Linha>
            <Linha rotulo="Plano"><Tag tone="neutral">{c.empresa.plano}</Tag></Linha>
            {c.solicitante && <><Linha rotulo="Solicitante">{c.solicitante.nome}</Linha><Linha rotulo="E-mail">{c.solicitante.email}</Linha></>}
            <Linha rotulo="Aberto em">{dataHoraBR(c.entrouNaFilaEm)}</Linha>
            <Linha rotulo="Há">{duracao(c.entrouNaFilaEm)}</Linha>
            {c.prazo?.situacao && <Linha rotulo="Prazo de resposta"><span style={{ color: c.prazo.situacao === "estourado" ? "var(--status-danger)" : c.prazo.situacao === "perto" ? "var(--status-warning-text)" : undefined }}>{prazoTexto(c.prazo)}</span></Linha>}
            {c.avaliacao && <Linha rotulo="Avaliação do cliente">{c.avaliacao} de 5</Linha>}
            {podeVerEmpresa && (
              <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                <Button size="sm" variant="secondary" iconLeft="building-2" onClick={() => navigate(`/clientes/${c.empresa.id}`)}>Ver empresa</Button>
                <Button size="sm" variant="secondary" iconLeft="eye" loading={entrando} onClick={async () => { setEntrando(true); await entrarComoCliente(api, c.empresa.id, c.id); setEntrando(false); }}>Entrar como o cliente</Button>
              </div>
            )}
          </Card>
          <Card title="Atendimento">
            <Linha rotulo="Atendente">{c.atendente?.nome || "Ninguém"}</Linha>
            {!souEu && c.canal === "ticket" && !finalizado && <Button size="sm" variant="secondary" onClick={() => mudar({ atribuidoId: equipe.id })}>Assumir este chamado</Button>}
            {(supervisor || ehAdmin) && (
              <Select label="Atribuir a" value={c.atendente?.id ?? ""} onChange={e => e.target.value && mudar({ atribuidoId: Number(e.target.value) })}>
                <option value="">Escolha…</option>
                {(atendentes || []).map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </Select>
            )}
            {c.canal === "ticket" && statusPossiveis.length > 0 && (
              <Select label="Situação" value={c.status} onChange={e => mudar({ status: e.target.value })}>
                <option value={c.status}>{rotuloStatus(c.status)}</option>
                {statusPossiveis.map(s => <option key={s} value={s}>{rotuloStatus(s)}</option>)}
              </Select>
            )}
            {c.status === "fechado" && supervisor && <Button size="sm" variant="secondary" onClick={() => mudar({ status: "aberto" })}>Reabrir (supervisor)</Button>}
            <Select label="Prioridade" value={c.prioridade} onChange={e => mudar({ prioridade: e.target.value })}>
              {PRIORIDADES.map(p => <option key={p.id} value={p.id}>{p.rotulo}</option>)}
            </Select>
            <Select label="Setor" value={c.setor} onChange={e => mudar({ setor: e.target.value })}>
              {SETORES.map(s => <option key={s.id} value={s.id}>{s.rotulo}</option>)}
            </Select>
            {!finalizado && (
              <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                <Button size="sm" iconLeft="check" onClick={() => encerrar("resolvido")}>{c.canal === "chat" ? "Encerrar chat" : "Resolver"}</Button>
                <Button size="sm" variant="secondary" onClick={() => encerrar("fechado")}>Fechar</Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
