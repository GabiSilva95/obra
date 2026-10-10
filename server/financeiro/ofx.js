// Leitor de extrato OFX (formato SGML 1.x, o mais comum nos bancos brasileiros, e XML 2.x).
// Recebe o TEXTO do arquivo: quem lê os bytes decide o charset (OFX brasileiro costuma vir em Windows-1252).

const decodificar = s => s.replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&apos;/gi, "'").replace(/&#39;/g, "'");

/** Valor de uma tag folha: `<TRNAMT>-12.50` (SGML) ou `<TRNAMT>-12.50</TRNAMT>` (XML). */
const campo = (bloco, tag) => {
  const m = new RegExp(`<${tag}>\\s*([^<\\r\\n]*)`, "i").exec(bloco);
  return m ? decodificar(m[1]).trim() : null;
};

/** DTPOSTED como 20261005120000[-3:BRT]: só a data importa (AAAA-MM-DD). */
export function dataOfx(v) {
  const m = /^(\d{4})(\d{2})(\d{2})/.exec(v || "");
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/** Número em reais: aceita "1234.56", "-1.234,56" e "1234,56". */
export function numeroBR(v) {
  if (v == null) return NaN;
  let s = String(v).trim().replace(/[R$\s]/g, "");
  if (!s) return NaN;
  const temVirgula = s.includes(","), temPonto = s.includes(".");
  if (temVirgula && temPonto) s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  else if (temVirgula) s = s.replace(",", ".");
  return Number(s);
}

export function lerOfx(texto) {
  if (!/<OFX>/i.test(texto) && !/<STMTTRN>/i.test(texto)) throw new Error("O arquivo não parece ser um extrato OFX.");
  const blocos = [...texto.matchAll(/<STMTTRN>([\s\S]*?)(?=<\/STMTTRN>|<STMTTRN>|<\/BANKTRANLIST>|$)/gi)].map(m => m[1]);
  const transacoes = [];
  for (const b of blocos) {
    const data = dataOfx(campo(b, "DTPOSTED"));
    const valor = numeroBR(campo(b, "TRNAMT"));
    if (!data || !Number.isFinite(valor)) continue;
    const nome = campo(b, "NAME"), memo = campo(b, "MEMO");
    const descricao = [nome, memo].filter((x, i, a) => x && a.indexOf(x) === i).join(" · ") || campo(b, "TRNTYPE") || "Lançamento";
    transacoes.push({ data, valor: Math.round(valor * 100) / 100, descricao, fitid: campo(b, "FITID") || null, tipo: campo(b, "TRNTYPE") });
  }
  if (!transacoes.length) throw new Error("Nenhum lançamento encontrado no arquivo.");
  const saldo = /<LEDGERBAL>([\s\S]*?)(?=<\/LEDGERBAL>|<AVAILBAL>|<\/STMTRS>|$)/i.exec(texto)?.[1];
  const datas = transacoes.map(t => t.data).sort();
  return {
    formato: "ofx",
    banco: campo(texto, "BANKID"), conta: campo(texto, "ACCTID"),
    periodoInicio: dataOfx(campo(texto, "DTSTART")) || datas[0], periodoFim: dataOfx(campo(texto, "DTEND")) || datas.at(-1),
    saldoFinal: saldo ? numeroBR(campo(saldo, "BALAMT")) : null, dataSaldoFinal: saldo ? dataOfx(campo(saldo, "DTASOF")) : null,
    transacoes,
  };
}
