import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Icon, IconButton } from "../../design-system";
import { isAtrasada, calcCustoObra, fmt } from "../utils/helpers";
import { larguraDoPopover, posicaoDoPopover } from "./popover";

/** Vencimentos do financeiro, a partir do resumo de /financeiro/resumo. */
function notifsFinanceiro(r) {
  if (!r) return [];
  const n = [];
  const link = "/app/financeiro";
  if (r.pagar.qtdVencido > 0) n.push({ id: "fin-pagar-vencido", tipo: "danger", icone: "circle-alert", titulo: "Contas a pagar vencidas", msg: `${r.pagar.qtdVencido} conta${r.pagar.qtdVencido > 1 ? "s" : ""}, ${fmt(r.pagar.vencido)}`, link });
  if (r.pagar.hoje > 0) n.push({ id: "fin-pagar-hoje", tipo: "warning", icone: "wallet", titulo: "Contas a pagar vencem hoje", msg: fmt(r.pagar.hoje), link });
  if (r.pagar.prox7 > 0) n.push({ id: "fin-pagar-7", tipo: "warning", icone: "wallet", titulo: "A pagar nos próximos 7 dias", msg: fmt(r.pagar.prox7), link });
  if (r.receber.qtdVencido > 0) n.push({ id: "fin-receber-vencido", tipo: "warning", icone: "circle-alert", titulo: "Contas a receber vencidas", msg: `${r.receber.qtdVencido} conta${r.receber.qtdVencido > 1 ? "s" : ""}, ${fmt(r.receber.vencido)}`, link });
  const pend = r.pendencias.compras + r.pendencias.diarias + r.pendencias.locacoes;
  if (pend > 0) n.push({ id: "fin-pendencias", tipo: "warning", icone: "clipboard-list", titulo: "Pagamentos sem conta a pagar", msg: `${pend} item${pend > 1 ? "s" : ""} em Financeiro > Pendências`, link });
  return n;
}

function calcNotifs(data) {
  const { obras, etapasObra, tiposEtapa, estoques, insumos } = data;
  const notifs = [];

  // Etapas atrasadas
  etapasObra.forEach(e => {
    if (isAtrasada(e)) {
      const obra = obras.find(o => o.id === e.obraId);
      const tp = tiposEtapa.find(t => t.id === e.tipoEtapaId);
      notifs.push({ id: `et-${e.id}`, tipo: "danger", icone: "triangle-alert", titulo: "Etapa atrasada", msg: `${tp?.nome || "Etapa"} em "${obra?.nome}"`, link: "/app/obras" });
    }
  });

  // Orçamento >90%
  obras.forEach(o => {
    const cT = calcCustoObra(o.id, data);
    const pct = o.orcamento > 0 ? (cT / o.orcamento) * 100 : 0;
    if (pct >= 90) {
      notifs.push({ id: `orc-${o.id}`, tipo: pct >= 100 ? "danger" : "warning", icone: "chart-column", titulo: pct >= 100 ? "Orçamento estourado" : "Orçamento crítico", msg: `"${o.nome}": ${Math.round(pct)}% utilizado (${fmt(cT)} de ${fmt(o.orcamento)})`, link: "/app/relatorios" });
    }
  });

  // Estoque zerado
  const estoquesPorObraInsumo = {};
  estoques.forEach(e => {
    const key = `${e.obraId}-${e.insumoId}`;
    if (!estoquesPorObraInsumo[key]) estoquesPorObraInsumo[key] = { obraId: e.obraId, insumoId: e.insumoId, saldo: 0 };
    estoquesPorObraInsumo[key].saldo += (e.quantEntrada - e.quantUtilizado);
  });
  Object.values(estoquesPorObraInsumo).forEach(({ obraId, insumoId, saldo }) => {
    if (saldo <= 0) {
      const obra = obras.find(o => o.id === obraId);
      const ins = insumos.find(i => i.id === insumoId);
      notifs.push({ id: `est-${obraId}-${insumoId}`, tipo: "warning", icone: "warehouse", titulo: "Estoque zerado", msg: `${ins?.nome} em "${obra?.nome}"`, link: "/app/estoque" });
    }
  });

  // Obras sem prazo definido próximas de vencer
  const hoje = new Date();
  obras.forEach(o => {
    if (o.status === "Concluída") return;
    const fim = new Date(o.previsaoFim);
    const diasRestantes = Math.ceil((fim - hoje) / 86400000);
    if (diasRestantes <= 7 && diasRestantes >= 0) {
      notifs.push({ id: `prazo-${o.id}`, tipo: "warning", icone: "clock", titulo: "Prazo se aproximando", msg: `"${o.nome}" vence em ${diasRestantes} dia${diasRestantes !== 1 ? "s" : ""}`, link: "/app/obras" });
    } else if (diasRestantes < 0) {
      notifs.push({ id: `vencida-${o.id}`, tipo: "danger", icone: "clock", titulo: "Obra com prazo vencido", msg: `"${o.nome}" venceu há ${Math.abs(diasRestantes)} dias`, link: "/app/obras" });
    }
  });

  return notifs;
}

