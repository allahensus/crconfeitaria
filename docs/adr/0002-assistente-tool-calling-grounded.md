# ADR 0002 — Assistente de IA responde só via tool-calling, nunca de memória

**Status:** Aceito
**Data:** 2026-09-17 (ver `docs/superpowers/specs/2026-09-17-assistente-ia-site-design.md`)

## Contexto

O assistente de IA do site público precisa responder sobre sabores, preços e disponibilidade de data. Um modelo de linguagem, sozinho, pode "alucinar" essas respostas -- inventar um preço ou um sabor que não existe é o pior tipo de erro possível pra um sistema de vendas: o cliente confia na resposta.

## Decisão

O assistente nunca é autorizado a afirmar preço, sabor ou disponibilidade a partir do próprio conhecimento. Toda afirmação desse tipo obriga uma chamada de ferramenta (`listarBolosECategorias`, `listarRecheios`, `verificarDisponibilidade`) que consulta o banco real, escopado pela organização. Essa regra está tanto no system prompt (`buildAssistantInstructions`, `src/lib/assistant-tools.ts`) quanto estruturalmente: as próprias ferramentas são o único caminho de acesso a esse dado dentro da conversa.

## Alternativas descartadas

- **RAG (embeddings + busca vetorial) sobre o catálogo.** Sobre-engenharia pro tamanho do catálogo (dezenas de produtos/recheios, não milhares) -- tool-calling direto contra o banco relacional já é exato e mais simples de auditar.
- **Confiar no prompt sozinho** ("responda só com base nos dados fornecidos", sem ferramentas, injetando o catálogo inteiro no contexto). Funciona até o catálogo crescer ou os dados mudarem no meio de uma conversa longa; tool-calling garante que o dado é sempre lido no momento da pergunta, nunca cacheado no prompt.

## Consequências

- Cada resposta correta depende do modelo *decidir* chamar a ferramenta certa -- o prompt precisa reforçar isso explicitamente (regra 3 do system prompt), e uma falha aqui é silenciosa (o modelo responde algo plausível, não um erro).
- Adicionar um novo fato que o assistente precisa saber (ex: prazo mínimo, política de entrega, sinal de pagamento) exige ou uma nova ferramenta ou um fato fixo no prompt vindo de configuração real (nunca um valor chumbado no código) -- foi exatamente o que faltou quando o assistente "chutou" o prazo mínimo antes da correção que adicionou `minLeadDays` às instruções.
