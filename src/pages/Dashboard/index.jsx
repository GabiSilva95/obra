import { useMemo, useState } from "react";
import { fmt, today } from "../../utils/helpers";
import { Banner, Button, Select } from "../../../design-system";
import { PageActions } from "../../components/PageActions";
import CardsObras from "./CardsObras";
import SecaoEstoque from "./SecaoEstoque";
import SecaoFinanceiro from "./SecaoFinanceiro";
import SecaoObras from "./SecaoObras";
import { TituloSecao } from "./Secao";
import { indicadoresCompras, indicadoresEstoque, indicadoresObras } from "./indicadores";

/**
 * Início: resumo dos indicadores em três seções (Obras, Financeiro, Estoque), cada uma com um card dos
 * principais números, e o card de cada obra no fim. O filtro de obra vale para Obras e Estoque;
 * o Financeiro é sempre da empresa toda.
 * `financeiro`: /financeiro/resumo (null carregando, false falhou); `pode`: { financeiro, estoque };
 * `ir(id)` abre uma tela do menu.
 */
export default function Dashboard({ data, userId, isMaster, financeiro, pode, api, ir }) {
  const { obras, users } = data;
  const [filtro, setFiltro] = useState("all");
  const user = users.find(u => u.id === userId);
  const acess = useMemo(() => (isMaster ? obras : obras.filter(o => (user?.obrasAcesso || []).includes(o.id))), [isMaster, obras, user]);
  const filt = useMemo(() => (filtro === "all" ? acess : acess.filter(o => o.id === parseInt(filtro))), [acess, filtro]);
  const ind = useMemo(() => ({
    obras: indicadoresObras(filt, data),
    estoque: indicadoresEstoque(filt, data),
    compras: indicadoresCompras(data.compras || [], filt, today()),
  }), [filt, data]);
  const totAtras = ind.obras.etapas.atrasadas;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
      <PageActions>
        <Select aria-label="Filtrar obra" style={{ height: "var(--control-h-sm)", minWidth: "var(--control-w-md)" }} value={filtro} onChange={e => setFiltro(e.target.value)}>
          <option value="all">Todas as obras</option>
          {acess.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </Select>
      </PageActions>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <p style={{ color: "var(--text-secondary)" }}>
          {(d => d[0].toUpperCase() + d.slice(1))(new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }))}
        </p>
        {totAtras > 0 && (
          <Banner tone="danger" title={`${totAtras} etapa${totAtras > 1 ? "s" : ""} atrasada${totAtras > 1 ? "s" : ""}`}>Etapas fora do prazo previsto.</Banner>
        )}
        {financeiro && financeiro.pagar.qtdVencido > 0 && (
          <Banner tone="warning" title={`${financeiro.pagar.qtdVencido} conta${financeiro.pagar.qtdVencido > 1 ? "s" : ""} a pagar vencida${financeiro.pagar.qtdVencido > 1 ? "s" : ""}`} action={<Button size="sm" variant="secondary" onClick={() => ir("financeiro")}>Ver no Financeiro</Button>}>
            {fmt(financeiro.pagar.vencido)} em atraso, na empresa toda.
          </Banner>
        )}
      </div>

      <SecaoObras ind={ind.obras} ir={ir} />
      {pode.financeiro && <SecaoFinanceiro resumo={financeiro} api={api} filtrado={filtro !== "all"} ir={ir} />}
      {pode.estoque && <SecaoEstoque estoque={ind.estoque} compras={ind.compras} obras={obras} ir={ir} />}

      <section style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <TituloSecao icone="map-pin" titulo="Cada obra" />
        <CardsObras obras={filt} data={data} />
      </section>
    </div>
  );
}
