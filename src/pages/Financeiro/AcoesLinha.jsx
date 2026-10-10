import { useEffect, useMemo, useState } from "react";
import { Banner, Button, Checkbox, DataTable, Input, Modal, MoneyInput, SegmentedTabs, Select } from "../../../design-system";
import RateioEditor, { erroRateio, linhaVazia, linhasFinais } from "../../components/RateioEditor";
import { fmt } from "../../utils/helpers";
import { avisarErro } from "../../utils/aviso";
import { dataBR, emCentavos, emReais, FORMAS } from "./util";

/**
 * O que fazer com uma linha do extrato que ainda não bate com nada: ligar a uma baixa que já existe,
 * quitar uma conta, lançar o que só existe no banco (tarifa, rendimento), registrar uma transferência
 * entre contas ou ignorar.
 */
export default function AcoesLinha({ linha, conc, ctx, onClose, onFeito }) {
  const { api, base, data } = ctx;
  const entrada = linha.valor > 0;
  const sug = conc.sugestoes.find(s => s.lancamentoId === linha.id);
  const transfSug = conc.transferenciasSugeridas.find(t => t.lancamentoId === linha.id);
  const [aba, setAba] = useState(sug ? "baixa" : transfSug ? "transferencia" : "titulo");
  const [salvando, setSalvando] = useState(false);
  const executar = async acao => {
    if (salvando) return;
    setSalvando(true);
    try { await acao(); await onFeito(); } catch (e) { avisarErro(e.message); setSalvando(false); }
  };

  // Baixa existente
  const livres = conc.baixasLivres.filter(b => (b.movimento > 0) === entrada);
  const [escolhidas, setEscolhidas] = useState(new Set(sug?.baixaIds || []));
  const somaEsc = livres.filter(b => escolhidas.has(b.id)).reduce((s, b) => s + emCentavos(b.movimento), 0);
  const falta = emCentavos(linha.valor) - somaEsc;
  const alternar = id => setEscolhidas(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  // Quitar título
  const [busca, setBusca] = useState("");
  const [titulos, setTitulos] = useState([]);
  const [tituloId, setTituloId] = useState("");
  const [ajuste, setAjuste] = useState({ juros: "", multa: "", desconto: "", forma: "pix" });
  useEffect(() => {
    if (aba !== "titulo") return;
    const t = setTimeout(() => {
      api.get(`/financeiro/titulos?tipo=${entrada ? "receber" : "pagar"}&status=aberto&limite=50${busca ? `&q=${encodeURIComponent(busca)}` : ""}`)
        .then(r => setTitulos(r.itens)).catch(e => avisarErro(e.message));
    }, 250);
    return () => clearTimeout(t);
  }, [aba, busca, entrada]); // eslint-disable-line
  const tituloSel = titulos.find(t => t.id === parseInt(tituloId));
  const principal = emReais(Math.abs(emCentavos(linha.valor)) - emCentavos(ajuste.juros || 0) - emCentavos(ajuste.multa || 0) + emCentavos(ajuste.desconto || 0));

  // Lançar
  const centroPadrao = base.centros.find(c => /admin/i.test(c.nome))?.id ?? "";
  const [f, setF] = useState({ natureza: "custo", descricao: linha.descricao, categoria: "", pessoaId: "", pessoaTexto: "", linhas: [{ ...linhaVazia(), centroCustoId: centroPadrao }] });
  const [erroRat, setErroRat] = useState("");
  const total = Math.abs(linha.valor);
  const categorias = base.categorias.filter(c => c.tipo === (entrada ? "receber" : "pagar") && c.ativa);
  const pessoas = (data.funcionarios || []).filter(p => (entrada ? p.isCliente : p.isFornecedor || p.isColaborador));
  const lancar = () => {
    if (!f.descricao.trim()) return avisarErro("Informe a descrição.");
    if (f.natureza === "custo") { const e = erroRateio(f.linhas, total); if (e) return setErroRat(e); }
    setErroRat("");
    const rateio = f.natureza === "custo" ? linhasFinais(f.linhas, total).map(l => ({ obraId: l.obraId || null, etapaId: l.etapaId || null, centroCustoId: l.centroCustoId || null, valor: Number(l.valor) })) : [];
    executar(() => api.post(`/financeiro/lancamentos/${linha.id}/lancar`, { natureza: f.natureza, descricao: f.descricao, categoria: f.categoria || null, pessoaId: f.pessoaId || null, pessoaTexto: f.pessoaId ? null : f.pessoaTexto || null, rateio }));
  };

  // Transferência
  const [outra, setOutra] = useState(base.contas.find(c => c.ativa && c.id !== linha.contaId)?.id ?? "");
  const transfLivre = conc.transferenciasLivres.find(t => t.id === transfSug?.transferenciaId);

  const abas = useMemo(() => [{ value: "baixa", label: "Já está no sistema" }, { value: "titulo", label: entrada ? "Receber uma conta" : "Pagar uma conta" }, { value: "lancar", label: "Lançar novo" }, { value: "transferencia", label: "Transferência" }, { value: "ignorar", label: "Ignorar" }], [entrada]);

  return (
    <Modal title="Tratar linha do extrato" onClose={onClose} wide footer={<Button variant="secondary" onClick={onClose}>Fechar</Button>}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <Banner tone={entrada ? "success" : "warning"} title={`${dataBR(linha.data)} · ${fmt(linha.valor)}`}>{linha.descricao}</Banner>
        <SegmentedTabs variant="light" value={aba} onChange={setAba} tabs={abas} />

        {aba === "baixa" && (
          <>
            {sug && <Banner tone="accent" title="Sugestão do sistema">{sug.baixas.map(b => `${b.titulo}${b.pessoa ? ` (${b.pessoa})` : ""}`).join(" + ")} · {sug.motivos.join(", ")}.</Banner>}
            <DataTable dense minWidth={0} rows={livres} rowKey={b => b.id} empty={`Nenhuma ${entrada ? "entrada" : "saída"} baixada no sistema sem correspondência no extrato.`} columns={[
              { key: "s", label: "", width: "var(--space-11)", render: b => <Checkbox checked={escolhidas.has(b.id)} onChange={() => alternar(b.id)} /> },
              { key: "d", label: "Data", render: b => dataBR(b.data) },
              { key: "t", label: "Conta", render: b => <span style={{ display: "flex", flexDirection: "column" }}><b>{b.titulo}</b>{b.pessoa && <span style={{ fontSize: "var(--fs-p6)", color: "var(--text-secondary)" }}>{b.pessoa}</span>}</span> },
              { key: "v", label: "Valor", align: "right", render: b => <b>{fmt(b.movimento)}</b> },
            ]} />
            {escolhidas.size > 0 && (falta === 0
              ? <Banner tone="success">As baixas escolhidas somam exatamente a linha do extrato.</Banner>
              : <Banner tone="warning">A soma escolhida é {fmt(emReais(somaEsc))}; a linha é {fmt(linha.valor)} (diferença {fmt(emReais(falta))}).</Banner>)}
            <div><Button iconLeft="check" disabled={!escolhidas.size || falta !== 0} loading={salvando} onClick={() => executar(() => api.post(`/financeiro/lancamentos/${linha.id}/conciliar`, { baixaIds: [...escolhidas] }))}>Conciliar</Button></div>
          </>
        )}

        {aba === "titulo" && (
          <>
            <Input label="Buscar conta" icon="search" placeholder="Descrição, documento ou nome" value={busca} onChange={e => setBusca(e.target.value)} />
            <DataTable dense minWidth={0} rows={titulos} rowKey={t => t.id} onRowClick={t => setTituloId(String(t.id))} empty="Nenhuma conta em aberto encontrada." columns={[
              { key: "s", label: "", width: "var(--space-11)", render: t => <Checkbox checked={String(t.id) === tituloId} onChange={() => setTituloId(String(t.id))} /> },
              { key: "v", label: "Vence", render: t => dataBR(t.vencimento) },
              { key: "d", label: "Descrição", render: t => <span style={{ display: "flex", flexDirection: "column" }}><b>{t.descricao}</b><span style={{ fontSize: "var(--fs-p6)", color: "var(--text-secondary)" }}>{[t.pessoa?.nome || t.pessoaTexto, t.totalParcelas > 1 && `parcela ${t.parcela}/${t.totalParcelas}`].filter(Boolean).join(" · ")}</span></span> },
              { key: "s2", label: "Saldo", align: "right", render: t => <b>{fmt(t.saldo)}</b> },
            ]} />
            {tituloSel && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-sm),1fr))", gap: "var(--space-3)" }}>
                  <MoneyInput label="Juros" value={ajuste.juros} onChange={e => setAjuste(a => ({ ...a, juros: e.target.value }))} />
                  <MoneyInput label="Multa" value={ajuste.multa} onChange={e => setAjuste(a => ({ ...a, multa: e.target.value }))} />
                  <MoneyInput label="Desconto" value={ajuste.desconto} onChange={e => setAjuste(a => ({ ...a, desconto: e.target.value }))} />
                  <Select label="Forma" value={ajuste.forma} onChange={e => setAjuste(a => ({ ...a, forma: e.target.value }))} options={FORMAS} />
                </div>
                <Banner tone={principal > tituloSel.saldo + 0.001 || principal <= 0 ? "danger" : "info"} title={`Quita ${fmt(principal)} do título`}>
                  Saldo do título: {fmt(tituloSel.saldo)}. O valor do extrato é {fmt(Math.abs(linha.valor))}; juros e multa ficam dentro dele.
                </Banner>
              </>
            )}
            <div><Button iconLeft="check" disabled={!tituloSel || principal <= 0 || principal > tituloSel.saldo + 0.001} loading={salvando}
              onClick={() => executar(() => api.post(`/financeiro/lancamentos/${linha.id}/baixar`, { tituloId: tituloSel.id, juros: Number(ajuste.juros) || 0, multa: Number(ajuste.multa) || 0, desconto: Number(ajuste.desconto) || 0, forma: ajuste.forma }))}>
              {entrada ? "Receber e conciliar" : "Pagar e conciliar"}</Button></div>
          </>
        )}

        {aba === "lancar" && (
          <>
            <Banner tone="info">Para o que só existe no banco: tarifa, rendimento, imposto, juros. Cria o lançamento já {entrada ? "recebido" : "pago"} em {dataBR(linha.data)} e concilia.</Banner>
            <Select label="Este lançamento é" value={f.natureza} onChange={e => setF(x => ({ ...x, natureza: e.target.value }))}>
              <option value="custo">{entrada ? "Receita (entra no faturamento)" : "Despesa (entra no custo)"}</option>
              <option value="outro">{entrada ? "Outro recebimento (não é receita)" : "Outro pagamento (não é custo)"}</option>
            </Select>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-md),1fr))", gap: "var(--space-3)" }}>
              <Input label="Descrição" required value={f.descricao} onChange={e => setF(x => ({ ...x, descricao: e.target.value }))} />
              <Select label="Categoria" value={f.categoria} onChange={e => setF(x => ({ ...x, categoria: e.target.value }))}>
                <option value="">Sem categoria</option>
                {categorias.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
              </Select>
              <Select label={entrada ? "Cliente" : "Fornecedor"} value={f.pessoaId} onChange={e => setF(x => ({ ...x, pessoaId: e.target.value }))}>
                <option value="">Não cadastrado</option>
                {pessoas.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </Select>
            </div>
            {f.natureza === "custo" && (
              <RateioEditor linhas={f.linhas} onChange={linhas => setF(x => ({ ...x, linhas }))} total={total} erro={erroRat}
                obras={data.obras} etapasObra={data.etapasObra} tiposEtapa={data.tiposEtapa} centros={base.centros} />
            )}
            <div><Button iconLeft="check" loading={salvando} onClick={lancar}>Lançar e conciliar</Button></div>
          </>
        )}

        {aba === "transferencia" && (
          <>
            {transfLivre ? (
              <>
                <Banner tone="accent" title="Esta linha combina com uma transferência já registrada">{transfLivre.saida ? "Saída" : "Entrada"} de {fmt(transfLivre.valor)} em {dataBR(transfLivre.data)}{transfLivre.obs ? `: ${transfLivre.obs}` : ""}.</Banner>
                <div><Button iconLeft="check" loading={salvando} onClick={() => executar(() => api.post(`/financeiro/lancamentos/${linha.id}/conciliar-transferencia`, { transferenciaId: transfLivre.id }))}>Conciliar com a transferência</Button></div>
              </>
            ) : (
              <>
                <Banner tone="info">Movimento entre duas contas suas. Não é custo nem receita. O outro lado concilia quando o extrato da outra conta for importado.</Banner>
                <Select label={entrada ? "Conta de origem" : "Conta de destino"} value={outra} onChange={e => setOutra(parseInt(e.target.value))}>
                  {!base.contas.some(c => c.ativa && c.id !== linha.contaId) && <option value="">Cadastre outra conta antes</option>}
                  {base.contas.filter(c => c.ativa && c.id !== linha.contaId).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </Select>
                <div><Button iconLeft="check" disabled={!outra} loading={salvando} onClick={() => executar(() => api.post(`/financeiro/lancamentos/${linha.id}/transferir`, { contaId: outra }))}>Registrar transferência</Button></div>
              </>
            )}
          </>
        )}

        {aba === "ignorar" && (
          <>
            <Banner tone="info">Ignorar tira a linha da lista de pendentes sem lançar nada (ex.: estorno de um erro do banco, lançamento que não é da empresa). Dá para voltar atrás depois.</Banner>
            <div><Button variant="secondary" loading={salvando} onClick={() => executar(() => api.post(`/financeiro/lancamentos/${linha.id}/ignorar`))}>Ignorar esta linha</Button></div>
          </>
        )}
      </div>
    </Modal>
  );
}
