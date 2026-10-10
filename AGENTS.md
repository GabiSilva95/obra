# AGENTS.md

Instructions for coding agents working in this repository. Project overview, API routes and deploy steps are in `README.md`.

## Project

ConstruktPro — multi-tenant SaaS for construction management. React 18 + Vite 5 (frontend, `src/`), Express 5 + Prisma 7 on Neon Postgres (backend, `server/`), deployed on Vercel. UI copy is Brazilian Portuguese.

## Commands

- `npm run dev` — API on :3002 + Vite on :3000 (proxy `/api`)
- `npm run build` — production build
- `npm run typecheck` — TypeScript check of `design-system/`
- `npm run lint` — oxlint, including the design-system adherence rules
- `npm run lint:design` — validates `DESIGN.md` (Google Labs `design.md` linter)
- `npm run painel:admin -- --email ... --nome ...`: creates the first admin of the staff panel (see "Painel interno da equipe")

## Tour and training center — rules

- **First-steps tour:** `src/tour/primeirosPassos.js` (steps) + DS `Tour`. It opens on every login until the user checks "Não mostrar novamente" (`User.ocultarTour`, `PATCH /api/me/preferencias`).
- **Training center** (`/app/treinamentos`): content lives in `src/treinamentos/conteudo.js` (one module per screen/flow: steps + every form field), videos in `public/treinamentos/<id>.webm`, recorded by `scripts/treinamentos/roteiros.mjs` (never save data in a script).
- **Whenever you create or change a screen, field or flow:** update the module in `conteudo.js`, its script in `roteiros.mjs`, the tour steps if the menu changed, then run `npm run treinamentos:gravar -- --so <id>` (with `npm run dev` running) and `npm run treinamentos:verificar` until it is clean. A PostToolUse hook (`.claude/settings.json`) reports what is out of date after each edit in `src/`.

## Financeiro — rules

- **Competência não é caixa.** Custo e faturamento da obra vêm de `Despesa`, `Receita`, `ConsumoInsumo`, `Alocacao` e `ApontamentoMO` (`calcCustoObra`, `src/utils/helpers.js`). Contas a pagar e a receber são `Titulo` (caixa). Compra, diárias e locação geram título mas **não** custo (já apropriado): nunca crie uma `Despesa` para elas. Despesa e receita novas entram por `POST /api/financeiro/documentos`, que cria o título, o rateio e as linhas de custo juntos.
- **Dinheiro em centavos.** Tabelas novas usam `Decimal(14,2)`; toda conta de parcela, rateio e saldo usa `server/financeiro/dinheiro.js` (o front importa o mesmo arquivo, para a prévia ser o que será gravado). Nunca some `Float` em reais.
- **Datas** em `AAAA-MM-DD` no fuso de São Paulo: `hojeBR()` (servidor) e `today()` (front). Nunca `new Date().toISOString()` para "hoje".
- **Permissão `financeiro`** em `/api/financeiro` (`requirePermissao`, lê do banco, não do token). Escritas de `/despesas` e `/receitas` também a exigem; as leituras ficam abertas porque o custo aparece em outras telas.
- **Banco compartilhado com a produção.** Só `prisma db push` aditivo; rode antes `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` e confira que não há `DROP`.
- **Avisos:** salvamentos rotineiros do Financeiro não abrem pop-up de sucesso (só fecham o modal e atualizam a lista); erros e confirmações usam `aviso.js`.
- **Testes:** `npm test` (regras puras) e `npm run financeiro:e2e` (API contra a conta demo, limpando o que cria). Mexeu em regra de dinheiro ou em rota do financeiro? Rode os dois.

## Início (painel) — rules

