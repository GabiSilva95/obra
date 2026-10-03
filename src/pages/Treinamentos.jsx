import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Banner, Button, Card, Checkbox, DataTable, Icon, Input, Select, Tag, useIsMobile } from "../../design-system";
import { PageActions } from "../components/PageActions";
import { modulosPermitidos } from "../treinamentos/conteudo";

const busca = (m, termo) => {
  const t = termo.trim().toLowerCase();
  if (!t) return true;
  return [m.titulo, m.resumo, m.quando, ...m.passos, ...m.campos.flatMap(c => [c.nome, c.oQueE, c.comoPreencher])]
    .some(x => x.toLowerCase().includes(t));
};

function Video({ modulo }) {
  const [falhou, setFalhou] = useState(false);
  if (falhou) return <Banner tone="info" title="Vídeo em preparação">O passo a passo em texto abaixo já está atualizado.</Banner>;
  return (
    <video key={modulo.id} src={`/treinamentos/${modulo.id}.webm`} controls preload="metadata" playsInline onError={() => setFalhou(true)}
      aria-label={`Vídeo: ${modulo.titulo}`}
      style={{ width: "100%", aspectRatio: "16 / 10", borderRadius: "var(--radius-md)", background: "var(--surface-sunken)", border: "var(--border-w) solid var(--border-card)", display: "block" }} />
  );
}

function Campos({ campos, mobile }) {
  if (!campos.length) return null;
  const nome = c => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-1-5)", fontWeight: "var(--fw-bold)" }}>
      {c.nome}{c.obrigatorio && <Tag tone="accent">Obrigatório</Tag>}
    </span>
  );
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <h3 style={{ margin: 0, font: "var(--type-card-title)", fontSize: "var(--fs-p3)" }}>Campos da tela</h3>
      {mobile ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          {campos.map(c => (
            <Card key={c.nome} padding="var(--space-3) var(--space-4)" style={{ gap: "var(--space-1)" }}>
              {nome(c)}
              <span style={{ fontSize: "var(--fs-p5-5)", color: "var(--text-secondary)" }}>{c.oQueE}</span>
              <span style={{ fontSize: "var(--fs-p5-5)" }}><b>O que preencher:</b> {c.comoPreencher}</span>
            </Card>
          ))}
        </div>
      ) : (
        <DataTable minWidth={0} rows={campos} rowKey={c => c.nome} columns={[
          { key: "nome", label: "Campo", width: "var(--col-w-md)", render: nome },
          { key: "oQueE", label: "O que é" },
          { key: "comoPreencher", label: "O que preencher" },
        ]} />
      )}
    </section>
  );
}

