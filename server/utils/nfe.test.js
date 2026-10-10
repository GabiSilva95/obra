import test from "node:test";
import assert from "node:assert/strict";
import { extrairDadosNfe } from "./nfe.js";

const xml = (cobr = "") => `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe"><NFe><infNFe Id="NFe123">
  <ide><nNF>000123</nNF><dhEmi>2026-10-05T10:30:00-03:00</dhEmi></ide>
  <emit><CNPJ>12345678000190</CNPJ><xNome>Depósito Central Ltda</xNome></emit>
  <det nItem="1"><prod><cProd>1</cProd><xProd>Cimento CP-II 50kg</xProd><NCM>25232910</NCM><uCom>SC</uCom><qCom>100.0000</qCom><vUnCom>38.9000</vUnCom></prod></det>
  <det nItem="2"><prod><cProd>2</cProd><xProd>Areia média</xProd><NCM>25051000</NCM><uCom>M3</uCom><qCom>10.0000</qCom><vUnCom>120.0000</vUnCom></prod></det>
  <total><ICMSTot><vNF>5090.00</vNF></ICMSTot></total>
  ${cobr}
</infNFe></NFe></nfeProc>`;

test("NF-e: itens, fornecedor, total e duplicatas", () => {
  const d = extrairDadosNfe(xml(`<cobr><fat><nFat>123</nFat><vOrig>5090.00</vOrig></fat>
    <dup><nDup>001</nDup><dVenc>2026-11-05</dVenc><vDup>2545.00</vDup></dup>
    <dup><nDup>002</nDup><dVenc>2026-12-05</dVenc><vDup>2545.00</vDup></dup></cobr>`));
  assert.equal(d.fornecedor, "Depósito Central Ltda");
  assert.equal(d.data, "2026-10-05");
  assert.equal(d.itens.length, 2);
  assert.equal(d.total, 5090);
  assert.equal(d.duplicatas.length, 2);
  assert.deepEqual(d.duplicatas.map(x => [x.vencimento, x.valor]), [["2026-11-05", 2545], ["2026-12-05", 2545]]);
});

test("NF-e: uma só duplicata e nota sem cobrança", () => {
  const uma = extrairDadosNfe(xml(`<cobr><dup><nDup>1</nDup><dVenc>2026-11-05</dVenc><vDup>5090.00</vDup></dup></cobr>`));
  assert.equal(uma.duplicatas.length, 1);
  const sem = extrairDadosNfe(xml());
  assert.deepEqual(sem.duplicatas, []);
  assert.equal(sem.total, 5090);
});

test("NF-e: duplicata sem vencimento ou sem valor é descartada", () => {
  const d = extrairDadosNfe(xml(`<cobr><dup><nDup>1</nDup><vDup>100</vDup></dup><dup><nDup>2</nDup><dVenc>2026-11-05</dVenc><vDup>0</vDup></dup></cobr>`));
  assert.deepEqual(d.duplicatas, []);
});

test("NF-e inválida", () => {
  assert.throws(() => extrairDadosNfe("<a/>"), /infNFe/);
});