- **Três seções, cada uma abre com um card de números:** Obras (cronograma e orçamento), Financeiro (contas a pagar, a receber e fluxo de caixa) e Estoque (posição do estoque e compras). Depois delas vem o card de cada obra. Estrutura em `src/pages/Dashboard/` (`Secao.jsx` é a base; uma `Secao*.jsx` por área).
- **Número novo entra em `indicadores.js`** (funções puras, com teste em `indicadores.test.js`, rodado por `npm test`), nunca calculado dentro do JSX. Custo da obra continua vindo de `calcCustoObra`.
- **Filtro de obra** vale para Obras e Estoque. O Financeiro é sempre da empresa toda (a etiqueta da seção avisa quando há filtro).
- **Permissão:** a seção Financeiro só aparece e só chama `/api/financeiro` com a permissão `financeiro`; Estoque (com Compras) exige `estoque`. `resumoFin` do `App.jsx` é `null` carregando e `false` se falhou.
- **Valor em estoque** usa o custo do lote, igual à tela de Estoque (cai no custo do cadastro se o lote não tem).

## Suporte (cliente) — rules

- **Uma tabela, dois canais:** `Ticket` guarda o chamado (`canal: "ticket"`) e o chat ao vivo (`canal: "chat"`). O `id` autoincremento é o número do chamado e a ordem de solicitação. Telas em `src/pages/Suporte/`; a janela do chat é `src/components/ChatSuporte.jsx`, montada no shell do `App.jsx` para acompanhar o cliente pelas telas.
- **Regra de fila só em `server/suporte/fila.js`** (funções puras, com teste): urgente primeiro e depois ordem de chegada nos chamados; chat estritamente por chegada; capacidade de 3 chats por atendente; prazo de resposta por plano. Nunca reimplemente a ordem na rota ou na tela. Textos de setor, prioridade e status ficam em `server/config/suporte.js`, que o front importa.
- **Atribuir sempre em transação** com `FOR UPDATE` na linha do atendente e `FOR UPDATE SKIP LOCKED` no chamado (`assumirProximo`): dois cliques nunca pegam o mesmo cliente. Furar a fila é só para `suporte_supervisor` e fica na auditoria (`fila_furada`).
- **Sem WebSocket** (a API é função da Vercel): o chat consulta a cada 3 s com a janela visível e 15 s em segundo plano, e isso é o sinal de presença. A varredura `manutencaoChat` tira da fila o cliente sumido (60 s na fila, 300 s em conversa) e devolve à fila, na posição original, o chat cujo atendente sumiu (90 s).
- **Nota interna nunca vai ao cliente:** o filtro `interna: false` está na consulta do banco, não na tela. Anexo: base64 até 3 MB, bytes iniciais conferidos, entregue como download com `nosniff`.
- **Mexeu em Suporte?** Atualize o módulo `suporte` em `conteudo.js`, o roteiro em `roteiros.mjs` e regrave. Teste: `npm test`, `node --env-file=.env scripts/painel/e2e-suporte.mjs` e `scripts/painel/ui-suporte.mjs` (criam e apagam a própria empresa e equipe). `SUPORTE_HORARIO_TESTE=sempre|nunca` fixa o horário do chat só em teste.
- **E-mail do chamado só aparece onde está ligado.** A landing e os planos não prometem e-mail nem WhatsApp (há um teste); a tela do cliente só cita e-mail quando `/suporte/config` diz `email.ativo` (ver "E-mail do chamado — rules").

## Painel interno da equipe — rules

