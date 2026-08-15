import { useState } from "react";
import { C, F } from "../constants/tokens";
import { fmt, calcProg, calcIns, calcMaq, calcMO, calcDesp, isAtrasada } from "../utils/helpers";
import { exportCsv, exportPdf } from "../utils/export";
import { Icon, Badge, Bar, Card, Hdr, DSel, Btn } from "../components/ui";

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
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.dim, marginBottom: 6 }}>
        <span>{fmtDate(datas[0])}</span>
        <span style={{ color: C.orange, fontWeight: 700 }}>Hoje</span>
        <span>{fmtDate(datas[datas.length - 1])}</span>
      </div>
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {etapas.map(e => {
            const tp = tiposEtapa.find(t => t.id === e.tipoEtapaId);
            const left = ((new Date(e.dataInicioP) - inicio) / 86400000 / totalDias) * 100;
            const width = Math.max(1, ((new Date(e.dataFimP) - new Date(e.dataInicioP)) / 86400000 / totalDias) * 100);
            const at = isAtrasada(e);
            const cor = e.status === "Concluída" ? "#22c55e" : at ? "#ef4444" : C.orange;
            return (
              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 140, fontSize: 10, color: at ? "#ef4444" : C.muted, ...F, flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {tp?.nome || "Etapa"}
                </div>
                <div style={{ flex: 1, position: "relative", height: 18, background: "rgba(255,255,255,.04)", borderRadius: 4 }}>
                  <div style={{ position: "absolute", left: `${left}%`, width: `${width}%`, height: "100%", background: cor, borderRadius: 4, opacity: 0.8, minWidth: 4 }} title={`${fmtDate(e.dataInicioP)} → ${fmtDate(e.dataFimP)}`} />
                  {e.progresso > 0 && e.progresso < 100 && (
                    <div style={{ position: "absolute", left: `${left}%`, width: `${width * e.progresso / 100}%`, height: "100%", background: cor, borderRadius: 4, minWidth: 2 }} />
                  )}
                </div>
                <span style={{ fontSize: 10, color: C.dim, width: 28, textAlign: "right", flexShrink: 0 }}>{e.progresso}%</span>
              </div>
            );
          })}
        </div>
        {/* Today line */}
        <div style={{ position: "absolute", top: 0, bottom: 0, left: `calc(140px + 8px + ${todayX}% * (100% - 140px - 8px - 36px) / 100)`, width: 1, background: C.orange, opacity: 0.6, pointerEvents: "none" }} />
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
      return `<tr><td>${obra.nome}</td><td>${obra.status}</td><td>${prog}%</td><td>${fmt(cT)}</td><td>${fmt(obra.orcamento)}</td><td>${fmt(rec)}</td><td style="color:${rec - cT >= 0 ? "green" : "red"}">${fmt(rec - cT)}</td></tr>`;
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
      <Hdr
        title="Relatórios"
        action={
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <DSel value={filtro} onChange={e => setFiltro(e.target.value)}>
              <option value="all">Todas as obras</option>
              {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
            </DSel>
            <Btn v="outline" onClick={handleExportCsv} sx={{ fontSize: 11, padding: "6px 12px" }}>
              <Icon n="upload" size={12} />CSV
            </Btn>
            <Btn v="outline" onClick={handleExportPdf} sx={{ fontSize: 11, padding: "6px 12px" }}>
              <Icon n="upload" size={12} />PDF
            </Btn>
          </div>
        }
      />

      {/* Vista tabs */}
      <div style={{ display: "flex", gap: 2, marginBottom: 20, background: "rgba(255,255,255,.03)", borderRadius: 12, padding: 4, border: `1px solid ${C.borderLight}` }}>
        {[{ id: "resumo", label: "Resumo", icon: "barchart" }, { id: "gantt", label: "Gantt", icon: "clock" }].map(v => (
          <button key={v.id} onClick={() => setVista(v.id)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 12px", borderRadius: 9, border: "none", cursor: "pointer", background: vista === v.id ? "rgba(249,115,22,.12)" : "transparent", color: vista === v.id ? C.orange : C.muted, fontSize: 11, fontWeight: vista === v.id ? 700 : 500, transition: "all .15s", ...F }}>
            <Icon n={v.icon} size={12} color={vista === v.id ? C.orange : C.dim} />{v.label}
          </button>
        ))}
      </div>

      {vista === "gantt" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filt.map(obra => {
            const ets = etapasObra.filter(e => e.obraId === obra.id).sort((a, b) => new Date(a.dataInicioP) - new Date(b.dataInicioP));
            return (
              <Card key={obra.id}>
                <div style={{ fontWeight: 700, fontSize: 13, color: C.text, marginBottom: 16, ...F }}>{obra.nome}</div>
                {ets.length ? <GanttBar etapas={ets} tiposEtapa={tiposEtapa} /> : <div style={{ fontSize: 11, color: C.dim }}>Sem etapas cadastradas</div>}
              </Card>
            );
          })}
        </div>
      )}

      {vista === "resumo" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
            const sc = { Concluída: "green", "Em andamento": "orange", Pausada: "yellow" };

            return (
              <Card key={obra.id}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <h2 style={{ fontSize: 15, fontWeight: 800, color: C.text, margin: 0, ...F, letterSpacing: "-0.03em" }}>{obra.nome}</h2>
                  <div style={{ display: "flex", gap: 7 }}>
                    {atrs.length > 0 && <Badge v="red"><Icon n="alert" size={9} />{atrs.length} atrasada{atrs.length > 1 ? "s" : ""}</Badge>}
                    <Badge v={sc[obra.status] || "default"} dot>{obra.status}</Badge>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
                  {[
                    { l: "Progresso", v: `${prog}%`, i: "checklist" },
                    { l: "Custo Total", v: fmt(cT), i: "money" },
                    { l: "Receitas", v: fmt(rec), i: "barchart" },
                    { l: "Lucro", v: fmt(lucro), i: "trending", c: lucro >= 0 ? "#22c55e" : "#ef4444" },
                  ].map(k => (
                    <div key={k.l} style={{ background: "rgba(255,255,255,.025)", borderRadius: 10, padding: 11 }}>
                      <div style={{ fontSize: 10, color: C.muted, marginBottom: 3, display: "flex", alignItems: "center", gap: 4 }}><Icon n={k.i} size={10} color={C.dim} />{k.l}</div>
                      <div style={{ fontWeight: 800, fontSize: 13, color: k.c || C.text, ...F }}>{k.v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.muted, marginBottom: 6 }}>
                    <span>Orçamento utilizado</span>
                    <span style={{ color: pOrc > 90 ? C.red : C.text, fontWeight: 700 }}>{pOrc}% — {fmt(obra.orcamento)}</span>
                  </div>
                  <Bar val={pOrc} color={pOrc > 90 ? C.red : pOrc > 70 ? C.yellow : C.green} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 9, marginBottom: ets.length ? 16 : 0 }}>
                  {[{ l: "Insumos", v: cIns, i: "cube" }, { l: "Máquinas", v: cMaq, i: "excavator" }, { l: "Mão de Obra", v: cMO, i: "people" }].map(k => (
                    <div key={k.l} style={{ background: C.orangeDim, border: "1px solid rgba(249,115,22,.08)", borderRadius: 10, padding: 11 }}>
                      <div style={{ fontSize: 10, color: C.muted, marginBottom: 3, display: "flex", alignItems: "center", gap: 4 }}><Icon n={k.i} size={10} color={C.orange} />{k.l}</div>
                      <div style={{ fontWeight: 700, fontSize: 12, color: C.text, ...F }}>{fmt(k.v)}</div>
                      <div style={{ fontSize: 10, color: C.dim }}>{cT > 0 ? Math.round(k.v / cT * 100) : 0}% do total</div>
                    </div>
                  ))}
                </div>
                {ets.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 9, marginTop: 4 }}>Etapas</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                      {ets.map(e => {
                        const tp = tiposEtapa.find(t => t.id === e.tipoEtapaId);
                        const at = isAtrasada(e);
                        return (
                          <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 20, height: 20, borderRadius: 6, background: C.orangeDim, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon n={tp?.icon || "checklist"} size={11} color={C.orange} /></div>
                            <span style={{ fontSize: 11, color: at ? C.red : C.muted, width: 155, flexShrink: 0, ...F, fontWeight: at ? 600 : 400 }}>{tp?.nome}</span>
                            <div style={{ flex: 1 }}><Bar val={e.progresso} color={at ? C.red : e.progresso === 100 ? C.green : C.orange} /></div>
                            <span style={{ fontSize: 11, color: C.muted, width: 26, textAlign: "right" }}>{e.progresso}%</span>
                            {at && <Badge v="red">Atraso</Badge>}
                            {e.orcamento > 0 && <span style={{ fontSize: 10, color: C.dim }}>{fmt(e.orcamento)}</span>}
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
