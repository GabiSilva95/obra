import crypto from "node:crypto";

// Sem 0, O, 1, l, I: a senha provisória é lida e digitada por uma pessoa
const LETRAS = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
const NUMEROS = "23456789";
const SIMBOLOS = "#$%&*+=?";

/** Senha provisória de 14 caracteres com letras, números e um símbolo (passa em validarSenhaEquipe). */
export function senhaTemporaria() {
  const pick = alfabeto => alfabeto[crypto.randomInt(alfabeto.length)];
  const base = [pick(NUMEROS), pick(NUMEROS), pick(SIMBOLOS), ...Array.from({ length: 11 }, () => pick(LETRAS + NUMEROS))];
  for (let i = base.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [base[i], base[j]] = [base[j], base[i]]; }
  return base.join("");
}