- **Painel e clientes são dois mundos.** Prisma ignora um filtro `undefined` e devolveria todas as empresas, então um token da equipe jamais pode chegar a uma rota do cliente: chave própria (`server/painel/token.js`, derivada de `JWT_SECRET` ou `JWT_SECRET_EQUIPE`), audiência `painel`, `tipo: "equipe"`, e o `authMiddleware` do cliente recusa esse tipo. O painel é montado antes da autenticação do cliente em `server/index.js`. Rota nova do painel nunca lê `tenantId` do token: a empresa vem do recurso pedido.
- **Permissão lida do banco a cada chamada** (`server/painel/middleware.js`), nunca do token. Regras puras em `server/painel/guardas.js` (importáveis em teste sem `DATABASE_URL`) e catálogo em `server/config/painel.js`, que o front também importa.
- **Mesmo app, outro host:** `src/main.jsx` carrega `src/painel/PainelApp.jsx` (lazy) quando o host começa com `painel.` (`src/painel/host.js`). Local: `http://painel.localhost:3000`. Com `PAINEL_HOST` definido, `/api/painel/*` só responde nesse host. Não existe link para o painel em nenhuma tela do cliente, nem cadastro público.
- **Toda ação da equipe vai para `AuditoriaEquipe`** (`server/painel/auditoria.js`); a auditoria do cliente exige `tenantId` e não serve aqui.
- **Interface:** mesma biblioteca do design system. O painel não entra na Central de treinamentos nem no tour. Telas em `src/painel/paginas/`, menu e permissões em `src/painel/menu.js`. **A Visão geral é a primeira do menu** (pedido da Gabriella) e a primeira tela que a pessoa pode ver é a que abre ao entrar: mexeu na ordem do menu? Atualize os testes de interface que esperam a tela de entrada.
- **Limitadores:** o do chat fica depois da autenticação da equipe (por pessoa, não por IP), para um escritório inteiro atrás do mesmo IP não se bloquear.
- **Primeiro administrador:** `npm run painel:admin -- --email ... --nome ...` (senha digitada na hora). Os demais, pela tela Equipe, com senha provisória mostrada uma vez.
- **Testes:** `node --env-file=.env scripts/painel/e2e.mjs` (isolamento entre os mundos, permissões, senha, auditoria) e `scripts/painel/ui-smoke.mjs`. Mexeu em token, middleware ou rota do painel? Rode os dois.
- **Fases ainda por fazer** (ver o plano): e-mail no chamado, visão geral do painel e o gateway de pagamento real. Cobrança e assinatura: ver "Assinatura e cobrança — rules".

## Stripe e e-mail do chamado — rules

- **Stripe (`server/pagamentos/stripe.js`, `server/cobranca/gateway.js`):** a Stripe é a fonte da verdade das faturas de quem ela cobra (`Assinatura.gateway = "stripe"`). As faturas **entram por webhook** e viram `Cobranca`; a equipe **não** paga, estorna, cancela nem cria cobrança à mão para essas empresas (`exigirManual`), e "Gerar cobranças do mês" as ignora. As funções de sincronização **só andam para a frente** (aviso atrasado nunca desfaz pagamento) e leem o objeto de fatura nos formatos antigo e novo da API (`subscription` e `parent.subscription_details`). Empresa de um evento vem do `gatewayClienteId` guardado ou do `tenantId` nos metadados da assinatura. Motivo de status vindo da Stripe começa com `"Stripe: "`: só esse tipo de suspensão é desfeita por pagamento.
- **Abrir o Checkout não ativa nada;** só a fatura paga ativa. Plano, ciclo e empresa viajam nos metadados da assinatura. Trocar plano pelo painel de uma empresa do Stripe atualiza a assinatura lá **antes** de mudar aqui (falhou? nada muda).
- **Pix Automático não existe para conta Stripe no Brasil** (documentação de out/2026): recorrência é no cartão. Não prometa recorrência por Pix ou boleto.
- **E-mail (`server/email/`):** nada de HTML do usuário em e-mail (só texto); assunto sem quebra de linha (injeção de cabeçalho); o endereço de resposta de cada chamado é assinado (`enderecoDoChamado`); **só** o texto novo entra na resposta recebida (`removerCitacao`); quem responde é quem abriu o chamado ou o administrador **da mesma empresa**; respostas automáticas nunca entram (`ehRespostaAutomatica`); o aviso do Resend é conferido sobre o corpo exato (Svix) e a mesma mensagem nunca entra duas vezes. Falha de envio nunca derruba a ação (`emailStatus`). Nota interna e chat nunca vão por e-mail.
- **Conferir a configuração com as contas de verdade:** `npm run config:verificar` (`scripts/configuracao/verificar.mjs`, regras puras em `server/config/verificacao.js`). Só lê, nunca imprime chave; `--enviar` manda um e-mail de teste e `--checkout` cria uma sessão de teste (recusa chave que não seja `sk_test_`). Mexeu em evento do Stripe (`EVENTOS_STRIPE`), em rota de webhook ou em variável de ambiente? Atualize a conferência junto.
- **Testes sem rede:** `e2e-email.mjs` e `e2e-stripe.mjs` sobem um Resend e um Stripe de mentira (`RESEND_API_BASE`, `STRIPE_API_BASE`, só fora de produção) e a API real. Eles provam o nosso lado (formato dos pedidos, assinatura, idempotência, ordem, efeito); **o contrato real com os provedores só se confirma com chaves de teste**: depois de configurar, rode `stripe listen` e um chamado de ponta a ponta antes de publicar.

