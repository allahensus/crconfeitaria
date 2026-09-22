# Açucena — Agente de Vendas de Ponta a Ponta — Design

**Data:** 2026-09-21
**Status:** Aprovado para planejamento de implementação

## Contexto

Este projeto está sendo adequado ao desafio "Jornada de Dados — Construa um Agente de Vendas de Ponta a Ponta". O núcleo do desafio é um agente que conduz a venda do primeiro "oi" até o fim: recomendação, pedido, aprovação humana pro que é irreversível, pagamento (simulado) e documento emitido (simulado).

O assistente de IA atual (ver [ADR 0002](../../adr/0002-assistente-tool-calling-grounded.md) e [ADR 0004](../../adr/0004-assistente-so-tira-duvida-e-encaminha.md)) responde dúvidas com dados reais e encaminha pro WhatsApp, mas nunca cria nada no banco — decisão consciente na época, revisitada agora. Este spec é a Fase 3 do plano de adequação ao desafio (Fases 1 e 2 -- documentação de engenharia e observabilidade -- já entregues).

Fora de escopo deste spec: gateway de pagamento real (mesmo em sandbox), geração de PDF, e qualquer canal além do site (WhatsApp Business API continua fora, como já era).

## Decisões já tomadas com o usuário

- **Nome do agente:** Açucena.
- **Onde a confeiteira aprova:** fila separada (`/admin/aprovacoes-ia`), não misturada com a tela de Orçamentos normal.
- **Pagamento simulado:** botão manual "Confirmar Pagamento (Simulado)", sem gateway externo.
- **Documento:** página HTML pública, não PDF.

## Descoberta importante: muita infraestrutura já existe

Antes de desenhar, levantei o que o sistema já tem -- isso reduz bastante o escopo real deste spec:

- **Aprovação humana já existe.** `Quote.status` (`PENDING → APPROVED/REJECTED → CONVERTED`) já tem UI completa em `/admin/orcamentos` e a rota `PUT /api/quotes/[id]` já aceita `{ status }` (aprovar/rejeitar) e `{ convertToOrder: true }` (vira `Order`), com geração de número de pedido e atualização de métricas do cliente. Fase 3 **reaproveita esse fluxo**, não recria.
- **Registro de pagamento já existe.** `PUT /api/orders/[id]` com `{ addPayment: { amount, paymentMethod, notes } }` já cria um `Payment`, recalcula `paidAmount`/`paymentStatus` a partir da soma autoritativa dos pagamentos confirmados, dentro de uma transação seguro contra concorrência. Fase 3 só precisa de um atalho de UI que chama isso com `paymentMethod: 'Simulado'`.
- **Página pública com verificação por WhatsApp já existe** (`/pedido` + `/api/track`, por número + WhatsApp). O recibo segue o mesmo modelo de acesso.

## Arquitetura

### 1. Identidade

O assistente passa a se chamar **Açucena** em todo lugar visível: cabeçalho do widget (`src/components/public/AssistantChat.tsx`), botão "Tirar Dúvidas" da navbar, e a primeira frase do system prompt (`buildAssistantInstructions`, `src/lib/assistant-tools.ts`) passa a ser "Você é a Açucena, assistente virtual da confeitaria [nome]...".

### 2. Recomendação por necessidade

Sem ferramenta nova. Novas regras no system prompt (`buildAssistantInstructions`):

- Quando o cliente descrever uma necessidade em vez de pedir um produto específico (ex: "quero algo pra aniversário de criança"), a Açucena deve perguntar o que falta pra recomendar bem antes de recomendar: ocasião, número de convidados/fatias aproximado, tema/estilo, se tem preferência de sabor.
- Só depois de ter esse contexto (ou o cliente recusar dar mais detalhes), ela chama `listarBolosECategorias` e/ou `listarRecheios` (já existentes) e recomenda 1 a 3 produtos específicos do catálogo, com uma frase curta do porquê cada um se encaixa.
- Nunca recomenda um produto que não veio da ferramenta.

### 3. Marcar pedidos criados pela IA

Novo campo no schema:

```prisma
model Quote {
  // ...campos existentes...
  createdByAssistant Boolean @default(false)
}
```

