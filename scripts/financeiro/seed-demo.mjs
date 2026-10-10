// Dados de exemplo do Financeiro SÓ para o tenant de demonstração (admin@teste.com),
// usados nos vídeos da Central de treinamentos e em demonstrações.
//
//   node --env-file=.env scripts/financeiro/seed-demo.mjs            cria (não faz nada se já existir)
//   node --env-file=.env scripts/financeiro/seed-demo.mjs --limpar   apaga os dados financeiros do tenant demo e recria
//
// Idempotente: a conta "Banco Principal" é a marca de que já foi criado.
import prisma from "../../server/db.js";
import { hojeBR, somarDias } from "../../server/utils/datas.js";
import { garantirPadroes } from "../../server/financeiro/padroes.js";
import { criarDocumento, baixarTitulo, TX } from "../../server/financeiro/servico.js";
import { gerarParcelas } from "../../server/financeiro/parcelas.js";
import { comHashes } from "../../server/financeiro/conciliacao.js";
import { saldosDasContas } from "../../server/financeiro/saldos.js";

const EMAIL = "admin@teste.com";
const hoje = hojeBR();
const mais = n => somarDias(hoje, n);

const user = await prisma.user.findFirst({ where: { email: EMAIL }, select: { tenantId: true } });
if (!user) { console.error(`Usuário de demonstração (${EMAIL}) não encontrado.`); process.exit(1); }
const tenantId = user.tenantId;

if (process.argv.includes("--limpar")) {
  await prisma.$transaction(async tx => {
    await tx.apontamentoMO.updateMany({ where: { tenantId, tituloId: { not: null } }, data: { tituloId: null } });
    await tx.alocacao.updateMany({ where: { tenantId, tituloId: { not: null } }, data: { tituloId: null } });
    const grupos = (await tx.titulo.findMany({ where: { tenantId }, select: { grupoId: true } })).map(t => t.grupoId);
    await tx.despesa.deleteMany({ where: { tenantId, grupoId: { in: grupos } } });
    await tx.receita.deleteMany({ where: { tenantId, grupoId: { in: grupos } } });
    await tx.titulo.deleteMany({ where: { tenantId } });
    await tx.transferenciaConta.deleteMany({ where: { tenantId } });
    await tx.contaFinanceira.deleteMany({ where: { tenantId } });
  }, TX);
  console.log("Dados financeiros do tenant demo removidos.");
}

if (await prisma.contaFinanceira.findFirst({ where: { tenantId, nome: "Banco Principal" } })) {
  console.log("Dados de demonstração do Financeiro já existem. Use --limpar para recriar.");
  await prisma.$disconnect();
  process.exit(0);
}

await garantirPadroes(prisma, tenantId);
const obras = await prisma.obra.findMany({ where: { tenantId }, orderBy: { id: "asc" }, take: 2 });
if (obras.length < 2) { console.error("O tenant demo precisa de pelo menos 2 obras."); process.exit(1); }
const [obraA, obraB] = obras;
const centroAdm = await prisma.centroCusto.findFirst({ where: { tenantId, nome: "Administrativo" } });

const pessoa = async (nome, flags) => (await prisma.funcionario.findFirst({ where: { tenantId, nome } })) || prisma.funcionario.create({ data: { tenantId, nome, ...flags } });
const deposito = await pessoa("Depósito Construforte", { isFornecedor: true });
await pessoa("Locadora Rápida", { isFornecedor: true });
const cliente = await pessoa("Silva Empreendimentos", { isCliente: true });

