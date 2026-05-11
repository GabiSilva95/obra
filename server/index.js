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
import { authMiddleware } from "./middleware/auth.js";

const app = express();
const PORT = process.env.PORT || 3001;

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
app.use(express.json());

app.use("/api/auth", authRoutes);

app.use(authMiddleware);
app.use("/api/obras", obrasRoutes);
app.use("/api/cadastros", cadastrosRoutes);
app.use("/api/estoque", estoqueRoutes);
app.use("/api/alocacao", alocacaoRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/diario", diarioRoutes);
app.use("/api/receitas", receitasRoutes);
app.use("/api/compras", comprasRoutes);

app.get("/api/health", (_, res) => res.json({ ok: true }));

// Vercel serverless: export the app; local dev: listen on PORT
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => console.log(`API rodando em http://localhost:${PORT}`));
}

export default app;
