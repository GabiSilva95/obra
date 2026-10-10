import { test } from "node:test";
import assert from "node:assert/strict";
import { emailDeConfirmacao, emailDeResolvido, emailDeResposta } from "./modelos.js";

const chamado = { id: 42, assunto: "Compra não fecha\r\nBcc: alguem@x.com" };

test("e-mails do chamado: assunto com o número, sem quebra de linha (nada de injetar cabeçalho)", () => {
  const c = emailDeConfirmacao({ chamado, nome: "Maria Silva", setorRotulo: "Financeiro", prazoHoras: 24, planoNome: "Business", link: "https://app.x/app/suporte", podeResponder: true });
  assert.equal(c.assunto, "[Chamado #42] Compra não fecha Bcc: alguem@x.com");
  assert.ok(!/[\r\n]/.test(c.assunto));
  assert.match(c.texto, /^Olá, Maria\./);
  assert.match(c.texto, /Recebemos o seu chamado #42/);
  assert.match(c.texto, /Respondemos em até 24 horas no plano Business/);
  assert.match(c.texto, /basta responder este e-mail/);
  assert.match(c.texto, /\n- - -\n/, "a linha de corte vem antes do rodapé");
});

test("e-mails do chamado: sem receber respostas, pede para responder no sistema", () => {
  const r = emailDeResposta({ chamado, nomeAtendente: "Carlos Souza", texto: "Pode mandar um print?", link: null, podeResponder: false });
  assert.equal(r.assunto, "Re: [Chamado #42] Compra não fecha Bcc: alguem@x.com");
  assert.match(r.texto, /Carlos, do suporte do ConstruktPro, respondeu o seu chamado #42:\n\nPode mandar um print\?/);
  assert.match(r.texto, /abra o chamado no sistema/);
  assert.ok(!/responder este e-mail/.test(r.texto));
  assert.ok(!/Acompanhe o chamado/.test(r.texto), "sem endereço do sistema configurado, não há link");
});

test("e-mails do chamado: o texto da equipe sai como foi escrito e o aviso de resolvido convida a reabrir", () => {
  const r = emailDeResposta({ chamado, nomeAtendente: "", texto: "  Linha 1\nLinha 2 <b>não é HTML</b>  ", podeResponder: true });
  assert.match(r.texto, /A equipe, do suporte/);
  assert.match(r.texto, /Linha 1\nLinha 2 <b>não é HTML<\/b>/);
  const v = emailDeResolvido({ chamado, nomeAtendente: "Ana", link: "https://app.x/app/suporte", podeResponder: true });
  assert.match(v.texto, /marcou o chamado #42 como resolvido/);
  assert.match(v.texto, /responda e o chamado é reaberto/);
  assert.match(v.texto, /Acompanhe o chamado: https:\/\/app\.x\/app\/suporte/);
});
