// Os e-mails do suporte: funções puras que montam assunto e texto. Texto simples (sem HTML): nada do que a equipe ou o cliente
// escreveu é interpretado como marcação, e a resposta por e-mail volta sem lixo de formatação.
const semQuebra = s => String(s ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, 150);
const primeiroNome = nome => String(nome || "").trim().split(/\s+/)[0] || "";
const assuntoDo = (chamado, resposta = false) => `${resposta ? "Re: " : ""}[Chamado #${chamado.id}] ${semQuebra(chamado.assunto)}`;
const RODAPE = "- - -";

function rodape({ link, podeResponder }) {
  const linhas = [RODAPE];
  linhas.push(podeResponder ? "Para responder, basta responder este e-mail: o que você escrever acima da citação entra no chamado." : "Para responder, abra o chamado no sistema.");
  if (link) linhas.push(`Acompanhe o chamado: ${link}`);
  return linhas.join("\n");
}

/** Confirmação de que o chamado foi aberto (sai para quem abriu). */
export function emailDeConfirmacao({ chamado, nome, setorRotulo, prazoHoras, planoNome, link, podeResponder }) {
  const saudacao = primeiroNome(nome) ? `Olá, ${primeiroNome(nome)}.` : "Olá.";
  return {
    assunto: assuntoDo(chamado),
    texto: [
      saudacao, "",
      `Recebemos o seu chamado #${chamado.id}: "${semQuebra(chamado.assunto)}".`,
      `Setor: ${setorRotulo}. Respondemos em até ${prazoHoras} horas${planoNome ? ` no plano ${planoNome}` : ""}, na ordem em que os chamados chegam.`, "",
      "Se lembrar de mais alguma informação, é só acrescentar.", "",
      "Equipe ConstruktPro", "", rodape({ link, podeResponder }),
    ].join("\n"),
  };
}

/** Resposta da equipe ao chamado (nunca nota interna). */
export function emailDeResposta({ chamado, nomeAtendente, texto, link, podeResponder }) {
  const quem = primeiroNome(nomeAtendente) || "A equipe";
  return {
    assunto: assuntoDo(chamado, true),
    texto: [`${quem}, do suporte do ConstruktPro, respondeu o seu chamado #${chamado.id}:`, "", String(texto).trim(), "", rodape({ link, podeResponder })].join("\n"),
  };
}

/** Aviso de que a equipe marcou o chamado como resolvido. */
export function emailDeResolvido({ chamado, nomeAtendente, link, podeResponder }) {
  const quem = primeiroNome(nomeAtendente) || "A equipe";
  return {
    assunto: assuntoDo(chamado, true),
    texto: [`${quem}, do suporte do ConstruktPro, marcou o chamado #${chamado.id} como resolvido.`, "", "Se ainda precisar de ajuda neste assunto, responda e o chamado é reaberto.", "", rodape({ link, podeResponder })].join("\n"),
  };
}
