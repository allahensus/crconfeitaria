# Architecture Decision Records

Registro das decisões de arquitetura deste projeto: o que foi decidido, quais alternativas foram descartadas e por quê, e as consequências aceitas. Cada ADR é um arquivo numerado sequencialmente e imutável -- uma decisão revista vira um novo ADR que referencia o antigo, nunca uma edição no arquivo original.

| ADR | Título |
|---|---|
| [0001](0001-multi-tenant-por-subdominio.md) | Multi-tenant por subdomínio, uma base de código |
| [0002](0002-assistente-tool-calling-grounded.md) | Assistente de IA responde só via tool-calling, nunca de memória |
| [0003](0003-gemini-free-tier-sem-ai-gateway.md) | Gemini free tier direto, sem Vercel AI Gateway |
| [0004](0004-assistente-so-tira-duvida-e-encaminha.md) | Assistente só tira dúvida e encaminha pro WhatsApp (não fecha pedido) |
| [0005](0005-rate-limiting-centralizado-no-middleware.md) | Rate limiting centralizado no middleware, não por rota |
