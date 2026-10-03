// Hook PostToolUse do Claude Code (.claude/settings.json): depois de editar uma tela, avisa o agente
// se a Central de treinamentos ficou desatualizada (campos sem descrição, vídeo antigo, menu sem módulo).
import { readFileSync } from "node:fs";
import { verificar } from "./verificar.mjs";

let entrada = {};
try { entrada = JSON.parse(readFileSync(0, "utf8")); } catch {}
const arquivo = entrada.tool_input?.file_path || entrada.tool_response?.filePath || "";
if (!/\/src\/(pages|components|tour|treinamentos)\//.test(arquivo)) process.exit(0);

const problemas = verificar();
if (!problemas.length) process.exit(0);

console.log(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: "PostToolUse",
    additionalContext:
      `Central de treinamentos desatualizada após editar ${arquivo}:\n- ${problemas.join("\n- ")}\n` +
      "Antes de encerrar: atualize src/treinamentos/conteudo.js (passos e campos) e o roteiro em scripts/treinamentos/roteiros.mjs, " +
      "e regrave o vídeo do módulo com `npm run treinamentos:gravar -- --so <id>` (com `npm run dev` rodando).",
  },
}));
