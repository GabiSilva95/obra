import { useState } from "react";
import { Banner, Button, Checkbox, Input, Modal, Select, Textarea, UploadBox } from "../../../design-system";
import { LIMITES_SUPORTE, SETORES } from "../../../server/config/suporte.js";
import { ACEITOS_ANEXO, lerArquivo, tamanhoLegivel } from "./util";

const LIMITE_MB = 3;

/** Abrir um chamado (ticket): setor, assunto, descrição, "isto me impede de trabalhar?" e um anexo opcional. */
export default function NovoChamado({ api, prazoHoras, email, inicial, onCriado, onFechar }) {
  const [f, setF] = useState({ setor: inicial?.setor || "", assunto: inicial?.assunto || "", texto: inicial?.texto || "", bloqueante: false });
  const [anexo, setAnexo] = useState(null);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const set = k => e => { setF(x => ({ ...x, [k]: e.target.value })); setErro(""); };

  const escolher = async ([arquivo]) => {
    if (!arquivo) return;
    if (arquivo.size > LIMITE_MB * 1024 * 1024) return setErro(`O arquivo passa de ${LIMITE_MB} MB.`);
    try { setAnexo({ ...(await lerArquivo(arquivo)), tamanho: arquivo.size }); setErro(""); } catch (e) { setErro(e.message); }
  };

  const enviar = async () => {
    if (salvando) return;
    if (!f.setor) return setErro("Escolha o setor do problema.");
    if (!f.assunto.trim()) return setErro("Informe o assunto.");
    if (!f.texto.trim()) return setErro("Descreva o que aconteceu.");
    setSalvando(true);
    try { onCriado(await api.post("/suporte/chamados", { ...f, anexo: anexo && { nome: anexo.nome, dados: anexo.dados } })); }
    catch (e) { setErro(e.message); setSalvando(false); }
  };

  return (
    <Modal title="Novo chamado" onClose={onFechar} wide
      footer={<><Button variant="secondary" onClick={onFechar}>Cancelar</Button><Button iconLeft="send" loading={salvando} onClick={enviar}>Enviar chamado</Button></>}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {prazoHoras && <Banner tone="info">Respondemos em até {prazoHoras} horas, aqui no chamado. Você é avisado pelo sino{email?.ativo ? " e por e-mail" : ""}.</Banner>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(var(--col-min-md),1fr))", gap: "var(--space-4)" }}>
          <Select label="Setor" required value={f.setor} onChange={set("setor")} helper="Em qual parte do sistema está o problema?">
            <option value="">Escolha…</option>
            {SETORES.map(s => <option key={s.id} value={s.id}>{s.rotulo}</option>)}
          </Select>
          <Input label="Assunto" required maxLength={LIMITES_SUPORTE.assuntoMax} placeholder="Em poucas palavras" value={f.assunto} onChange={set("assunto")} />
        </div>
        <Textarea label="Descrição" required rows={6} maxLength={LIMITES_SUPORTE.textoMax} placeholder="O que você tentou fazer, o que aconteceu e o que esperava." value={f.texto} onChange={set("texto")} />
        <Checkbox checked={f.bloqueante} onChange={v => setF(x => ({ ...x, bloqueante: v }))} label="Isto está me impedindo de trabalhar" />
        {anexo ? (
          <Banner tone="success" action={<Button size="sm" variant="secondary" onClick={() => setAnexo(null)}>Remover</Button>}>{anexo.nome} · {tamanhoLegivel(anexo.tamanho)}</Banner>
        ) : (
          <UploadBox height={96} accept={ACEITOS_ANEXO} onFiles={escolher} title="Anexar print ou arquivo" hint="Opcional. Arraste ou clique para escolher." formats={`Imagens, PDF, planilhas e texto · até ${LIMITE_MB} MB`} />
        )}
        {erro && <Banner tone="danger">{erro}</Banner>}
      </div>
    </Modal>
  );
}
