import { useEffect, useState } from "react";
import { Banner, Button, Card, DataTable, StatCard } from "../../../design-system";
import { fmt } from "../../utils/helpers";
import { avisarErro } from "../../utils/aviso";

const Linha = ({ rotulo, valor, destaque, qtd }) => (
  <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-3)", fontSize: "var(--fs-p5-5)" }}>
    <span style={{ color: "var(--text-secondary)" }}>{rotulo}{qtd ? ` (${qtd})` : ""}</span>
    <b style={{ color: destaque || "var(--text-primary)" }}>{fmt(valor)}</b>
  </div>
);

/** Panorama do caixa: saldo das contas e o que vence, em contas a pagar e a receber. */
export default function VisaoGeral({ ctx, irPara }) {
  const { api, base } = ctx;
  const [r, setR] = useState(null);
  useEffect(() => { api.get("/financeiro/resumo").then(setR).catch(e => avisarErro(e.message)); }, [base]); // eslint-disable-line

  if (!r) return <span style={{ color: "var(--text-secondary)" }}>Carregando…</span>;
  const bloco = (titulo, tipo, d, cor) => (
    <Card title={titulo} action={<Button size="sm" variant="secondary" onClick={() => irPara(tipo)}>Ver todas</Button>}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        <Linha rotulo="Vencidas" qtd={d.qtdVencido} valor={d.vencido} destaque={d.vencido > 0 ? "var(--status-danger)" : undefined} />
        <Linha rotulo="Vencem hoje" valor={d.hoje} />
        <Linha rotulo="Próximos 7 dias" valor={d.prox7} />
        <Linha rotulo="De 8 a 30 dias" valor={d.prox30} />
        <div style={{ borderTop: "var(--border-w) solid var(--border-subtle)", paddingTop: "var(--space-2)" }}><Linha rotulo="Total em aberto" qtd={d.qtd} valor={d.aberto} destaque={cor} /></div>
        {d.qtdVencido > 0 && <Button size="sm" variant="secondary" onClick={() => irPara(tipo, { status: "vencido" })}>Ver vencidas</Button>}
      </div>
    </Card>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      {!r.contas.length && (
        <Banner tone="info" title="Comece cadastrando uma conta" action={<Button size="sm" onClick={() => irPara("contas")}>Cadastrar conta</Button>}>
          Contas bancárias e o caixa recebem os pagamentos e recebimentos. Com elas cadastradas, o saldo e o fluxo de caixa passam a valer.
        </Banner>
      )}
      {(r.pendencias.compras + r.pendencias.diarias + r.pendencias.locacoes) > 0 && (
        <Banner tone="warning" title="Há pagamentos sem conta a pagar" action={<Button size="sm" variant="secondary" onClick={() => irPara("pendencias")}>Ver pendências</Button>}>
          {[r.pendencias.compras && `${r.pendencias.compras} compra(s) entregue(s)`, r.pendencias.diarias && `diárias de ${r.pendencias.diarias} colaborador(es)`, r.pendencias.locacoes && `${r.pendencias.locacoes} locação(ões) de máquina`].filter(Boolean).join(", ")} ainda não viraram conta a pagar.
        </Banner>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-md),1fr))", gap: "var(--space-6)" }}>
        <StatCard value={fmt(r.saldoTotal)} label="Saldo em contas" color={r.saldoTotal >= 0 ? "var(--stat-1)" : "var(--status-danger)"} />
        <StatCard value={fmt(r.pagar.aberto)} label="A pagar em aberto" color="var(--stat-4)" />
        <StatCard value={fmt(r.receber.aberto)} label="A receber em aberto" color="var(--stat-3)" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-lg),1fr))", gap: "var(--space-6)" }}>
        {bloco("Contas a pagar", "pagar", r.pagar, "var(--stat-4)")}
        {bloco("Contas a receber", "receber", r.receber, "var(--stat-3)")}
      </div>
      {r.contas.length > 0 && (
        <Card title="Saldo por conta">
          <DataTable dense minWidth={0} rows={r.contas} rowKey={c => c.id} columns={[
            { key: "nome", label: "Conta", render: c => <b>{c.nome}</b> },
            { key: "saldo", label: "Saldo", align: "right", render: c => <b style={{ color: c.saldo >= 0 ? "var(--status-success-text)" : "var(--status-danger)" }}>{fmt(c.saldo)}</b> },
          ]} />
        </Card>
      )}
    </div>
  );
}