## Visão geral e sino do painel — rules

- **Indicador novo entra em `server/painel/indicadores.js`** (função pura, com teste em `indicadores.test.js`); `server/painel/visaoGeral.js` só lê o banco. Nunca calcule número dentro da rota nem do JSX. Datas e meses de um `Date` com `hojeBR(data)` (fuso de São Paulo).
- **Permissão por área, filtrada no servidor:** `/api/painel/visao-geral` devolve cada área (`atendimento`: `suporte`, `clientes`: `clientes`, `financeiro`: `financeiro`) ou `null`. A tela nunca decide o que mostrar a quem. O sino (`/visao-geral/pendencias`) devolve só números, nunca nome de empresa.
- **Só leitura.** Consultas da visão geral e do sino não podem escrever (presença, fila, status): `estadoAtendimento` escreve a presença da pessoa, então **não** é usada aqui. Há teste que prova isso.
- **A conta interna da casa não entra em nenhum indicador** (`ehContaInterna`). Conversão do teste só conta empresas que passaram por teste (`trialAte`), para contas antigas não inflarem o número.
- **Popover de sino** usa `posicaoDoPopover` (`src/components/popover.js`, com teste): janela `fixed` calculada a partir do botão, para nunca passar da borda no celular.
- **Testes:** `npm test`, `node --env-file=.env scripts/painel/e2e-visao-geral.mjs` e `scripts/painel/ui-visao-geral.mjs` (que também varre todas as telas do painel no celular). O banco é o mesmo dos clientes reais: os e2e comparam com a linha de base (deltas), e chat de teste precisa de `ultimoSinalClienteEm` no futuro, senão a varredura de qualquer tela de Atendimento aberta o abandona.

## Situação da conta, bloqueio e modo leitura — rules

- **Uma regra só: `statusEfetivo(tenant, hoje)`** em `server/config/conta.js` (pura, o front importa). Nunca compare `tenant.status` à mão para decidir acesso: o teste vencido continua `trial` no banco e só vira `trial_expirado` ali. Bloqueiam: teste acabado, suspenso, cancelado. A conta interna (`EMAILS_CONTA_INTERNA`) nunca bloqueia nem pode ser suspensa.
- **Bloqueio no servidor:** `contaAtiva` (`server/middleware/conta.js`, depois do `authMiddleware`) responde 402 `CONTA_BLOQUEADA` fora de `/assinatura`, `/suporte` e `/auth` (lista em `caminhoLiberadoComContaBloqueada`). Rota nova do cliente que a conta bloqueada precise alcançar entra nessa lista, com teste; as demais já ficam trancadas sem fazer nada. Quem muda status ou plano chama `invalidarConta(tenantId)` (o cache dura 60 s por instância).
- **Bloqueio na tela:** `AppShell` mostra `ContaBloqueada` quando `session.tenant.bloqueada`; o shell completo nem carrega os dados. O `api.js` dispara `conta-bloqueada` num 402 e o `App` troca de tela. O cliente **nunca** vê `motivoStatus` nem notas internas: `tenantParaCliente` é lista de campos permitidos, não "tudo menos".
- **Modo leitura ("entrar como o cliente"):** token do sistema do cliente com `leitura: true`, 30 min, sem refresh, sempre ligado a um chamado da empresa (mensagem de sistema no chamado + auditoria). `modoLeitura` recusa tudo que não seja leitura. **GET que escreve no banco é bug** no modo leitura: o chat e o "marcar como lido" já checam `user.leitura`; ao criar um GET com efeito colateral, faça o mesmo. A sessão de leitura vive só em `sessionStorage` (`src/utils/leitura.js`) e jamais toca no `localStorage`.
- **Listas do painel:** com filtros, guarde um contador de consulta e ignore respostas antigas (ver `Clientes.jsx`), senão uma resposta lenta sobrescreve o filtro atual. Busca por texto com espera de 300 ms.
- **Testes:** `npm test`, `node --env-file=.env scripts/painel/e2e-clientes.mjs` e `scripts/painel/ui-clientes.mjs`.

