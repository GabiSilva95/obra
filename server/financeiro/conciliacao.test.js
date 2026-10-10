import test from "node:test";
import assert from "node:assert/strict";
import { lerOfx, dataOfx, numeroBR } from "./ofx.js";
import { lerCsv, dataCsv, lerCelulas } from "./csv.js";
import { sugerir, melhoresSugestoes, afinidadeNome, comHashes, hashLancamento } from "./conciliacao.js";

const OFX_SGML = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
CHARSET:1252

<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS>
<BANKACCTFROM><BANKID>341<ACCTID>12345-6</BANKACCTFROM>
<BANKTRANLIST><DTSTART>20261001000000[-3:BRT]<DTEND>20261031000000[-3:BRT]
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261005120000[-3:BRT]<TRNAMT>-4650.00<FITID>202610050001<MEMO>PIX ENVIADO GABRIELLA MATERIAIS</STMTTRN>
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20261008<TRNAMT>12500,50<FITID>202610080002<NAME>RECEBIMENTO TED<MEMO>CLIENTE SILVA</STMTTRN>
<STMTTRN><TRNTYPE>FEE<DTPOSTED>20261010<TRNAMT>-14.90<FITID>202610100003<MEMO>TARIFA MANUTENCAO &amp; CONTA</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL><BALAMT>7835.60<DTASOF>20261031000000[-3:BRT]</LEDGERBAL>
</STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;

test("OFX SGML: lançamentos, valores, datas e saldo", () => {
  const r = lerOfx(OFX_SGML);
  assert.equal(r.transacoes.length, 3);
  assert.deepEqual(r.transacoes.map(t => [t.data, t.valor]), [["2026-10-05", -4650], ["2026-10-08", 12500.5], ["2026-10-10", -14.9]]);
  assert.equal(r.transacoes[1].descricao, "RECEBIMENTO TED · CLIENTE SILVA");
  assert.equal(r.transacoes[2].descricao, "TARIFA MANUTENCAO & CONTA");
  assert.equal(r.transacoes[0].fitid, "202610050001");
  assert.equal(r.banco, "341"); assert.equal(r.conta, "12345-6");
  assert.equal(r.periodoInicio, "2026-10-01"); assert.equal(r.periodoFim, "2026-10-31");
  assert.equal(r.saldoFinal, 7835.6); assert.equal(r.dataSaldoFinal, "2026-10-31");
});

test("OFX XML 2.x e acentos", () => {
  const xml = `<?xml version="1.0"?><OFX><BANKTRANLIST><STMTTRN><TRNTYPE>DEBIT</TRNTYPE><DTPOSTED>20261001</DTPOSTED><TRNAMT>-10.00</TRNAMT><FITID>1</FITID><MEMO>Pagamento à vista – José</MEMO></STMTTRN></BANKTRANLIST></OFX>`;
  const r = lerOfx(xml);
  assert.equal(r.transacoes[0].descricao, "Pagamento à vista – José");
  assert.throws(() => lerOfx("isto não é OFX"), /não parece/);
  assert.throws(() => lerOfx("<OFX></OFX>"), /Nenhum lançamento/);
});

test("OFX: datas e números", () => {
  assert.equal(dataOfx("20261005120000[-3:BRT]"), "2026-10-05");
  assert.equal(dataOfx("abc"), null);
  assert.equal(numeroBR("1.234,56"), 1234.56); assert.equal(numeroBR("-1,234.56"), -1234.56); assert.equal(numeroBR("12,5"), 12.5); assert.equal(numeroBR("R$ 10,00"), 10);
  assert.ok(Number.isNaN(numeroBR("")));
});

test("CSV: separador ;, vírgula decimal, colunas detectadas", () => {
  const csv = `Extrato da conta\nData;Histórico;Valor;Saldo\n05/10/2026;"PIX ENVIADO; MATERIAIS";-4.650,00;1.000,00\n08/10/2026;TED RECEBIDA;12.500,50;13.500,50\n`;
  const r = lerCsv(csv);
  assert.equal(r.completo, true);
  assert.deepEqual(r.transacoes.map(t => [t.data, t.valor, t.descricao]), [["2026-10-05", -4650, "PIX ENVIADO; MATERIAIS"], ["2026-10-08", 12500.5, "TED RECEBIDA"]]);
});

test("CSV: colunas separadas de crédito e débito, e D/C no valor", () => {
  const a = lerCsv(`Data,Descrição,Crédito,Débito\n2026-10-01,Venda,500.00,\n2026-10-02,Tarifa,,15.90\n`);
  assert.deepEqual(a.transacoes.map(t => t.valor), [500, -15.9]);
  const b = lerCsv(`Data;Descricao;Valor\n01/10/26;Compra;10,00 D\n02/10/26;Depósito;20,00 C\n03/10/26;Estorno;(5,00)\n`);
  assert.deepEqual(b.transacoes.map(t => [t.data, t.valor]), [["2026-10-01", -10], ["2026-10-02", 20], ["2026-10-03", -5]]);
});

