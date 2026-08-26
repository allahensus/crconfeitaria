# Fundação Multi-Tenant — Design

**Data:** 2026-08-25
**Status:** Aprovado para planejamento de implementação

## Contexto e roadmap

O objetivo de longo prazo é transformar o sistema da Confeitaria Cinthia
(hoje um app single-tenant em Next.js + Prisma + SQLite) em um produto
SaaS vendável para múltiplas confeitarias, com uma experiência de alto
nível ("efeito wow") tanto no site público de cada loja quanto no painel
administrativo.

Esse objetivo é grande demais para um único spec. Foi decomposto em 6
peças, nesta ordem de dependência:

1. **Fundação multi-tenant** ← este documento
2. Onboarding & cadastro de novas confeitarias
3. Cobrança/assinatura (Stripe/Mercado Pago, planos, trial)
4. White-label / identidade visual por loja
5. "Efeito wow" no site público (por loja)
6. "Efeito wow" no painel admin (por loja)

As peças 4-6 dependem da fundação existir, porque hoje todo dado é
hardcoded para uma única confeitaria — não há "por loja" ainda no
sistema.

## Objetivo deste spec

Adicionar isolamento multi-tenant ao sistema existente sem reescrever
as funcionalidades já construídas (calculadora de orçamento, gestão de
pedidos, financeiro, etc.), migrando o banco de SQLite para Postgres
(Supabase) e preservando os dados atuais da Confeitaria Cinthia como o
primeiro tenant.

Fora de escopo deste spec (viram peças 2-6 do roadmap): tela de
cadastro self-service de novas lojas, cobrança, customização visual por
loja, e qualquer redesign de UI.

## Arquitetura

### Modelo de dados

Novo model:

```prisma
model Organization {
  id        String   @id @default(uuid())
  name      String
  subdomain String   @unique
  status    String   @default("ACTIVE") // TRIAL, ACTIVE, SUSPENDED
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  users     User[]
  // + uma relação para cada model de negócio abaixo
}
```

`User` ganha:
- `organizationId String` (FK obrigatória)
- `role String @default("OWNER")` (`OWNER` | `STAFF`) — substitui o
  `role` genérico atual (`"ADMIN"`), que não fazia sentido multi-tenant.

Cada usuário pertence a **uma única** organização (não há modelo de
usuário compartilhado entre lojas nesta fase).

Todos os models de negócio existentes ganham `organizationId String`
(FK obrigatória, `onDelete: Cascade` a partir de `Organization`):

`Category`, `Product`, `ProductVariation` (via `Product`, não precisa
FK direta), `FillingOption`, `Customer`, `Quote`, `Order`, `Expense`,
`FinancialTransaction`, `Setting`, `Testimonial`, `Ingredient`.

(`QuoteItem`, `OrderItem`, `Payment`, `RecipeItem` não precisam de
`organizationId` próprio — já são escopados via a entidade pai, que por
sua vez já é escopada.)

**Constraints únicas que hoje são globais e precisam virar compostas
com `organizationId`** (senão a segunda loja trava ao tentar usar um
valor já usado pela primeira):

- `Category.slug` → `@@unique([organizationId, slug])`
- `Product.slug` → `@@unique([organizationId, slug])`
- `Quote.quoteNumber` → `@@unique([organizationId, quoteNumber])`
  (a numeração `ORC-2026-0001` passa a ser por loja, não global)
- `Order.orderNumber` → `@@unique([organizationId, orderNumber])`
- `Setting.key` → `@@unique([organizationId, key])` (cada loja tem seu
  próprio `whatsapp_number`, etc.)

`Customer.whatsapp` não tem unique constraint hoje (busca via
`findFirst`), mas essa busca precisa ser escopada por
`organizationId` também — dois clientes com o mesmo WhatsApp em lojas
diferentes são pessoas diferentes no sistema.

### Roteamento & resolução de tenant

- Cada confeitaria é acessada por subdomínio:
  `{subdomain}.seusaas.com.br` (nome de domínio real a definir depois).
- Middleware do Next.js (`middleware.ts`) lê o header `Host`, extrai o
  subdomínio, e injeta `x-tenant-subdomain` como header interno para a
  request.
- Em desenvolvimento local: suporte a `*.localhost` (ex:
  `cinthia.localhost:3007`), que funciona sem configuração de DNS na
  maioria dos navegadores modernos.
- Um helper de servidor `getCurrentOrganization()` lê
  `x-tenant-subdomain` e resolve para o registro `Organization`
  correspondente (com cache em memória por subdomínio, invalidado por
  TTL curto — não precisa de infra de cache dedicada nesta fase).
- Subdomínio sem organização correspondente → página 404 dedicada
  ("Loja não encontrada"), não um erro genérico do Next.js.
- O painel admin fica dentro do subdomínio da própria loja
  (`cinthia.seusaas.com.br/admin`) — não há domínio central de admin
  nesta fase.

### Autenticação e isolamento de acesso a dados

- O JWT de sessão (`src/lib/auth.ts`) passa a incluir `organizationId`
  e `role` no payload, além dos campos já existentes.
- No login, o backend verifica que o `organizationId` do usuário
  autenticado corresponde ao `organizationId` resolvido do subdomínio
  acessado. Se não corresponder, a autenticação falha — impede que um
  funcionário de uma loja acesse o painel de outra mesmo com uma sessão
  válida.
