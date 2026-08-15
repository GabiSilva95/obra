import { useState, useEffect, useRef } from "react";
import { C, F } from "../constants/tokens";
import { Icon, Card, Modal, Btn } from "./ui";
import { confirmar } from "../utils/aviso";

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
  documento:  { icone: "file",      cor: "#f87171", rotulo: "Documento" },
  planilha:   { icone: "barchart",  cor: "#4ade80", rotulo: "Planilha"  },
  imagem:     { icone: "pin",       cor: "#60a5fa", rotulo: "Imagem"    },
  projeto:    { icone: "building",  cor: "#f97316", rotulo: "Projeto"   },
  compactado: { icone: "cube",      cor: "#a78bfa", rotulo: "Compactado"},
  outro:      { icone: "file",      cor: "#7a7a7a", rotulo: "Arquivo"   },
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
  const [arrastando, setArrastando] = useState(false);
  const inputRef = useRef(null);

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
        setErro(`"${file.name}" tem ${formatarTamanho(file.size)} — o limite é ${LIMITE_MB} MB.`);
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
    if (inputRef.current) inputRef.current.value = "";
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
    <Modal title={`Anexos — ${obra.nome}`} onClose={onClose} wide>
      {canWrite && (
        <div
          onDragOver={e => { e.preventDefault(); setArrastando(true); }}
          onDragLeave={() => setArrastando(false)}
          onDrop={e => {
            e.preventDefault(); setArrastando(false);
            enviarArquivos([...e.dataTransfer.files]);
          }}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `1.5px dashed ${arrastando ? C.orange : C.border}`,
            background: arrastando ? C.orangeDim : "rgba(255,255,255,.02)",
            borderRadius: 12, padding: "22px 16px", textAlign: "center",
            cursor: enviando ? "wait" : "pointer", transition: "all .15s", marginBottom: 14,
          }}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACEITOS.join(",")}
            onChange={e => enviarArquivos([...e.target.files])}
            style={{ display: "none" }}
          />
          <Icon n="upload" size={20} color={arrastando ? C.orange : C.dim} />
          <div style={{ fontSize: 12.5, fontWeight: 600, color: C.text, marginTop: 8, ...F }}>
            {enviando ? `Enviando ${enviando}...` : "Arraste arquivos ou clique para escolher"}
          </div>
          <div style={{ fontSize: 10.5, color: C.dim, marginTop: 4 }}>
            PDF, planilhas, imagens e arquivos de projeto (DWG, RVT, SKP, IFC) — até {LIMITE_MB} MB cada
          </div>
        </div>
      )}

      {erro && (
        <div style={{ background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.25)", borderRadius: 9, padding: "9px 13px", fontSize: 11.5, color: C.red, marginBottom: 12 }}>
          {erro}
        </div>
      )}

      {carregando ? (
        <div style={{ padding: "34px", textAlign: "center", color: C.dim, fontSize: 12 }}>Carregando anexos...</div>
      ) : anexos.length === 0 ? (
        <Card style={{ padding: "34px", textAlign: "center", color: C.dim }}>
          <Icon n="file" size={26} color={C.border} />
          <div style={{ fontSize: 12.5, marginTop: 10 }}>Nenhum arquivo anexado a esta obra.</div>
        </Card>
      ) : (
        <>
          <div style={{ fontSize: 10.5, color: C.dim, marginBottom: 8, ...F, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
            {anexos.length} arquivo{anexos.length > 1 ? "s" : ""} · {formatarTamanho(totalBytes)}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7, maxHeight: 380, overflowY: "auto" }}>
            {anexos.map(a => {
              const g = ESTILO_GRUPO[grupoDe(a.nome)];
              return (
                <div key={a.id} style={{
                  display: "flex", alignItems: "center", gap: 11, padding: "10px 13px",
                  background: "rgba(255,255,255,.025)", border: `1px solid ${C.borderLight}`, borderRadius: 10,
                }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                    background: `${g.cor}18`, border: `1px solid ${g.cor}33`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon n={g.icone} size={15} color={g.cor} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.text, ...F, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {a.nome}
                    </div>
                    <div style={{ fontSize: 10.5, color: C.dim, marginTop: 2 }}>
                      {g.rotulo} · {formatarTamanho(a.tamanho)} · {new Date(a.createdAt).toLocaleDateString("pt-BR")}
                    </div>
                  </div>

                  <button onClick={() => baixar(a)} title="Baixar" style={{ background: "none", border: "none", cursor: "pointer", padding: 5, flexShrink: 0, lineHeight: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  </button>

                  {canWrite && (
                    <button onClick={() => remover(a)} title="Remover" style={{ background: "none", border: "none", cursor: "pointer", padding: 5, flexShrink: 0 }}>
                      <Icon n="trash" size={13} color={C.dim} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
        <Btn v="secondary" onClick={onClose}>Fechar</Btn>
      </div>
    </Modal>
  );
}
