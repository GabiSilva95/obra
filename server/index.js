import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import obrasRoutes from "./routes/obras.js";
import cadastrosRoutes from "./routes/cadastros.js";
import estoqueRoutes from "./routes/estoque.js";
import alocacaoRoutes from "./routes/alocacao.js";
import usuariosRoutes from "./routes/usuarios.js";
import diarioRoutes from "./routes/diario.js";
import receitasRoutes from "./routes/receitas.js";
import comprasRoutes from "./routes/compras.js";
import planoRoutes from "./routes/plano.js";
import auditoriaRoutes from "./routes/auditoria.js";
import apontamentosRoutes from "./routes/apontamentos.js";
import despesasRoutes from "./routes/despesas.js";
import preferenciasRoutes from "./routes/preferencias.js";
import financeiroRoutes from "./routes/financeiro.js";
import financeiroConciliacaoRoutes from "./routes/financeiroConciliacao.js";
import { authMiddleware } from "./middleware/auth.js";
import { contaAtiva, modoLeitura } from "./middleware/conta.js";
import { requirePermissao } from "./middleware/permissao.js";
import { authLimiter, apiLimiter, painelLoginLimiter, chatLimiter } from "./middleware/rateLimiter.js";
import suporteRoutes from "./routes/suporte.js";
import assinaturaRoutes from "./routes/assinatura.js";
import pagamentosRoutes from "./routes/pagamentos.js";
import emailRoutes from "./routes/email.js";
import painelRoutes from "./painel/index.js";
import { auditLogger } from "./middleware/auditLogger.js";

const app = express();
// 3002 por padrão: a 3001 costuma estar ocupada por outras apps locais
const PORT = process.env.PORT || 3002;

// Necessário para o rate-limiter detectar o IP correto atrás do proxy da Vercel
app.set("trust proxy", 1);

const allowedOrigins = [
  "http://localhost:3000",
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) return cb(null, true);
    cb(null, true); // allow all in dev; tighten in prod via FRONTEND_URL
  },
  credentials: true,
}));
// 6 MB cobre o base64 de um anexo de 3 MB (~4 MB) com folga para o resto.
// Os avisos de provedores (pagamento, e-mail) são assinados sobre o corpo EXATO recebido: guarda os bytes originais só para esses caminhos.
const CORPO_BRUTO = /^\/api\/(pagamentos|email)\/webhook\//;
app.use(express.json({ limit: "6mb", verify: (req, _res, buf) => { if (CORPO_BRUTO.test(req.originalUrl)) req.rawBody = buf; } }));

// Rate limiting global + específico para auth
app.use("/api", apiLimiter);
app.use("/api/auth/login",    authLimiter);
app.use("/api/auth/registro", authLimiter);

app.use("/api/auth", authRoutes);

// Avisos de gateways de pagamento: públicos (a origem é conferida pelo provedor), antes do authMiddleware
app.use("/api/pagamentos", pagamentosRoutes);
// Avisos do provedor de e-mail (resposta do cliente ao e-mail do chamado): públicos, assinados pelo Resend
app.use("/api/email", emailRoutes);

// Painel interno da equipe: login e permissões próprios, antes do authMiddleware do cliente
app.use("/api/painel/auth/login", painelLoginLimiter);
app.use("/api/painel", painelRoutes);

// Autenticação + audit log para todas as rotas protegidas
app.use(authMiddleware);
app.use(modoLeitura);   // a equipe "como o cliente" só lê
app.use(contaAtiva);    // teste vencido, conta suspensa ou cancelada: só assinatura, suporte e autenticação
app.use(auditLogger);

app.use("/api/obras",      obrasRoutes);
app.use("/api/cadastros",  cadastrosRoutes);
app.use("/api/estoque",    estoqueRoutes);
app.use("/api/alocacao",   alocacaoRoutes);
app.use("/api/usuarios",   usuariosRoutes);
app.use("/api/diario",     diarioRoutes);
app.use("/api/receitas",   requirePermissao("financeiro", { soEscrita: true }), receitasRoutes);
app.use("/api/compras",    comprasRoutes);
app.use("/api/plano",      planoRoutes);
app.use("/api/assinatura", assinaturaRoutes);
app.use("/api/suporte/chat",    chatLimiter);
app.use("/api/suporte/resumo",  chatLimiter);
app.use("/api/suporte",    suporteRoutes);
app.use("/api/auditoria",  auditoriaRoutes);
app.use("/api/apontamentos", apontamentosRoutes);
app.use("/api/despesas",     requirePermissao("financeiro", { soEscrita: true }), despesasRoutes);
app.use("/api/me/preferencias", preferenciasRoutes);
app.use("/api/financeiro", requirePermissao("financeiro"), financeiroRoutes);
app.use("/api/financeiro", requirePermissao("financeiro"), financeiroConciliacaoRoutes);

app.get("/api/health", (_, res) => res.json({ ok: true }));

// ─── Error handler global ─────────────────────────────────────────────────────
// Captura erros não tratados nos route handlers e retorna JSON em vez de
// text/plain (que causa "Unexpected end of JSON input" no frontend).
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(`[${req.method} ${req.originalUrl}]`, err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: err.message || "Erro interno do servidor." });
});

// Vercel serverless: export the app; local dev: listen on PORT
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => console.log(`API rodando em http://localhost:${PORT}`));
}

export default app;