Aditivo, sem migração de dados (default `false` cobre tudo que já existe).

### 4. Função de criação de orçamento compartilhada

Hoje a lógica de criar um `Quote` (upsert de cliente, numeração `ORC-ANO-NNNN`, validação de cupom, cálculo de sinal, criação do item) vive inteira dentro de `POST /api/quotes` (`src/app/api/quotes/route.ts`). Ela é extraída para `src/lib/quotes.ts`:

```ts
export interface CreateQuoteInput {
  customerName: string;
  customerWhatsapp: string;
  customerEmail?: string;
  productId?: string;
  productName: string;
  variation?: string;
  cakeBase?: string;
  filling1?: string;
  frosting?: string;
  extras?: string;
  quantity: number;
  unitPrice: number;
  eventDate: string; // YYYY-MM-DD
  preferredPaymentMethod?: string;
  themeNotes?: string;
  subtotal?: number;
  extraTotal?: number;
  finalTotal: number;
  couponCode?: string;
  createdByAssistant?: boolean; // default false
}

export interface CreateQuoteResult {
  quote: /* Quote com items incluídos */;
  whatsappUrl: string;
}

export async function createQuote(
  db: ScopedPrismaClient,
  organizationId: string,
  input: CreateQuoteInput
): Promise<CreateQuoteResult>
```

Toda a validação que já existe (nome, WhatsApp, produto, data não bloqueada, forma de pagamento, cupom re-validado no servidor, cálculo de sinal) migra pra dentro dessa função. Em vez de retornar `NextResponse` diretamente, `createQuote` lança `throw new Error(mensagem)` com exatamente as mesmas mensagens de erro em português que a rota já usa hoje (ex: `'Por favor, informe seu Nome Completo.'`) -- quem chama decide o formato da resposta. `POST /api/quotes/route.ts` passa a ser uma casca fina que chama `createQuote` dentro de um `try/catch` e traduz qualquer erro capturado pra `NextResponse.json({ error: error.message }, { status: 400 })`. A ferramenta `fecharPedido` (seção 5) faz o mesmo, mas devolve o erro como texto pro modelo explicar ao cliente em vez de uma resposta HTTP.

### 5. Nova ferramenta do assistente: `fecharPedido`

Em `src/lib/assistant-tools.ts`, dentro de `createAssistantTools`:

```ts
fecharPedido: tool({
  description:
    'Cria um pedido de verdade pra confeiteira revisar e aprovar. Só chame isso depois de já ter nome completo, WhatsApp, o produto/variação exato, a data do evento e a quantidade confirmados pelo cliente, E o cliente já ter dito explicitamente que quer fechar (não chame só porque a conversa está avançada -- precisa do "sim, pode fechar" ou equivalente). Isso NÃO confirma o pedido: a confeiteira ainda revisa antes de qualquer coisa virar certeza.',
  inputSchema: z.object({
    customerName: z.string(),
    customerWhatsapp: z.string(),
    productName: z.string(),
    variation: z.string().optional(),
    quantity: z.number().int().positive(),
    eventDate: z.string().describe('YYYY-MM-DD'),
    themeNotes: z.string().optional(),
  }),
  execute: async (input) => {
    // resolve productId + unitPrice/finalTotal a partir do catálogo real
    // (nunca aceita preço vindo do modelo), chama createQuote(db, orgId, {
    //   ...input, createdByAssistant: true, finalTotal: <calculado>,
    // }), devolve { quoteNumber, resumo } pro modelo comunicar ao cliente.
  },
}),
```

Ponto crítico de segurança: o preço nunca vem da conversa/modelo. A ferramenta busca o produto real (mesma fonte que `listarBolosECategorias`) e calcula o `finalTotal` a partir do preço cadastrado, exatamente como a calculadora de orçamento já faz -- o modelo não tem como inflar ou reduzir o valor.

Nova regra no system prompt: ao chamar `fecharPedido` com sucesso, a Açucena informa o número do pedido e deixa claro que a confeiteira vai revisar antes de confirmar -- nunca diz "pedido confirmado" ou "reservei sua data".

### 6. Fila de aprovação: `/admin/aprovacoes-ia`

