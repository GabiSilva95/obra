import { useEffect, useState } from "react";
import { Badge, Banner, Button, Card, DataTable, SegmentedTabs, Tag } from "../../../design-system";
import { PageActions } from "../../components/PageActions";
import { fmt } from "../../utils/helpers";
import { avisarErro, confirmar } from "../../utils/aviso";
import { dataBR } from "./util";
import AcoesLinha from "./AcoesLinha";
import ImportarExtrato from "./ImportarExtrato";

/** Extrato x sistema de uma conta: o que já bateu, o que falta tratar e se o saldo fecha. */
export default function Conciliacao({ contaId, ctx, onVoltar }) {
  const { api, canWrite } = ctx;
  const [status, setStatus] = useState("pendente");
  const [c, setC] = useState(null);
  const [linha, setLinha] = useState(null);
  const [importando, setImportando] = useState(false);

  const carregar = async (st = status) => {
    try { setC(await api.get(`/financeiro/contas/${contaId}/conciliacao?status=${st}`)); } catch (e) { avisarErro(e.message); }
  };
  useEffect(() => { carregar(status); }, [status, contaId]); // eslint-disable-line

  const depois = async () => { setLinha(null); await Promise.all([carregar(), ctx.recarregarBase(), ctx.atualizarCompetencia()]); };
  const conciliarExatos = async () => {
    try { const r = await api.post(`/financeiro/contas/${contaId}/conciliar-exatos`); await depois(); if (!r.conciliados) avisarErro("Nenhuma sugestão exata para conciliar."); } catch (e) { avisarErro(e.message); }
  };
  const desfazer = async l => {
    if (!(await confirmar({ titulo: "Desfazer conciliação?", mensagem: "A linha volta para pendente. As baixas e lançamentos criados a partir dela continuam existindo.", confirmarRotulo: "Desfazer" }))) return;
    try { await api.post(`/financeiro/lancamentos/${l.id}/desfazer`); await depois(); } catch (e) { avisarErro(e.message); }
  };
  const aceitar = async (l, sug) => {
    try { await api.post(`/financeiro/lancamentos/${l.id}/conciliar`, { baixaIds: sug.baixaIds }); await depois(); } catch (e) { avisarErro(e.message); }
  };

  if (!c) return <span style={{ color: "var(--text-secondary)" }}>Carregando…</span>;
  const f = c.fechamento;
  const altas = c.sugestoes.filter(s => s.confianca === "alta").length;
  const sugDe = id => c.sugestoes.find(s => s.lancamentoId === id);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <PageActions>
        <Button variant="secondary" iconLeft="arrow-left" onClick={onVoltar}>Contas</Button>
        {canWrite && altas > 0 && status === "pendente" && <Button variant="secondary" iconLeft="check" onClick={conciliarExatos}>Conciliar {altas} exato{altas === 1 ? "" : "s"}</Button>}
        {canWrite && <Button iconLeft="cloud-upload" onClick={() => setImportando(true)}>Importar extrato</Button>}
      </PageActions>

      <h2 style={{ margin: 0, font: "var(--type-card-title)", fontSize: "var(--fs-h5)" }}>Conciliação: {c.conta.nome}</h2>
      {f ? (
        <Banner tone={f.diferenca === 0 ? "success" : "warning"} title={f.diferenca === 0 ? "O saldo fecha com o banco" : `Diferença de ${fmt(Math.abs(f.diferenca))} entre o extrato e o sistema`}>
          Em {dataBR(f.data)}: extrato {fmt(f.saldoExtrato)} · sistema {fmt(f.saldoSistema)}. Arquivo: {f.arquivo}.
          {f.diferenca !== 0 && ` Procure pagamentos e recebimentos ainda sem baixa, linhas pendentes ou lançamentos com data errada.`}
        </Banner>
      ) : <Banner tone="info" title="Importe um extrato para conferir o saldo">O arquivo OFX traz o saldo final do banco, que o sistema compara com o dele.</Banner>}

      <SegmentedTabs variant="light" value={status} onChange={setStatus} tabs={[{ value: "pendente", label: "Pendentes", count: c.contagens.pendentes }, { value: "conciliado", label: "Conciliados" }, { value: "ignorado", label: "Ignorados" }]} />

      <DataTable minWidth={760} rows={c.lancamentos} rowKey={l => l.id}
        empty={status === "pendente" ? "Nenhuma linha pendente. Importe o extrato do banco para começar." : "Nenhuma linha neste filtro."} columns={[
          { key: "data", label: "Data", render: l => dataBR(l.data) },
          { key: "descricao", label: "Extrato", render: l => l.descricao },
          { key: "valor", label: "Valor", align: "right", render: l => <b style={{ color: l.valor >= 0 ? "var(--status-success-text)" : "var(--status-danger)" }}>{fmt(l.valor)}</b> },
          { key: "sistema", label: "No sistema", render: l => {
            if (status === "pendente") {
              const s = sugDe(l.id);
              if (s) return <span style={{ display: "flex", flexDirection: "column", gap: "var(--space-0-5)" }}><span>{s.baixas.map(b => b.titulo).join(" + ")}</span><span style={{ fontSize: "var(--fs-p6)", color: "var(--text-secondary)" }}>{s.motivos.join(", ")}</span></span>;
              return c.transferenciasSugeridas.some(t => t.lancamentoId === l.id) ? <Tag tone="accent">Transferência registrada</Tag> : <span style={{ color: "var(--text-secondary)" }}>Sem correspondência</span>;
            }
            if (l.baixas.length) return l.baixas.map(b => <span key={b.id} style={{ display: "block" }}>{b.titulo}{b.pessoa ? ` · ${b.pessoa}` : ""}</span>);
            if (l.transferencias.length) return <Tag tone="neutral">Transferência entre contas</Tag>;
            return status === "ignorado" ? <Badge size="sm" tone="neutral">Ignorada</Badge> : "—";
          } },
          ...(canWrite ? [{ key: "acoes", label: "", render: l => status === "pendente" ? (
            <span style={{ display: "flex", gap: "var(--space-1)", justifyContent: "flex-end" }}>
              {sugDe(l.id) && <Button size="sm" onClick={() => aceitar(l, sugDe(l.id))}>Conciliar</Button>}
              <Button size="sm" variant="secondary" onClick={() => setLinha(l)}>Tratar</Button>
            </span>
          ) : <Button size="sm" variant="ghost" onClick={() => desfazer(l)}>Desfazer</Button> }] : []),
        ]} />

      {status === "pendente" && c.baixasLivres.length > 0 && (
        <Card title={`No sistema, ainda sem linha no extrato (${c.baixasLivres.length})`}>
          <DataTable dense minWidth={0} rows={c.baixasLivres} rowKey={b => b.id} columns={[
            { key: "data", label: "Data", render: b => dataBR(b.data) },
            { key: "t", label: "Conta", render: b => <span><b>{b.titulo}</b>{b.pessoa ? ` · ${b.pessoa}` : ""}</span> },
            { key: "v", label: "Valor", align: "right", render: b => <b style={{ color: b.movimento >= 0 ? "var(--status-success-text)" : "var(--status-danger)" }}>{fmt(b.movimento)}</b> },
          ]} />
        </Card>
      )}

      {linha && <AcoesLinha linha={linha} conc={c} ctx={ctx} onClose={() => setLinha(null)} onFeito={depois} />}
      {importando && <ImportarExtrato contaId={contaId} ctx={ctx} onClose={() => setImportando(false)} onImportado={async () => { setImportando(false); setStatus("pendente"); await carregar("pendente"); }} />}
    </div>
  );
}
