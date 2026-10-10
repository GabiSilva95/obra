import { contaBloqueada, diasRestantesTeste, statusEfetivo } from "../config/conta.js";
import { hojeBR } from "./datas.js";

/**
 * O que o cliente pode ver da própria empresa. Lista de campos permitidos (nunca "tudo menos"):
 * `notasInternas`, `motivoStatus` e os dados do aceite são da equipe e não saem nas respostas do cliente.
 */
export function tenantParaCliente(t, hoje = hojeBR()) {
  if (!t) return null;
  return {
    situacao: statusEfetivo(t, hoje), bloqueada: contaBloqueada(t, hoje), diasRestantes: diasRestantesTeste(t, hoje),
    id: t.id, razaoSocial: t.razaoSocial, cnpj: t.cnpj, email: t.email, plano: t.plano, createdAt: t.createdAt,
    status: t.status, trialAte: t.trialAte, ciclo: t.ciclo, telefone: t.telefone,
    aceitouMensagens: !!t.aceiteMensagensEm,
  };
}
