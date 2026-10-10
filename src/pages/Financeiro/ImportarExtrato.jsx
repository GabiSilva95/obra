import { useState } from "react";
import { Badge, Banner, Button, DataTable, Modal, Select, StatCard, UploadBox } from "../../../design-system";
import { fmt } from "../../utils/helpers";
import { avisarErro } from "../../utils/aviso";
import { dataBR } from "./util";

/**
 * Lê os bytes do arquivo e decodifica: UTF-8 quando é válido; senão Windows-1252, que é como o
 * OFX de banco brasileiro costuma vir. Decodificar errado estraga os acentos em silêncio.
 */
async function lerTexto(file) {
  const bytes = await file.arrayBuffer();
  try { return new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
  catch { return new TextDecoder("windows-1252").decode(bytes); }
}

/** Importação de extrato (OFX ou CSV) com prévia: nada é gravado até o usuário confirmar. */
export default function ImportarExtrato({ contaId, ctx, onClose, onImportado }) {
  const { api, base } = ctx;
  const contas = base.contas.filter(c => c.ativa);
  const [conta, setConta] = useState(contaId ?? contas[0]?.id ?? "");
  const [arquivo, setArquivo] = useState(null); // { nome, formato, conteudo }
  const [previa, setPrevia] = useState(null);
  const [mapa, setMapa] = useState(null); // { cabecalho, mapeamento }
  const [lendo, setLendo] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const consultar = async (arq, mapeamento) => {
    setLendo(true);
    try {
      const r = await api.post(`/financeiro/contas/${conta}/extrato/previa`, { formato: arq.formato, conteudo: arq.conteudo, mapeamento });
      if (r.precisaMapear) { setMapa({ cabecalho: r.cabecalho, mapeamento: { ...r.mapeamento, ...(mapeamento || {}) } }); setPrevia(null); }
      else { setPrevia(r); setMapa(null); }
    } catch (e) { avisarErro(e.message); setArquivo(null); }
    finally { setLendo(false); }
  };

  const escolher = async files => {
    const file = files?.[0];
    if (!file) return;
    if (!conta) return avisarErro("Escolha a conta do extrato.");
    const conteudo = await lerTexto(file);
    const formato = /\.csv$|\.txt$/i.test(file.name) && !/<OFX/i.test(conteudo) ? "csv" : "ofx";
    const arq = { nome: file.name, formato, conteudo };
    setArquivo(arq);
    await consultar(arq);
  };

  const importar = async () => {
    if (salvando) return;
    setSalvando(true);
    try {
      const r = await api.post(`/financeiro/contas/${conta}/extrato`, { formato: arquivo.formato, conteudo: arquivo.conteudo, mapeamento: mapa?.mapeamento || previa?.mapeamento, arquivo: arquivo.nome });
      await onImportado(conta, r);
    } catch (e) { avisarErro(e.message); setSalvando(false); }
  };

  const colunas = mapa?.cabecalho.map((c, i) => ({ value: i, label: c || `Coluna ${i + 1}` })) || [];
  const setCol = k => e => setMapa(m => ({ ...m, mapeamento: { ...m.mapeamento, [k]: e.target.value === "" ? undefined : parseInt(e.target.value) } }));
  const r = previa?.resumo;

  return (
    <Modal title="Importar extrato" onClose={onClose} wide
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button>{previa && <Button iconLeft="check" disabled={!r.novas} loading={salvando} onClick={importar}>Importar {r.novas} lançamento{r.novas === 1 ? "" : "s"}</Button>}</>}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {!arquivo && (
          <>
            {contaId == null && (
              <Select label="Conta do extrato" required value={conta} onChange={e => setConta(parseInt(e.target.value))}>
                {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </Select>
            )}
            <UploadBox title="Selecionar extrato" hint="Baixe o extrato no internet banking (OFX é o melhor; CSV também funciona) e escolha o arquivo ou arraste aqui." formats="OFX, CSV" accept=".ofx,.csv,.txt" busy={lendo} onFiles={escolher} />
          </>
        )}

        {arquivo && lendo && <span style={{ color: "var(--text-secondary)" }}>Lendo {arquivo.nome}…</span>}

        {mapa && (
          <>
            <Banner tone="info" title="Indique as colunas do arquivo">Não consegui identificar sozinho onde estão a data, a descrição e o valor.</Banner>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-sm),1fr))", gap: "var(--space-3)" }}>
              {[["data", "Coluna da data"], ["descricao", "Coluna da descrição"], ["valor", "Coluna do valor"], ["credito", "Coluna de crédito"], ["debito", "Coluna de débito"]].map(([k, rotulo]) => (
                <Select key={k} label={rotulo} value={mapa.mapeamento[k] ?? ""} onChange={setCol(k)}>
                  <option value="">{k === "credito" || k === "debito" ? "Não tem" : "Escolha"}</option>
                  {colunas.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </Select>
              ))}
            </div>
            <span style={{ color: "var(--text-secondary)", fontSize: "var(--fs-p5-5)" }}>Use "valor" (com sinal) ou, se o banco separa, "crédito" e "débito".</span>
            <div><Button iconLeft="refresh-cw" loading={lendo} onClick={() => consultar(arquivo, mapa.mapeamento)}>Ler com estas colunas</Button></div>
          </>
        )}

        {previa && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-sm),1fr))", gap: "var(--space-4)" }}>
              <StatCard value={r.novas} label={r.duplicadas ? `novos (${r.duplicadas} já importados)` : "lançamentos novos"} color="var(--stat-1)" />
              <StatCard value={fmt(r.entradas)} label="entradas" color="var(--stat-3)" />
              <StatCard value={fmt(Math.abs(r.saidas))} label="saídas" color="var(--stat-4)" />
            </div>
            <Banner tone="info" title={arquivo.nome}>
              {previa.periodoInicio && `Período ${dataBR(previa.periodoInicio)} a ${dataBR(previa.periodoFim)}. `}
              {previa.saldoFinal != null && `Saldo final do banco: ${fmt(previa.saldoFinal)} em ${dataBR(previa.dataSaldoFinal)}. `}
              Nada foi gravado ainda.
            </Banner>
            {!r.novas && <Banner tone="warning">Todos os lançamentos deste arquivo já foram importados.</Banner>}
            <DataTable dense minWidth={0} rows={previa.transacoes.slice(0, 200)} rowKey={(t, i) => i} columns={[
              { key: "data", label: "Data", render: t => dataBR(t.data) },
              { key: "descricao", label: "Descrição", render: t => t.descricao },
              { key: "valor", label: "Valor", align: "right", render: t => <b style={{ color: t.valor >= 0 ? "var(--status-success-text)" : "var(--status-danger)" }}>{fmt(t.valor)}</b> },
              { key: "dup", label: "", render: t => t.duplicada && <Badge size="sm" tone="neutral">Já importada</Badge> },
            ]} />
            {previa.transacoes.length > 200 && <span style={{ color: "var(--text-secondary)", fontSize: "var(--fs-p5-5)" }}>Mostrando 200 de {previa.transacoes.length} lançamentos.</span>}
          </>
        )}
      </div>
    </Modal>
  );
}
