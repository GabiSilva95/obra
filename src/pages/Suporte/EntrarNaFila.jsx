import { useState } from "react";
import { Banner, Button, Input, Modal, Select } from "../../../design-system";
import { SETORES } from "../../../server/config/suporte.js";

/** Pede o setor e coloca o cliente na fila do chat ao vivo. */
export default function EntrarNaFila({ api, horario, onEntrou, onFechar }) {
  const [setor, setSetor] = useState("");
  const [assunto, setAssunto] = useState("");
  const [erro, setErro] = useState("");
  const [entrando, setEntrando] = useState(false);

  const entrar = async () => {
    if (entrando) return;
    if (!setor) return setErro("Escolha o setor do problema.");
    setEntrando(true);
    try { onEntrou((await api.post("/suporte/chat/entrar", { setor, assunto })).id); }
    catch (e) { setErro(e.message); setEntrando(false); }
  };

  return (
    <Modal title="Falar com o suporte ao vivo" onClose={onFechar}
      footer={<><Button variant="secondary" onClick={onFechar}>Cancelar</Button><Button iconLeft="message-circle" loading={entrando} onClick={entrar}>Entrar na fila</Button></>}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <Banner tone="info">Atendemos {horario}. Você entra na fila e é atendido na ordem em que chegou.</Banner>
        <Select label="Setor do problema" required value={setor} onChange={e => { setSetor(e.target.value); setErro(""); }}>
          <option value="">Escolha…</option>
          {SETORES.map(s => <option key={s.id} value={s.id}>{s.rotulo}</option>)}
        </Select>
        <Input label="Do que se trata (opcional)" maxLength={120} placeholder="Em poucas palavras" value={assunto} onChange={e => setAssunto(e.target.value)} />
        {erro && <Banner tone="danger">{erro}</Banner>}
      </div>
    </Modal>
  );
}
