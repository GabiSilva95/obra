import { Card, Icon, useIsMobile } from "../../../design-system";

export const dataBR = d => new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR");
export const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

/** Linha "rótulo ... valor" dos blocos de indicador. `valor` já vem formatado. */
export const Linha = ({ rotulo, valor, destaque, forte }) => (
  <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-3)", fontSize: "var(--fs-p5-5)" }}>
    <span style={{ color: "var(--text-secondary)" }}>{rotulo}</span>
    <b style={{ color: destaque || "var(--text-primary)", fontWeight: forte ? "var(--fw-bold)" : "var(--fw-semibold)", textAlign: "right" }}>{valor}</b>
  </div>
);

/** Subtítulo de uma lista dentro de um bloco ("Obras com etapas atrasadas"). */
export const Rotulo = ({ children }) => <span style={{ font: "var(--type-label)", color: "var(--text-secondary)" }}>{children}</span>;

/** Texto de estado vazio ou de carregamento dentro de um bloco. */
export const Aviso = ({ children, cor = "var(--text-secondary)" }) => <span style={{ fontSize: "var(--fs-p5-5)", color: cor }}>{children}</span>;

export const Pilha = ({ gap = "var(--space-2)", children }) => <div style={{ display: "flex", flexDirection: "column", gap }}>{children}</div>;

/** Título de uma parte do painel: ícone, nome, uma etiqueta opcional e a ação à direita. */
export function TituloSecao({ icone, titulo, etiqueta, acao }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap" }}>
      <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: "var(--space-2-5)", flexWrap: "wrap", font: "var(--fw-bold) var(--fs-h5)/var(--lh-snug) var(--font-sans)" }}>
        <Icon name={icone} size={20} />{titulo}{etiqueta}
      </h2>
      {acao}
    </div>
  );
}

/**
 * Seção do painel: título, um card com os principais números e, abaixo, os blocos de cada indicador.
 * `numeros`: [{ valor, rotulo, cor?, detalhe? }]
 */
export function Secao({ icone, titulo, etiqueta, acao, numeros, children }) {
  const mobile = useIsMobile();
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <TituloSecao icone={icone} titulo={titulo} etiqueta={etiqueta} acao={acao} />
      {numeros && (
        <Card>
          <div style={{ display: "grid", gridTemplateColumns: mobile ? "repeat(2,minmax(0,1fr))" : `repeat(${numeros.length},minmax(0,1fr))`, gap: mobile ? "var(--space-5) var(--space-4)" : "var(--space-6)" }}>
            {numeros.map((n, i) => (
              <div key={n.rotulo} style={{ display: "flex", flexDirection: "column", gap: "var(--space-1-5)", minWidth: 0, ...(!mobile && i > 0 ? { borderLeft: "var(--border-w) solid var(--border-subtle)", paddingLeft: "var(--space-6)" } : {}) }}>
                <span style={{ font: "var(--type-stat)", color: n.cor || "var(--text-primary)", fontSize: "clamp(var(--fs-h5), 2vw, var(--fs-stat))", overflowWrap: "anywhere" }}>{n.valor}</span>
                <span style={{ fontSize: "var(--fs-p5-5)", fontWeight: "var(--fw-medium)" }}>{n.rotulo}</span>
                {n.detalhe && <span style={{ fontSize: "var(--fs-p6)", color: "var(--text-secondary)" }}>{n.detalhe}</span>}
              </div>
            ))}
          </div>
        </Card>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-lg),1fr))", gap: "var(--space-6)" }}>
        {children}
      </div>
    </section>
  );
}
