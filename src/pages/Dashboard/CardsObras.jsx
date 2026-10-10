import { fmt, calcProg, calcCustoObra, isAtrasada } from "../../utils/helpers";
import { Badge, Banner, Card, Icon, ProgressBar } from "../../../design-system";

/** Um card por obra: progresso, orçamento usado, custo e etapa atual. */
export default function CardsObras({ obras, data }) {
  const { etapasObra, tiposEtapa } = data;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(var(--col-min-lg),1fr))", gap: "var(--space-6)" }}>
      {obras.length === 0 && <p style={{ color: "var(--text-secondary)" }}>Nenhuma obra para exibir.</p>}
      {obras.map(obra => {
        const et = etapasObra.filter(e => e.obraId === obra.id);
        const prog = calcProg(obra.id, etapasObra);
        const atrs = et.filter(e => isAtrasada(e));
        const ea = et.find(e => e.progresso > 0 && e.progresso < 100);
        const tpAtual = ea && tiposEtapa.find(t => t.id === ea.tipoEtapaId);
        const cT = calcCustoObra(obra.id, data);
        const pOrc = Math.min(100, Math.round(cT / (obra.orcamento || 1) * 100));
        const sc = { Concluída: "success", "Em andamento": "info", Pausada: "warning" };
        const barras = [
          { l: "Progresso", v: prog, c: "var(--accent)" },
          { l: "Orçamento", v: pOrc, c: pOrc > 90 ? "var(--status-danger)" : pOrc > 70 ? "var(--status-warning)" : "var(--status-success)" },
        ];
        return (
          <Card key={obra.id} title={obra.nome} action={
            <div style={{ display: "flex", gap: "var(--space-1)", flexWrap: "wrap", justifyContent: "flex-end" }}>
              <Badge size="sm" tone={sc[obra.status] || "neutral"}>{obra.status}</Badge>
              {atrs.length > 0 && <Badge size="sm" tone="error">{atrs.length} atraso{atrs.length > 1 ? "s" : ""}</Badge>}
            </div>
          }>
            <span style={{ display: "flex", alignItems: "center", gap: "var(--space-1-5)", color: "var(--text-secondary)", marginTop: "calc(-1 * var(--space-3))" }}>
              <Icon name="map-pin" size={16} />{obra.local}
            </span>
            {barras.map(b => (
              <div key={b.l} style={{ display: "flex", flexDirection: "column", gap: "var(--space-1-5)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", font: "var(--type-label)" }}>
                  <span style={{ color: "var(--text-secondary)" }}>{b.l}</span>
                  <span style={{ color: b.v > 90 && b.l === "Orçamento" ? "var(--status-danger)" : "var(--text-primary)" }}>{b.v}%</span>
                </div>
                <ProgressBar value={b.v} color={b.c} label={b.l} />
              </div>
            ))}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2) var(--space-10)", borderTop: "var(--border-w) solid var(--border-subtle)", paddingTop: "var(--space-3)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-0-5)" }}><span style={{ fontSize: "var(--fs-p5-5)", color: "var(--text-secondary)" }}>Custo:</span><span style={{ fontWeight: "var(--fw-semibold)" }}>{fmt(cT)}</span></div>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-0-5)" }}><span style={{ fontSize: "var(--fs-p5-5)", color: "var(--text-secondary)" }}>Meta:</span><span style={{ fontWeight: "var(--fw-semibold)" }}>{fmt(obra.orcamento)}</span></div>
              {tpAtual && <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-0-5)" }}><span style={{ fontSize: "var(--fs-p5-5)", color: "var(--text-secondary)" }}>Etapa atual:</span><span style={{ display: "flex", alignItems: "center", gap: "var(--space-1-5)", fontWeight: "var(--fw-semibold)" }}><Icon name={tpAtual.icon || "square-check"} size={16} />{tpAtual.nome}</span></div>}
            </div>
            {atrs.length > 0 && (
              <Banner tone="danger" title="Atrasadas">
                {atrs.map(e => { const tp = tiposEtapa.find(t => t.id === e.tipoEtapaId); return <div key={e.id}>{tp?.nome} · {e.dataFimP}</div>; })}
              </Banner>
            )}
          </Card>
        );
      })}
    </div>
  );
}
