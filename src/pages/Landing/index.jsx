import { useEffect, useRef, useState } from "react";
import { Button, Card, useIsMobile, useMediaQuery } from "../../../design-system";
import logoPositivo from "../../../design-system/assets/logo-positivo.svg";
import "./landing.css";
import Topo from "./Topo";
import Diagnostico from "./Diagnostico";
import ComoFunciona from "./ComoFunciona";
import VejaFuncionando from "./VejaFuncionando";
import Resultados from "./Resultados";
import Comparativo from "./Comparativo";
import Precos from "./Precos";
import Duvidas from "./Duvidas";
import ChamadaFinal from "./ChamadaFinal";
import { Carimbo, Prancha, Titulo } from "./visual";
import { DEPOIMENTOS, DIAS_TESTE } from "./oferta";

const LINKS = [["Como funciona", "como-funciona"], ["Preços", "precos"], ["Dúvidas", "duvidas"]];

/** Depoimentos reais. Sem nenhum cadastrado em oferta.js, a seção não aparece. */
function Depoimentos() {
  if (!DEPOIMENTOS.length) return null;
  return (
    <Prancha id="depoimentos">
      <Carimbo numero={9}>Quem usa</Carimbo>
      <Titulo>O que dizem as construtoras que usam.</Titulo>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-lg),1fr))", gap: "var(--space-6)" }}>
        {DEPOIMENTOS.map(d => (
          <Card key={d.nome} padding="var(--space-6)">
            <p style={{ fontSize: "var(--fs-p3)", fontWeight: "var(--fw-semibold)", lineHeight: "var(--lh-body)" }}>“{d.frase}”</p>
            <span style={{ fontSize: "var(--fs-p5)", color: "var(--text-muted)" }}><b style={{ color: "var(--text-primary)" }}>{d.nome}</b>, {d.cargo} · {d.empresa}</span>
          </Card>
        ))}
      </div>
    </Prancha>
  );
}

/**
 * Landing pública: a oferta principal do produto (teste grátis) com prova visual do sistema de verdade.
 * `secaoInicial`: rola até uma seção ao abrir (a rota /planos abre em Preços).
 * `onTestar(planoId?)` abre o cadastro do teste. Não há acesso demo: quem quer ver o sistema vê os vídeos ou testa grátis.
 */
export default function Landing({ secaoInicial, onTestar, onLogin }) {
  const mobile = useIsMobile();
  const reduzido = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [refCta, ctaNaTela] = useNaTelaContinuo();

  useEffect(() => { if (secaoInicial) document.getElementById(secaoInicial)?.scrollIntoView(); }, [secaoInicial]);
  const ir = id => document.getElementById(id)?.scrollIntoView({ behavior: reduzido ? "auto" : "smooth" });

  return (
    <div className="lp">
      <nav aria-label="Principal" style={{ position: "sticky", top: 0, zIndex: "var(--z-nav)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)", padding: mobile ? "var(--space-2-5) var(--space-4)" : "var(--space-3) var(--space-12)", background: "var(--surface-card)", borderBottom: "var(--border-w) solid var(--border-default)" }}>
        <a href="/" aria-label="ConstruktPro, início" onClick={e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: reduzido ? "auto" : "smooth" }); }}>
          <img src={logoPositivo} alt="ConstruktPro" style={{ height: mobile ? "var(--space-8)" : "var(--space-10)", display: "block" }} />
        </a>
        {!mobile && (
          <div style={{ display: "flex", gap: "var(--space-1)" }}>
            {LINKS.map(([rotulo, id]) => <Button key={id} variant="ghost" size="sm" onClick={() => ir(id)}>{rotulo}</Button>)}
          </div>
        )}
        <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
          <Button variant="ghost" size="sm" onClick={onLogin}>Entrar</Button>
          <Button variant="primary" size="sm" onClick={() => onTestar()}>Testar grátis</Button>
        </div>
      </nav>

      <main>
        <Topo onTestar={onTestar} onVer={() => ir("veja-funcionando")} refCta={refCta} />
        <Diagnostico onTestar={onTestar} />
        <ComoFunciona />
        <VejaFuncionando onTestar={onTestar} />
        <Resultados />
        <Comparativo />
        <Depoimentos />
        <Precos onTestar={onTestar} />
        <Duvidas />
      </main>
      <ChamadaFinal onTestar={onTestar} onLogin={onLogin} ir={ir} />

      {mobile && (
        <div className={`lp-barra-movel${ctaNaTela ? "" : " lp-visivel"}`} aria-hidden={ctaNaTela}
          style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: "var(--z-nav)", padding: "var(--space-3) var(--space-4) calc(var(--space-3) + env(safe-area-inset-bottom))", background: "var(--surface-card)", borderTop: "var(--border-w) solid var(--border-default)", boxShadow: "var(--shadow-nav)" }}>
          <Button variant="accent" size="lg" fullWidth iconRight="arrow-right" onClick={() => onTestar()}>Testar grátis {DIAS_TESTE} dias · sem cartão</Button>
        </div>
      )}
    </div>
  );
}

/** Como useNaTela, mas acompanha entrada e saída: a barra do celular só aparece quando o botão do topo sai da tela. */
function useNaTelaContinuo() {
  const ref = useRef(null);
  const [naTela, setNaTela] = useState(true);
  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(([e]) => setNaTela(e.isIntersecting));
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, naTela];
}
