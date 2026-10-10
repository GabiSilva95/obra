import { Badge, Button, Card, DataTable } from "../../../design-system";
import { fmt } from "../../utils/helpers";
import { Aviso, Linha, Pilha, plural, Secao } from "./Secao";

const tomStatus = { Pendente: "warning", Aprovada: "info" };

/** Estoque: posição do estoque e compras das obras listadas. */
export default function SecaoEstoque({ estoque, compras, obras, ir }) {
  const nomeObra = id => obras.find(o => o.id === id)?.nome || "—";
  return (
    <Secao icone="warehouse" titulo="Estoque" acao={<Button size="sm" variant="secondary" iconRight="arrow-right" onClick={() => ir("estoque")}>Ver estoque</Button>}
      numeros={[
        { valor: estoque.itens, rotulo: "Itens em estoque", cor: "var(--stat-1)", detalhe: "Insumos com saldo" },
        { valor: compras.emAberto.qtd, rotulo: "Compras em aberto", cor: "var(--stat-2)", detalhe: `${fmt(compras.emAberto.valor)} pendentes ou aprovadas` },
        { valor: fmt(estoque.valorEmEstoque), rotulo: "Valor em estoque", cor: "var(--stat-3)" },
        { valor: fmt(compras.doMes.valor), rotulo: "Compras do mês", cor: "var(--stat-4)", detalhe: plural(compras.doMes.qtd, "ordem", "ordens") },
      ]}>
      <Card title="Posição do estoque">
        <Pilha>
          <Linha rotulo="Valor em estoque" valor={fmt(estoque.valorEmEstoque)} forte />
          <Linha rotulo="Valor já consumido" valor={fmt(estoque.valorConsumido)} />
          <Linha rotulo="Insumos com saldo" valor={estoque.itens} />
        </Pilha>
        <DataTable dense minWidth={0} rows={estoque.maiores} rowKey={m => m.insumo.id} empty="Nenhum insumo com saldo em estoque." columns={[
          { key: "i", label: "Maiores saldos", render: m => <b>{m.insumo.nome}</b> },
          { key: "q", label: "Disponível", align: "right", render: m => `${Math.round(m.saldo * 100) / 100} ${m.insumo.unidade}` },
          { key: "v", label: "Valor", align: "right", render: m => <b>{fmt(m.valor)}</b> },
        ]} />
      </Card>

      <Card title="Compras" action={<Button size="sm" variant="secondary" iconRight="arrow-right" onClick={() => ir("compras")}>Ver compras</Button>}>
        <Pilha>
          <Linha rotulo={`Pendentes (${compras.pendentes.qtd})`} valor={fmt(compras.pendentes.valor)} />
          <Linha rotulo={`Aprovadas, aguardando entrega (${compras.aprovadas.qtd})`} valor={fmt(compras.aprovadas.valor)} />
          <Linha rotulo={`Compras do mês (${compras.doMes.qtd})`} valor={fmt(compras.doMes.valor)} forte />
        </Pilha>
        {compras.aguardando.length === 0 ? <Aviso cor="var(--status-success-text)">Nenhuma compra aguardando entrega.</Aviso> : (
          <DataTable dense minWidth={0} rows={compras.aguardando} rowKey={a => a.ordem.id} columns={[
            { key: "o", label: "Aguardando há mais tempo", render: a => (
              <span style={{ display: "flex", flexDirection: "column", gap: "var(--space-0-5)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}><b>OC #{a.ordem.numero ?? a.ordem.id}</b><Badge size="sm" tone={tomStatus[a.ordem.status]}>{a.ordem.status}</Badge></span>
                <span style={{ fontSize: "var(--fs-p6)", color: "var(--text-secondary)" }}>{nomeObra(a.ordem.obraId)}</span>
              </span>
            ) },
            { key: "v", label: "Valor", align: "right", render: a => (a.valor > 0 ? <b>{fmt(a.valor)}</b> : "—") },
            { key: "d", label: "Espera", align: "right", render: a => (a.dias === 0 ? "hoje" : `${plural(a.dias, "dia", "dias")}`) },
          ]} />
        )}
      </Card>
    </Secao>
  );
}
