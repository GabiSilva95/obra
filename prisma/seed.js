import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { popularDadosReferencia, TIPOS_ETAPA } from "../server/config/dadosReferencia.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const EMAIL = "admin@teste.com";
  const SENHA = "admin123";
  const CNPJ  = "00.000.000/0001-00";

  // ── Tenant de demonstração ──────────────────────────────────────────────────
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
          create: { nome: "Admin Demo", email: EMAIL, senha: hash, role: "tenant_admin" },
        },
      },
    });
    console.log("✅ Tenant de demo criado:", tenant.id);
  } else {
    const hash = await bcrypt.hash(SENHA, 10);
    // Atualiza credenciais E corrige o plano (pode estar como "professional"
    // vindo do frontend, que o backend não reconhecia antes do alias fix)
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { plano: "pro" },
    });
    await prisma.user.updateMany({
      where: { tenantId: tenant.id, email: EMAIL },
      data: { senha: hash, ativo: true },
    });
    console.log("✅ Credenciais e plano de demo atualizados para tenant:", tenant.id);
  }

  // ── Dados de referência (mesma fonte usada no registro) ─────────────────────
  console.log("\nPopulando dados de referência...");
  const r = await popularDadosReferencia(prisma, tenant.id);
  console.log(`  ✅ Categorias de máquina: ${r.categorias} criadas`);
  console.log(`  ✅ Tipos de etapa: ${r.tiposEtapa} criados`);
  console.log(`  ✅ Insumos padrão: ${r.insumos} criados`);

  // Preenche tempoPadrao em tipos de etapa que já existiam sem ele — sem isso o
  // cronograma em cascata não tem duração para calcular.
  let atualizados = 0;
  for (const [nome, ordem, tempoPadrao] of TIPOS_ETAPA) {
    const res = await prisma.tipoEtapa.updateMany({
      where: { tenantId: tenant.id, nome, OR: [{ tempoPadrao: null }, { ordem: null }] },
      data: { tempoPadrao, ordem },
    });
    atualizados += res.count;
  }
  if (atualizados > 0) console.log(`  ✅ Tempo padrão preenchido em ${atualizados} etapas existentes`);

  console.log("\n🎉 Seed concluído!");
  console.log(`   Tenant: ${tenant.id}`);
  console.log(`   Login:  ${EMAIL} / ${SENHA}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
