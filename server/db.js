import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Usa DATABASE_URL (pooled) quando disponível; cai em DATABASE_URL_UNPOOLED
// como fallback (necessário em alguns ambientes da Vercel)
const connectionString =
  process.env.DATABASE_URL ||
  process.env.DATABASE_URL_UNPOOLED;

if (!connectionString) {
  throw new Error("Nenhuma variável DATABASE_URL ou DATABASE_URL_UNPOOLED definida.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

export default prisma;
