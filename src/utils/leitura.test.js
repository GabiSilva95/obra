import { test } from "node:test";
import assert from "node:assert/strict";
import { codificarAcesso, decodificarAcesso } from "./leitura.js";

const acesso = { token: "eyJhbGciOiJIUzI1NiJ9.eyJ1IjoxfQ.assinatura-qualquer", user: { id: 7, nome: "Equipe (Carlos)", role: "tenant_admin" }, tenant: { id: "t1", razaoSocial: "Construtora São João Ltda", situacao: "suspenso" }, expiraEm: "2026-10-20T15:30:00.000Z", chamado: 42 };

test("acesso de leitura: ida e volta pela URL, com acentos", () => {
  const texto = codificarAcesso(acesso);
  assert.match(texto, /^[\w-]+$/, "só caracteres seguros para o fragmento da URL");
  assert.deepEqual(decodificarAcesso(texto), acesso);
});

test("acesso de leitura: texto estragado ou incompleto é recusado, sem exceção", () => {
  assert.equal(decodificarAcesso("isso-nao-e-base64!!"), null);
  assert.equal(decodificarAcesso(""), null);
  assert.equal(decodificarAcesso(codificarAcesso({ token: "x" })), null, "sem usuário, empresa e validade não serve");
  assert.equal(decodificarAcesso(codificarAcesso({ ...acesso, token: 123 })), null);
});
