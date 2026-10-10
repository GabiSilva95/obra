import { useEffect, useState } from "react";
import { Banner, BarChart, Button, Card, Tag, useIsMobile } from "../../../design-system";
import { fmt, today } from "../../utils/helpers";
import { somarDias } from "../../../server/utils/datas.js";
import { chavePeriodo } from "../../../server/financeiro/fluxo.js";
import { fmtCompacto, indicadoresFluxo, maxDoGrafico } from "./indicadores";
import { Aviso, dataBR, Linha, Pilha, plural, Secao, TituloSecao } from "./Secao";

const SEMANAS = 8;

const BlocoContas = ({ titulo, d, corAtraso }) => (
  <Card title={titulo}>
    <Pilha gap="var(--space-1)">
      <span style={{ font: "var(--type-stat)", fontSize: "var(--fs-h4)" }}>{fmt(d.aberto)}</span>
      <Aviso>em aberto, {plural(d.qtd, "conta", "contas")}</Aviso>
    </Pilha>
    <Pilha>
      <Linha rotulo={d.qtdVencido ? `Vencidas (${d.qtdVencido})` : "Vencidas"} valor={fmt(d.vencido)} destaque={d.vencido > 0 ? corAtraso : undefined} />
      <Linha rotulo="Vencem hoje" valor={fmt(d.hoje)} />
      <Linha rotulo="Próximos 7 dias" valor={fmt(d.prox7)} />
      <Linha rotulo="De 8 a 30 dias" valor={fmt(d.prox30)} />
    </Pilha>
  </Card>
);

/**
 * Financeiro: contas a pagar, a receber e fluxo de caixa. Sempre da empresa toda (o filtro de obra do painel não se aplica).
 * `resumo`: /financeiro/resumo (null enquanto carrega, false se falhou). O fluxo é buscado aqui, em semanas.
 */