Nova página, mesmo estilo visual das outras telas do admin. Busca `Quote` com `createdByAssistant: true` via uma nova rota `GET /api/quotes?createdByAssistant=true` (parâmetro opcional adicionado à rota `GET` já existente em `src/app/api/quotes/route.ts`), ordenados por `createdAt desc`, tipicamente filtrados por `status: 'PENDING'` na própria página (com abas pra ver os já decididos, se quiser).

Ações da página: **Aprovar** (`PUT /api/quotes/[id]` com `{ status: 'APPROVED' }`, já existente), **Rejeitar** (`{ status: 'REJECTED' }`, já existente), **Converter em Pedido** (`{ convertToOrder: true }`, já existente). Nenhuma rota nova de escrita -- só a página e o filtro de leitura.

### 7. Pagamento simulado

Na tela de Pedidos (`/admin/pedidos`), no detalhe de um pedido com `paymentStatus !== 'PAGO'`, um botão **"Confirmar Pagamento (Simulado)"** que chama `PUT /api/orders/[id]` com:

```json
{ "addPayment": { "amount": <valor restante>, "paymentMethod": "Simulado", "notes": "Pagamento simulado -- desafio Jornada de Dados, sem dinheiro real" } }
```

Reaproveita inteiramente a lógica transacional que já existe. Nenhuma rota nova.

### 8. Documento: `/recibo/[orderId]`

Nova página pública `src/app/recibo/[id]/page.tsx` + rota `GET /api/orders/[id]/recibo?whatsapp=...` que verifica o WhatsApp informado contra `order.customerWhatsapp` (mesmo modelo de acesso do `/api/track`) antes de devolver os dados. Mostra: número do pedido, itens, valores, status de pagamento, e um aviso destacado -- **"Documento simulado para fins de demonstração, sem validade fiscal"** -- sempre visível, não só em letra miúda.

O link `/recibo/[id]?whatsapp=...` é o que a confeiteira manda pro cliente (por WhatsApp, manualmente, como já é o padrão) depois de confirmar o pagamento simulado.

## Guardrails (reforço sobre o que já existe)

- `fecharPedido` nunca aceita preço do modelo -- sempre recalculado a partir do catálogo real.
- Nenhum pedido criado pela Açucena pula a aprovação humana -- `createQuote` sempre cria com `status: 'PENDING'` (o default já existente), `createdByAssistant: true` só adiciona a marcação, nunca muda o status inicial nem pula pra `APPROVED`.
- O pagamento simulado é textualmente identificado como simulado em três lugares: no botão do admin, no campo `notes` do `Payment`, e na página do recibo -- nunca aparenta ser uma cobrança real.

## Testes

- Testes unitários pra `createQuote` extraído (`src/lib/quotes.ts`): validações (nome, WhatsApp, data bloqueada, cupom), cálculo de sinal, numeração sequencial -- migrando a cobertura que hoje só existe implicitamente via uso manual da calculadora de orçamento.
- Teste unitário pra `fecharPedido`: confirma que o preço usado é sempre o do catálogo (não o que viria de um input malicioso), e que `createdByAssistant: true` e `status: 'PENDING'` sempre saem juntos.
- Teste de integração: um `Quote` com `createdByAssistant: true` aparece em `/api/quotes?createdByAssistant=true` e não aparece quando o filtro não é passado com esse valor (não quebra o comportamento existente da rota).
- Teste manual: fluxo completo local -- conversar com a Açucena até ela chamar `fecharPedido`, aprovar em `/admin/aprovacoes-ia`, converter em pedido, confirmar pagamento simulado, abrir `/recibo/[id]` com o WhatsApp certo e errado (deve recusar o errado).

## Riscos aceitos

- O preço final calculado por `fecharPedido` não passa por toda a UI de customização da calculadora de orçamento (variações complexas, múltiplos recheios) -- por ora, cobre o caso comum (produto + variação + quantidade). Combinações mais elaboradas a Açucena encaminha pro WhatsApp em vez de tentar montar sozinha, evitando errar o preço por falta de cobertura.
- A verificação de acesso ao recibo (WhatsApp na URL) tem o mesmo nível de segurança que `/pedido` já tem hoje -- não é uma senha, é conhecimento do número. Aceito porque é consistente com o padrão já em produção, não uma regressão nova.
