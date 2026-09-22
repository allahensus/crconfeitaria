<p align="center">
  <img src="public/logo_cinthia.png" alt="Cinthia Rodrigues Confeitaria" width="96" />
</p>

<h1 align="center">CR Confeitaria</h1>

<p align="center">
  Plataforma SaaS de gestão para confeitarias artesanais — vitrine pública para o cliente montar o orçamento sozinho e painel administrativo completo para a confeiteira tocar o negócio.
</p>

<p align="center">
  <a href="https://crconfeitaria.vercel.app"><strong>🔗 Demo ao vivo</strong></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?logo=next.js" alt="Next.js 15" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/PostgreSQL-Supabase-3ECF8E?logo=supabase" alt="Postgres via Supabase" />
  <img src="https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel" alt="Vercel" />
</p>

![Hero](public/images/hero-bolo-destaque.jpg)

## Sobre o projeto

Encomendas de bolos e doces para confeitarias artesanais normalmente acontecem inteiramente pelo WhatsApp: orçamento manual, controle de pedidos em planilha, financeiro anotado à parte. O **CR Confeitaria** substitui esse fluxo por uma plataforma própria — o cliente monta o orçamento (bolo, recheio, cobertura, variação, cupom de desconto) direto no site, e a confeiteira recebe tudo organizado em um painel administrativo, do orçamento à entrega.

Projeto real, construído para a confeitaria da Cinthia Rodrigues e arquitetado como **multi-tenant** (cada confeitaria roda em seu próprio subdomínio, sobre a mesma base de código).

📖 Para as decisões, desafios e o porquê de cada escolha ao longo do projeto, veja [`docs/HISTORIA_DO_PRODUTO.md`](docs/HISTORIA_DO_PRODUTO.md).
🏗️ Para a arquitetura com diagrama, veja [`docs/arquitetura.md`](docs/arquitetura.md); para as decisões de arquitetura registradas formalmente (ADRs), veja [`docs/adr/`](docs/adr/).

## Funcionalidades

**Loja pública**
- Catálogo de produtos por categoria, com variações (tamanho/fatias) e opções de recheio/cobertura
- Calculadora de orçamento interativa com cupom de desconto e cálculo de sinal
- Calendário com datas indisponíveis bloqueadas pela confeiteira
- Galeria de fotos e depoimentos de clientes
- Página de avaliação pós-entrega (review) e botão flutuante de WhatsApp

**Painel administrativo**
- Pedidos com pipeline de status (novo → confirmado → em produção → pronto → entregue)
- Orçamentos, clientes (CRM simples com LGPD) e cupons de desconto
- Financeiro: receitas, despesas e pagamentos parciais/integrais por pedido
- Estoque de insumos com receita por produto e baixa automática de estoque a cada pedido
- Equipe com papéis (dona da loja / equipe) e permissões
- Configurações da loja, categorias, produtos e galeria

## Stack técnica

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 15 (App Router) + React 19 + TypeScript |
| Estilo | Tailwind CSS |
| Banco de dados | PostgreSQL (Supabase) via Prisma ORM |
| Autenticação | JWT em cookie httpOnly (jose), sessão por organização |
| Upload de arquivos | Vercel Blob |
| Multi-tenant | roteamento por subdomínio (middleware do Next.js) |
| Testes | Vitest |
| Deploy | Vercel |

## Arquitetura de dados (camadas bronze/prata/ouro)

O sistema não usa um data warehouse separado -- é um banco transacional (Postgres via Prisma) servindo uma aplicação web, não um pipeline analítico com múltiplas fontes. Mas o raciocínio por trás da arquitetura em camadas (medalhão) já aparece de forma natural em como os dados fluem até virar decisão de negócio:

| Camada | O que é aqui | Onde vive |
|---|---|---|
| **Bronze** (bruto) | Dado transacional exatamente como é gravado -- pedidos, orçamentos, pagamentos, recheios, insumos | Tabelas do `prisma/schema.prisma`, escopadas por `organizationId` |
| **Prata** (limpo) | O mesmo dado, mas validado, tipado e com relacionamentos garantidos pelo ORM -- nunca um pedido sem cliente válido, nunca um recheio com preço negativo | Camada de acesso em `src/lib/` (`db.ts`, `stock.ts`, `coupons.ts`) e as rotas de API, que validam antes de gravar |
| **Ouro** (agregado, pronto pra decisão) | Métricas de negócio prontas pra visualização: receita x despesa por mês, produtos mais vendidos, KPIs do painel | `src/app/admin/page.tsx` (`buildMonthlyRevenueExpense`, `buildTopProducts`) e os cards do Dashboard |