## Assinatura e cobrança — rules

- **Regras de dinheiro só em `server/config/cobranca.js`** (puras, com teste; o front importa): preço de lista, receita mensal, cobertura de meses, situação da cobrança, indicadores. Em centavos inteiros (`server/financeiro/dinheiro.js`); `Decimal(14,2)` no banco. **Um período anual é o ano inteiro** (12 x o preço mensal do anual). Datas em `AAAA-MM-DD` de São Paulo; para a data/mês de um `Date` use `hojeBR(data)`, nunca `String(date)` nem `toISOString()` (o teste puro com strings não pega isso: confira o tipo que o chamador passa).
- **"Atrasada" nunca é gravada.** `Cobranca.status` é `aberta`, `paga` ou `cancelada`; atrasada = aberta com vencimento antes de hoje (`situacaoCobranca`). Uma cobrança por empresa e mês (`UNIQUE(tenantId, referencia)`) e a anual cobre 12 meses (`cobrancaCobreMes`). Pagar, cancelar e estornar usam `updateMany` com o status esperado no `where`, para dois cliques nunca aplicarem duas vezes.
- **Receita só do que está configurado.** MRR vem de `Assinatura` de empresa ativa ou inadimplente, fora de cortesia. Empresa ativa sem assinatura vai para "sem assinatura configurada"; nunca estime um valor.
- **Todo gateway entra por `server/pagamentos/provedores.js`** (interface documentada no arquivo; hoje `manual`, `stripe` e o `falso` de teste). O webhook (`server/pagamentos/webhook.js`) grava o evento e aplica o efeito **na mesma transação**, com `UNIQUE(gateway, eventoId)`: repetido responde 200 `duplicado`; recusado pela regra de negócio vira 200 `ignorado`, nunca 500. O provedor `falso` nunca existe em produção. Gateway novo: escreva o provedor, teste o webhook com rajada de avisos iguais (ver `e2e-cobranca.mjs` e `e2e-stripe.mjs`) e confira o cabeçalho de autenticação dele. **O corpo bruto é guardado em `req.rawBody` só para `/api/pagamentos/webhook/` e `/api/email/webhook/`** (a assinatura é sobre os bytes exatos): nunca valide assinatura sobre `JSON.stringify(req.body)`.
- **Pagamento ativa a empresa:** em teste vira ativa, inadimplente volta a ativa sem outra cobrança vencida, suspensa e cancelada não mudam sozinhas. Quem muda o status por código chama `invalidarConta(tenantId)`.
- **Permissões:** tudo de dinheiro exige `financeiro` (`/api/painel/financeiro`, assinatura e cobranças no detalhe da empresa, ativação com preço); `clientes_editar` sozinho não vê valor nem cobrança. O cliente só vê a própria assinatura e faturas se for administrador, sem dado de gateway nem motivo de cancelamento.
- **Nunca prometa o que não existe:** não há plano de suporte por e-mail ou WhatsApp. `planos.test.js` confere que as ofertas dos planos citam só chamado e chat, com o prazo do servidor. Assinar e mudar de plano abre um chamado pronto até o pagamento ser automático. O antigo botão que "migrava" de plano só no navegador foi removido: mudar de plano é sempre pelo servidor.
- **Exportação para planilha:** texto que começa com `=`, `+`, `-` ou `@` leva apóstrofo (o nome da empresa vem do cliente).
- **Testes:** `npm test`, `node --env-file=.env scripts/painel/e2e-cobranca.mjs` e `scripts/painel/ui-assinatura.mjs`. Dinheiro formatado com `Intl` usa espaço não separável: em regex use `\s`.

## Landing (página pública) — rules

