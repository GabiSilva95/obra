import { Button, Icon, useIsMobile } from "../../../design-system";
import AntesDepois from "./AntesDepois";
import { Carimbo } from "./visual";
import { DIAS_TESTE, GARANTIAS_TOPO } from "./oferta";

/** Primeira dobra: a pergunta que incomoda, a resposta em uma linha, a oferta e a prova visual. */
export default function Topo({ onTestar, onVer, refCta }) {
  const mobile = useIsMobile();
  return (
    <header className="lp-papel" style={{ padding: mobile ? "var(--space-10) var(--space-4) var(--space-12)" : "var(--space-16) var(--space-12)" }}>
      <div style={{ maxWidth: "var(--content-w-xl)", margin: "0 auto", display: "flex", flexDirection: "column", gap: mobile ? "var(--space-6)" : "var(--space-10)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <Carimbo numero={1}>Para construtoras e empreiteiros</Carimbo>
          <h1 style={{ fontSize: "clamp(var(--fs-h3), 7vw, var(--fs-hero))", fontWeight: "var(--fw-black)", lineHeight: "var(--lh-hero)", letterSpacing: "var(--ls-tight)", maxWidth: "var(--content-w-lg)" }}>
            Sua obra está dando lucro ou prejuízo? <span className="lp-viga">Saiba hoje</span>, não no fim da obra.
          </h1>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "minmax(0,1fr)" : "minmax(0,0.8fr) minmax(0,1.2fr)", gap: mobile ? "var(--space-8)" : "var(--space-12)", alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
            <p style={{ fontSize: mobile ? "var(--fs-p3)" : "var(--fs-p2)", fontWeight: "var(--fw-medium)", lineHeight: "var(--lh-body)", color: "var(--text-muted)" }}>
              O ConstruktPro junta compras, estoque, equipe e contas de cada obra num lugar só. Do canteiro ao escritório, no celular ou no computador.
            </p>
            <div ref={refCta} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", alignItems: mobile ? "stretch" : "flex-start" }}>
              <Button variant="accent" size="lg" iconRight="arrow-right" fullWidth={mobile} onClick={() => onTestar()}>Testar grátis por {DIAS_TESTE} dias</Button>
              <Button variant="secondary" size="lg" iconLeft="circle-play" fullWidth={mobile} onClick={onVer}>Ver como funciona</Button>
            </div>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {GARANTIAS_TOPO.map(g => (
                <li key={g} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--fs-p5)", fontWeight: "var(--fw-bold)" }}>
                  <Icon name="check" size={16} color="var(--status-success)" stroke={2.4} />{g}
                </li>
              ))}
            </ul>
          </div>
          <AntesDepois />
        </div>
      </div>
    </header>
  );
}
