# ADR 0004 — Assistente só tira dúvida e encaminha pro WhatsApp (não fecha pedido)

**Status:** Aceito, sob revisão ativa (ver Fase 3 do plano de adequação ao desafio "Jornada de Dados")
**Data:** 2026-09-17

## Contexto

Ao desenhar o assistente de IA, havia duas direções possíveis: um assistente que só responde perguntas e entrega o cliente pra confeiteira decidir tudo, ou um assistente que efetivamente monta e fecha um pedido sozinho.

## Decisão

O assistente responde dúvidas com dados reais (catálogo, recheios, disponibilidade) e, quando o cliente parece pronto pra avançar, gera um resumo da conversa e um link de WhatsApp pronto (`gerarResumoWhatsApp`). Ele nunca cria um `Quote` ou `Order` no banco -- a decisão de negócio final é sempre humana, pelo WhatsApp.

## Alternativas descartadas

- **Assistente monta o orçamento de verdade** (cria `Quote` no banco em linguagem natural, equivalente à calculadora de orçamento existente). Mais útil, mas o risco de um item ou preço errado ir pro banco sem revisão humana foi considerado alto demais pra uma primeira versão -- especialmente combinado com a possibilidade de um cliente forjar histórico de conversa (ver a seção "Riscos aceitos" do spec do assistente).

## Consequências

- Zero risco de o assistente criar um pedido incorreto no sistema -- o pior caso é uma mensagem de WhatsApp mal formatada, não um dado ruim no banco.
- Em compensação, o assistente não cumpre hoje o requisito de "conduzir a venda até o fim" (pedido, pagamento, documento) que o desafio "Jornada de Dados" pede como núcleo do produto -- ele para no meio do caminho, na entrega pro humano.
- Essa é a decisão que a Fase 3 do plano de adequação ao desafio revisita: dar ao assistente a capacidade de montar um pedido de verdade, mas com um portão de aprovação humana explícito antes de qualquer coisa virar irreversível (pedido confirmado, cobrança gerada) -- preservando o espírito desta decisão (nunca sem revisão humana) em vez de simplesmente descartá-la.
