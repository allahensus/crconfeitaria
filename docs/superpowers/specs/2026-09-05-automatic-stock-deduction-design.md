# Baixa Automática de Estoque na Produção — Design

**Data:** 2026-09-05
**Status:** Aprovado para planejamento de implementação

## Contexto

Duas funcionalidades já existem separadamente e não se conversam:

1. **Insumos & Precificação** rastreia `Ingredient.stockQuantity` — hoje só muda quando
   alguém edita manualmente o número.
2. **Ficha Técnica** (`RecipeItem`) sabe quanto de cada ingrediente um produto usa
   (`quantityUsed`), mas isso só alimenta o cálculo de custo/preço sugerido — nunca
   toca no estoque de verdade.

Quando um pedido entra em produção, a confeiteira consome os ingredientes de
verdade, mas o sistema não sabe disso. O estoque só reflete a realidade se
alguém lembrar de descontar manualmente pedido por pedido.

## Descoberta que muda o escopo

`OrderItem` (o item de um pedido) **não tem nenhuma referência ao `Product` do
catálogo** — só um `productName` (texto livre) capturado no momento da
criação. Sem saber *qual* produto um item é, não tem como olhar a ficha
técnica dele.

Rastreando de onde um `Order` pode nascer:

- **Orçamento do site → convertido em pedido** (`PUT /api/quotes/[id]`, ramo
  `convertToOrder`): o `QuoteItem` de origem **já tem** um `productId` (a
  calculadora pública do site manda isso desde a criação do orçamento —
  `BudgetCalculatorModal.tsx:375`), mas esse dado **não é copiado** para o
  `OrderItem` gerado na conversão.
- **Pedido criado direto no painel** (`POST /api/orders`): hoje não existe
  nenhuma tela que deixe a funcionária escolher um produto real do catálogo
  ao montar um pedido manual — é tudo texto livre. Não há `productId`
  disponível nesse caminho hoje.

Ou seja: o único caminho real para saber a receita de um item é um pedido
que veio de orçamento do site. Pedidos digitados direto no painel ficam sem
desconto automático — decisão consciente, não um bug (ver "Fora de escopo").

## Objetivo deste spec

1. Adicionar `productId` a `OrderItem`, preenchido quando um orçamento vira
   pedido.
2. Quando um pedido entra em **Em Produção** pela primeira vez, descontar do
   estoque cada ingrediente da ficha técnica de cada item do pedido que tenha
   produto conhecido, multiplicado pela quantidade do item.
3. Quando um pedido **já descontado** é marcado como **Cancelado**, devolver
   ao estoque a quantidade calculada pela ficha técnica *atual* do produto —
   não necessariamente idêntica ao que foi descontado, se a receita mudou
   nesse meio-tempo (ver limitação conhecida abaixo).
4. Nunca descontar ou devolver o mesmo pedido duas vezes, mesmo que o status
   mude várias vezes.

## Fora de escopo

- Nenhuma tela nova para escolher produto do catálogo ao criar pedido manual
  no painel — pedidos digitados direto continuam sem desconto automático.
- Bloquear a mudança de status se algum insumo ficar negativo — não bloqueia;
  o alerta de estoque baixo já existente sinaliza o problema.
- Reverter o desconto ao mover o pedido para qualquer status que não seja
  Cancelado (ex: voltar de "Em Produção" para "Confirmado" não devolve
  estoque) — só a trava de cancelamento devolve.

## Arquitetura

### Modelo de dados

```prisma
model OrderItem {
  // ...campos existentes...
  productId String? // novo — preenchido só quando a origem é um orçamento do site
}

model Order {
  // ...campos existentes...
  stockDeducted Boolean @default(false) // novo — trava contra desconto/devolução em dobro
}
```

Nenhum campo existente muda de tipo ou obrigatoriedade — migração puramente
aditiva.

### Preenchendo `productId`

Em `PUT /api/quotes/[id]/route.ts`, no ramo `convertToOrder`, o mapeamento
que cria os `OrderItem` a partir dos `quote.items` passa a copiar
`item.productId` — exceto quando o valor for a string sentinela `'custom'`
(usada em `POST /api/quotes` para itens sem produto real do catálogo), caso
em que grava `null`.

