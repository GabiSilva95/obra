import { useState, useMemo } from "react";
import { C, F } from "../constants/tokens";
import { isAtrasada, calcIns, calcMaq, calcMO, fmt } from "../utils/helpers";
import Icon from "./ui/Icon";

function calcNotifs(data) {
  const { obras, etapasObra, tiposEtapa, estoques, insumos, alocacoes, maquinas, funcionarioObra, funcionarios } = data;
  const notifs = [];

  // Etapas atrasadas
  etapasObra.forEach(e => {
    if (isAtrasada(e)) {
      const obra = obras.find(o => o.id === e.obraId);
      const tp = tiposEtapa.find(t => t.id === e.tipoEtapaId);
      notifs.push({ id: `et-${e.id}`, tipo: "danger", icone: "alert", titulo: "Etapa atrasada", msg: `${tp?.nome || "Etapa"} em "${obra?.nome}"`, link: "/app/obras" });
    }
  });

  // Orçamento >90%
  obras.forEach(o => {
    const cT = calcIns(o.id, estoques, insumos) + calcMaq(o.id, alocacoes, maquinas) + calcMO(o.id, funcionarioObra, funcionarios);
    const pct = o.orcamento > 0 ? (cT / o.orcamento) * 100 : 0;
    if (pct >= 90) {
      notifs.push({ id: `orc-${o.id}`, tipo: pct >= 100 ? "danger" : "warning", icone: "barchart", titulo: pct >= 100 ? "Orçamento estourado" : "Orçamento crítico", msg: `"${o.nome}" — ${Math.round(pct)}% utilizado (${fmt(cT)} de ${fmt(o.orcamento)})`, link: "/app/relatorios" });
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

const TIPO_COLORS = { danger: "#ef4444", warning: "#f59e0b", info: C.orange };

export default function Notificacoes({ data }) {
  const [open, setOpen] = useState(false);
  const notifs = useMemo(() => (data ? calcNotifs(data) : []), [data]);
  const count = notifs.length;

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ background: open ? "rgba(249,115,22,.1)" : "rgba(255,255,255,.04)", border: `1px solid ${open ? "rgba(249,115,22,.3)" : C.border}`, borderRadius: 10, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative", transition: "all .15s", flexShrink: 0 }}
      >
        <Icon n="bell" size={16} color={open ? C.orange : C.muted} />
        {count > 0 && (
          <div style={{ position: "absolute", top: -4, right: -4, width: 17, height: 17, borderRadius: "50%", background: count > 0 ? "#ef4444" : C.orange, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "#fff", border: `2px solid ${C.bg}`, ...F }}>
            {Math.min(count, 9)}{count > 9 ? "+" : ""}
          </div>
        )}
      </button>

      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 98 }} onClick={() => setOpen(false)} />
          <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 340, background: "#111", border: `1px solid ${C.border}`, borderRadius: 14, boxShadow: "0 24px 60px rgba(0,0,0,.8)", zIndex: 99, overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.borderLight}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.text, ...F }}>Notificações</span>
              {count > 0 && <span style={{ fontSize: 10, background: "#ef444420", color: "#ef4444", border: "1px solid #ef444430", borderRadius: 6, padding: "2px 8px", fontWeight: 700 }}>{count} alerta{count !== 1 ? "s" : ""}</span>}
            </div>
            <div style={{ maxHeight: 380, overflowY: "auto" }}>
              {count === 0 ? (
                <div style={{ padding: "32px 16px", textAlign: "center", color: C.dim }}>
                  <Icon n="check" size={24} color={C.border} />
                  <div style={{ fontSize: 12, marginTop: 8 }}>Tudo certo por aqui!</div>
                </div>
              ) : notifs.map(n => (
                <div key={n.id} style={{ padding: "12px 16px", borderBottom: `1px solid ${C.borderLight}`, display: "flex", gap: 11, alignItems: "flex-start" }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: `${TIPO_COLORS[n.tipo]}14`, border: `1px solid ${TIPO_COLORS[n.tipo]}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon n={n.icone} size={13} color={TIPO_COLORS[n.tipo]} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: TIPO_COLORS[n.tipo], marginBottom: 2 }}>{n.titulo}</div>
                    <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.4 }}>{n.msg}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
