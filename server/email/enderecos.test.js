import { test } from "node:test";
import assert from "node:assert/strict";
import { chamadoDoEndereco, ehRespostaAutomatica, enderecoDoChamado, extrairEndereco, extrairEnderecos, htmlParaTexto, removerCitacao } from "./enderecos.js";
import { assinarSvix, verificarAssinaturaSvix } from "./svix.js";

test("endereços: extrai o e-mail de 'Nome <e-mail>' e de e-mail puro, em minúsculas", () => {
  assert.equal(extrairEndereco("Maria Silva <Maria@Empresa.com.br>"), "maria@empresa.com.br");
  assert.equal(extrairEndereco("joao@x.com"), "joao@x.com");
  assert.equal(extrairEndereco('"Souza, José" <jose.souza@x.com>'), "jose.souza@x.com");
  assert.equal(extrairEndereco("sem endereço"), null);
  assert.equal(extrairEndereco(null), null);
  assert.deepEqual(extrairEnderecos(["A <a@x.com>", "b@y.com", "a@x.com"]), ["a@x.com", "b@y.com"]);
  assert.deepEqual(extrairEnderecos("a@x.com, B <b@y.com>"), ["a@x.com", "b@y.com"]);
});

test("endereço de resposta do chamado: só vale com o domínio e a assinatura certos", () => {
  const seg = "segredo-de-teste", dom = "suporte.construktpro.com.br";
  const e = enderecoDoChamado(42, dom, seg);
  assert.match(e, /^chamado-42-[0-9a-f]{12}@suporte\.construktpro\.com\.br$/);
  assert.equal(chamadoDoEndereco(e, dom, seg), 42);
  assert.equal(chamadoDoEndereco(e.toUpperCase(), dom, seg), 42, "e-mail não diferencia maiúsculas");
  assert.equal(chamadoDoEndereco(enderecoDoChamado(43, dom, seg).replace("-43-", "-42-"), dom, seg), null, "assinatura de outro chamado");
  assert.equal(chamadoDoEndereco(e, "outro.com", seg), null, "domínio errado");
  assert.equal(chamadoDoEndereco(e, dom, "outro-segredo"), null, "segredo errado");
  assert.equal(chamadoDoEndereco("chamado-42-000000000000@" + dom, dom, seg), null, "assinatura inventada");
  assert.equal(chamadoDoEndereco("alguem@" + dom, dom, seg), null);
  assert.equal(chamadoDoEndereco(null, dom, seg), null);
});

test("resposta: só o texto novo, sem a citação", () => {
  assert.equal(removerCitacao("Obrigado, resolveu!\n\nEm seg., 5 de out. de 2026 às 10:00, Carlos escreveu:\n> Vamos ver isso."), "Obrigado, resolveu!");
  assert.equal(removerCitacao("Segue o print.\n\nOn Mon, Oct 5, 2026 at 10:00 AM Carlos <x@y.com> wrote:\n> texto"), "Segue o print.");
  assert.equal(removerCitacao("Ainda dá erro.\n\n- - -\nPara responder, basta responder este e-mail"), "Ainda dá erro.");
  assert.equal(removerCitacao("Ainda dá erro.\r\n\r\nDe: Carlos <c@x.com>\r\nEnviado: segunda\r\nAssunto: Re: [Chamado #3]"), "Ainda dá erro.");
  assert.equal(removerCitacao("Linha 1\nLinha 2\n> citado\n> mais"), "Linha 1\nLinha 2");
  assert.equal(removerCitacao("Sem nada citado, só texto."), "Sem nada citado, só texto.");
  assert.equal(removerCitacao("> só uma citação\n> e mais"), "> só uma citação\n> e mais", "se o corte deixaria vazio, devolve o inteiro");
  assert.equal(removerCitacao("Em algum lugar do texto eu escrevi que isso aconteceu, e continuo no mesmo parágrafo"), "Em algum lugar do texto eu escrevi que isso aconteceu, e continuo no mesmo parágrafo", "frase comum com 'Em' e 'escreveu' no meio não é citação");
  assert.equal(removerCitacao(""), "");
});

