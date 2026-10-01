import { useState } from "react";
import { Avatar, Badge, Button, Card, DataTable, Icon, ProgressBar, SegmentedTabs, StatCard, Tag, useIsMobile } from "../../design-system";
import logoPositivo from "../../design-system/assets/logo-positivo.svg";
import logoNegativo from "../../design-system/assets/logo-negativo.svg";
import { PLANOS } from "../constants/data";

const SUPORTE_EMAIL = "suporte@construktpro.com.br";
const SUPORTE_WHATS = "(11) 9 9999-0000";

// Feature previews are built from the same design-system components the app uses.
function PreviewAlocacao() {
  const rows = [
    { id: 1, obra: "Edifício Aurora", tipo: "Máquina", ref: "Escavadeira CAT 320", qtd: "80 h" },
    { id: 2, obra: "Edifício Aurora", tipo: "Máquina", ref: "Retroescavadeira JD", qtd: "120 h" },
    { id: 3, obra: "Ponte Rio Verde", tipo: "Insumo", ref: "Cimento CP-II", qtd: "150 sc" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
        <StatCard value="R$ 63.450" label="Custo de máquinas" color="var(--stat-1)" />
        <StatCard value="R$ 18.200" label="Custo de insumos" color="var(--stat-4)" />
      </div>
      <DataTable dense minWidth={0} rows={rows} rowKey={r => r.id} columns={[
        { key: "ref", label: "Referência", render: r => <span style={{ fontWeight: "var(--fw-semibold)" }}>{r.ref}</span> },
        { key: "tipo", label: "Tipo", render: r => <Tag tone={r.tipo === "Máquina" ? "neutral" : "accent"}>{r.tipo}</Tag> },
        { key: "qtd", label: "Qtd.", align: "right" },
      ]} />
    </div>
  );
}

function PreviewEstoque() {
  const itens = [["Cimento CP-II 50kg", 72], ["Vergalhão 10mm", 45], ["Areia média m³", 91], ["Bloco cerâmico", 18]];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
        <StatCard value="R$ 48.900" label="Valor em estoque" color="var(--stat-3)" />
        <StatCard value="R$ 21.300" label="Valor consumido" color="var(--stat-4)" />
      </div>
      <Card title="Posição de estoque" padding="var(--space-4)">
        {itens.map(([nome, pct]) => (
          <div key={nome} style={{ display: "flex", flexDirection: "column", gap: "var(--space-1-5)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--fs-p5-5)" }}><span>{nome}</span><span style={{ color: "var(--text-secondary)" }}>{pct}% usado</span></div>
            <ProgressBar value={pct} color={pct > 90 ? "var(--status-danger)" : "var(--accent)"} />
          </div>
        ))}
      </Card>
    </div>
  );
}

function PreviewPessoas() {
  const rows = [
    { id: 1, nome: "Carlos Menezes", cargo: "Eletricista", dia: "R$ 210,00", status: "Ativo" },
    { id: 2, nome: "Ana Ribeiro", cargo: "Engenheira civil", dia: "R$ 480,00", status: "Ativo" },
    { id: 3, nome: "João Pereira", cargo: "Pedreiro", dia: "R$ 190,00", status: "Inativo" },
  ];
  return (
    <DataTable dense minWidth={0} rows={rows} rowKey={r => r.id} columns={[
      { key: "nome", label: "Pessoa", render: r => <span style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}><Avatar name={r.nome} size={28} /><span style={{ display: "flex", flexDirection: "column" }}><b>{r.nome}</b><span style={{ fontSize: "var(--fs-caption)", color: "var(--text-secondary)" }}>{r.cargo}</span></span></span> },
      { key: "dia", label: "Valor/dia", align: "right" },
      { key: "status", label: "Status", render: r => <Badge size="sm" tone={r.status === "Ativo" ? "success" : "neutral"}>{r.status}</Badge> },
    ]} />
  );
}

