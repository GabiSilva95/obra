import { codificarAcesso } from "../utils/leitura.js";
import { urlDoCliente } from "./host.js";
import { avisarErro } from "../utils/aviso";

/**
 * "Entrar como o cliente" em modo leitura: pede o acesso ao painel (liga a um chamado da empresa) e abre o
 * sistema do cliente numa aba nova. A aba abre já no clique, antes da resposta, para o navegador não bloquear.
 */
export async function entrarComoCliente(api, tenantId, chamadoId) {
  const aba = window.open("", "_blank");
  try {
    const r = await api.post(`/painel/clientes/${tenantId}/entrar`, { chamadoId });
    const dados = { token: r.token, user: r.user, tenant: r.tenant, expiraEm: r.expiraEm, chamado: r.chamado };
    const url = `${urlDoCliente()}/app/dashboard#leitura=${codificarAcesso(dados)}`;
    if (aba) { aba.opener = null; aba.location.href = url; } else window.location.assign(url);
    return true;
  } catch (e) {
    aba?.close();
    avisarErro(e.message);
    return false;
  }
}
