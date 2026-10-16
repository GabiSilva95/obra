import test from "node:test";
import assert from "node:assert/strict";
import { CABECALHO_CSV, dataBR, escapeHtml, filtrarRegistros, htmlRelatorio, linhasCsv } from "./diarioRelatorio.js";

const obras = [{ id: 1, nome: "Casa" }, { id: 2, nome: "Galpão" }];
const diario = [
  { id: 3, obraId: 1, data: "2026-10-12", clima: "Chuvoso", descricao: "Laje <b>1</b>", obs: "", trabalhadores: 4, apontamentos: [], _count: { anexos: 2 } },
  { id: 1, obraId: 1, data: "2026-10-10", descricao: "Fundação", apontamentos: [{ funcionario: { nome: "Ana" } }, { funcionario: { nome: "Beto" } }], _count: { anexos: 0 } },
  { id: 2, obraId: 2, data: "2026-10-11", descricao: "Terraplanagem", trabalhadores: 0 },
];

test("filtra por obra e período, do mais antigo para o mais novo", () => {
  assert.deepEqual(filtrarRegistros(diario, { obraId: 1 }).map(r => r.id), [1, 3]);
  assert.deepEqual(filtrarRegistros(diario, { obraId: "", de: "2026-10-11", ate: "2026-10-11" }).map(r => r.id), [2]);
  assert.deepEqual(filtrarRegistros(diario, { ate: "2026-10-10" }).map(r => r.id), [1]);
  assert.deepEqual(filtrarRegistros(null), []);
});

test("data em português sem escorregar de fuso", () => {
  assert.equal(dataBR("2026-10-05"), "05/10/2026");
  assert.equal(dataBR(""), "");
});

test("linhas do CSV: equipe, presença e anexos", () => {
  const l = linhasCsv(filtrarRegistros(diario, { obraId: 1 }), obras);
  assert.equal(l[0].length, CABECALHO_CSV.length);
  assert.deepEqual(l[0], ["10/10/2026", "Casa", "", 2, "Ana; Beto", "Fundação", "", 0]);
  assert.equal(l[1][3], 4);
  assert.equal(l[1][7], 2);
});

test("o HTML do PDF escapa o texto do usuário", () => {
  const h = htmlRelatorio(filtrarRegistros(diario, { obraId: 1 }), obras, { obraId: 1 });
  assert.ok(h.includes("Laje &lt;b&gt;1&lt;/b&gt;") && !h.includes("<b>1</b>"));
  assert.ok(h.includes("Casa") && h.includes("2 registros") && h.includes("6 presenças"));
  assert.ok(h.includes("2 arquivos guardados"));
  assert.equal(escapeHtml(`"&'`), "&quot;&amp;&#39;");
  assert.ok(htmlRelatorio([], obras, {}).includes("Nenhum registro no período."));
});
