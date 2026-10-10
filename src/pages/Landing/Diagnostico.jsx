import { useState } from "react";
import { Button, Card, Icon, useIsMobile } from "../../../design-system";
import { Carimbo, Prancha, Revelar, Titulo } from "./visual";
import { DIAS_TESTE, DORES, resultadoDiagnostico } from "./oferta";

/** Raio-X da obra: a pessoa marca as dores que reconhece e vê, para cada uma, o que o sistema faz. */
export default function Diagnostico({ onTestar }) {
  const mobile = useIsMobile();
  const [marcadas, setMarcadas] = useState(() => new Set());
  const alternar = i => setMarcadas(m => { const n = new Set(m); if (n.has(i)) n.delete(i); else n.add(i); return n; });
  const r = resultadoDiagnostico(marcadas.size);

  return (
    <Prancha id="raio-x" escura>
      <Carimbo numero={2} escuro>Raio-X da obra</Carimbo>
      <Titulo escuro apoio="Marque o que acontece aí. Ninguém está olhando.">Quantas destas acontecem na sua obra?</Titulo>
      <div style={{ display: "grid", gridTemplateColumns: mobile ? "minmax(0,1fr)" : "minmax(0,1.5fr) minmax(0,1fr)", gap: "var(--space-6)", alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {DORES.map((d, i) => {
            const on = marcadas.has(i);
            return (
              <Revelar key={d.dor} atraso={i}>
                <Card padding="var(--space-4) var(--space-5)" selected={on} onClick={() => alternar(i)} style={{ color: "var(--text-primary)", gap: "var(--space-2)" }}>
                  <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-start" }}>
                    <Icon name={on ? "square-check" : "square"} size={22} color={on ? "var(--accent)" : "var(--text-faint)"} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: "var(--fs-p4)", fontWeight: "var(--fw-bold)", lineHeight: "var(--lh-snug)" }}>{d.dor}</span>
                  </div>
                  {on && (
                    <span style={{ display: "flex", gap: "var(--space-2)", alignItems: "flex-start", marginLeft: "var(--space-8)", fontSize: "var(--fs-p5)", fontWeight: "var(--fw-semibold)", color: "var(--text-accent)" }}>
                      <Icon name="arrow-right" size={16} style={{ flexShrink: 0, marginTop: "var(--space-0-5)" }} />{d.solucao}
                    </span>
                  )}
                </Card>
              </Revelar>
            );
          })}
        </div>
        <div style={{ position: mobile ? "static" : "sticky", top: "var(--space-24)", display: "flex", flexDirection: "column", gap: "var(--space-4)", padding: "var(--space-6)", border: "var(--border-w) solid var(--surface-sidebar-hover)", borderRadius: "var(--radius-xl)" }}>
          <span style={{ fontSize: "var(--fs-p6)", fontWeight: "var(--fw-extrabold)", letterSpacing: "var(--ls-caps)", textTransform: "uppercase", color: "var(--text-on-sidebar-muted)" }}>Seu resultado</span>
          <span aria-live="polite" style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            <span style={{ fontSize: "var(--fs-h1)", fontWeight: "var(--fw-black)", lineHeight: "var(--lh-none)", color: "var(--accent)" }}>{r.titulo}</span>
            <span style={{ fontSize: "var(--fs-p3)", fontWeight: "var(--fw-bold)", lineHeight: "var(--lh-snug)", color: "var(--text-on-sidebar)" }}>{r.texto}</span>
          </span>
          <Button variant="accent" size="lg" iconRight="arrow-right" fullWidth onClick={() => onTestar()}>Resolver no teste grátis</Button>
          <span style={{ fontSize: "var(--fs-p6)", color: "var(--text-on-sidebar-muted)" }}>{DIAS_TESTE} dias grátis, sem cartão de crédito.</span>
        </div>
      </div>
    </Prancha>
  );
}
