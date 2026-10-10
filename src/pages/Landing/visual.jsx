import { useEffect, useRef, useState } from "react";
import { useIsMobile } from "../../../design-system";

/** Vira true (uma vez) quando o elemento entra na tela. Sem IntersectionObserver, já nasce visível. */
export function useNaTela(margem = "0% 0% -10% 0%") {
  const ref = useRef(null);
  const [visto, setVisto] = useState(() => typeof IntersectionObserver === "undefined");
  useEffect(() => {
    if (visto || !ref.current) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisto(true); obs.disconnect(); } }, { rootMargin: margem });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [visto, margem]);
  return [ref, visto];
}

/** Entra suave ao rolar até ele (o CSS desliga com movimento reduzido). */
export function Revelar({ children, atraso = 0, style }) {
  const [ref, visto] = useNaTela();
  return (
    <div ref={ref} className={`lp-revelar${visto ? " lp-visivel" : ""}`} style={{ transitionDelay: `calc(var(--dur-fast) * ${atraso})`, ...style }}>
      {children}
    </div>
  );
}

/** Uma "prancha": seção da página com largura de conteúdo, papel quadriculado ou fundo grafite. */
export function Prancha({ id, papel, escura, children, largura = "var(--content-w-xl)", style }) {
  const mobile = useIsMobile();
  return (
    <section id={id} className={papel ? "lp-papel" : undefined}
      style={{ background: escura ? "var(--surface-sidebar)" : undefined, color: escura ? "var(--text-on-sidebar)" : undefined, padding: mobile ? "var(--space-12) var(--space-4)" : "var(--space-16) var(--space-12)", scrollMarginTop: "var(--space-16)", ...style }}>
      <div style={{ maxWidth: largura, margin: "0 auto", display: "flex", flexDirection: "column", gap: mobile ? "var(--space-6)" : "var(--space-8)" }}>{children}</div>
    </section>
  );
}

/** Carimbo de prancha: a etiqueta da seção, como o selo de um projeto de engenharia, com a barra laranja do logo. */
export function Carimbo({ numero, children, escuro }) {
  return (
    <span style={{
      alignSelf: "flex-start", display: "inline-flex", flexDirection: "column", gap: "var(--space-1)",
      padding: "var(--space-1-5) var(--space-2-5) var(--space-2)", fontSize: "var(--fs-caption)", fontWeight: "var(--fw-extrabold)", letterSpacing: "var(--ls-caps)", textTransform: "uppercase",
      color: escuro ? "var(--text-on-sidebar-muted)" : "var(--text-muted)", background: escuro ? "var(--surface-sidebar-hover)" : "var(--surface-card)",
      border: `var(--border-w) solid ${escuro ? "var(--surface-sidebar-hover)" : "var(--border-default)"}`,
    }}>
      <span>Prancha {String(numero).padStart(2, "0")} · {children}</span>
      <span style={{ height: "var(--space-1)", background: "var(--accent)" }} />
    </span>
  );
}

/** Título de seção: grande, apertado, com uma linha de apoio opcional. */
export function Titulo({ children, apoio, escuro, centro }) {
  const mobile = useIsMobile();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", maxWidth: "var(--content-w-md)", textAlign: centro ? "center" : undefined, alignSelf: centro ? "center" : undefined }}>
      <h2 style={{ fontSize: mobile ? "var(--fs-h3)" : "var(--fs-h2)", fontWeight: "var(--fw-black)", lineHeight: "var(--lh-tight)", letterSpacing: "var(--ls-tight)", color: escuro ? "var(--text-on-sidebar)" : "var(--text-primary)" }}>{children}</h2>
      {apoio && <p style={{ fontSize: "var(--fs-p3)", fontWeight: "var(--fw-medium)", lineHeight: "var(--lh-body)", color: escuro ? "var(--text-on-sidebar-muted)" : "var(--text-muted)" }}>{apoio}</p>}
    </div>
  );
}

/** Cota de desenho técnico (traço, linha, texto, linha, traço) para medir um número. */
export function Cota({ children, cor = "var(--text-accent)", style }) {
  const traco = { width: "var(--border-w-thick)", alignSelf: "stretch", background: cor };
  const linha = { flex: 1, height: "var(--border-w)", background: cor, minWidth: "var(--space-3)" };
  return (
    <span style={{ display: "flex", alignItems: "center", gap: "var(--space-1-5)", fontSize: "var(--fs-p6)", fontWeight: "var(--fw-extrabold)", color: cor, whiteSpace: "nowrap", ...style }}>
      <span style={traco} /><span style={linha} />{children}<span style={linha} /><span style={traco} />
    </span>
  );
}

/** "Valores de exemplo": toda tela simulada na landing avisa que os números não são de cliente. */
export const Exemplo = ({ escuro }) => (
  <span style={{ fontSize: "var(--fs-caption)", fontWeight: "var(--fw-semibold)", color: escuro ? "var(--text-on-sidebar-muted)" : "var(--text-muted)" }}>Valores de exemplo</span>
);
