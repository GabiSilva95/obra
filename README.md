# ConstruktPro

Sistema SaaS de gestão de obras com multi-tenancy, controle de etapas, estoque, alocação de recursos, diário de obra, financeiro e compras.

---

## Sumário

- [Visão Geral](#visão-geral)
- [Stack Técnica](#stack-técnica)
- [Arquitetura](#arquitetura)
- [Estrutura de Diretórios](#estrutura-de-diretórios)
- [Design System](#design-system)
- [Modelos de Dados](#modelos-de-dados)
- [API — Rotas](#api--rotas)
- [Autenticação e Segurança](#autenticação-e-segurança)
- [Planos e Limites](#planos-e-limites)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Instalação e Execução Local](#instalação-e-execução-local)
- [Deploy (Vercel + Neon)](#deploy-vercel--neon)
- [Credenciais de Demonstração](#credenciais-de-demonstração)

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
│   └── routes/
│       ├── auth.js            # Login, registro, refresh, logout
│       ├── obras.js           # CRUD obras + etapas
│       ├── cadastros.js       # Máquinas, funcionários, insumos, tipos de etapa
│       ├── estoque.js         # Movimentações de estoque
│       ├── alocacao.js        # Alocação de máquinas e insumos
│       ├── diario.js          # Diário de obra
│       ├── receitas.js        # Receitas por obra
│       ├── compras.js         # Ordens de compra
│       ├── usuarios.js        # Gestão de usuários do tenant
│       ├── plano.js           # Consulta de uso e limites do plano
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
│   │   ├── Sidebar.jsx        # Menu (MENU, abas do mobile) sobre o Sidebar do design system
│   │   ├── PageActions.jsx    # Portal das ações de cada página para o Header do shell
│   │   ├── Notificacoes.jsx   # Alertas computados em tempo real (sino do Header)
│   │   ├── AvisoModal.jsx     # Renderiza os avisos de utils/aviso.js
│   │   └── AnexosObra.jsx     # Upload e lista de anexos da obra
│   └── pages/
│       ├── Dashboard.jsx
│       ├── Obras.jsx
│       ├── Cadastros.jsx
│       ├── Estoque.jsx
│       ├── Alocacao.jsx
│       ├── Diario.jsx
│       ├── Financeiro.jsx     # Resumo, receitas, fluxo de caixa
│       ├── Compras.jsx
│       ├── Relatorios.jsx     # Gantt, exportação CSV/PDF
│       ├── TiposEtapa.jsx
│       ├── Usuarios.jsx
│       ├── Login.jsx
│       ├── Registro.jsx
│       └── PlanosPage.jsx     # Landing pública com planos
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

## Modelos de Dados

### Principais

| Modelo | Descrição |
|--------|-----------|
| `Tenant` | Empresa/conta. Possui `plano` (starter/pro/enterprise) |
| `User` | Usuário do tenant. `role`: `tenant_admin` ou `user`. `permissoes[]` por módulo |
| `Obra` | Obra com orçamento, status, datas e etapas |
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
| `POST` | `/auth/registro` | Cria tenant + admin |
| `POST` | `/auth/login` | Retorna access token (15 min) + refresh token (30 dias) |
| `POST` | `/auth/refresh` | Emite novo par de tokens (rotação automática) |
| `POST` | `/auth/logout` | Revoga o refresh token |

### Obras

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/obras` | Lista obras do tenant |
| `POST` | `/obras` | Cria obra (verifica cota do plano) |
| `PUT` | `/obras/:id` | Atualiza obra |
| `DELETE` | `/obras/:id` | Remove obra |
| `GET` | `/obras/:id/etapas` | Lista etapas da obra |
| `POST` | `/obras/:id/etapas` | Adiciona etapa |
| `PUT` | `/obras/:id/etapas/:etapaId` | Atualiza etapa |
| `DELETE` | `/obras/:id/etapas/:etapaId` | Remove etapa |

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
| Receitas | `/receitas` | GET, POST, PUT, DELETE |
| Compras | `/compras` | GET, POST, PUT, DELETE, `PATCH /:id/status` |
| Usuários | `/usuarios` | GET, POST, PUT, `PATCH /:id/ativo` |
| Plano | `/plano/uso` | GET — uso atual vs. limites |
| Auditoria | `/auditoria` | GET (paginado, somente `tenant_admin`) |

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

> *O sistema usa `DATABASE_URL` quando disponível e cai em `DATABASE_URL_UNPOOLED` como fallback automático.

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
   - Adicione as variáveis de ambiente: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `JWT_SECRET`
   - O deploy roda automaticamente a cada push no `main`
4. **Schema:** execute `npx prisma db push` apontando para o banco de produção para criar as tabelas
5. **Seed:** execute `npm run seed` com a `DATABASE_URL` de produção para criar o usuário de demonstração

O `postinstall` do `package.json` garante que `prisma generate` roda automaticamente no build da Vercel.

---

## Credenciais de Demonstração

| Campo | Valor |
|-------|-------|
| E-mail | `admin@teste.com` |
| Senha | `admin123` |
| Plano | Pro |

> ⚠️ Para uso em demonstração apenas. Não utilize em produção real.