await prisma.$transaction(async tx => {
  const banco = await tx.contaFinanceira.create({ data: { tenantId, nome: "Banco Principal", tipo: "banco", banco: "Banco do Brasil", agencia: "1234-5", numero: "98765-4", saldoInicial: "80000.00", dataSaldoInicial: mais(-60) } });
  const caixa = await tx.contaFinanceira.create({ data: { tenantId, nome: "Caixa da obra", tipo: "caixa", saldoInicial: "500.00", dataSaldoInicial: mais(-60) } });
  const doc = (d, pag) => criarDocumento(tx, { tenantId, emissao: d.emissao || hoje, ...d, parcelas: pag });
  const uma = (valorCent, venc) => gerarParcelas({ valorCent, primeiroVencimento: venc });
  const avista = (data, forma = "pix") => ({ contaId: banco.id, data, forma });
  const rateioObra = (obraId, valorCent) => [{ obraId, etapaId: null, centroCustoId: null, valorCent }];

  // A pagar
  await doc({ tipo: "pagar", origemTipo: "despesa", descricao: "Combustível da retroescavadeira", categoria: "Combustível", pessoaTexto: "Posto Alvorada", emissao: mais(-6), rateio: rateioObra(obraB.id, 68000), baixaImediata: avista(mais(-6)) }, uma(68000, mais(-6)));
  await doc({ tipo: "pagar", origemTipo: "despesa", descricao: "Conta de energia do canteiro", categoria: "Administrativo", pessoaTexto: "Energisa", emissao: mais(-20), rateio: rateioObra(obraB.id, 89000) }, uma(89000, mais(-5)));
  await doc({ tipo: "pagar", origemTipo: "despesa", descricao: "Aço CA-50 para a fundação", categoria: "Outros", pessoaId: deposito.id, documento: "NF 4512", emissao: mais(-2),
    rateio: [{ obraId: obraA.id, etapaId: null, centroCustoId: null, valorCent: 1080000 }, { obraId: obraB.id, etapaId: null, centroCustoId: null, valorCent: 720000 }] }, gerarParcelas({ valorCent: 1800000, primeiroVencimento: mais(8), parcelas: 3 }));
  await doc({ tipo: "pagar", origemTipo: "despesa", descricao: "Aluguel do escritório", categoria: "Aluguel", pessoaTexto: "Imobiliária Central", emissao: hoje, recorrente: true,
    rateio: [{ obraId: null, etapaId: null, centroCustoId: centroAdm.id, valorCent: 450000 }] }, gerarParcelas({ valorCent: 450000, primeiroVencimento: mais(12), parcelas: 3, modo: "repetir" }));
  const parcial = await doc({ tipo: "pagar", origemTipo: "despesa", descricao: "Locação de betoneira", categoria: "Aluguel", pessoaTexto: "Locadora Rápida", emissao: mais(-15), rateio: rateioObra(obraA.id, 120000) }, uma(120000, mais(-2)));
  await baixarTitulo(tx, { tenantId, tituloId: parcial.titulos[0].id, contaId: banco.id, data: mais(-2), valorCent: 40000, forma: "pix" });

  // A receber
  await doc({ tipo: "receber", origemTipo: "receita", descricao: "1ª medição da Casa Gabriella", categoria: "Medição", pessoaId: cliente.id, emissao: mais(-1), rateio: rateioObra(obraB.id, 4500000) }, uma(4500000, mais(15)));
  await doc({ tipo: "receber", origemTipo: "receita", descricao: "Adiantamento de contrato", categoria: "Adiantamento", pessoaId: cliente.id, emissao: mais(-20), rateio: rateioObra(obraB.id, 2000000), baixaImediata: avista(mais(-20), "ted") }, uma(2000000, mais(-20)));
  await doc({ tipo: "receber", origemTipo: "receita", descricao: "Retenção liberada do Prédio Office", categoria: "Retenção liberada", pessoaTexto: "Construtora Parceira", emissao: mais(-30), rateio: rateioObra(obraA.id, 350000) }, uma(350000, mais(-12)));

  // Transferência entre contas e extrato do banco, com linhas que casam e linhas que faltam tratar
  await tx.transferenciaConta.create({ data: { tenantId, deContaId: banco.id, paraContaId: caixa.id, data: mais(-3), valor: "2000.00", obs: "Reforço do caixa da obra" } });
  const linhas = comHashes([
    { data: mais(-20), valor: 20000, descricao: "TED RECEBIDA SILVA EMPREENDIMENTOS", fitid: "demo-1" },
    { data: mais(-6), valor: -680, descricao: "PIX ENVIADO POSTO ALVORADA", fitid: "demo-2" },
    { data: mais(-3), valor: -2000, descricao: "TRANSF ENVIADA CAIXA DA OBRA", fitid: "demo-3" },
    { data: mais(-2), valor: -400, descricao: "PIX ENVIADO LOCADORA RAPIDA", fitid: "demo-4" },
    { data: mais(-8), valor: -35.9, descricao: "TARIFA PACOTE DE SERVICOS", fitid: "demo-5" },
    { data: mais(-1), valor: 12.43, descricao: "RENDIMENTO APLICACAO AUTOMATICA", fitid: "demo-6" },
  ]);
  const imp = await tx.importacaoExtrato.create({ data: { tenantId, contaId: banco.id, arquivo: "extrato-banco-do-brasil.ofx", formato: "ofx", periodoInicio: mais(-30), periodoFim: hoje, total: linhas.length, novos: linhas.length } });
  await tx.lancamentoBancario.createMany({ data: linhas.map(t => ({ tenantId, contaId: banco.id, importacaoId: imp.id, data: t.data, valor: t.valor.toFixed(2), descricao: t.descricao, fitid: t.fitid, hash: t.hash })) });
}, TX);

// Saldo final do banco: o do sistema, menos a tarifa e mais o rendimento que ainda não foram lançados
const banco = await prisma.contaFinanceira.findFirst({ where: { tenantId, nome: "Banco Principal" } });
const sistema = (await saldosDasContas(prisma, tenantId, { ate: hoje })).get(banco.id);
const final = (sistema - 3590 + 1243) / 100;
await prisma.importacaoExtrato.updateMany({ where: { tenantId, contaId: banco.id }, data: { saldoFinal: final.toFixed(2), dataSaldoFinal: hoje } });
console.log(`Dados de demonstração do Financeiro criados (saldo do extrato ${final.toFixed(2)}).`);
await prisma.$disconnect();
