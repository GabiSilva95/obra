import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Badge, Button, DataTable, Input, Select, Tag } from "../../../design-system";
import { SETORES, STATUS_TICKET, rotuloStatus } from "../../../server/config/suporte.js";
import { avisarErro } from "../../utils/aviso";
import { tomDoStatus } from "../../pages/Suporte/util";
import DetalheChamado from "./DetalheChamado";
import { dataHoraBR, duracao } from "../util";

const LIMITE = 30;

/** Todos os chamados e chats (abertos e encerrados), com filtros e busca por número, assunto ou empresa. */
export default function Chamados({ api, equipe }) {
  const [f, setF] = useState({ status: "abertos", canal: "", setor: "", atendenteId: "", q: "", de: "", ate: "" });
  const [pagina, setPagina] = useState(1);
  const [r, setR] = useState(null);
  const [atendentes, setAtendentes] = useState([]);
  const navigate = useNavigate();
  const aberto = parseInt(useParams().id, 10) || null; // /chamados/42 abre direto o chamado (a empresa e o painel linkam para cá)
  const set = k => e => { setF(x => ({ ...x, [k]: e.target.value })); setPagina(1); };

  const ultimaConsulta = useRef(0);

  const carregar = useCallback(() => {
    const q = new URLSearchParams({ pagina, limite: LIMITE });
    for (const [k, v] of Object.entries(f)) if (v) q.set(k, v);
    const minha = ++ultimaConsulta.current; // só vale a resposta da consulta mais recente
    return api.get(`/painel/chamados?${q}`).then(res => { if (minha === ultimaConsulta.current) setR(res); }).catch(e => { if (minha === ultimaConsulta.current) avisarErro(e.message); });
  }, [api, f, pagina]);
  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => { api.get("/painel/atendimento/atendentes").then(setAtendentes).catch(() => {}); }, []); // eslint-disable-line

  if (aberto) return <DetalheChamado api={api} id={aberto} equipe={equipe} atendentes={atendentes} onVoltar={() => navigate("/chamados")} onMudou={carregar} />;
  const paginas = r ? Math.max(1, Math.ceil(r.total / LIMITE)) : 1;

  return (
    <>
      <p style={{ color: "var(--text-secondary)" }}>Todos os chamados e chats, abertos e encerrados.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-sm),1fr))", gap: "var(--space-3)", alignItems: "end" }}>
        <Input label="Buscar" icon="search" placeholder="Nº, assunto ou empresa" value={f.q} onChange={set("q")} />
        <Select label="Situação" value={f.status} onChange={set("status")}>
          <option value="abertos">Em aberto</option><option value="">Todas</option>
          {STATUS_TICKET.map(s => <option key={s.id} value={s.id}>{s.rotulo}</option>)}
        </Select>
        <Select label="Canal" value={f.canal} onChange={set("canal")}><option value="">Todos</option><option value="ticket">Chamado</option><option value="chat">Chat ao vivo</option></Select>
        <Select label="Setor" value={f.setor} onChange={set("setor")}><option value="">Todos</option>{SETORES.map(s => <option key={s.id} value={s.id}>{s.rotulo}</option>)}</Select>
        <Select label="Atendente" value={f.atendenteId} onChange={set("atendenteId")}><option value="">Todos</option>{atendentes.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}</Select>
        <Input label="De" type="date" value={f.de} onChange={set("de")} />
        <Input label="Até" type="date" value={f.ate} onChange={set("ate")} />
      </div>
      {!r ? <span style={{ color: "var(--text-secondary)" }}>Carregando…</span> : (
        <>
          <DataTable minWidth={980} rows={r.itens} rowKey={c => c.id} onRowClick={c => navigate(`/chamados/${c.id}`)} empty="Nenhum chamado neste filtro." columns={[
            { key: "n", label: "Nº", width: "var(--space-16)", render: c => <b>#{c.numero}</b> },
            { key: "c", label: "Cliente", render: c => <span style={{ display: "flex", flexDirection: "column" }}><b>{c.empresa.nome}</b><span style={{ fontSize: "var(--fs-p6)", color: "var(--text-secondary)" }}>{c.solicitante?.nome}</span></span> },
            { key: "as", label: "Assunto", render: c => <span style={{ display: "flex", alignItems: "center", gap: "var(--space-1-5)", flexWrap: "wrap" }}>{c.assunto}{c.canal === "chat" && <Tag tone="dark">Chat</Tag>}</span> },
            { key: "s", label: "Setor", render: c => c.setorRotulo },
            { key: "st", label: "Situação", render: c => <Badge size="sm" tone={tomDoStatus(c.status)}>{rotuloStatus(c.status)}</Badge> },
            { key: "d", label: "Aberto em", render: c => <span style={{ display: "flex", flexDirection: "column" }}>{dataHoraBR(c.createdAt)}<span style={{ fontSize: "var(--fs-p6)", color: "var(--text-secondary)" }}>há {duracao(c.createdAt)}</span></span> },
            { key: "at", label: "Atendente", render: c => c.atendente?.nome || <span style={{ color: "var(--text-secondary)" }}>Ninguém</span> },
          ]} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap" }}>
            <span style={{ fontSize: "var(--fs-p5-5)", color: "var(--text-secondary)" }}>{r.total} chamado(s) · página {pagina} de {paginas}</span>
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
