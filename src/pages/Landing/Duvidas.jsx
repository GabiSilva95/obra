import { Icon } from "../../../design-system";
import { Carimbo, Prancha, Titulo } from "./visual";
import { DIAS_TESTE, SEM_IMPLANTACAO } from "./oferta";

// As objeções de quem nunca usou um sistema de obra. Respostas curtas e verdadeiras.
const DUVIDAS = [
  SEM_IMPLANTACAO.duvida,
  { q: "Preciso entender de computador?", a: "Não. Se você usa WhatsApp, usa o ConstruktPro. Na primeira entrada um tour mostra o caminho, e cada tela tem um vídeo curto explicando o que preencher." },
  { q: "Funciona no celular?", a: "Sim. A tela se ajusta ao celular para lançar compra, baixa de material e diário direto do canteiro. No computador você vê tudo com mais espaço." },
  { q: "Preciso instalar alguma coisa?", a: "Não. Abre no navegador do celular ou do computador. No celular dá para colocar um atalho na tela inicial, como um aplicativo." },
  { q: "Como funciona o teste grátis?", a: `São ${DIAS_TESTE} dias com o plano que você escolher, sem cartão de crédito. No fim, você decide se continua e escolhe um plano. Seus dados ficam guardados.` },
  { q: "Já uso planilha. Perco o que tenho?", a: "Você cadastra as obras em andamento e segue daqui pra frente. A nota fiscal (XML) das compras entra sozinha, sem digitar item por item." },
  { q: "Meus dados ficam seguros?", a: "Os dados de cada empresa ficam separados das outras, e cada pessoa da sua equipe só vê as telas e as obras que você liberar." },
  { q: "Posso cancelar quando quiser?", a: "Sim. Os planos mensais não têm multa nem fidelidade. Depois do cancelamento, seus dados ficam disponíveis por 30 dias para exportar." },
  { q: "E se eu precisar de mais obras ou usuários?", a: "Você muda de plano dentro do próprio sistema, em Usuários, e o acesso novo é liberado na hora." },
];

/** Dúvidas: acordeão nativo (details/summary), acessível e legível por buscadores. */
export default function Duvidas() {
  return (
    <Prancha id="duvidas" papel largura="var(--content-w-md)">
      <Carimbo numero={8}>Dúvidas</Carimbo>
      <Titulo>Antes de testar, você pode estar pensando:</Titulo>
      <div style={{ display: "flex", flexDirection: "column", background: "var(--surface-card)", border: "var(--border-w) solid var(--border-default)", borderRadius: "var(--radius-lg)", padding: "0 var(--space-5)" }}>
        {DUVIDAS.map((d, i) => (
          <details key={d.q} className="lp-faq" open={i === 0} style={{ borderTop: i ? "var(--border-w) solid var(--border-subtle)" : undefined, padding: "var(--space-4) 0" }}>
            <summary style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-4)", fontSize: "var(--fs-p3)", fontWeight: "var(--fw-extrabold)" }}>
              {d.q}<Icon name="chevron-down" size={20} color="var(--text-muted)" className="lp-faq-seta" style={{ flexShrink: 0 }} />
            </summary>
            <p style={{ marginTop: "var(--space-2)", fontSize: "var(--fs-p4)", fontWeight: "var(--fw-medium)", lineHeight: "var(--lh-body)", color: "var(--text-muted)" }}>{d.a}</p>
          </details>
        ))}
      </div>
    </Prancha>
  );
}
