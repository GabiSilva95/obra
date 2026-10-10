import { useCallback, useEffect, useState } from "react";
import { Banner, Button, SegmentedTabs } from "../../../design-system";
import Titulos from "./Titulos";
import VisaoGeral from "./VisaoGeral";
import Contas from "./Contas";
import Cadastros from "./Cadastros";
import Resultado from "./Resultado";
import Pendencias from "./Pendencias";
import Fluxo from "./Fluxo";
import Relatorios from "./Relatorios";

/**
 * Financeiro: caixa (contas a pagar e a receber, contas, fluxo) e resultado por obra.
 * Carrega os próprios dados sob demanda (`/financeiro/*`); só despesas e receitas, que também
 * alimentam o custo exibido em outras telas, ficam no carregamento global (`data`).
 */
export default function Financeiro({ data, setData, api, canWrite }) {
  const [aba, setAba] = useState("geral");
  const [inicial, setInicial] = useState(null);
  const [base, setBase] = useState(null);
  const [erro, setErro] = useState(null);

  const recarregarBase = useCallback(async () => {
    try { setBase(await api.get("/financeiro/base")); setErro(null); } catch (e) { setErro(e.message); }
  }, [api.get]); // eslint-disable-line
  useEffect(() => { recarregarBase(); }, []); // eslint-disable-line

  // Despesas e receitas geradas pelos lançamentos entram no custo das obras: atualiza o que as outras telas leem
  const atualizarCompetencia = useCallback(async () => {
    try {
      const [despesas, receitas] = await Promise.all([api.get("/despesas"), api.get("/receitas")]);
      setData(d => ({ ...d, despesas, receitas }));
    } catch { /* a próxima carga completa corrige */ }
  }, [api.get, setData]); // eslint-disable-line

  const irPara = (destino, filtros) => { setInicial(filtros || null); setAba(destino); };

  if (erro && !base) return (
    <Banner tone="danger" title="Não foi possível abrir o Financeiro" action={<Button size="sm" variant="secondary" onClick={recarregarBase}>Tentar novamente</Button>}>{erro}</Banner>
  );
  if (!base) return <span style={{ color: "var(--text-secondary)" }}>Carregando…</span>;

  const ctx = { data, setData, api, canWrite, base, recarregarBase, atualizarCompetencia };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <p style={{ color: "var(--text-secondary)" }}>Contas a pagar e a receber, contas bancárias e resultado das obras.</p>
      <SegmentedTabs variant="light" value={aba} onChange={v => irPara(v)} tabs={[
        { value: "geral", label: "Resumo" }, { value: "pagar", label: "A pagar" }, { value: "receber", label: "A receber" },
        { value: "pendencias", label: "Pendências" }, { value: "contas", label: "Contas e conciliação" }, { value: "fluxo", label: "Fluxo de caixa" }, { value: "resultado", label: "Resultado" }, { value: "relatorios", label: "Relatórios" }, { value: "cadastros", label: "Cadastros" },
      ]} />
      {aba === "geral" && <VisaoGeral ctx={ctx} irPara={irPara} />}
      {aba === "pagar" && <Titulos key={`pagar-${inicial?.status || ""}`} tipo="pagar" ctx={ctx} inicial={inicial} />}
      {aba === "receber" && <Titulos key={`receber-${inicial?.status || ""}`} tipo="receber" ctx={ctx} inicial={inicial} />}
      {aba === "pendencias" && <Pendencias ctx={ctx} irPara={irPara} />}
      {aba === "contas" && <Contas ctx={ctx} />}
      {aba === "fluxo" && <Fluxo ctx={ctx} />}
      {aba === "resultado" && <Resultado ctx={ctx} />}
      {aba === "relatorios" && <Relatorios ctx={ctx} />}
      {aba === "cadastros" && <Cadastros ctx={ctx} />}
    </div>
  );
}
