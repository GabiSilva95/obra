import { XMLParser } from "fast-xml-parser";

const xmlParser = new XMLParser({
  ignoreAttributes:    false,
  attributeNamePrefix: "@_",
  removeNSPrefix:      true,
  parseTagValue:       true,
  parseAttributeValue: true,
  trimValues:          true,
});

export function extrairDadosNfe(xmlStr) {
  const doc = xmlParser.parse(xmlStr);
  const nfe  = doc?.nfeProc?.NFe ?? doc?.NFe;
  const inf  = nfe?.infNFe;
  if (!inf) throw new Error("XML inválido: não encontrado <infNFe>");

  const emit = inf.emit ?? {};
  const ide  = inf.ide  ?? {};
  const nNF  = String(ide.nNF ?? "");
  const dhEmi = ide.dhEmi ? String(ide.dhEmi).slice(0, 10) : null;
  const nomeFornecedor = emit.xNome ?? emit.xFant ?? "";
  const cnpj  = String(emit.CNPJ ?? emit.CPF ?? "");

  const dets = Array.isArray(inf.det) ? inf.det : inf.det ? [inf.det] : [];
  const itens = dets.map(d => {
    const p = d.prod ?? {};
    return {
      nome:       String(p.xProd ?? ""),
      unidade:    String(p.uCom ?? p.uTrib ?? "un"),
      quantidade: parseFloat(p.qCom ?? p.qTrib ?? 0),
      valorUnit:  parseFloat(p.vUnCom ?? p.vUnTrib ?? 0),
      ncm:        String(p.NCM ?? ""),
      codProd:    String(p.cProd ?? ""),
    };
  }).filter(i => i.nome && i.quantidade > 0);

  // Cobrança: as duplicatas (parcelas reais) viram as contas a pagar da compra
  const total = parseFloat(inf.total?.ICMSTot?.vNF ?? 0) || null;
  const dups = Array.isArray(inf.cobr?.dup) ? inf.cobr.dup : inf.cobr?.dup ? [inf.cobr.dup] : [];
  const duplicatas = dups
    .map(d => ({ numero: d.nDup != null ? String(d.nDup) : "", vencimento: d.dVenc ? String(d.dVenc).slice(0, 10) : null, valor: parseFloat(d.vDup ?? 0) }))
    .filter(d => d.vencimento && d.valor > 0);

  return { fornecedor: nomeFornecedor, cnpj, nfe: nNF, data: dhEmi, total, duplicatas, itens };
}
