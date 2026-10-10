import { useEffect, useState } from "react";
import { Badge, Banner, Button, DataTable, IconButton, Input, Modal, MoneyInput, Select } from "../../../design-system";
import { PageActions } from "../../components/PageActions";
import { fmt, today } from "../../utils/helpers";
import { avisarErro, confirmar } from "../../utils/aviso";
import { dataBR } from "./util";
import Conciliacao from "./Conciliacao";
import ImportarExtrato from "./ImportarExtrato";

/** Contas bancárias e caixas: saldo inicial, saldo atual e situação. */
export default function Contas({ ctx }) {
  const { api, base, canWrite } = ctx;
  const [form, setForm] = useState(null);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [aberta, setAberta] = useState(null);       // conta aberta na conciliação
  const [importando, setImportando] = useState(false);
  const [transf, setTransf] = useState(null);
  const [transfs, setTransfs] = useState([]);
  const carregarTransf = () => api.get("/financeiro/transferencias").then(setTransfs).catch(() => {});
  useEffect(() => { carregarTransf(); }, []); // eslint-disable-line
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const abrir = c => { setErro(""); setForm(c ? { ...c } : { nome: "", tipo: "banco", banco: "", agencia: "", numero: "", saldoInicial: "", dataSaldoInicial: today(), ativa: true }); };

  const salvar = async () => {
    if (salvando) return;
    if (!form.nome.trim()) return setErro("Informe o nome da conta.");
    if (!form.dataSaldoInicial) return setErro("Informe a data do saldo inicial.");
    setErro(""); setSalvando(true);
    try {
      const corpo = { ...form, saldoInicial: Number(form.saldoInicial) || 0 };
      if (form.id) await api.put(`/financeiro/contas/${form.id}`, corpo); else await api.post("/financeiro/contas", corpo);
      setForm(null); await ctx.recarregarBase();
    } catch (e) { avisarErro(e.message); }
    finally { setSalvando(false); }
  };
  const excluir = async c => {
    if (!(await confirmar({ mensagem: `Excluir a conta "${c.nome}"?`, confirmarRotulo: "Excluir", perigo: true }))) return;
    try { await api.del(`/financeiro/contas/${c.id}`); await ctx.recarregarBase(); } catch (e) { avisarErro(e.message); }
  };

  const salvarTransf = async () => {
    if (salvando) return;
    if (!transf.deContaId || !transf.paraContaId || transf.deContaId === transf.paraContaId) return setErro("Escolha duas contas diferentes.");
    if (!(Number(transf.valor) > 0)) return setErro("O valor deve ser maior que zero.");
    setErro(""); setSalvando(true);
    try { await api.post("/financeiro/transferencias", { ...transf, valor: Number(transf.valor) }); setTransf(null); await Promise.all([ctx.recarregarBase(), carregarTransf()]); }
    catch (e) { avisarErro(e.message); }
    finally { setSalvando(false); }
  };
  const excluirTransf = async t => {
    if (!(await confirmar({ mensagem: "Excluir esta transferência?", confirmarRotulo: "Excluir", perigo: true }))) return;
    try { await api.del(`/financeiro/transferencias/${t.id}`); await Promise.all([ctx.recarregarBase(), carregarTransf()]); } catch (e) { avisarErro(e.message); }
  };
  const nomeConta = id => base.contas.find(c => c.id === id)?.nome || "—";

  if (aberta) return <Conciliacao contaId={aberta} ctx={ctx} onVoltar={() => { setAberta(null); carregarTransf(); }} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <PageActions>
        {canWrite && base.contas.filter(c => c.ativa).length > 1 && <Button variant="secondary" iconLeft="arrow-right-left" onClick={() => { setErro(""); setTransf({ deContaId: "", paraContaId: "", data: today(), valor: "", obs: "" }); }}>Transferência entre contas</Button>}
        {canWrite && base.contas.some(c => c.ativa) && <Button variant="secondary" iconLeft="cloud-upload" onClick={() => setImportando(true)}>Importar extrato</Button>}
        {canWrite && <Button iconLeft="plus" onClick={() => abrir()}>Nova conta</Button>}
      </PageActions>
      <p style={{ color: "var(--text-secondary)" }}>Contas bancárias e caixas onde o dinheiro entra e sai. O saldo atual soma o saldo inicial, os recebimentos e pagamentos baixados e as transferências.</p>
      {!base.contas.length && <Banner tone="info" title="Nenhuma conta cadastrada">Cadastre ao menos uma conta para lançar pagamentos e recebimentos.</Banner>}
      <DataTable minWidth={760} rows={base.contas} rowKey={c => c.id} empty="Nenhuma conta cadastrada." columns={[
        { key: "nome", label: "Conta", render: c => <span style={{ display: "flex", flexDirection: "column" }}><b>{c.nome}</b><span style={{ fontSize: "var(--fs-p6)", color: "var(--text-secondary)" }}>{[c.tipo === "caixa" ? "Caixa" : c.banco, c.agencia && `ag. ${c.agencia}`, c.numero && `conta ${c.numero}`].filter(Boolean).join(" · ")}</span></span> },
        { key: "inicial", label: "Saldo inicial", align: "right", render: c => <span>{fmt(c.saldoInicial)}<br /><span style={{ fontSize: "var(--fs-p6)", color: "var(--text-secondary)" }}>em {dataBR(c.dataSaldoInicial)}</span></span> },
        { key: "saldo", label: "Saldo atual", align: "right", render: c => <b style={{ color: c.saldo >= 0 ? "var(--status-success-text)" : "var(--status-danger)" }}>{fmt(c.saldo)}</b> },
        { key: "ativa", label: "Situação", render: c => <Badge size="sm" tone={c.ativa ? "success" : "neutral"}>{c.ativa ? "Ativa" : "Inativa"}</Badge> },
        ...(canWrite ? [{ key: "acoes", label: "", width: "var(--control-w-md)", render: c => (
          <span style={{ display: "flex", gap: "var(--space-1)", alignItems: "center" }}>
            {c.ativa && <Button size="sm" variant="secondary" onClick={() => setAberta(c.id)}>Conciliar</Button>}
            <IconButton icon="pencil" size={28} label="Editar conta" onClick={() => abrir(c)} />
            <IconButton icon="trash-2" variant="danger" size={28} label="Excluir conta" onClick={() => excluir(c)} />
          </span>
        ) }] : []),
      ]} />

      {transfs.length > 0 && (
        <section style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <h3 style={{ margin: 0, font: "var(--type-card-title)", fontSize: "var(--fs-p3)" }}>Transferências entre contas</h3>
          <DataTable dense minWidth={620} rows={transfs.slice(0, 20)} rowKey={t => t.id} columns={[
            { key: "d", label: "Data", render: t => dataBR(t.data) },
            { key: "r", label: "De → para", render: t => `${nomeConta(t.deContaId)} → ${nomeConta(t.paraContaId)}` },
            { key: "v", label: "Valor", align: "right", render: t => <b>{fmt(t.valor)}</b> },
            { key: "c", label: "Extrato", render: t => <Badge size="sm" tone={t.conciliadaDe && t.conciliadaPara ? "success" : "neutral"}>{t.conciliadaDe && t.conciliadaPara ? "Conciliada nos dois lados" : t.conciliadaDe || t.conciliadaPara ? "Conciliada em um lado" : "Aguardando extrato"}</Badge> },
            ...(canWrite ? [{ key: "a", label: "", width: "var(--space-11)", render: t => <IconButton icon="trash-2" variant="danger" size={28} label="Excluir transferência" onClick={() => excluirTransf(t)} /> }] : []),
          ]} />
        </section>
      )}

      {importando && <ImportarExtrato ctx={ctx} onClose={() => setImportando(false)} onImportado={async id => { setImportando(false); await ctx.recarregarBase(); setAberta(id); }} />}

      {transf && (
        <Modal title="Transferência entre contas" onClose={() => setTransf(null)}
          footer={<><Button variant="secondary" onClick={() => setTransf(null)}>Cancelar</Button><Button iconLeft="check" loading={salvando} onClick={salvarTransf}>Salvar transferência</Button></>}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <Banner tone="info">Mover dinheiro entre duas contas suas não é custo nem receita: só muda o saldo de cada uma.</Banner>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
              <Select label="Conta de origem" required value={transf.deContaId} onChange={e => setTransf(t => ({ ...t, deContaId: parseInt(e.target.value) || "" }))}>
                <option value="">Escolha</option>
                {base.contas.filter(c => c.ativa).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </Select>
              <Select label="Conta de destino" required value={transf.paraContaId} onChange={e => setTransf(t => ({ ...t, paraContaId: parseInt(e.target.value) || "" }))}>
                <option value="">Escolha</option>
                {base.contas.filter(c => c.ativa).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </Select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
              <MoneyInput label="Valor" required value={transf.valor} onChange={e => setTransf(t => ({ ...t, valor: e.target.value }))} />
              <Input label="Data" required type="date" value={transf.data} onChange={e => setTransf(t => ({ ...t, data: e.target.value }))} />
            </div>
            <Input label="Observação" value={transf.obs} onChange={e => setTransf(t => ({ ...t, obs: e.target.value }))} />
            {erro && <Banner tone="danger">{erro}</Banner>}
          </div>
        </Modal>
      )}

      {form && (
        <Modal title={form.id ? "Editar conta" : "Nova conta"} onClose={() => setForm(null)}
          footer={<><Button variant="secondary" onClick={() => setForm(null)}>Cancelar</Button><Button iconLeft="check" loading={salvando} onClick={salvar}>Salvar conta</Button></>}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <Input label="Nome da conta" required placeholder="Ex.: Itaú obras, Caixa da obra" value={form.nome} onChange={set("nome")} />
            <Select label="Tipo" value={form.tipo} onChange={set("tipo")}>
              <option value="banco">Conta bancária</option>
              <option value="caixa">Caixa (dinheiro)</option>
            </Select>
            {form.tipo === "banco" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-sm),1fr))", gap: "var(--space-3)" }}>
                <Input label="Banco" value={form.banco || ""} onChange={set("banco")} />
                <Input label="Agência" value={form.agencia || ""} onChange={set("agencia")} />
                <Input label="Número da conta" value={form.numero || ""} onChange={set("numero")} />
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-sm),1fr))", gap: "var(--space-3)" }}>
              <MoneyInput label="Saldo inicial" info="Saldo da conta na data abaixo. Só movimentos a partir dessa data entram no saldo." value={form.saldoInicial} onChange={set("saldoInicial")} />
              <Input label="Data do saldo inicial" required type="date" value={form.dataSaldoInicial} onChange={set("dataSaldoInicial")} />
            </div>
            {form.id && (
              <Select label="Situação" value={String(form.ativa)} onChange={e => setForm(f => ({ ...f, ativa: e.target.value === "true" }))}>
                <option value="true">Ativa</option>
                <option value="false">Inativa (some das listas de pagamento)</option>
              </Select>
            )}
            {erro && <Banner tone="danger">{erro}</Banner>}
          </div>
        </Modal>
      )}
    </div>
  );
}
