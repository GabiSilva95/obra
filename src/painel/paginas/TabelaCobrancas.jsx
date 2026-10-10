import { useState } from "react";
import { Badge, Banner, Button, DataTable, Input, Modal, MoneyInput, Select, Tag, Textarea } from "../../../design-system";
import { FORMAS_PAGAMENTO, SITUACOES_COBRANCA, rotuloForma } from "../../../server/config/cobranca.js";
import { avisarErro, confirmar } from "../../utils/aviso";
import { fmt, today } from "../../utils/helpers";
import { dataDoDia } from "../util";

/**
 * Cobranças em tabela, com as ações da linha: registrar o pagamento, cancelar, reabrir e estornar.
 * Serve ao Financeiro (com a coluna da empresa) e ao detalhe de cada empresa. `aoMudar` recarrega quem chamou.
 */
export default function TabelaCobrancas({ api, itens, aoMudar, mostrarEmpresa = false, podeEditar = false, aoAbrirEmpresa, statusEmpresa, vazio = "Nenhuma cobrança." }) {
  const [modal, setModal] = useState(null); // { tipo: "pagar" | "cancelar", c }
  const [form, setForm] = useState({});
  const [salvando, setSalvando] = useState(false);

  const abrir = (tipo, c) => {
    setForm(tipo === "pagar" ? { pagaEm: today(), forma: "pix", valorPago: c.valor } : { motivo: "" });
    setModal({ tipo, c });
  };
  const fechar = () => { setModal(null); setSalvando(false); };
  const chamar = async (caminho, corpo) => {
    setSalvando(true);
    try { await api.post(caminho, corpo); fechar(); await aoMudar(); }
    catch (e) { setSalvando(false); avisarErro(e.message); }
  };
  const estornar = async c => {
    if (!(await confirmar({ titulo: "Estornar o pagamento", mensagem: `A cobrança ${c.referencia} volta para em aberto. A situação da empresa não muda sozinha. Estornar?`, confirmarRotulo: "Estornar", perigo: true }))) return;
    await chamar(`/painel/financeiro/cobrancas/${c.id}/estornar`, {});
  };
  const reabrir = async c => {
    if (!(await confirmar({ titulo: "Reabrir a cobrança", mensagem: `A cobrança ${c.referencia} volta para em aberto. Reabrir?`, confirmarRotulo: "Reabrir" }))) return;
    await chamar(`/painel/financeiro/cobrancas/${c.id}/reabrir`, {});
  };
  const copiarLink = async c => { try { await navigator.clipboard.writeText(c.linkPagamento); } catch { avisarErro("Não foi possível copiar. Selecione o link e copie à mão."); } };

  const colunas = [
    ...(mostrarEmpresa ? [{ key: "e", label: "Empresa", render: c => (
      <span style={{ display: "flex", flexDirection: "column" }}>
        <b>{aoAbrirEmpresa ? <Button variant="link" size="sm" style={{ height: "auto", padding: 0, font: "inherit", fontWeight: "var(--fw-bold)", textAlign: "left" }} onClick={e => { e.stopPropagation(); aoAbrirEmpresa(c.empresa.id); }}>{c.empresa.nome}</Button> : c.empresa.nome}</b>
      </span>
    ) }] : []),
    { key: "d", label: "Cobrança", render: c => <span style={{ display: "flex", flexDirection: "column" }}><b>#{c.id} · {c.referencia}</b><span style={{ fontSize: "var(--fs-p6)", color: "var(--text-secondary)" }}>{c.descricao}</span></span> },
    { key: "v", label: "Vencimento", render: c => dataDoDia(c.vencimento) },
    { key: "$", label: "Valor", align: "right", render: c => fmt(c.valor) },
    { key: "s", label: "Situação", render: c => (
      <span style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)", alignItems: "flex-start" }}>
        <Badge size="sm" tone={SITUACOES_COBRANCA[c.situacao].tom}>{SITUACOES_COBRANCA[c.situacao].rotulo}</Badge>
        {c.status === "paga" && <span style={{ fontSize: "var(--fs-p6)", color: "var(--text-secondary)" }}>{dataDoDia(c.pagaEm)} · {fmt(c.valorPago)}{c.forma ? ` · ${rotuloForma(c.forma)}` : ""}</span>}
        {c.status === "cancelada" && c.motivoCancelamento && <span style={{ fontSize: "var(--fs-p6)", color: "var(--text-secondary)" }}>{c.motivoCancelamento}</span>}
      </span>
    ) },
    ...(podeEditar ? [{ key: "a", label: "", render: c => (
      <span style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", justifyContent: "flex-end" }}>
        {c.gateway === "stripe" && <Tag tone="neutral">Cobrada pelo Stripe</Tag>}
        {c.status === "aberta" && c.gateway !== "stripe" && <Button size="sm" iconLeft="check" onClick={() => abrir("pagar", c)}>Registrar pagamento</Button>}
        {c.status === "aberta" && c.linkPagamento && <Button size="sm" variant="secondary" iconLeft="link" onClick={() => copiarLink(c)}>Copiar link</Button>}
        {c.status === "aberta" && c.gateway !== "stripe" && <Button size="sm" variant="secondary" onClick={() => abrir("cancelar", c)}>Cancelar</Button>}
        {c.status === "paga" && c.gateway !== "stripe" && <Button size="sm" variant="secondary" onClick={() => estornar(c)}>Estornar</Button>}
        {c.status === "cancelada" && c.gateway !== "stripe" && <Button size="sm" variant="secondary" onClick={() => reabrir(c)}>Reabrir</Button>}
      </span>
    ) }] : []),
  ];

  return (
    <>
      <DataTable dense minWidth={mostrarEmpresa ? 1000 : 820} rows={itens} rowKey={c => c.id} empty={vazio} columns={colunas} />

      {modal?.tipo === "pagar" && (
        <Modal title="Registrar pagamento" onClose={fechar}
          footer={<><Button variant="secondary" onClick={fechar}>Cancelar</Button>
            <Button loading={salvando} iconLeft="check" onClick={() => chamar(`/painel/financeiro/cobrancas/${modal.c.id}/pagamento`, { pagaEm: form.pagaEm, forma: form.forma, valorPago: form.valorPago })}>Registrar</Button></>}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <Banner tone="info">{mostrarEmpresa ? `${modal.c.empresa.nome}: ` : ""}cobrança {modal.c.referencia}, {fmt(modal.c.valor)}, vence em {dataDoDia(modal.c.vencimento)}.</Banner>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-md),1fr))", gap: "var(--space-4)" }}>
              <Input label="Pago em" type="date" max={today()} value={form.pagaEm} onChange={e => setForm(f => ({ ...f, pagaEm: e.target.value }))} />
              <Select label="Forma" value={form.forma} onChange={e => setForm(f => ({ ...f, forma: e.target.value }))}>
                {FORMAS_PAGAMENTO.map(x => <option key={x.id} value={x.id}>{x.rotulo}</option>)}
              </Select>
            </div>
            <MoneyInput label="Valor recebido" value={form.valorPago} onChange={e => setForm(f => ({ ...f, valorPago: e.target.value }))} helper="Normalmente o valor da cobrança; mude se o cliente pagou diferente." />
            {["trial", "inadimplente"].includes(modal.c.empresa?.status ?? statusEmpresa) && <Banner tone="success">{(modal.c.empresa?.status ?? statusEmpresa) === "trial" ? "A empresa está em teste: ao registrar, ela passa a ser cliente ativa." : "A empresa está inadimplente: volta a ativa se não restar outra cobrança vencida."}</Banner>}
          </div>
        </Modal>
      )}

      {modal?.tipo === "cancelar" && (
        <Modal title="Cancelar a cobrança" onClose={fechar}
          footer={<><Button variant="secondary" onClick={fechar}>Voltar</Button>
            <Button loading={salvando} disabled={form.motivo.trim().length < 3} onClick={() => chamar(`/painel/financeiro/cobrancas/${modal.c.id}/cancelar`, { motivo: form.motivo })}>Cancelar cobrança</Button></>}>
          <Textarea label="Motivo" required rows={3} maxLength={300} helper="Fica na cobrança e na auditoria. O cliente não vê o motivo." value={form.motivo} onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))} />
        </Modal>
      )}
    </>
  );
}
