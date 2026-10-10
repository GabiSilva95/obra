// Utilidades do Financeiro. A matemática de centavos, parcelas e rateio é a MESMA do servidor
// (importada de server/financeiro): o que a tela mostra de prévia é exatamente o que será gravado.
export { emCentavos, emReais, dividirIgual, ratearProporcional } from "../../../server/financeiro/dinheiro.js";
export { gerarParcelas } from "../../../server/financeiro/parcelas.js";
export { validarRateio, distribuirRateio } from "../../../server/financeiro/rateio.js";

export const dataBR = d => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR") : "—");

export const FORMAS = [
  { value: "pix", label: "PIX" }, { value: "boleto", label: "Boleto" }, { value: "ted", label: "TED / transferência" },
  { value: "dinheiro", label: "Dinheiro" }, { value: "cartao", label: "Cartão" }, { value: "cheque", label: "Cheque" },
];
export const rotuloForma = v => FORMAS.find(f => f.value === v)?.label || v;

export const TONE_STATUS = { aberto: "info", parcial: "warning", quitado: "success", cancelado: "neutral", vencido: "danger" };
export function rotuloStatus(t) {
  if (t.vencido) return "Vencido";
  if (t.status === "quitado") return t.tipo === "pagar" ? "Pago" : "Recebido";
  return { aberto: "Em aberto", parcial: "Parcial", cancelado: "Cancelado" }[t.status] || t.status;
}
export const toneStatus = t => (t.vencido ? "danger" : TONE_STATUS[t.status] || "neutral");

/** "Obra · Etapa", "Centro", ou "Rateado (2)" para um título. */
export function resumoRateio(t, { obras = [], centros = [], etapasObra = [], tiposEtapa = [] }) {
  const nomeEtapa = id => { const e = etapasObra.find(x => x.id === id); return tiposEtapa.find(x => x.id === e?.tipoEtapaId)?.nome; };
  const linha = r => [obras.find(o => o.id === r.obraId)?.nome, r.etapaId && nomeEtapa(r.etapaId), centros.find(c => c.id === r.centroCustoId)?.nome].filter(Boolean).join(" · ");
  if (!t.rateios?.length) return { texto: "Sem classificação", detalhe: [] };
  if (t.rateios.length === 1) return { texto: linha(t.rateios[0]), detalhe: [] };
  return { texto: `Rateado em ${t.rateios.length}`, detalhe: t.rateios.map(r => ({ texto: linha(r), valor: r.valor })) };
}

/** Saldo, em reais, que a baixa move no banco: valor + juros + multa - desconto. */
export const movimento = ({ valor = 0, juros = 0, multa = 0, desconto = 0 }) => (Math.round(valor * 100) + Math.round(juros * 100) + Math.round(multa * 100) - Math.round(desconto * 100)) / 100;

const esc = v => String(v ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
/** HTML de uma tabela para a exportação em PDF (o mesmo padrão de Relatórios). */
export const tabelaHtml = (titulo, subtitulo, cabecalho, linhas) =>
  `<h1>${esc(titulo)}</h1><div class="sub">${esc(subtitulo)}</div><table><thead><tr>${cabecalho.map(c => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${linhas.map(l => `<tr>${l.map(c => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
