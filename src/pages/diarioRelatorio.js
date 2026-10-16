// Relatório do diário de obra: filtro por obra e período, linhas do CSV e HTML do PDF. Funções puras (testadas em diarioRelatorio.test.js).

export const escapeHtml = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/** "AAAA-MM-DD" para "DD/MM/AAAA" (sem passar por Date, que escorrega de fuso). */
export const dataBR = iso => (/^\d{4}-\d{2}-\d{2}$/.test(iso || "") ? iso.split("-").reverse().join("/") : "");

/** Registros da obra (ou de todas, com obraId vazio) dentro do período, do mais antigo para o mais novo. */
export function filtrarRegistros(diario, { obraId, de, ate } = {}) {
  return (diario || [])
    .filter(d => (!obraId || d.obraId === Number(obraId)) && (!de || d.data >= de) && (!ate || d.data <= ate))
    .sort((a, b) => a.data.localeCompare(b.data) || a.id - b.id);
}

const equipeDe = reg => (reg.apontamentos || []).map(a => a.funcionario?.nome).filter(Boolean);
const presentes = reg => (reg.apontamentos?.length ? reg.apontamentos.length : reg.trabalhadores || 0);

export const CABECALHO_CSV = ["Data", "Obra", "Clima", "Trabalhadores", "Equipe presente", "Atividades", "Observações", "Anexos"];

export function linhasCsv(registros, obras) {
  return registros.map(r => [
    dataBR(r.data), obras.find(o => o.id === r.obraId)?.nome || "", r.clima || "", presentes(r),
    equipeDe(r).join("; "), r.descricao || "", r.obs || "", r._count?.anexos || 0,
  ]);
}

/** HTML do PDF (impresso pela janela do navegador). Todo texto vindo do usuário passa por escapeHtml. */
export function htmlRelatorio(registros, obras, { obraId, de, ate } = {}) {
  const obra = obraId ? obras.find(o => o.id === Number(obraId)) : null;
  const periodo = de || ate ? `${dataBR(de) || "início"} a ${dataBR(ate) || "hoje"}` : "todo o período";
  const total = registros.reduce((s, r) => s + presentes(r), 0);
  const blocos = registros.map(r => `
    <div class="section">
      <div class="section-title">${escapeHtml(dataBR(r.data))}${obra ? "" : ` · ${escapeHtml(obras.find(o => o.id === r.obraId)?.nome || "")}`}${r.clima ? ` · ${escapeHtml(r.clima)}` : ""}</div>
      <p><b>Equipe presente (${presentes(r)}):</b> ${escapeHtml(equipeDe(r).join(", ") || (r.trabalhadores ? `${r.trabalhadores} trabalhadores` : "não informada"))}</p>
      <p><b>Atividades:</b> ${escapeHtml(r.descricao).replace(/\n/g, "<br/>")}</p>
      ${r.obs ? `<p><b>Observações:</b> ${escapeHtml(r.obs).replace(/\n/g, "<br/>")}</p>` : ""}
      ${r._count?.anexos ? `<p><b>Anexos:</b> ${r._count.anexos} arquivo${r._count.anexos > 1 ? "s" : ""} guardado${r._count.anexos > 1 ? "s" : ""} no registro</p>` : ""}
    </div>`).join("");
  return `<h1>Relatório do diário de obra</h1>
    <div class="sub">${escapeHtml(obra ? obra.nome : "Todas as obras")} · ${escapeHtml(periodo)} · ${registros.length} registro${registros.length === 1 ? "" : "s"} · ${total} presenças</div>
    ${blocos || "<p>Nenhum registro no período.</p>"}`;
}
