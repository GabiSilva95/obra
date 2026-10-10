import { useEffect, useState } from "react";
import { Badge, Banner, Button, DataTable, IconButton, Input, Modal, Tag } from "../../../design-system";
import { fmt } from "../../utils/helpers";
import { avisarErro, confirmar } from "../../utils/aviso";
import { dataBR, resumoRateio, rotuloForma, rotuloStatus, toneStatus } from "./util";
import TituloForm from "./TituloForm";
import BaixaModal from "./BaixaModal";

/** Detalhe de um lançamento: parcelas, rateio, baixas (com estorno) e as ações permitidas. */
export default function DetalheTitulo({ titulo, ctx, onClose, onChanged }) {
  const { api, data, base, canWrite } = ctx;
  const [parcelas, setParcelas] = useState(null);
  const [baixando, setBaixando] = useState(null);
  const [editando, setEditando] = useState(false);
  const [prorrogando, setProrrogando] = useState(null);
  const [novoVenc, setNovoVenc] = useState("");

  const carregar = async () => {
    try {
      const r = await api.get(`/financeiro/titulos?status=todos&grupoId=${titulo.grupoId}&limite=200`);
      setParcelas(r.itens);
    } catch (e) { avisarErro(e.message); onClose(); }
  };
  useEffect(() => { carregar(); }, [titulo.grupoId]); // eslint-disable-line

  const mudou = async () => { await carregar(); onChanged(); };
  const lista = parcelas || [titulo];
  const ref = lista[0];
  const pagar = ref.tipo === "pagar";
  const comBaixaAtiva = lista.some(p => p.baixas.some(b => !b.estornadaEm));
  const documento = ["despesa", "receita", "avulso"].includes(ref.origemTipo);
  const cancelado = lista.every(p => p.status === "cancelado");
  const ctxRateio = { obras: data.obras, centros: base.centros, etapasObra: data.etapasObra, tiposEtapa: data.tiposEtapa };
  const baixasTodas = lista.flatMap(p => p.baixas.map(b => ({ ...b, parcela: p, ordem: `${b.data}|${b.id}` }))).sort((a, b) => a.ordem.localeCompare(b.ordem));
  const total = lista.reduce((s, p) => s + p.valor, 0);
  const saldo = lista.filter(p => p.status !== "cancelado").reduce((s, p) => s + p.saldo, 0);

  const executar = async acao => {
    try { await acao(); await mudou(); } catch (e) { avisarErro(e.message); }
  };
  const estornar = async b => {
    if (!(await confirmar({ titulo: "Estornar baixa?", mensagem: `O ${pagar ? "pagamento" : "recebimento"} de ${fmt(b.valor)} volta a ficar em aberto.`, confirmarRotulo: "Estornar", perigo: true }))) return;
    executar(() => api.post(`/financeiro/baixas/${b.id}/estornar`));
  };
  const cancelar = async () => {
    if (!(await confirmar({ titulo: "Cancelar título?", mensagem: "As parcelas deixam de contar como contas em aberto.", confirmarRotulo: "Cancelar título", perigo: true }))) return;
    try { for (const p of lista.filter(x => x.status !== "cancelado")) await api.post(`/financeiro/titulos/${p.id}/cancelar`); await mudou(); } catch (e) { avisarErro(e.message); }
  };
  const excluir = async () => {
    if (!(await confirmar({ titulo: "Excluir lançamento?", mensagem: "As parcelas e o custo (ou receita) gerado por ele serão removidos.", confirmarRotulo: "Excluir", perigo: true }))) return;
    try { await api.del(`/financeiro/documentos/${ref.grupoId}`); onChanged(); onClose(); } catch (e) { avisarErro(e.message); }
  };
  const prorrogar = async () => {
    try { await api.patch(`/financeiro/titulos/${prorrogando.id}`, { vencimento: novoVenc }); setProrrogando(null); await mudou(); } catch (e) { avisarErro(e.message); }
  };

  const info = [
    [pagar ? "Fornecedor" : "Cliente", ref.pessoa?.nome || ref.pessoaTexto || "—"], ["Documento", ref.documento || "—"],
    ["Categoria", ref.categoria || "—"], ["Origem", ref.origem], ["Lançamento", dataBR(ref.emissao)],
    ["Valor", fmt(total)], [pagar ? "Pago" : "Recebido", fmt(total - saldo)], ["Saldo", fmt(saldo)],
  ];

  return (
    <>
      <Modal title={ref.descricao} onClose={onClose} wide
        footer={canWrite && !cancelado ? (
          <>
            <Button variant="secondary" iconLeft="pencil" onClick={() => setEditando(true)}>Editar</Button>
            {documento && !comBaixaAtiva && <Button variant="danger" iconLeft="trash-2" onClick={excluir}>Excluir lançamento</Button>}
            {!documento && !comBaixaAtiva && <Button variant="danger" onClick={cancelar}>Cancelar título</Button>}
            <Button onClick={onClose}>Fechar</Button>
          </>
        ) : <Button onClick={onClose}>Fechar</Button>}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2) var(--space-8)" }}>
            {info.map(([l, v]) => (
              <div key={l} style={{ display: "flex", flexDirection: "column", gap: "var(--space-0-5)" }}>
                <span style={{ fontSize: "var(--fs-p5-5)", color: "var(--text-secondary)" }}>{l}:</span>
                <span style={{ fontWeight: "var(--fw-semibold)" }}>{v}</span>
              </div>
            ))}
          </div>
          {comBaixaAtiva && documento && <Banner tone="info">Há pagamentos lançados: para mudar valor, vencimento ou excluir, estorne as baixas.</Banner>}

          <section style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            <h3 style={{ margin: 0, font: "var(--type-card-title)", fontSize: "var(--fs-p4)" }}>Parcelas</h3>
            <DataTable dense minWidth={0} rows={lista} rowKey={p => p.id} columns={[
              { key: "parcela", label: "Parcela", render: p => `${p.parcela}/${p.totalParcelas}` },
              { key: "vencimento", label: "Vencimento", render: p => (
                prorrogando?.id === p.id
                  ? <span style={{ display: "flex", gap: "var(--space-1)", alignItems: "center" }}>
                      <Input aria-label="Novo vencimento" type="date" value={novoVenc} onChange={e => setNovoVenc(e.target.value)} />
                      <IconButton icon="check" size={32} label="Confirmar vencimento" onClick={prorrogar} />
                      <IconButton icon="x" size={32} label="Cancelar prorrogação" onClick={() => setProrrogando(null)} />
                    </span>
                  : dataBR(p.vencimento)
              ) },
              { key: "valor", label: "Valor", align: "right", render: p => fmt(p.valor) },
              { key: "saldo", label: "Saldo", align: "right", render: p => <b>{fmt(p.saldo)}</b> },
              { key: "status", label: "Situação", render: p => <Badge size="sm" tone={toneStatus(p)}>{rotuloStatus(p)}</Badge> },
              ...(canWrite ? [{ key: "acoes", label: "", render: p => (p.status === "aberto" || p.status === "parcial") && (
                <span style={{ display: "flex", gap: "var(--space-1)" }}>
                  <Button size="sm" variant="secondary" onClick={() => setBaixando(p)}>{pagar ? "Pagar" : "Receber"}</Button>
                  <IconButton icon="calendar" size={32} label="Prorrogar vencimento" onClick={() => { setProrrogando(p); setNovoVenc(p.vencimento); }} />
                </span>
              ) }] : []),
            ]} />
          </section>

          <section style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            <h3 style={{ margin: 0, font: "var(--type-card-title)", fontSize: "var(--fs-p4)" }}>Rateio</h3>
            {ref.rateios.length ? (
              <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                {(ref.recorrente ? ref.rateios : lista.flatMap(p => p.rateios)).reduce((acc, r) => {
                  const k = `${r.obraId}|${r.etapaId}|${r.centroCustoId}`; const a = acc.find(x => x.k === k);
                  if (a) a.valor += r.valor; else acc.push({ k, r: { ...r }, valor: r.valor });
                  return acc;
                }, []).map(x => <Tag key={x.k} tone="neutral">{resumoRateio({ rateios: [x.r] }, ctxRateio).texto}: {fmt(x.valor)}</Tag>)}
              </div>
            ) : <span style={{ color: "var(--text-secondary)" }}>Sem classificação por obra ou centro de custo.</span>}
          </section>

          <section style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            <h3 style={{ margin: 0, font: "var(--type-card-title)", fontSize: "var(--fs-p4)" }}>{pagar ? "Pagamentos" : "Recebimentos"}</h3>
            <DataTable dense minWidth={0} rows={baixasTodas} rowKey={b => b.id} empty={pagar ? "Nenhum pagamento lançado." : "Nenhum recebimento lançado."} columns={[
              { key: "data", label: "Data", render: b => dataBR(b.data) },
              { key: "parcela", label: "Parcela", render: b => `${b.parcela.parcela}/${b.parcela.totalParcelas}` },
              { key: "conta", label: "Conta", render: b => base.contas.find(c => c.id === b.contaId)?.nome || "—" },
              { key: "forma", label: "Forma", render: b => rotuloForma(b.forma) },
              { key: "valor", label: "Valor", align: "right", render: b => (
                <span style={{ textDecoration: b.estornadaEm ? "line-through" : "none", color: b.estornadaEm ? "var(--text-secondary)" : "inherit" }}>
                  <b>{fmt(b.movimento)}</b>{(b.juros || b.multa || b.desconto) ? <span style={{ color: "var(--text-secondary)" }}> (principal {fmt(b.valor)})</span> : null}
                </span>
              ) },
              { key: "estorno", label: "", render: b => b.estornadaEm
                ? <Badge size="sm" tone="neutral">Estornada em {dataBR(b.estornadaEm)}</Badge>
                : (canWrite && <Button size="sm" variant="ghost" onClick={() => estornar(b)}>Estornar</Button>) },
            ]} />
          </section>
        </div>
      </Modal>
      {baixando && <BaixaModal titulos={[baixando]} base={base} api={api} onClose={() => setBaixando(null)} onSaved={async () => { setBaixando(null); await mudou(); }} />}
      {editando && parcelas && <TituloForm tipo={ref.tipo} parcelas={parcelas} ctx={ctx} onClose={() => setEditando(false)} onSaved={async () => { setEditando(false); await mudou(); }} />}
    </>
  );
}