- **A landing é a oferta principal:** teste grátis de 14 dias, sem cartão e **sem implantação** (a conta já nasce pronta). **Não há acesso demo** na landing nem no login (decisão de 10/10/2026); o segundo botão é "Ver como funciona" (vídeos). Código em `src/pages/Landing/` (uma seção por arquivo; linguagem visual de prancha técnica em `visual.jsx` e `landing.css`).
- **Só promete o que o sistema faz hoje.** Confira cada frase contra `src/treinamentos/conteudo.js`. Nunca invente depoimento, logo de cliente ou número de uso: depoimentos reais entram em `DEPOIMENTOS` (`oferta.js`) e a seção só aparece com eles.
- **Texto que precisa ser exato** (dias de teste, plano do teste, preço por dia, dores do Raio-X) fica em `oferta.js`, com teste em `oferta.test.js`.
- **Sem e-mail e sem telefone na landing** (decisão de 10/10/2026); `oferta.test.js` varre o código das seções e falha se voltar acesso demo, `mailto:` ou `wa.me`.
- **Conta interna** (`admin@teste.com`): só para vídeos e testes, com a senha em `DEMO_SENHA` no `.env`. Nunca documente a senha.
- **Telas simuladas** usam os componentes do design system e mostram "Valores de exemplo". Vídeos vêm da Central de treinamentos (`public/treinamentos`) e só carregam quando a seção aparece.
- **Imagem de compartilhamento:** `node scripts/marca/og-image.mjs` regenera `public/og-construktpro.png` (metatags em `index.html`). Rode de novo se a frase principal mudar.
- **As telas do sistema carregam sob demanda** (`React.lazy` no `App.jsx`), para a landing abrir leve. Página nova do sistema entra do mesmo jeito.

## Design system — rules

- **`DESIGN.md` (repo root) is the visual contract and the source of truth for tokens.** To change a colour, font, spacing or radius, edit `DESIGN.md` first, then mirror it in `design-system/tokens/*.css`, then run `npm run lint:design`.
- **New UI is built from the library in `design-system/`.** Import from the barrel: `import { Button, Card } from "<relative>/design-system"` — never from component internals (lint enforces).
- **No hardcoded colour, font, spacing, size, radius, weight or z-index values** — in product code and inside the components. Use semantic CSS variables: `var(--surface-card)`, `var(--text-secondary)`, `var(--accent)`, `var(--space-4)`, `var(--radius-lg)`, `var(--fs-p5)`, `var(--fw-semibold)`, `var(--content-w-xs)`, `var(--z-modal)`, `var(--font-sans)`. Never primitives (`--cp-*`) outside `design-system/`, never raw hex or `px` strings, never bare numbers for these properties, never another font family. `npm run lint` reports hex / `px` / font violations as `ds(restricted-syntax)` warnings; bare numbers (`fontWeight: 600`, `width: 96`) are not caught by lint, so check them in review. Numeric props of components (`<Icon size={16} />`, `<Sidebar height={520} />`) are component API, not style, and are fine.
- **Themes:** light (`:root`, `[data-theme="light"]`) and dark (`[data-theme="dark"]`). **The app runs light** (`index.html` sets `data-theme="light"` on `<html>`); dark is optional and only rendered in `/showcase`. Any colour you add must still exist in both theme blocks of `tokens/colors.css`.
- **Brand:** ConstruktPro. Use `design-system/assets/logo-negativo.svg` on charcoal (sidebar, landing footer) and `logo-positivo.svg` on light surfaces (login, sign-up, landing nav). Never write the name as styled text in place of the logo.
- **All screens are on the design system.** The legacy layer (`src/components/ui/`, `src/constants/tokens.js`, `BottomNav`) was removed — do not recreate it.
- **App shell and page actions.** `src/App.jsx` renders the single DS `Header` (title from `MENU` in `src/components/Sidebar.jsx`), the `Sidebar` on desktop and `MobileTabBar` + drawer below 900px. Pages do **not** render their own header: they put their buttons/filters in `<PageActions>…</PageActions>` (`src/components/PageActions.jsx`), which portals them into the Header's actions slot (below the header on mobile). Page subtitle/description goes at the top of the page body.
- **Forms in modals** use `Modal` with the action buttons in its `footer`; saving buttons use `loading={salvando}` to block double submits. Notices and confirmations go through `src/utils/aviso.js` (`avisarSucesso`, `avisarErro`, `confirmar`…), which renders the DS `AlertDialog` — never `window.alert/confirm`.
- **Responsive switches** use `useIsMobile()` / `useMediaQuery()` from the design system, not ad-hoc `window.innerWidth` listeners.

