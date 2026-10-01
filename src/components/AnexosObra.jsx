import { useState, useEffect } from "react";
import { confirmar } from "../utils/aviso";
import { Banner, Button, Icon, IconButton, Modal, UploadBox } from "../../design-system";

const LIMITE_MB = 3;
const LIMITE_BYTES = LIMITE_MB * 1024 * 1024;

/** Extensões aceitas, espelhando server/routes/anexos.js */
const GRUPOS = {
  documento:  [".pdf", ".doc", ".docx", ".txt"],
  planilha:   [".xls", ".xlsx", ".csv", ".ods"],
  imagem:     [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".heic"],
  projeto:    [".dwg", ".dxf", ".rvt", ".skp", ".ifc", ".pln", ".3ds"],
  compactado: [".zip", ".rar", ".7z"],
};
const ACEITOS = Object.values(GRUPOS).flat();

const ESTILO_GRUPO = {
  documento:  { icone: "file-text",    cor: "var(--cp-data-pink)",   rotulo: "Documento" },
  planilha:   { icone: "chart-column", cor: "var(--cp-data-green)",  rotulo: "Planilha"  },
  imagem:     { icone: "image",        cor: "var(--cp-data-blue)",   rotulo: "Imagem"    },
  projeto:    { icone: "ruler",        cor: "var(--accent)",         rotulo: "Projeto"   },
  compactado: { icone: "box",          cor: "var(--cp-data-purple)", rotulo: "Compactado"},
  outro:      { icone: "file-text",    cor: "var(--text-secondary)", rotulo: "Arquivo"   },
};

const extDe = nome => {
  const i = String(nome).lastIndexOf(".");
  return i === -1 ? "" : nome.slice(i).toLowerCase();
};

const grupoDe = nome => {
  const ext = extDe(nome);
  return Object.keys(GRUPOS).find(g => GRUPOS[g].includes(ext)) || "outro";
};

export const formatarTamanho = b => {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
};

/** Lê o arquivo como base64 puro (sem o prefixo data:) */
function lerBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload  = () => resolve(String(r.result).split(",").pop());
    r.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    r.readAsDataURL(file);
  });
}

export default function AnexosObra({ obra, api, canWrite, onClose }) {
  const [anexos, setAnexos]   = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando]     = useState(null); // nome do arquivo em envio
  const [erro, setErro]             = useState("");

  useEffect(() => {
    let ativo = true;
    api.get(`/obras/${obra.id}/anexos`)
      .then(d => { if (ativo) setAnexos(d); })
      .catch(e => { if (ativo) setErro(e.message); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [obra.id]); // eslint-disable-line

  const enviarArquivos = async (files) => {
    setErro("");
    for (const file of files) {
      if (!ACEITOS.includes(extDe(file.name))) {
        setErro(`"${file.name}": tipo não aceito.`);
        continue;
      }
      if (file.size > LIMITE_BYTES) {
        setErro(`"${file.name}" tem ${formatarTamanho(file.size)}. O limite é ${LIMITE_MB} MB.`);
        continue;
      }
      setEnviando(file.name);
      try {
        const dados = await lerBase64(file);
        const novo = await api.post(`/obras/${obra.id}/anexos`, {
          nome: file.name,
          mimeType: file.type || "application/octet-stream",
          dados,
        });
        setAnexos(a => [novo, ...a]);
      } catch (e) {
        setErro(`"${file.name}": ${e.message}`);
      } finally {
        setEnviando(null);
      }
    }
  };

  const baixar = async (anexo) => {
    setErro("");
    try {
      // O download passa pela API autenticada, então o conteúdo vem em base64
      // e o blob é montado aqui.
      const { dados, mimeType, nome } = await api.get(`/obras/${obra.id}/anexos/${anexo.id}`);
      const bin = atob(dados);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

      const url = URL.createObjectURL(new Blob([bytes], { type: mimeType }));
      const a = document.createElement("a");
      a.href = url; a.download = nome;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) { setErro(e.message); }
  };

  const remover = async (anexo) => {
    if (!(await confirmar({ mensagem: `Remover "${anexo.nome}"?`, confirmarRotulo: "Remover", perigo: true }))) return;
    try {
      await api.del(`/obras/${obra.id}/anexos/${anexo.id}`);
      setAnexos(a => a.filter(x => x.id !== anexo.id));
    } catch (e) { setErro(e.message); }
  };

  const totalBytes = anexos.reduce((s, a) => s + a.tamanho, 0);

  return (
    <Modal title={`Anexos · ${obra.nome}`} onClose={onClose} wide footer={<Button variant="secondary" onClick={onClose}>Fechar</Button>}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {canWrite && (
          <UploadBox height={150} multiple accept={ACEITOS.join(",")} busy={!!enviando} onFiles={enviarArquivos}
            title={enviando ? `Enviando ${enviando}…` : "Enviar arquivos"}
            hint="Arraste arquivos ou clique para escolher."
            formats={`PDF, planilhas, imagens e projetos (DWG, RVT, SKP, IFC) · até ${LIMITE_MB} MB cada`} />
        )}

        {erro && <Banner tone="danger">{erro}</Banner>}

        {carregando ? (
          <div style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--text-secondary)" }}>Carregando anexos…</div>
        ) : anexos.length === 0 ? (
          <div style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--text-secondary)", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-2)" }}>
            <Icon name="file-text" size={28} />
            Nenhum arquivo anexado a esta obra.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            <span style={{ font: "var(--type-label)", color: "var(--text-secondary)" }}>
              {anexos.length} arquivo{anexos.length > 1 ? "s" : ""} · {formatarTamanho(totalBytes)}
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", maxHeight: "var(--scroll-h-md)", overflowY: "auto" }}>
              {anexos.map(a => {
                const g = ESTILO_GRUPO[grupoDe(a.nome)];
                return (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", padding: "var(--space-2) var(--space-3)", background: "var(--surface-sunken)", borderRadius: "var(--radius-md)" }}>
                    <span style={{ width: "var(--space-9)", height: "var(--space-9)", borderRadius: "var(--radius-md)", flexShrink: 0, background: `color-mix(in srgb, ${g.cor} 14%, transparent)`, color: g.cor, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon name={g.icone} size={18} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: "var(--fw-semibold)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.nome}</div>
                      <div style={{ fontSize: "var(--fs-caption)", color: "var(--text-secondary)" }}>
                        {g.rotulo} · {formatarTamanho(a.tamanho)} · {new Date(a.createdAt).toLocaleDateString("pt-BR")}
                      </div>
                    </div>
                    <IconButton icon="download" label="Baixar" onClick={() => baixar(a)} />
                    {canWrite && <IconButton icon="trash-2" label="Remover" onClick={() => remover(a)} />}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
