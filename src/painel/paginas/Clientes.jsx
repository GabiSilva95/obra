import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Button, DataTable, Input, SegmentedTabs, Select, Tag } from "../../../design-system";
import { PLANOS } from "../../../server/config/planos.js";
import { SITUACOES } from "../../../server/config/conta.js";
import { avisarErro } from "../../utils/aviso";
import { dataBR, haQuanto } from "../util";

const LIMITE = 30;
const FILTROS = ["", "trial", "trial_expirado", "ativo", "inadimplente", "suspenso", "cancelado"];

/** Texto curto do teste: "faltam 4 dias", "último dia", "acabou há 2 dias". */
export function textoTeste(c) {
  if (c.status !== "trial" || c.diasRestantes == null) return "";
  const d = c.diasRestantes;
  if (d > 1) return `faltam ${d} dias`;
  if (d === 1) return "falta 1 dia";
  if (d === 0) return "último dia";
  return `acabou há ${-d} ${d === -1 ? "dia" : "dias"}`;
}

/** Clientes: quem testa, quem paga e quem está bloqueado, com busca e filtros. Clicar abre a empresa. */
export default function Clientes({ api }) {
  const navigate = useNavigate();
  const [f, setF] = useState({ status: "", plano: "", q: "", ordem: "" });
  const [pagina, setPagina] = useState(1);
  const [r, setR] = useState(null);
  const [busca, setBusca] = useState("");
  const ultimaConsulta = useRef(0);
  const set = k => e => { setF(x => ({ ...x, [k]: e.target.value })); setPagina(1); };

  // A busca espera a pessoa parar de digitar, em vez de consultar a cada letra
  useEffect(() => {
    const t = setTimeout(() => { setF(x => (x.q === busca ? x : { ...x, q: busca })); setPagina(1); }, 300);
    return () => clearTimeout(t);
  }, [busca]);

  const carregar = useCallback(() => {
    const q = new URLSearchParams({ pagina, limite: LIMITE });
    for (const [k, v] of Object.entries(f)) if (v) q.set(k, v);
    const minha = ++ultimaConsulta.current;
    // Só vale a resposta da consulta mais recente: uma antiga e lenta não pode sobrescrever o filtro de agora
    return api.get(`/painel/clientes?${q}`).then(res => { if (minha === ultimaConsulta.current) setR(res); }).catch(e => { if (minha === ultimaConsulta.current) avisarErro(e.message); });
  }, [api, f, pagina]);
  useEffect(() => { carregar(); }, [carregar]);

  const paginas = r ? Math.max(1, Math.ceil(r.total / LIMITE)) : 1;
  const totalGeral = r ? Object.values(r.resumo).reduce((a, b) => a + b, 0) : 0;
  const abas = FILTROS.map(s => ({ value: s, label: `${s ? SITUACOES[s].rotulo : "Todas"}${r ? ` · ${s ? r.resumo[s] : totalGeral}` : ""}` }));

  return (
    <>
      <p style={{ color: "var(--text-secondary)" }}>Todas as empresas: quem está testando, quem é cliente e quem está bloqueado.</p>
      <SegmentedTabs variant="light" value={f.status} onChange={v => { setF(x => ({ ...x, status: v })); setPagina(1); }} tabs={abas} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-sm),1fr))", gap: "var(--space-3)", alignItems: "end" }}>
        <Input label="Buscar" icon="search" placeholder="Empresa, CNPJ, e-mail ou telefone" value={busca} onChange={e => setBusca(e.target.value)} />
        <Select label="Plano" value={f.plano} onChange={set("plano")}>
          <option value="">Todos</option>
          {Object.entries(PLANOS).map(([id, p]) => <option key={id} value={id}>{p.label}</option>)}
        </Select>
        <Select label="Ordenar por" value={f.ordem} onChange={set("ordem")}>
          <option value="">Cadastro mais recente</option><option value="acesso">Último acesso</option><option value="nome">Nome</option>
        </Select>
      </div>
      {!r ? <span style={{ color: "var(--text-secondary)" }}>Carregando…</span> : (
        <>
          <DataTable minWidth={1000} rows={r.itens} rowKey={c => c.id} onRowClick={c => navigate(`/clientes/${c.id}`)} empty="Nenhuma empresa neste filtro." columns={[
            { key: "e", label: "Empresa", render: c => (
              <span style={{ display: "flex", flexDirection: "column" }}>
                <b style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>{c.razaoSocial}{c.interna && <Tag tone="dark">Interna</Tag>}</b>
                <span style={{ fontSize: "var(--fs-p6)", color: "var(--text-secondary)", overflowWrap: "anywhere" }}>{c.email}</span>
              </span>
            ) },
            { key: "p", label: "Plano", render: c => <Tag tone="neutral">{PLANOS[c.plano]?.label || c.plano}{c.ciclo === "anual" ? " · anual" : ""}</Tag> },
            { key: "s", label: "Situação", render: c => (
              <span style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)", alignItems: "flex-start" }}>
                <Badge size="sm" tone={SITUACOES[c.situacao].tom}>{SITUACOES[c.situacao].rotulo}</Badge>
                {textoTeste(c) && <span style={{ fontSize: "var(--fs-p6)", color: "var(--text-secondary)" }}>{textoTeste(c)}</span>}
              </span>
            ) },
            { key: "a", label: "Último acesso", render: c => c.ultimoAcessoEm ? haQuanto(c.ultimoAcessoEm) : <span style={{ color: "var(--text-secondary)" }}>Nunca</span> },
            { key: "u", label: "Usuários", align: "right", render: c => c.usuarios },
            { key: "o", label: "Obras", align: "right", render: c => c.obras },
            { key: "c", label: "Cadastro", render: c => dataBR(c.createdAt) },
          ]} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap" }}>
            <span style={{ fontSize: "var(--fs-p5-5)", color: "var(--text-secondary)" }}>{r.total} empresa(s) · página {pagina} de {paginas}</span>
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
