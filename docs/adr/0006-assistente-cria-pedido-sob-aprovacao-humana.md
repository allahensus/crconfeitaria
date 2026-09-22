# ADR 0006 — Assistente cria pedido, mas sempre sob aprovação humana

**Status:** Aceito
**Data:** 2026-09-21 (ver `docs/superpowers/specs/2026-09-21-acucena-agente-vendas-design.md`)
**Supersede:** ADR 0004

## Contexto

ADR 0004 decidiu que o assistente de IA nunca cria um `Quote` ou `Order` no banco -- ele só tira dúvidas e encaminha a conversa pro WhatsApp via `gerarResumoWhatsApp`, deixando toda decisão de negócio para o humano. Essa decisão evitava o risco de um item ou preço errado (ou um histórico de conversa forjado pelo cliente) virar um pedido real sem revisão.

O próprio ADR 0004 já registrava essa lacuna como aceita, não resolvida: o desafio "Jornada de Dados" pede um assistente capaz de conduzir a venda até o fim (pedido, pagamento, documento), e um assistente que só entrega o cliente pro WhatsApp no meio do caminho não cumpre isso. A Fase 3 do plano de adequação (`docs/superpowers/plans/2026-09-21-acucena-agente-vendas.md`) existe justamente para fechar essa lacuna.

## Decisão

A Açucena (nome do assistente, ver Task 2 do plano) ganha uma nova ferramenta, `fecharPedido`, que cria um `Quote` de verdade no banco via `createQuote` (`src/lib/quotes.ts`) -- os mesmos preços, variações e regras de validação usados pela calculadora de orçamento pública, nunca um valor inventado pelo modelo.

Toda `Quote` criada por essa ferramenta é marcada com duas garantias que nunca são puladas:

- `status: 'PENDING'` -- o mesmo status inicial de qualquer orçamento, nunca criado como já confirmado;
- `createdByAssistant: true` -- sinaliza a origem do pedido, distinguindo-o de um orçamento que o próprio cliente preencheu na calculadora.

Pedidos com `createdByAssistant: true` aparecem numa fila dedicada, `/admin/aprovacoes-ia`, onde a confeiteira revisa e aprova (ou rejeita) cada um antes que ele vire uma `Order` de verdade. Nenhum pedido criado pela Açucena pula essa fila -- não existe caminho de auto-aprovação.

Isso supersede a restrição de "nunca cria um Quote ou Order no banco" do ADR 0004, mas preserva o espírito da decisão original: o assistente nunca compromete o negócio unilateralmente. O portão de aprovação humana substitui o "nunca escreve no banco" como o mecanismo que garante isso.

## Alternativas descartadas

- **Manter o ADR 0004 como está**, sem revisitar. Descartado porque deixa o produto sem cumprir o requisito central do desafio "Jornada de Dados" -- um assistente que para no meio do caminho não é uma jornada completa.
- **Assistente cria a `Order` diretamente, sem fila de aprovação.** O risco identificado no ADR 0004 (preço errado, histórico forjado, ou uma alucinação do modelo virando um compromisso real com o cliente) continua existindo; pular a aprovação só porque agora há uma ferramenta de tool-calling não elimina esse risco, ele só fica invisível até dar problema.
- **Aprovação automática com auditoria a posteriori** (cria a `Order` na hora, mas registra um log pra revisão futura). Rejeitada pelo mesmo motivo: revisão depois que o compromisso já foi assumido com o cliente não evita o dano, só documenta que ele aconteceu.

## Consequências

- A Açucena agora cumpre o fluxo completo até o ponto de gerar um pedido revisável -- fecha a lacuna que o próprio ADR 0004 deixava em aberto.
- `createQuote` precisa continuar sendo a única porta de entrada para criar um `Quote`, tanto pela rota pública (`POST /api/quotes`) quanto pela Açucena (`fecharPedido`) -- qualquer nova regra de validação em uma vale para as duas, e a rota pública precisa recusar explicitamente um `createdByAssistant: true` vindo do cliente (só `fecharPedido`, chamando `createQuote` diretamente, pode setar isso).
- A fila `/admin/aprovacoes-ia` vira um passo obrigatório no fluxo de trabalho da confeiteira sempre que a Açucena fecha um pedido -- um pedido de IA parado nessa fila sem revisão é, na prática, um pedido que nunca chega ao cliente; a operação da confeitaria precisa checar essa fila com regularidade.
- O pior caso de uma alucinação do modelo (produto ou variação errados, data indisponível) continua contido: `fecharPedido` só usa preço e disponibilidade vindos do banco real, e mesmo assim o pedido fica pendente de aprovação -- nunca vira uma `Order` ou uma cobrança sem a confeiteira olhar antes.
