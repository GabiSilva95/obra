import { Banner, Button, IconButton, MoneyInput, Select, Tag } from "../../design-system";
import { emCentavos, emReais, dividirIgual } from "../pages/Financeiro/util";
import { fmt } from "../utils/helpers";

/**
 * Rateio de um valor entre obras, etapas e centros de custo.
 * Uma linha = tudo numa obra (ou centro): o valor acompanha o total e o caso comum custa um clique.
 * Com mais de uma linha, a soma precisa fechar o total para salvar.
 *
 * `linhas`: [{ obraId, etapaId, centroCustoId, valor }] (reais). `onChange(novasLinhas)`.
 * Use `linhasFinais(linhas, total)` na hora de enviar: com uma linha só, o valor é o total.
 */
export const linhaVazia = () => ({ obraId: "", etapaId: "", centroCustoId: "", valor: "" });

export const linhasFinais = (linhas, total) =>
  linhas.length === 1 ? [{ ...linhas[0], valor: total }] : linhas;

/** Mensagem do que falta (ou null se fecha). */
export function erroRateio(linhas, total) {
  const finais = linhasFinais(linhas, total);
  for (const [i, l] of finais.entries()) {
    if (!l.obraId && !l.centroCustoId) return `Rateio, linha ${i + 1}: escolha uma obra ou um centro de custo.`;
  }
  const dif = emCentavos(total) - finais.reduce((s, l) => s + emCentavos(l.valor || 0), 0);
  if (dif > 0) return `Falta ratear ${fmt(emReais(dif))}.`;
  if (dif < 0) return `O rateio passa ${fmt(emReais(-dif))} do valor.`;
  return null;
}

export default function RateioEditor({ linhas, onChange, total, obras, etapasObra = [], tiposEtapa = [], centros = [], erro }) {
  const unica = linhas.length === 1;
  const finais = linhasFinais(linhas, total);
  const soma = finais.reduce((s, l) => s + emCentavos(l.valor || 0), 0);
  const falta = emCentavos(total || 0) - soma;
  const nomeEtapa = e => tiposEtapa.find(t => t.id === e.tipoEtapaId)?.nome || `Etapa ${e.id}`;

  const set = (i, campo) => e => onChange(linhas.map((l, j) => (j === i ? { ...l, [campo]: e.target.value, ...(campo === "obraId" ? { etapaId: "" } : {}) } : l)));
  const remover = i => onChange(linhas.filter((_, j) => j !== i));
  const adicionar = () => {
    // A segunda linha já nasce com o que sobra, para o usuário só escolher a obra
    onChange([...linhas.map((l, j) => (j === 0 && unica ? { ...l, valor: total } : l)), { ...linhaVazia(), valor: falta > 0 && !unica ? emReais(falta) : "" }]);
  };
  const dividir = () => {
    const partes = dividirIgual(emCentavos(total || 0), linhas.length);
    onChange(linhas.map((l, i) => ({ ...l, valor: emReais(partes[i]) })));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-2)", flexWrap: "wrap" }}>
        <h3 style={{ margin: 0, font: "var(--type-card-title)", fontSize: "var(--fs-p4)" }}>Rateio</h3>
        {!unica && total > 0 && (falta === 0
          ? <Tag tone="success">Rateio fechado</Tag>
          : <Tag tone="accent">{falta > 0 ? `Falta ratear ${fmt(emReais(falta))}` : `Passa ${fmt(emReais(-falta))}`}</Tag>)}
      </div>

      {linhas.map((l, i) => {
        const etapas = etapasObra.filter(e => e.obraId === parseInt(l.obraId || 0));
        return (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-sm),1fr))", gap: "var(--space-2)", alignItems: "end", paddingBottom: "var(--space-3)", borderBottom: linhas.length > 1 ? "var(--border-w) solid var(--border-subtle)" : "none" }}>
            <Select label={i === 0 ? "Obra" : undefined} aria-label="Obra" value={l.obraId} onChange={set(i, "obraId")}>
              <option value="">Sem obra</option>
              {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
            </Select>
            <Select label={i === 0 ? "Etapa" : undefined} aria-label="Etapa" disabled={!l.obraId} value={l.etapaId} onChange={set(i, "etapaId")}>
              <option value="">Sem etapa</option>
              {etapas.map(e => <option key={e.id} value={e.id}>{nomeEtapa(e)}</option>)}
            </Select>
            <Select label={i === 0 ? "Centro de custo" : undefined} aria-label="Centro de custo" value={l.centroCustoId} onChange={set(i, "centroCustoId")}>
              <option value="">Sem centro de custo</option>
              {centros.filter(c => c.ativo !== false || c.id === parseInt(l.centroCustoId || 0)).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </Select>
            <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "end" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <MoneyInput label={i === 0 ? "Valor" : undefined} aria-label="Valor da linha" disabled={unica} value={unica ? total : l.valor} onChange={set(i, "valor")} />
              </div>
              {!unica && <IconButton icon="trash-2" variant="outline" size={40} label="Remover linha" onClick={() => remover(i)} />}
            </div>
          </div>
        );
      })}

      <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
        <Button variant="secondary" size="sm" iconLeft="plus" onClick={adicionar}>Ratear em mais de uma linha</Button>
        {!unica && <Button variant="secondary" size="sm" onClick={dividir}>Dividir igualmente</Button>}
      </div>
      {erro && <Banner tone="danger">{erro}</Banner>}
    </div>
  );
}
