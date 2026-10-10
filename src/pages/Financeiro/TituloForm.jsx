import { useMemo, useState } from "react";
import { Banner, Button, DataTable, Input, Modal, MoneyInput, Select } from "../../../design-system";
import RateioEditor, { erroRateio, linhaVazia, linhasFinais } from "../../components/RateioEditor";
import { fmt, today } from "../../utils/helpers";
import { avisarErro } from "../../utils/aviso";
import { somarDias } from "../../../server/utils/datas.js";
import { emReais, emCentavos, gerarParcelas, FORMAS, dataBR } from "./util";

const DOCUMENTOS_EDITAVEIS = ["despesa", "receita", "avulso"];

/** Valor e rateio como o formulário os enxerga, a partir das parcelas já gravadas (edição). */
function doDocumento(parcelas) {
  const ref = parcelas[0];
  const valor = ref.recorrente ? ref.valor : emReais(parcelas.reduce((s, p) => s + emCentavos(p.valor), 0));
  const fonte = ref.recorrente ? ref.rateios : parcelas.flatMap(p => p.rateios);
  const mapa = new Map();
  for (const r of fonte) {
    const k = `${r.obraId}|${r.etapaId}|${r.centroCustoId}`;
    const a = mapa.get(k) || { obraId: r.obraId ?? "", etapaId: r.etapaId ?? "", centroCustoId: r.centroCustoId ?? "", cent: 0 };
    a.cent += emCentavos(r.valor);
    mapa.set(k, a);
  }
  const linhas = [...mapa.values()].map(({ cent, ...l }) => ({ ...l, valor: emReais(cent) }));
  return { valor, linhas: linhas.length ? linhas : [linhaVazia()] };
}

/**
 * Lançamento (documento) a pagar ou a receber: classificação, rateio e condição de pagamento.
 * `parcelas` (opcional) = títulos já gravados do documento, para editar.
 */