test("html vira texto, sem script, estilo nem citação", () => {
  assert.equal(htmlParaTexto("<p>Olá&nbsp;mundo</p><style>a{}</style><script>x()</script><div>Linha 2<br>Linha 3</div><blockquote>citado</blockquote>"), "Olá mundo\nLinha 2\nLinha 3");
  assert.equal(htmlParaTexto("a &amp; b &lt;c&gt;"), "a & b <c>");
});

test("resposta automática é reconhecida e nunca vira mensagem", () => {
  assert.equal(ehRespostaAutomatica({ headers: { "Auto-Submitted": "auto-replied" } }), true);
  assert.equal(ehRespostaAutomatica({ headers: { "auto-submitted": "no" }, de: "a@x.com" }), false);
  assert.equal(ehRespostaAutomatica({ headers: { Precedence: "bulk" } }), true);
  assert.equal(ehRespostaAutomatica({ headers: { "X-Autoreply": "yes" } }), true);
  assert.equal(ehRespostaAutomatica({ headers: { "List-Unsubscribe": "<mailto:x@y.com>" } }), true);
  assert.equal(ehRespostaAutomatica({ de: "MAILER-DAEMON@mail.com" }), true);
  assert.equal(ehRespostaAutomatica({ de: "no-reply@x.com" }), true);
  assert.equal(ehRespostaAutomatica({ de: "pessoa@x.com", assunto: "Resposta automática: Re: [Chamado #3]" }), true);
  assert.equal(ehRespostaAutomatica({ de: "pessoa@x.com", assunto: "Out of Office: ..." }), true);
  assert.equal(ehRespostaAutomatica({ de: "pessoa@x.com", assunto: "Re: [Chamado #3] Estoque", headers: { "message-id": "<1@x>" } }), false);
});

test("assinatura Svix (Resend): confere o corpo exato, o segredo e o prazo", () => {
  const segredo = "whsec_" + Buffer.from("segredo-do-webhook-de-teste").toString("base64");
  const corpo = Buffer.from('{"type":"email.received","data":{"email_id":"e1"}}');
  const agora = 1_800_000_000_000, ts = String(agora / 1000);
  const sig = assinarSvix({ id: "msg_1", timestamp: ts, corpo, segredo });
  const ok = extra => verificarAssinaturaSvix({ id: "msg_1", timestamp: ts, assinatura: sig, corpo, segredo, agora, ...extra });
  assert.equal(ok(), true);
  assert.equal(ok({ corpo: Buffer.from('{"type":"email.received","data":{"email_id":"e2"}}') }), false, "corpo alterado");
  assert.equal(ok({ corpo: Buffer.from(corpo.toString() + " ") }), false, "um espaço a mais já invalida");
  assert.equal(ok({ segredo: "whsec_" + Buffer.from("outro").toString("base64") }), false, "segredo errado");
  assert.equal(ok({ id: "msg_2" }), false, "id diferente");
  assert.equal(ok({ agora: agora + 6 * 60 * 1000 }), false, "mais de 5 minutos: repetição");
  assert.equal(ok({ assinatura: `v1,AAAA ${sig}` }), true, "várias assinaturas: basta uma");
  assert.equal(ok({ assinatura: sig.replace("v1,", "v2,") }), false, "só a versão v1 vale");
  assert.equal(ok({ assinatura: "" }), false);
  assert.equal(ok({ segredo: "" }), false);
});

import { remetenteAutenticado } from "./enderecos.js";
test("autenticação do remetente: sem informação aceita; com informação, ao menos um pass", () => {
  assert.equal(remetenteAutenticado(null), true);
  assert.equal(remetenteAutenticado(undefined), true);
  assert.equal(remetenteAutenticado({}), true);
  assert.equal(remetenteAutenticado({ spf: "pass", dkim: "fail", dmarc: "fail" }), true);
  assert.equal(remetenteAutenticado({ spf: { result: "pass" }, dkim: null }), true);
  assert.equal(remetenteAutenticado({ spf: "fail", dkim: "none", dmarc: "fail" }), false);
  assert.equal(remetenteAutenticado({ dkim: { status: "fail" } }), false);
  assert.equal(remetenteAutenticado({ spf: "PASS" }), true);
});
