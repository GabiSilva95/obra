// Anexos do diário de obra: separados dos anexos da obra, isolados por empresa, contados no registro.
// API real e banco real; apaga o que cria.   node --env-file=.env scripts/obras/e2e-diario-anexos.mjs
import bcrypt from "bcryptjs";
import prisma from "../../server/db.js";
import { cliente, iniciarApi, marca, ok, totalFalhas } from "../painel/lib.mjs";

const SENHA = "Senha-Teste-2026";
const empresas = [];
async function criarEmpresa(nome) {
  const t = await prisma.tenant.create({ data: { razaoSocial: `Teste Diario Anexos ${nome} ${marca}`, cnpj: `TESTE-DA-${marca}-${nome}`, email: `${marca}-${nome}@exemplo.test`, plano: "pro" } });
  empresas.push(t.id);
  const adm = await prisma.user.create({ data: { tenantId: t.id, nome: `Admin ${nome}`, email: `${marca}-${nome}@exemplo.test`, senha: await bcrypt.hash(SENHA, 10), role: "tenant_admin" } });
  const pessoa = await prisma.funcionario.create({ data: { tenantId: t.id, nome: "Cliente", isCliente: true } });
  const obra = await prisma.obra.create({ data: { tenantId: t.id, nome: "Obra", local: "x", inicio: "2026-10-01", previsaoFim: "2027-01-01", clienteId: pessoa.id } });
  return { t, adm, obra };
}
const api = await iniciarApi(3019);
try {
  const anon = cliente(api.base);
  const A = await criarEmpresa("a"), B = await criarEmpresa("b");
  const ca = cliente(api.base, (await anon.post("/api/auth/login", { email: A.adm.email, senha: SENHA })).corpo.token);
  const cb = cliente(api.base, (await anon.post("/api/auth/login", { email: B.adm.email, senha: SENHA })).corpo.token);
  const pdf = Buffer.from("%PDF-1.4 teste").toString("base64");

  const reg = (await ca.post("/api/diario", { obraId: A.obra.id, data: "2026-10-12", descricao: "Concretagem" })).corpo;
  const reg2 = (await ca.post("/api/diario", { obraId: A.obra.id, data: "2026-10-13", descricao: "Acabamento" })).corpo;
  ok(!!reg.id, "registro do diário criado");
  const up = await ca.post(`/api/diario/${reg.id}/anexos`, { nome: "foto.png", mimeType: "image/png", dados: pdf });
  ok(up.status === 201 && up.corpo.nome === "foto.png", "anexar arquivo a um registro do diário: 201");
  ok((await prisma.anexo.findUnique({ where: { id: up.corpo.id } })).diarioId === reg.id, "o anexo fica ligado ao registro");
  ok((await ca.post(`/api/diario/${reg.id}/anexos`, { nome: "virus.exe", dados: pdf })).status === 400, "tipo de arquivo não aceito: 400");
  ok((await ca.post(`/api/diario/${reg.id}/anexos`, { nome: "grande.pdf", dados: Buffer.alloc(3 * 1024 * 1024 + 10).toString("base64") })).status === 413, "acima de 3 MB: 413");

  const lista = (await ca.get(`/api/diario/${reg.id}/anexos`)).corpo;
  ok(lista.length === 1 && !("dados" in lista[0]), "lista os anexos do registro, sem trazer o conteúdo");
  ok((await ca.get(`/api/diario/${reg2.id}/anexos`)).corpo.length === 0, "o outro dia não vê o anexo");
  const baixado = (await ca.get(`/api/diario/${reg.id}/anexos/${up.corpo.id}`)).corpo;
  ok(Buffer.from(baixado.dados, "base64").toString().startsWith("%PDF"), "baixar devolve o conteúdo");
  ok((await ca.get(`/api/diario/${reg2.id}/anexos/${up.corpo.id}`)).status === 404, "um registro não baixa anexo de outro");

  const doDia = (await ca.get("/api/diario")).corpo.find(r => r.id === reg.id);
  ok(doDia._count.anexos === 1, "a lista do diário traz a contagem de anexos");
  const daObra = await ca.post(`/api/obras/${A.obra.id}/anexos`, { nome: "planta.pdf", dados: pdf });
  ok(daObra.status === 201, "anexo da obra continua funcionando");
  ok((await ca.get(`/api/obras/${A.obra.id}/anexos`)).corpo.map(a => a.nome).join() === "planta.pdf", "a lista da obra não mostra os anexos do diário");
  ok((await ca.get(`/api/diario/${reg.id}/anexos`)).corpo.length === 1, "a lista do diário não mostra os anexos da obra");
  ok((await ca.get(`/api/obras/${A.obra.id}/anexos/${up.corpo.id}`)).status === 404, "o anexo do diário não abre pela rota da obra");

  ok((await cb.get(`/api/diario/${reg.id}/anexos`)).status === 404, "outra empresa: 404 na lista");
  ok((await cb.get(`/api/diario/${reg.id}/anexos/${up.corpo.id}`)).status === 404, "outra empresa: 404 ao baixar");
  ok((await cb.post(`/api/diario/${reg.id}/anexos`, { nome: "a.pdf", dados: pdf })).status === 404, "outra empresa: 404 ao anexar");
  ok((await cb.del(`/api/diario/${reg.id}/anexos/${up.corpo.id}`)).status === 404, "outra empresa: 404 ao remover");

  ok((await ca.del(`/api/diario/${reg.id}/anexos/${up.corpo.id}`)).status === 200, "remover o anexo");
  const up2 = (await ca.post(`/api/diario/${reg.id}/anexos`, { nome: "b.pdf", dados: pdf })).corpo;
  await ca.del(`/api/diario/${reg.id}`);
  ok((await prisma.anexo.count({ where: { id: up2.id } })) === 0, "apagar o registro apaga os anexos dele");
  ok((await prisma.anexo.count({ where: { obraId: A.obra.id } })) === 1, "os anexos da obra ficam");
  let apagou = true;
  try { await prisma.tenant.deleteMany({ where: { id: { in: empresas } } }); } catch { apagou = false; }
  ok(apagou, "apagar a empresa inteira funciona"); empresas.length = 0;
} finally {
  await api.parar();
  if (empresas.length) await prisma.tenant.deleteMany({ where: { id: { in: empresas } } }).catch(() => {});
  await prisma.$disconnect();
}
console.log(totalFalhas() ? `\n${totalFalhas()} FALHA(S)` : "\nTudo certo.");
process.exit(totalFalhas() ? 1 : 0);