export default function Treinamentos({ menu, ocultarTour, onRefazerTour, onMostrarTourAoEntrar }) {
  const mobile = useIsMobile();
  const modulos = useMemo(() => modulosPermitidos(menu), [menu]);
  const [params, setParams] = useSearchParams();
  const [termo, setTermo] = useState("");
  const [salvandoPref, setSalvandoPref] = useState(false);
  const visiveis = modulos.filter(m => busca(m, termo));
  const atual = modulos.find(m => m.id === params.get("m")) || visiveis[0] || modulos[0];
  const abrir = id => setParams({ m: id }, { replace: true });

  const grupos = visiveis.reduce((acc, m) => ((acc[m.grupo] ||= []).push(m), acc), {});

  const alternarTour = async marcado => {
    setSalvandoPref(true);
    try { await onMostrarTourAoEntrar(marcado); } finally { setSalvandoPref(false); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <PageActions>
        <Checkbox checked={!ocultarTour} disabled={salvandoPref} onChange={alternarTour} label="Mostrar tour ao entrar" />
        <Button iconLeft="circle-play" variant="secondary" onClick={onRefazerTour}>Refazer tour</Button>
      </PageActions>
      <p style={{ color: "var(--text-secondary)" }}>Vídeos do próprio sistema com o passo a passo de cada tela, quando usar e o que preencher em cada campo.</p>

      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "var(--col-min-lg) minmax(0, 1fr)", gap: "var(--space-6)", alignItems: "start" }}>
        {mobile ? (
          <Select label="Treinamento" value={atual?.id || ""} onChange={e => abrir(e.target.value)}>
            {Object.entries(modulos.reduce((acc, m) => ((acc[m.grupo] ||= []).push(m), acc), {})).map(([g, ms]) => (
              <optgroup key={g} label={g}>{ms.map(m => <option key={m.id} value={m.id}>{m.titulo}</option>)}</optgroup>
            ))}
          </Select>
        ) : (
          <Card padding="var(--space-4)" style={{ position: "sticky", top: "var(--space-4)", gap: "var(--space-4)" }}>
            <Input aria-label="Buscar no treinamento" icon="search" placeholder="Buscar tela ou campo…" value={termo} onChange={e => setTermo(e.target.value)} />
            {!visiveis.length && <span style={{ color: "var(--text-secondary)", fontSize: "var(--fs-p5-5)" }}>Nada encontrado para “{termo}”.</span>}
            {Object.entries(grupos).map(([grupo, ms]) => (
              <nav key={grupo} aria-label={grupo} style={{ display: "flex", flexDirection: "column", gap: "var(--space-0-5)" }}>
                <span style={{ fontSize: "var(--fs-caption)", fontWeight: "var(--fw-bold)", color: "var(--text-muted)", letterSpacing: "var(--ls-caps)", textTransform: "uppercase", padding: "0 var(--space-2)", marginBottom: "var(--space-1)" }}>{grupo}</span>
                {ms.map(m => {
                  const on = m.id === atual?.id;
                  return (
                    <button key={m.id} type="button" data-modulo={m.id} aria-current={on ? "page" : undefined} onClick={() => abrir(m.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: "var(--space-2)", textAlign: "left", font: "inherit", fontSize: "var(--fs-p5-5)", cursor: "pointer",
                        border: 0, borderRadius: "var(--radius-sm)", padding: "var(--space-2)", fontWeight: on ? "var(--fw-bold)" : "var(--fw-medium)",
                        background: on ? "var(--accent-soft)" : "transparent", color: on ? "var(--text-accent)" : "var(--text-primary)",
                      }}>
                      <Icon name="circle-play" size={16} />{m.titulo}
                    </button>
                  );
                })}
              </nav>
            ))}
          </Card>
        )}

        {atual && (
          <article style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)", minWidth: 0 }}>
            <header style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
              <span style={{ fontSize: "var(--fs-p6)", fontWeight: "var(--fw-bold)", color: "var(--text-accent)", letterSpacing: "var(--ls-caps)", textTransform: "uppercase" }}>{atual.grupo}</span>
              <h2 style={{ margin: 0, font: "var(--type-page-title)", fontSize: "var(--fs-h4)" }}>{atual.titulo}</h2>
              <p style={{ margin: 0, color: "var(--text-secondary)" }}>{atual.resumo}</p>
            </header>
            <Video key={atual.id} modulo={atual} />
            <Banner tone="info" icon="clock" title="Quando usar">{atual.quando}</Banner>
            <section style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <h3 style={{ margin: 0, font: "var(--type-card-title)", fontSize: "var(--fs-p3)" }}>Passo a passo</h3>
              <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                {atual.passos.map((p, i) => (
                  <li key={i} style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-start", lineHeight: "var(--lh-body)" }}>
                    <span style={{ flexShrink: 0, width: "var(--space-6)", height: "var(--space-6)", borderRadius: "50%", background: "var(--accent)", color: "var(--text-on-accent)", fontSize: "var(--fs-p6)", fontWeight: "var(--fw-bold)", display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ol>
            </section>
            <Campos campos={atual.campos} mobile={mobile} />
          </article>
        )}
      </div>
    </div>
  );
}
