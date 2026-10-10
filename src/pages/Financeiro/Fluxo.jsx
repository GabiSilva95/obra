import { useEffect, useMemo, useState } from "react";
import { Banner, Button, DataTable, Input, Select, StatCard } from "../../../design-system";
import { PageActions } from "../../components/PageActions";
import { fmt, today } from "../../utils/helpers";
import { exportCsv } from "../../utils/export";
import { avisarErro } from "../../utils/aviso";
import { somarDias } from "../../../server/utils/datas.js";
import { dataBR } from "./util";

const rotuloPeriodo = (p, agrupar) => {
  if (agrupar === "dia") return dataBR(p.inicio);
  if (agrupar === "mes") return new Date(`${p.chave}T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return `${dataBR(p.inicio).slice(0, 5)} a ${dataBR(p.fim).slice(0, 5)}`;
};

/**
 * Fluxo de caixa de verdade: o que entrou e saiu (realizado) e o que ainda vai entrar e sair (previsto,
 * pelo vencimento do saldo de cada conta em aberto). O que já venceu e não foi pago aparece como atraso.
 */
export default function Fluxo({ ctx }) {
  const { api, base, data } = ctx;
  const [f, setF] = useState({ de: `${today().slice(0, 7)}-01`, ate: somarDias(today(), 90), agrupar: "semana", contaId: "", obraId: "", centroCustoId: "" });
  const [r, setR] = useState(null);
  const [carregadoPara, setCarregadoPara] = useState(null);
  const set = k => e => setF(x => ({ ...x, [k]: e.target.value }));

  const consulta = useMemo(() => {
    const p = new URLSearchParams({ de: f.de, ate: f.ate, agrupar: f.agrupar });
    for (const k of ["contaId", "obraId", "centroCustoId"]) if (f[k]) p.set(k, f[k]);
    return p.toString();
  }, [f]);
  useEffect(() => {
    if (!f.de || !f.ate) return;
    let vivo = true;
    api.get(`/financeiro/fluxo?${consulta}`).then(x => { if (vivo) { setR(x); setCarregadoPara(consulta); } }).catch(e => { if (vivo) avisarErro(e.message); });
    return () => { vivo = false; };
  }, [consulta]); // eslint-disable-line

  const carregando = carregadoPara !== consulta;
  const negativo = r?.periodos.find(p => p.acumulado < 0);
  const cor = v => (v >= 0 ? "var(--status-success-text)" : "var(--status-danger)");
  const exportar = () => exportCsv("fluxo-de-caixa.csv", r.periodos.map(p => [rotuloPeriodo(p, r.agrupar), p.entradasReais, p.saidasReais, p.entradasPrev, p.saidasPrev, p.saldo, p.acumulado]),
    ["Período", "Entradas realizadas", "Saídas realizadas", "Entradas previstas", "Saídas previstas", "Saldo do período", "Saldo acumulado"]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <PageActions><Button variant="secondary" size="sm" iconLeft="download" disabled={!r} onClick={exportar}>CSV</Button></PageActions>
      <p style={{ color: "var(--text-secondary)" }}>Realizado é o que já foi pago ou recebido, na data da baixa. Previsto é o saldo das contas em aberto, no vencimento. Contas vencidas e não pagas entram no saldo como atraso.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-sm),1fr))", gap: "var(--space-3)", alignItems: "end" }}>
        <Input label="De" type="date" value={f.de} onChange={set("de")} />
        <Input label="Até" type="date" value={f.ate} onChange={set("ate")} />
        <Select label="Agrupar por" value={f.agrupar} onChange={set("agrupar")}>
          <option value="dia">Dia</option><option value="semana">Semana</option><option value="mes">Mês</option>
        </Select>
        <Select label="Conta" value={f.contaId} onChange={set("contaId")}>
          <option value="">Todas as contas</option>
          {base.contas.filter(c => c.ativa).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </Select>
        <Select label="Obra" value={f.obraId} onChange={set("obraId")}>
          <option value="">Todas</option>
          {data.obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </Select>
        <Select label="Centro de custo" value={f.centroCustoId} onChange={set("centroCustoId")}>
          <option value="">Todos</option>
          {base.centros.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </Select>
      </div>
      {f.contaId && <Banner tone="info">O saldo e o realizado são da conta escolhida. O previsto (contas em aberto) ainda não pertence a uma conta, então aparece inteiro.</Banner>}

      {r && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-md),1fr))", gap: "var(--space-4)" }}>
            <StatCard value={fmt(r.saldoInicial)} label={`Saldo em ${dataBR(new Date(new Date(`${r.de}T12:00:00`).getTime() - 86400000).toISOString().slice(0, 10))}`} color="var(--stat-1)" />
            <StatCard value={fmt(r.atrasado.saidas)} label="A pagar em atraso" color={r.atrasado.saidas > 0 ? "var(--status-danger)" : "var(--stat-4)"} />
            <StatCard value={fmt(r.atrasado.entradas)} label="A receber em atraso" color="var(--stat-3)" />
            <StatCard value={fmt(r.saldoFinal)} label={`Saldo projetado em ${dataBR(r.ate)}`} color={r.saldoFinal >= 0 ? "var(--stat-1)" : "var(--status-danger)"} />
          </div>
          {negativo && <Banner tone="danger" title="O caixa fica negativo">Em {rotuloPeriodo(negativo, r.agrupar)} o saldo projetado é {fmt(negativo.acumulado)}. Antecipe recebimentos ou negocie vencimentos.</Banner>}
          {carregando && <span style={{ color: "var(--text-secondary)" }}>Atualizando…</span>}
          <DataTable minWidth={900} rows={r.periodos} rowKey={p => p.chave} empty="Nenhum período." columns={[
            { key: "p", label: "Período", render: p => <b style={{ textTransform: "capitalize" }}>{rotuloPeriodo(p, r.agrupar)}{r.hoje >= p.inicio && r.hoje <= p.fim ? " · hoje" : ""}</b> },
            { key: "er", label: "Entradas", align: "right", render: p => (p.entradasReais ? <span style={{ color: "var(--status-success-text)", fontWeight: "var(--fw-semibold)" }}>{fmt(p.entradasReais)}</span> : "—") },
            { key: "sr", label: "Saídas", align: "right", render: p => (p.saidasReais ? <span style={{ color: "var(--status-danger)" }}>{fmt(p.saidasReais)}</span> : "—") },
            { key: "ep", label: "A receber", align: "right", render: p => (p.entradasPrev ? <span style={{ color: "var(--text-secondary)" }}>{fmt(p.entradasPrev)}</span> : "—") },
            { key: "sp", label: "A pagar", align: "right", render: p => (p.saidasPrev ? <span style={{ color: "var(--text-secondary)" }}>{fmt(p.saidasPrev)}</span> : "—") },
            { key: "s", label: "Saldo do período", align: "right", render: p => <b style={{ color: cor(p.saldo) }}>{fmt(p.saldo)}</b> },
            { key: "a", label: "Saldo acumulado", align: "right", render: p => <b style={{ color: cor(p.acumulado) }}>{fmt(p.acumulado)}</b> },
          ]} />
          <span style={{ color: "var(--text-secondary)", fontSize: "var(--fs-p5-5)" }}>
            Totais do período: entradas {fmt(r.totais.entradasReais)} · saídas {fmt(r.totais.saidasReais)} · a receber {fmt(r.totais.entradasPrev)} · a pagar {fmt(r.totais.saidasPrev)}.
          </span>
        </>
      )}
    </div>
  );
}
