import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Banner, BarChart, Button, Card, DataTable, Input, Modal, SegmentedTabs, StatCard } from "../../../design-system";
import { PageActions } from "../../components/PageActions";
import { PLANOS } from "../../../server/config/planos.js";
import { avisarErro, confirmar } from "../../utils/aviso";
import { fmt, today } from "../../utils/helpers";
import { fmtCompacto, maxDoGrafico } from "../../pages/Dashboard/indicadores";
import { dataDoDia } from "../util";
import TabelaCobrancas from "./TabelaCobrancas";

const LIMITE = 30;
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const rotuloMes = m => `${MESES[Number(m.slice(5)) - 1]}/${m.slice(2, 4)}`;
const SITUACOES = [["", "Todas"], ["aberta", "Em aberto"], ["atrasada", "Atrasadas"], ["paga", "Pagas"], ["cancelada", "Canceladas"]];

/** Financeiro do painel: a receita recorrente, quem deve e as cobranças de todas as empresas. */
export default function Financeiro({ api }) {
  const navigate = useNavigate();
  const [aba, setAba] = useState("geral");
  const [gerando, setGerando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [filtros, setFiltros] = useState({ status: "", mes: "", q: "" });
  const irEmpresa = id => navigate(`/clientes/${id}`);

  const exportar = async () => {
    setExportando(true);
    try {
      const q = new URLSearchParams();
      for (const [k, v] of Object.entries(aba === "cobrancas" ? filtros : {})) if (v) q.set(k, v);
      const blob = await api.baixar(`/painel/financeiro/cobrancas.csv${q.size ? `?${q}` : ""}`);
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), { href: url, download: `cobrancas-${today()}.csv` });
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (e) { avisarErro(e.message); }
    setExportando(false);
  };

  return (
    <>
      <PageActions>
        <Button variant="secondary" iconLeft="download" loading={exportando} onClick={exportar}>Exportar CSV</Button>
        <Button iconLeft="plus" onClick={() => setGerando(true)}>Gerar cobranças do mês</Button>
      </PageActions>
      <SegmentedTabs variant="light" value={aba} onChange={setAba} tabs={[{ value: "geral", label: "Visão geral" }, { value: "cobrancas", label: "Cobranças" }]} />
      {aba === "geral" ? <VisaoGeral api={api} irEmpresa={irEmpresa} verCobrancas={f => { setFiltros(x => ({ ...x, ...f })); setAba("cobrancas"); }} /> : <Cobrancas api={api} filtros={filtros} setFiltros={setFiltros} irEmpresa={irEmpresa} />}
      {gerando && <GerarMes api={api} onFechar={() => setGerando(false)} onGerou={() => { setGerando(false); setAba("cobrancas"); }} />}
    </>
  );
}

// ─── Visão geral ──────────────────────────────────────────────────────────────

