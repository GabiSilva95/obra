import { useState } from "react";
import { Banner, Button, Input, Modal, MoneyInput, Select } from "../../../design-system";
import { fmt, today } from "../../utils/helpers";
import { avisarErro } from "../../utils/aviso";
import { FORMAS, movimento } from "./util";

/**
 * Baixa (pagamento ou recebimento) de um título, ou de vários de uma vez (`titulos.length > 1`:
 * quita o saldo inteiro de cada um, na mesma conta, data e forma).
 */
export default function BaixaModal({ titulos, base, api, onClose, onSaved }) {
  const lote = titulos.length > 1;
  const t = titulos[0];
  const pagar = t.tipo === "pagar";
  const contas = base.contas.filter(c => c.ativa);
  const [f, setF] = useState({ contaId: contas[0]?.id ?? "", data: today(), valor: t.saldo, juros: "", multa: "", desconto: "", forma: "pix", obs: "" });
  // O campo de moeda acrescenta dígitos ao valor que já está nele: para pagar menos que o saldo, começa vazio
  const [parcial, setParcial] = useState(false);
  const escolherValor = e => { const outro = e.target.value === "outro"; setParcial(outro); setF(x => ({ ...x, valor: outro ? "" : t.saldo })); };
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const set = k => e => setF(x => ({ ...x, [k]: e.target.value }));
  const saldoTotal = titulos.reduce((s, x) => s + x.saldo, 0);
  const mov = lote ? saldoTotal : movimento({ valor: Number(f.valor) || 0, juros: Number(f.juros) || 0, multa: Number(f.multa) || 0, desconto: Number(f.desconto) || 0 });

  const salvar = async () => {
    if (salvando) return;
    if (!f.contaId) return setErro("Escolha a conta.");
    if (!f.data) return setErro("Informe a data.");
    if (!lote && !(Number(f.valor) > 0)) return setErro("O valor deve ser maior que zero.");
    if (!lote && Number(f.valor) > t.saldo + 0.001) return setErro(`O valor passa o saldo do título (${fmt(t.saldo)}).`);
    setErro(""); setSalvando(true);
    try {
      if (lote) await api.post("/financeiro/titulos/baixa-lote", { ids: titulos.map(x => x.id), contaId: f.contaId, data: f.data, forma: f.forma, obs: f.obs });
      else await api.post(`/financeiro/titulos/${t.id}/baixas`, { ...f, valor: Number(f.valor), juros: Number(f.juros) || 0, multa: Number(f.multa) || 0, desconto: Number(f.desconto) || 0 });
      onSaved();
    } catch (e) { avisarErro(e.message); }
    finally { setSalvando(false); }
  };

  const verbo = pagar ? "pagamento" : "recebimento";
  return (
    <Modal title={lote ? `Baixar ${titulos.length} títulos` : (pagar ? "Pagar título" : "Receber título")} onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button iconLeft="check" loading={salvando} onClick={salvar}>Confirmar {verbo}</Button></>}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {!contas.length && <Banner tone="warning" title="Nenhuma conta cadastrada">Cadastre uma conta em Contas antes de lançar {verbo}.</Banner>}
        {lote ? (
          <Banner tone="info" title={`${titulos.length} títulos, saldo total ${fmt(saldoTotal)}`}>Cada um é quitado pelo saldo inteiro.</Banner>
        ) : (
          <Banner tone="info" title={t.descricao}>{t.pessoa?.nome || t.pessoaTexto || "Sem pessoa"} · vence em {new Date(`${t.vencimento}T12:00:00`).toLocaleDateString("pt-BR")} · saldo {fmt(t.saldo)}</Banner>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-sm),1fr))", gap: "var(--space-3)" }}>
          <Select label="Conta" required value={f.contaId} onChange={set("contaId")}>
            {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Select>
          <Input label="Data" required type="date" value={f.data} onChange={set("data")} />
          <Select label="Forma" value={f.forma} onChange={set("forma")} options={FORMAS} />
        </div>
        {!lote && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-sm),1fr))", gap: "var(--space-3)" }}>
            <Select label="Quanto" value={parcial ? "outro" : "total"} onChange={escolherValor}>
              <option value="total">{`Saldo inteiro (${fmt(t.saldo)})`}</option>
              <option value="outro">Pagamento parcial (outro valor)</option>
            </Select>
            {parcial && <MoneyInput label="Valor" required value={f.valor} onChange={set("valor")} />}
            <MoneyInput label="Juros" value={f.juros} onChange={set("juros")} />
            <MoneyInput label="Multa" value={f.multa} onChange={set("multa")} />
            <MoneyInput label="Desconto" value={f.desconto} onChange={set("desconto")} />
          </div>
        )}
        <Input label="Observação" value={f.obs} onChange={set("obs")} />
        <Banner tone="accent" title={pagar ? "Sai da conta" : "Entra na conta"}>{fmt(mov)}</Banner>
        {erro && <Banner tone="danger">{erro}</Banner>}
      </div>
    </Modal>
  );
}