const FEATURES = [
  {
    id: "alocacao", tag: "Alocação", tone: "neutral",
    title: "Aloque máquinas, insumos e equipes por obra",
    desc: "Registre cada alocação vinculada a uma obra específica. Acompanhe custo por categoria (máquinas vs insumos), histórico de uso e observações. Controle total sobre o que está sendo consumido em cada frente.",
    bullets: ["Vínculo direto por obra", "KPIs de custo em tempo real", "Histórico completo de alocações", "Distingue máquinas de insumos"],
    screen: <PreviewAlocacao />,
  },
  {
    id: "estoque", tag: "Estoque", tone: "accent",
    title: "Posição de estoque em tempo real por obra",
    desc: "Acompanhe entrada, consumo e saldo disponível de cada insumo. Barra de progresso visual indica o percentual utilizado. Veja o valor financeiro do estoque disponível e consumido filtrado por obra.",
    bullets: ["Saldo por insumo e por obra", "Barra de consumo visual", "Valor financeiro em estoque", "Importação de NF-e (XML) em Compras"],
    screen: <PreviewEstoque />,
  },
  {
    id: "pessoas", tag: "Pessoas e equipes", tone: "success",
    title: "Gerencie equipes, prestadores e mão de obra",
    desc: "Cadastre funcionários e prestadores de serviço, vincule-os às obras em que atuam e defina o valor por dia. O custo de mão de obra é calculado automaticamente nos relatórios de cada obra.",
    bullets: ["Funcionários CLT e prestadores", "Vínculo por obra", "Custo de mão de obra por projeto", "Controle de ativação e inativação"],
    screen: <PreviewPessoas />,
  },
];

const FAQS = [
  { q: "Como funciona a alocação de máquinas?", a: "Você registra cada uso de máquina vinculado a uma obra: seleciona a máquina, informa as horas trabalhadas e a data. O sistema calcula automaticamente o custo com base no valor/hora cadastrado para cada equipamento." },
  { q: "Posso controlar o estoque de mais de uma obra ao mesmo tempo?", a: "Sim. Cada entrada de insumo é vinculada a uma obra específica. Você pode filtrar a posição de estoque por obra ou visualizar tudo consolidado no painel principal." },
  { q: "Como importar notas fiscais para o estoque?", a: "No módulo Compras, clique em 'Importar NF' e envie o arquivo XML da nota. O sistema lê os itens automaticamente e você vincula a nota a uma ordem de compra aprovada; ao confirmar, a entrada é lançada no estoque da obra com o custo de cada item." },
  { q: "Posso alocar a mesma máquina em obras diferentes?", a: "Sim. Cada registro de alocação é independente: você pode alocar a mesma máquina em múltiplas obras em datas diferentes. O histórico fica separado por obra." },
  { q: "Quem pode cadastrar usuários e definir permissões?", a: "Apenas o administrador da sua empresa pode criar, editar e desativar usuários, além de definir quais telas e obras cada colaborador pode acessar." },
  { q: "O que acontece se eu atingir o limite de usuários do meu plano?", a: "O sistema bloqueia a criação de novos usuários e exibe um aviso de limite atingido com botão de upgrade. Nenhum dado é perdido. O upgrade de plano é feito diretamente dentro do sistema." },
  { q: "Posso mudar de plano depois de contratar?", a: "Sim. A migração é feita diretamente na tela de Usuários > Alterar plano. No upgrade, o acesso é liberado imediatamente. No downgrade, os dados são preservados mas funcionalidades excedentes são limitadas." },
  { q: "Como funciona o cancelamento?", a: "Planos mensais podem ser cancelados a qualquer momento, sem multa e sem fidelidade mínima. Seus dados ficam disponíveis por 30 dias após o cancelamento para exportação. No plano anual, o cancelamento encerra o acesso ao fim do período já pago, sem reembolso proporcional." },
  { q: "Meus dados ficam seguros após o cancelamento?", a: "Todos os dados são isolados por empresa. Após o cancelamento, você tem 30 dias para exportar relatórios e dados. Após esse prazo, os dados são removidos." },
  { q: "O sistema funciona no celular?", a: "Sim. A interface se adapta ao celular com navegação inferior e menu lateral. Para uso intensivo em campo, tablets ou notebooks aproveitam melhor painéis e tabelas com muitas colunas." },
];

function SectionTitle({ tag, icon, title, sub }) {
  return (
    <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-10)" }}>
      <Tag tone="neutral"><Icon name={icon} size={14} />{tag}</Tag>
      <h2 style={{ margin: 0, fontSize: "var(--fs-h2)", fontWeight: "var(--fw-extrabold)", lineHeight: "var(--lh-tight)" }}>{title}</h2>
      {sub && <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "var(--fs-p4)", maxWidth: "var(--content-w-sm)" }}>{sub}</p>}
    </div>
  );
}