Hoje a camada "ouro" é calculada sob demanda (a cada carregamento do Dashboard), não materializada em tabelas próprias -- suficiente para o volume atual. Se o negócio crescer a ponto de precisar de relatórios históricos pesados ou múltiplas lojas consolidadas, o próximo passo natural é materializar essas agregações em views ou tabelas de resumo, sem precisar de um data warehouse externo.

## Estrutura do projeto

```
├── prisma/
│   ├── schema.prisma        # Modelo de dados (multi-tenant: tudo escopado por organizationId)
│   └── seed.ts               # Popula uma organização de exemplo com dados de demonstração
├── scripts/
│   └── with-env.js           # Roda um comando (push/seed/studio) contra um .env específico (ex: produção)
├── src/
│   ├── app/
│   │   ├── page.tsx           # Loja pública (catálogo + calculadora de orçamento)
│   │   ├── pedido/            # Acompanhamento de pedido pelo cliente
│   │   ├── avaliar/           # Página de avaliação pós-entrega
│   │   ├── galeria/           # Galeria pública de fotos
│   │   ├── admin/             # Painel administrativo (pedidos, clientes, financeiro, estoque, equipe...)
│   │   └── api/                # Rotas de API (auth, orders, products, finance, team, ...)
│   ├── components/
│   │   ├── public/             # Componentes da loja pública
│   │   └── admin/               # Componentes do painel administrativo
│   ├── lib/
│   │   ├── auth.ts              # Sessão JWT (cookie httpOnly) e checagem de papel (OWNER/STAFF)
│   │   ├── db.ts                 # Prisma client com escopo automático por organizationId
│   │   ├── tenant.ts             # Resolução da organização a partir do subdomínio
│   │   ├── stock.ts               # Baixa de estoque de insumos a partir da receita do produto
│   │   ├── coupons.ts             # Validação e aplicação de cupons de desconto
│   │   └── pix.ts                  # Geração de cobrança Pix
│   └── middleware.ts           # Rate limiting, defesa CSRF e roteamento por subdomínio
├── tests/
│   ├── lib/                    # Testes unitários, um arquivo por módulo de src/lib/
│   └── integration/             # Testes de integração (ex: isolamento entre tenants)
├── CLAUDE.md                    # Contexto do projeto pra agentes de código
└── docs/
    ├── PRD.md                  # Documento de requisitos do produto
    ├── HISTORIA_DO_PRODUTO.md  # A história do projeto: decisões, desafios e porquês
    ├── arquitetura.md          # Diagrama e explicação da arquitetura, incluindo o assistente de IA
    ├── adr/                     # Registro das decisões de arquitetura (ADRs)
    └── superpowers/
        ├── specs/               # Design de cada feature antes de implementar
        └── plans/                # Planos técnicos de features já entregues
```

## Rodando localmente

```bash
git clone https://github.com/allahensus/crconfeitaria.git
cd crconfeitaria
npm install
cp .env.example .env   # preencha DATABASE_URL, DIRECT_URL e JWT_SECRET
npm run db:push        # cria as tabelas no banco configurado em .env
npm run db:seed        # popula dados de exemplo (loja "cinthia")
npm run dev
```

Acesse `http://localhost:3000`. O painel administrativo fica em `/admin/login`.

### Scripts úteis

| Comando | Descrição |
|---|---|
| `npm run dev` | Sobe o servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm test` | Roda a suíte de testes (Vitest) |
| `npm run db:push` / `db:seed` | Aplica o schema / popula dados no banco de **`.env`** |
| `npm run db:push:prod` / `db:seed:prod` | Mesmo, mas apontando para `.env.production.local` |
| `npm run db:studio:prod` | Abre o Prisma Studio contra o banco de produção |

## Autor

Desenvolvido por [Allan Hensus](https://github.com/allahensus).
