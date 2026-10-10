import { useCallback, useEffect, useRef, useState } from "react";
import { Badge, Banner, Button, IconButton, Icon, Textarea, useIsMobile } from "../../design-system";
import { avisarErro, confirmar } from "../utils/aviso";
import Conversa from "../pages/Suporte/Conversa";
import { useIntervalo } from "../pages/Suporte/util";

/**
 * Janela do chat ao vivo com o suporte. Mora no shell do sistema, então segue o cliente por todas as telas.
 * Consulta o servidor a cada 3 s (a consulta é também o sinal de que ele está ali: sem sinal por 1 min, sai da fila).
 */
export default function ChatSuporte({ api, id, onFechar, onAbrirChamado }) {
  const mobile = useIsMobile();
  const [chat, setChat] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [nota, setNota] = useState(null);
  const ultimo = useRef(0);

  const consultar = useCallback(async () => {
    try {
      const r = await api.get(`/suporte/chat/${id}?depois=${ultimo.current}`);
      setChat(r.chat);
      if (r.mensagens.length) { ultimo.current = r.mensagens.at(-1).id; setMensagens(m => [...m, ...r.mensagens]); }
    } catch (e) { if (e.status === 404) onFechar(); }
  }, [api, id, onFechar]);
  useEffect(() => { consultar(); }, [id]); // eslint-disable-line
  useIntervalo(consultar, 3000, { ativo: !chat?.encerrado, msEscondida: 15000 });

  const enviar = async () => {
    const t = texto.trim();
    if (!t || enviando) return;
    setEnviando(true);
    try { await api.post(`/suporte/chat/${id}/mensagens`, { texto: t }); setTexto(""); await consultar(); }
    catch (e) { avisarErro(e.message); } finally { setEnviando(false); }
  };
  const sair = async () => {
    const naFila = chat?.status === "na_fila";
    if (!(await confirmar({ titulo: naFila ? "Sair da fila" : "Encerrar o chat", mensagem: naFila ? "Você perde o seu lugar na fila." : "Encerrar o atendimento agora?", confirmarRotulo: naFila ? "Sair da fila" : "Encerrar", perigo: true }))) return;
    try { await api.post(`/suporte/chat/${id}/sair`); await consultar(); } catch (e) { avisarErro(e.message); }
  };
  const avaliar = async n => { try { await api.post(`/suporte/chat/${id}/avaliar`, { nota: n }); setNota(n); } catch (e) { avisarErro(e.message); } };

  const posicao = chat?.posicao;
  const quadro = mobile
    ? { left: 0, right: 0, bottom: 0, maxHeight: "85vh", borderRadius: "var(--radius-lg) var(--radius-lg) 0 0" }
    : { right: "var(--space-6)", bottom: "var(--space-6)", width: "var(--content-w-xs)", maxHeight: "min(var(--content-w-sm), 80vh)", borderRadius: "var(--radius-lg)" };

  return (
    <section role="dialog" aria-label="Chat com o suporte" style={{ position: "fixed", zIndex: "var(--z-modal)", display: "flex", flexDirection: "column", background: "var(--surface-card)", border: "var(--border-w) solid var(--border-card)", boxShadow: "var(--shadow-pop)", overflow: "hidden", ...quadro }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)", padding: "var(--space-3) var(--space-4)", background: "var(--surface-sidebar)", color: "var(--text-on-sidebar)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontWeight: "var(--fw-bold)" }}><Icon name="message-circle" size={18} />Chat com o suporte</span>
        <span style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          {chat && <Badge size="sm" tone={chat.status === "em_atendimento" ? "success" : chat.encerrado ? "neutral" : "warning"}>{chat.status === "em_atendimento" ? "Em atendimento" : chat.encerrado ? "Encerrado" : "Na fila"}</Badge>}
          {chat?.encerrado && <IconButton icon="x" variant="inverse" size={28} label="Fechar o chat" onClick={onFechar} />}
        </span>
      </header>

      <div style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-4)", overflowY: "auto", flex: 1, minHeight: 0 }}>
        {!chat && <span style={{ color: "var(--text-secondary)" }}>Conectando…</span>}

        {chat?.status === "na_fila" && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)", alignItems: "center", textAlign: "center", padding: "var(--space-4) 0" }}>
              <span style={{ fontSize: "var(--fs-h1)", fontWeight: "var(--fw-black)", lineHeight: "var(--lh-none)", color: "var(--accent)" }}>{posicao}º</span>
              <span style={{ fontSize: "var(--fs-p3)", fontWeight: "var(--fw-bold)" }}>{posicao === 1 ? "Você é o próximo" : `${posicao - 1} pessoa${posicao - 1 > 1 ? "s" : ""} na sua frente`}</span>
              <span style={{ fontSize: "var(--fs-p5)", color: "var(--text-secondary)" }}>{chat.esperaMin ? `Espera estimada: cerca de ${chat.esperaMin} min` : "Estamos chamando um atendente"}</span>
            </div>
            <Banner tone="info">Pode usar o sistema normalmente, mas não feche esta janela nem a aba: sem sinal por 1 minuto você sai da fila.</Banner>
            <Button variant="secondary" onClick={sair}>Sair da fila</Button>
          </>
        )}

        {chat?.status === "em_atendimento" && <Conversa mensagens={mensagens} api={api} minha={m => m.autorTipo === "cliente"} caminhoAnexo={() => ""} altura="var(--scroll-h-md)" />}

        {chat?.encerrado && (
          <>
            <Conversa mensagens={mensagens} api={api} minha={m => m.autorTipo === "cliente"} caminhoAnexo={() => ""} altura="var(--scroll-h-md)" />
            <Banner tone="info" title="Atendimento encerrado">Se ainda precisa de ajuda, abra um chamado e continuamos por lá.</Banner>
            {chat.status !== "abandonado" && (
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
                <span style={{ fontSize: "var(--fs-p5)", fontWeight: "var(--fw-semibold)" }}>Como foi?</span>
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} type="button" aria-label={`Nota ${n}`} disabled={!!(nota || chat.avaliacao)} onClick={() => avaliar(n)}
                    style={{ border: 0, background: "transparent", padding: "var(--space-1)", cursor: nota || chat.avaliacao ? "default" : "pointer", color: n <= (nota || chat.avaliacao || 0) ? "var(--accent)" : "var(--text-faint)" }}><Icon name="star" size={22} /></button>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <Button variant="secondary" onClick={() => { onFechar(); onAbrirChamado?.(); }}>Abrir um chamado</Button>
              <Button onClick={onFechar}>Fechar</Button>
            </div>
          </>
        )}
      </div>

      {chat?.status === "em_atendimento" && (
        <footer style={{ padding: "var(--space-3) var(--space-4)", borderTop: "var(--border-w) solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <Textarea aria-label="Mensagem do chat" rows={2} maxLength={1000} placeholder="Escreva e pressione Enter para enviar" value={texto} onChange={e => setTexto(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }} />
          <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-2)" }}>
            <Button size="sm" variant="secondary" onClick={sair}>Encerrar chat</Button>
            <Button size="sm" iconLeft="send" loading={enviando} onClick={enviar}>Enviar</Button>
          </div>
        </footer>
      )}
    </section>
  );
}
