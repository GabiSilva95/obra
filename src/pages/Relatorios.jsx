import { useState } from "react";
import { fmt, calcProg, calcIns, calcMaq, calcMO, calcDesp, isAtrasada } from "../utils/helpers";
import { exportCsv, exportPdf } from "../utils/export";
import { Badge, Button, Card, Icon, ProgressBar, SegmentedTabs, Select } from "../../design-system";
import { PageActions } from "../components/PageActions";

function GanttBar({ etapas, tiposEtapa }) {
  if (!etapas.length) return null;
  const datas = etapas.flatMap(e => [e.dataInicioP, e.dataFimP]).sort();
  const inicio = new Date(datas[0]);
  const fim = new Date(datas[datas.length - 1]);
  const totalDias = Math.max(1, (fim - inicio) / 86400000);
  const today = new Date().toISOString().slice(0, 10);
  const todayX = Math.min(100, Math.max(0, ((new Date(today) - inicio) / 86400000 / totalDias) * 100));

  const fmtDate = d => new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--fs-micro)", color: "var(--text-secondary)", marginBottom: "var(--space-1-5)" }}>
        <span>{fmtDate(datas[0])}</span>
        <span style={{ color: "var(--text-accent)", fontWeight: "var(--fw-bold)" }}>Hoje</span>
        <span>{fmtDate(datas[datas.length - 1])}</span>
      </div>
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1-5)" }}>
          {etapas.map(e => {
            const tp = tiposEtapa.find(t => t.id === e.tipoEtapaId);
            const left = ((new Date(e.dataInicioP) - inicio) / 86400000 / totalDias) * 100;
            const width = Math.max(1, ((new Date(e.dataFimP) - new Date(e.dataInicioP)) / 86400000 / totalDias) * 100);
            const at = isAtrasada(e);
            const cor = e.status === "Concluída" ? "var(--status-success-text)" : at ? "var(--status-danger)" : "var(--accent)";
            return (
              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <div style={{ width: "var(--col-min-xs)", fontSize: "var(--fs-p6)", color: at ? "var(--status-danger)" : "var(--text-muted)", flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {tp?.nome || "Etapa"}
                </div>
                <div style={{ flex: 1, position: "relative", height: "var(--space-4-5)", background: "var(--surface-sunken)", borderRadius: "var(--radius-xs)" }}>
                  <div style={{ position: "absolute", left: `${left}%`, width: `${width}%`, height: "100%", background: cor, borderRadius: "var(--radius-xs)", opacity: 0.8, minWidth: "var(--space-1)" }} title={`${fmtDate(e.dataInicioP)} → ${fmtDate(e.dataFimP)}`} />
                  {e.progresso > 0 && e.progresso < 100 && (
                    <div style={{ position: "absolute", left: `${left}%`, width: `${width * e.progresso / 100}%`, height: "100%", background: cor, borderRadius: "var(--radius-xs)", minWidth: "var(--space-0-5)" }} />
                  )}
                </div>
                <span style={{ fontSize: "var(--fs-p6)", color: "var(--text-secondary)", width: "var(--space-8)", textAlign: "right", flexShrink: 0 }}>{e.progresso}%</span>
              </div>
            );
          })}
        </div>
        {/* Today line */}
        <div style={{ position: "absolute", top: 0, bottom: 0, left: `calc(var(--col-min-xs) + var(--space-2) + (100% - var(--col-min-xs) - 2 * var(--space-2) - var(--space-8)) * ${todayX / 100})`, width: "var(--border-w)", background: "var(--accent)", opacity: 0.6, pointerEvents: "none" }} />
      </div>
    </div>
  );
}

