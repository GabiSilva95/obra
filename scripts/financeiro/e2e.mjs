// Verificação ponta a ponta da API do Financeiro, com a conta de demonstração.
//
//   PORT=3012 node server/index.js        (API de teste, em outra porta)
//   API=http://localhost:3012 node --env-file=.env scripts/financeiro/e2e.mjs
//
// Cria conta, documentos, baixas e um usuário só para o teste e REMOVE tudo ao final
// (inclusive quando uma checagem falha). Conferido: custo das obras, saldo, status, rateio e permissão.
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import prisma from "../../server/db.js";

const API = process.env.API || "http://localhost:3002";
const EMAIL = process.env.TREINAMENTO_EMAIL || "admin@teste.com";
const SENHA = process.env.TREINAMENTO_SENHA || process.env.DEMO_SENHA || "admin123"; // DEMO_SENHA no .env
const soma = a => Math.round(a.reduce((x, y) => x + y, 0) * 100) / 100;

let token;
const chamar = async (metodo, caminho, corpo, tk = token) => {
  const r = await fetch(`${API}/api${caminho}`, { method: metodo, headers: { "Content-Type": "application/json", Authorization: `Bearer ${tk}` }, body: corpo ? JSON.stringify(corpo) : undefined });
  const dados = await r.json().catch(() => ({}));
  return { status: r.status, dados };
};
const ok = async (...a) => { const r = await chamar(...a); assert.ok(r.status < 300, `${a[0]} ${a[1]} → ${r.status} ${JSON.stringify(r.dados)}`); return r.dados; };
const falha = async (esperado, ...a) => { const r = await chamar(...a); assert.equal(r.status, esperado, `${a[0]} ${a[1]} deveria dar ${esperado}, deu ${r.status} ${JSON.stringify(r.dados)}`); return r.dados; };

const criados = { grupos: [], contaId: null, userId: null, ordens: [], maquinaId: null, apontamentos: [], alocacoes: [], tituloIds: [], contasExtras: [], centros: [] };
let passos = 0;
const passo = nome => { passos++; console.log(`  ${String(passos).padStart(2)}. ${nome}`); };

async function limpar() {
  try {
    for (const g of criados.grupos) {
      await prisma.despesa.deleteMany({ where: { grupoId: g } });
      await prisma.receita.deleteMany({ where: { grupoId: g } });
      await prisma.titulo.deleteMany({ where: { grupoId: g } });
    }
    if (criados.tituloIds.length) {
      await prisma.apontamentoMO.updateMany({ where: { tituloId: { in: criados.tituloIds } }, data: { tituloId: null } });
      await prisma.alocacao.updateMany({ where: { tituloId: { in: criados.tituloIds } }, data: { tituloId: null } });
    }
    await prisma.apontamentoMO.deleteMany({ where: { id: { in: criados.apontamentos } } });
    await prisma.alocacao.deleteMany({ where: { id: { in: criados.alocacoes } } });
    if (criados.maquinaId) await prisma.maquina.deleteMany({ where: { id: criados.maquinaId } });
    for (const o of criados.ordens) { await prisma.titulo.deleteMany({ where: { origemTipo: "compra", origemId: o } }); await prisma.ordemCompra.deleteMany({ where: { id: o } }); }
    const todasContas = [criados.contaId, ...criados.contasExtras].filter(Boolean);
    if (criados.centros.length) await prisma.centroCusto.deleteMany({ where: { id: { in: criados.centros } } });
    await prisma.transferenciaConta.deleteMany({ where: { OR: [{ deContaId: { in: todasContas } }, { paraContaId: { in: todasContas } }] } });
    await prisma.baixa.deleteMany({ where: { contaId: { in: todasContas } } });
    await prisma.contaFinanceira.deleteMany({ where: { id: { in: criados.contasExtras } } });
    if (criados.contaId) {
      await prisma.baixa.deleteMany({ where: { contaId: criados.contaId } });
      await prisma.contaFinanceira.deleteMany({ where: { id: criados.contaId } });
    }
    if (criados.userId) await prisma.user.deleteMany({ where: { id: criados.userId } });
  } catch (e) { console.error("Falha na limpeza:", e.message); }
}

