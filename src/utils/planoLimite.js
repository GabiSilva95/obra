/**
 * Canal de avisos de limite de plano.
 *
 * O aviso deixou de ser um banner permanente: ele aparece só quando uma ação
 * é efetivamente barrada pelo backend (HTTP 403 com `upgrade: true`), e some
 * quando o usuário fecha. Enquanto ninguém tentar a ação bloqueada de novo,
 * nada volta a ser exibido.
 */

let ouvintes = [];

/** Registra um ouvinte. Devolve a função para cancelar a inscrição. */
export function onLimiteAtingido(fn) {
  ouvintes.push(fn);
  return () => { ouvintes = ouvintes.filter(o => o !== fn); };
}

/**
 * Dispara o aviso.
 * @param {{recurso?: string, limite?: number, atual?: number, error?: string}} info
 */
export function emitirLimiteAtingido(info) {
  ouvintes.forEach(fn => {
    try { fn(info); } catch { /* um ouvinte com erro não impede os demais */ }
  });
}

// Somente obras e usuários têm limite de plano — ver server/config/planos.js.

/** Rótulos no plural, como aparecem para o usuário. */
export const LABELS_RECURSO = {
  obras:    "obras",
  usuarios: "usuários",
};

/** Ação que o usuário tentou fazer, por recurso — usada no texto do aviso. */
export const ACAO_RECURSO = {
  obras:    "cadastrar outra obra",
  usuarios: "criar outro usuário",
};
