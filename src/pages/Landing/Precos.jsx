import { useState } from "react";
import { Badge, Button, Card, Icon, SegmentedTabs, useIsMobile } from "../../../design-system";
import { PLANOS } from "../../constants/data";
import { Carimbo, Cota, Prancha, Titulo } from "./visual";
import { DIAS_TESTE, SEM_IMPLANTACAO, economiaAnual, precoPorDia, reais } from "./oferta";

const GARANTIAS = [
  { icone: "shield-check", texto: `${DIAS_TESTE} dias grátis, sem cartão` },
  { icone: "zap", texto: SEM_IMPLANTACAO.garantiaPrecos },
  { icone: "key", texto: "Sem fidelidade: cancele quando quiser" },
  { icone: "download", texto: "Seus dados são seus: exporte em CSV e PDF" },
  { icone: "globe", texto: "No celular e no computador, sem instalar" },
];

/** Preços abertos, com o preço por dia como âncora e o teste grátis em todos os planos. */
export default function Precos({ onTestar }) {
  const mobile = useIsMobile();
  const [ciclo, setCiclo] = useState("mensal");
  const anual = ciclo === "anual";

  return (
    <Prancha id="precos">
      <Carimbo numero={7}>Preços</Carimbo>
      <Titulo apoio={`Preço aberto, sem taxa escondida. Teste ${DIAS_TESTE} dias grátis em qualquer plano.`}>Menos que um saco de cimento por dia.</Titulo>
      <div style={{ alignSelf: "flex-start" }}>
        <SegmentedTabs variant="light" value={ciclo} onChange={setCiclo} tabs={[{ value: "mensal", label: "Mensal" }, { value: "anual", label: "Anual · 20% off" }]} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: mobile ? "minmax(0,1fr)" : "repeat(3,minmax(0,1fr))", gap: "var(--space-6)", alignItems: "stretch" }}>
        {/* No celular o recomendado vem primeiro, para não ficar depois de uma rolagem longa */}
        {(mobile ? [...PLANOS].sort((a, b) => !!b.popular - !!a.popular) : PLANOS).map(p => {
          const preco = anual ? p.preco.anual : p.preco.mensal;
          return (
            <Card key={p.id} selected={!!p.popular} padding="var(--space-6)" style={{ gap: "var(--space-5)", borderWidth: p.popular ? "var(--border-w-thick)" : undefined }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-2)" }}>
                <h3 style={{ fontSize: "var(--fs-h4)", fontWeight: "var(--fw-black)" }}>{p.nome}</h3>
                {p.popular && <Badge tone="accent">Recomendado</Badge>}
              </div>
              <p style={{ fontSize: "var(--fs-p5)", fontWeight: "var(--fw-medium)", color: "var(--text-muted)" }}>{p.desc}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                <span><span style={{ fontSize: "var(--fs-h2)", fontWeight: "var(--fw-black)", letterSpacing: "var(--ls-tight)" }}>R$ {preco}</span><span style={{ color: "var(--text-muted)", fontWeight: "var(--fw-semibold)" }}> /mês</span></span>
                <Cota>{reais(precoPorDia(preco))} por dia</Cota>
                <span style={{ fontSize: "var(--fs-p6)", fontWeight: "var(--fw-semibold)", color: anual ? "var(--status-success-text)" : "var(--text-muted)" }}>
                  {anual ? `Cobrado por ano: economia de ${reais(economiaAnual(p))}` : `ou R$ ${p.preco.anual}/mês no plano anual`}
                </span>
              </div>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "var(--space-2)", flex: 1 }}>
                {p.features.map(f => (
                  <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-2)", fontSize: "var(--fs-p5)", fontWeight: "var(--fw-semibold)" }}>
                    <Icon name="check" size={16} color="var(--status-success)" stroke={2.4} style={{ flexShrink: 0, marginTop: "var(--space-0-5)" }} />{f}
                  </li>
                ))}
              </ul>
              <Button fullWidth size="lg" variant={p.popular ? "accent" : "secondary"} iconRight="arrow-right" onClick={() => onTestar(p.id)}>Testar grátis {DIAS_TESTE} dias</Button>
            </Card>
          );
        })}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: mobile ? "minmax(0,1fr)" : "repeat(auto-fit,minmax(var(--col-min-md),1fr))", gap: "var(--space-4)", padding: "var(--space-5)", border: "var(--border-w) dashed var(--border-strong)", borderRadius: "var(--radius-lg)" }}>
        {GARANTIAS.map(g => (
          <span key={g.texto} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--fs-p5)", fontWeight: "var(--fw-bold)" }}>
            <Icon name={g.icone} size={20} color="var(--text-accent)" style={{ flexShrink: 0 }} />{g.texto}
          </span>
        ))}
      </div>
    </Prancha>
  );
}
