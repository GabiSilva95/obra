import { useEffect, useState } from "react";
import { Banner, Button, Checkbox, DataTable, Input, Modal, Select, Tag } from "../../../design-system";
import { fmt, today } from "../../utils/helpers";
import { avisarErro } from "../../utils/aviso";
import { somarDias } from "../../../server/utils/datas.js";
import { dataBR, FORMAS } from "./util";

/** Pergunta como o pagamento fica: em aberto (com vencimento) ou já pago (com conta, data e forma). */
function GerarModal({ titulo, resumo, periodo, base, onClose, onConfirmar }) {
  const contas = base.contas.filter(c => c.ativa);
  const [f, setF] = useState({ situacao: "aberto", vencimento: somarDias(today(), base.config.prazoPadraoDias), contaId: contas[0]?.id ?? "", data: today(), forma: "pix", de: "", ate: "" });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const set = k => e => setF(x => ({ ...x, [k]: e.target.value }));
  const confirmar = async () => {
    if (salvando) return;
    if (f.situacao === "pago" && !f.contaId) return setErro("Escolha a conta do pagamento.");
    if (f.situacao === "aberto" && !f.vencimento) return setErro("Informe o vencimento.");
    setErro(""); setSalvando(true);
    try {
      await onConfirmar({
        ...(periodo ? { de: f.de || undefined, ate: f.ate || undefined } : {}),
        ...(f.situacao === "pago" ? { pago: { contaId: f.contaId, data: f.data, forma: f.forma } } : { vencimento: f.vencimento }),
      });
    } catch (e) { avisarErro(e.message); setSalvando(false); }
  };
  return (
    <Modal title={titulo} onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button iconLeft="check" loading={salvando} onClick={confirmar}>Gerar conta a pagar</Button></>}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <Banner tone="info">{resumo}</Banner>
        {periodo && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
            <Input label="Período de" type="date" helper="Vazio = tudo o que está pendente" value={f.de} onChange={set("de")} />
            <Input label="Período até" type="date" value={f.ate} onChange={set("ate")} />
          </div>
        )}
        <Select label="Situação do pagamento" value={f.situacao} onChange={set("situacao")}>
          <option value="aberto">Ainda não foi pago (fica em aberto)</option>
          <option value="pago">Já foi pago</option>
        </Select>
        {f.situacao === "aberto" ? (
          <Input label="Vencimento" required type="date" value={f.vencimento} onChange={set("vencimento")} />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-sm),1fr))", gap: "var(--space-3)" }}>
            <Select label="Conta" required value={f.contaId} onChange={set("contaId")}>
              {!contas.length && <option value="">Cadastre uma conta antes</option>}
              {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </Select>
            <Input label="Data do pagamento" type="date" value={f.data} onChange={set("data")} />
            <Select label="Forma" value={f.forma} onChange={set("forma")} options={FORMAS} />
          </div>
        )}
        {erro && <Banner tone="danger">{erro}</Banner>}
      </div>
    </Modal>
  );
}

const Secao = ({ titulo, ajuda, acao, children }) => (
  <section style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap" }}>
      <div><h3 style={{ margin: 0, font: "var(--type-card-title)", fontSize: "var(--fs-p3)" }}>{titulo}</h3><span style={{ color: "var(--text-secondary)", fontSize: "var(--fs-p5-5)" }}>{ajuda}</span></div>
      {acao}
    </div>
    {children}
  </section>
);

/**
 * O que já aconteceu em outros módulos e ainda não virou conta a pagar: compras entregues,
 * diárias e locações. Gerar daqui não mexe no custo da obra, que já foi apropriado.
 */
