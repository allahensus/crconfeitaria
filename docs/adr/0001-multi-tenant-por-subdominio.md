# ADR 0001 — Multi-tenant por subdomínio, uma base de código

**Status:** Aceito
**Data:** 2026-08-25 (decisão original, ver `docs/superpowers/specs/2026-08-25-multi-tenant-foundation-design.md` para o design completo)

## Contexto

O objetivo de longo prazo é transformar o sistema, hoje construído pra uma única confeitaria (Cinthia Rodrigues), num produto vendável pra múltiplas confeitarias. Era preciso decidir como isolar os dados e a identidade visual de cada loja.

## Decisão

Cada confeitaria roda em seu próprio subdomínio (ex: `cinthia.dominio.com`), resolvido pelo middleware do Next.js, sobre a **mesma base de código e o mesmo banco**. Isolamento de dados é feito em nível de aplicação: todo model de negócio ganha `organizationId`, e todo acesso ao banco passa por `getScopedPrisma(organizationId)`, que injeta o filtro automaticamente.

## Alternativas descartadas

- **Um banco de dados por cliente.** Isolamento mais forte, mas multiplica custo de infraestrutura e complexidade de migração a cada nova loja -- desproporcional pro estágio atual (poucos tenants).
- **Um deploy por cliente (fork do código).** Descartado de cara: qualquer correção de bug ou feature nova precisaria ser replicada manualmente em cada fork. Inviável de manter.
- **Isolamento por schema Postgres por tenant.** Mais forte que filtro por coluna, mas exige migração de schema coordenada por tenant e complica queries cross-tenant que o admin da plataforma eventualmente vai precisar. Fica como evolução futura se o isolamento por coluna se mostrar insuficiente.

## Consequências

- Onboarding de uma nova confeitaria é rápido (criar uma `Organization`, sem deploy novo).
- Todo model de negócio precisa lembrar de ganhar `organizationId` e passar pelo `getScopedPrisma` -- um erro aqui vaza dado entre tenants. Mitigado por um teste de integração dedicado (`tests/integration/tenant-isolation.test.ts`).
- Uma falha no filtro automático do `getScopedPrisma` é uma falha de segurança grave (cross-tenant), não um bug qualquer -- esse caminho de código pede revisão extra sempre que é tocado.