export default function Relatorios({ data }) {
  const { obras, maquinas, funcionarios, insumos, estoques, alocacoes, funcionarioObra, etapasObra, tiposEtapa, receitas = [] } = data;
  const [filtro, setFiltro] = useState("all");
  const [vista, setVista] = useState("resumo");
  const filt = filtro === "all" ? obras : obras.filter(o => o.id === parseInt(filtro));

  const handleExportCsv = () => {
    const rows = filt.map(obra => {
      const prog = calcProg(obra.id, etapasObra);
      const cIns = calcIns(obra.id, data.consumos, insumos);
      const cMaq = calcMaq(obra.id, alocacoes, maquinas);
      const cMO = calcMO(obra.id, data.apontamentos, funcionarios, funcionarioObra);
      const cDesp = calcDesp(obra.id, data.despesas);
      const cT = cIns + cMaq + cMO + cDesp;
      const rec = receitas.filter(r => r.obraId === obra.id).reduce((s, r) => s + r.valor, 0);
      return [obra.nome, obra.status, obra.local, `${prog}%`, cT.toFixed(2), obra.orcamento, rec.toFixed(2), (rec - cT).toFixed(2)];
    });
    exportCsv("relatorio-obras.csv", rows, ["Obra", "Status", "Local", "Progresso", "Custo Total", "Orçamento", "Receitas", "Lucro"]);
  };

  const handleExportPdf = () => {
    const rows = filt.map(obra => {
      const prog = calcProg(obra.id, etapasObra);
      const cIns = calcIns(obra.id, data.consumos, insumos);
      const cMaq = calcMaq(obra.id, alocacoes, maquinas);
      const cMO = calcMO(obra.id, data.apontamentos, funcionarios, funcionarioObra);
      const cDesp = calcDesp(obra.id, data.despesas);
      const cT = cIns + cMaq + cMO + cDesp;
      const rec = receitas.filter(r => r.obraId === obra.id).reduce((s, r) => s + r.valor, 0);
      return `<tr><td>${obra.nome}</td><td>${obra.status}</td><td>${prog}%</td><td>${fmt(cT)}</td><td>${fmt(obra.orcamento)}</td><td>${fmt(rec)}</td><td style="color:${rec - cT >= 0 ? "var(--status-success-text)" : "var(--status-danger)"}">${fmt(rec - cT)}</td></tr>`;
    }).join("");
    exportPdf("Relatório de Obras", `
      <div class="section">
        <h1>Relatório de Obras</h1>
        <p class="sub">Emitido em ${new Date().toLocaleDateString("pt-BR")}</p>
        <table>
          <thead><tr><th>Obra</th><th>Status</th><th>Progresso</th><th>Custo</th><th>Orçamento</th><th>Receitas</th><th>Lucro</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `);
  };

  return (
    <div>
      <PageActions>
        <Select aria-label="Filtrar obra" style={{ height: "var(--control-h-sm)", minWidth: "var(--control-w-md)" }} value={filtro} onChange={e => setFiltro(e.target.value)}>
          <option value="all">Todas as obras</option>
          {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </Select>
        <Button iconLeft="download" size="sm" variant="secondary" onClick={handleExportCsv}>CSV</Button>
        <Button iconLeft="download" size="sm" variant="secondary" onClick={handleExportPdf}>PDF</Button>
      </PageActions>
      <SegmentedTabs variant="light" value={vista} onChange={setVista} tabs={[{ value: "resumo", label: "Resumo" }, { value: "gantt", label: "Cronograma (Gantt)" }]} />

      {vista === "gantt" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
          {filt.map(obra => {
            const ets = etapasObra.filter(e => e.obraId === obra.id).sort((a, b) => new Date(a.dataInicioP) - new Date(b.dataInicioP));
            return (
              <Card key={obra.id} title={obra.nome}>
                {ets.length ? <GanttBar etapas={ets} tiposEtapa={tiposEtapa} /> : <div style={{ fontSize: "var(--fs-caption)", color: "var(--text-secondary)" }}>Sem etapas cadastradas</div>}
              </Card>
            );
          })}
        </div>
      )}

      {vista === "resumo" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
          {filt.map(obra => {
            const prog = calcProg(obra.id, etapasObra);
            const cIns = calcIns(obra.id, data.consumos, insumos);
            const cMaq = calcMaq(obra.id, alocacoes, maquinas);
            const cMO = calcMO(obra.id, data.apontamentos, funcionarios, funcionarioObra);
      const cDesp = calcDesp(obra.id, data.despesas);
            const cT = cIns + cMaq + cMO + cDesp;
            const estD = estoques.filter(e => e.obraId === obra.id).reduce((s, e) => { const i = insumos.find(x => x.id === e.insumoId); return s + (i ? i.custoUnit * (e.quantEntrada - e.quantUtilizado) : 0); }, 0);
            const pOrc = Math.min(100, Math.round(cT / (obra.orcamento || 1) * 100));
            const ets = etapasObra.filter(e => e.obraId === obra.id).sort((a, b) => new Date(a.dataInicioP) - new Date(b.dataInicioP));
            const atrs = ets.filter(e => isAtrasada(e));
            const rec = receitas.filter(r => r.obraId === obra.id).reduce((s, r) => s + r.valor, 0);
            const lucro = rec - cT;
            const sc = { Concluída: "success", "Em andamento": "info", Pausada: "warning" };

            return (
              <Card key={obra.id} title={obra.nome} action={
                <div style={{ display: "flex", gap: "var(--space-2)" }}>
                  {atrs.length > 0 && <Badge size="sm" tone="error">{atrs.length} atrasada{atrs.length > 1 ? "s" : ""}</Badge>}
                  <Badge size="sm" tone={sc[obra.status] || "neutral"}>{obra.status}</Badge>
                </div>
              }>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-xs),1fr))", gap: "var(--space-2-5)" }}>
                  {[
                    { l: "Progresso", v: `${prog}%`, i: "square-check" },
                    { l: "Custo total", v: fmt(cT), i: "circle-dollar-sign" },
                    { l: "Receitas", v: fmt(rec), i: "chart-column" },
                    { l: "Lucro", v: fmt(lucro), i: "trending-up", c: lucro >= 0 ? "var(--status-success-text)" : "var(--status-danger)" },
                  ].map(k => (
                    <div key={k.l} style={{ background: "var(--surface-sunken)", borderRadius: "var(--radius-md)", padding: "var(--space-3)" }}>
                      <div style={{ fontSize: "var(--fs-micro)", color: "var(--text-muted)", marginBottom: "var(--space-1)", display: "flex", alignItems: "center", gap: "var(--space-1)" }}><Icon name={k.i} size={10} color={"var(--text-secondary)"} />{k.l}</div>
                      <div style={{ fontWeight: "var(--fw-extrabold)", fontSize: "var(--fs-p5-5)", color: k.c || "var(--text-primary)" }}>{k.v}</div>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--fs-caption)", color: "var(--text-muted)", marginBottom: "var(--space-1-5)" }}>
                    <span>Orçamento utilizado</span>
                    <span style={{ color: pOrc > 90 ? "var(--status-danger)" : "var(--text-primary)", fontWeight: "var(--fw-bold)" }}>{pOrc}% de {fmt(obra.orcamento)}</span>
                  </div>
                  <ProgressBar value={pOrc} color={pOrc > 90 ? "var(--status-danger)" : pOrc > 70 ? "var(--status-warning)" : "var(--status-success)"} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-xs),1fr))", gap: "var(--space-2-5)" }}>
                  {[{ l: "Insumos", v: cIns, i: "box" }, { l: "Máquinas", v: cMaq, i: "construction" }, { l: "Mão de obra", v: cMO, i: "users" }].map(k => (
                    <div key={k.l} style={{ background: "var(--accent-soft)", border: "var(--border-w) solid var(--accent-border)", borderRadius: "var(--radius-md)", padding: "var(--space-3)" }}>
                      <div style={{ fontSize: "var(--fs-micro)", color: "var(--text-muted)", marginBottom: "var(--space-1)", display: "flex", alignItems: "center", gap: "var(--space-1)" }}><Icon name={k.i} size={10} color={"var(--accent)"} />{k.l}</div>
                      <div style={{ fontWeight: "var(--fw-bold)", fontSize: "var(--fs-p6)", color: "var(--text-primary)" }}>{fmt(k.v)}</div>
                      <div style={{ fontSize: "var(--fs-micro)", color: "var(--text-secondary)" }}>{cT > 0 ? Math.round(k.v / cT * 100) : 0}% do total</div>
                    </div>
                  ))}
                </div>
                {ets.length > 0 && (
                  <div>
                    <h3 style={{ margin: "0 0 var(--space-3)", font: "var(--type-card-title)", fontSize: "var(--fs-p4)" }}>Etapas</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                      {ets.map(e => {
                        const tp = tiposEtapa.find(t => t.id === e.tipoEtapaId);
                        const at = isAtrasada(e);
                        return (
                          <div key={e.id} style={{ display: "flex", alignItems: "center", gap: "var(--space-2-5)" }}>
                            <div style={{ width: "var(--space-5)", height: "var(--space-5)", borderRadius: "var(--radius-sm-inner)", background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name={tp?.icon || "square-check"} size={11} color={"var(--accent)"} /></div>
                            <span style={{ fontSize: "var(--fs-caption)", color: at ? "var(--status-danger)" : "var(--text-muted)", width: "var(--col-min-sm)", flexShrink: 0, fontWeight: at ? 600 : 400 }}>{tp?.nome}</span>
                            <div style={{ flex: 1 }}><ProgressBar value={e.progresso} color={at ? "var(--status-danger)" : e.progresso === 100 ? "var(--status-success)" : "var(--accent)"} /></div>
                            <span style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)", width: "var(--space-8)", textAlign: "right" }}>{e.progresso}%</span>
                            {at && <Badge size="sm" tone="error">Atraso</Badge>}
                            {e.orcamento > 0 && <span style={{ fontSize: "var(--fs-micro)", color: "var(--text-secondary)" }}>{fmt(e.orcamento)}</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
