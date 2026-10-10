import { Card, DataTable, Icon, useIsMobile } from "../../../design-system";
import { Carimbo, Prancha, Titulo } from "./visual";
import { DIAS_TESTE, SEM_IMPLANTACAO } from "./oferta";

const LINHAS = [
  { id: 1, item: "Lucro de cada obra", antes: "Só no fim, se alguém fizer a conta", agora: "A qualquer momento" },
  { id: 2, item: "Aviso de orçamento estourando", antes: "Não tem", agora: "Automático, no sino" },
  { id: 3, item: "Saldo de material por obra", antes: "Contando no canteiro", agora: "Atualizado a cada compra e baixa" },
  { id: 4, item: "Conta a pagar no dia certo", antes: "Na memória de alguém", agora: "Com aviso de vencimento" },
  { id: 5, item: "O que aconteceu na obra", antes: "Perdido no grupo do WhatsApp", agora: "No diário de obra, com data" },
  { id: 6, ...SEM_IMPLANTACAO.comparativo },
  { id: 7, item: "Para começar", antes: "Grátis, mas custa caro", agora: `${DIAS_TESTE} dias grátis` },
];

const Agora = ({ texto }) => (
  <span style={{ display: "inline-flex", alignItems: "flex-start", gap: "var(--space-1-5)", fontWeight: "var(--fw-bold)", color: "var(--status-success-text)" }}>
    <Icon name="check" size={16} stroke={2.4} style={{ flexShrink: 0, marginTop: "var(--space-0-5)" }} />{texto}
  </span>
);

/** Comparativo honesto com o jeito de hoje (não com concorrentes). No celular, um cartão por linha. */
export default function Comparativo() {
  const mobile = useIsMobile();
  return (
    <Prancha id="comparativo" papel largura="var(--content-w-lg)">
      <Carimbo numero={6}>Compare</Carimbo>
      <Titulo>Planilha, WhatsApp e caderno, ou um lugar só?</Titulo>
      {mobile ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {LINHAS.map(l => (
            <Card key={l.id} padding="var(--space-4)" style={{ gap: "var(--space-2)" }}>
              <b style={{ fontSize: "var(--fs-p4)" }}>{l.item}</b>
              <span style={{ display: "inline-flex", alignItems: "flex-start", gap: "var(--space-1-5)", fontSize: "var(--fs-p5)", color: "var(--text-muted)" }}>
                <Icon name="x" size={16} style={{ flexShrink: 0, marginTop: "var(--space-0-5)" }} />Hoje: {l.antes}
              </span>
              <span style={{ fontSize: "var(--fs-p5)" }}><Agora texto={l.agora} /></span>
            </Card>
          ))}
        </div>
      ) : (
        <DataTable minWidth={0} rows={LINHAS} rowKey={l => l.id} columns={[
          { key: "item", label: "O que você precisa", render: l => <b>{l.item}</b> },
          { key: "antes", label: "Planilha e WhatsApp", render: l => <span style={{ color: "var(--text-muted)" }}>{l.antes}</span> },
          { key: "agora", label: "ConstruktPro", render: l => <Agora texto={l.agora} /> },
        ]} />
      )}
    </Prancha>
  );
}
