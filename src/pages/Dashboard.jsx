import { useState } from "react";
import { C, F } from "../constants/tokens";
import { fmt, calcProg, calcIns, calcMaq, calcMO, isAtrasada } from "../utils/helpers";
import { Icon, Badge, Bar, Card, Hdr, DSel } from "../components/ui";

export default function Dashboard({ data, userId, isMaster }) {
  const { obras, maquinas, funcionarios, insumos, estoques, alocacoes, funcionarioObra, etapasObra, users, tiposEtapa } = data;
  const [filtro, setFiltro] = useState("all");
  const user = users.find(u => u.id === userId);
  const acess = isMaster ? obras : obras.filter(o => (user?.obrasAcesso || []).includes(o.id));
  const filt = filtro === "all" ? acess : acess.filter(o => o.id === parseInt(filtro));
  const totAtras = filt.reduce((s, o) => s + etapasObra.filter(e => e.obraId === o.id && isAtrasada(e)).length, 0);
  const kpis = [
    { l: "Obras Ativas", v: filt.filter(o => o.status === "Em andamento").length, i: "building", col: C.orange, acc: true },
    { l: "Etapas Atrasadas", v: totAtras, i: "alert", col: totAtras > 0 ? C.red : C.green, warn: totAtras > 0 },
    { l: "Custo Total", v: fmt(filt.reduce((s, o) => s + calcIns(o.id, estoques, insumos) + calcMaq(o.id, alocacoes, maquinas) + calcMO(o.id, funcionarioObra, funcionarios), 0)), i: "money", col: C.blue },
    { l: "Estoque Disponível", v: fmt(filt.reduce((s, o) => s + estoques.filter(e => e.obraId === o.id).reduce((ss, e) => { const i = insumos.find(x => x.id === e.insumoId); return ss + (i ? i.custoUnit * (e.quantEntrada - e.quantUtilizado) : 0); }, 0), 0)), i: "warehouse", col: "#a78bfa" },
  ];

  return (
    <div>
      <Hdr
        title="Dashboard"
        sub={new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        action={
          <DSel value={filtro} onChange={e => setFiltro(e.target.value)}>
            <option value="all">Todas as obras</option>
            {acess.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
          </DSel>
        }
      />
      {totAtras > 0 && (
        <div style={{ marginBottom: 18, background: "rgba(239,68,68,.06)", border: "1px solid rgba(239,68,68,.18)", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <Icon n="alert" size={18} color={C.red} />
          <div>
            <div style={{ fontWeight: 700, color: C.red, fontSize: 13, ...F }}>{totAtras} etapa{totAtras > 1 ? "s" : ""} atrasada{totAtras > 1 ? "s" : ""}!</div>
            <div style={{ fontSize: 11, color: "rgba(239,68,68,.6)", ...F }}>Etapas fora do prazo previsto.</div>
          </div>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 22 }}>
        {kpis.map(k => (
          <Card key={k.l} style={{ padding: 16 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: `${k.col}18`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
              <Icon n={k.i} size={16} color={k.col} />
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: k.warn ? C.red : k.acc ? C.orange : C.text, ...F, letterSpacing: "-0.04em", marginBottom: 3 }}>{k.v}</div>
            <div style={{ fontSize: 11, color: C.muted, ...F }}>{k.l}</div>
          </Card>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(290px,1fr))", gap: 12 }}>
        {filt.map(obra => {
          const et = etapasObra.filter(e => e.obraId === obra.id);
          const prog = calcProg(obra.id, etapasObra);
          const atrs = et.filter(e => isAtrasada(e));
          const ea = et.find(e => e.progresso > 0 && e.progresso < 100);
          const cT = calcIns(obra.id, estoques, insumos) + calcMaq(obra.id, alocacoes, maquinas) + calcMO(obra.id, funcionarioObra, funcionarios);
          const pOrc = Math.min(100, Math.round(cT / (obra.orcamento || 1) * 100));
          const sc = { Concluída: "green", "Em andamento": "orange", Pausada: "yellow" };
          return (
            <Card key={obra.id}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: C.text, ...F, letterSpacing: "-0.02em", marginBottom: 3 }}>{obra.nome}</div>
                  <div style={{ fontSize: 11, color: C.muted, display: "flex", alignItems: "center", gap: 4 }}><Icon n="pin" size={10} color={C.dim} />{obra.local}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                  <Badge v={sc[obra.status] || "default"} dot>{obra.status}</Badge>
                  {atrs.length > 0 && <Badge v="red" dot>{atrs.length} atraso{atrs.length > 1 ? "s" : ""}</Badge>}
                </div>
              </div>
              {[{ l: "Progresso", v: prog, c: C.orange }, { l: "Orçamento", v: pOrc, c: pOrc > 90 ? C.red : pOrc > 70 ? C.yellow : C.green }].map(b => (
                <div key={b.l} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 10, color: C.muted }}>{b.l}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: b.v > 90 && b.l === "Orçamento" ? C.red : C.text }}>{b.v}%</span>
                  </div>
                  <Bar val={b.v} color={b.c} />
                </div>
              ))}
              <div style={{ borderTop: `1px solid ${C.borderLight}`, paddingTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 11, color: C.muted }}>
                <span>Custo: <b style={{ color: C.text }}>{fmt(cT)}</b></span>
                <span>Meta: <b style={{ color: C.text }}>{fmt(obra.orcamento)}</b></span>
                {ea && (() => { const tp = tiposEtapa.find(t => t.id === ea.tipoEtapaId); return <span style={{ gridColumn: "span 2", display: "flex", alignItems: "center", gap: 4 }}><Icon n={tp?.icon || "checklist"} size={10} color={C.orange} />Etapa: <b style={{ color: C.text }}>{tp?.nome}</b></span>; })()}
              </div>
              {atrs.length > 0 && (
                <div style={{ marginTop: 10, background: "rgba(239,68,68,.05)", border: "1px solid rgba(239,68,68,.12)", borderRadius: 9, padding: "9px 11px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.red, marginBottom: 5, display: "flex", alignItems: "center", gap: 5 }}><Icon n="alert" size={11} color={C.red} />Atrasadas</div>
                  {atrs.map(e => { const tp = tiposEtapa.find(t => t.id === e.tipoEtapaId); return <div key={e.id} style={{ fontSize: 11, color: "rgba(239,68,68,.65)", marginBottom: 2 }}>· {tp?.nome} — {e.dataFimP}</div>; })}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
