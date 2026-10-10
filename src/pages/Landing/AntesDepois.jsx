import { useEffect, useRef, useState } from "react";
import { Badge, Card, ChatBubble, Icon, ProgressBar, Tag, useIsMobile, useMediaQuery } from "../../../design-system";
import { Cota, Exemplo, useNaTela } from "./visual";

// Bagunça de hoje: o que a pessoa reconhece da própria obra. Posições em % para caber em qualquer largura.
const Solto = ({ x, y, giro, largura, children }) => (
  <div style={{ position: "absolute", left: `${x}%`, top: `${y}%`, width: largura, transform: `rotate(${giro}deg)` }}>{children}</div>
);

function Bagunca() {
  return (
    <div aria-hidden="true" style={{
      position: "absolute", inset: 0, overflow: "hidden", background: "var(--surface-card)",
      backgroundImage: "linear-gradient(var(--border-default) var(--border-w), transparent var(--border-w)), linear-gradient(90deg, var(--border-default) var(--border-w), transparent var(--border-w))",
      backgroundSize: "var(--space-5) var(--space-5)",
    }}>
      <Solto x={3} y={16} giro={-2} largura="46%"><ChatBubble text="Zé, cadê os 40 sacos de cimento?" time="07:12" /></Solto>
      <Solto x={6} y={34} giro={1.5} largura="44%"><ChatBubble mine text="Já paguei o pedreiro ou não?" time="07:15" /></Solto>
      <Solto x={2} y={53} giro={-1} largura="46%"><ChatBubble text="Quanto já gastei na obra do Jardim?" time="09:40" /></Solto>
      <Solto x={5} y={78} giro={-3} largura="auto">
        <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-1-5)", background: "var(--surface-card)", border: "var(--border-w) solid var(--border-strong)", borderRadius: "var(--radius-sm)", padding: "var(--space-1-5) var(--space-2-5)", fontSize: "var(--fs-p6)", fontWeight: "var(--fw-semibold)", whiteSpace: "nowrap", boxShadow: "var(--shadow-card)" }}>
          <Icon name="file-text" size={14} color="var(--status-success)" />obra_jardim_FINAL_v3.xlsx
        </span>
      </Solto>
      <Solto x={30} y={66} giro={5} largura="17%">
        <div style={{ background: "var(--status-warning-soft)", color: "var(--status-warning-text)", padding: "var(--space-2-5)", fontWeight: "var(--fw-black)", fontSize: "var(--fs-p6)", lineHeight: "var(--lh-snug)", textTransform: "uppercase", boxShadow: "var(--shadow-card)" }}>Pagar areia sexta!! e o frete?</div>
      </Solto>
      <Solto x={52} y={14} giro={-6} largura="22%">
        <div style={{ background: "var(--surface-card)", border: "var(--border-w) dashed var(--text-faint)", padding: "var(--space-2-5)", fontSize: "var(--fs-p6)", lineHeight: "var(--lh-snug)", boxShadow: "var(--shadow-card)" }}>
          <b>NF 4.512</b><br />R$ 3.870,00<br /><span style={{ color: "var(--text-muted)" }}>achei na gaveta</span>
        </div>
      </Solto>
      <Solto x={56} y={48} giro={3} largura="auto"><Badge tone="danger">47 mensagens não lidas</Badge></Solto>
      <Solto x={50} y={80} giro={2} largura="44%">
        <span style={{ fontSize: "var(--fs-p5)", fontWeight: "var(--fw-bold)", color: "var(--text-muted)", fontStyle: "italic" }}>orçamento 400 mil?? ver com o Zé</span>
      </Solto>
    </div>
  );
}

const Kpi = ({ valor, rotulo, cor }) => (
  <Card padding="var(--space-3)" style={{ gap: "var(--space-1)" }}>
    <span style={{ fontSize: "var(--fs-h4)", fontWeight: "var(--fw-extrabold)", lineHeight: "var(--lh-none)", color: cor }}>{valor}</span>
    <span style={{ fontSize: "var(--fs-p6)", fontWeight: "var(--fw-semibold)" }}>{rotulo}</span>
  </Card>
);

const Linha = ({ rotulo, valor, cor }) => (
  <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-3)", fontSize: "var(--fs-p6)" }}>
    <span style={{ color: "var(--text-muted)" }}>{rotulo}</span><b style={{ color: cor }}>{valor}</b>
  </div>
);