export default function PlanosPage({ onEscolher, onLogin }) {
  const mobile = useIsMobile();
  const [ciclo, setCiclo] = useState("mensal");
  const [faqOpen, setFaqOpen] = useState(null);
  const anual = ciclo === "anual";
  const scrollTo = id => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  const gutter = mobile ? "var(--space-4)" : "var(--space-12)";
  const section = { maxWidth: "var(--content-w-xl)", margin: "0 auto", padding: `var(--space-12) ${gutter}` };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-app)" }}>
      <nav style={{ position: "sticky", top: 0, zIndex: "var(--z-nav)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)", padding: `var(--space-3) ${gutter}`, background: "var(--surface-card)", borderBottom: "var(--border-w) solid var(--border-default)" }}>
        <img src={logoPositivo} alt="ConstruktPro" style={{ height: mobile ? "var(--space-7)" : "var(--space-9)" }} />
        {!mobile && (
          <div style={{ display: "flex", gap: "var(--space-1)" }}>
            {[["Funcionalidades", "sec-features"], ["Planos", "sec-pricing"], ["Dúvidas", "sec-faq"]].map(([label, id]) => (
              <Button key={id} variant="ghost" size="sm" onClick={() => scrollTo(id)}>{label}</Button>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          {!mobile && <Button variant="secondary" size="sm" onClick={onLogin}>Entrar</Button>}
          <Button variant="accent" size="sm" iconLeft="eye" onClick={onLogin}>Acessar demo</Button>
        </div>
      </nav>

      <header style={{ ...section, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-6)" }}>
        <Tag tone="accent" dot>Do canteiro ao escritório</Tag>
        <h1 style={{ margin: 0, fontSize: mobile ? "var(--fs-h2)" : "var(--fs-h1)", fontWeight: "var(--fw-extrabold)", lineHeight: "var(--lh-tight)", maxWidth: "var(--content-w-md)" }}>
          Controle total da sua obra, <span style={{ color: "var(--text-accent)" }}>do início ao fim</span>
        </h1>
        <p style={{ margin: 0, fontSize: "var(--fs-p3)", color: "var(--text-secondary)", maxWidth: "var(--content-w-sm)", lineHeight: "var(--lh-body)" }}>
          Estoque, alocação de máquinas, equipes e relatórios em um só lugar. Sem planilhas, sem retrabalho.
        </p>
        <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", justifyContent: "center" }}>
          <Button variant="accent" size="lg" iconLeft="eye" onClick={onLogin}>Acessar demo gratuita</Button>
          <Button variant="secondary" size="lg" iconRight="chevron-down" onClick={() => scrollTo("sec-features")}>Ver funcionalidades</Button>
        </div>
        <span style={{ fontSize: "var(--fs-p6)", color: "var(--text-secondary)" }}>Dados de demonstração pré-carregados · Sem cadastro necessário</span>
      </header>

      <section id="sec-features" style={section}>
        <SectionTitle tag="Funcionalidades" icon="layout-grid" title="Tudo que sua obra precisa" sub="As prévias abaixo usam os mesmos componentes do sistema." />
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-12)" }}>
          {FEATURES.map((f, i) => (
            <div key={f.id} style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: mobile ? "var(--space-6)" : "var(--space-12)", alignItems: "center" }}>
              <div style={{ order: !mobile && i % 2 ? 2 : 1, display: "flex", flexDirection: "column", gap: "var(--space-4)", alignItems: "flex-start" }}>
                <Tag tone={f.tone} dot>{f.tag}</Tag>
                <h3 style={{ margin: 0, fontSize: "var(--fs-h4)", fontWeight: "var(--fw-bold)", lineHeight: "var(--lh-snug)" }}>{f.title}</h3>
                <p style={{ margin: 0, color: "var(--text-secondary)", lineHeight: "var(--lh-body)" }}>{f.desc}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  {f.bullets.map(b => <span key={b} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}><Icon name="check" size={16} color="var(--status-success)" />{b}</span>)}
                </div>
              </div>
              <div style={{ order: !mobile && i % 2 ? 1 : 2, background: "var(--surface-sunken)", borderRadius: "var(--radius-xl)", padding: "var(--space-5)", boxShadow: "var(--shadow-raised)" }}>
                {f.screen}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="sec-pricing" style={section}>
        <SectionTitle tag="Planos e preços" icon="wallet" title="Preços flexíveis para construtoras de todo porte" sub="Sem taxas ocultas. Cancele quando quiser." />
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "var(--space-8)" }}>
          <SegmentedTabs variant="light" value={ciclo} onChange={setCiclo} tabs={[{ value: "mensal", label: "Mensal" }, { value: "anual", label: "Anual −20%" }]} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(var(--col-min-md), 1fr))", gap: "var(--space-6)", alignItems: "start" }}>
          {PLANOS.map(p => {
            const preco = anual ? p.preco.anual : p.preco.mensal;
            return (
              <Card key={p.id} selected={!!p.popular} padding="var(--space-6)" title={p.nome}
                action={p.popular ? <Badge tone="accent" size="sm">Mais escolhido</Badge> : null}>
                <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "var(--fs-p5-5)" }}>{p.desc}</p>
                <div>
                  <span style={{ font: "var(--type-stat)", fontSize: "var(--fs-h2)", color: "var(--text-primary)" }}>R$ {preco}</span>
                  <span style={{ color: "var(--text-secondary)" }}> /mês</span>
                  <div style={{ fontSize: "var(--fs-p6)", marginTop: "var(--space-1)", color: anual ? "var(--status-success)" : "var(--text-secondary)", fontWeight: anual ? 600 : 500 }}>
                    {anual ? `Economia de R$ ${(p.preco.mensal - p.preco.anual) * 12}/ano` : `ou R$ ${p.preco.anual}/mês no anual`}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  {p.features.map(ff => <span key={ff} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--fs-p5-5)" }}><Icon name="check" size={14} color="var(--status-success)" />{ff}</span>)}
                </div>
                <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                  {p.suporte.includes("email") && <Tag tone="neutral"><Icon name="mail" size={14} />E-mail</Tag>}
                  {p.suporte.includes("whatsapp") && <Tag tone="success"><Icon name="message-circle" size={14} />WhatsApp</Tag>}
                </div>
                <Button fullWidth variant={p.popular ? "accent" : "primary"} iconRight="arrow-right" onClick={() => onEscolher(p.id)}>Começar agora</Button>
              </Card>
            );
          })}
        </div>
        {anual && <p style={{ textAlign: "center", marginTop: "var(--space-6)", fontSize: "var(--fs-p6)", color: "var(--text-secondary)" }}>Valores cobrados anualmente. Sem renovação automática sem aviso prévio.</p>}
      </section>

      <section id="sec-faq" style={{ ...section, maxWidth: "var(--content-w-md)" }}>
        <SectionTitle tag="Dúvidas frequentes" icon="info" title="Tudo que você precisa saber" />
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          {FAQS.map((f, i) => {
            const open = faqOpen === i;
            return (
              <Card key={i} padding="var(--space-4) var(--space-5)" onClick={() => setFaqOpen(open ? null : i)} selected={open}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-4)" }}>
                  <span style={{ fontWeight: open ? 700 : 600, fontSize: "var(--fs-p4)" }}>{f.q}</span>
                  <Icon name={open ? "chevron-up" : "chevron-down"} size={18} color="var(--text-secondary)" />
                </div>
                {open && <p style={{ margin: 0, color: "var(--text-secondary)", lineHeight: "var(--lh-body)" }}>{f.a}</p>}
              </Card>
            );
          })}
        </div>
        <Card padding="var(--space-6)" style={{ marginTop: "var(--space-10)", flexDirection: mobile ? "column" : "row", alignItems: mobile ? "flex-start" : "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ font: "var(--type-card-title)" }}>Ainda tem dúvidas?</div>
            <div style={{ color: "var(--text-secondary)", marginTop: "var(--space-1)" }}>Fale com a gente por e-mail ou WhatsApp. Respondemos em até 24h.</div>
          </div>
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
            <Tag tone="neutral"><Icon name="mail" size={14} />{SUPORTE_EMAIL}</Tag>
            <Tag tone="success"><Icon name="message-circle" size={14} />{SUPORTE_WHATS}</Tag>
          </div>
        </Card>
      </section>

      <footer style={{ background: "var(--surface-sidebar)", color: "var(--text-on-sidebar)", padding: `var(--space-8) ${gutter}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-6)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
          <img src={logoNegativo} alt="ConstruktPro" style={{ height: "var(--space-8)" }} />
          <span style={{ fontSize: "var(--fs-p6)", color: "var(--text-on-sidebar-muted)" }}>© {new Date().getFullYear()}</span>
        </div>
        <div style={{ display: "flex", gap: "var(--space-6)", flexWrap: "wrap", fontSize: "var(--fs-p6)", color: "var(--text-on-sidebar-muted)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}><Icon name="mail" size={14} />{SUPORTE_EMAIL}</span>
          <span style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}><Icon name="message-circle" size={14} />WhatsApp: {SUPORTE_WHATS}</span>
        </div>
        <Button variant="accent" size="sm" iconLeft="eye" onClick={onLogin}>Acessar demo</Button>
      </footer>
    </div>
  );
}