function VisaoGeral({ api, irEmpresa, verCobrancas }) {
  const [r, setR] = useState(null);
  useEffect(() => { api.get("/painel/financeiro/resumo").then(setR).catch(e => avisarErro(e.message)); }, []); // eslint-disable-line
  if (!r) return <span style={{ color: "var(--text-secondary)" }}>Carregando…</span>;

  const grade = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-sm),1fr))", gap: "var(--space-4)" };
  return (
    <>
      <p style={{ color: "var(--text-secondary)" }}>Só entra na receita recorrente a assinatura que está configurada e ativa (ou inadimplente). Cortesia e empresa sem assinatura configurada ficam de fora.</p>
      {r.semAssinatura.length > 0 && (
        <Banner tone="warning" title={`${r.semAssinatura.length} empresa(s) ativa(s) sem assinatura configurada`}>
          Não entram na receita recorrente. Abra a empresa e use Configurar assinatura (ou Cortesia, se não paga):{" "}
          {r.semAssinatura.map((e, i) => (
            <span key={e.id}>{i ? ", " : ""}<Button variant="link" size="sm" style={{ height: "auto", padding: 0, font: "inherit" }} onClick={() => irEmpresa(e.id)}>{e.nome}</Button></span>
          ))}.
        </Banner>
      )}
      <div style={grade}>
        <StatCard value={fmt(r.mrr)} label="Receita mensal (MRR)" color="var(--stat-1)" />
        <StatCard value={fmt(r.arr)} label="Receita anual (ARR)" color="var(--stat-2)" />
        <StatCard value={r.pagantes} label={r.pagantes ? `Empresas pagantes · ticket médio ${fmt(r.ticketMedio)}` : "Empresas pagantes"} color="var(--stat-3)" />
        <StatCard value={fmt(r.emAtraso.valor)} label={r.emAtraso.cobrancas ? `Em atraso · ${r.emAtraso.cobrancas} cobrança(s) de ${r.emAtraso.empresas} empresa(s)` : "Em atraso"} color={r.emAtraso.valor > 0 ? "var(--status-danger)" : "var(--stat-2)"} />
      </div>
      <div style={grade}>
        <StatCard value={fmt(r.recebidoNoMes)} label="Recebido no mês" color="var(--status-success)" />
        <StatCard value={fmt(r.aReceberNoMes)} label="A receber ainda neste mês" color="var(--stat-4)" />
        <StatCard value={r.emTeste} label={r.testeAcabado ? `Em teste · ${r.testeAcabado} com teste acabado` : "Em teste"} color="var(--stat-1)" />
        <StatCard value={`${r.novosNoMes} / ${r.cancelamentosNoMes}`} label="Novos / cancelamentos no mês" color="var(--stat-3)" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-lg),1fr))", gap: "var(--space-5)", alignItems: "start" }}>
        <Card title="Recebido nos últimos 6 meses">
          <BarChart height={180} max={maxDoGrafico(r.serie.map(s => s.valor))} format={fmtCompacto} series={[{ key: "valor", label: "Recebido", color: "var(--status-success)" }]}
            data={r.serie.map(s => ({ label: rotuloMes(s.mes), valor: s.valor }))} />
        </Card>
        <Card title="Receita mensal por plano">
          <DataTable dense minWidth={320} rows={r.porPlano} rowKey={p => p.plano} empty="Nenhuma assinatura ativa ainda."
            columns={[{ key: "n", label: "Plano", render: p => <b>{p.nome}</b> }, { key: "e", label: "Empresas", align: "right", render: p => p.empresas }, { key: "m", label: "MRR", align: "right", render: p => fmt(p.mrr) }]} />
        </Card>
      </div>
      {r.emAtraso.cobrancas > 0 && <div><Button variant="secondary" iconLeft="clipboard-list" onClick={() => verCobrancas({ status: "atrasada", mes: "", q: "" })}>Ver as cobranças em atraso</Button></div>}
    </>
  );
}

// ─── Cobranças ────────────────────────────────────────────────────────────────

function Cobrancas({ api, filtros, setFiltros, irEmpresa }) {
  const [pagina, setPagina] = useState(1);
  const [r, setR] = useState(null);
  const [busca, setBusca] = useState(filtros.q);
  const ultima = useRef(0);
  const set = k => e => { setFiltros(x => ({ ...x, [k]: e.target.value })); setPagina(1); };

  useEffect(() => {
    const t = setTimeout(() => { setFiltros(x => (x.q === busca ? x : { ...x, q: busca })); setPagina(1); }, 300);
    return () => clearTimeout(t);
  }, [busca]); // eslint-disable-line

  const carregar = useCallback(() => {
    const q = new URLSearchParams({ pagina, limite: LIMITE });
    for (const [k, v] of Object.entries(filtros)) if (v) q.set(k, v);
    const minha = ++ultima.current; // só vale a resposta da consulta mais recente
    return api.get(`/painel/financeiro/cobrancas?${q}`).then(res => { if (minha === ultima.current) setR(res); }).catch(e => { if (minha === ultima.current) avisarErro(e.message); });
  }, [api, filtros, pagina]);
  useEffect(() => { carregar(); }, [carregar]);
  const paginas = r ? Math.max(1, Math.ceil(r.total / LIMITE)) : 1;

  return (
    <>
      <SegmentedTabs variant="light" value={filtros.status} onChange={v => { setFiltros(x => ({ ...x, status: v })); setPagina(1); }} tabs={SITUACOES.map(([value, label]) => ({ value, label }))} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-sm),1fr))", gap: "var(--space-3)", alignItems: "end" }}>
        <Input label="Buscar" icon="search" placeholder="Empresa, CNPJ ou e-mail" value={busca} onChange={e => setBusca(e.target.value)} />
        <Input label="Vencimento no mês" type="month" value={filtros.mes} onChange={set("mes")} />
      </div>
      {!r ? <span style={{ color: "var(--text-secondary)" }}>Carregando…</span> : (
        <>
          <TabelaCobrancas api={api} itens={r.itens} aoMudar={carregar} mostrarEmpresa podeEditar aoAbrirEmpresa={irEmpresa} vazio="Nenhuma cobrança neste filtro." />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap" }}>
            <span style={{ fontSize: "var(--fs-p5-5)", color: "var(--text-secondary)" }}>{r.total} cobrança(s) · {fmt(r.soma)} no filtro · página {pagina} de {paginas}</span>
            <span style={{ display: "flex", gap: "var(--space-2)" }}>
              <Button variant="secondary" size="sm" iconLeft="chevron-left" disabled={pagina <= 1} onClick={() => setPagina(p => p - 1)}>Anterior</Button>
              <Button variant="secondary" size="sm" iconRight="chevron-right" disabled={pagina >= paginas} onClick={() => setPagina(p => p + 1)}>Próxima</Button>
            </span>
          </div>
        </>
      )}
    </>
  );
}

