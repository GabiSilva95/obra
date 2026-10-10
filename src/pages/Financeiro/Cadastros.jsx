import { useState } from "react";
import { Badge, Banner, Button, DataTable, IconButton, Input, Modal, SegmentedTabs, Select } from "../../../design-system";
import { PageActions } from "../../components/PageActions";
import { avisarErro } from "../../utils/aviso";

/** Categorias, centros de custo e preferências do financeiro. */
export default function Cadastros({ ctx }) {
  const { api, base, canWrite } = ctx;
  const [aba, setAba] = useState("categorias");
  const [form, setForm] = useState(null);
  const [prazo, setPrazo] = useState(String(base.config.prazoPadraoDias));
  const [salvando, setSalvando] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const salvar = async () => {
    if (salvando) return;
    if (!form.nome.trim()) return avisarErro("Informe o nome.");
    setSalvando(true);
    try {
      const caminho = form.kind === "categoria" ? "categorias" : "centros";
      if (form.id) await api.put(`/financeiro/${caminho}/${form.id}`, form); else await api.post(`/financeiro/${caminho}`, form);
      setForm(null); await ctx.recarregarBase();
    } catch (e) { avisarErro(e.message); }
    finally { setSalvando(false); }
  };
  const alternar = async (kind, item) => {
    try {
      if (kind === "categoria") await api.put(`/financeiro/categorias/${item.id}`, { ativa: !item.ativa });
      else await api.put(`/financeiro/centros/${item.id}`, { ativo: !item.ativo });
      await ctx.recarregarBase();
    } catch (e) { avisarErro(e.message); }
  };
  const salvarPrazo = async () => {
    try { await api.put("/financeiro/config", { prazoPadraoDias: parseInt(prazo) }); await ctx.recarregarBase(); }
    catch (e) { avisarErro(e.message); }
  };

  const colunas = kind => [
    { key: "nome", label: "Nome", render: i => <b>{i.nome}</b> },
    ...(kind === "categoria" ? [{ key: "tipo", label: "Usada em", render: i => (i.tipo === "pagar" ? "Contas a pagar" : "Contas a receber") }] : []),
    { key: "ativo", label: "Situação", render: i => <Badge size="sm" tone={(kind === "categoria" ? i.ativa : i.ativo) ? "success" : "neutral"}>{(kind === "categoria" ? i.ativa : i.ativo) ? "Ativo" : "Inativo"}</Badge> },
    ...(canWrite ? [{ key: "acoes", label: "", width: "var(--space-24)", render: i => (
      <span style={{ display: "flex", gap: "var(--space-1)" }}>
        <IconButton icon="pencil" size={28} label="Editar cadastro" onClick={() => setForm({ kind, ...i })} />
        <Button size="sm" variant="ghost" onClick={() => alternar(kind, i)}>{(kind === "categoria" ? i.ativa : i.ativo) ? "Inativar" : "Ativar"}</Button>
      </span>
    ) }] : []),
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <PageActions>
        {canWrite && aba === "categorias" && <Button iconLeft="plus" onClick={() => setForm({ kind: "categoria", nome: "", tipo: "pagar" })}>Nova categoria</Button>}
        {canWrite && aba === "centros" && <Button iconLeft="plus" onClick={() => setForm({ kind: "centro", nome: "", codigo: "" })}>Novo centro de custo</Button>}
      </PageActions>
      <SegmentedTabs variant="light" value={aba} onChange={setAba} tabs={[{ value: "categorias", label: "Categorias" }, { value: "centros", label: "Centros de custo" }, { value: "preferencias", label: "Preferências" }]} />

      {aba === "categorias" && (
        <>
          <p style={{ color: "var(--text-secondary)" }}>Classificam o que se paga (combustível, aluguel…) e o que se recebe (medição, adiantamento…). Inativar esconde da lista sem apagar o histórico.</p>
          <DataTable minWidth={560} rows={base.categorias} rowKey={c => c.id} columns={colunas("categoria")} />
        </>
      )}
      {aba === "centros" && (
        <>
          <p style={{ color: "var(--text-secondary)" }}>Centro de custo é uma segunda forma de classificar, além de obra e etapa: Administrativo, Frota e equipamentos, Comercial… Pode ser usado sozinho ou junto com a obra.</p>
          <DataTable minWidth={560} rows={base.centros} rowKey={c => c.id} columns={colunas("centro")} />
        </>
      )}
      {aba === "preferencias" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", maxWidth: "var(--content-w-xs)" }}>
          <Input label="Prazo padrão de pagamento (dias)" type="number" min="0" max="365" disabled={!canWrite} value={prazo} onChange={e => setPrazo(e.target.value)} helper="Vencimento sugerido em novos lançamentos e nas compras entregues." />
          {canWrite && <Button iconLeft="check" onClick={salvarPrazo}>Salvar preferências</Button>}
        </div>
      )}

      {form && (
        <Modal title={form.id ? "Editar cadastro" : (form.kind === "categoria" ? "Nova categoria" : "Novo centro de custo")} onClose={() => setForm(null)}
          footer={<><Button variant="secondary" onClick={() => setForm(null)}>Cancelar</Button><Button iconLeft="check" loading={salvando} onClick={salvar}>Salvar</Button></>}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <Input label="Nome" required value={form.nome} onChange={set("nome")} />
            {form.kind === "categoria" && !form.id && (
              <Select label="Usada em" value={form.tipo} onChange={set("tipo")}>
                <option value="pagar">Contas a pagar</option>
                <option value="receber">Contas a receber</option>
              </Select>
            )}
            {form.kind === "centro" && <Input label="Código" placeholder="Opcional" value={form.codigo || ""} onChange={set("codigo")} />}
            {form.id && form.kind === "categoria" && <Banner tone="info">Renomear não altera os lançamentos antigos, que guardam o nome que tinham.</Banner>}
          </div>
        </Modal>
      )}
    </div>
  );
}
