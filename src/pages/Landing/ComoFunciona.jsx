import { Card, Icon, useIsMobile } from "../../../design-system";
import { Carimbo, Cota, Prancha, Revelar, Titulo } from "./visual";
import { SEM_IMPLANTACAO } from "./oferta";

const PASSOS = [
  { icone: "building-2", titulo: "Cadastre a obra", texto: "Escolha o tipo de obra e as etapas do cronograma aparecem prontas." },
  { icone: "hard-hat", titulo: "Lance no dia a dia", texto: "Compra, material usado, diária e conta a pagar. Do canteiro, pelo celular." },
  { icone: "trending-up", titulo: "Veja o resultado", texto: "Custo, orçamento, contas e estoque de cada obra, na tela de Início." },
];

/** Como funciona: três passos curtos e o apoio que a pessoa recebe (tour e vídeos). */
export default function ComoFunciona() {
  const mobile = useIsMobile();
  return (
    <Prancha id="como-funciona">
      <Carimbo numero={3}>Como funciona</Carimbo>
      <Titulo apoio={SEM_IMPLANTACAO.apoioComoFunciona}>Três passos. Sem curso e sem consultoria.</Titulo>
      <div style={{ display: "grid", gridTemplateColumns: mobile ? "minmax(0,1fr)" : "repeat(3,minmax(0,1fr))", gap: mobile ? "var(--space-8)" : "var(--space-10)" }}>
        {PASSOS.map((p, i) => (
          <Revelar key={p.titulo} atraso={i}>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <span style={{ fontSize: "var(--fs-hero)", fontWeight: "var(--fw-black)", lineHeight: "var(--lh-none)", letterSpacing: "var(--ls-tight)", color: "var(--accent)" }}>{String(i + 1).padStart(2, "0")}</span>
                <Icon name={p.icone} size={28} color="var(--text-muted)" />
              </div>
              <h3 style={{ fontSize: "var(--fs-h4)", fontWeight: "var(--fw-extrabold)", lineHeight: "var(--lh-snug)" }}>{p.titulo}</h3>
              <p style={{ fontSize: "var(--fs-p4)", fontWeight: "var(--fw-medium)", lineHeight: "var(--lh-body)", color: "var(--text-muted)" }}>{p.texto}</p>
            </div>
          </Revelar>
        ))}
      </div>
      {!mobile && <Cota cor="var(--text-faint)">do canteiro ao escritório</Cota>}
      <Card padding="var(--space-5) var(--space-6)" style={{ flexDirection: "row", alignItems: "center", gap: "var(--space-4)", background: "var(--surface-accent-subtle)", borderColor: "var(--accent-soft)" }}>
        <Icon name="graduation-cap" size={28} color="var(--text-accent)" style={{ flexShrink: 0 }} />
        <p style={{ fontSize: "var(--fs-p4)", fontWeight: "var(--fw-medium)", lineHeight: "var(--lh-body)" }}>
          <b>Você não fica sozinho.</b> Na primeira entrada um tour mostra o caminho, e cada tela tem um vídeo curto explicando o que preencher.
        </p>
      </Card>
    </Prancha>
  );
}