async function principal() {
  const login = await fetch(`${API}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: EMAIL, senha: SENHA }) }).then(r => r.json());
  token = login.token; assert.ok(token, "login falhou");
  const tenantId = login.tenant.id;

  const obras = await ok("GET", "/obras");
  assert.ok(obras.length >= 2, "o tenant demo precisa de 2 obras");
  const [A, B] = obras;
  const custoObra = async id => soma((await ok("GET", "/despesas")).filter(d => d.obraId === id).map(d => d.valor));
  const antes = { A: await custoObra(A.id), B: await custoObra(B.id), total: (await ok("GET", "/despesas")).length };

  passo("base: padrões criados na primeira abertura");
  const base = await ok("GET", "/financeiro/base");
  assert.ok(base.categorias.some(c => c.tipo === "pagar" && c.nome === "Combustível"));
  assert.ok(base.categorias.some(c => c.tipo === "receber" && c.nome === "Medição"));
  assert.ok(base.centros.some(c => c.nome === "Administrativo"));
  assert.equal(base.config.prazoPadraoDias, 30);
  const adm = base.centros.find(c => c.nome === "Administrativo");

  passo("conta: criar com saldo inicial");
  const conta = await ok("POST", "/financeiro/contas", { nome: "E2E Conta", saldoInicial: 1000, dataSaldoInicial: "2026-01-01" });
  criados.contaId = conta.id;
  assert.equal(conta.saldo, 1000);

  passo("despesa parcelada em 3x, rateada entre 2 obras (60/40)");
  const d = await ok("POST", "/financeiro/documentos", {
    tipo: "pagar", natureza: "custo", descricao: "E2E Cimento", categoria: "Outros", valor: 1000.01, data: "2026-10-01",
    rateio: [{ obraId: A.id, valor: 600.01 }, { obraId: B.id, valor: 400 }],
    pagamento: { modo: "parcelado", vencimento: "2026-10-10", parcelas: 3 },
  });
  criados.grupos.push(d.grupoId);
  let lista = (await ok("GET", `/financeiro/titulos?status=todos&grupoId=${d.grupoId}`)).itens;
  assert.equal(lista.length, 3);
  assert.deepEqual(lista.map(t => t.valor), [333.34, 333.34, 333.33]);
  assert.deepEqual(lista.map(t => t.vencimento), ["2026-10-10", "2026-11-10", "2026-12-10"]);
  for (const t of lista) assert.equal(soma(t.rateios.map(r => r.valor)), t.valor, "rateio fecha a parcela");

  passo("custo da obra: uma linha de despesa por linha de rateio, somando o documento");
  const linhas = (await ok("GET", "/despesas")).filter(x => x.grupoId === d.grupoId);
  assert.equal(linhas.length, 2);
  assert.equal(soma(linhas.map(l => l.valor)), 1000.01);
  assert.equal(await custoObra(A.id), soma([antes.A, 600.01]));
  assert.equal(await custoObra(B.id), soma([antes.B, 400]));

  passo("baixa parcial, excesso recusado, quitação");
  const [p1] = lista;
  await ok("POST", `/financeiro/titulos/${p1.id}/baixas`, { contaId: conta.id, data: "2026-10-10", valor: 100 });
  let t1 = (await ok("GET", `/financeiro/titulos?status=todos&grupoId=${d.grupoId}`)).itens[0];
  assert.equal(t1.status, "parcial"); assert.equal(t1.saldo, 233.34);
  await falha(400, "POST", `/financeiro/titulos/${p1.id}/baixas`, { contaId: conta.id, data: "2026-10-10", valor: 233.35 });
  await ok("POST", `/financeiro/titulos/${p1.id}/baixas`, { contaId: conta.id, data: "2026-10-11", valor: 233.34, juros: 5, multa: 2, desconto: 1 });
  t1 = (await ok("GET", `/financeiro/titulos?status=todos&grupoId=${d.grupoId}`)).itens[0];
  assert.equal(t1.status, "quitado"); assert.equal(t1.saldo, 0);
  let resumo = await ok("GET", "/financeiro/resumo");
  assert.equal(resumo.contas.find(c => c.id === conta.id).saldo, soma([1000, -100, -(233.34 + 5 + 2 - 1)]), "saldo = inicial - baixas - juros - multa + desconto");

  passo("estorno devolve o saldo e o status");
  const aberto = (await ok("GET", `/financeiro/titulos?status=todos&grupoId=${d.grupoId}`)).itens[0].baixas.find(b => b.valor === 233.34);
  await ok("POST", `/financeiro/baixas/${aberto.id}/estornar`);
  await falha(409, "POST", `/financeiro/baixas/${aberto.id}/estornar`);
  t1 = (await ok("GET", `/financeiro/titulos?status=todos&grupoId=${d.grupoId}`)).itens[0];
  assert.equal(t1.status, "parcial"); assert.equal(t1.saldo, 233.34);

  passo("travas: cancelar despesa, excluir e mudar valor com pagamento ativo");
  await falha(409, "POST", `/financeiro/titulos/${p1.id}/cancelar`);
  await falha(409, "DELETE", `/financeiro/documentos/${d.grupoId}`);
  await falha(409, "PUT", `/financeiro/documentos/${d.grupoId}`, { valor: 2000, rateio: [{ obraId: A.id, valor: 2000 }] });

  passo("com pagamento, a classificação ainda muda: rateio 50/50 re-sincroniza o custo");
  await falha(400, "PUT", `/financeiro/documentos/${d.grupoId}`, { rateio: [{ obraId: A.id, valor: 500 }, { obraId: B.id, valor: 500 }] });
  await ok("PUT", `/financeiro/documentos/${d.grupoId}`, { rateio: [{ obraId: A.id, valor: 500.01 }, { obraId: B.id, valor: 500 }], descricao: "E2E Cimento (rateio novo)" });
  assert.equal(await custoObra(A.id), soma([antes.A, 500.01]));
  assert.equal(await custoObra(B.id), soma([antes.B, 500]));
  lista = (await ok("GET", `/financeiro/titulos?status=todos&grupoId=${d.grupoId}`)).itens;
  for (const t of lista) assert.equal(soma(t.rateios.map(r => r.valor)), t.valor);
  assert.ok(lista.every(t => t.descricao.endsWith("(rateio novo)")));

  passo("excluir o documento depois de estornar tudo remove título e custo");
  for (const b of (await ok("GET", `/financeiro/titulos?status=todos&grupoId=${d.grupoId}`)).itens.flatMap(t => t.baixas).filter(b => !b.estornadaEm)) await ok("POST", `/financeiro/baixas/${b.id}/estornar`);
  await ok("DELETE", `/financeiro/documentos/${d.grupoId}`);
  assert.equal((await ok("GET", `/financeiro/titulos?status=todos&grupoId=${d.grupoId}`)).itens.length, 0);
  assert.equal(await custoObra(A.id), antes.A); assert.equal(await custoObra(B.id), antes.B);

  passo("receita recorrente 3x: uma linha por mês, datada no vencimento");
  const r = await ok("POST", "/financeiro/documentos", {
    tipo: "receber", natureza: "custo", descricao: "E2E Aluguel recebido", categoria: "Outro", valor: 500, data: "2026-10-01",
    rateio: [{ centroCustoId: adm.id, valor: 500 }], pagamento: { modo: "repetir", vencimento: "2026-10-31", parcelas: 3 },
  });
  criados.grupos.push(r.grupoId);
  const recs = (await ok("GET", "/receitas")).filter(x => x.grupoId === r.grupoId);
  assert.deepEqual(recs.map(x => x.data).sort(), ["2026-10-31", "2026-11-30", "2026-12-31"]);
  assert.ok(recs.every(x => x.obraId === null && x.centroCustoId === adm.id && x.valor === 500));
  await ok("DELETE", `/financeiro/documentos/${r.grupoId}`);

  passo("avulso à vista: já nasce quitado, não gera custo; cancelar só depois de estornar");
  const av = await ok("POST", "/financeiro/documentos", {
    tipo: "pagar", natureza: "outro", descricao: "E2E Retirada", valor: 50, data: "2026-10-02",
    pagamento: { modo: "avista", contaId: conta.id, dataPagamento: "2026-10-02", forma: "dinheiro" },
  });
  criados.grupos.push(av.grupoId);
  const [tav] = (await ok("GET", `/financeiro/titulos?status=todos&grupoId=${av.grupoId}`)).itens;
  assert.equal(tav.status, "quitado"); assert.equal(tav.origemTipo, "avulso");
  assert.equal((await ok("GET", "/despesas")).filter(x => x.grupoId === av.grupoId).length, 0);
  await falha(409, "POST", `/financeiro/titulos/${tav.id}/cancelar`);
  await ok("POST", `/financeiro/baixas/${tav.baixas[0].id}/estornar`);
  await ok("POST", `/financeiro/titulos/${tav.id}/cancelar`);

  passo("baixa em lote: tudo ou nada");
  const mk = async (desc, valor) => { const x = await ok("POST", "/financeiro/documentos", { tipo: "pagar", natureza: "outro", descricao: desc, valor, data: "2026-10-03", pagamento: { modo: "prazo", vencimento: "2026-10-20" } }); criados.grupos.push(x.grupoId); return (await ok("GET", `/financeiro/titulos?status=todos&grupoId=${x.grupoId}`)).itens[0]; };
  const l1 = await mk("E2E lote 1", 100), l2 = await mk("E2E lote 2", 200.5);
  await falha(404, "POST", "/financeiro/titulos/baixa-lote", { ids: [l1.id, 99999999], contaId: conta.id, data: "2026-10-20" });
  assert.equal((await ok("GET", `/financeiro/titulos?status=todos&grupoId=${l1.grupoId}`)).itens[0].status, "aberto", "falha no lote não baixa nenhum");
  await ok("POST", "/financeiro/titulos/baixa-lote", { ids: [l1.id, l2.id], contaId: conta.id, data: "2026-10-20", forma: "ted" });
  for (const l of [l1, l2]) assert.equal((await ok("GET", `/financeiro/titulos?status=todos&grupoId=${l.grupoId}`)).itens[0].status, "quitado");

  passo("validações: rateio que não fecha, etapa de outra obra, vínculo de outro tenant");
  const base0 = { tipo: "pagar", natureza: "custo", descricao: "E2E inválido", valor: 100, data: "2026-10-01", pagamento: { modo: "prazo", vencimento: "2026-10-10" } };
  assert.match((await falha(400, "POST", "/financeiro/documentos", { ...base0, rateio: [{ obraId: A.id, valor: 90 }] })).error, /Falta ratear R\$ 10,00/);
  assert.match((await falha(400, "POST", "/financeiro/documentos", { ...base0, rateio: [{ valor: 100 }] })).error, /obra ou um centro/);
  await falha(404, "POST", "/financeiro/documentos", { ...base0, rateio: [{ obraId: 99999999, valor: 100 }] });
  await falha(400, "POST", "/financeiro/documentos", { ...base0, valor: 0, rateio: [{ obraId: A.id, valor: 0 }] });
  await falha(400, "POST", "/financeiro/documentos", { ...base0, rateio: [{ obraId: A.id, valor: 100 }], pagamento: { modo: "prazo" } });

  passo("resumo: vencidos e a vencer");
  await mk("E2E vencido", 70);
  resumo = await ok("GET", "/financeiro/resumo");
  assert.ok(resumo.pagar.aberto >= 70);
  assert.ok(Array.isArray(resumo.contas));

  passo("compra entregue gera a conta a pagar (uma vez só), sem mexer no estoque quando o item não é um insumo");
  const busca = oc => "/financeiro/titulos?status=todos&tipo=pagar&q=" + encodeURIComponent("Compra #" + oc.numero);
  const oc = await ok("POST", "/compras", { obraId: A.id, fornecedor: "E2E Depósito", data: "2026-10-01", status: "Aprovada", itens: [{ descricao: "E2E item", quantidade: 4, valorUnit: 250.5 }] });
  criados.ordens.push(oc.id);
  assert.ok(!(await ok("GET", "/financeiro/pendencias")).compras.some(c => c.id === oc.id), "ordem não entregue não é pendência");
  const ent = await ok("PATCH", `/compras/${oc.id}/status`, { status: "Entregue" });
  assert.equal(ent.tituloGerado, true);
  let tc = (await ok("GET", busca(oc))).itens;
  assert.equal(tc.length, 1); assert.equal(tc[0].valor, 1002); assert.equal(tc[0].origemTipo, "compra");
  assert.equal(tc[0].rateios[0].obraId, A.id); assert.equal(tc[0].categoria, "Materiais");
  assert.match(tc[0].origem, /^Compra #/);
  const hojeSP = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const emTrinta = new Date(`${hojeSP}T12:00:00Z`); emTrinta.setUTCDate(emTrinta.getUTCDate() + 30);
  assert.equal(tc[0].vencimento, emTrinta.toISOString().slice(0, 10), "vencimento = hoje + prazo padrão (30 dias)");
  assert.equal((await ok("PATCH", `/compras/${oc.id}/status`, { status: "Entregue" })).tituloGerado, false, "idempotente");
  assert.equal((await ok("GET", busca(oc))).itens.length, 1);

  passo("ordem alterada antes de pagar: o título acompanha; com pagamento, a ordem não pode ser excluída");
  await ok("PUT", `/compras/${oc.id}`, { status: "Entregue", itens: [{ descricao: "E2E item", quantidade: 4, valorUnit: 300 }] });
  tc = (await ok("GET", busca(oc))).itens;
  assert.equal(tc[0].valor, 1200); assert.equal(soma(tc[0].rateios.map(r => r.valor)), 1200);
  await ok("POST", `/financeiro/titulos/${tc[0].id}/baixas`, { contaId: conta.id, data: "2026-10-06", valor: 1200 });
  assert.match((await falha(409, "DELETE", `/compras/${oc.id}`)).error, /pagamentos lançados/);
  await ok("POST", `/financeiro/baixas/${(await ok("GET", busca(oc))).itens[0].baixas[0].id}/estornar`);
  await ok("DELETE", `/compras/${oc.id}`);
  assert.equal((await ok("GET", busca(oc))).itens.length, 0, "excluir a ordem remove o título");
  criados.ordens = [];

  passo("compra com NF-e: as duplicatas viram as parcelas, com o número da nota");
  const oc2 = await ok("POST", "/compras", { obraId: B.id, fornecedor: "E2E Depósito NF", data: "2026-10-01", status: "Aprovada", itens: [{ descricao: "E2E item NF", quantidade: 1, valorUnit: 900 }] });
  criados.ordens.push(oc2.id);
  await ok("PATCH", `/compras/${oc2.id}/status`, { status: "Entregue", nf: { nfe: "4321", data: "2026-10-02", total: 1000, duplicatas: [{ numero: "1", vencimento: "2026-11-10", valor: 500 }, { numero: "2", vencimento: "2026-12-10", valor: 500 }] } });
  const tn = (await ok("GET", busca(oc2))).itens;
  assert.deepEqual(tn.map(t => [t.parcela, t.vencimento, t.valor, t.documento]), [[1, "2026-11-10", 500, "1"], [2, "2026-12-10", 500, "2"]]);
  assert.equal(soma(tn.map(t => soma(t.rateios.map(r => r.valor)))), 1000);
  await ok("PATCH", `/compras/${oc2.id}/status`, { status: "Cancelada" });
  assert.equal((await ok("GET", busca(oc2).replace("status=todos", "status=cancelado"))).itens.length, 2, "ordem cancelada cancela os títulos sem pagamento");
  await ok("DELETE", `/compras/${oc2.id}`);
  criados.ordens = [];

  passo("compra entregue sem título vira pendência e pode ser lançada como já paga");
  const oc3 = await ok("POST", "/compras", { obraId: A.id, fornecedor: "E2E Antiga", data: "2026-09-01", status: "Entregue", itens: [{ descricao: "E2E item antigo", quantidade: 2, valorUnit: 50 }] });
  criados.ordens.push(oc3.id);
  assert.ok((await ok("GET", "/financeiro/pendencias")).compras.some(c => c.id === oc3.id && c.valor === 100), "criada já entregue pela API de criação: sem título, aparece nas pendências");
  await ok("POST", "/financeiro/gerar/compra", { ordemId: oc3.id, pago: { contaId: conta.id, data: "2026-09-05", forma: "pix" } });
  const t3 = (await ok("GET", busca(oc3))).itens[0];
  assert.equal(t3.status, "quitado");
  await falha(409, "POST", "/financeiro/gerar/compra", { ordemId: oc3.id });
  await ok("POST", `/financeiro/baixas/${t3.baixas[0].id}/estornar`);
  await ok("DELETE", `/compras/${oc3.id}`);
  criados.ordens = [];

  passo("diárias: um título por colaborador, rateado entre as obras, sem pagar duas vezes");
  const F = (await ok("GET", "/cadastros/funcionarios"))[0];
  const ap = await Promise.all([[A.id, "2026-08-03", 1], [A.id, "2026-08-04", 1], [B.id, "2026-08-05", 0.5]].map(([obraId, data, dias]) =>
    prisma.apontamentoMO.create({ data: { tenantId, obraId, funcionarioId: F.id, data, dias, valorDia: 200 } })));
  criados.apontamentos.push(...ap.map(a => a.id));
  const pend = (await ok("GET", "/financeiro/pendencias")).diarias.find(d => d.funcionarioId === F.id);
  assert.ok(pend && pend.valor >= 500);
  assert.equal((await ok("POST", "/financeiro/gerar/diarias", { funcionarioIds: [F.id], de: "2026-08-03", ate: "2026-08-05", vencimento: "2026-08-10" })).gerados, 1);
  const td = (await ok("GET", "/financeiro/titulos?status=todos&tipo=pagar&q=" + encodeURIComponent("Diárias de " + F.nome))).itens.find(t => t.descricao.includes("03/08/2026"));
  assert.equal(td.valor, 500); assert.equal(td.origemTipo, "mao_de_obra"); assert.equal(td.pessoaId, F.id);
  assert.deepEqual(td.rateios.map(r => [r.obraId, r.valor]).sort(), [[A.id, 400], [B.id, 100]].sort());
  criados.tituloIds.push(td.id);
  await falha(409, "POST", "/financeiro/gerar/diarias", { funcionarioIds: [F.id], de: "2026-08-03", ate: "2026-08-05" });
  assert.ok((await prisma.apontamentoMO.findMany({ where: { id: { in: criados.apontamentos } } })).every(a => a.tituloId === td.id));
  assert.equal(await custoObra(A.id), antes.A, "pagar diárias não mexe no custo da obra");
  await ok("POST", `/financeiro/titulos/${td.id}/cancelar`);
  assert.ok((await prisma.apontamentoMO.findMany({ where: { id: { in: criados.apontamentos } } })).every(a => a.tituloId === null), "cancelar libera as diárias");
  await prisma.titulo.deleteMany({ where: { id: td.id } });

  passo("locação: máquina alugada vira conta a pagar ao locador, rateada por obra");
  const maq = await prisma.maquina.create({ data: { tenantId, nome: "E2E Retro", tipoPropriedade: "alugada", tipoCobranca: "hora", valorLocacao: 100, custoHora: 100, locadorId: F.id } });
  criados.maquinaId = maq.id;
  const als = await Promise.all([[A.id, 5], [B.id, 2.5]].map(([obraId, quantidade]) => prisma.alocacao.create({ data: { tenantId, obraId, tipo: "maquina", maquinaId: maq.id, quantidade, data: "2026-08-10", custoUnitario: 100 } })));
  criados.alocacoes.push(...als.map(a => a.id));
  const lp = (await ok("GET", "/financeiro/pendencias")).locacoes.find(l => l.locadorId === F.id && l.maquinas.includes("E2E Retro"));
  assert.ok(lp && lp.valor >= 750);
  await ok("POST", "/financeiro/gerar/locacoes", { chaves: [lp.chave], de: "2026-08-10", ate: "2026-08-10", vencimento: "2026-08-20" });
  const tl = (await ok("GET", "/financeiro/titulos?status=todos&tipo=pagar&q=" + encodeURIComponent("E2E Retro"))).itens[0];
  assert.equal(tl.valor, 750); assert.equal(tl.origemTipo, "locacao");
  assert.deepEqual(tl.rateios.map(r => [r.obraId, r.valor]).sort(), [[A.id, 500], [B.id, 250]].sort());
  criados.tituloIds.push(tl.id);
  await ok("POST", `/financeiro/titulos/${tl.id}/cancelar`);
  await prisma.titulo.deleteMany({ where: { id: tl.id } });

  passo("não é possível excluir uma obra com contas a pagar ligadas");
  const dObra = await ok("POST", "/financeiro/documentos", { tipo: "pagar", natureza: "custo", descricao: "E2E trava obra", valor: 10, data: "2026-10-01", rateio: [{ obraId: B.id, valor: 10 }], pagamento: { modo: "prazo", vencimento: "2026-10-30" } });
  criados.grupos.push(dObra.grupoId);
  assert.match((await falha(409, "DELETE", `/obras/${B.id}`)).error, /Financeiro/);
  await ok("DELETE", `/financeiro/documentos/${dObra.grupoId}`);
  criados.grupos = criados.grupos.filter(g => g !== dObra.grupoId);

  passo("conciliação: importar OFX, sugerir, conciliar os exatos e tratar o resto");
  const cc = await ok("POST", "/financeiro/contas", { nome: "E2E Conta Conciliação", saldoInicial: 1000, dataSaldoInicial: "2026-01-01" });
  criados.contasExtras.push(cc.id);
  const contaB = await ok("POST", "/financeiro/contas", { nome: "E2E Conta B", saldoInicial: 0, dataSaldoInicial: "2026-01-01" });
  criados.contasExtras.push(contaB.id);
  const novoDoc = async (corpo) => { const x = await ok("POST", "/financeiro/documentos", corpo); criados.grupos.push(x.grupoId); return (await ok("GET", `/financeiro/titulos?status=todos&grupoId=${x.grupoId}`)).itens[0]; };
  const tPag = await novoDoc({ tipo: "pagar", natureza: "custo", descricao: "E2E Fornecedor Cimento", valor: 4650, data: "2026-10-01", rateio: [{ obraId: A.id, valor: 4650 }], pagamento: { modo: "prazo", vencimento: "2026-10-05" } });
  await ok("POST", `/financeiro/titulos/${tPag.id}/baixas`, { contaId: cc.id, data: "2026-10-05", valor: 4650 });
  const tRec = await novoDoc({ tipo: "receber", natureza: "custo", descricao: "E2E Cliente Medição", valor: 12500.5, data: "2026-10-01", rateio: [{ obraId: A.id, valor: 12500.5 }], pagamento: { modo: "prazo", vencimento: "2026-10-07" } });
  await ok("POST", `/financeiro/titulos/${tRec.id}/baixas`, { contaId: cc.id, data: "2026-10-07", valor: 12500.5 });

  const ofx = `OFXHEADER:100\nDATA:OFXSGML\nCHARSET:1252\n\n<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST><DTSTART>20261001<DTEND>20261031\n` +
    `<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261005<TRNAMT>-4650.00<FITID>e2e-f1<MEMO>PIX ENVIADO E2E FORNECEDOR CIMENTO</STMTTRN>\n` +
    `<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20261008<TRNAMT>12500.50<FITID>e2e-f2<MEMO>TED RECEBIDA E2E CLIENTE MEDICAO</STMTTRN>\n` +
    `<STMTTRN><TRNTYPE>FEE<DTPOSTED>20261010<TRNAMT>-14.90<FITID>e2e-f3<MEMO>TARIFA MANUTENCAO</STMTTRN>\n` +
    `<STMTTRN><TRNTYPE>XFER<DTPOSTED>20261012<TRNAMT>-1000.00<FITID>e2e-f4<MEMO>TRANSF ENVIADA E2E</STMTTRN>\n` +
    `<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261015<TRNAMT>-77.00<FITID>e2e-f5<MEMO>DEBITO DESCONHECIDO</STMTTRN>\n` +
    `</BANKTRANLIST><LEDGERBAL><BALAMT>7758.60<DTASOF>20261031</LEDGERBAL></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;
  const previa = await ok("POST", `/financeiro/contas/${cc.id}/extrato/previa`, { formato: "ofx", conteudo: ofx });
  assert.equal(previa.resumo.total, 5); assert.equal(previa.resumo.novas, 5); assert.equal(previa.saldoFinal, 7758.6);
  assert.equal(previa.resumo.entradas, 12500.5); assert.equal(previa.resumo.saidas, -5741.9);
  const imp = await ok("POST", `/financeiro/contas/${cc.id}/extrato`, { formato: "ofx", conteudo: ofx, arquivo: "e2e.ofx" });
  assert.equal(imp.novos, 5); assert.equal(imp.duplicados, 0);
  const reimp = await ok("POST", `/financeiro/contas/${cc.id}/extrato`, { formato: "ofx", conteudo: ofx, arquivo: "e2e.ofx" });
  assert.equal(reimp.novos, 0, "importar o mesmo arquivo de novo não duplica"); assert.equal(reimp.duplicados, 5);
  await falha(400, "POST", `/financeiro/contas/${cc.id}/extrato/previa`, { formato: "ofx", conteudo: "isto não é OFX" });
  assert.equal((await ok("POST", `/financeiro/contas/${cc.id}/extrato/previa`, { formato: "csv", conteudo: "A;B;C\n05/10/2026;x;10,00\n" })).precisaMapear, true);
  await falha(404, "POST", `/financeiro/contas/99999999/extrato/previa`, { formato: "ofx", conteudo: ofx });

  let conc = await ok("GET", `/financeiro/contas/${cc.id}/conciliacao`);
  assert.equal(conc.lancamentos.length, 5);
  assert.equal(conc.sugestoes.length, 2, "as duas baixas casam com as linhas de 4.650 e 12.500,50");
  assert.ok(conc.sugestoes.every(s => s.confianca === "alta"));
  assert.equal(conc.fechamento.saldoExtrato, 7758.6);
  assert.equal((await ok("POST", `/financeiro/contas/${cc.id}/conciliar-exatos`)).conciliados, 2);
  conc = await ok("GET", `/financeiro/contas/${cc.id}/conciliacao`);
  assert.equal(conc.contagens.pendentes, 3);
  assert.equal(conc.lancamentos.length, 3); assert.equal(conc.baixasLivres.filter(b => [tPag.id, tRec.id].includes(b.tituloId)).length, 0);
  const conciliado = (await ok("GET", `/financeiro/contas/${cc.id}/conciliacao?status=conciliado`)).lancamentos;
  assert.equal(conciliado.length, 2); assert.ok(conciliado.every(l => l.baixas.length === 1));

  // tarifa: só existe no banco → lança e concilia
  const tarifa = conc.lancamentos.find(l => l.descricao.includes("TARIFA"));
  await falha(400, "POST", `/financeiro/lancamentos/${tarifa.id}/lancar`, { natureza: "custo", descricao: "Tarifa", rateio: [] });
  await ok("POST", `/financeiro/lancamentos/${tarifa.id}/lancar`, { natureza: "custo", descricao: "E2E Tarifa bancária", categoria: "Tributos e Taxas", rateio: [{ centroCustoId: adm.id, valor: 14.9 }] });
  const tt = (await ok("GET", "/financeiro/titulos?status=todos&tipo=pagar&q=" + encodeURIComponent("E2E Tarifa"))).itens[0];
  criados.grupos.push(tt.grupoId);
  assert.equal(tt.status, "quitado"); assert.equal(tt.baixas[0].data, "2026-10-10"); assert.equal(tt.baixas[0].contaId, cc.id); assert.ok(tt.baixas[0].lancamentoId);
  assert.ok((await ok("GET", "/despesas")).some(d => d.grupoId === tt.grupoId && d.centroCustoId === adm.id && d.obraId === null && d.valor === 14.9));
  await falha(409, "POST", `/financeiro/lancamentos/${tarifa.id}/ignorar`);

  // transferência entre contas
  const transf = conc.lancamentos.find(l => l.descricao.includes("TRANSF"));
  await falha(400, "POST", `/financeiro/lancamentos/${transf.id}/transferir`, { contaId: cc.id });
  await ok("POST", `/financeiro/lancamentos/${transf.id}/transferir`, { contaId: contaB.id });
  let resumoC = await ok("GET", "/financeiro/resumo");
  assert.equal(resumoC.contas.find(c => c.id === contaB.id).saldo, 1000, "a conta de destino recebeu a transferência");
  const transfs = await ok("GET", "/financeiro/transferencias");
  const tr = transfs.find(t => t.deContaId === cc.id && t.paraContaId === contaB.id && t.valor === 1000);
  assert.ok(tr && tr.conciliadaDe && !tr.conciliadaPara);
  await falha(409, "DELETE", `/financeiro/transferencias/${tr.id}`);

  // linha desconhecida: ignorar, desfazer e quitar um título por ela
  const desc = conc.lancamentos.find(l => l.descricao.includes("DESCONHECIDO"));
  await ok("POST", `/financeiro/lancamentos/${desc.id}/ignorar`);
  assert.equal((await ok("GET", `/financeiro/contas/${cc.id}/conciliacao?status=ignorado`)).lancamentos.length, 1);
  await ok("POST", `/financeiro/lancamentos/${desc.id}/desfazer`);
  const t5 = await novoDoc({ tipo: "pagar", natureza: "outro", descricao: "E2E conta de 77", valor: 77, data: "2026-10-01", pagamento: { modo: "prazo", vencimento: "2026-10-15" } });
  await falha(400, "POST", `/financeiro/lancamentos/${desc.id}/baixar`, { tituloId: tRec.id });
  await ok("POST", `/financeiro/lancamentos/${desc.id}/baixar`, { tituloId: t5.id });
  const q5 = (await ok("GET", `/financeiro/titulos?status=todos&grupoId=${t5.grupoId}`)).itens[0];
  assert.equal(q5.status, "quitado"); assert.equal(q5.baixas[0].data, "2026-10-15");

  conc = await ok("GET", `/financeiro/contas/${cc.id}/conciliacao`);
  assert.equal(conc.contagens.pendentes, 0); assert.equal(conc.contagens.baixasLivres, 0);
  assert.equal(conc.fechamento.saldoSistema, 7758.6, "1000 - 4650 + 12500,50 - 14,90 - 1000 (transferência) - 77");
  assert.equal(conc.fechamento.diferenca, 0);

  // desfazer devolve a linha e solta a baixa para ser conciliada de novo
  const primeira = (await ok("GET", `/financeiro/contas/${cc.id}/conciliacao?status=conciliado`)).lancamentos.find(l => l.descricao.includes("CIMENTO"));
  await ok("POST", `/financeiro/lancamentos/${primeira.id}/desfazer`);
  conc = await ok("GET", `/financeiro/contas/${cc.id}/conciliacao`);
  assert.equal(conc.contagens.pendentes, 1); assert.equal(conc.contagens.baixasLivres, 1); assert.equal(conc.sugestoes.length, 1);
  await ok("POST", `/financeiro/lancamentos/${primeira.id}/conciliar`, { baixaIds: [conc.baixasLivres[0].id] });
  await falha(400, "POST", `/financeiro/lancamentos/${primeira.id}/conciliar`, { baixaIds: [conc.baixasLivres[0].id] }).catch(() => {});

  // estornar uma baixa conciliada solta a linha do extrato
  const baixaT1 = (await ok("GET", `/financeiro/titulos?status=todos&grupoId=${tPag.grupoId}`)).itens[0].baixas[0];
  await ok("POST", `/financeiro/baixas/${baixaT1.id}/estornar`);
  assert.equal((await ok("GET", `/financeiro/contas/${cc.id}/conciliacao`)).contagens.pendentes, 1, "estornar a baixa devolve a linha do extrato para pendente");

  passo("fluxo de caixa: realizado, previsto e atrasado, filtrado por centro de custo");
  const cf = await ok("POST", "/financeiro/contas", { nome: "E2E Conta Fluxo", saldoInicial: 5000, dataSaldoInicial: "2026-01-01" });
  criados.contasExtras.push(cf.id);
  const centro = await ok("POST", "/financeiro/centros", { nome: `E2E Centro ${Date.now()}` });
  criados.centros.push(centro.id);
  const hojeSP2 = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const mais = n => { const d = new Date(`${hojeSP2}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const doc = async (tipo, descricao, valor, venc) => { const x = await ok("POST", "/financeiro/documentos", { tipo, natureza: "outro", descricao, pessoaTexto: "E2E Aging", valor, data: hojeSP2, pagamento: { modo: "prazo", vencimento: venc } }); criados.grupos.push(x.grupoId); return (await ok("GET", `/financeiro/titulos?status=todos&grupoId=${x.grupoId}`)).itens[0]; };
  const atrasada = await doc("pagar", "E2E fluxo atrasada", 300, mais(-40));
  const futura = await doc("pagar", "E2E fluxo futura", 1000, mais(10));
  const entrada = await doc("receber", "E2E fluxo entrada", 2500, mais(20));
  // título avulso não tem rateio: o filtro por centro o ignora; ligamos um rateio ao centro por documento custo
  for (const [t, v] of [[atrasada, 300], [futura, 1000], [entrada, 2500]]) await ok("PUT", `/financeiro/documentos/${t.grupoId}`, { rateio: [{ centroCustoId: centro.id, valor: v }] });
  await ok("POST", `/financeiro/titulos/${atrasada.id}/baixas`, { contaId: cf.id, data: hojeSP2, valor: 100 });
  const fl = await ok("GET", `/financeiro/fluxo?de=${mais(-7)}&ate=${mais(45)}&agrupar=semana&centroCustoId=${centro.id}&contaId=${cf.id}`);
  assert.equal(fl.saldoInicial, 5000);
  assert.equal(fl.atrasado.saidas, 200, "300 vencidos há 40 dias, 100 já pagos → 200 em atraso");
  assert.equal(fl.totais.saidasReais, 100); assert.equal(fl.totais.saidasPrev, 1000); assert.equal(fl.totais.entradasPrev, 2500);
  assert.equal(fl.saldoFinal, 5000 - 200 - 100 - 1000 + 2500);
  assert.ok(fl.periodos.length >= 7 && fl.periodos.every(p => p.chave <= fl.ate));
  const flMes = await ok("GET", `/financeiro/fluxo?de=${mais(-7)}&ate=${mais(45)}&agrupar=mes&centroCustoId=${centro.id}`);
  assert.equal(flMes.totais.saidasPrev, 1000);
  await falha(400, "GET", `/financeiro/fluxo?de=2026-10-10&ate=2026-10-01`);
  await falha(400, "GET", `/financeiro/fluxo?de=2020-01-01&ate=2026-10-01&agrupar=dia`);
  const ag = await ok("GET", "/financeiro/relatorios/envelhecimento?tipo=pagar");
  const lin = ag.linhas.find(l => l.nome === "E2E Aging");
  assert.ok(lin, "pessoa no envelhecimento"); assert.equal(lin.f31_60, 200, "40 dias de atraso → faixa 31 a 60"); assert.equal(lin.aVencer, 1000);
  const mv = await ok("GET", `/financeiro/contas/${cf.id}/movimentos?de=${mais(-30)}&ate=${mais(1)}`);
  assert.equal(mv.saldoAnterior, 5000); assert.equal(mv.movimentos.length, 1); assert.equal(mv.movimentos[0].valor, -100); assert.equal(mv.saldoFinal, 4900);
  await falha(404, "GET", "/financeiro/contas/99999999/movimentos");

  passo("permissão: sem 'financeiro' bloqueia a API, mas o custo continua legível");
  const usuario = await prisma.user.create({ data: { tenantId, nome: "E2E Usuário", email: `e2e-${Date.now()}@teste.com`, senha: "x", role: "user", permissoes: ["obras"] } });
  criados.userId = usuario.id;
  const tk = jwt.sign({ userId: usuario.id, tenantId, role: "user" }, process.env.JWT_SECRET, { expiresIn: "5m" });
  assert.equal((await chamar("GET", "/financeiro/base", null, tk)).status, 403);
  assert.equal((await chamar("GET", "/despesas", null, tk)).status, 200);
  assert.equal((await chamar("GET", "/receitas", null, tk)).status, 200);
  assert.equal((await chamar("POST", "/despesas", { categoria: "Outros", descricao: "x", valor: 1, data: "2026-10-01" }, tk)).status, 403);
  assert.equal((await chamar("DELETE", "/receitas/1", null, tk)).status, 403);
  await prisma.user.update({ where: { id: usuario.id }, data: { permissoes: ["obras", "financeiro"] } });
  assert.equal((await chamar("GET", "/financeiro/base", null, tk)).status, 200, "permissão vale sem novo login");

  await limpar(); // remove tudo o que o teste criou, e só então confere que nada sobrou
  passo("nada vazou: custos e quantidade de despesas voltaram ao que eram");
  assert.equal(await custoObra(A.id), antes.A); assert.equal(await custoObra(B.id), antes.B);
}

try {
  console.log(`Financeiro e2e em ${API}`);
  await principal();
  console.log(`\n${passos} verificações passaram.`);
} catch (e) {
  console.error("\nFALHOU:", e.message);
  console.error((e.stack || "").split("\n").find(l => l.includes("e2e.mjs")) || "");
  process.exitCode = 1;
} finally {
  await limpar();
  await prisma.$disconnect();
}