export default function TituloForm({ tipo, parcelas, ctx, onClose, onSaved }) {
  const { data, api, base } = ctx;
  const editando = !!parcelas;
  const ref = parcelas?.[0];
  const pagar = tipo === "pagar";
  const prazo = base.config.prazoPadraoDias;
  const contas = base.contas.filter(c => c.ativa);
  const inicial = useMemo(() => {
    if (!editando) {
      return {
        natureza: "custo", descricao: "", categoria: "", pessoaId: "", pessoaTexto: "", documento: "", data: today(), valor: "", obs: "",
        linhas: [linhaVazia()], cond: "prazo", vencimento: somarDias(today(), prazo), nParcelas: 2, intervalo: "mensal", dias: 30,
        contaId: contas[0]?.id ?? "", dataPagamento: today(), forma: "pix",
      };
    }
    const doc = doDocumento(parcelas);
    return {
      natureza: DOCUMENTOS_EDITAVEIS.includes(ref.origemTipo) && ref.origemTipo !== "avulso" ? "custo" : "outro",
      descricao: ref.descricao, categoria: ref.categoria || "", pessoaId: ref.pessoaId ?? "", pessoaTexto: ref.pessoaTexto || "", documento: ref.documento || "",
      data: ref.emissao, valor: doc.valor, obs: ref.obs || "", linhas: doc.linhas,
      cond: ref.recorrente ? "repetir" : (parcelas.length > 1 ? "parcelado" : "prazo"), vencimento: ref.vencimento, nParcelas: parcelas.length,
      intervalo: "mensal", dias: 30, contaId: contas[0]?.id ?? "", dataPagamento: today(), forma: "pix",
    };
  }, []); // eslint-disable-line
  const [f, setF] = useState(inicial);
  const [erro, setErro] = useState("");
  const [erroRat, setErroRat] = useState("");
  const [salvando, setSalvando] = useState(false);
  const set = k => e => setF(x => ({ ...x, [k]: e.target.value }));

  // Valor e vencimentos travam quando há pagamento lançado, ou quando o valor vem de compra, diárias ou locação
  const comBaixa = editando && parcelas.some(p => p.baixas.some(b => !b.estornadaEm));
  const origemFixa = editando && !DOCUMENTOS_EDITAVEIS.includes(ref.origemTipo);
  const travado = comBaixa || origemFixa;
  const comRateio = f.natureza === "custo" || origemFixa;
  const total = Number(f.valor) || 0;

  const pessoas = (data.funcionarios || []).filter(p => (pagar ? p.isFornecedor || p.isColaborador : p.isCliente));
  const categorias = base.categorias.filter(c => c.tipo === tipo && (c.ativa || c.nome === f.categoria));

  const preview = useMemo(() => {
    if (!["parcelado", "repetir"].includes(f.cond) || !(total > 0) || !f.vencimento) return [];
    try {
      return gerarParcelas({
        valorCent: emCentavos(total), primeiroVencimento: f.vencimento, parcelas: parseInt(f.nParcelas) || 1,
        intervalo: f.intervalo === "dias" ? { tipo: "dias", dias: parseInt(f.dias) || 1 } : { tipo: "mensal" }, modo: f.cond === "repetir" ? "repetir" : "dividir",
      });
    } catch { return []; }
  }, [f.cond, f.vencimento, f.nParcelas, f.intervalo, f.dias, total]);

  const salvar = async () => {
    if (salvando) return;
    if (!f.descricao.trim()) return setErro("Informe a descrição.");
    if (!travado && !(total > 0)) return setErro("O valor deve ser maior que zero.");
    if (!travado && f.cond === "avista" && !f.contaId) return setErro("Escolha a conta do pagamento à vista.");
    if (!travado && f.cond !== "avista" && !f.vencimento) return setErro("Informe o vencimento.");
    const baseRateio = travado ? emReais(parcelas.length && ref.recorrente ? emCentavos(ref.valor) : parcelas.reduce((s, p) => s + emCentavos(p.valor), 0)) : total;
    if (comRateio) {
      const e = erroRateio(f.linhas, baseRateio);
      if (e) { setErroRat(e); return setErro(""); }
    }
    setErro(""); setErroRat("");
    const rateio = comRateio ? linhasFinais(f.linhas, baseRateio).map(l => ({ obraId: l.obraId || null, etapaId: l.etapaId || null, centroCustoId: l.centroCustoId || null, valor: Number(l.valor) })) : undefined;
    const comum = { descricao: f.descricao, categoria: f.categoria || null, pessoaId: f.pessoaId || null, pessoaTexto: f.pessoaId ? null : f.pessoaTexto || null, documento: f.documento || null, obs: f.obs || null, data: f.data, rateio };
    const pagamento = f.cond === "avista"
      ? { modo: "avista", contaId: f.contaId, dataPagamento: f.dataPagamento, forma: f.forma }
      : { modo: f.cond, vencimento: f.vencimento, parcelas: parseInt(f.nParcelas) || 1, intervalo: f.intervalo === "dias" ? { tipo: "dias", dias: parseInt(f.dias) || 1 } : { tipo: "mensal" } };
    setSalvando(true);
    try {
      if (editando) await api.put(`/financeiro/documentos/${ref.grupoId}`, { ...comum, ...(travado ? {} : { valor: total, pagamento }) });
      else await api.post("/financeiro/documentos", { tipo, natureza: f.natureza, ...comum, valor: total, pagamento });
      onSaved();
    } catch (e) { avisarErro(e.message); }
    finally { setSalvando(false); }
  };

  const nomePessoa = pagar ? "Fornecedor" : "Cliente";
  return (
    <Modal title={editando ? "Editar lançamento" : (pagar ? "Nova conta a pagar" : "Nova conta a receber")} onClose={onClose} wide
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button iconLeft="check" loading={salvando} onClick={salvar}>Salvar lançamento</Button></>}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {travado && (
          <Banner tone="info" title="Valor e vencimentos travados">
            {comBaixa ? "Há pagamentos lançados: estorne antes de mudar valor ou vencimento." : "O valor vem da compra, das diárias ou da locação de origem."} Descrição, pessoa e rateio ainda podem mudar.
          </Banner>
        )}
        {!editando && (
          <Select label="Este lançamento é" value={f.natureza} onChange={set("natureza")}>
            <option value="custo">{pagar ? "Despesa (entra no custo)" : "Receita (entra no faturamento)"}</option>
            <option value="outro">{pagar ? "Outro pagamento (não é custo: empréstimo, retirada)" : "Outro recebimento (não é receita: aporte, empréstimo)"}</option>
          </Select>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-md),1fr))", gap: "var(--space-4)" }}>
          <Input label="Descrição" required value={f.descricao} onChange={set("descricao")} />
          <Select label={f.natureza === "custo" ? (pagar ? "Categoria" : "Tipo de receita") : "Categoria"} value={f.categoria} onChange={set("categoria")}>
            <option value="">Sem categoria</option>
            {categorias.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
          </Select>
          <Select label={nomePessoa} value={f.pessoaId} onChange={set("pessoaId")}>
            <option value="">Não cadastrado</option>
            {pessoas.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </Select>
          {!f.pessoaId && <Input label="Nome livre" placeholder={`${nomePessoa} sem cadastro`} value={f.pessoaTexto} onChange={set("pessoaTexto")} />}
          <Input label="Documento" placeholder="Nº da nota, boleto ou contrato" value={f.documento} onChange={set("documento")} />
          <Input label="Data do lançamento" required type="date" value={f.data} onChange={set("data")} />
        </div>

        {!travado && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-md),1fr))", gap: "var(--space-4)" }}>
              <MoneyInput label={f.cond === "repetir" ? "Valor de cada parcela" : "Valor"} required value={f.valor} onChange={set("valor")} />
              <Select label="Condição" value={f.cond} onChange={set("cond")}>
                <option value="prazo">A prazo (um vencimento)</option>
                <option value="avista">{pagar ? "À vista (já pago)" : "À vista (já recebido)"}</option>
                <option value="parcelado">Parcelado</option>
                <option value="repetir">Conta fixa (repetir todo mês)</option>
              </Select>
            </div>

            {f.cond === "avista" ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-sm),1fr))", gap: "var(--space-4)" }}>
                <Select label="Conta" required value={f.contaId} onChange={set("contaId")}>
                  {!contas.length && <option value="">Cadastre uma conta antes</option>}
                  {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </Select>
                <Input label={pagar ? "Data do pagamento" : "Data do recebimento"} type="date" value={f.dataPagamento} onChange={set("dataPagamento")} />
                <Select label="Forma" value={f.forma} onChange={set("forma")} options={FORMAS} />
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-sm),1fr))", gap: "var(--space-4)" }}>
                <Input label={f.cond === "prazo" ? "Vencimento" : "Primeiro vencimento"} required type="date" value={f.vencimento} onChange={set("vencimento")} />
                {(f.cond === "parcelado" || f.cond === "repetir") && <Input label={f.cond === "repetir" ? "Quantidade de meses" : "Número de parcelas"} type="number" min="2" max="120" value={f.nParcelas} onChange={set("nParcelas")} />}
                {f.cond === "parcelado" && (
                  <Select label="Intervalo" value={f.intervalo} onChange={set("intervalo")}>
                    <option value="mensal">Todo mês</option>
                    <option value="dias">A cada N dias</option>
                  </Select>
                )}
                {f.cond === "parcelado" && f.intervalo === "dias" && <Input label="Dias entre parcelas" type="number" min="1" value={f.dias} onChange={set("dias")} />}
              </div>
            )}

            {preview.length > 0 && (
              <DataTable dense minWidth={0} rows={preview} rowKey={p => p.parcela} columns={[
                { key: "parcela", label: "Parcela", render: p => `${p.parcela}/${p.totalParcelas}` },
                { key: "vencimento", label: "Vencimento", render: p => dataBR(p.vencimento) },
                { key: "valor", label: "Valor", align: "right", render: p => <b>{fmt(emReais(p.valorCent))}</b> },
              ]} />
            )}
            {f.cond === "repetir" && preview.length > 0 && <Banner tone="info">Cada parcela é um custo (ou receita) do seu mês, datado no vencimento. Total: {fmt(total * preview.length)}.</Banner>}
          </>
        )}

        {comRateio && (
          <RateioEditor linhas={f.linhas} onChange={linhas => setF(x => ({ ...x, linhas }))} erro={erroRat}
            total={travado ? emReais(ref.recorrente ? emCentavos(ref.valor) : parcelas.reduce((s, p) => s + emCentavos(p.valor), 0)) : total}
            obras={data.obras} etapasObra={data.etapasObra} tiposEtapa={data.tiposEtapa} centros={base.centros} />
        )}
        <Input label="Observações" value={f.obs} onChange={set("obs")} />
        {erro && <Banner tone="danger">{erro}</Banner>}
      </div>
    </Modal>
  );
}
