import { test } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { IDS_PERMISSOES, PERFIS_EQUIPE, permissoesValidas, temPermissao, validarSenhaEquipe } from "../config/painel.js";
import { assinarAcessoEquipe, chaveEquipe, verificarAcessoEquipe } from "./token.js";
import { exigirPermissao, somenteHostDoPainel } from "./guardas.js";
import { senhaTemporaria } from "./senha.js";

process.env.JWT_SECRET ||= "segredo-de-teste-do-cliente";

test("token da equipe: abre o painel, mas não abre o sistema do cliente", () => {
  const token = assinarAcessoEquipe({ id: 7 });
  assert.equal(verificarAcessoEquipe(token).equipeId, 7);
  // O authMiddleware do cliente verifica com JWT_SECRET: tem que falhar
  assert.throws(() => jwt.verify(token, process.env.JWT_SECRET));
  assert.notEqual(chaveEquipe(), process.env.JWT_SECRET);
});

test("token do cliente não abre o painel, nem um token da equipe com outra audiência ou tipo", () => {
  const doCliente = jwt.sign({ userId: 1, tenantId: "t1", role: "tenant_admin" }, process.env.JWT_SECRET, { expiresIn: "15m" });
  assert.throws(() => verificarAcessoEquipe(doCliente));
  const outraAudiencia = jwt.sign({ equipeId: 1, tipo: "equipe" }, chaveEquipe(), { audience: "outro" });
  assert.throws(() => verificarAcessoEquipe(outraAudiencia));
  const semTipo = jwt.sign({ equipeId: 1 }, chaveEquipe(), { audience: "painel" });
  assert.throws(() => verificarAcessoEquipe(semTipo));
  const expirado = jwt.sign({ equipeId: 1, tipo: "equipe" }, chaveEquipe(), { audience: "painel", expiresIn: -10 });
  assert.throws(() => verificarAcessoEquipe(expirado));
});

test("JWT_SECRET_EQUIPE, quando existe, substitui a chave derivada", () => {
  const antes = process.env.JWT_SECRET_EQUIPE;
  process.env.JWT_SECRET_EQUIPE = "chave-propria";
  try { assert.equal(chaveEquipe(), "chave-propria"); } finally { if (antes === undefined) delete process.env.JWT_SECRET_EQUIPE; else process.env.JWT_SECRET_EQUIPE = antes; }
});

test("permissões: administrador tem tudo, os demais só o que foi dado", () => {
  const admin = { papel: "equipe_admin", permissoes: [] };
  const atendente = { papel: "atendente", permissoes: ["suporte", "clientes"] };
  for (const p of IDS_PERMISSOES) assert.equal(temPermissao(admin, p), true);
  assert.equal(temPermissao(atendente, "suporte"), true);
  assert.equal(temPermissao(atendente, "financeiro"), false);
  assert.equal(temPermissao(null, "suporte"), false);
  assert.deepEqual(permissoesValidas(["suporte", "suporte", "inventada", 3]), ["suporte"]);
  assert.deepEqual(permissoesValidas("x"), []);
  // Perfis prontos só usam permissões que existem, e só o administrador tem `equipe`
  for (const perfil of PERFIS_EQUIPE) for (const p of perfil.permissoes) assert.ok(IDS_PERMISSOES.includes(p), `${perfil.id}: ${p}`);
  assert.deepEqual(PERFIS_EQUIPE.filter(p => p.permissoes.includes("equipe")).map(p => p.id), ["administrador"]);
});

test("senha da equipe: mínimo, mistura e senha provisória que passa na própria regra", () => {
  assert.match(validarSenhaEquipe("curta1"), /pelo menos 10/);
  assert.match(validarSenhaEquipe("somenteletras"), /Misture/);
  assert.match(validarSenhaEquipe("12345678901"), /Misture/);
  assert.equal(validarSenhaEquipe("boa-senha-2026"), null);
  assert.equal(validarSenhaEquipe("letras e 123"), null);
  const vistas = new Set();
  for (let i = 0; i < 200; i++) {
    const s = senhaTemporaria();
    assert.equal(s.length, 14);
    assert.equal(validarSenhaEquipe(s), null, s);
    assert.doesNotMatch(s, /[0OlI1]/);
    vistas.add(s);
  }
  assert.equal(vistas.size, 200);
});

function chamar(mw, req) {
  const r = { status(c) { this.codigo = c; return this; }, json(b) { this.corpo = b; return this; } };
  let seguiu = false;
  mw(req, r, () => { seguiu = true; });
  return { seguiu, res: r };
}

test("PAINEL_HOST: com a variável, só o subdomínio do painel responde", () => {
  const antes = process.env.PAINEL_HOST;
  try {
    delete process.env.PAINEL_HOST;
    assert.equal(chamar(somenteHostDoPainel, { hostname: "qualquer.com" }).seguiu, true);
    process.env.PAINEL_HOST = "painel.construktpro.com.br";
    assert.equal(chamar(somenteHostDoPainel, { hostname: "painel.construktpro.com.br" }).seguiu, true);
    const outro = chamar(somenteHostDoPainel, { hostname: "construktpro.com.br" });
    assert.equal(outro.seguiu, false);
    assert.equal(outro.res.codigo, 404);
  } finally { if (antes === undefined) delete process.env.PAINEL_HOST; else process.env.PAINEL_HOST = antes; }
});

test("exigirPermissao: libera quem tem uma das permissões e recusa o resto", () => {
  const mw = exigirPermissao("financeiro", "clientes_editar");
  assert.equal(chamar(mw, { equipe: { papel: "atendente", permissoes: ["clientes_editar"] } }).seguiu, true);
  assert.equal(chamar(mw, { equipe: { papel: "equipe_admin", permissoes: [] } }).seguiu, true);
  const negado = chamar(mw, { equipe: { papel: "atendente", permissoes: ["suporte"] } });
  assert.equal(negado.seguiu, false);
  assert.equal(negado.res.codigo, 403);
});
