import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Icon, IconButton } from "../../design-system";
import { fmt } from "../utils/helpers";
import { useIntervalo } from "../utils/useIntervalo";
import { larguraDoPopover, posicaoDoPopover } from "../components/popover";

const TIPO = {
  danger: { cor: "var(--status-danger)", suave: "var(--status-danger-soft)" },
  warning: { cor: "var(--status-warning-text)", suave: "var(--status-warning-soft)" },
  info: { cor: "var(--status-info-text)", suave: "var(--status-info-soft)" },
};
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

/** O que pede atenção, a partir de /painel/visao-geral/pendencias (só das áreas que a pessoa pode ver). */
export function listarPendencias(p) {
  if (!p) return [];
  const n = [];
  if (p.atendimento?.chatNaFila > 0) n.push({ id: "fila", tipo: "danger", icone: "message-circle", titulo: `${plural(p.atendimento.chatNaFila, "pessoa", "pessoas")} na fila do chat`, msg: "Abra o atendimento e atenda o próximo.", link: "/atendimento" });
  if (p.atendimento?.chamadosSemResposta > 0) n.push({ id: "sem-resposta", tipo: p.atendimento.prazoEstourado ? "danger" : "warning", icone: "clipboard-list", titulo: `${plural(p.atendimento.chamadosSemResposta, "chamado", "chamados")} sem resposta`, msg: p.atendimento.prazoEstourado ? `${plural(p.atendimento.prazoEstourado, "com o prazo estourado", "com o prazo estourado")}` : "Todos ainda dentro do prazo.", link: "/chamados" });
  if (p.clientes?.testesAcabando > 0) n.push({ id: "testes-acabando", tipo: "warning", icone: "clock", titulo: `${plural(p.clientes.testesAcabando, "teste acabando", "testes acabando")} em até 3 dias`, msg: "Um contato agora ajuda a virar assinatura.", link: "/visao-geral" });
  if (p.clientes?.testesAcabaram > 0) n.push({ id: "testes-acabaram", tipo: "info", icone: "building-2", titulo: `${plural(p.clientes.testesAcabaram, "teste acabou", "testes acabaram")} há pouco sem assinar`, msg: "As contas estão bloqueadas até a assinatura.", link: "/visao-geral" });
  if (p.financeiro?.cobrancasAtrasadas > 0) n.push({ id: "atraso", tipo: "danger", icone: "wallet", titulo: `${plural(p.financeiro.cobrancasAtrasadas, "cobrança em atraso", "cobranças em atraso")}`, msg: fmt(p.financeiro.valorEmAtraso), link: "/financeiro" });
  return n;
}

/** O sino do painel: avisa a fila, os chamados sem resposta, os testes acabando e as cobranças em atraso. Consulta a cada minuto. */
export default function PainelSino({ api }) {
  const navigate = useNavigate();
  const [aberto, setAberto] = useState(false);
  const [pend, setPend] = useState(null);
  const [pos, setPos] = useState(null);
  const botao = useRef(null);
  const carregar = useCallback(() => api.get("/painel/visao-geral/pendencias").then(setPend).catch(() => {}), [api]);
  useEffect(() => { carregar(); }, [carregar]);
  useIntervalo(carregar, 60000, { ativo: true, msEscondida: 300000 });
  const itens = listarPendencias(pend);
  const ir = link => { setAberto(false); navigate(link); };

  return (
    <div ref={botao} style={{ position: "relative" }}>
      <IconButton icon="bell" label="Pendências da equipe" badge={itens.length > 9 ? "9+" : itens.length || undefined}
        onClick={() => { if (!aberto) setPos(posicaoDoPopover(botao.current.getBoundingClientRect(), window.innerWidth, larguraDoPopover())); setAberto(v => !v); carregar(); }} />
      {aberto && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: "calc(var(--z-popover) - 1)" }} onClick={() => setAberto(false)} />
          <div role="dialog" aria-label="Pendências da equipe" style={{ position: "fixed", top: pos?.top, left: pos?.left, width: pos?.width, background: "var(--surface-raised)", borderRadius: "var(--radius-lg)", border: "var(--border-w) solid var(--border-card)", boxShadow: "var(--shadow-pop)", zIndex: "var(--z-popover)", overflow: "hidden" }}>
            <div style={{ padding: "var(--space-3) var(--space-4)", borderBottom: "var(--border-w) solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ font: "var(--type-card-title)", fontSize: "var(--fs-p4)" }}>Pendências</span>
              {itens.length > 0 && <Badge tone="error" size="sm">{itens.length}</Badge>}
            </div>
            <div style={{ maxHeight: "var(--scroll-h-md)", overflowY: "auto" }}>
              {itens.length === 0 ? (
                <div style={{ padding: "var(--space-8) var(--space-4)", textAlign: "center", color: "var(--text-secondary)", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-2)" }}>
                  <Icon name="check" size={24} /><span style={{ fontSize: "var(--fs-p6)" }}>{pend ? "Nada pendente por aqui." : "Carregando…"}</span>
                </div>
              ) : itens.map(n => {
                const t = TIPO[n.tipo];
                return (
                  <div key={n.id} role="button" tabIndex={0} onClick={() => ir(n.link)} onKeyDown={e => { if (e.key === "Enter") ir(n.link); }}
                    style={{ padding: "var(--space-3) var(--space-4)", borderBottom: "var(--border-w) solid var(--border-subtle)", display: "flex", gap: "var(--space-3)", alignItems: "flex-start", cursor: "pointer" }}>
                    <span style={{ width: "var(--space-8)", height: "var(--space-8)", borderRadius: "var(--radius-sm)", background: t.suave, color: t.cor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name={n.icone} size={16} /></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "var(--fs-p6)", fontWeight: "var(--fw-bold)", color: t.cor, marginBottom: "var(--space-0-5)" }}>{n.titulo}</div>
                      <div style={{ fontSize: "var(--fs-p6)", color: "var(--text-secondary)", lineHeight: "var(--lh-snug)" }}>{n.msg}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
