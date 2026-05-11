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

app.use(cors({ origin: "http://localhost:3000", credentials: true }));
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

app.listen(PORT, () => console.log(`API rodando em http://localhost:${PORT}`));
