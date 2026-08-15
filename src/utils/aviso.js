/**
 * Avisos do sistema.
 *
 * Toda mensagem gerada pelo sistema — sucesso, erro, alerta e confirmação —
 * passa por aqui e é exibida como pop-up centralizado na página, substituindo
 * os diálogos nativos do navegador (`alert` e `confirm`).
 */

let ouvinte = null;

/** O modal se registra na montagem. Só um por vez. */
export function registrarAviso(fn) {
  ouvinte = fn;
  return () => { ouvinte = null; };
}

/**
 * Exibe um aviso.
 * @param {{tipo?: "sucesso"|"erro"|"alerta"|"info", titulo?: string, mensagem?: string,
 *          botao?: string, acao?: {rotulo: string, onClick: Function}}} opcoes
 */
export function avisar(opcoes) {
  if (!ouvinte) return;                    // sem modal montado, o aviso é ignorado
  ouvinte({ tipo: "info", ...opcoes });
}

/** Atalhos por tipo — títulos padrão evitam repetição nas telas. */
export const avisarSucesso = (mensagem, titulo = "Tudo certo!") =>
  avisar({ tipo: "sucesso", titulo, mensagem });

export const avisarErro = (mensagem, titulo = "Não foi possível concluir") =>
  avisar({ tipo: "erro", titulo, mensagem });

export const avisarAlerta = (mensagem, titulo = "Atenção") =>
  avisar({ tipo: "alerta", titulo, mensagem });

/**
 * Confirmação: mesmo pop-up, com dois botões.
 * @returns {Promise<boolean>} true se o usuário confirmou
 */
export function confirmar({ titulo = "Confirmar ação", mensagem, confirmarRotulo = "Confirmar", perigo = false }) {
  return new Promise(resolve => {
    if (!ouvinte) { resolve(false); return; }
    ouvinte({
      tipo: perigo ? "erro" : "alerta",
      titulo,
      mensagem,
      confirmacao: { rotulo: confirmarRotulo, perigo, resolve },
    });
  });
}
