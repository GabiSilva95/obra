export { useIntervalo } from "../../utils/useIntervalo";
import { STATUS_TICKET } from "../../../server/config/suporte.js";

export const tomDoStatus = id => STATUS_TICKET.find(s => s.id === id)?.tom || "neutral";

/** Arquivo do navegador em { nome, dados } com o conteúdo em base64 puro, como a API espera. */
export const lerArquivo = arquivo => new Promise((resolve, reject) => {
  const leitor = new FileReader();
  leitor.onload = () => resolve({ nome: arquivo.name, dados: String(leitor.result).split(",")[1] || "" });
  leitor.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
  leitor.readAsDataURL(arquivo);
});

export const tamanhoLegivel = bytes => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

/** Extensões que o suporte aceita (espelha server/config/suporte.js). */
export const ACEITOS_ANEXO = ".png,.jpg,.jpeg,.webp,.gif,.pdf,.txt,.csv,.xlsx,.docx";

/** Baixa o anexo pela API autenticada e abre o salvar do navegador. */
export async function baixarAnexo(api, caminho, nome) {
  const blob = await api.baixar(caminho);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nome;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
