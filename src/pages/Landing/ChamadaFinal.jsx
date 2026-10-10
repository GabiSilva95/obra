import { Button, useIsMobile } from "../../../design-system";
import logoNegativo from "../../../design-system/assets/logo-negativo.svg";
import { DIAS_TESTE } from "./oferta";

const ANO = new Date().getFullYear();
const link = { display: "inline-flex", alignItems: "center", gap: "var(--space-1-5)", color: "var(--text-on-sidebar-muted)", textDecoration: "none" };

/** Fecho em grafite: a última provocação, a oferta repetida e o rodapé (sem e-mail nem telefone). */
export default function ChamadaFinal({ onTestar, onLogin, ir }) {
  const mobile = useIsMobile();
  return (
    <footer style={{ background: "var(--surface-sidebar)", color: "var(--text-on-sidebar)", padding: mobile ? "var(--space-16) var(--space-4) var(--space-24)" : "var(--space-24) var(--space-12) var(--space-10)" }}>
      <div style={{ maxWidth: "var(--content-w-xl)", margin: "0 auto", display: "flex", flexDirection: "column", gap: "var(--space-16)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: mobile ? "stretch" : "center", textAlign: mobile ? "left" : "center", gap: "var(--space-8)" }}>
          <h2 style={{ fontSize: "clamp(var(--fs-h3), 5vw, var(--fs-h1))", fontWeight: "var(--fw-black)", lineHeight: "var(--lh-tight)", letterSpacing: "var(--ls-tight)", maxWidth: "var(--content-w-lg)" }}>
            A próxima obra pode ser a primeira em que você <span style={{ color: "var(--accent)" }}>sabe o lucro antes de entregar.</span>
          </h2>
          <div style={{ display: "flex", flexDirection: mobile ? "column" : "row", gap: "var(--space-3)" }}>
            <Button variant="accent" size="lg" iconRight="arrow-right" fullWidth={mobile} onClick={() => onTestar()}>Testar grátis por {DIAS_TESTE} dias</Button>
            <Button variant="secondary" size="lg" iconLeft="circle-play" fullWidth={mobile} onClick={() => ir("veja-funcionando")}>Ver como funciona</Button>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: mobile ? "column" : "row", justifyContent: "space-between", alignItems: mobile ? "flex-start" : "center", gap: "var(--space-6)", borderTop: "var(--border-w) solid var(--surface-sidebar-hover)", paddingTop: "var(--space-8)" }}>
          <img src={logoNegativo} alt="ConstruktPro, do canteiro ao escritório" style={{ height: "var(--space-10)" }} />
          <nav aria-label="Rodapé" style={{ display: "flex", gap: "var(--space-6)", flexWrap: "wrap", fontSize: "var(--fs-p5)", fontWeight: "var(--fw-semibold)" }}>
            {[["Como funciona", "como-funciona"], ["Preços", "precos"], ["Dúvidas", "duvidas"]].map(([rotulo, id]) => (
              <a key={id} href={`#${id}`} onClick={e => { e.preventDefault(); ir(id); }} style={link}>{rotulo}</a>
            ))}
            <a href="/login" onClick={e => { e.preventDefault(); onLogin(); }} style={link}>Entrar</a>
          </nav>
          <span style={{ fontSize: "var(--fs-p6)", color: "var(--text-on-sidebar-muted)" }}>© {ANO} ConstruktPro</span>
        </div>
      </div>
    </footer>
  );
}
