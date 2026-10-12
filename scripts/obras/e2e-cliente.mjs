// Ponta a ponta do cliente da obra: toda obra tem um cliente (pessoa do cadastro com o perfil Cliente).
// API real e banco real; cria duas empresas de teste e apaga tudo no fim.   node --env-file=.env scripts/obras/e2e-cliente.mjs
import bcrypt from "bcryptjs";
import prisma from "../../server/db.js";
import { cliente, iniciarApi, marca, ok, totalFalhas } from "../painel/lib.mjs";

const SENHA = "Senha-Teste-2026";
const empresasCriadas = [];

async function criarEmpresa(nome) {
  const t = await prisma.tenant.create({ data: { razaoSocial: `Teste Cliente Obra ${nome} ${marca}`, cnpj: `TESTE-CO-${marca}-${nome}`, email: `${marca}-${nome}@exemplo.test`, plano: "pro" } });
  empresasCriadas.push(t.id);
  const adm = await prisma.user.create({ data: { tenantId: t.id, nome: `Admin ${nome}`, email: `${marca}-${nome}-adm@exemplo.test`, senha: await bcrypt.hash(SENHA, 10), role: "tenant_admin" } });
  return { tenant: t, adm };
}

const api = await iniciarApi(3018);
try {
  const anon = cliente(api.base);
  const entrar = async u => cliente(api.base, (await anon.post("/api/auth/login", { email: u.email, senha: SENHA })).corpo.token);
  const A = await criarEmpresa("a"), B = await criarEmpresa("b");
  const ca = await entrar(A.adm), cb = await entrar(B.adm);
  const obraBase = { nome: "Residência Teste", local: "Rua 1", inicio: "2026-10-05", previsaoFim: "2027-04-30", orcamento: 100000 };

  // Pessoas da empresa A: dois clientes e um fornecedor; um cliente na empresa B
  const novaPessoa = (http, dados) => http.post("/api/cadastros/funcionarios", dados);
  const cli1 = (await novaPessoa(ca, { nome: "Cliente Um", cpfCnpj: "123", isCliente: true })).corpo;
  const cli2 = (await novaPessoa(ca, { nome: "Cliente Dois", isCliente: true })).corpo;
  const forn = (await novaPessoa(ca, { nome: "Só Fornecedor", isFornecedor: true })).corpo;
  const cliB = (await novaPessoa(cb, { nome: "Cliente da Outra Empresa", isCliente: true })).corpo;
  ok(cli1.isCliente === true && !!cli1.id, "cadastro rápido: a pessoa nasce com o perfil Cliente");

  // ── Criar ────────────────────────────────────────────────────────────────
  const semCampo = await ca.post("/api/obras", obraBase);
  ok(semCampo.status === 400 && /cliente/i.test(semCampo.corpo.error), `criar sem cliente é recusado (400): ${semCampo.corpo.error}`);
  for (const [rotulo, valor] of [["vazio", ""], ["nulo", null], ["texto", "abc"], ["zero", 0], ["negativo", -3]]) {
    const r = await ca.post("/api/obras", { ...obraBase, clienteId: valor });
    ok(r.status === 400, `criar com cliente ${rotulo} é recusado (400)`);
  }
  ok((await ca.post("/api/obras", { ...obraBase, clienteId: 99999999 })).status === 404, "criar com cliente que não existe: 404");
  const deOutra = await ca.post("/api/obras", { ...obraBase, clienteId: cliB.id });
  ok(deOutra.status === 404 && deOutra.corpo.error === "Cliente não encontrado.", "criar com cliente de OUTRA empresa: 404, igual a inexistente (não revela nada)");
  const soForn = await ca.post("/api/obras", { ...obraBase, clienteId: forn.id });
  ok(soForn.status === 400 && /perfil Cliente/.test(soForn.corpo.error), "criar com pessoa sem o perfil Cliente: 400 explicando");
  ok((await prisma.obra.count({ where: { tenantId: A.tenant.id } })) === 0, "nenhuma tentativa recusada criou obra");

  const criada = await ca.post("/api/obras", { ...obraBase, clienteId: cli1.id });
  ok(criada.status === 201 && criada.corpo.clienteId === cli1.id && criada.corpo.cliente?.nome === "Cliente Um", "criar com cliente válido: 201, com o nome do cliente");
  // Obra criada a partir de um tipo de obra: cria as etapas encadeadas (regressão: o servidor pedia `subetapas` ao modelo, que não as tem, e dava erro)
  const te1 = await prisma.tipoEtapa.create({ data: { tenantId: A.tenant.id, nome: "Fundação", tempoPadrao: 10 } });
  const te2 = await prisma.tipoEtapa.create({ data: { tenantId: A.tenant.id, nome: "Estrutura" } });
  const tipo = await prisma.tipoObra.create({ data: { tenantId: A.tenant.id, nome: "Residencial", etapas: { create: [{ tipoEtapaId: te1.id, ordem: 1 }, { tipoEtapaId: te2.id, ordem: 2 }] } } });
  const comTipo = await ca.post("/api/obras", { ...obraBase, nome: "Com tipo", clienteId: cli1.id, tipoObraId: tipo.id });
  ok(comTipo.status === 201 && comTipo.corpo.etapas?.length === 2, `criar obra com tipo de obra: 201 e as etapas do modelo (${comTipo.corpo.error ?? comTipo.corpo.etapas?.length + " etapas"})`);
  ok(comTipo.corpo.etapas?.[0]?.dataFimP === "2026-10-14" && comTipo.corpo.etapas?.[1]?.dataInicioP === "2026-10-15", "as etapas saem encadeadas no tempo");
  const semTipoNaCriacao = await ca.post("/api/obras", { ...obraBase, nome: "Sem tipo", clienteId: cli1.id, tipoObraId: "" });
  ok(semTipoNaCriacao.status === 201 && semTipoNaCriacao.corpo.etapas.length === 0, "criar obra com 'sem tipo' (texto vazio): 201, sem etapas");
  await ca.del(`/api/obras/${comTipo.corpo.id}`); await ca.del(`/api/obras/${semTipoNaCriacao.corpo.id}`);
  const comTexto = await ca.post("/api/obras", { ...obraBase, nome: "Outra", clienteId: String(cli2.id) });
  ok(comTexto.status === 201 && comTexto.corpo.clienteId === cli2.id, "o id do cliente pode vir como texto numérico");
  ok(!JSON.stringify(criada.corpo.cliente).includes("cpfCnpj"), "a obra só leva id e nome do cliente (nada de CPF/CNPJ na lista)");

  // ── Listar ───────────────────────────────────────────────────────────────
  const lista = (await ca.get("/api/obras")).corpo;
  ok(lista.length === 2 && lista.every(o => o.cliente?.nome), "a lista de obras traz o cliente de cada uma");
  ok((await cb.get("/api/obras")).corpo.length === 0, "a outra empresa não vê estas obras");

  // ── Editar ───────────────────────────────────────────────────────────────
  const id = criada.corpo.id;
  const semAlterar = await ca.put(`/api/obras/${id}`, { ...obraBase, status: "Em andamento" });
  ok(semAlterar.status === 200 && semAlterar.corpo.clienteId === cli1.id, "editar sem mandar o cliente mantém o que a obra já tem");
  for (const [rotulo, valor] of [["vazio", ""], ["nulo", null]]) {
    const r = await ca.put(`/api/obras/${id}`, { ...obraBase, clienteId: valor });
    ok(r.status === 400, `editar tirando o cliente (${rotulo}) é recusado (400)`);
  }
  ok((await prisma.obra.findUnique({ where: { id } })).clienteId === cli1.id, "o cliente continua o mesmo depois das tentativas recusadas");
  ok((await ca.put(`/api/obras/${id}`, { ...obraBase, clienteId: cliB.id })).status === 404, "editar para cliente de outra empresa: 404");
  ok((await ca.put(`/api/obras/${id}`, { ...obraBase, clienteId: forn.id })).status === 400, "editar para quem não é cliente: 400");
  const semTipo = await ca.put(`/api/obras/${id}`, { ...obraBase, clienteId: cli1.id, tipoObraId: "" });
  ok(semTipo.status === 200 && semTipo.corpo.tipoObraId === null, "editar com 'sem tipo' (texto vazio, como a tela manda) funciona e não vira erro 500");
  const trocou = await ca.put(`/api/obras/${id}`, { ...obraBase, clienteId: cli2.id });
  ok(trocou.status === 200 && trocou.corpo.cliente?.nome === "Cliente Dois", "trocar o cliente da obra funciona");

  // ── Obra antiga, sem cliente ─────────────────────────────────────────────
  const antiga = await prisma.obra.create({ data: { tenantId: A.tenant.id, ...obraBase, nome: "Obra antiga", orcamento: 1 } });
  const lista2 = (await ca.get("/api/obras")).corpo;
  ok(lista2.find(o => o.id === antiga.id)?.cliente === null, "obra antiga aparece com cliente nulo");
  const salvarSem = await ca.put(`/api/obras/${antiga.id}`, { ...obraBase, nome: "Obra antiga" });
  ok(salvarSem.status === 400 && /ainda não tem cliente/.test(salvarSem.corpo.error), "obra antiga sem cliente não salva até ganhar um (400)");
  const ganhou = await ca.put(`/api/obras/${antiga.id}`, { ...obraBase, nome: "Obra antiga", clienteId: cli1.id });
  ok(ganhou.status === 200 && ganhou.corpo.cliente?.id === cli1.id, "obra antiga ganha o cliente ao salvar com ele");

  // ── Proteger quem é cliente de obra ──────────────────────────────────────
  const apagar = await ca.del(`/api/cadastros/funcionarios/${cli2.id}`);
  ok(apagar.status === 409 && /Residência Teste|Outra/.test(apagar.corpo.error), `apagar quem é cliente de obra é recusado (409) citando a obra: ${apagar.corpo.error}`);
  const tirarPerfil = await ca.put(`/api/cadastros/funcionarios/${cli2.id}`, { nome: "Cliente Dois", isCliente: false, isFornecedor: true });
  ok(tirarPerfil.status === 409, "tirar o perfil Cliente de quem é cliente de obra é recusado (409)");
  const manter = await ca.put(`/api/cadastros/funcionarios/${cli2.id}`, { nome: "Cliente Dois (editado)", isCliente: true, telefone: "62999990000" });
  ok(manter.status === 200 && manter.corpo.isCliente === true, "editar os dados de um cliente de obra continua permitido");
  ok((await ca.get("/api/obras")).corpo.find(o => o.id === id)?.cliente?.nome === "Cliente Dois (editado)", "o nome novo do cliente aparece na obra");
  const livre = (await novaPessoa(ca, { nome: "Cliente sem obra", isCliente: true })).corpo;
  ok((await ca.del(`/api/cadastros/funcionarios/${livre.id}`)).status === 200, "apagar um cliente que não tem obra continua funcionando");
  const fornApagado = await ca.del(`/api/cadastros/funcionarios/${forn.id}`);
  ok(fornApagado.status === 200, "apagar quem não é cliente de obra continua funcionando");

  // Liberar a pessoa só depois de a obra sair
  ok((await ca.del(`/api/obras/${id}`)).status === 200, "excluir a obra");
  const depois = await ca.del(`/api/cadastros/funcionarios/${cli2.id}`);
  ok(depois.status === 409, "ainda é cliente da outra obra: continua protegido");

  // ── Excluir a empresa inteira (cascata de obras e pessoas) ───────────────
  let apagouTudo = true;
  try { await prisma.tenant.deleteMany({ where: { id: { in: empresasCriadas } } }); } catch (e) { apagouTudo = false; console.error(e.message); }
  ok(apagouTudo, "excluir a empresa inteira (com obras e clientes) funciona: a regra não trava a cascata");
  empresasCriadas.length = 0;
} finally {
  await api.parar();
  if (empresasCriadas.length) await prisma.tenant.deleteMany({ where: { id: { in: empresasCriadas } } }).catch(() => {});
  await prisma.$disconnect();
}
console.log(totalFalhas() ? `\n${totalFalhas()} FALHA(S)` : "\nTudo certo.");
process.exit(totalFalhas() ? 1 : 0);