// ─── Gerar o mês ──────────────────────────────────────────────────────────────

function GerarMes({ api, onFechar, onGerou }) {
  const [mes, setMes] = useState(today().slice(0, 7));
  const [previa, setPrevia] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const ultima = useRef(0);

  useEffect(() => {
    if (!/^\d{4}-\d{2}$/.test(mes)) return;
    const minha = ++ultima.current;
    api.get(`/painel/financeiro/cobrancas/previa?mes=${mes}`).then(r => { if (minha === ultima.current) setPrevia(r); }).catch(e => avisarErro(e.message));
  }, [mes]); // eslint-disable-line

  const gerar = async () => {
    if (!previa?.itens.length) return;
    if (!(await confirmar({ titulo: "Gerar cobranças", mensagem: `Criar ${previa.itens.length} cobrança(s) de ${mes.slice(5)}/${mes.slice(0, 4)}, num total de ${fmt(previa.total)}?`, confirmarRotulo: "Gerar" }))) return;
    setSalvando(true);
    try { await api.post("/painel/financeiro/cobrancas/gerar", { mes }); onGerou(); } catch (e) { setSalvando(false); avisarErro(e.message); }
  };

  return (
    <Modal title="Gerar cobranças do mês" onClose={onFechar} wide
      footer={<><Button variant="secondary" onClick={onFechar}>Cancelar</Button><Button loading={salvando} disabled={!previa?.itens.length} iconLeft="check" onClick={gerar}>Gerar {previa?.itens.length ? `(${previa.itens.length})` : ""}</Button></>}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <Banner tone="info">Gera uma cobrança para cada empresa ativa (ou inadimplente) com assinatura configurada, fora de cortesia, que ainda não tem cobrança cobrindo o mês. Rodar de novo não duplica nada.</Banner>
        <Input label="Mês" type="month" value={mes} onChange={e => { setPrevia(null); setMes(e.target.value); }} />
        {!previa ? <span style={{ color: "var(--text-secondary)" }}>Calculando…</span> : (
          <DataTable dense minWidth={560} rows={previa.itens} rowKey={i => i.tenantId} empty="Nenhuma empresa precisa de cobrança neste mês."
            columns={[
              { key: "e", label: "Empresa", render: i => <b>{i.empresa}</b> },
              { key: "p", label: "Plano", render: i => <Badge size="sm" tone="neutral">{PLANOS[i.plano]?.label || i.plano}{i.ciclo === "anual" ? " · anual" : ""}</Badge> },
              { key: "v", label: "Vence", render: i => dataDoDia(i.vencimento) },
              { key: "$", label: "Valor", align: "right", render: i => fmt(i.valor) },
            ]} />
        )}
        {previa?.itens.length > 0 && <span style={{ textAlign: "right", fontWeight: "var(--fw-semibold)" }}>Total: {fmt(previa.total)}</span>}
      </div>
    </Modal>
  );
}
