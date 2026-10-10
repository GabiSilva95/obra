import { useState } from "react";
import { Button, Icon, SegmentedTabs, useIsMobile, useMediaQuery } from "../../../design-system";
import { Carimbo, Prancha, Titulo, useNaTela } from "./visual";

// Vídeos da Central de treinamentos (public/treinamentos), gravados do sistema de verdade.
const VIDEOS = [
  { id: "inicio", rotulo: "Início", texto: "O resumo de obras, financeiro e estoque, cada um com seus números." },
  { id: "compras-nf", rotulo: "Compras", texto: "A nota fiscal (XML) vira entrada no estoque da obra, sem digitar item por item." },
  { id: "estoque", rotulo: "Estoque", texto: "Saldo de cada material por obra e baixa do que foi usado, por etapa." },
  { id: "financeiro-fluxo", rotulo: "Fluxo de caixa", texto: "O que entra e o que sai nas próximas semanas, com o saldo projetado." },
];

const tocaWebm = () => typeof document !== "undefined" && document.createElement("video").canPlayType('video/webm; codecs="vp8"') !== "";

/** Prova do produto: o sistema funcionando, sem montagem. Os vídeos só carregam quando a seção aparece. */
export default function VejaFuncionando({ onTestar }) {
  const mobile = useIsMobile();
  const reduzido = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [atual, setAtual] = useState(VIDEOS[0].id);
  const [ref, visto] = useNaTela("25% 0% 25% 0%");
  const [suporta] = useState(tocaWebm);
  const video = VIDEOS.find(v => v.id === atual);

  return (
    <Prancha id="veja-funcionando" papel>
      <Carimbo numero={4}>Veja funcionando</Carimbo>
      <Titulo apoio="Gravações reais das telas, sem montagem. É isso que você usa a partir de hoje.">Isto é o sistema de verdade.</Titulo>
      <div style={{ overflowX: "auto", alignSelf: mobile ? "stretch" : "flex-start" }}>
        <SegmentedTabs variant="light" value={atual} onChange={setAtual} tabs={VIDEOS.map(v => ({ value: v.id, label: v.rotulo }))} />
      </div>
      <div ref={ref} style={{ borderRadius: "var(--radius-xl)", overflow: "hidden", border: "var(--border-w) solid var(--border-default)", background: "var(--surface-card)", boxShadow: "var(--shadow-raised)" }}>
        {suporta ? (
          <video key={video.id} src={visto ? `/treinamentos/${video.id}.webm#t=1` : undefined} muted loop playsInline autoPlay={!reduzido} controls={reduzido} preload="metadata"
            aria-label={`Vídeo do sistema: ${video.rotulo}`} style={{ display: "block", width: "100%", aspectRatio: "16 / 10", background: "var(--surface-sidebar)" }} />
        ) : (
          <div style={{ aspectRatio: "16 / 10", background: "var(--surface-sidebar)", color: "var(--text-on-sidebar)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "var(--space-4)", padding: "var(--space-6)", textAlign: "center" }}>
            <Icon name="circle-play" size={40} color="var(--accent)" />
            <p style={{ fontSize: "var(--fs-p4)", fontWeight: "var(--fw-semibold)", maxWidth: "var(--content-w-xs)" }}>Este navegador não toca o vídeo. Crie a conta grátis e veja as telas por dentro.</p>
            <Button variant="accent" iconRight="arrow-right" onClick={() => onTestar()}>Testar grátis</Button>
          </div>
        )}
        <div style={{ display: "flex", alignItems: mobile ? "flex-start" : "center", justifyContent: "space-between", gap: "var(--space-3)", flexDirection: mobile ? "column" : "row", padding: "var(--space-4) var(--space-5)" }}>
          <span style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-2)", fontSize: "var(--fs-p5)", fontWeight: "var(--fw-semibold)" }}>
            <Icon name="circle-play" size={18} color="var(--text-accent)" style={{ flexShrink: 0 }} />{video.texto}
          </span>
          <Button variant="link" size="sm" iconRight="arrow-right" onClick={() => onTestar()}>Testar grátis</Button>
        </div>
      </div>
    </Prancha>
  );
}
