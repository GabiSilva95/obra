import { test } from "node:test";
import assert from "node:assert/strict";
import { validarAnexo } from "./anexo.js";
import { ErroNegocio } from "../financeiro/erro.js";

const b64 = bytes => Buffer.from(bytes).toString("base64");
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3];

test("anexo: aceita imagem e PDF de verdade e devolve o tipo pela extensão", () => {
  const png = validarAnexo({ nome: "print da tela.PNG", mimeType: "text/html", dados: b64(PNG) });
  assert.equal(png.mimeType, "image/png", "não confia no tipo que o navegador mandou");
  assert.equal(png.nome, "print da tela.PNG");
  assert.equal(png.tamanho, PNG.length);
  assert.equal(validarAnexo({ nome: "nota.pdf", dados: b64(Buffer.from("%PDF-1.7 teste")) }).mimeType, "application/pdf");
  assert.equal(validarAnexo({ nome: "dados.csv", dados: b64(Buffer.from("a;b\n1;2")) }).mimeType, "text/csv");
  assert.equal(validarAnexo(null), null);
  assert.equal(validarAnexo(undefined), null);
});

test("anexo: recusa extensão fora da lista, conteúdo que não bate, vazio e grande demais", () => {
  const recusa = (anexo, trecho) => assert.throws(() => validarAnexo(anexo), e => e instanceof ErroNegocio && e.message.includes(trecho));
  recusa({ nome: "virus.exe", dados: b64([1, 2, 3]) }, "Tipo de arquivo não aceito");
  recusa({ nome: "pagina.html", dados: b64(Buffer.from("<script>")) }, "Tipo de arquivo não aceito");
  recusa({ nome: "desenho.svg", dados: b64(Buffer.from("<svg onload=alert(1)>")) }, "Tipo de arquivo não aceito");
  recusa({ nome: "foto.png", dados: b64(Buffer.from("<html>isso não é png</html>")) }, "não é do tipo");
  recusa({ nome: "doc.pdf", dados: b64([1, 2, 3, 4, 5]) }, "não é do tipo");
  recusa({ nome: "foto.png", dados: "" }, "Anexo inválido");
  recusa({ nome: "foto.png", dados: "isso não é base64!!" }, "Anexo inválido");
  recusa({ nome: "", dados: b64(PNG) }, "Anexo inválido");
  const grande = Buffer.concat([Buffer.from(PNG), Buffer.alloc(3 * 1024 * 1024)]);
  recusa({ nome: "grande.png", dados: grande.toString("base64") }, "passa de 3 MB");
});

test("anexo: o nome não carrega caminho nem caracteres perigosos", () => {
  assert.equal(validarAnexo({ nome: "../../etc/passwd.txt", dados: b64(Buffer.from("x")) }).nome, "passwd.txt");
  assert.equal(validarAnexo({ nome: 'a"b<c>.txt', dados: b64(Buffer.from("x")) }).nome, "a_b_c_.txt");
  assert.equal(validarAnexo({ nome: "relatório março (v2).txt", dados: b64(Buffer.from("x")) }).nome, "relatório março (v2).txt");
});
