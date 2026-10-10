import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "../design-system/styles.css";
import App from "./App";
import { ehHostDoPainel } from "./painel/host";

// O painel da equipe é carregado só no endereço painel.*, e o código dele fica fora do pacote do cliente
const PainelApp = lazy(() => import("./painel/PainelApp"));
const noPainel = ehHostDoPainel(window.location.hostname);

if (noPainel) {
  document.title = "Painel da equipe · ConstruktPro";
  document.head.insertAdjacentHTML("beforeend", '<meta name="robots" content="noindex, nofollow" />');
  document.querySelector('link[rel="canonical"]')?.remove();
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      {noPainel ? <Suspense fallback={null}><PainelApp /></Suspense> : <App />}
    </BrowserRouter>
  </StrictMode>
);