/** A obra organizada: o Início do sistema, montado com os mesmos componentes do app. */
function Organizado() {
  const mobile = useIsMobile();
  return (
    <div style={{ padding: mobile ? "var(--space-3)" : "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-2)" }}>
        <b style={{ fontSize: "var(--fs-p3)", fontWeight: "var(--fw-extrabold)" }}>Início</b>
        <Tag tone="accent" dot>1 aviso</Tag>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: mobile ? "repeat(2,minmax(0,1fr))" : "repeat(4,minmax(0,1fr))", gap: "var(--space-2)" }}>
        <Kpi valor="3" rotulo="Obras ativas" cor="var(--stat-1)" />
        <Kpi valor="62%" rotulo="Progresso médio" cor="var(--stat-2)" />
        <Kpi valor="1" rotulo="Etapa atrasada" cor="var(--status-danger)" />
        <Kpi valor="71%" rotulo="Orçamento usado" cor="var(--stat-4)" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: mobile ? "minmax(0,1fr)" : "minmax(0,1.2fr) minmax(0,1fr)", gap: "var(--space-2)" }}>
        <Card padding="var(--space-3)" style={{ gap: "var(--space-2)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-2)" }}>
            <b style={{ fontSize: "var(--fs-p5)" }}>Casa Jardim</b><Badge size="sm" tone="warning">Orçamento crítico</Badge>
          </div>
          <ProgressBar value={92} color="var(--status-danger)" label="Orçamento usado da Casa Jardim" />
          <Cota cor="var(--status-danger)">92% do orçamento</Cota>
          <span style={{ fontSize: "var(--fs-p6)", color: "var(--text-muted)" }}>R$ 368 mil de R$ 400 mil</span>
        </Card>
        <Card padding="var(--space-3)" style={{ gap: "var(--space-1-5)" }}>
          <b style={{ fontSize: "var(--fs-p5)" }}>Contas das próximas semanas</b>
          <Linha rotulo="A pagar em 7 dias" valor="R$ 6.000,00" />
          <Linha rotulo="A receber" valor="R$ 49.000,00" cor="var(--status-success-text)" />
          <Linha rotulo="Saldo projetado" valor="R$ 129.230,00" />
        </Card>
      </div>
      <Exemplo />
    </div>
  );
}

/**
 * Antes e depois arrastável: a bagunça de hoje por cima, a obra organizada por baixo.
 * Funciona com mouse, toque (sem travar a rolagem vertical) e teclado (setas, Home e End).
 */
export default function AntesDepois() {
  const reduzido = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [pos, setPos] = useState(50);
  const caixa = useRef(null);
  const arrastando = useRef(false);
  const [refTela, visto] = useNaTela("0% 0% -20% 0%");
  const mexeu = useRef(false);

  // Na primeira vez que aparece, a divisória varre a tela para ensinar o gesto
  useEffect(() => {
    if (!visto || reduzido || mexeu.current) return;
    let quadro, inicio;
    const passo = t => {
      inicio ??= t;
      const k = Math.min(1, (t - inicio) / 1400);
      const suave = 1 - (1 - k) ** 3;
      if (!mexeu.current) setPos(92 - 42 * suave);
      if (k < 1 && !mexeu.current) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [visto, reduzido]);

  const mover = clientX => {
    const r = caixa.current.getBoundingClientRect();
    setPos(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)));
  };
  const aoTocar = e => { mexeu.current = true; arrastando.current = true; e.currentTarget.setPointerCapture(e.pointerId); mover(e.clientX); };
  const aoMover = e => { if (arrastando.current) mover(e.clientX); };
  const aoSoltar = () => { arrastando.current = false; };
  const aoTeclar = e => {
    const delta = { ArrowLeft: -5, ArrowRight: 5, Home: -100, End: 100 }[e.key];
    if (delta === undefined) return;
    e.preventDefault(); mexeu.current = true;
    setPos(p => Math.max(0, Math.min(100, p + delta)));
  };

  const etiqueta = (texto, lado, tom) => (
    <span style={{ position: "absolute", top: "var(--space-3)", [lado]: "var(--space-3)", zIndex: 2, pointerEvents: "none" }}><Tag tone={tom}>{texto}</Tag></span>
  );

  return (
    <div ref={refTela} style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      <div ref={caixa} onPointerDown={aoTocar} onPointerMove={aoMover} onPointerUp={aoSoltar} onPointerCancel={aoSoltar}
        style={{ position: "relative", borderRadius: "var(--radius-xl)", overflow: "hidden", border: "var(--border-w) solid var(--border-default)", background: "var(--bg-app)", boxShadow: "var(--shadow-raised)", touchAction: "pan-y", cursor: "ew-resize", userSelect: "none" }}>
        <Organizado />
        <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 ${100 - pos}% 0 0)` }}><Bagunca /></div>
        {pos > 12 && etiqueta("Hoje", "left", "dark")}
        {pos < 88 && etiqueta("Com o ConstruktPro", "right", "accent")}
        <div style={{ position: "absolute", top: 0, bottom: 0, left: `${pos}%`, width: "var(--border-w-thick)", marginLeft: "calc(var(--border-w-thick) / -2)", background: "var(--accent)", zIndex: 3 }}>
          <span role="slider" tabIndex={0} aria-label="Arraste para comparar a obra de hoje com a obra organizada" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pos)}
            onKeyDown={aoTeclar}
            style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "var(--control-h-md)", height: "var(--control-h-md)", borderRadius: "50%", background: "var(--accent)", color: "var(--text-on-accent)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--shadow-pop)" }}>
            <Icon name="arrow-right-left" size={18} />
          </span>
        </div>
      </div>
      <span style={{ display: "flex", alignItems: "center", gap: "var(--space-1-5)", fontSize: "var(--fs-p6)", fontWeight: "var(--fw-bold)", color: "var(--text-muted)" }}>
        <Icon name="arrow-right-left" size={14} />Arraste a barra laranja e compare
      </span>
    </div>
  );
}