`POST /api/orders` (criação direta) passa a aceitar um `productId` opcional
por item no corpo da requisição, se algum dia uma tela vier a enviá-lo — hoje
nenhuma tela envia, então isso não muda o comportamento atual, só evita que o
caminho fique preso caso uma tela futura precise dele.

### A lógica de estoque (`src/lib/stock.ts`, novo arquivo)

Duas funções, espelhando o par debitar/creditar:

```ts
export async function deductStockForOrder(
  db: ReturnType<typeof getScopedPrisma>,
  order: { id: string; items: { productId: string | null; quantity: number }[] }
): Promise<void>

export async function restoreStockForOrder(
  db: ReturnType<typeof getScopedPrisma>,
  order: { id: string; items: { productId: string | null; quantity: number }[] }
): Promise<void>
```

Para cada função: para cada item com `productId` não nulo, busca os
`RecipeItem` daquele produto (com o `Ingredient` incluído); para cada um,
calcula `delta = recipeItem.quantityUsed * item.quantity` e atualiza
`Ingredient.stockQuantity` — `decrement: delta` em `deductStockForOrder`,
`increment: delta` em `restoreStockForOrder`. Item sem `productId`, ou
produto sem nenhum `RecipeItem` cadastrado, é simplesmente ignorado (sem
erro, sem aviso — decisão já tomada). Estoque pode ficar negativo; não há
validação bloqueando isso.

### Onde é disparado

Em `PUT /api/orders/[id]/route.ts`, depois que `existingOrder` é carregado
(já inclui `items`) e antes da resposta final:

- Se `body.status === 'EM_PRODUCAO'` e `existingOrder.status !== 'EM_PRODUCAO'`
  e `existingOrder.stockDeducted` é falso: chama `deductStockForOrder`, e o
  `update` do pedido passa a gravar `stockDeducted: true` junto com o
  `status`.
- Se `body.status === 'CANCELADO'` e `existingOrder.stockDeducted` é
  verdadeiro: chama `restoreStockForOrder`, e o `update` do pedido grava
  `stockDeducted: false` junto com o `status`.
- Qualquer outra transição de status não mexe em estoque nem no campo
  `stockDeducted`.

## Casos de borda

- **Pedido sem nenhum item com produto conhecido** entra em produção
  normalmente — só não desconta nada (nenhum efeito colateral, nenhum erro).
- **Pedido movido Em Produção → Pronto → Em Produção de novo** — a trava
  `stockDeducted` já verdadeira impede um segundo desconto.
- **Pedido cancelado sem nunca ter entrado em produção** — `stockDeducted`
  continua falso, então `restoreStockForOrder` nem é chamado.
- **Ingrediente ficaria negativo** — desconta mesmo assim; o alerta de
  estoque baixo (`lowStockThreshold`) já mostra isso na tela de Insumos.
- **Receita editada ou produto excluído entre a produção e o cancelamento**
  — a devolução de estoque busca a ficha técnica *no momento do
  cancelamento*, não uma cópia do que foi descontado. Se a receita mudar
  nesse meio-tempo, a devolução usa os números novos. Se o produto for
  excluído (o que apaga sua ficha técnica em cascata), a devolução não
  encontra nada para devolver e não faz nada, silenciosamente. Limitação
  conhecida e aceita — uma devolução exata exigiria guardar uma cópia do
  que foi descontado no momento da produção, o que é um projeto maior,
  fora deste spec.

## Teste

Seguindo a convenção já estabelecida no projeto (`tests/lib/*.test.ts` contra
o banco de teste real, sem mock): `tests/lib/stock.test.ts` cobrindo:

1. `deductStockForOrder` desconta a quantidade certa (`quantityUsed × quantidade do item`).
2. `restoreStockForOrder` devolve exatamente o que foi descontado.
3. Item sem `productId` é ignorado, sem erro.
4. Produto sem nenhuma `RecipeItem` cadastrada é ignorado, sem erro.
5. Múltiplos itens com múltiplos ingredientes cada um são todos processados
   corretamente (soma certa quando dois itens do mesmo pedido usam o mesmo
   ingrediente).

Mais o de sempre: `npx tsc --noEmit`, `npm test` completo, e verificação
manual ponta a ponta via API (criar produto com ficha técnica, converter um
orçamento em pedido, mudar status para Em Produção, conferir que o estoque
desceu; cancelar, conferir que voltou).
