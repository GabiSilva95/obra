import { useEffect, useState } from "react";
import { AlertDialog } from "../../design-system";
import { registrarAviso } from "../utils/aviso";

// System-wide notice / confirmation, rendered with the design-system AlertDialog.
const TONE = { sucesso: "success", erro: "error", alerta: "warning", info: "info" };

export default function AvisoModal() {
  const [aviso, setAviso] = useState(null);

  useEffect(() => registrarAviso(setAviso), []);

  if (!aviso) return null;

  const fechar = confirmou => {
    aviso.confirmacao?.resolve(!!confirmou);
    if (aviso.acao && confirmou) aviso.acao.onClick?.();
    setAviso(null);
  };
  const conf = aviso.confirmacao;

  return (
    <AlertDialog
      tone={TONE[aviso.tipo] || "info"}
      title={aviso.titulo}
      message={aviso.mensagem}
      confirmLabel={conf ? conf.rotulo : (aviso.acao?.rotulo || aviso.botao || "Entendi")}
      cancelLabel={conf ? "Cancelar" : undefined}
      danger={!!conf?.perigo}
      onConfirm={() => fechar(true)}
      onCancel={() => fechar(false)}
    />
  );
}
