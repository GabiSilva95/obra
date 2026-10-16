import { Router } from "express";
import prisma from "../db.js";

const router = Router({ mergeParams: true });

/**
 * Anexos de obra.
 *
 * O conteúdo trafega em base64 dentro do JSON e é guardado como bytea. Sem
 * storage de objetos configurado, esse é o caminho possível — e ele impõe o
 * teto abaixo: a Vercel corta requisições acima de 4,5 MB e o base64 infla o
 * arquivo em ~33%, então 3 MB de arquivo ≈ 4 MB de corpo.
 */
export const LIMITE_ANEXO = 3 * 1024 * 1024; // 3 MB por arquivo

/** Extensões aceitas, agrupadas como aparecem para o usuário. */
export const TIPOS_ACEITOS = {
  documento: [".pdf", ".doc", ".docx", ".txt"],
  planilha:  [".xls", ".xlsx", ".csv", ".ods"],
  imagem:    [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".heic"],
  projeto:   [".dwg", ".dxf", ".rvt", ".skp", ".ifc", ".pln", ".3ds"],
  compactado:[".zip", ".rar", ".7z"],
};

const EXTENSOES = Object.values(TIPOS_ACEITOS).flat();

function extensaoDe(nome) {
  const i = String(nome).lastIndexOf(".");
  return i === -1 ? "" : nome.slice(i).toLowerCase();
}

/** Metadados, sem o conteúdo — listar não deve trazer os bytes. */
const CAMPOS_META = {
  id: true, nome: true, mimeType: true, tamanho: true,
  descricao: true, userId: true, createdAt: true, obraId: true,
};

async function obraDoTenant(obraId, tenantId) {
  return prisma.obra.findFirst({ where: { id: parseInt(obraId), tenantId } });
}

/**
 * Onde os arquivos ficam: na obra (`/obras/:id/anexos`) ou num registro do diário (`/diario/:id/anexos`,
 * que põe o registro em `req.diarioEntry`). Os anexos do diário não aparecem na lista da obra e vice-versa.
 */
async function escopo(req) {
  if (req.diarioEntry) {
    const obra = await obraDoTenant(req.diarioEntry.obraId, req.user.tenantId);
    return obra && { obra, filtro: { diarioId: req.diarioEntry.id }, extra: { diarioId: req.diarioEntry.id } };
  }
  const obra = await obraDoTenant(req.params.id, req.user.tenantId);
  return obra && { obra, filtro: { diarioId: null }, extra: {} };
}

// ─── Listar ──────────────────────────────────────────────────────────────────

router.get("/", async (req, res) => {
  try {
    const ctx = await escopo(req);
    if (!ctx) return res.status(404).json({ error: "Obra não encontrada." });
    const { obra } = ctx;

    const itens = await prisma.anexo.findMany({
      where: { obraId: obra.id, tenantId: req.user.tenantId, ...ctx.filtro },
      select: CAMPOS_META,
      orderBy: { createdAt: "desc" },
    });
    res.json(itens);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Enviar ──────────────────────────────────────────────────────────────────

router.post("/", async (req, res) => {
  try {
    const ctx = await escopo(req);
    if (!ctx) return res.status(404).json({ error: "Obra não encontrada." });
    const { obra } = ctx;

    const { nome, mimeType, dados, descricao } = req.body;
    if (!nome?.trim()) return res.status(400).json({ error: "Nome do arquivo é obrigatório." });
    if (!dados)        return res.status(400).json({ error: "Conteúdo do arquivo ausente." });

    const ext = extensaoDe(nome);
    if (!EXTENSOES.includes(ext)) {
      return res.status(400).json({
        error: `Tipo de arquivo não aceito (${ext || "sem extensão"}). Aceitos: ${EXTENSOES.join(", ")}.`,
      });
    }

    // `dados` chega como data URL ("data:...;base64,XXXX") ou base64 puro
    const base64 = String(dados).includes(",") ? String(dados).split(",").pop() : String(dados);
    let buffer;
    try {
      buffer = Buffer.from(base64, "base64");
    } catch {
      return res.status(400).json({ error: "Conteúdo do arquivo inválido." });
    }

    if (buffer.length === 0)             return res.status(400).json({ error: "Arquivo vazio." });
    if (buffer.length > LIMITE_ANEXO) {
      const mb = (LIMITE_ANEXO / 1024 / 1024).toFixed(0);
      return res.status(413).json({ error: `Arquivo acima do limite de ${mb} MB.` });
    }

    const anexo = await prisma.anexo.create({
      data: {
        tenantId:  req.user.tenantId,
        obraId:    obra.id,
        nome:      nome.trim(),
        mimeType:  mimeType || "application/octet-stream",
        tamanho:   buffer.length,
        dados:     buffer,
        descricao: descricao?.trim() || null,
        userId:    req.user.userId ?? null,
        ...ctx.extra,
      },
      select: CAMPOS_META,
    });

    res.status(201).json(anexo);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Baixar ──────────────────────────────────────────────────────────────────

/**
 * Devolve o conteúdo em base64 para o cliente montar o download.
 * O front autentica por Bearer token, então um link direto não serviria.
 */
router.get("/:anexoId", async (req, res) => {
  try {
    const ctx = await escopo(req);
    if (!ctx) return res.status(404).json({ error: "Obra não encontrada." });
    const { obra } = ctx;

    const anexo = await prisma.anexo.findFirst({
      where: { id: parseInt(req.params.anexoId), obraId: obra.id, tenantId: req.user.tenantId, ...ctx.filtro },
    });
    if (!anexo) return res.status(404).json({ error: "Anexo não encontrado." });

    res.json({
      id:       anexo.id,
      nome:     anexo.nome,
      mimeType: anexo.mimeType,
      tamanho:  anexo.tamanho,
      dados:    Buffer.from(anexo.dados).toString("base64"),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Remover ─────────────────────────────────────────────────────────────────

router.delete("/:anexoId", async (req, res) => {
  try {
    const ctx = await escopo(req);
    if (!ctx) return res.status(404).json({ error: "Obra não encontrada." });
    const { obra } = ctx;

    const anexo = await prisma.anexo.findFirst({
      where: { id: parseInt(req.params.anexoId), obraId: obra.id, tenantId: req.user.tenantId, ...ctx.filtro },
      select: { id: true },
    });
    if (!anexo) return res.status(404).json({ error: "Anexo não encontrado." });

    await prisma.anexo.delete({ where: { id: anexo.id } });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
