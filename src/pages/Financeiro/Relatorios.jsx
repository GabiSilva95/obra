import { useEffect, useState } from "react";
import { Button, DataTable, Input, SegmentedTabs, Select } from "../../../design-system";
import { fmt, today } from "../../utils/helpers";
import { exportCsv, exportPdf } from "../../utils/export";
import { avisarErro } from "../../utils/aviso";
import { dataBR, tabelaHtml } from "./util";

const FAIXAS = [["aVencer", "A vencer"], ["f1_30", "1 a 30 dias"], ["f31_60", "31 a 60 dias"], ["f61_90", "61 a 90 dias"], ["f90", "Mais de 90 dias"]];

function Envelhecimento({ ctx, tipo }) {
  const [r, setR] = useState(null);
  useEffect(() => { setR(null); ctx.api.get(`/financeiro/relatorios/envelhecimento?tipo=${tipo}`).then(setR).catch(e => avisarErro(e.message)); }, [tipo]); // eslint-disable-line
  if (!r) return <span style={{ color: "var(--text-secondary)" }}>Carregando…</span>;
  const pagar = tipo === "pagar";
  const titulo = `Envelhecimento de contas a ${pagar ? "pagar" : "receber"}`;
  const cab = [pagar ? "Fornecedor" : "Cliente", ...FAIXAS.map(f => f[1]), "Total"];
  const linhas = [...r.linhas.map(l => [l.nome, ...FAIXAS.map(([k]) => l[k]), l.total]), ["Total", ...FAIXAS.map(([k]) => r.totais[k]), r.totais.total]];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div style={{ display: "flex", gap: "var(--space-2)" }}>
        <Button size="sm" variant="secondary" iconLeft="download" onClick={() => exportCsv(`envelhecimento-${tipo}.csv`, linhas, cab)}>CSV</Button>
        <Button size="sm" variant="secondary" iconLeft="download" onClick={() => exportPdf(titulo, tabelaHtml(titulo, `Posição em ${dataBR(r.hoje)}. Saldo em aberto por faixa de atraso.`, cab, linhas.map(l => l.map((c, i) => (i === 0 ? c : fmt(c))))))}>PDF</Button>
      </div>
      <DataTable minWidth={880} rows={r.linhas} rowKey={l => l.nome} empty={`Nenhuma conta a ${pagar ? "pagar" : "receber"} em aberto.`} columns={[
        { key: "nome", label: pagar ? "Fornecedor" : "Cliente", render: l => <span style={{ display: "flex", flexDirection: "column" }}><b>{l.nome}</b><span style={{ fontSize: "var(--fs-p6)", color: "var(--text-secondary)" }}>{l.quantidade} título{l.quantidade === 1 ? "" : "s"}</span></span> },
        ...FAIXAS.map(([k, rotulo]) => ({ key: k, label: rotulo, align: "right", render: l => (l[k] ? <span style={{ color: k === "aVencer" ? "inherit" : "var(--status-danger)" }}>{fmt(l[k])}</span> : "—") })),
        { key: "total", label: "Total", align: "right", render: l => <b>{fmt(l.total)}</b> },
      ]} />
      {r.linhas.length > 0 && <span style={{ color: "var(--text-secondary)" }}>Total em aberto: <b style={{ color: "var(--text-primary)" }}>{fmt(r.totais.total)}</b>, dos quais {fmt(r.totais.total - r.totais.aVencer)} já vencidos.</span>}
    </div>
  );
}

function ExtratoConta({ ctx }) {
  const { api, base } = ctx;
  const [f, setF] = useState({ contaId: base.contas[0]?.id ?? "", de: `${today().slice(0, 7)}-01`, ate: today() });
  const [r, setR] = useState(null);
  const set = k => e => setF(x => ({ ...x, [k]: e.target.value }));
  useEffect(() => {
    if (!f.contaId || !f.de || !f.ate) return;
    api.get(`/financeiro/contas/${f.contaId}/movimentos?de=${f.de}&ate=${f.ate}`).then(setR).catch(e => avisarErro(e.message));
  }, [f.contaId, f.de, f.ate]); // eslint-disable-line
  if (!base.contas.length) return <span style={{ color: "var(--text-secondary)" }}>Cadastre uma conta para ver o extrato.</span>;
  const cab = ["Data", "Tipo", "Descrição", "Pessoa", "Valor", "Saldo"];
  const linhas = r ? r.movimentos.map(m => [dataBR(m.data), m.tipo, m.descricao, m.pessoa || "", m.valor, m.saldo]) : [];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-sm),1fr))", gap: "var(--space-3)", alignItems: "end" }}>
        <Select label="Conta" value={f.contaId} onChange={set("contaId")}>{base.contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</Select>
        <Input label="De" type="date" value={f.de} onChange={set("de")} />
        <Input label="Até" type="date" value={f.ate} onChange={set("ate")} />
        <span style={{ display: "flex", gap: "var(--space-2)" }}>
          <Button size="sm" variant="secondary" iconLeft="download" disabled={!r} onClick={() => exportCsv("extrato-da-conta.csv", linhas, cab)}>CSV</Button>
          <Button size="sm" variant="secondary" iconLeft="download" disabled={!r} onClick={() => exportPdf(`Extrato: ${r.conta.nome}`, tabelaHtml(`Extrato: ${r.conta.nome}`, `${dataBR(r.de)} a ${dataBR(r.ate)}. Saldo anterior ${fmt(r.saldoAnterior)}, saldo final ${fmt(r.saldoFinal)}.`, cab, linhas.map(l => [l[0], l[1], l[2], l[3], fmt(l[4]), fmt(l[5])])))}>PDF</Button>
        </span>
      </div>
      {r && (
        <>
          <DataTable minWidth={760} rows={r.movimentos} rowKey={(m, i) => i} empty="Nenhum movimento no período." columns={[
            { key: "d", label: "Data", render: m => dataBR(m.data) },
            { key: "t", label: "Tipo", render: m => m.tipo },
            { key: "ds", label: "Descrição", render: m => <span style={{ display: "flex", flexDirection: "column" }}><b>{m.descricao}</b>{m.pessoa && <span style={{ fontSize: "var(--fs-p6)", color: "var(--text-secondary)" }}>{m.pessoa}</span>}</span> },
            { key: "v", label: "Valor", align: "right", render: m => <b style={{ color: m.valor >= 0 ? "var(--status-success-text)" : "var(--status-danger)" }}>{fmt(m.valor)}</b> },
            { key: "s", label: "Saldo", align: "right", render: m => fmt(m.saldo) },
          ]} />
          <span style={{ color: "var(--text-secondary)" }}>Saldo anterior {fmt(r.saldoAnterior)} · saldo final <b style={{ color: "var(--text-primary)" }}>{fmt(r.saldoFinal)}</b>.</span>
        </>
      )}
    </div>
  );
}

/** Relatórios do financeiro: envelhecimento de contas e extrato de cada conta no sistema. */
export default function Relatorios({ ctx }) {
  const [aba, setAba] = useState("pagar");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <SegmentedTabs variant="light" value={aba} onChange={setAba} tabs={[{ value: "pagar", label: "Envelhecimento a pagar" }, { value: "receber", label: "Envelhecimento a receber" }, { value: "extrato", label: "Extrato da conta" }]} />
      {(aba === "pagar" || aba === "receber") && <Envelhecimento ctx={ctx} tipo={aba} />}
      {aba === "extrato" && <ExtratoConta ctx={ctx} />}
    </div>
  );
}
