# ADR 0003 — Gemini free tier direto, sem Vercel AI Gateway

**Status:** Aceito
**Data:** 2026-09-17

## Contexto

O assistente de IA precisava de um provedor de modelo de linguagem. A prioridade explícita do dono do negócio era custo zero -- o projeto ainda não gera receita suficiente pra justificar uma conta de IA por token, mesmo pequena.

## Decisão

Uso direto do provedor Google (`@ai-sdk/google`) com uma chave gratuita gerada no Google AI Studio, sem passar pelo Vercel AI Gateway. Modelo escolhido: `gemini-3.5-flash-lite`, depois de duas trocas em produção (`gemini-3.8-flash` tinha cota gratuita de só 5 requisições/minuto; `gemini-2.5-flash-lite` foi descontinuado pra chaves novas).

## Alternativas descartadas

- **Vercel AI Gateway com um modelo pago barato** (GPT-4o-mini, Gemini Flash). Custo real, ainda que baixo (bem menos de R$5/mês nesse volume) -- descartado porque contraria a prioridade explícita de custo zero, não porque fosse tecnicamente inferior. É a evolução natural se o tráfego crescer.
- **Groq** (serve modelos abertos, inclusive DeepSeek, com camada gratuita historicamente mais generosa em requisições/minuto). Considerado como plano B, não adotado ainda -- fica registrado como próxima tentativa se o Gemini free tier continuar instável.

## Consequências

- Sem AI Gateway, não há observability/dashboard de custo unificado do Vercel pra esse tráfego -- o controle de custo depende inteiramente dos limites aplicados no próprio código (ver rate limiting e caps de token no handler de `/api/assistant`).
- A camada gratuita do Gemini pode ficar indisponível ou mudar de modelo disponível sem aviso -- já aconteceu duas vezes em produção. Mitigado por um fallback no widget (mensagem de erro + link direto de WhatsApp) pra nunca deixar o cliente sem alternativa quando a IA falha.
- Migrar pra AI Gateway depois é uma troca de poucas linhas (`google('modelo')` → uma string de modelo do Gateway) -- essa decisão não fecha portas, só adia o custo.
