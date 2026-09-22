# CLAUDE.md

Contexto pra qualquer agente de código (Claude Code ou outro) trabalhando neste repositório.

## O projeto

CR Confeitaria é um SaaS multi-tenant para confeitarias artesanais: vitrine pública com calculadora de orçamento + painel administrativo (pedidos, clientes, financeiro, estoque, equipe). Primeiro tenant real: Confeitaria Cinthia Rodrigues. Veja `docs/PRD.md` e `docs/HISTORIA_DO_PRODUTO.md` pro contexto de produto completo.

## Stack

Next.js 15 (App Router) + React 19 + TypeScript, Tailwind CSS, PostgreSQL (Supabase) via Prisma, JWT em cookie httpOnly, Vitest, deploy no Vercel. Assistente de IA público usa `ai` (Vercel AI SDK) + `@ai-sdk/google` (Gemini free tier).

## Comandos essenciais

```bash
npm run dev              # servidor local
npm test                 # suíte de testes (vitest run) -- alguns são de integração e usam TEST_DATABASE_URL real
npx tsc --noEmit -p .    # type-check, sempre rodar antes de commitar
npm run db:push          # aplica o schema no banco de .env local
npm run db:seed          # popula dados de demonstração
```

## Convenções que não são óbvias lendo o código

- **Tudo é escopado por `organizationId`.** Nunca faça uma query Prisma direta sem passar por `getScopedPrisma(organizationId)` (`src/lib/db.ts`) -- ele injeta o filtro automaticamente pros models multi-tenant. Rotas de API seguem sempre o mesmo padrão: `getCurrentOrganization()` (público) ou `getSession()` (autenticado) → `getScopedPrisma(...)` → query.
- **Rate limiting é centralizado**, não por rota. Ele vive em `src/middleware.ts` + `src/lib/rate-limit.ts` (`RATE_LIMITED_ROUTES`). Uma rota nova que precisa de limite só adiciona uma entrada nesse mapa -- nunca chama `checkRateLimit` dentro do próprio handler.
- **O assistente de IA (`/api/assistant`, `src/lib/assistant-tools.ts`) nunca responde preço/sabor/disponibilidade de memória** -- sempre via tool-calling contra o banco real. Ver `docs/adr/` pras decisões de escopo desse assistente.
- Specs de features maiores ficam em `docs/superpowers/specs/` (design) e `docs/superpowers/plans/` (plano de implementação task-a-task), datados `YYYY-MM-DD-tema`. Decisões de arquitetura mais amplas ficam em `docs/adr/` (ver `docs/adr/README.md`).

## Fluxo de trabalho obrigatório

- **Nunca commitar direto na `main`.** Toda mudança (incluindo correção urgente) vai numa branch própria, com Pull Request, e só mescla com o CI (`build-and-test`) verde. A branch `main` está protegida no GitHub exigindo isso.
- Rode `npx tsc --noEmit -p .` antes de qualquer commit. Rode os testes relevantes ao que foi alterado (a suíte inteira é lenta por causa dos testes de integração contra banco real).
- Para features maiores, prefira o fluxo brainstorm → spec → plano (`docs/superpowers/`) antes de implementar.
