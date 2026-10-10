import { useEffect, useRef } from "react";
import { ChatBubble, Icon } from "../../../design-system";
import { horaBR } from "../../utils/tempo";
import { baixarAnexo, tamanhoLegivel } from "./util";

/**
 * Conversa de um chamado ou chat, em balões. `minha(m)` diz quais mensagens são "minhas" (à direita);
 * `caminhoAnexo(m, a)` é a rota para baixar um anexo. Mensagens do sistema ficam centralizadas e discretas.
 */
export default function Conversa({ mensagens, api, minha, caminhoAnexo, rotuloAutor, altura }) {
  const legenda = m => (m.emailStatus === "enviado" ? ["Enviada também por e-mail", "var(--status-success)"] : m.emailStatus === "falhou" ? ["Não foi possível enviar por e-mail", "var(--status-danger)"] : m.origem === "email" ? ["Recebida por e-mail", "var(--text-secondary)"] : null)(m);
  const fim = useRef(null);
  useEffect(() => { fim.current?.scrollIntoView({ block: "end" }); }, [mensagens.length]);
  return (
    <div role="log" aria-live="polite" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", maxHeight: altura, overflowY: altura ? "auto" : undefined, paddingRight: altura ? "var(--space-1)" : undefined }}>
      {mensagens.map(m => m.autorTipo === "sistema" ? (
        <span key={m.id} style={{ alignSelf: "center", textAlign: "center", fontSize: "var(--fs-p6)", fontWeight: "var(--fw-semibold)", color: "var(--text-secondary)", padding: "var(--space-1) var(--space-3)", background: "var(--surface-sunken)", borderRadius: "var(--radius-pill)" }}>{m.texto}</span>
      ) : (
        <div key={m.id} style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)", alignItems: minha(m) ? "flex-end" : "flex-start" }}>
          <span style={{ fontSize: "var(--fs-p6)", fontWeight: "var(--fw-bold)", color: m.interna ? "var(--status-warning-text)" : "var(--text-secondary)" }}>
            {m.interna ? "Nota interna · " : ""}{rotuloAutor ? rotuloAutor(m) : m.autorNome}
          </span>
          <div style={m.interna ? { background: "var(--status-warning-soft)", borderRadius: "var(--radius-md)" } : undefined}>
            <ChatBubble mine={minha(m)} text={<span style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{m.texto}</span>} time={horaBR(m.createdAt)} />
          </div>
          {legenda(m) && <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-1)", fontSize: "var(--fs-p6)", color: legenda(m)[1] }}><Icon name="mail" size={12} />{legenda(m)[0]}</span>}
          {m.anexos?.map(a => (
            <button key={a.id} type="button" onClick={() => baixarAnexo(api, caminhoAnexo(m, a), a.nome).catch(() => {})}
              style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-1-5)", border: "var(--border-w) solid var(--border-default)", background: "var(--surface-card)", borderRadius: "var(--radius-sm)", padding: "var(--space-1) var(--space-2-5)", font: "var(--type-label)", color: "var(--text-primary)", cursor: "pointer" }}>
              <Icon name="download" size={14} />{a.nome} · {tamanhoLegivel(a.tamanho)}
            </button>
          ))}
        </div>
      ))}
      <span ref={fim} />
    </div>
  );
}
