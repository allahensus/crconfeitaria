# Baixa Automática de Estoque na Produção Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When an order enters production, automatically deduct the ingredients its items' recipes call for from stock; restore them if the order is later cancelled — without ever double-deducting or double-restoring.

**Architecture:** Two additive schema fields (`OrderItem.productId`, `Order.stockDeducted`) let the system know which recipe an order item maps to and guard against firing twice. A new `src/lib/stock.ts` pair of functions (`deductStockForOrder`/`restoreStockForOrder`) does the actual `Ingredient.stockQuantity` math, reused by the one call site that triggers it: the order-status `PUT` handler. `productId` is populated at the only point in the codebase that currently knows it — quote-to-order conversion — everything else degrades silently to "no recipe known, skip".

**Tech Stack:** Next.js App Router route handlers, Prisma (`getScopedPrisma`), Vitest.

**Spec:** `docs/superpowers/specs/2026-09-05-automatic-stock-deduction-design.md`

## Global Constraints

- Never block a status change because stock would go negative — deduct/restore unconditionally; the existing low-stock alert on the Insumos page is the signal, not a hard stop (spec's explicit decision).
- An order item with `productId: null`, or a product with no `RecipeItem` rows, is skipped with no error and no user-facing warning (spec's explicit decision) — this is expected, not a bug, and no task should add a warning for it.
- Stock is deducted only on the first transition into `EM_PRODUCAO` and restored only on a transition into `CANCELADO` from an order where `stockDeducted` is `true`. Any other status transition must leave stock and `stockDeducted` untouched.
- This codebase has no unit tests for route handlers — only `src/lib/*` pure/db-backed functions get a Vitest test in `tests/lib/*.test.ts` (matching `tests/lib/team.test.ts`'s pattern: real test database via `resetTestDatabase()`, no mocking). Route wiring is verified by the final task's manual end-to-end HTTP pass, not by a new test file.
- `RecipeItem` is not in `TENANT_SCOPED_MODELS` (`src/lib/db.ts`) — reads against it are not auto-scoped by `getScopedPrisma`. This is safe here without extra checks only because every `productId` this feature ever sees was captured inside an org-scoped flow (the order's own organization); no task should add an extra ownership check for it — that would be scope creep beyond the spec's threat model.

---

### Task 1: Schema migration

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: `OrderItem.productId: string | null` and `Order.stockDeducted: boolean`, available on the generated Prisma Client for every later task.

- [ ] **Step 1: Add `productId` to `OrderItem`**

Change:

```prisma
model OrderItem {
  id            String  @id @default(uuid())
  orderId       String
  order         Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productName   String
  variationName String?
  cakeBase      String?
  filling1      String?
  filling2      String?
  quantity      Int     @default(1)
  unitPrice     Float
  totalPrice    Float
}
```

to:

```prisma
model OrderItem {
  id            String  @id @default(uuid())
  orderId       String
  order         Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId     String? // links to the catalog Product, when known -- see src/lib/stock.ts
  productName   String
  variationName String?
  cakeBase      String?
  filling1      String?
  filling2      String?
  quantity      Int     @default(1)
  unitPrice     Float
  totalPrice    Float
}
```

- [ ] **Step 2: Add `stockDeducted` to `Order`**

Change:

```prisma
  totalAmount      Float
  paidAmount       Float                  @default(0.0)
  paymentStatus    String                 @default("PENDENTE") // PENDENTE, PARCIAL, PAGO
  notes            String?
  organizationId String
```

to:

```prisma
  totalAmount      Float
  paidAmount       Float                  @default(0.0)
  paymentStatus    String                 @default("PENDENTE") // PENDENTE, PARCIAL, PAGO
  stockDeducted    Boolean                @default(false) // true while this order's recipe ingredients are deducted from stock
  notes            String?
  organizationId String
```

- [ ] **Step 3: Push the schema to the dev database and regenerate the client**

Run: `npx prisma db push`
Expected: `Your database is now in sync with your Prisma schema.` followed by a successful client generation. This talks to the dev database (`DATABASE_URL` in `.env`) — do not run any `:prod` script for this task.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add OrderItem.productId and Order.stockDeducted fields"
```

---

### Task 2: Stock deduction/restoration helper + tests

**Files:**
- Create: `src/lib/stock.ts`
- Create: `tests/lib/stock.test.ts`

**Interfaces:**
- Consumes: `getScopedPrisma` type from `@/lib/db`; `RecipeItem`/`Ingredient` shape from the Prisma client (via Task 1's schema).
- Produces: `deductStockForOrder(db, order): Promise<void>` and `restoreStockForOrder(db, order): Promise<void>`, both exported from `@/lib/stock`, where `order` is `{ id: string; items: { productId: string | null; quantity: number }[] }` — this is the exact shape Task 5's `existingOrder` (loaded with `include: { items: true }`) already satisfies, no adapter needed.

- [ ] **Step 1: Create `src/lib/stock.ts`**

```ts
// Applies or reverses the ingredient-stock effect of an order's items
// against their recipe (RecipeItem), when an order enters or leaves
// production. An item with no known product (productId null -- see
// OrderItem.productId) or a product with no recipe registered is silently
// skipped: a deliberate degrade documented in the design spec, not a bug.

import type { getScopedPrisma } from '@/lib/db';

interface StockOrderItem {
  productId: string | null;
  quantity: number;
}

interface StockOrder {
  id: string;
  items: StockOrderItem[];
}

async function applyStockDelta(
  db: ReturnType<typeof getScopedPrisma>,
  order: StockOrder,
  sign: 1 | -1
): Promise<void> {
  for (const item of order.items) {
    if (!item.productId) continue;

    const recipeItems = await db.recipeItem.findMany({
      where: { productId: item.productId },
    });

    for (const recipeItem of recipeItems) {
      const delta = recipeItem.quantityUsed * item.quantity;
      await db.ingredient.update({
        where: { id: recipeItem.ingredientId },
        data: { stockQuantity: { increment: sign * delta } },
      });
    }
  }
}

export async function deductStockForOrder(
  db: ReturnType<typeof getScopedPrisma>,
  order: StockOrder
): Promise<void> {
  await applyStockDelta(db, order, -1);
}

export async function restoreStockForOrder(
  db: ReturnType<typeof getScopedPrisma>,
  order: StockOrder
): Promise<void> {
  await applyStockDelta(db, order, 1);
}
```

- [ ] **Step 2: Create `tests/lib/stock.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { resetTestDatabase } from '../helpers/testDb';
import { prisma } from '@/lib/prisma';
import { getScopedPrisma } from '@/lib/db';
import { deductStockForOrder, restoreStockForOrder } from '@/lib/stock';

describe('deductStockForOrder / restoreStockForOrder', () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function makeProductWithRecipe(orgId: string, ingredientStock: number, quantityUsed: number) {
    const category = await prisma.category.create({
      data: { name: 'Bolos', slug: 'bolos', organizationId: orgId },
    });
    const product = await prisma.product.create({
      data: {
        name: 'Bolo de Chocolate',
        slug: 'bolo-de-chocolate',
        categoryId: category.id,
        description: 'Delicioso',
        mainImage: '/img.jpg',
        basePrice: 100,
        organizationId: orgId,
      },
    });
    const ingredient = await prisma.ingredient.create({
      data: {
        name: 'Farinha',
        packageQuantity: 1000,
        costPrice: 5,
        stockQuantity: ingredientStock,
        organizationId: orgId,
      },
    });
    await prisma.recipeItem.create({
      data: { productId: product.id, ingredientId: ingredient.id, quantityUsed },
    });
    return { product, ingredient, category };
  }

  async function makeOrder(orgId: string, items: { productId: string | null; quantity: number }[]) {
    return prisma.order.create({
      data: {
        orderNumber: `PED-TEST-${Math.random().toString(36).slice(2)}`,
        customerName: 'Cliente Teste',
        customerWhatsapp: '11999990000',
        deliveryDate: new Date(),
        totalAmount: 100,
        organizationId: orgId,
        items: {
          create: items.map((i) => ({
            productId: i.productId,
            productName: 'Item Teste',
            quantity: i.quantity,
            unitPrice: 50,
            totalPrice: 50 * i.quantity,
          })),
        },
      },
      include: { items: true },
    });
  }

  it('deducts quantityUsed × item quantity from ingredient stock', async () => {
    const org = await prisma.organization.create({ data: { name: 'Loja A', subdomain: 'loja-a' } });
    const { product, ingredient } = await makeProductWithRecipe(org.id, 1000, 150);
    const order = await makeOrder(org.id, [{ productId: product.id, quantity: 2 }]);

    const db = getScopedPrisma(org.id);
    await deductStockForOrder(db, order);

    const updated = await prisma.ingredient.findUnique({ where: { id: ingredient.id } });
    expect(updated?.stockQuantity).toBe(1000 - 150 * 2);
  });

  it('restores exactly what was deducted', async () => {
    const org = await prisma.organization.create({ data: { name: 'Loja A', subdomain: 'loja-a' } });
    const { product, ingredient } = await makeProductWithRecipe(org.id, 1000, 150);
    const order = await makeOrder(org.id, [{ productId: product.id, quantity: 2 }]);

    const db = getScopedPrisma(org.id);
    await deductStockForOrder(db, order);
    await restoreStockForOrder(db, order);

    const updated = await prisma.ingredient.findUnique({ where: { id: ingredient.id } });
    expect(updated?.stockQuantity).toBe(1000);
  });

  it('skips items with no productId', async () => {
    const org = await prisma.organization.create({ data: { name: 'Loja A', subdomain: 'loja-a' } });
    const ingredient = await prisma.ingredient.create({
      data: { name: 'Farinha', packageQuantity: 1000, costPrice: 5, stockQuantity: 1000, organizationId: org.id },
    });
    const order = await makeOrder(org.id, [{ productId: null, quantity: 3 }]);

    const db = getScopedPrisma(org.id);
    await deductStockForOrder(db, order);

    const updated = await prisma.ingredient.findUnique({ where: { id: ingredient.id } });
    expect(updated?.stockQuantity).toBe(1000);
  });

  it('skips a product with no recipe registered', async () => {
    const org = await prisma.organization.create({ data: { name: 'Loja A', subdomain: 'loja-a' } });
    const category = await prisma.category.create({ data: { name: 'Bolos', slug: 'bolos', organizationId: org.id } });
    const product = await prisma.product.create({
      data: {
        name: 'Bolo Sem Receita',
        slug: 'bolo-sem-receita',
        categoryId: category.id,
        description: 'Delicioso',
        mainImage: '/img.jpg',
        basePrice: 100,
        organizationId: org.id,
      },
    });
    const order = await makeOrder(org.id, [{ productId: product.id, quantity: 1 }]);

    const db = getScopedPrisma(org.id);
    await expect(deductStockForOrder(db, order)).resolves.not.toThrow();
  });

  it('sums correctly when two items in the same order use the same ingredient', async () => {
    const org = await prisma.organization.create({ data: { name: 'Loja A', subdomain: 'loja-a' } });
    const { product: productA, ingredient, category } = await makeProductWithRecipe(org.id, 1000, 100);
    const productB = await prisma.product.create({
      data: {
        name: 'Biscoito',
        slug: 'biscoito',
        categoryId: category.id,
        description: 'Delicioso',
        mainImage: '/img.jpg',
        basePrice: 20,
        organizationId: org.id,
      },
    });
    await prisma.recipeItem.create({ data: { productId: productB.id, ingredientId: ingredient.id, quantityUsed: 50 } });

    const order = await makeOrder(org.id, [
      { productId: productA.id, quantity: 2 },
      { productId: productB.id, quantity: 3 },
    ]);

    const db = getScopedPrisma(org.id);
    await deductStockForOrder(db, order);

    const updated = await prisma.ingredient.findUnique({ where: { id: ingredient.id } });
    // productA: 100*2=200, productB: 50*3=150, total 350
    expect(updated?.stockQuantity).toBe(1000 - 350);
  });
});
```

- [ ] **Step 3: Run the new tests**

Run: `npx vitest run tests/lib/stock.test.ts`
Expected: 5 tests passing.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/stock.ts tests/lib/stock.test.ts
git commit -m "feat: add deductStockForOrder/restoreStockForOrder with tests"
```

---

### Task 3: Carry `productId` from Quote to Order on conversion

**Files:**
- Modify: `src/app/api/quotes/[id]/route.ts`

**Interfaces:**
- Consumes: `QuoteItem.productId` (already exists — set to a real product id or the literal string `'custom'` by `POST /api/quotes`, per `src/lib/schema` conventions already in the codebase).
- Produces: `OrderItem.productId` populated on conversion, consumed by Task 5's trigger via `@/lib/stock`.

- [ ] **Step 1: Map `productId` when creating the order's items**

Change:

```ts
          items: {
            create: quote.items.map((item) => ({
              productName: item.productName,
              variationName: item.variation,
              cakeBase: item.cakeBase,
              filling1: item.filling1,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
            })),
          },
```

to:

```ts
          items: {
            create: quote.items.map((item) => ({
              productId: item.productId && item.productId !== 'custom' ? item.productId : null,
              productName: item.productName,
              variationName: item.variation,
              cakeBase: item.cakeBase,
              filling1: item.filling1,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
            })),
          },
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/quotes/[id]/route.ts"
git commit -m "feat: carry productId from quote to order on conversion"
```

---

### Task 4: Accept an optional `productId` per item on direct order creation

**Files:**
- Modify: `src/app/api/orders/route.ts`

**Interfaces:**
- Produces: `OrderItem.productId` populated when (and only when) a future caller sends one — no current UI sends it, so this task changes no observable behavior today; it only removes a gap for later.

- [ ] **Step 1: Pass through `productId` if present in the request body**

Change:

```ts
        items: {
          create: Array.isArray(items)
            ? items.map((i: any) => ({
                productName: i.productName,
                variationName: i.variationName || null,
                cakeBase: i.cakeBase || null,
                filling1: i.filling1 || null,
                quantity: parseInt(i.quantity) || 1,
                unitPrice: parseFloat(i.unitPrice),
                totalPrice: parseFloat(i.totalPrice || i.unitPrice * i.quantity),
              }))
            : [],
        },
```

to:

```ts
        items: {
          create: Array.isArray(items)
            ? items.map((i: any) => ({
                productId: i.productId || null,
                productName: i.productName,
                variationName: i.variationName || null,
                cakeBase: i.cakeBase || null,
                filling1: i.filling1 || null,
                quantity: parseInt(i.quantity) || 1,
                unitPrice: parseFloat(i.unitPrice),
                totalPrice: parseFloat(i.totalPrice || i.unitPrice * i.quantity),
              }))
            : [],
        },
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/orders/route.ts
git commit -m "feat: accept an optional productId per item on direct order creation"
```

---

### Task 5: Trigger deduction/restoration from the order status update

**Files:**
- Modify: `src/app/api/orders/[id]/route.ts`

**Interfaces:**
- Consumes: `deductStockForOrder`, `restoreStockForOrder` from `@/lib/stock` (Task 2).

- [ ] **Step 1: Import the stock helpers**

Change:

```ts
import { NextResponse } from 'next/server';
import { getScopedPrisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(
```

to:

```ts
import { NextResponse } from 'next/server';
import { getScopedPrisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { deductStockForOrder, restoreStockForOrder } from '@/lib/stock';

export async function GET(
```

- [ ] **Step 2: Load the order's items, and run the trigger before updating**

Change:

```ts
    const existingOrder = await db.order.findUnique({
      where: { id },
      include: { payments: true },
    });

    if (!existingOrder) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });

    let updatedPaidAmount = existingOrder.paidAmount;
    let paymentStatus = existingOrder.paymentStatus;

    if (addPayment) {
```

to:

```ts
    const existingOrder = await db.order.findUnique({
      where: { id },
      include: { payments: true, items: true },
    });

    if (!existingOrder) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });

    let updatedPaidAmount = existingOrder.paidAmount;
    let paymentStatus = existingOrder.paymentStatus;
    let stockDeducted = existingOrder.stockDeducted;

    if (status === 'EM_PRODUCAO' && existingOrder.status !== 'EM_PRODUCAO' && !existingOrder.stockDeducted) {
      await deductStockForOrder(db, existingOrder);
      stockDeducted = true;
    } else if (status === 'CANCELADO' && existingOrder.stockDeducted) {
      await restoreStockForOrder(db, existingOrder);
      stockDeducted = false;
    }

    if (addPayment) {
```

- [ ] **Step 3: Persist `stockDeducted` alongside the status update**

Change:

```ts
    const updatedOrder = await db.order.update({
      where: { id },
      data: {
        status: status || existingOrder.status,
        paidAmount: updatedPaidAmount,
        paymentStatus,
        deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : existingOrder.deliveryDate,
        notes: body.notes !== undefined ? body.notes : existingOrder.notes,
      },
      include: {
        items: true,
        payments: true,
        customer: true,
      },
    });
```

to:

```ts
    const updatedOrder = await db.order.update({
      where: { id },
      data: {
        status: status || existingOrder.status,
        paidAmount: updatedPaidAmount,
        paymentStatus,
        stockDeducted,
        deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : existingOrder.deliveryDate,
        notes: body.notes !== undefined ? body.notes : existingOrder.notes,
      },
      include: {
        items: true,
        payments: true,
        customer: true,
      },
    });
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/orders/[id]/route.ts"
git commit -m "feat: deduct/restore recipe stock when an order enters or leaves production"
```

---

### Task 6: End-to-end verification and full test suite

**Files:** none (verification only).

- [ ] **Step 1: Start the dev server**

```bash
npm run dev > /tmp/dev-stock.log 2>&1 &
disown
timeout 60 bash -c 'until curl -sf http://localhost:3000 >/dev/null; do sleep 2; done' && echo READY
```

- [ ] **Step 2: Log in and create a category, product, ingredient, and recipe link**

```bash
curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"admin@cinthia.com","password":"admin123"}' -c /tmp/owner_cookies.txt -o /dev/null -w "login: %{http_code}\n"

curl -s -X POST http://localhost:3000/api/categories -H "Content-Type: application/json" -b /tmp/owner_cookies.txt \
  -d '{"name":"Categoria Teste Estoque"}'
```

Copy the returned category `id` for the next step.

```bash
curl -s -X POST http://localhost:3000/api/products -H "Content-Type: application/json" -b /tmp/owner_cookies.txt \
  -d '{"name":"Produto Teste Estoque","categoryId":"<CATEGORY_ID>","description":"Teste","basePrice":100}'
```

Copy the returned product `id`.

```bash
curl -s -X POST http://localhost:3000/api/ingredients -H "Content-Type: application/json" -b /tmp/owner_cookies.txt \
  -d '{"name":"Farinha Teste Estoque","packageQuantity":1000,"costPrice":5,"stockQuantity":1000}'
```

Copy the returned ingredient `id`.

```bash
curl -s -X POST http://localhost:3000/api/recipes -H "Content-Type: application/json" -b /tmp/owner_cookies.txt \
  -d '{"productId":"<PRODUCT_ID>","ingredientId":"<INGREDIENT_ID>","quantityUsed":150}'
```

Expected: each call returns `201` with the created row.

- [ ] **Step 3: Create a public quote referencing that product, then convert it to an order**

```bash
curl -s -X POST http://localhost:3000/api/quotes -H "Content-Type: application/json" \
  -d '{
    "customerName": "Cliente Teste Estoque",
    "customerWhatsapp": "11999998888",
    "productId": "<PRODUCT_ID>",
    "productName": "Produto Teste Estoque",
    "quantity": 2,
    "unitPrice": 100,
    "finalTotal": 200,
    "eventDate": "2026-12-25",
    "preferredPaymentMethod": "Pix"
  }'
```

Copy the returned quote's `id` (from `quote.id` in the response). Expected: `201`.

```bash
curl -s -X PUT "http://localhost:3000/api/quotes/<QUOTE_ID>" -H "Content-Type: application/json" -b /tmp/owner_cookies.txt \
  -d '{"convertToOrder": true}'
```

Expected: `200` with `success: true` and an `order` object whose `items[0].productId` equals `<PRODUCT_ID>` and `items[0].quantity` equals `2`. Copy the returned order's `id`.

- [ ] **Step 4: Move the order to Em Produção and confirm stock was deducted**

```bash
curl -s -X PUT "http://localhost:3000/api/orders/<ORDER_ID>" -H "Content-Type: application/json" -b /tmp/owner_cookies.txt \
  -d '{"status": "EM_PRODUCAO"}'
```

Expected: `200`, response includes `"stockDeducted":true`.

```bash
curl -s "http://localhost:3000/api/ingredients" -b /tmp/owner_cookies.txt | grep -o '"id":"<INGREDIENT_ID>"[^}]*"stockQuantity":[0-9.]*'
```

Expected: `stockQuantity` is `700` (1000 − 150×2).

- [ ] **Step 5: Move the order to Pronto, then back to Em Produção — confirm the `stockDeducted` flag (not just the status check) prevents a second deduction**

This specifically exercises the `stockDeducted` boolean guard: after this detour through `PRONTO`, `existingOrder.status !== 'EM_PRODUCAO'` is true again, so only the `!existingOrder.stockDeducted` half of the condition can still prevent a second deduction.

```bash
curl -s -X PUT "http://localhost:3000/api/orders/<ORDER_ID>" -H "Content-Type: application/json" -b /tmp/owner_cookies.txt \
  -d '{"status": "PRONTO"}'

curl -s -X PUT "http://localhost:3000/api/orders/<ORDER_ID>" -H "Content-Type: application/json" -b /tmp/owner_cookies.txt \
  -d '{"status": "EM_PRODUCAO"}'

curl -s "http://localhost:3000/api/ingredients" -b /tmp/owner_cookies.txt | grep -o '"id":"<INGREDIENT_ID>"[^}]*"stockQuantity":[0-9.]*'
```

Expected: `stockQuantity` is still `700`, not `400` — the flag prevented a second deduction even though the status genuinely changed away from and back to `EM_PRODUCAO`.

- [ ] **Step 6: Cancel the order and confirm stock was restored**

```bash
curl -s -X PUT "http://localhost:3000/api/orders/<ORDER_ID>" -H "Content-Type: application/json" -b /tmp/owner_cookies.txt \
  -d '{"status": "CANCELADO"}'
```

Expected: `200`, response includes `"stockDeducted":false`.

```bash
curl -s "http://localhost:3000/api/ingredients" -b /tmp/owner_cookies.txt | grep -o '"id":"<INGREDIENT_ID>"[^}]*"stockQuantity":[0-9.]*'
```

Expected: `stockQuantity` is back to `1000`.

- [ ] **Step 7: Clean up the test data**

```bash
curl -s -X DELETE "http://localhost:3000/api/orders/<ORDER_ID>" -b /tmp/owner_cookies.txt -w "\ndelete order: %{http_code}\n"
curl -s -X DELETE "http://localhost:3000/api/quotes/<QUOTE_ID>" -b /tmp/owner_cookies.txt -w "\ndelete quote: %{http_code}\n"
curl -s -X DELETE "http://localhost:3000/api/products/<PRODUCT_ID>" -b /tmp/owner_cookies.txt -w "\ndelete product: %{http_code}\n"
curl -s -X DELETE "http://localhost:3000/api/ingredients/<INGREDIENT_ID>" -b /tmp/owner_cookies.txt -w "\ndelete ingredient: %{http_code}\n"
curl -s -X DELETE "http://localhost:3000/api/categories/<CATEGORY_ID>" -b /tmp/owner_cookies.txt -w "\ndelete category: %{http_code}\n"
```

Expected: every delete returns `200`.

- [ ] **Step 8: Check the dev server log for unhandled errors**

```bash
grep -iE "error|unhandled|TypeError" /tmp/dev-stock.log | grep -v "console.error"
```

Expected: no output.

- [ ] **Step 9: Stop the dev server**

```bash
netstat -ano | grep ":3000 " | grep LISTENING
```

Take the PID from the output and run `taskkill //F //PID <PID> //T`.

- [ ] **Step 10: Full typecheck and test suite**

```bash
npx tsc --noEmit
npm test
```

Expected: typecheck clean; all Vitest suites passing, including the new `tests/lib/stock.test.ts`.

- [ ] **Step 11: Final commit (if any verification step required a fix)**

If Steps 1-10 required no code changes, there is nothing to commit here — every task already committed its own change. If a fix was needed, commit it with a message describing what verification caught.
