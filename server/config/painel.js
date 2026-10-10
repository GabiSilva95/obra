// Permissões e perfis da equipe do painel interno. Arquivo puro: o servidor e o painel (front) leem o mesmo.

export const PERMISSOES_EQUIPE = [
  { id: "suporte", rotulo: "Atendimento e chamados", ajuda: "Atende o chat, responde chamados e vê a fila." },
  { id: "suporte_supervisor", rotulo: "Supervisor do atendimento", ajuda: "Escolhe fora da ordem da fila e reatribui chamados." },
  { id: "clientes", rotulo: "Ver clientes", ajuda: "Vê empresas, planos e usuários." },
  { id: "clientes_editar", rotulo: "Alterar clientes", ajuda: "Troca plano, estende o teste, suspende e reativa." },
  { id: "financeiro", rotulo: "Financeiro", ajuda: "Cobranças, pagamentos e indicadores da receita." },
  { id: "equipe", rotulo: "Equipe e auditoria", ajuda: "Cria usuários do painel e consulta a auditoria." },
];
export const IDS_PERMISSOES = PERMISSOES_EQUIPE.map(p => p.id);

/** Perfis prontos: só preenchem as permissões; o que vale é a lista gravada em cada pessoa. */
export const PERFIS_EQUIPE = [
  { id: "administrador", rotulo: "Administrador", papel: "equipe_admin", permissoes: IDS_PERMISSOES },
  { id: "supervisor", rotulo: "Supervisor", papel: "atendente", permissoes: ["suporte", "suporte_supervisor", "clientes"] },
  { id: "atendente", rotulo: "Atendente", papel: "atendente", permissoes: ["suporte", "clientes"] },
  { id: "financeiro", rotulo: "Financeiro", papel: "atendente", permissoes: ["financeiro", "clientes"] },
  { id: "leitura", rotulo: "Leitura", papel: "atendente", permissoes: ["clientes"] },
];

export const PAPEL_ADMIN = "equipe_admin";
export const SENHA_MINIMA_EQUIPE = 10;

/** O administrador sempre tem tudo; os demais, o que estiver em `permissoes`. */
export const temPermissao = (equipe, perm) => !!equipe && (equipe.papel === PAPEL_ADMIN || (equipe.permissoes || []).includes(perm));

/** Mensagem de erro, ou null se a senha serve: pelo menos 10 caracteres e 2 tipos (letra, número, símbolo). */
export function validarSenhaEquipe(senha) {
  const s = String(senha ?? "");
  if (s.length < SENHA_MINIMA_EQUIPE) return `A senha precisa de pelo menos ${SENHA_MINIMA_EQUIPE} caracteres.`;
  const tipos = [/[a-z]/i, /\d/, /[^a-z\d]/i].filter(r => r.test(s)).length;
  if (tipos < 2) return "Misture letras com números ou símbolos.";
  return null;
}

/** Só aceita ids de permissão que existem, sem repetir. */
export const permissoesValidas = lista => [...new Set((Array.isArray(lista) ? lista : []).filter(p => IDS_PERMISSOES.includes(p)))];
