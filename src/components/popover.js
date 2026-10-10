/**
 * Onde pôr uma janela de `largura` px ancorada ao botão (`caixa` = getBoundingClientRect): logo abaixo, alinhada pela direita do
 * botão, sem passar da borda da tela (`telaLargura`) nem ficar mais larga que ela. Usada pelos sinos, que ficam no canto do cabeçalho.
 */
export function posicaoDoPopover(caixa, telaLargura, largura, margem = 16) {
  const w = Math.min(largura, telaLargura - 2 * margem);
  const left = Math.min(Math.max(caixa.right - w, margem), telaLargura - w - margem);
  return { top: caixa.bottom + 8, left, width: w };
}

/** Lê o token de largura do popover (340px) do CSS. */
export const larguraDoPopover = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--popover-width")) || 340;
