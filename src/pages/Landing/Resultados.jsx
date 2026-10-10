import { Avatar, Badge, Card, Icon, ProgressBar, Tag, useIsMobile } from "../../../design-system";
import { Carimbo, Cota, Exemplo, Prancha, Revelar, Titulo } from "./visual";

const Num = ({ rotulo, valor, cor }) => (
  <span style={{ display: "flex", flexDirection: "column", gap: "var(--space-0-5)" }}>
    <span style={{ fontSize: "var(--fs-p6)", fontWeight: "var(--fw-semibold)", color: "var(--text-muted)" }}>{rotulo}</span>
    <b style={{ fontSize: "var(--fs-h5)", fontWeight: "var(--fw-extrabold)", color: cor }}>{valor}</b>
  </span>
);

const Bloco = ({ titulo, texto, children }) => (
  <Card padding="var(--space-5)" style={{ gap: "var(--space-3)", height: "100%" }}>
    <h3 style={{ fontSize: "var(--fs-p2)", fontWeight: "var(--fw-extrabold)", lineHeight: "var(--lh-snug)" }}>{titulo}</h3>
    <p style={{ fontSize: "var(--fs-p5)", fontWeight: "var(--fw-medium)", lineHeight: "var(--lh-body)", color: "var(--text-muted)" }}>{texto}</p>
    {children}
  </Card>
);

const Fluxo = ({ itens }) => (
  <span style={{ display: "flex", alignItems: "center", gap: "var(--space-1-5)", flexWrap: "wrap" }}>
    {itens.map((t, i) => <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-1-5)" }}>{i > 0 && <Icon name="arrow-right" size={14} color="var(--text-faint)" />}<Tag tone="neutral">{t}</Tag></span>)}
  </span>
);

// Os três problemas que o cliente quer ver resolvidos, cada um com o que o sistema faz (só o que existe hoje)
const PILARES = [
  {
    nome: "Informação",
    frase: "Saber, sem perguntar para ninguém.",
    blocos: [
      { titulo: "Lucro de cada obra, sem esperar o fim", texto: "Receita e custo de cada obra, com o lucro e a margem, a qualquer momento.",
        extra: <><span style={{ display: "flex", gap: "var(--space-5)", flexWrap: "wrap" }}><Num rotulo="Receitas" valor="R$ 410 mil" /><Num rotulo="Custos" valor="R$ 352 mil" /><Num rotulo="Lucro" valor="R$ 58 mil" cor="var(--status-success-text)" /></span><Exemplo /></> },
      { titulo: "Cada um vê o que precisa", texto: "O mestre lança no canteiro e o escritório acompanha. Acesso por tela e por obra.",
        extra: <span style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>{["Ana Ribeiro", "Carlos Menezes", "João Pereira"].map(n => <Avatar key={n} name={n} size={30} />)}<span style={{ marginLeft: "var(--space-2)", display: "flex", gap: "var(--space-1)", flexWrap: "wrap" }}><Tag tone="neutral">Obras</Tag><Tag tone="neutral">Estoque</Tag><Tag tone="accent">Financeiro</Tag></span></span> },
    ],
  },
  {
    nome: "Organização",
    frase: "Cada coisa no seu lugar, de cada obra.",
    blocos: [
      { titulo: "Material com dono", texto: "Da compra à baixa por etapa, você sabe quanto tem e onde foi parar. A nota fiscal (XML) entra sozinha.",
        extra: <Fluxo itens={["Compra", "Entrega", "Estoque", "Baixa por etapa"]} /> },
      { titulo: "Equipe e máquina na conta", texto: "Diária de cada pessoa e hora de cada máquina viram custo da obra, sem planilha paralela.",
        extra: <Fluxo itens={["Equipe no diário", "Horas de máquina", "Custo da obra"]} /> },
    ],
  },
  {
    nome: "Controle",
    frase: "Agir antes do problema, não depois.",
    blocos: [
      { titulo: "Aviso antes de estourar", texto: "O sino avisa orçamento acima de 90%, etapa atrasada, prazo chegando e estoque zerado.",
        extra: <><Badge tone="warning">Orçamento crítico · Casa Jardim, 92%</Badge><ProgressBar value={92} color="var(--status-danger)" label="Orçamento usado" /></> },
      { titulo: "Contas sem susto", texto: "Contas a pagar e a receber por vencimento, fluxo de caixa das próximas semanas e conferência com o extrato do banco.",
        extra: <><Cota>R$ 6.000,00 vencem nesta semana</Cota><Exemplo /></> },
    ],
  },
];

/** O que muda: informação, organização e controle, cada um com dois resultados concretos. */
export default function Resultados() {
  const mobile = useIsMobile();
  return (
    <Prancha id="resultados">
      <Carimbo numero={5}>O que muda na sua obra</Carimbo>
      <Titulo apoio="O ConstruktPro resolve os três problemas de quem toca obra: falta de informação, bagunça e falta de controle.">Informação no lugar, obra organizada, dinheiro sob controle.</Titulo>
      <div style={{ display: "grid", gridTemplateColumns: mobile ? "minmax(0,1fr)" : "repeat(3,minmax(0,1fr))", gap: "var(--space-6)" }}>
        {PILARES.map((p, i) => (
          <Revelar key={p.nome} atraso={i} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)", borderTop: "var(--space-1) solid var(--accent)", paddingTop: "var(--space-3)" }}>
              <span style={{ fontSize: "var(--fs-h3)", fontWeight: "var(--fw-black)", letterSpacing: "var(--ls-tight)" }}>{p.nome}</span>
              <span style={{ fontSize: "var(--fs-p5)", fontWeight: "var(--fw-semibold)", color: "var(--text-muted)" }}>{p.frase}</span>
            </div>
            {p.blocos.map(b => <Bloco key={b.titulo} titulo={b.titulo} texto={b.texto}>{b.extra}</Bloco>)}
          </Revelar>
        ))}
      </div>
    </Prancha>
  );
}
