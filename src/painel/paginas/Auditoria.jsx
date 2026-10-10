import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, DataTable, Input, Select } from "../../../design-system";
import { avisarErro } from "../../utils/aviso";
import { ACOES, rotuloAcao } from "../rotulos";
import { dataHoraBR } from "../util";

const LIMITE = 50;

/** Tudo o que a equipe fez no painel: quem, o quê, em qual empresa e quando. */
export default function Auditoria({ api }) {
  const navigate = useNavigate();
  const [pessoas, setPessoas] = useState([]);
  const [f, setF] = useState({ equipeId: "", acao: "", de: "", ate: "" });
  const [pagina, setPagina] = useState(1);
  const [r, setR] = useState(null);
  const set = k => e => { setF(x => ({ ...x, [k]: e.target.value })); setPagina(1); };

  useEffect(() => { api.get("/painel/equipe").then(setPessoas).catch(() => {}); }, []); // eslint-disable-line
  const ultimaConsulta = useRef(0);
  const carregar = useCallback(() => {
    const q = new URLSearchParams({ pagina, limite: LIMITE });
    for (const k of ["equipeId", "acao", "de", "ate"]) if (f[k]) q.set(k, f[k]);
    const minha = ++ultimaConsulta.current; // só vale a resposta da consulta mais recente
    return api.get(`/painel/auditoria?${q}`).then(res => { if (minha === ultimaConsulta.current) setR(res); }).catch(e => { if (minha === ultimaConsulta.current) avisarErro(e.message); });
  }, [api, f, pagina]);
  useEffect(() => { carregar(); }, [carregar]);

  const paginas = r ? Math.max(1, Math.ceil(r.total / LIMITE)) : 1;
  return (
    <>
      <p style={{ color: "var(--text-secondary)" }}>Registro de toda ação da equipe no painel, em horário de São Paulo.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-sm),1fr))", gap: "var(--space-3)", alignItems: "end" }}>
        <Select label="Pessoa" value={f.equipeId} onChange={set("equipeId")}>
          <option value="">Todas</option>
          {pessoas.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </Select>
        <Select label="Ação" value={f.acao} onChange={set("acao")}>
          <option value="">Todas</option>
          {Object.entries(ACOES).map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
        </Select>
        <Input label="De" type="date" value={f.de} onChange={set("de")} />
        <Input label="Até" type="date" value={f.ate} onChange={set("ate")} />
      </div>
      {!r ? <span style={{ color: "var(--text-secondary)" }}>Carregando…</span> : (
        <>
          <DataTable minWidth={1040} rows={r.itens} rowKey={i => i.id} empty="Nenhum registro neste filtro." columns={[
            { key: "quando", label: "Quando", render: i => dataHoraBR(i.createdAt) },
            { key: "quem", label: "Pessoa", render: i => (i.equipe ? <b>{i.equipe.nome}</b> : <span style={{ color: "var(--text-secondary)" }}>Ninguém identificado</span>) },
            { key: "acao", label: "Ação", render: i => rotuloAcao(i.acao) },
            { key: "empresa", label: "Empresa", render: i => (i.empresa
              ? (i.empresa.nome ? <Button variant="link" size="sm" style={{ height: "auto", padding: 0, font: "inherit", fontWeight: "var(--fw-semibold)", textAlign: "left" }} onClick={() => navigate(`/clientes/${i.empresa.id}`)}>{i.empresa.nome}</Button> : <span style={{ color: "var(--text-secondary)" }}>Empresa apagada</span>)
              : <span style={{ color: "var(--text-secondary)" }}>-</span>) },
            { key: "detalhe", label: "Detalhe", render: i => <span style={{ color: "var(--text-secondary)" }}>{i.detalhe || (i.alvoTipo ? `${i.alvoTipo} ${i.alvoId ?? ""}` : "")}</span> },
            { key: "ip", label: "IP", render: i => <span style={{ color: "var(--text-secondary)" }}>{i.ip || ""}</span> },
          ]} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap" }}>
            <span style={{ fontSize: "var(--fs-p5-5)", color: "var(--text-secondary)" }}>{r.total} registro(s) · página {pagina} de {paginas}</span>
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