- Todo acesso ao banco passa a usar um **Prisma Client Extension**
  (`src/lib/db.ts` ou similar) que:
  - Recebe obrigatoriamente um `organizationId` para ser instanciado
    (`getScopedPrisma(organizationId)`), não expõe um client "cru" sem
    escopo para código de rota/página.
  - Injeta automaticamente `where: { organizationId }` (ou o
    equivalente via relação) em toda query de leitura e escrita nos
    models listados acima.
  - Lança erro em tempo de execução se alguma chamada tentar contornar
    o escopo — o objetivo é que esquecer o filtro cause uma falha
    visível (erro 500 em dev/teste), nunca um vazamento silencioso de
    dado entre lojas.
- Isso troca o padrão atual, onde cada uma das ~20 rotas de API chama
  `prisma.<model>.findMany(...)` diretamente sem filtro nenhum de
  contexto.

## Fluxo de dados (exemplo: carregar a calculadora de orçamento)

1. Cliente acessa `cinthia.seusaas.com.br`.
2. Middleware extrai `subdomain = "cinthia"`, seta
   `x-tenant-subdomain: cinthia`.
3. A página (Server Component) chama `getCurrentOrganization()` →
   resolve `Organization { id: "org_123", subdomain: "cinthia", ... }`.
4. A página busca produtos/recheios via
   `getScopedPrisma("org_123").product.findMany()` → só retorna
   produtos da Confeitaria Cinthia.
5. Ao submeter um orçamento, a API route repete o mesmo padrão: resolve
   a organização (do subdomínio, para rotas públicas; ou da sessão JWT,
   para rotas do admin) e usa o client escopado para criar o registro.

## Tratamento de erros

- Subdomínio inexistente → 404 dedicado.
- JWT com `organizationId` que não bate com o subdomínio da request →
  sessão inválida, redireciona pro login daquela loja.
- Tentativa de query sem `organizationId` através do client escopado →
  exceção em tempo de execução (fail loud), nunca retorno vazio
  silencioso nem fallback pra "todos os dados".

## Plano de migração dos dados existentes

1. **Ainda em SQLite:** criar migration que adiciona `Organization` e
   `organizationId` como **opcional** (nullable) em todos os models de
   negócio listados acima, mais `role` em `User`.
2. Rodar script (`prisma/migrations/scripts/backfill-organization.ts`
   ou similar) que:
   - Cria a `Organization` "Confeitaria Cinthia Rodrigues" com
     `subdomain: "cinthia"`.
   - Preenche `organizationId` em todas as linhas existentes de todas
     as tabelas com o id dessa organização.
   - Atualiza o(s) `User`(s) existente(s) para `organizationId` dessa
     org e `role: "OWNER"`.
3. Nova migration tornando `organizationId` obrigatório (`NOT NULL`) em
   todos os models, e aplicando as constraints únicas compostas
   listadas acima.
4. Trocar `datasource.provider` de `sqlite` para `postgresql`, apontar
   `DATABASE_URL` para o projeto Supabase.
5. Migrar os dados: dump do SQLite → seed/insert no Postgres,
   preservando todos os IDs (UUIDs) para não quebrar relações.
6. Atualizar as ~20 rotas de API existentes (`src/app/api/**/route.ts`)
   e páginas do admin para usar o client escopado em vez do `prisma`
   importado diretamente — esse é o passo mais mecânico e extenso do
   spec, mas sem lógica de negócio nova (é troca de client, não de
   comportamento).

## Testes

- **Unitário:** o Prisma Extension lança erro quando instanciado ou
  usado sem `organizationId`.
- **Isolamento cross-tenant:** criar 2 organizações de teste, criar
  dados (produto, cliente, orçamento) na primeira, confirmar via client
  escopado da segunda que nenhum desses dados é visível — para cada
  model que ganhou `organizationId`.
- **Smoke test manual:** subir dois subdomínios locais
  (`cinthia.localhost:3007` e um tenant de teste criado a mão),
  confirmar que catálogo, calculadora de orçamento e login do admin
  estão corretamente isolados entre eles.
- Regressão: toda a suíte de fluxos já existentes (orçamento →
  WhatsApp, conversão de orçamento em pedido, financeiro) precisa
  continuar funcionando para o tenant "cinthia" migrado, validando que
  a migração de dados não quebrou nada.

## Riscos e decisões conscientes

- **SQLite → Postgres em produção** é uma migração de infraestrutura
  real, não só de schema — inclui trocar a string de conexão, revisar
  qualquer SQL específico de SQLite (não identificado nenhum uso de
  SQL cru no código até agora), e testar performance básica.
- **Reescrever ~20 rotas de API** para usar o client escopado é
  trabalho mecânico repetitivo, mas é exatamente o tipo de mudança
  onde um esquecimento pontual gera um bug sério (vazamento de dado
  entre lojas) — por isso o design força a falha em vez de permitir um
  fallback silencioso sem escopo.
- **Não há painel de super-admin da plataforma** (para você gerenciar
  todas as organizações) nesta fase — isso fica para a peça de
  onboarding/cobrança do roadmap. Nesta fase, criar uma nova
  organização é feito via script/seed manual.