test("CSV: sem colunas reconhecidas pede o mapeamento; com mapeamento lê", () => {
  const csv = `A;B;C\n05/10/2026;foo;10,00\n`;
  assert.equal(lerCsv(csv).completo, false);
  const r = lerCsv(csv, { data: 0, descricao: 1, valor: 2 });
  assert.equal(r.completo, true); assert.equal(r.transacoes[0].valor, 10);
  assert.equal(dataCsv("31/02/2026") && dataCsv("32/01/2026"), null);
  assert.deepEqual(lerCelulas('a;"b;c";d\n1;2;3'), [["a", "b;c", "d"], ["1", "2", "3"]]);
});

test("hash: mesma linha duas vezes no arquivo não vira uma só; reimportar gera o mesmo hash", () => {
  const t = { data: "2026-10-01", valor: -3.5, descricao: "Café" };
  const h = comHashes([t, t, { ...t, fitid: "X1" }]);
  assert.notEqual(h[0].hash, h[1].hash);
  assert.deepEqual(comHashes([t, t]).map(x => x.hash), [h[0].hash, h[1].hash]);
  assert.equal(hashLancamento({ ...t, fitid: "X1" }), h[2].hash);
});

test("sugestões: valor igual, janela de dias, nome e exclusividade", () => {
  const lancs = [
    { id: 1, data: "2026-10-05", valorCent: -465000, descricao: "PIX ENVIADO GABRIELLA MATERIAIS" },
    { id: 2, data: "2026-10-08", valorCent: 1250050, descricao: "TED CLIENTE SILVA" },
    { id: 3, data: "2026-10-10", valorCent: -1490, descricao: "TARIFA" },
  ];
  const baixas = [
    { id: 10, data: "2026-10-05", movimentoCent: -465000, pessoa: "Gabriella Materiais Ltda" },
    { id: 11, data: "2026-10-07", movimentoCent: 1250050, pessoa: "Silva Construções" },
    { id: 12, data: "2026-09-20", movimentoCent: -1490, pessoa: "Banco" },
  ];
  const s = sugerir(lancs, baixas);
  assert.equal(s.length, 2);
  assert.deepEqual(s.map(x => x.lancamentoId).sort(), [1, 2]);
  const um = s.find(x => x.lancamentoId === 1);
  assert.deepEqual(um.baixaIds, [10]); assert.equal(um.confianca, "alta"); assert.ok(um.motivos.includes("nome na descrição"));
  assert.ok(!s.some(x => x.lancamentoId === 3), "20 dias de diferença fica de fora");
  // sinal oposto nunca casa
  assert.equal(sugerir([{ id: 9, data: "2026-10-05", valorCent: 100, descricao: "x" }], [{ id: 1, data: "2026-10-05", movimentoCent: -100, pessoa: "" }]).length, 0);
});

test("sugestões: duas baixas iguais viram 'media' e não são reaproveitadas", () => {
  const lancs = [{ id: 1, data: "2026-10-05", valorCent: -10000, descricao: "PIX" }, { id: 2, data: "2026-10-05", valorCent: -10000, descricao: "PIX" }];
  const baixas = [{ id: 10, data: "2026-10-05", movimentoCent: -10000, pessoa: "A" }, { id: 11, data: "2026-10-05", movimentoCent: -10000, pessoa: "B" }];
  const s = sugerir(lancs, baixas);
  assert.ok(s.every(x => x.confianca === "media"));
  const melhores = melhoresSugestoes(s);
  assert.equal(melhores.length, 2);
  assert.equal(new Set(melhores.flatMap(x => x.baixaIds)).size, 2);
});

test("sugestões: pagamento em lote (soma de baixas da mesma data)", () => {
  const lancs = [{ id: 1, data: "2026-10-20", valorCent: -30050, descricao: "PAGAMENTO FORNECEDORES" }];
  const baixas = [
    { id: 1, data: "2026-10-20", movimentoCent: -10000, pessoa: "A" }, { id: 2, data: "2026-10-20", movimentoCent: -20050, pessoa: "B" },
    { id: 3, data: "2026-10-20", movimentoCent: -777, pessoa: "C" },
  ];
  const s = sugerir(lancs, baixas);
  assert.equal(s.length, 1);
  assert.deepEqual(s[0].baixaIds.sort(), [1, 2]);
  assert.ok(s[0].motivos.some(m => /somados/.test(m)));
});

test("afinidadeNome ignora palavras fracas e acentos", () => {
  assert.equal(afinidadeNome("Depósito Central Ltda", "PIX DEPOSITO CENTRAL"), 1);
  assert.equal(afinidadeNome("Depósito Central Ltda", "TED OUTRO"), 0);
  assert.equal(afinidadeNome("", "x"), 0);
});
