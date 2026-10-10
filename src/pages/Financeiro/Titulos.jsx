import { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Banner, Button, Checkbox, DataTable, Input, Select, StatCard } from "../../../design-system";
import { PageActions } from "../../components/PageActions";
import { fmt } from "../../utils/helpers";
import { avisarErro } from "../../utils/aviso";
import { dataBR, resumoRateio, rotuloStatus, toneStatus } from "./util";
import TituloForm from "./TituloForm";
import BaixaModal from "./BaixaModal";
import DetalheTitulo from "./DetalheTitulo";

const LIMITE = 50;

/** Contas a pagar e a receber (mesma tela, `tipo` muda o texto e a cor). */
export default function Titulos({ tipo, ctx, inicial }) {
  const { api, data, base, canWrite } = ctx;
  const pagar = tipo === "pagar";
  const [f, setF] = useState({ status: inicial?.status || "aberto", de: "", ate: "", obraId: "", centroCustoId: "", pessoaId: "", q: "" });
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const [res, setRes] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [sel, setSel] = useState(new Set());
  const [novo, setNovo] = useState(false);
  const [baixando, setBaixando] = useState(null);
  const [detalhe, setDetalhe] = useState(null);
  const seq = useRef(0);

  // Busca com atraso: não pesquisa a cada tecla
  useEffect(() => { const t = setTimeout(() => { setF(x => ({ ...x, q: busca })); setPagina(1); }, 350); return () => clearTimeout(t); }, [busca]);

  const consulta = useMemo(() => {
    const p = new URLSearchParams({ tipo, status: f.status, limite: String(LIMITE), pagina: String(pagina) });
    for (const k of ["de", "ate", "obraId", "centroCustoId", "pessoaId", "q"]) if (f[k]) p.set(k, f[k]);
    return p.toString();
  }, [tipo, f, pagina]);

  const carregar = async () => {
    const minha = ++seq.current;
    setCarregando(true);
    try {
      const r = await api.get(`/financeiro/titulos?${consulta}`);
      if (minha === seq.current) { setRes(r); setSel(new Set()); }
    } catch (e) { if (minha === seq.current) avisarErro(e.message); }
    finally { if (minha === seq.current) setCarregando(false); }
  };
  useEffect(() => { carregar(); }, [consulta]); // eslint-disable-line

  const depoisDeMudar = async () => { await Promise.all([carregar(), ctx.recarregarBase(), ctx.atualizarCompetencia()]); };
  const setFiltro = k => e => { setF(x => ({ ...x, [k]: e.target.value })); setPagina(1); };

  const itens = res?.itens || [];
  const baixaveis = itens.filter(t => t.status === "aberto" || t.status === "parcial");
  const selecionados = itens.filter(t => sel.has(t.id));
  const todos = baixaveis.length > 0 && baixaveis.every(t => sel.has(t.id));
  const alternar = id => setSel(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const pessoas = (data.funcionarios || []).filter(p => (pagar ? p.isFornecedor || p.isColaborador : p.isCliente));
  const ctxRateio = { obras: data.obras, centros: base.centros, etapasObra: data.etapasObra, tiposEtapa: data.tiposEtapa };

  const colunas = [
    ...(canWrite ? [{ key: "sel", label: "", width: "var(--space-11)", render: t => (t.status === "aberto" || t.status === "parcial")
      ? <span onClick={e => e.stopPropagation()}><Checkbox checked={sel.has(t.id)} onChange={() => alternar(t.id)} /></span> : null }] : []),
    { key: "vencimento", label: "Vencimento", render: t => (
      <span style={{ display: "flex", flexDirection: "column", gap: "var(--space-0-5)" }}>
        <span>{dataBR(t.vencimento)}</span>
        {t.vencido && <Badge size="sm" tone="danger">{t.diasAtraso} {t.diasAtraso === 1 ? "dia" : "dias"} de atraso</Badge>}
      </span>
    ) },
    { key: "descricao", label: "Descrição", render: t => (
      <span style={{ display: "flex", flexDirection: "column", gap: "var(--space-0-5)" }}>
        <b>{t.descricao}</b>
        <span style={{ fontSize: "var(--fs-p6)", color: "var(--text-secondary)" }}>
          {[t.pessoa?.nome || t.pessoaTexto, t.totalParcelas > 1 && `parcela ${t.parcela}/${t.totalParcelas}`, t.documento && `doc. ${t.documento}`, t.origem].filter(Boolean).join(" · ")}
        </span>
      </span>
    ) },
    { key: "rateio", label: "Obra / centro", render: t => {
      const r = resumoRateio(t, ctxRateio);
      return <span title={r.detalhe.map(d => `${d.texto}: ${fmt(d.valor)}`).join("\n")}>{r.texto}</span>;
    } },
    { key: "valor", label: "Valor", align: "right", render: t => (
      <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
        <b>{fmt(t.valor)}</b>
        {t.status === "parcial" && <span style={{ fontSize: "var(--fs-p6)", color: "var(--text-secondary)" }}>saldo {fmt(t.saldo)}</span>}
      </span>
    ) },
    { key: "status", label: "Situação", render: t => <Badge size="sm" tone={toneStatus(t)}>{rotuloStatus(t)}</Badge> },
    ...(canWrite ? [{ key: "acoes", label: "", render: t => (t.status === "aberto" || t.status === "parcial") && (
      <span onClick={e => e.stopPropagation()}><Button size="sm" variant="secondary" onClick={() => setBaixando([t])}>{pagar ? "Pagar" : "Receber"}</Button></span>
    ) }] : []),
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <PageActions>
        {canWrite && <Button iconLeft="plus" onClick={() => setNovo(true)}>{pagar ? "Nova conta a pagar" : "Nova conta a receber"}</Button>}
      </PageActions>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-md),1fr))", gap: "var(--space-6)" }}>
        <StatCard value={fmt(res?.totais.saldo)} label={pagar ? "Saldo a pagar (filtro atual)" : "Saldo a receber (filtro atual)"} color={pagar ? "var(--stat-4)" : "var(--stat-3)"} />
        <StatCard value={fmt(res?.totais.valor)} label="Valor dos títulos (filtro atual)" color="var(--stat-1)" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-sm),1fr))", gap: "var(--space-3)", alignItems: "end" }}>
        <Select label="Situação" value={f.status} onChange={setFiltro("status")}>
          <option value="aberto">Em aberto</option>
          <option value="vencido">Vencidos</option>
          <option value="avencer">A vencer</option>
          <option value="quitado">{pagar ? "Pagos" : "Recebidos"}</option>
          <option value="cancelado">Cancelados</option>
          <option value="todos">Todos</option>
        </Select>
        <Input label="Vencimento de" type="date" value={f.de} onChange={setFiltro("de")} />
        <Input label="Vencimento até" type="date" value={f.ate} onChange={setFiltro("ate")} />
        <Select label="Obra" value={f.obraId} onChange={setFiltro("obraId")}>
          <option value="">Todas</option>
          {data.obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </Select>
        <Select label="Centro de custo" value={f.centroCustoId} onChange={setFiltro("centroCustoId")}>
          <option value="">Todos</option>
          {base.centros.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </Select>
        <Select label={pagar ? "Fornecedor" : "Cliente"} value={f.pessoaId} onChange={setFiltro("pessoaId")}>
          <option value="">Todos</option>
          {pessoas.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </Select>
        <Input label="Buscar" icon="search" placeholder="Descrição, documento ou nome" value={busca} onChange={e => setBusca(e.target.value)} />
      </div>

      {selecionados.length > 0 && canWrite && (
        <Banner tone="accent" title={`${selecionados.length} selecionado(s), saldo ${fmt(selecionados.reduce((s, t) => s + t.saldo, 0))}`}
          action={<Button size="sm" iconLeft="check" onClick={() => setBaixando(selecionados)}>{pagar ? "Pagar selecionados" : "Receber selecionados"}</Button>}>
          Cada título é quitado pelo saldo inteiro, na mesma conta e data.
        </Banner>
      )}
      {canWrite && baixaveis.length > 1 && (
        <Checkbox checked={todos} onChange={() => setSel(todos ? new Set() : new Set(baixaveis.map(t => t.id)))} label="Selecionar todos os títulos em aberto desta página" />
      )}

      {carregando && !res ? <span style={{ color: "var(--text-secondary)" }}>Carregando…</span> : (
        <DataTable minWidth={820} rows={itens} rowKey={t => t.id} onRowClick={setDetalhe}
          empty={f.status === "aberto" ? (pagar ? "Nenhuma conta a pagar em aberto." : "Nenhuma conta a receber em aberto.") : "Nenhum título neste filtro."} columns={colunas} />
      )}

      {res && res.total > LIMITE && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap" }}>
          <span style={{ color: "var(--text-secondary)", fontSize: "var(--fs-p5-5)" }}>{(pagina - 1) * LIMITE + 1} a {Math.min(pagina * LIMITE, res.total)} de {res.total}</span>
          <span style={{ display: "flex", gap: "var(--space-2)" }}>
            <Button size="sm" variant="secondary" iconLeft="chevron-left" disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}>Anterior</Button>
            <Button size="sm" variant="secondary" iconRight="chevron-right" disabled={pagina * LIMITE >= res.total} onClick={() => setPagina(p => p + 1)}>Próxima</Button>
          </span>
        </div>
      )}

      {novo && <TituloForm tipo={tipo} ctx={ctx} onClose={() => setNovo(false)} onSaved={async () => { setNovo(false); await depoisDeMudar(); }} />}
      {baixando && <BaixaModal titulos={baixando} base={base} api={api} onClose={() => setBaixando(null)} onSaved={async () => { setBaixando(null); await depoisDeMudar(); }} />}
      {detalhe && <DetalheTitulo titulo={detalhe} ctx={ctx} onClose={() => setDetalhe(null)} onChanged={depoisDeMudar} />}
    </div>
  );
}
