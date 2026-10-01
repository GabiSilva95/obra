import { useState } from "react";
import { fmt, calcProg, calcCustoObra, isAtrasada } from "../utils/helpers";
import { Badge, Banner, Card, Icon, ProgressBar, Select, StatCard, useIsMobile } from "../../design-system";
import { PageActions } from "../components/PageActions";

export default function Dashboard({ data, userId, isMaster }) {
  const { obras, insumos, estoques, etapasObra, users, tiposEtapa } = data;
  const [filtro, setFiltro] = useState("all");
  const user = users.find(u => u.id === userId);
  const acess = isMaster ? obras : obras.filter(o => (user?.obrasAcesso || []).includes(o.id));
  const filt = filtro === "all" ? acess : acess.filter(o => o.id === parseInt(filtro));
  const totAtras = filt.reduce((s, o) => s + etapasObra.filter(e => e.obraId === o.id && isAtrasada(e)).length, 0);
  const custoTotal = filt.reduce((s, o) => s + calcCustoObra(o.id, data), 0);
  const estoqueDisp = filt.reduce((s, o) => s + estoques.filter(e => e.obraId === o.id).reduce((ss, e) => { const i = insumos.find(x => x.id === e.insumoId); return ss + (i ? i.custoUnit * (e.quantEntrada - e.quantUtilizado) : 0); }, 0), 0);
  const mobile = useIsMobile();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <PageActions>
        <Select aria-label="Filtrar obra" style={{ height: "var(--control-h-sm)", minWidth: "var(--control-w-md)" }} value={filtro} onChange={e => setFiltro(e.target.value)}>
          <option value="all">Todas as obras</option>
          {acess.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </Select>
      </PageActions>
      <p style={{ color: "var(--text-secondary)" }}>
        {(d => d[0].toUpperCase() + d.slice(1))(new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }))}
      </p>
      {totAtras > 0 && (
        <Banner tone="danger" title={`${totAtras} etapa${totAtras > 1 ? "s" : ""} atrasada${totAtras > 1 ? "s" : ""}`}>Etapas fora do prazo previsto.</Banner>
      )}
      <div style={{ display: "grid", gridTemplateColumns: mobile ? "repeat(2,minmax(0,1fr))" : "repeat(4,minmax(0,1fr))", gap: mobile ? "var(--space-3)" : "var(--space-6)" }}>
        <StatCard value={filt.filter(o => o.status === "Em andamento").length} label="Obras ativas" color="var(--stat-1)" />
        <StatCard value={totAtras} label="Etapas atrasadas" color={totAtras > 0 ? "var(--status-danger)" : "var(--stat-2)"} />
        <StatCard value={fmt(custoTotal)} label="Custo total" color="var(--stat-3)" />
        <StatCard value={fmt(estoqueDisp)} label="Estoque disponível" color="var(--stat-4)" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(var(--col-min-lg),1fr))", gap: "var(--space-6)" }}>
        {filt.length === 0 && <p style={{ color: "var(--text-secondary)" }}>Nenhuma obra para exibir.</p>}
        {filt.map(obra => {
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
    </div>
  );
}
