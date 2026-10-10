// Acesso "como o cliente" em modo leitura: a equipe abre o sistema do cliente numa aba nova e o painel passa o acesso
// pelo fragmento da URL (#leitura=...), que nunca vai ao servidor nem fica no histórico de requisições.
// O navegador guarda só nesta aba (sessionStorage): não mistura com a sessão do cliente, que mora no localStorage.

const CHAVE = "construktpro:leitura";

/** Texto seguro para URL (base64url) a partir dos dados do acesso. */
export function codificarAcesso(dados) {
  const bytes = new TextEncoder().encode(JSON.stringify(dados));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Volta ao objeto; devolve null se o texto não for um acesso válido. */
export function decodificarAcesso(texto) {
  try {
    const bin = atob(String(texto).replace(/-/g, "+").replace(/_/g, "/"));
    const dados = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0))));
    return dados && typeof dados.token === "string" && dados.user && dados.tenant && dados.expiraEm ? dados : null;
  } catch { return null; }
}

/** Se a URL traz um acesso de leitura, guarda nesta aba e limpa o endereço. Seguro de chamar mais de uma vez. */
export function capturarAcessoLeitura() {
  try {
    const m = /^#leitura=([\w-]+)$/.exec(window.location.hash);
    if (!m) return;
    const dados = decodificarAcesso(m[1]);
    if (dados) sessionStorage.setItem(CHAVE, JSON.stringify(dados));
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  } catch { /* sem sessionStorage: o acesso simplesmente não abre */ }
}

/** O acesso de leitura desta aba, se ainda não venceu. */
export function lerAcessoLeitura() {
  try {
    const dados = JSON.parse(sessionStorage.getItem(CHAVE));
    return dados && new Date(dados.expiraEm).getTime() > Date.now() ? dados : null;
  } catch { return null; }
}

export function encerrarAcessoLeitura() {
  try { sessionStorage.removeItem(CHAVE); } catch { /* nada a limpar */ }
}