const TIPO = {
  danger:  { color: "var(--status-danger)",       soft: "var(--status-danger-soft)" },
  warning: { color: "var(--status-warning-text)", soft: "var(--status-warning-soft)" },
  info:    { color: "var(--status-info-text)",    soft: "var(--status-info-soft)" },
};

/** Chamados de suporte com resposta nova da equipe (de /suporte/resumo). */
function notifsSuporte(r) {
  return (r?.respondidos || []).map(c => ({ id: `sup-${c.id}`, tipo: "info", icone: "message-circle", titulo: `Chamado #${c.id} respondido`, msg: c.assunto, link: "/app/suporte" }));
}

export default function Notificacoes({ data, financeiro, suporte }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const botao = useRef(null);
  const notifs = useMemo(() => (data ? [...notifsSuporte(suporte), ...notifsFinanceiro(financeiro), ...calcNotifs(data)] : []), [data, financeiro, suporte]);
  const count = notifs.length;

  return (
    <div ref={botao} data-tour="notificacoes" style={{ position: "relative" }}>
      <IconButton icon="bell" label="Notificações" badge={count > 9 ? "9+" : count || undefined}
        onClick={() => { if (!open) setPos(posicaoDoPopover(botao.current.getBoundingClientRect(), window.innerWidth, larguraDoPopover())); setOpen(v => !v); }} />
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: "calc(var(--z-popover) - 1)" }} onClick={() => setOpen(false)} />
          <div role="dialog" aria-label="Notificações" style={{ position: "fixed", top: pos?.top, left: pos?.left, width: pos?.width, background: "var(--surface-raised)", borderRadius: "var(--radius-lg)", border: "var(--border-w) solid var(--border-card)", boxShadow: "var(--shadow-pop)", zIndex: "var(--z-popover)", overflow: "hidden" }}>
            <div style={{ padding: "var(--space-3) var(--space-4)", borderBottom: "var(--border-w) solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ font: "var(--type-card-title)", fontSize: "var(--fs-p4)" }}>Notificações</span>
              {count > 0 && <Badge tone="error" size="sm">{count} alerta{count !== 1 ? "s" : ""}</Badge>}
            </div>
            <div style={{ maxHeight: "var(--scroll-h-md)", overflowY: "auto" }}>
              {count === 0 ? (
                <div style={{ padding: "var(--space-8) var(--space-4)", textAlign: "center", color: "var(--text-secondary)", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-2)" }}>
                  <Icon name="check" size={24} />
                  <span style={{ fontSize: "var(--fs-p6)" }}>Tudo certo por aqui.</span>
                </div>
              ) : notifs.map(n => {
                const t = TIPO[n.tipo];
                return (
                  <div key={n.id} role="button" tabIndex={0} onClick={() => { setOpen(false); navigate(n.link); }}
                    onKeyDown={e => { if (e.key === "Enter") { setOpen(false); navigate(n.link); } }}
                    style={{ padding: "var(--space-3) var(--space-4)", borderBottom: "var(--border-w) solid var(--border-subtle)", display: "flex", gap: "var(--space-3)", alignItems: "flex-start", cursor: "pointer" }}>
                    <span style={{ width: "var(--space-8)", height: "var(--space-8)", borderRadius: "var(--radius-sm)", background: t.soft, color: t.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon name={n.icone} size={16} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "var(--fs-p6)", fontWeight: "var(--fw-bold)", color: t.color, marginBottom: "var(--space-0-5)" }}>{n.titulo}</div>
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
