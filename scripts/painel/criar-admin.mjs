// Cria (ou redefine) o administrador do painel interno. Não existe cadastro público da equipe.
//
//   node --env-file=.env scripts/painel/criar-admin.mjs --email voce@empresa.com --nome "Seu Nome"
//   node --env-file=.env scripts/painel/criar-admin.mjs --email voce@empresa.com --redefinir   (troca a senha de quem já existe)
//
// A senha é digitada na hora (não aparece na tela) ou vem de PAINEL_SENHA. Nunca a escreva em arquivo do repositório.
// O banco é o mesmo da produção: o administrador criado aqui já vale no painel publicado.
import bcrypt from "bcryptjs";
import prisma from "../../server/db.js";
import { IDS_PERMISSOES, PAPEL_ADMIN, validarSenhaEquipe } from "../../server/config/painel.js";

const args = process.argv.slice(2);
const valor = nome => { const i = args.indexOf(`--${nome}`); return i > -1 ? args[i + 1] : undefined; };
const email = String(valor("email") ?? "").trim().toLowerCase();
const nome = String(valor("nome") ?? "").trim();
const redefinir = args.includes("--redefinir");

const falhar = msg => { console.error(`\n${msg}\n`); process.exit(1); };
if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) falhar("Informe um e-mail válido: --email voce@empresa.com");

/** Lê a senha sem mostrá-la. */
function lerSenhaOculta(pergunta) {
  return new Promise(resolve => {
    process.stdout.write(pergunta);
    const { stdin } = process;
    if (!stdin.isTTY) { let t = ""; stdin.on("data", d => { t += d; if (t.includes("\n")) { stdin.pause(); resolve(t.trim()); } }); return; }
    stdin.setRawMode(true); stdin.resume(); stdin.setEncoding("utf8");
    let senha = "";
    const aoTeclar = c => {
      if (c === "\u0003") { process.stdout.write("\n"); process.exit(130); }
      if (c === "\r" || c === "\n") { stdin.setRawMode(false); stdin.pause(); stdin.off("data", aoTeclar); process.stdout.write("\n"); return resolve(senha); }
      if (c === "\u007f") { senha = senha.slice(0, -1); return; }
      senha += c;
    };
    stdin.on("data", aoTeclar);
  });
}

const existente = await prisma.equipeUsuario.findUnique({ where: { email } });
if (existente && !redefinir) falhar(`${email} já está na equipe. Use --redefinir para trocar a senha.`);
if (!existente && !nome) falhar('Informe o nome: --nome "Seu Nome"');
if (existente && redefinir && existente.papel !== PAPEL_ADMIN) falhar(`${email} existe, mas não é administrador. Altere pela tela Equipe do painel.`);

const senha = process.env.PAINEL_SENHA || await lerSenhaOculta("Senha do administrador (mínimo 10 caracteres): ");
const erro = validarSenhaEquipe(senha);
if (erro) falhar(erro);
const hash = await bcrypt.hash(senha, 12);

if (existente) {
  await prisma.equipeUsuario.update({ where: { id: existente.id }, data: { senha: hash, trocarSenha: false, ativo: true } });
  await prisma.equipeRefreshToken.updateMany({ where: { equipeId: existente.id, revogado: false }, data: { revogado: true } });
  await prisma.auditoriaEquipe.create({ data: { equipeId: existente.id, acao: "senha_redefinida_por_script", alvoTipo: "equipe", alvoId: String(existente.id) } });
  console.log(`\nSenha de ${email} redefinida. As sessões abertas foram encerradas.`);
} else {
  const criado = await prisma.equipeUsuario.create({ data: { nome, email, senha: hash, papel: PAPEL_ADMIN, permissoes: IDS_PERMISSOES, trocarSenha: false } });
  await prisma.auditoriaEquipe.create({ data: { equipeId: criado.id, acao: "administrador_criado_por_script", alvoTipo: "equipe", alvoId: String(criado.id), detalhe: email } });
  console.log(`\nAdministrador criado: ${nome} <${email}>. Entre no painel com esse e-mail e a senha digitada.`);
}
await prisma.$disconnect();