## Design system — library map

| Path | Contents |
| --- | --- |
| `design-system/index.ts` | Barrel: every component and its prop types |
| `design-system/styles.css` | Entry CSS (imported once in `src/main.jsx`) → `tokens/` |
| `design-system/tokens/` | `colors.css` (primitives + light/dark semantic), `typography.css`, `spacing.css` (space/size scale, radius, border widths, control heights, layout widths, z-index), `effects.css` (shadows, motion, scrim), `fonts.css` (Nunito @font-face), `base.css` |
| `design-system/components/core/` | `Icon` (+ `iconData.ts`, 82 Lucide glyphs), `Button` (+ `Spinner`), `IconButton`, `Badge`, `Tag`, `Avatar` |
| `design-system/components/forms/` | `Field`, `Input`, `Select`, `Textarea`, `Checkbox`, `OptionRow`, `FilterPill`, `UploadBox`, `MoneyInput` (+ `formatarMoeda`, `parseMoeda`) |
| `design-system/components/navigation/` | `Sidebar`, `Header`, `MobileTabBar`, `SegmentedTabs`, `Stepper` |
| `design-system/components/data/` | `Card`, `StatCard`, `DataTable`, `ProgressBar`, `AreaChart`, `BarChart`, `PieChart`, `MiniCalendar`, `MonthCalendar`, `MessageItem`, `ChatBubble` |
| `design-system/components/listings/` | `ListingCard`, `ProductCard`, `Photo` |
| `design-system/components/overlays/` | `Modal` (bottom sheet below 640px), `AlertDialog` |
| `design-system/components/feedback/` | `Banner` |
| `design-system/hooks/` | `useMediaQuery`, `useIsMobile` |
| `design-system/templates/` | Composition patterns: `AdminShell` (sidebar + header + mobile tab bar/drawer) and screens `HomeScreen`, `ObrasScreen`, `PedidosScreen`, `CronogramaScreen`, `MensagensScreen` |
| `design-system/guidelines/components.md` | Usage notes for every component |
| `design-system/assets/` | `fonts/` (Nunito woff2), `icons/` (Lucide SVGs), `logo-negativo.svg`, `logo-positivo.svg` |
| `design-system/showcase/Showcase.tsx` | Route `/showcase`: whole library, all states, light / dark / side by side, templates |
| `design-system/lint/adherence-plugin.js` | oxlint JS plugin used by `.oxlintrc.json` for the adherence rules |
| `design-system/reference/` | Original HTML visual references (specimen cards, component cards, clickable admin UI kit). Open the `.html` files straight in a browser; they use `design-system/styles.css` + `assets/` and a vendored `_ds_bundle.js` (plus React/Babel from unpkg). Reference only — not imported by the app |

## Design system — adding a component

1. Create `design-system/components/<group>/<Name>.tsx`: a named export plus an exported `<Name>Props` interface with a one-line doc comment. Style only with semantic `var(--…)` tokens; cover the states that apply (hover, active, focus-visible, disabled, loading, error, empty, selected) and keep it working in both themes.
2. Export it (and its props type) from `design-system/index.ts`.
3. Add it with every variant and state to `design-system/showcase/Showcase.tsx`.
4. Add a usage note to `design-system/guidelines/components.md`; add a prop allow-list entry for it in `.oxlintrc.json` (`ds/restricted-syntax`).
5. If it needs a new token, add it to `DESIGN.md` and to both themes in `tokens/`.
6. Run `npm run typecheck && npm run lint && npm run build` and check `/showcase` in the browser.