export default function Pendencias({ ctx, irPara }) {
  const { api, base, data, canWrite } = ctx;
  const [p, setP] = useState(null);
  const [selDiarias, setSelDiarias] = useState(new Set());
  const [selLocacoes, setSelLocacoes] = useState(new Set());
  const [gerar, setGerar] = useState(null);
  const nomeObra = id => data.obras.find(o => o.id === id)?.nome || `Obra ${id}`;

  const carregar = async () => {
    try { setP(await api.get("/financeiro/pendencias")); setSelDiarias(new Set()); setSelLocacoes(new Set()); } catch (e) { avisarErro(e.message); }
  };
  useEffect(() => { carregar(); }, []); // eslint-disable-line

  const depois = async () => { setGerar(null); await Promise.all([carregar(), ctx.recarregarBase()]); };
  if (!p) return <span style={{ color: "var(--text-secondary)" }}>Carregando…</span>;
  const vazio = !p.compras.length && !p.diarias.length && !p.locacoes.length;
  const alternar = (set, setSet, id) => { const n = new Set(set); if (n.has(id)) n.delete(id); else n.add(id); setSet(n); };
  const obrasTags = obras => <span style={{ display: "flex", gap: "var(--space-1)", flexWrap: "wrap" }}>{obras.map(o => <Tag key={o.obraId} tone="neutral">{nomeObra(o.obraId)}: {fmt(o.valor)}</Tag>)}</span>;
  const selD = p.diarias.filter(d => selDiarias.has(d.funcionarioId));
  const selL = p.locacoes.filter(l => selLocacoes.has(l.chave));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
      <p style={{ color: "var(--text-secondary)" }}>Compras entregues, diárias e locações que ainda não viraram conta a pagar. O custo das obras já foi apropriado: gerar a conta só registra quando e como será pago.</p>
      {vazio && <Banner tone="success" title="Tudo em dia">Nenhuma compra, diária ou locação aguardando conta a pagar.</Banner>}

      {p.compras.length > 0 && (
        <Secao titulo="Compras entregues sem conta a pagar" ajuda="Compras antigas ou cuja conta não pôde ser gerada na entrega. Se já foram pagas, lance como já pagas.">
          <DataTable minWidth={720} rows={p.compras} rowKey={c => c.id} columns={[
            { key: "n", label: "Compra", render: c => <b>#{c.numero}</b> },
            { key: "f", label: "Fornecedor", render: c => c.fornecedor || "—" },
            { key: "o", label: "Obra", render: c => nomeObra(c.obraId) },
            { key: "d", label: "Data", render: c => dataBR(c.data) },
            { key: "v", label: "Valor", align: "right", render: c => <b>{fmt(c.valor)}</b> },
            ...(canWrite ? [{ key: "a", label: "", render: c => <Button size="sm" variant="secondary" onClick={() => setGerar({ tipo: "compra", item: c })}>Gerar conta</Button> }] : []),
          ]} />
        </Secao>
      )}

      {p.diarias.length > 0 && (
        <Secao titulo="Diárias a pagar" ajuda="Um pagamento por colaborador, rateado entre as obras em que trabalhou."
          acao={canWrite && <Button size="sm" iconLeft="check" disabled={!selD.length} onClick={() => setGerar({ tipo: "diarias" })}>Gerar pagamento ({selD.length})</Button>}>
          <DataTable minWidth={760} rows={p.diarias} rowKey={d => d.funcionarioId} columns={[
            ...(canWrite ? [{ key: "s", label: "", width: "var(--space-11)", render: d => <Checkbox checked={selDiarias.has(d.funcionarioId)} onChange={() => alternar(selDiarias, setSelDiarias, d.funcionarioId)} /> }] : []),
            { key: "n", label: "Colaborador", render: d => <b>{d.nome}</b> },
            { key: "p", label: "Período", render: d => `${dataBR(d.de)} a ${dataBR(d.ate)}` },
            { key: "dias", label: "Diárias", align: "right", render: d => d.dias },
            { key: "o", label: "Por obra", render: d => obrasTags(d.obras) },
            { key: "v", label: "Valor", align: "right", render: d => <b>{fmt(d.valor)}</b> },
          ]} />
        </Secao>
      )}

      {p.locacoes.length > 0 && (
        <Secao titulo="Locações de máquinas a pagar" ajuda="Um pagamento por locador, rateado entre as obras. Máquina sem locador cadastrado aparece sozinha."
          acao={canWrite && <Button size="sm" iconLeft="check" disabled={!selL.length} onClick={() => setGerar({ tipo: "locacoes" })}>Gerar pagamento ({selL.length})</Button>}>
          {p.locacoes.some(l => l.semLocador) && <Banner tone="info">Cadastre o locador em Máquinas (campo "Locador") para juntar as máquinas do mesmo fornecedor num pagamento só.</Banner>}
          <DataTable minWidth={760} rows={p.locacoes} rowKey={l => l.chave} columns={[
            ...(canWrite ? [{ key: "s", label: "", width: "var(--space-11)", render: l => <Checkbox checked={selLocacoes.has(l.chave)} onChange={() => alternar(selLocacoes, setSelLocacoes, l.chave)} /> }] : []),
            { key: "n", label: "Locador / máquina", render: l => <span style={{ display: "flex", flexDirection: "column" }}><b>{l.nome}</b><span style={{ fontSize: "var(--fs-p6)", color: "var(--text-secondary)" }}>{l.maquinas.join(", ")}</span></span> },
            { key: "p", label: "Período", render: l => `${dataBR(l.de)} a ${dataBR(l.ate)}` },
            { key: "h", label: "Horas", align: "right", render: l => l.horas },
            { key: "o", label: "Por obra", render: l => obrasTags(l.obras) },
            { key: "v", label: "Valor", align: "right", render: l => <b>{fmt(l.valor)}</b> },
          ]} />
        </Secao>
      )}

      {gerar?.tipo === "compra" && (
        <GerarModal titulo={`Conta a pagar da compra #${gerar.item.numero}`} base={base} onClose={() => setGerar(null)}
          resumo={`${gerar.item.fornecedor || "Sem fornecedor"} · ${nomeObra(gerar.item.obraId)} · ${fmt(gerar.item.valor)}`}
          onConfirmar={async extra => { await api.post("/financeiro/gerar/compra", { ordemId: gerar.item.id, ...extra }); await depois(); }} />
      )}
      {gerar?.tipo === "diarias" && (
        <GerarModal titulo="Pagamento de diárias" periodo base={base} onClose={() => setGerar(null)}
          resumo={`${selD.length} colaborador(es), ${fmt(selD.reduce((s, d) => s + d.valor, 0))} no total (antes do filtro de período).`}
          onConfirmar={async extra => { await api.post("/financeiro/gerar/diarias", { funcionarioIds: selD.map(d => d.funcionarioId), ...extra }); await depois(); }} />
      )}
      {gerar?.tipo === "locacoes" && (
        <GerarModal titulo="Pagamento de locações" periodo base={base} onClose={() => setGerar(null)}
          resumo={`${selL.length} locador(es), ${fmt(selL.reduce((s, l) => s + l.valor, 0))} no total (antes do filtro de período).`}
          onConfirmar={async extra => { await api.post("/financeiro/gerar/locacoes", { chaves: selL.map(l => l.chave), ...extra }); await depois(); }} />
      )}
      {!vazio && <Button variant="ghost" onClick={() => irPara("pagar")}>Ver contas a pagar</Button>}
    </div>
  );
}
