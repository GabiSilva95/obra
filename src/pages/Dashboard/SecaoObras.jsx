import { Badge, Button, Card, ProgressBar } from "../../../design-system";
import { fmt } from "../../utils/helpers";
import { Aviso, Linha, Pilha, plural, Rotulo, Secao } from "./Secao";

const corOrcamento = pct => (pct > 90 ? "var(--status-danger)" : pct > 70 ? "var(--status-warning)" : "var(--status-success)");
const perc = v => (v == null ? "—" : `${v}%`);

/** Obras: progresso do cronograma e orçamento, somando as obras listadas. */
export default function SecaoObras({ ind, ir }) {
  const { etapas, comAtraso, pertoDoLimite } = ind;
  return (
    <Secao icone="building-2" titulo="Obras" acao={<Button size="sm" variant="secondary" iconRight="arrow-right" onClick={() => ir("obras")}>Ver obras</Button>}
      numeros={[
        { valor: ind.ativas, rotulo: "Obras ativas", cor: "var(--stat-1)" },
        { valor: perc(ind.progressoMedio), rotulo: "Progresso médio", cor: "var(--stat-2)", detalhe: "Das obras não concluídas" },
        { valor: etapas.atrasadas, rotulo: "Etapas atrasadas", cor: etapas.atrasadas > 0 ? "var(--status-danger)" : "var(--stat-3)" },
        { valor: perc(ind.pctUsado), rotulo: "Orçamento usado", cor: ind.pctUsado == null ? "var(--text-secondary)" : ind.pctUsado > 100 ? "var(--status-danger)" : "var(--stat-4)", detalhe: ind.pctUsado == null ? "Sem orçamento informado" : `${fmt(ind.custoTotal)} de ${fmt(ind.orcamentoTotal)}` },
      ]}>
      <Card title="Progresso do cronograma">
        <Pilha gap="var(--space-1-5)">
          <div style={{ display: "flex", justifyContent: "space-between", font: "var(--type-label)" }}>
            <span style={{ color: "var(--text-secondary)" }}>Progresso médio</span><span>{perc(ind.progressoMedio)}</span>
          </div>
          <ProgressBar value={ind.progressoMedio ?? 0} color="var(--accent)" label="Progresso médio do cronograma" />
        </Pilha>
        {etapas.total === 0 ? <Aviso>Nenhuma etapa cadastrada nas obras.</Aviso> : (
          <>
            <Pilha>
              <Linha rotulo="Etapas concluídas" valor={etapas.concluidas} />
              <Linha rotulo="Em andamento" valor={etapas.emAndamento} />
              <Linha rotulo="A iniciar" valor={etapas.aIniciar} />
              <Linha rotulo="Atrasadas" valor={etapas.atrasadas} destaque={etapas.atrasadas > 0 ? "var(--status-danger)" : undefined} />
            </Pilha>
            {comAtraso.length > 0 ? (
              <Pilha>
                <Rotulo>Obras com etapas atrasadas</Rotulo>
                {comAtraso.slice(0, 4).map(l => (
                  <div key={l.obra.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-3)", fontSize: "var(--fs-p5-5)" }}>
                    <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.obra.nome}</span>
                    <Badge size="sm" tone="error">{plural(l.atrasadas, "atraso", "atrasos")}</Badge>
                  </div>
                ))}
              </Pilha>
            ) : <Aviso cor="var(--status-success-text)">Nenhuma etapa atrasada.</Aviso>}
          </>
        )}
      </Card>

      <Card title="Orçamento">
        {ind.pctUsado == null ? <Aviso>Nenhuma obra com orçamento informado. Informe o orçamento em Obras.</Aviso> : (
          <Pilha gap="var(--space-1-5)">
            <div style={{ display: "flex", justifyContent: "space-between", font: "var(--type-label)" }}>
              <span style={{ color: "var(--text-secondary)" }}>Usado do orçamento</span>
              <span style={{ color: ind.pctUsado > 90 ? "var(--status-danger)" : "var(--text-primary)" }}>{ind.pctUsado}%</span>
            </div>
            <ProgressBar value={ind.pctUsado} color={corOrcamento(ind.pctUsado)} label="Orçamento usado" />
          </Pilha>
        )}
        <Pilha>
          <Linha rotulo="Orçamento total" valor={fmt(ind.orcamentoTotal)} />
          <Linha rotulo="Custo realizado" valor={fmt(ind.custoTotal)} />
          <Linha rotulo="Saldo do orçamento" valor={fmt(ind.saldoOrcamento)} forte destaque={ind.pctUsado != null && ind.saldoOrcamento < 0 ? "var(--status-danger)" : undefined} />
        </Pilha>
        {pertoDoLimite.length > 0 && (
          <Pilha>
            <Rotulo>Perto do limite do orçamento</Rotulo>
            {pertoDoLimite.slice(0, 4).map(l => (
              <div key={l.obra.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-3)", fontSize: "var(--fs-p5-5)" }}>
                <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.obra.nome}</span>
                <Badge size="sm" tone={l.pct > 100 ? "error" : "warning"}>{l.pct > 100 ? `Estourado · ${l.pct}%` : `${l.pct}%`}</Badge>
              </div>
            ))}
          </Pilha>
        )}
      </Card>
    </Secao>
  );
}