export default function SecaoFinanceiro({ resumo, api, filtrado, ir }) {
  const mobile = useIsMobile();
  const [fluxo, setFluxo] = useState(null); // null carregando, false falhou
  useEffect(() => {
    let vivo = true;
    const de = chavePeriodo(today(), "semana");
    api.get(`/financeiro/fluxo?de=${de}&ate=${somarDias(de, SEMANAS * 7 - 1)}&agrupar=semana`)
      .then(r => { if (vivo) setFluxo(indicadoresFluxo(r)); })
      .catch(() => { if (vivo) setFluxo(false); });
    return () => { vivo = false; };
  }, []); // eslint-disable-line

  const acao = <Button size="sm" variant="secondary" iconRight="arrow-right" onClick={() => ir("financeiro")}>Abrir Financeiro</Button>;
  const etiqueta = filtrado && <Tag tone="neutral">Empresa toda, sem filtro de obra</Tag>;
  if (!resumo) {
    return (
      <section style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <TituloSecao icone="wallet" titulo="Financeiro" etiqueta={etiqueta} acao={resumo === false ? acao : undefined} />
        <Card><Aviso>{resumo === false ? "Não foi possível carregar os indicadores financeiros agora." : "Carregando…"}</Aviso></Card>
      </section>
    );
  }

  const saldoCor = v => (v >= 0 ? "var(--stat-1)" : "var(--status-danger)");
  const valores = fluxo ? fluxo.semanas.flatMap(s => [s.entradas, s.saidas]) : [];
  return (
    <Secao icone="wallet" titulo="Financeiro" etiqueta={etiqueta} acao={acao}
      numeros={[
        { valor: fmt(resumo.saldoTotal), rotulo: "Saldo em contas", cor: saldoCor(resumo.saldoTotal) },
        { valor: fmt(resumo.pagar.aberto), rotulo: "A pagar em aberto", cor: resumo.pagar.vencido > 0 ? "var(--status-danger)" : "var(--stat-4)", detalhe: resumo.pagar.vencido > 0 ? `${fmt(resumo.pagar.vencido)} vencido` : "Nada vencido" },
        { valor: fmt(resumo.receber.aberto), rotulo: "A receber em aberto", cor: "var(--stat-3)", detalhe: resumo.receber.vencido > 0 ? `${fmt(resumo.receber.vencido)} vencido` : "Nada vencido" },
        { valor: fluxo ? fmt(fluxo.saldoProjetado) : "—", rotulo: `Saldo projetado em ${SEMANAS} semanas`, cor: fluxo ? saldoCor(fluxo.saldoProjetado) : "var(--text-secondary)", detalhe: fluxo ? `Até ${dataBR(fluxo.ate)}` : undefined },
      ]}>
      <BlocoContas titulo="Contas a pagar" d={resumo.pagar} corAtraso="var(--status-danger)" />
      <BlocoContas titulo="Contas a receber" d={resumo.receber} corAtraso="var(--status-warning-text)" />

      <Card title="Fluxo de caixa" action={<Aviso>Próximas {SEMANAS} semanas</Aviso>} style={{ gridColumn: "1 / -1" }}>
        {!resumo.contas.length && <Banner tone="info" title="Cadastre uma conta">Com uma conta bancária ou o caixa cadastrado em Financeiro, o saldo e a projeção passam a valer.</Banner>}
        {fluxo === null && <Aviso>Carregando…</Aviso>}
        {fluxo === false && <Aviso>Não foi possível carregar o fluxo de caixa agora.</Aviso>}
        {fluxo && (
          <>
            {fluxo.negativo && (
              <Banner tone="danger" title="O caixa fica negativo">
                Na semana de {dataBR(fluxo.negativo.inicio)} a {dataBR(fluxo.negativo.fim)} o saldo projetado é {fmt(fluxo.negativo.acumulado)}.
              </Banner>
            )}
            <div style={{ display: "grid", gridTemplateColumns: mobile ? "minmax(0,1fr)" : "minmax(0,1fr) minmax(0,2fr)", gap: mobile ? "var(--space-5)" : "var(--space-8)", alignItems: "start" }}>
              <Pilha>
                <Linha rotulo="Saldo em contas hoje" valor={fmt(resumo.saldoTotal)} />
                <Linha rotulo="Entradas previstas" valor={fmt(fluxo.entradasPrev)} />
                <Linha rotulo="Saídas previstas" valor={fmt(fluxo.saidasPrev)} />
                {fluxo.atrasado.entradas > 0 && <Linha rotulo="A receber em atraso" valor={fmt(fluxo.atrasado.entradas)} destaque="var(--status-warning-text)" />}
                {fluxo.atrasado.saidas > 0 && <Linha rotulo="A pagar em atraso" valor={fmt(fluxo.atrasado.saidas)} destaque="var(--status-danger)" />}
                <div style={{ borderTop: "var(--border-w) solid var(--border-subtle)", paddingTop: "var(--space-2)" }}>
                  <Linha rotulo={`Saldo projetado em ${dataBR(fluxo.ate)}`} valor={fmt(fluxo.saldoProjetado)} forte destaque={fluxo.saldoProjetado < 0 ? "var(--status-danger)" : undefined} />
                </div>
              </Pilha>
              <Pilha gap="var(--space-3)">
                <BarChart height={180} max={maxDoGrafico(valores)} format={fmtCompacto}
                  series={[{ key: "entradas", label: "Entradas", color: "var(--status-success)" }, { key: "saidas", label: "Saídas", color: "var(--status-danger)" }]}
                  data={fluxo.semanas.map((s, i) => ({ label: mobile && i % 2 ? "" : dataBR(s.inicio).slice(0, 5), entradas: s.entradas, saidas: s.saidas }))} />
                <Aviso>Semanas a partir da data indicada, com o realizado e o previsto. Contas vencidas e não pagas não entram nas barras, mas contam no saldo projetado.</Aviso>
              </Pilha>
            </div>
          </>
        )}
      </Card>
    </Secao>
  );
}
