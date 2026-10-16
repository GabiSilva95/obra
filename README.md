# ConstruktPro

Sistema SaaS de gestão de obras com multi-tenancy, controle de etapas, estoque, alocação de recursos, diário de obra, financeiro e compras.

---

## Sumário

- [Visão Geral](#visão-geral)
- [Stack Técnica](#stack-técnica)
- [Arquitetura](#arquitetura)
- [Estrutura de Diretórios](#estrutura-de-diretórios)
- [Design System](#design-system)
- [Suporte](#suporte)
- [Painel da equipe](#painel-da-equipe)
- [Assinatura e cobrança](#assinatura-e-cobrança)
- [Modelos de Dados](#modelos-de-dados)
- [API — Rotas](#api--rotas)
- [Autenticação e Segurança](#autenticação-e-segurança)
- [Planos e Limites](#planos-e-limites)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Instalação e Execução Local](#instalação-e-execução-local)
- [Deploy (Vercel + Neon)](#deploy-vercel--neon)
- [Conta interna de demonstração](#conta-interna-de-demonstração)

---

## Visão Geral

O **ConstruktPro** ("Do canteiro ao escritório") é uma plataforma multi-tenant para empresas de construção civil gerenciarem obras, equipes, materiais e financeiro em um único lugar.

Cada empresa (tenant) tem seus dados completamente isolados. O sistema suporta múltiplos usuários por tenant com controle de permissões por módulo.

---

## Stack Técnica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + Vite 5 + React Router v7 |
| UI | Design system próprio em `design-system/` (React + TypeScript, tokens CSS, Nunito) — contrato em `DESIGN.md` |
| Backend | Express 5 (Node.js ESM) |
| ORM | Prisma 7 com driver adapter `@prisma/adapter-pg` |
| Banco de dados | PostgreSQL via Neon (serverless) |
| Hospedagem | Vercel (frontend estático + serverless functions) |
| Autenticação | JWT (access token 15 min) + Refresh Token (30 dias) |
| Segurança | bcryptjs, express-rate-limit |

---

## Arquitetura

```
┌─────────────────────────────────────────────────────┐
│                     Vercel                          │
│                                                     │
│  ┌──────────────────┐   ┌────────────────────────┐  │
│  │  Frontend (React)│   │  Backend (Express)     │  │
│  │  /dist  (static) │   │  /api/* (serverless)   │  │
│  └────────┬─────────┘   └──────────┬─────────────┘  │
│           │  /api/*  →  serverless  │               │
└───────────┼─────────────────────────┼───────────────┘
            │                         │
            └──────────── Neon ───────┘
                    PostgreSQL DB
```

**Fluxo de deploy:**
1. Push para `main` no GitHub
2. Vercel detecta o commit, roda `npm install` (+ `postinstall: prisma generate`) e `vite build`
3. Frontend é servido como estático; rotas `/api/*` são encaminhadas para a serverless function `server/index.js`

### Multi-tenancy

Modelo **Shared Database + Shared Schema**: todos os tenants compartilham o mesmo banco e as mesmas tabelas. O isolamento é garantido pelo campo `tenantId` presente em todos os modelos, verificado em cada operação.

---

## Estrutura de Diretórios

```
obra/
├── prisma/
│   ├── schema.prisma          # Modelos e relações do banco
│   └── seed.js                # Seed com usuário de demonstração
├── server/
│   ├── index.js               # Entry point Express + middlewares globais
│   ├── db.js                  # Instância Prisma com adapter Neon
│   ├── config/
│   │   └── planos.js          # Limites por plano (starter/pro/enterprise)
│   ├── middleware/
│   │   ├── auth.js            # Verificação JWT
│   │   ├── auditLogger.js     # Log assíncrono de mutações
│   │   ├── planLimit.js       # Enforcement de cotas por plano
│   │   └── rateLimiter.js     # Rate limiting por IP
│   ├── painel/                # Painel da equipe: token e chave próprios, guardas, auditoria, senha, rotas (auth, equipe, atendimento, chamados, auditoria)
│   ├── suporte/               # Fila de atendimento: fila.js (regras puras), servico.js (chamados e chat), anexo.js
│   ├── financeiro/            # Regras do financeiro (funções puras + serviços); o front reaproveita dinheiro, parcelas e rateio
│   │   ├── dinheiro.js        # Centavos, divisão sem perder centavo (maior resto)
│   │   ├── parcelas.js        # Parcelamento e conta fixa
│   │   ├── rateio.js          # Rateio entre obras, etapas e centros de custo
│   │   ├── servico.js         # Documento, baixa, estorno, cancelamento (transações)
│   │   ├── compras.js         # Compra entregue → conta a pagar (NF-e com duplicatas)
│   │   ├── geracao.js         # Pendências: compras, diárias e locações → contas a pagar
│   │   ├── fluxo.js           # Fluxo de caixa e envelhecimento
│   │   ├── ofx.js, csv.js     # Leitura de extrato bancário
│   │   ├── conciliacao.js     # Sugestões de conciliação
│   │   └── *.test.js          # Testes (npm test)
│   └── routes/
│       ├── auth.js            # Login, registro, refresh, logout
│       ├── financeiro.js      # Contas, títulos, baixas, rateio, fluxo, relatórios, pendências
│       ├── financeiroConciliacao.js  # Importação de extrato e conciliação bancária
│       ├── obras.js           # CRUD obras + etapas
│       ├── cadastros.js       # Máquinas, funcionários, insumos, tipos de etapa
│       ├── estoque.js         # Movimentações de estoque
│       ├── alocacao.js        # Alocação de máquinas e insumos
│       ├── diario.js          # Diário de obra
│       ├── receitas.js        # Receitas (competência): linhas de faturamento por obra
│       ├── compras.js         # Ordens de compra
│       ├── usuarios.js        # Gestão de usuários do tenant
│       ├── plano.js           # Consulta de uso e limites do plano
│       ├── suporte.js         # Chamados e chat ao vivo do cliente
│       └── auditoria.js       # Consulta de logs de auditoria
├── src/
│   ├── App.jsx                # Roteamento principal + shell autenticado
│   ├── constants/
│   │   └── data.js            # Planos, status e listas fixas
│   ├── utils/
│   │   ├── api.js             # Cliente HTTP com refresh token automático
│   │   ├── aviso.js           # Avisos e confirmações (AlertDialog do design system)
│   │   ├── export.js          # Exportação CSV e PDF (impressão)
│   │   ├── helpers.js         # Formatação e cálculos de custo/progresso
│   │   └── planoLimite.js     # Checagem de limites do plano
│   ├── components/
│   │   ├── RateioEditor.jsx   # Rateio de um valor entre obras, etapas e centros de custo
│   │   ├── Sidebar.jsx        # Menu (MENU, abas do mobile) sobre o Sidebar do design system
│   │   ├── PageActions.jsx    # Portal das ações de cada página para o Header do shell
│   │   ├── Notificacoes.jsx   # Alertas computados em tempo real (sino do Header)
│   │   ├── AvisoModal.jsx     # Renderiza os avisos de utils/aviso.js
│   │   └── AnexosObra.jsx     # Upload e lista de anexos da obra
│   ├── painel/                # Painel da equipe (carregado só no host painel.*): PainelApp, Casca, menu, paginas/
│   └── pages/
│       ├── Suporte/           # Chamados e entrada na fila do chat (o chat é o ChatSuporte.jsx, montado no shell)
│       ├── Dashboard/         # Início: seções Obras, Financeiro e Estoque (card de números + indicadores); cálculos em indicadores.js
│       ├── Obras.jsx
│       ├── Cadastros.jsx
│       ├── Estoque.jsx
│       ├── Alocacao.jsx
│       ├── Diario.jsx
│       ├── Financeiro/        # Resumo, contas a pagar e a receber, pendências, contas e conciliação, fluxo, resultado, relatórios, cadastros
│       ├── Compras.jsx
│       ├── Relatorios.jsx     # Gantt, exportação CSV/PDF
│       ├── TiposEtapa.jsx
│       ├── Usuarios.jsx
│       ├── Login.jsx
│       ├── Registro.jsx
│       ├── Registro.jsx       # Cadastro do teste grátis (uma etapa, entra direto no sistema)
│       └── Landing/           # Landing pública (rotas / e /planos): oferta de teste grátis, prova do produto, preços; textos exatos em oferta.js
├── design-system/             # Biblioteca de UI (componentes, tokens, templates, showcase)
├── DESIGN.md                  # Contrato visual e fonte da verdade dos tokens
├── AGENTS.md                  # Instruções para agentes de código (regras e mapa do design system)
├── vercel.json                # Configuração de builds e rewrites
├── vite.config.js
└── package.json
```

---

## Design System

Todas as telas usam a biblioteca em `design-system/` (derivada do design system ConstruktPro exportado do Claude Design) — não há mais componentes de UI próprios em `src/`.

- **Contrato:** `DESIGN.md` na raiz (formato [DESIGN.md](https://github.com/google-labs-code/design.md)) é a fonte da verdade de cores, tipografia, espaçamento e raios. Os tokens viram variáveis CSS em `design-system/tokens/`.
- **Tema e marca:** o app roda no tema claro (`data-theme="light"` no `index.html`) com a marca ConstruktPro (logos em `design-system/assets/`). O tema escuro continua disponível como opção e aparece no showcase.
- **Showcase:** `http://localhost:3000/showcase` mostra todos os componentes, estados, os dois temas e os templates.
- **Referências visuais:** HTMLs originais em `design-system/reference/`, abrem direto no navegador.
- **Regras:** componentes novos saem da biblioteca e nenhum valor de cor, fonte, espaçamento, tamanho, raio, peso ou z-index vai hardcoded — detalhes e mapa da biblioteca em `AGENTS.md`.

```bash
npm run typecheck     # TypeScript do design-system
npm run lint          # oxlint + regras de aderência ao design system
npm run lint:design   # valida o DESIGN.md
```

---

## Tour e Central de treinamentos

- Tour de primeiros passos a cada login, até o usuário marcar "Não mostrar novamente" (`src/tour/primeirosPassos.js`).
- Central em `/app/treinamentos`: conteúdo em `src/treinamentos/conteudo.js`, vídeos em `public/treinamentos/`.
- `npm run treinamentos:gravar` (com `npm run dev` rodando) regrava os vídeos com Playwright; `-- --so <id>` regrava um só.
- `npm run treinamentos:verificar` aponta campos sem descrição e vídeos mais antigos que a tela. O `prebuild` roda em modo aviso.

## Financeiro

O financeiro tem duas camadas que **não se misturam**:

- **Competência** (o que a obra custou e faturou): `ConsumoInsumo`, `Alocacao`, `ApontamentoMO`, `Despesa` e `Receita`. É o que alimenta orçado x realizado, lucro e margem (`calcCustoObra`).
- **Caixa** (quando e como se paga e se recebe): `Titulo` (parcela a pagar ou a receber), `Baixa` (pagamento ou recebimento), `ContaFinanceira`, `LancamentoBancario` (linha do extrato) e `TransferenciaConta`.

Cada título aponta para sua origem (`origemTipo`): despesa, receita, compra, diárias, locação ou avulso. Só despesa e receita geram linhas de custo e faturamento; compra, diárias e locação não duplicam custo, que já foi apropriado no consumo, no apontamento e na alocação. **Rateio**: um título se divide entre obras, etapas e centros de custo (`TituloRateio`); uma despesa rateada vira uma linha de `Despesa` por linha de rateio, então os relatórios por obra continuam corretos.

Valores das tabelas novas são `Decimal(14,2)`; as contas são feitas em centavos (`server/financeiro/dinheiro.js`). Acesso: permissão **Financeiro** (`requirePermissao`); `GET /despesas` e `GET /receitas` ficam abertos porque o custo aparece em outras telas.

| Rota (`/api/financeiro`) | O que faz |
|---|---|
| `GET /base`, `PUT /config` | Contas, categorias, centros de custo e prazo padrão |
| `GET /titulos`, `POST/PUT/DELETE /documentos`, `PATCH /titulos/:id`, `POST /titulos/:id/cancelar` | Contas a pagar e a receber (com parcelas e rateio) |
| `POST /titulos/:id/baixas`, `POST /titulos/baixa-lote`, `POST /baixas/:id/estornar` | Pagar, receber, baixar em lote e estornar |
| `GET /pendencias`, `POST /gerar/compra`, `/gerar/diarias`, `/gerar/locacoes` | O que ainda não virou conta a pagar |
| `POST /contas/:id/extrato/previa`, `POST /contas/:id/extrato`, `GET /contas/:id/conciliacao` | Importação de OFX/CSV e tela de conciliação |
| `POST /lancamentos/:id/conciliar`, `/baixar`, `/lancar`, `/transferir`, `/ignorar`, `/desfazer` | Ações sobre cada linha do extrato |
| `GET /fluxo`, `GET /relatorios/envelhecimento`, `GET /contas/:id/movimentos`, `GET /resumo` | Fluxo de caixa, envelhecimento, extrato da conta e resumo |

Comandos: `npm test` (regras de dinheiro, parsers, conciliação e indicadores do Início), `npm run financeiro:e2e` (verificação ponta a ponta da API; suba antes `API_RATE_LIMIT=5000 PORT=3012 node server/index.js` e rode com `API=http://localhost:3012`), `npm run financeiro:ui` (percorre a tela com Playwright) e `npm run financeiro:demo` (dados de exemplo no tenant de demonstração).

---

## Suporte

O cliente fala com a equipe sem sair do sistema (item **Suporte** do menu, para todos os usuários). É uma **fila de atendimento** com dois caminhos, ambos na tabela `Ticket`:

- **Chamado (ticket):** assunto, setor do problema, "isto me impede de trabalhar?" (sim sobe a prioridade), descrição e anexo opcional. A resposta aparece na conversa do chamado e no sino. O número do chamado é o `id` autoincremento: é a **ordem de solicitação**. Prazo de primeira resposta por plano: 48 h Starter, 24 h Business, 8 h Professional (`server/config/suporte.js`).
- **Chat ao vivo:** o cliente informa o setor e entra na fila (segunda a sexta, 8h às 18h, fuso de São Paulo; 3 chats por atendente). Vê a posição e pode sair. A fila do chat é estritamente por ordem de chegada.
- **Setor** é a área do sistema onde está o problema (Obras, Cadastros, Estoque e Compras, Alocação e Máquinas, Financeiro, Relatórios, Usuários e acesso, Assinatura e cobrança, Outro). A equipe pode reclassificar.
- Administrador da empresa vê todos os chamados da empresa; os demais, só os seus. Notas internas nunca saem para o cliente (filtradas no banco).
- **Sem WebSocket:** a API roda como função da Vercel. O chat consulta a cada 3 s (15 s em segundo plano), e a consulta é também o sinal de presença: cliente sem sinal por 60 s na fila (300 s em conversa) sai; atendente sem sinal por 90 s devolve o chat à fila na posição original.
- Regras puras e testadas em `server/suporte/fila.js`; atribuição sem corrida (`FOR UPDATE` no atendente e `SKIP LOCKED` no chamado) em `server/suporte/servico.js`. Anexos em base64, até 3 MB, com checagem dos bytes iniciais (`server/suporte/anexo.js`).
- **E-mail do chamado (Resend)**, ligado por variáveis (ver abaixo): quando `EMAIL_PROVIDER=resend`, quem abre um chamado recebe a **confirmação** por e-mail, cada **resposta da equipe** (nunca nota interna, nunca chat) vai por e-mail e a **resposta do cliente por e-mail volta para a conversa do chamado**. Sem a configuração, nada muda: a conversa fica no sistema e no sino, e a tela não promete e-mail.

| Rota (`/api/suporte`, autenticada) | O que faz |
|---|---|
| `GET /config`, `GET /resumo` | Setores, horário do chat e o que o sino e a janela do chat precisam |
| `GET/POST /chamados`, `GET /chamados/:id` | Lista, abre e lê um chamado (com cursor `?depois=` para só as mensagens novas) |
| `POST /chamados/:id/mensagens`, `/resolver`, `/avaliar` | Responder, dar por resolvido, avaliar |
| `POST /chat/entrar`, `GET /chat/:id`, `POST /chat/:id/mensagens`, `/sair`, `/avaliar` | Entrar na fila, acompanhar, escrever, sair, avaliar |

### E-mail do chamado (Resend)

- **Saída** (`server/email/notificacoes.js`, texto simples, sem HTML): confirmação ao abrir (com o prazo do plano), resposta da equipe e aviso de "resolvido". O assunto leva o número (`[Chamado #42] ...`), o `Reply-To` é um endereço **único e assinado do chamado** (`chamado-<id>-<assinatura>@<domínio de recebimento>`: a assinatura é um HMAC do id, ninguém adivinha o endereço de outro chamado) e cada e-mail tem chave de idempotência (o Resend retém por 24 h). Falha de envio **nunca** derruba a ação: a mensagem fica salva e o painel mostra "Não foi possível enviar por e-mail"; a enviada mostra "Enviada também por e-mail".
- **Entrada** (`POST /api/email/webhook/resend`, público): o Resend avisa (`email.received`, assinatura Svix conferida sobre o corpo exato, tolerância de 5 minutos) só com os metadados; o texto e os anexos vêm da API deles. A resposta entra no chamado se **o endereço de resposta é válido**, **o remetente é quem abriu o chamado ou o administrador da empresa** (e-mail de outra empresa, ou de um colega, é ignorado), o remetente **passou em SPF, DKIM ou DMARC** quando o Resend informa, e **não é resposta automática** (fora do escritório, lista, `Auto-Submitted`, `noreply`). Só o **texto novo** entra (a citação é cortada em "Em ... escreveu:", "De: ...", ">" e na linha "- - -" dos e-mails do sistema); anexos aceitos são os mesmos do sistema (tipos permitidos, bytes conferidos, até 3 MB, no máximo 3; imagens embutidas de assinatura são ignoradas) e os recusados são contados na mensagem.
- **Regras iguais às da resposta pelo sistema:** responder um chamado resolvido o **reabre** e o põe de volta na fila; chamado fechado não aceita resposta. O mesmo e-mail nunca entra duas vezes (`UNIQUE(chamado, Message-ID)` e o registro do aviso); falha ao buscar o e-mail no Resend responde 500 para ele tentar de novo.
- **Configuração:** `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `EMAIL_REMETENTE` (domínio verificado), `EMAIL_RECEBIMENTO_DOMINIO` (o `<id>.resend.app` da conta, ou um subdomínio seu com o registro MX do Resend), `RESEND_WEBHOOK_SECRET` e `APP_URL`. No painel do Resend: verificar o domínio de envio (DNS), ativar o recebimento e criar o webhook `email.received` apontando para `https://SEU-DOMINIO/api/email/webhook/resend`. Sem `EMAIL_RECEBIMENTO_DOMINIO` ou sem o segredo do webhook, os e-mails saem pedindo para responder no sistema.

Testes: `npm test` (fila, horário, prazo, anexos), `node --env-file=.env scripts/painel/e2e-suporte.mjs` (API ponta a ponta, 88 verificações) e `node --env-file=.env scripts/painel/ui-suporte.mjs` (cliente e equipe ao mesmo tempo no navegador). Os scripts criam e apagam a própria empresa e equipe de teste. `SUPORTE_HORARIO_TESTE=sempre|nunca` fixa o horário do chat só para testes.

---

## Painel da equipe

Segundo sistema, **só para a equipe do ConstruktPro**, com cadastro de usuários e permissões próprios. Atende os chamados e o chat, mostra os clientes (quem testa, quem paga, quem está bloqueado) e deixa a equipe mudar plano, teste e situação da conta. Cuida também da assinatura e das cobranças (ver [Assinatura e cobrança](#assinatura-e-cobrança)). Não tem cadastro público nem link em lugar nenhum do sistema do cliente.

- **Mesmo aplicativo, outro endereço:** `src/main.jsx` olha o host; se começar com `painel.` carrega o `PainelApp` (código à parte, fora do pacote do cliente). Produção: `painel.construktpro.com.br`. Local: `http://painel.localhost:3000`.
- **Dois mundos separados.** Prisma ignora um filtro `undefined`: uma consulta com `tenantId` indefinido devolveria todos os clientes. Por isso o token da equipe nunca chega às rotas do cliente: chave própria (derivada de `JWT_SECRET`, ou `JWT_SECRET_EQUIPE`), audiência `painel`, `tipo: "equipe"`, e o `authMiddleware` do cliente recusa esse tipo. O painel é montado antes da autenticação do cliente.
- **Rotas** em `/api/painel` (login e refresh próprios, refresh rotativo em tabela própria, permissão lida do banco a cada chamada). Com `PAINEL_HOST` definido, elas só respondem nesse host (404 nos outros).
- **Permissões:** `suporte`, `suporte_supervisor` (furar a fila, reatribuir, mudar horário), `equipe`, e o papel `equipe_admin` com tudo. A tela Equipe tem perfis prontos (Administrador, Supervisor, Atendente, Financeiro, Leitura). `clientes` (ver as empresas e entrar na conta em leitura) e `clientes_editar` (mudar plano, teste, situação e notas) liberam a tela Clientes; `financeiro` libera a tela Financeiro e as cobranças de cada empresa.
- **Senha:** mínimo de 10 caracteres; a senha provisória é mostrada uma vez e a troca é obrigatória no primeiro acesso; limite de tentativas por IP e e-mail.
- **Auditoria própria** (`AuditoriaEquipe`) de toda ação da equipe, inclusive quando alguém fura a fila.
- **Telas:** **Visão geral** (a primeira do menu e a que abre ao entrar para quem acompanha clientes ou dinheiro; quem só atende não a vê e abre no Atendimento), Atendimento (fila do chat, em atendimento, chamados abertos com "aberto há", setor e prazo, atendentes), Chamados, Clientes, Financeiro, Equipe e Auditoria.

| Rota (`/api/painel`) | O que faz |
|---|---|
| `POST /auth/login`, `/auth/refresh`, `/auth/logout`, `GET /auth/me`, `POST /auth/trocar-senha` | Sessão da equipe |
| `GET /atendimento/estado`, `/atendentes`, `POST /atendimento/presenca`, `/atendimento/proximo`, `GET/PUT /atendimento/config` | Tela Atendimento, presença, "Atender próximo", horário do chat |
| `GET /chamados`, `GET/PATCH /chamados/:id`, `POST /chamados/:id/mensagens`, `GET /chamados/:id/anexos/:anexoId` | Chamados e conversas |
| `GET /visao-geral?dias=7\|30\|90`, `GET /visao-geral/pendencias` | Visão geral (por área, conforme a permissão) e o que alimenta o sino do painel |
| `GET /clientes`, `GET /clientes/:id` | Lista (busca, situação, plano, ordem, paginação, contagem por situação) e detalhe da empresa |
| `POST /clientes/:id/plano`, `/estender-teste`, `/status`, `PATCH /clientes/:id/notas` | Alterar plano e ciclo, estender o teste, ativar, suspender ou cancelar, notas internas (`clientes_editar`) |
| `PUT /clientes/:id/assinatura` | Combinar o valor, o dia do vencimento e a cortesia (`financeiro`) |
| `GET /financeiro/resumo`, `GET /financeiro/cobrancas`, `GET /financeiro/cobrancas.csv`, `GET /financeiro/cobrancas/previa` | Receita recorrente e indicadores, lista com filtros, exportação CSV e prévia do mês (`financeiro`) |
| `POST /financeiro/cobrancas`, `/cobrancas/gerar`, `/cobrancas/:id/pagamento`, `/estornar`, `/cancelar`, `/reabrir` | Criar, gerar o mês, registrar o pagamento, estornar, cancelar e reabrir cobranças (`financeiro`) |
| `POST /clientes/:id/entrar` | "Entrar como o cliente" em leitura, ligado a um chamado (`clientes`) |
| `GET/POST /equipe`, `PUT /equipe/:id`, `POST /equipe/:id/redefinir-senha`, `GET /auditoria` | Equipe e auditoria |


### Situação da conta e bloqueio

- **Situação** (`Tenant.status`): `trial`, `ativo`, `inadimplente`, `suspenso` ou `cancelado`. Contas antigas e a conta interna são `ativo`. Cadastro novo nasce `trial` com `trialAte` (14 dias, fuso de São Paulo).
- **`statusEfetivo(tenant, hoje)`** (`server/config/conta.js`, função pura, o front importa) decide a situação de verdade: um `trial` com `trialAte` anterior a hoje vira `trial_expirado`, sem tarefa agendada (o último dia ainda vale). **Bloqueiam:** teste acabado, suspenso e cancelado. Inadimplente só passa a bloquear com a cobrança automática. A conta interna (`admin@teste.com`) nunca é bloqueada nem pode ser suspensa pelo painel.
- **Conta bloqueada:** o login e o refresh funcionam e a resposta traz `tenant.bloqueada` e `tenant.situacao`; o app mostra só a tela de assinatura e o suporte (`src/pages/Assinatura/ContaBloqueada.jsx`). Na API, `contaAtiva` (`server/middleware/conta.js`) responde **402 `CONTA_BLOQUEADA`** em tudo, menos `/api/assinatura`, `/api/suporte` e `/api/auth`. A situação é guardada por 60 s por empresa em cada instância; mudar pelo painel esquece a da instância que atendeu, e as outras renovam em até 1 minuto. O front escuta o 402 e troca de tela sem recarregar.
- **O cliente nunca vê o motivo** da suspensão nem as notas internas (`tenantParaCliente` só devolve campos permitidos). `GET /api/assinatura` devolve a situação da própria conta, liberado mesmo bloqueada. A tela Minha assinatura completa (planos, pagamento, faturas) entra com a fase de cobrança.

### Entrar como o cliente (somente leitura)

A equipe abre o sistema do cliente para entender um problema, **sempre ligado a um chamado da empresa**. `POST /api/painel/clientes/:id/entrar` confere o chamado, deixa uma **mensagem de sistema na conversa do chamado** (o cliente sabe que a conta foi consultada), registra na auditoria e devolve um token do sistema do cliente com `leitura: true`, **30 minutos e sem refresh**, no nome do administrador ativo da empresa.

- O token vai pelo **fragmento da URL** (`#leitura=...`), abre em aba nova e fica só nessa aba (`sessionStorage`); nunca toca na sessão guardada do navegador (`src/utils/leitura.js`). Uma faixa avisa o chamado, o horário em que acaba e a saída.
- `modoLeitura` (`server/middleware/conta.js`) recusa tudo que não for GET/HEAD/OPTIONS com 403 `MODO_LEITURA`. O chat do cliente é presença ao vivo e fica indisponível; ler um chamado não o marca como lido para o cliente. Com a conta bloqueada, a equipe em leitura ainda vê os dados (é para investigar).

### Visão geral e sino

- **Visão geral** (`src/painel/paginas/VisaoGeral.jsx`, 7, 30 ou 90 dias, atualiza a cada minuto): cada pessoa vê só as áreas a que tem acesso, e o **servidor** é quem filtra (área sem permissão volta `null`, sem nenhum dado).
  - **Atendimento** (`suporte`): fila do chat, em atendimento, chamados abertos, sem resposta e o mais antigo, prazo estourado e perto de estourar; no período, chamados novos e resolvidos, tempo médio e mediana até a primeira resposta, % respondido dentro do prazo do plano, chats atendidos e espera média, abandonados, avaliação média, gráfico por dia (14 dias) e por setor.
  - **Clientes** (`clientes`): empresas por situação, cadastros novos (7 e 30 dias), **testes acabando em até 3 dias** e **testes que acabaram há pouco sem assinar** (com o telefone, para contatar), ativas **sem acesso há 14 dias ou mais**, e a **conversão do teste** (das empresas cujo teste de 14 dias já terminou, cadastradas entre 90 e 14 dias atrás e que passaram por teste, quantas viraram assinatura; contas anteriores ao teste não entram).
  - **Financeiro** (`financeiro`): receita mensal e anual, recebido e a receber, em atraso e o gráfico dos últimos 6 meses (os mesmos números da tela Financeiro).
- As regras de cálculo são funções puras em `server/painel/indicadores.js` (com teste); `server/painel/visaoGeral.js` só busca os dados. **Só leitura**: consultar não conta como presença no atendimento nem mexe na fila. A conta interna da casa não entra em nenhum número.
- **O sino do painel** (`PainelSino.jsx`) consulta `/visao-geral/pendencias` a cada minuto: pessoas na fila do chat, chamados sem resposta (e quantos com prazo estourado), testes acabando, testes que acabaram, cobranças em atraso. Só números e só das áreas permitidas; clicar leva à tela.
- A **auditoria** mostra a empresa de cada ação (com atalho para a empresa; "empresa apagada" quando já não existe).

**Primeiro administrador** (não há cadastro público; a senha é digitada na hora, nunca fica em arquivo):

```bash
npm run painel:admin -- --email voce@empresa.com --nome "Seu Nome"
```

**Para o painel funcionar em produção** (depende de você):
1. Vercel > Settings > Domains: adicionar `painel.construktpro.com.br` e criar o CNAME no DNS.
2. Variável `PAINEL_HOST=painel.construktpro.com.br` em **Production e Preview**.
3. `vercel.json` já manda `X-Robots-Tag: noindex, nofollow` para esse host.

Testes: `node --env-file=.env scripts/painel/e2e.mjs` (isolamento entre os dois mundos, permissões, senha e auditoria), `e2e-clientes.mjs` (lista, ações, bloqueio, modo leitura), `e2e-email.mjs` (e-mail do chamado com um Resend de mentira), `e2e-stripe.mjs` (Checkout, portal e avisos com um Stripe de mentira), `ui-pagamentos.mjs`, `e2e-visao-geral.mjs` (indicadores e permissões por área, comparados com a linha de base do banco), `ui-visao-geral.mjs` (áreas por permissão, sino, auditoria e todas as telas do painel no celular), `ui-smoke.mjs` (login, equipe, auditoria e celular) e `ui-clientes.mjs` (equipe e cliente ao mesmo tempo: suspender, tela de bloqueio, entrar em leitura, estender o teste, celular). A API de desenvolvimento limita 200 requisições por minuto por IP: nos scripts de interface, espere a janela renovar entre uma execução e outra. O painel interno não entra na Central de treinamentos.

---

## Assinatura e cobrança

O dinheiro do ConstruktPro tem duas pontas: a **assinatura** do cliente (plano, ciclo, quanto paga, dia do vencimento) e as **cobranças** (faturas). Plano e ciclo moram em `Tenant`; `Assinatura` guarda o valor combinado, o dia do vencimento e a cortesia; `Cobranca` é cada fatura; `EventoPagamento` registra os avisos de gateway.

- **Dois caminhos de pagamento.** `manual` (padrão): a equipe registra o pagamento no painel. **`stripe`** (`PAGAMENTO_GATEWAY=stripe`): o cliente assina e paga sozinho no cartão e o Stripe cobra todo mês ou ano. Ambos entram por uma interface única (`server/pagamentos/provedores.js`); `falso` existe só para teste (fora de produção e com `PAGAMENTO_WEBHOOK_SEGREDO`).
- **Webhook idempotente:** `POST /api/pagamentos/webhook/:gateway` (público; a origem é conferida pelo provedor). O evento é gravado com a chave `gateway + eventoId` **na mesma transação** que aplica o pagamento: o mesmo aviso reenviado responde 200 `duplicado` e não faz nada, e se aplicar falhar o gateway reenvia e é processado de verdade. Aviso legítimo que a regra recusa vira 200 `ignorado`, nunca 500 (o gateway insistiria para sempre).
- **Dinheiro em centavos** (`server/config/cobranca.js`, `server/financeiro/dinheiro.js`); no banco, `Decimal(14,2)`. O preço de lista de um período: mensal = o mês; **anual = o ano inteiro** (12 vezes o preço mensal do anual). A receita recorrente (MRR) divide o anual por 12.
- **Cobrança por mês, sem duplicar:** `referencia` (`AAAA-MM`) é única por empresa e uma cobrança anual cobre 12 meses; criar de novo, gerar o mês duas vezes ou criar um mês já coberto é recusado (409). "Atrasada" nunca é gravada: vem de `status = aberta` e vencimento anterior a hoje.
- **Gerar o mês** (`Financeiro > Gerar cobranças do mês`, com prévia): cria uma cobrança para cada empresa ativa ou inadimplente com assinatura configurada, fora de cortesia, sem cobrança cobrindo o mês. Não há tarefa agendada: é um botão.
- **Receita só do que está configurado.** O MRR conta assinatura configurada, de empresa ativa ou inadimplente, fora de cortesia. Empresa ativa **sem** assinatura aparece à parte ("sem assinatura configurada") e não entra na receita: nenhum número inventado.
- **O pagamento muda a empresa:** quem estava em teste passa a ativa; inadimplente volta a ativa se não restar outra cobrança vencida; suspensa ou cancelada não muda sozinha. A empresa bloqueada é liberada na hora (o cache do bloqueio é esquecido).
- **Ativar uma empresa** (Clientes > Ativar assinatura): combina o valor, o dia do vencimento (ou cortesia) e já gera a primeira cobrança. Combinar preço e gerar cobrança exige a permissão `financeiro`; a ativação simples só pede `clientes_editar`. Marcar **inadimplente** é manual e não bloqueia o acesso.
- **CSV** no formato do Excel brasileiro (`;`, vírgula decimal, BOM) e com apóstrofo antes de texto que começa com `=`, `+`, `-` ou `@` (o nome da empresa vem do cliente).

### Pagamento online (Stripe)

Cobrança recorrente por **cartão** (Stripe Billing), sem SDK (`server/pagamentos/stripe.js`: formulário + `fetch`, assinatura do webhook conferida à mão). Observação da documentação do Stripe: para contas no Brasil o **Pix Automático não está disponível**, então a recorrência é no cartão (Pix e boleto só avulsos).

- **Assinar** (tela Assinatura, só administrador): `POST /api/assinatura/checkout {plano, ciclo}` cria (ou reaproveita) o **cliente** no Stripe e abre o **Checkout hospedado** em modo assinatura, em reais, com `price_data` (sem produtos pré-cadastrados). O preço é o de lista (o anual cobra o ano inteiro) ou o valor combinado, se for o mesmo plano e ciclo. Plano, ciclo e empresa vão nos metadados da assinatura e voltam em cada fatura. O navegador volta para `/app/assinatura?checkout=ok` e a tela acompanha a conta até ficar ativa; **abrir o pagamento não ativa nada, só o pagamento ativa**.
- **Gerenciar pagamento:** `POST /api/assinatura/portal` abre o portal do cliente do Stripe (trocar cartão, ver faturas, cancelar). Exige o portal ativado no painel do Stripe.
- **Webhook** `POST /api/pagamentos/webhook/stripe`: confere `Stripe-Signature` (HMAC-SHA256 de `t.corpo`, tolerância de 5 minutos) e traduz o evento (o mesmo evento repetido ou fora de ordem é esperado e seguro: `EventoPagamento` + sincronização que só anda para a frente):
  - `invoice.finalized`, `invoice.paid` (e `payment_succeeded`, `updated`): a fatura vira **cobrança** da empresa (`gateway=stripe`, link da fatura, ciclo, valor). A primeira fatura (`subscription_create`) **ativa** a empresa com o plano e o ciclo escolhidos no Checkout e guarda o valor. Uma cobrança em aberto criada à mão para o mesmo mês é adotada (não duplica); uma segunda fatura no mesmo mês (troca de plano proporcional) vira outra cobrança com a referência marcada.
  - `invoice.payment_failed`: a empresa ativa fica **inadimplente** (não bloqueia); pagar depois a recoloca como ativa.
  - `customer.subscription.updated` (`past_due`, `unpaid`) e `.deleted`: inadimplente, **suspensa** (motivo marcado "Stripe:") ou **cancelada**. Pagar uma fatura reativa só a empresa suspensa **pelo Stripe**; a suspensa pela equipe continua suspensa.
  - `checkout.session.completed`: liga a empresa ao cliente e à assinatura do Stripe. Rascunhos, outra moeda, empresa desconhecida e eventos sem efeito respondem 200 "ignorado" (o Stripe insiste por até 3 dias em quem responde erro).
- **Quem o Stripe cobra** (`Assinatura.gateway = stripe`) não entra em "Gerar cobranças do mês", não recebe cobrança criada à mão e **não tem a fatura mexida à mão** (pagar, estornar, cancelar e reabrir são recusados: o Stripe é a fonte da verdade). No detalhe da empresa a equipe vê o id do cliente no Stripe. **Trocar o plano** pelo painel atualiza também a assinatura no Stripe (mesmo ciclo, cobrança proporcional); se o Stripe falhar, o plano não muda. Trocar o ciclo exige cancelar e assinar de novo.
- **Configuração:** `PAGAMENTO_GATEWAY=stripe`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` e `APP_URL`. No painel do Stripe (conta no Brasil): criar o endpoint `https://SEU-DOMINIO/api/pagamentos/webhook/stripe` com os eventos `checkout.session.completed`, `invoice.finalized`, `invoice.paid`, `invoice.payment_failed`, `invoice.voided`, `invoice.marked_uncollectible`, `customer.subscription.updated` e `customer.subscription.deleted`; ativar o **portal do cliente**; e conferir que o cartão está entre as formas de pagamento. Teste local: `stripe listen --forward-to localhost:3002/api/pagamentos/webhook/stripe` e `stripe trigger invoice.paid`.

**Lado do cliente** (item **Assinatura** do menu, só administrador): o plano, o valor, as faturas (com o link de pagamento quando o gateway gera), a escolha de plano e o contato (telefone e aceite de mensagens, que contas antigas não tinham). Enquanto não há pagamento automático, **assinar e mudar de plano abre um chamado já preenchido** (setor Assinatura e cobrança) e a equipe combina e ativa. O topo do sistema avisa o administrador quando o teste está acabando (5 dias ou menos) e quando há pagamento em atraso. A mesma tela aparece dentro da tela de conta bloqueada.

| Rota (`/api/assinatura`, administrador) | O que faz |
|---|---|
| `GET /` | Situação da conta (liberada mesmo bloqueada; qualquer usuário) |
| `GET /resumo` | Plano, valor combinado, faturas (sem canceladas e sem dado de gateway) |
| `PATCH /contato` | Telefone e aceite de mensagens (o texto aceito é o do servidor, versionado) |
| `POST /checkout`, `POST /portal` | Abrir o pagamento no cartão (Stripe) e o portal do cliente |

**Variáveis:** `PAGAMENTO_GATEWAY` (padrão `manual`) e `PAGAMENTO_WEBHOOK_SEGREDO` (só para o gateway de teste). **Testes:** `npm test` (regras de cobrança, indicadores, provedores), `node --env-file=.env scripts/painel/e2e-cobranca.mjs` (permissões, cobranças, pagamento, efeito na empresa, indicadores, CSV, o lado do cliente e o webhook com rajada de avisos iguais) e `scripts/painel/ui-assinatura.mjs`.

---

## Modelos de Dados

### Principais

| Modelo | Descrição |
|--------|-----------|
| `Tenant` | Empresa/conta. Possui `plano` (starter/pro/enterprise) |
| `User` | Usuário do tenant. `role`: `tenant_admin` ou `user`. `permissoes[]` por módulo |
| `Obra` | Obra com **cliente** (`clienteId`, uma pessoa do cadastro com o perfil Cliente), orçamento, status, datas e etapas |
| `EtapaObra` | Etapa vinculada a um `TipoEtapa`, com progresso e orçamento próprio |
| `Maquina` | Equipamento com custo/hora |
| `Funcionario` | Colaborador com salário/dia e vínculo com obras |
| `Insumo` | Material do catálogo com custo unitário e fornecedor |
| `Estoque` | Entrada/saída de insumos por obra |
| `Alocacao` | Uso de máquina ou insumo em uma obra com data |
| `DiarioObra` | Registro diário de clima, trabalhadores e atividades |
| `Receita` | Receita por obra (contrato, medição, aditivo…) |
| `OrdemCompra` | Ordem de compra com status e fornecedor |
| `RefreshToken` | Token de refresh com expiração e flag de revogação |
| `AuditLog` | Log de mutações por tenant (método, rota, status, IP) |

Todos os modelos derivados possuem `tenantId` direto (sem necessidade de JOIN para verificar ownership) e índices em `tenantId` e `obraId`.

---

## API — Rotas

Base URL: `/api`

### Autenticação (pública)

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/auth/registro` | Cria tenant + admin e devolve a sessão (mesmo formato do login) |
| `POST` | `/auth/login` | Retorna access token (15 min) + refresh token (30 dias) |
| `POST` | `/auth/refresh` | Emite novo par de tokens (rotação automática) |
| `POST` | `/auth/logout` | Revoga o refresh token |

### Obras

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/obras` | Lista obras do tenant |
| `POST` | `/obras` | Cria obra (verifica cota do plano). Exige `clienteId`: pessoa da empresa com o perfil Cliente (400 sem ele ou sem o perfil, 404 se não existe ou é de outra empresa) |
| `PUT` | `/obras/:id` | Atualiza obra. Sem `clienteId` mantém o cliente atual; obra antiga sem cliente só salva quando recebe um. `tipoObraId: ""` vale como "sem tipo" |
| `DELETE` | `/obras/:id` | Remove obra |
| `GET` | `/obras/:id/etapas` | Lista etapas da obra |
| `POST` | `/obras/:id/etapas` | Adiciona etapa |
| `PUT` | `/obras/:id/etapas/:etapaId` | Atualiza etapa |
| `DELETE` | `/obras/:id/etapas/:etapaId` | Remove etapa |

**Diário de obra:** cada registro tem **Anexos** (`/diario/:id/anexos`, mesmas regras e limite de 3 MB dos anexos da obra, separados deles: `Anexo.diarioId`; apagar o registro apaga os arquivos) e o botão **Relatório** (obra e período, em PDF pela impressão do navegador ou CSV; regras em `src/pages/diarioRelatorio.js`, com teste). Testes: `scripts/obras/e2e-diario-anexos.mjs` e `scripts/obras/ui-diario.mjs`.

**Cliente da obra:** toda obra tem um cliente. Na tela, o campo **Cliente** lista as pessoas com o perfil Cliente e tem o atalho **Cadastrar novo cliente** (nome, CPF/CNPJ, telefone e e-mail) para não obrigar a sair do formulário. As obras criadas antes dessa regra aparecem com o aviso "Sem cliente" e só salvam depois de ganhar um. Quem é cliente de uma obra **não pode ser excluído nem perder o perfil Cliente** (409, com o nome das obras). Teste: `node --env-file=.env scripts/obras/e2e-cliente.mjs` (API) e `scripts/obras/ui-cliente.mjs` (interface).

### Cadastros

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET/POST/PUT/DELETE` | `/cadastros/maquinas` | CRUD máquinas |
| `GET/POST/PUT/DELETE` | `/cadastros/funcionarios` | CRUD funcionários |
| `GET/POST/PUT/DELETE` | `/cadastros/insumos` | CRUD insumos |
| `GET/POST/PUT/DELETE` | `/cadastros/tipos-etapa` | CRUD tipos de etapa |
| `POST` | `/cadastros/funcionarios/:id/obras` | Vincula funcionário à obra |
| `DELETE` | `/cadastros/funcionarios/obras/:vincId` | Remove vínculo |

### Demais módulos

| Módulo | Rota base | Operações |
|--------|-----------|-----------|
| Estoque | `/estoque` | GET, POST, PUT, DELETE |
| Alocação | `/alocacao` | GET, POST, DELETE |
| Diário | `/diario` | GET, POST, PUT, DELETE |
| Receitas | `/receitas` | GET (livre), POST, PUT, DELETE (exigem a permissão Financeiro) |
| Despesas | `/despesas` | GET (livre), POST, PUT, DELETE (exigem a permissão Financeiro) |
| Compras | `/compras` | GET, POST, PUT, DELETE, `PATCH /:id/status` |
| Usuários | `/usuarios` | GET, POST, PUT, `PATCH /:id/ativo` |
| Plano | `/plano/uso` | GET — uso atual vs. limites |
| Auditoria | `/auditoria` | GET (paginado, somente `tenant_admin`) |
| Suporte | `/suporte` | Chamados e chat ao vivo (ver [Suporte](#suporte)) |
| Assinatura | `/assinatura` | Situação da conta, faturas e contato (ver [Assinatura e cobrança](#assinatura-e-cobrança)) |
| Pagamentos | `/pagamentos/webhook/:gateway` | POST público: avisos de gateway (`stripe`; idempotente) |
| E-mail | `/email/webhook/resend` | POST público: e-mail recebido (resposta ao chamado), assinado pelo Resend |

---

## Autenticação e Segurança

### Fluxo de tokens

```
Login → { accessToken (15min), refreshToken (30d) }
         │
         ├─ accessToken: enviado no header Authorization: Bearer <token>
         │                JWT com { userId, tenantId, role }
         │
         └─ refreshToken: armazenado em localStorage junto com a sessão
                          POST /api/auth/refresh → novo par (token antigo revogado)
```

O cliente (`src/utils/api.js`) intercepta respostas `401` automaticamente, tenta renovar o token via `/auth/refresh` e repete a requisição original — transparente para o usuário.

### Proteções implementadas

| Proteção | Mecanismo |
|----------|-----------|
| Isolamento multi-tenant | `tenantId` verificado em **todas** as queries |
| IDOR prevention | `findFirst({ where: { id, tenantId } })` antes de toda mutação |
| Rate limiting auth | 10 req / 15 min por IP em login e registro |
| Rate limiting geral | 200 req / min por IP em todas as rotas |
| Auditoria | Toda mutação (POST/PUT/PATCH/DELETE) gravada em `AuditLog` |
| Senhas | bcrypt com salt 10 |
| Proxy Vercel | `app.set('trust proxy', 1)` para IP correto atrás do proxy |

---

## Planos e Limites

Definidos em `server/config/planos.js`. Enforçados via middleware `checkPlanLimit` no POST de cada recurso.

| Recurso | Starter | Pro | Enterprise |
|---------|---------|-----|------------|
| Obras | 3 | 20 | ∞ |
| Funcionários | 10 | 50 | ∞ |
| Usuários | 2 | 10 | ∞ |
| Máquinas | 5 | 30 | ∞ |
| Insumos | 20 | 150 | ∞ |

Quando o uso atinge ≥ 80% do limite, o `PlanoBanner` exibe um aviso no topo da aplicação. Ao atingir 100%, novas criações retornam `403 { error, recurso, limite, atual, upgrade: true }`.

---

## Variáveis de Ambiente

### Backend (Vercel + `.env` local)

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | Sim* | URL de conexão pooled do Neon |
| `DATABASE_URL_UNPOOLED` | Sim* | URL de conexão direta do Neon (fallback) |
| `JWT_SECRET` | Sim | Segredo para assinar os JWTs |
| `FRONTEND_URL` | Não | URL do frontend em produção (para CORS) |
| `PAINEL_HOST` | Em produção | Host do painel da equipe (`painel.construktpro.com.br`); com ele, `/api/painel/*` só responde nesse host. Definir em Production e Preview |
| `PAGAMENTO_GATEWAY` | Não | Provedor de pagamento: `manual` (padrão) ou `stripe`; ver [Assinatura e cobrança](#assinatura-e-cobrança) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Com Stripe | Chave da API e segredo do webhook (`whsec_...`) do Stripe |
| `APP_URL` | Com e-mail ou Stripe | Endereço do sistema (links dos e-mails e retorno do pagamento), sem barra no fim |
| `EMAIL_PROVIDER`, `RESEND_API_KEY`, `EMAIL_REMETENTE`, `EMAIL_RECEBIMENTO_DOMINIO`, `RESEND_WEBHOOK_SECRET` | Com e-mail | E-mail do chamado pelo Resend; ver [Suporte](#suporte). Todas as variáveis estão em `.env.example` |
| `PAGAMENTO_WEBHOOK_SEGREDO` | Não | Segredo do gateway de teste (`falso`); nunca vale em produção |
| `JWT_SECRET_EQUIPE` | Não | Chave própria dos tokens da equipe; sem ela é derivada de `JWT_SECRET` |
| `DEMO_SENHA` | Não | Senha da conta interna de testes (lida por `seed.js`, gravação e testes) |

> *O sistema usa `DATABASE_URL` quando disponível e cai em `DATABASE_URL_UNPOOLED` como fallback automático.

### Conferir a configuração do Resend e do Stripe

`npm run config:verificar` lê o `.env`, **nunca imprime chave** e confere, com leituras nas contas de verdade: variáveis presentes e com o formato certo (`re_`, `whsec_`, `sk_`), domínio de envio verificado e de recebimento habilitado no Resend, webhook `email.received` apontando para `APP_URL`, conta do Stripe no Brasil e apta a cobrar, endpoint de webhook com os 8 eventos, portal do cliente ativado e, no fim, se o sistema publicado responde nas duas rotas de webhook (401 sem assinatura é o certo). Sai com erro (código 1) se algo obrigatório estiver errado. Duas opções que escrevem, sempre em pequena escala:

- `npm run config:verificar -- --enviar voce@dominio.com` envia **um** e-mail de teste pelo Resend.
- `npm run config:verificar -- --checkout` (só com chave `sk_test_`) cria um cliente e uma sessão de Checkout de teste e mostra o endereço para pagar com o cartão `4242 4242 4242 4242`.

Regras puras da conferência: `server/config/verificacao.js` (com teste).

### Exemplo de `.env` local

```env
DATABASE_URL="postgresql://user:pass@host-pooler.neon.tech/neondb?sslmode=require"
DATABASE_URL_UNPOOLED="postgresql://user:pass@host.neon.tech/neondb?sslmode=require"
JWT_SECRET="seu-segredo-aqui"
```

---

## Instalação e Execução Local

### Pré-requisitos

- Node.js 18+
- Conta no [Neon](https://neon.tech) (banco PostgreSQL serverless)

### Passos

```bash
# 1. Clone o repositório
git clone https://github.com/GabiSilva95/obra.git
cd obra

# 2. Instale as dependências (roda prisma generate automaticamente)
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env
# edite o .env com suas credenciais do Neon e JWT_SECRET

# 4. Sincronize o schema com o banco
npx prisma db push

# 5. (Opcional) Crie o usuário de demonstração
npm run seed

# 6. Inicie o backend e o frontend em terminais separados
npm run server   # porta 3001
npm run dev      # porta 3000
```

Acesse: `http://localhost:3000`

---

## Deploy (Vercel + Neon)

1. **Banco:** crie um projeto no [Neon](https://neon.tech) e copie as URLs de conexão pooled e direta
2. **Repositório:** faça push do código para o GitHub
3. **Vercel:**
   - Importe o repositório no [Vercel](https://vercel.com)
   - Adicione as variáveis de ambiente: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `JWT_SECRET` e, para o painel da equipe, `PAINEL_HOST`
   - O deploy roda automaticamente a cada push no `main`
4. **Schema:** execute `npx prisma db push` apontando para o banco de produção para criar as tabelas
5. **Seed:** execute `npm run seed` com a `DATABASE_URL` de produção para criar o usuário de demonstração

O `postinstall` do `package.json` garante que `prisma generate` roda automaticamente no build da Vercel.

---

## Conta interna de demonstração

Existe uma conta interna (`admin@teste.com`, plano Pro) usada só para gravar os vídeos da Central de treinamentos e rodar os testes. **Ela não é pública**: a landing e o login não oferecem acesso demo. A senha vem de `DEMO_SENHA` no `.env` (rode `npm run seed` depois de trocá-la); os scripts de gravação e de teste leem a mesma variável.

-------|-------|
| E-mail | `admin@teste.com` |
| Senha | `admin123` |
| Plano | Pro |

> ⚠️ Para uso em demonstração apenas. Não utilize em produção real.
