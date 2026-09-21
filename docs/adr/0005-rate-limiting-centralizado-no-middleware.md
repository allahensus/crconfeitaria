# ADR 0005 — Rate limiting centralizado no middleware, não por rota

**Status:** Aceito
**Data:** 2026-09-07 (decisão original), reforçada em 2026-09-17 ao integrar o assistente de IA

## Contexto

Algumas rotas públicas (login, criação de orçamento, validação de cupom, rastreio de pedido, e depois o assistente de IA) precisam de proteção contra abuso -- alguém automatizando requisições em sequência.

## Decisão

Um único ponto de controle: `src/middleware.ts` lê um mapa (`RATE_LIMITED_ROUTES` em `src/lib/rate-limit.ts`) de `"MÉTODO caminho" → limite`, e aplica o limite antes de qualquer handler rodar. Adicionar limite a uma rota nova é uma linha nesse mapa -- o handler da rota nunca chama a lógica de rate limit diretamente.

## Alternativas descartadas

- **Cada rota chama `checkRateLimit` no próprio handler.** Foi a primeira versão implementada pro assistente de IA, e revisada durante o code review final: criava um segundo contador paralelo, com uma chave diferente da que o middleware já usava pra essa mesma rota -- ineficaz (não travava nada de fato) e confuso de depurar.

## Consequências

- Consistência garantida: não existe risco de uma rota nova "esquecer" o padrão e implementar rate limit do jeito errado, porque não há decisão nenhuma a tomar no handler.
- O rate limiter em si é em memória, por instância de função -- funciona pro caso comum (um script batendo de um lugar só), mas não é uma defesa real contra ataque distribuído. Isso é uma limitação conhecida e documentada no próprio `src/lib/rate-limit.ts`, não uma omissão: substituir por um contador compartilhado (Redis/KV) fica como evolução futura, não bloqueante pro estágio atual do produto.
