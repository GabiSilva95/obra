import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const EMAIL = "admin@teste.com";
  const SENHA = "admin123";
  const CNPJ  = "00.000.000/0001-00";

  // Verifica se o tenant de demo já existe pelo CNPJ ou email
  let tenant = await prisma.tenant.findFirst({
    where: { OR: [{ cnpj: CNPJ }, { email: EMAIL }] },
  });

  if (!tenant) {
    console.log("Criando tenant de demonstração...");
    const hash = await bcrypt.hash(SENHA, 10);
    tenant = await prisma.tenant.create({
      data: {
        razaoSocial: "Empresa Demonstração",
        cnpj: CNPJ,
        email: EMAIL,
        plano: "pro",
        users: {
          create: {
            nome: "Admin Demo",
            email: EMAIL,
            senha: hash,
            role: "tenant_admin",
          },
        },
      },
    });
    console.log("✅ Tenant de demo criado:", tenant.id);
  } else {
    // Garante que a senha está correta (atualiza caso tenha mudado)
    const hash = await bcrypt.hash(SENHA, 10);
    await prisma.user.updateMany({
      where: { tenantId: tenant.id, email: EMAIL },
      data: { senha: hash, ativo: true },
    });
    console.log("✅ Credenciais de demo atualizadas para tenant:", tenant.id);
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
