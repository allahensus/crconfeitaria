# Açucena — Agente de Vendas de Ponta a Ponta — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the AI assistant (now named Açucena) into an end-to-end sales agent: recommend by need, create a real order for human approval, simulate payment, and emit a simulated receipt -- reusing the approval/payment infrastructure that already exists instead of duplicating it.

**Architecture:** Extract the existing `POST /api/quotes` logic into a shared `createQuote` function; a new `fecharPedido` tool on the assistant calls it with `createdByAssistant: true` and a price always recomputed from the real catalog, never from the model. A filtered admin queue, a payment-method option, and a public receipt page wire the rest together -- all built on the Quote/Order/Payment machinery that already exists.

**Tech Stack:** Same as the rest of the project (Next.js App Router, Prisma/Postgres, `ai` + `@ai-sdk/google`, Vitest).

**Spec:** `docs/superpowers/specs/2026-09-21-acucena-agente-vendas-design.md`

## Global Constraints

- Agent name (exact, everywhere user-facing): **Açucena**.
- `fecharPedido` never accepts a price from the model -- always recomputed from `Product`/`ProductVariation` looked up by name.
- Every `Quote` created by the assistant has `createdByAssistant: true` **and** `status: 'PENDING'` (the existing default) -- never skips human approval.
- No new payment gateway, no PDF generation -- payment confirmation is a manual admin action; the receipt is an HTML page.
- Work happens on a feature branch, PR into `main`, CI (`build-and-test`) must pass before merge -- `main` is protected, no direct pushes (see `CLAUDE.md`).

---

## Task 1: Extract `createQuote` into a shared, reusable function

**Files:**
- Modify: `prisma/schema.prisma` (add `Quote.createdByAssistant`)
- Create: `src/lib/quotes.ts`
- Modify: `src/app/api/quotes/route.ts`
- Test: `tests/lib/quotes.test.ts`

**Interfaces:**
- Produces: `createQuote(db: ScopedPrismaClient, organizationId: string, input: CreateQuoteInput): Promise<CreateQuoteResult>`, `CreateQuoteInput`, `CreateQuoteResult` -- all exported from `src/lib/quotes.ts`. Task 2's `fecharPedido` tool imports and calls this directly.
- Consumes: `getScopedPrisma` (for the `ScopedPrismaClient` type, exported from `src/lib/db.ts` -- add this export in this task), `withNumberRetry` (`src/lib/sequence.ts`), `checkCouponEligibility` (`src/lib/coupons.ts`), `generateWhatsAppLink` (`src/lib/utils.ts`) -- all already exist, signatures unchanged.

- [ ] **Step 1: Add the `createdByAssistant` field to `Quote`**

In `prisma/schema.prisma`, find the `Quote` model and add the field (anywhere among the scalar fields, e.g. right after `status`):

```prisma
model Quote {
  id               String      @id @default(uuid())
  quoteNumber      String
  customerId       String?
  customer         Customer?   @relation(fields: [customerId], references: [id], onDelete: SetNull)
  customerName     String
  customerWhatsapp String
  eventDate        DateTime?
  preferredPaymentMethod String?
  themeNotes       String?
  subtotal         Float
  discount         Float       @default(0.0)
  couponCode       String?
  extraTotal       Float       @default(0.0)
  finalTotal       Float
  depositAmount    Float?
  status           String      @default("PENDING")
  createdByAssistant Boolean   @default(false)
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  items            QuoteItem[]
  order            Order?
  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt

  @@unique([organizationId, quoteNumber])
}
```

(Only the `createdByAssistant Boolean @default(false)` line is new -- the rest of the model is shown so you can find the right spot and confirm nothing else changed.)

- [ ] **Step 2: Export the scoped Prisma client type from `src/lib/db.ts`**

At the end of `src/lib/db.ts`, add:

```ts
export type ScopedPrismaClient = ReturnType<typeof getScopedPrisma>;
```

- [ ] **Step 3: Push the schema to the dev database and regenerate the client**

Run:
```bash
npx prisma db push --skip-generate
npx prisma generate
```
Expected: both succeed, "Your database is now in sync with your Prisma schema."

If `prisma generate` fails with `EPERM: operation not permitted, rename ... query_engine-windows.dll.node`, a running dev server or another process has the Prisma client file locked on Windows. Find it with `netstat -ano | grep ":3000"` (or whatever port is running) and stop that process, then retry -- do not skip this step, the new field won't be usable from TypeScript until the client regenerates.

- [ ] **Step 4: Write the failing test for `createQuote`**

```ts
// tests/lib/quotes.test.ts
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { resetTestDatabase } from '../helpers/testDb';
import { prisma } from '@/lib/prisma';
import { getScopedPrisma } from '@/lib/db';
import { createQuote } from '@/lib/quotes';

describe('createQuote', () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function makeOrgWithProduct() {
    const org = await prisma.organization.create({
      data: { name: 'Loja Teste', subdomain: `loja-teste-${Math.random().toString(36).slice(2)}` },
    });
    const category = await prisma.category.create({
      data: { name: 'Bolos', slug: 'bolos', organizationId: org.id },
    });
    const product = await prisma.product.create({
      data: {
        name: 'Bolo de Chocolate',
        slug: 'bolo-de-chocolate',
        categoryId: category.id,
        description: 'Delicioso',
        mainImage: '/img.jpg',
        basePrice: 100,
        organizationId: org.id,
      },
    });
    return { org, product };
  }

  it('creates a quote with a sequential quoteNumber and the given totals', async () => {
    const { org, product } = await makeOrgWithProduct();
    const db = getScopedPrisma(org.id);

    const result = await createQuote(db, org.id, {
      customerName: 'Maria Silva',
      customerWhatsapp: '11999998888',
      productId: product.id,
      productName: product.name,
      quantity: 2,
      unitPrice: 100,
      eventDate: '2027-01-15',
      finalTotal: 200,
      subtotal: 200,
    });

    expect(result.quote.quoteNumber).toMatch(/^ORC-\d{4}-0001$/);
    expect(result.quote.finalTotal).toBe(200);
    expect(result.quote.status).toBe('PENDING');
    expect(result.quote.createdByAssistant).toBe(false);
    expect(result.quote.items).toHaveLength(1);
    expect(result.quote.items[0].productName).toBe('Bolo de Chocolate');
    expect(result.whatsappUrl).toContain('https://wa.me/');
  });

  it('sets createdByAssistant when passed true', async () => {
    const { org, product } = await makeOrgWithProduct();
    const db = getScopedPrisma(org.id);

    const result = await createQuote(db, org.id, {
      customerName: 'João Souza',
      customerWhatsapp: '11988887777',
      productId: product.id,
      productName: product.name,
      quantity: 1,
      unitPrice: 100,
      eventDate: '2027-01-20',
      finalTotal: 100,
      subtotal: 100,
      createdByAssistant: true,
    });

    expect(result.quote.createdByAssistant).toBe(true);
    expect(result.quote.status).toBe('PENDING'); // approval is never skipped
  });

  it('throws with a friendly message when the name is missing', async () => {
    const { org, product } = await makeOrgWithProduct();
    const db = getScopedPrisma(org.id);

    await expect(
      createQuote(db, org.id, {
        customerName: '',
        customerWhatsapp: '11999998888',
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: 100,
        eventDate: '2027-01-15',
        finalTotal: 100,
      })
    ).rejects.toThrow('Por favor, informe seu Nome Completo.');
  });

  it('throws when the event date is blocked', async () => {
    const { org, product } = await makeOrgWithProduct();
    await prisma.blockedDate.create({
      data: { date: new Date('2027-02-01T00:00:00.000Z'), organizationId: org.id },
    });
    const db = getScopedPrisma(org.id);

    await expect(
      createQuote(db, org.id, {
        customerName: 'Ana',
        customerWhatsapp: '11999998888',
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: 100,
        eventDate: '2027-02-01',
        finalTotal: 100,
      })
    ).rejects.toThrow('Essa data já está com a agenda cheia. Por favor, escolha outra data.');
  });

  it('numbers quotes sequentially across two calls', async () => {
    const { org, product } = await makeOrgWithProduct();
    const db = getScopedPrisma(org.id);
    const input = {
      customerName: 'Cliente',
      customerWhatsapp: '11999998888',
      productId: product.id,
      productName: product.name,
      quantity: 1,
      unitPrice: 100,
      eventDate: '2027-01-15',
      finalTotal: 100,
    };

    const first = await createQuote(db, org.id, input);
    const second = await createQuote(db, org.id, { ...input, customerWhatsapp: '11988887777' });

    expect(first.quote.quoteNumber).toMatch(/-0001$/);
    expect(second.quote.quoteNumber).toMatch(/-0002$/);
  });
});
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `npx vitest run tests/lib/quotes.test.ts`
Expected: FAIL with "Cannot find module '@/lib/quotes'"

- [ ] **Step 6: Write `src/lib/quotes.ts`**

This is a faithful port of the current `POST /api/quotes` body (`src/app/api/quotes/route.ts`), with every `NextResponse.json({ error: ... }, { status: 400 })` turned into `throw new Error('...')` (same message text), and the final `NextResponse.json({ success: true, quote, whatsappUrl }, { status: 201 })` turned into `return { quote, whatsappUrl }`.

```ts
// src/lib/quotes.ts
import type { Prisma } from '@prisma/client';
import type { ScopedPrismaClient } from './db';
import { generateWhatsAppLink } from './utils';
import { checkCouponEligibility } from './coupons';
import { withNumberRetry } from './sequence';

export interface CreateQuoteInput {
  customerName: string;
  customerWhatsapp: string;
  customerEmail?: string;
  customerBirthDate?: string;
  lgpdAccepted?: boolean;
  productId?: string;
  productName: string;
  variation?: string;
  isBiscoito?: boolean;
  cakeBase?: string;
  filling1?: string;
  frosting?: string;
  extras?: string;
  quantity: number | string;
  unitPrice: number | string;
  eventDate: string; // YYYY-MM-DD or full ISO
  preferredPaymentMethod?: string;
  themeNotes?: string;
  subtotal?: number | string;
  extraTotal?: number | string;
  finalTotal: number | string;
  couponCode?: string;
  createdByAssistant?: boolean;
}

// ReturnType on a generic Prisma delegate method resolves against the
// method's default type parameters, not the `include: { items: true }`
// this function actually passes -- it would type `quote` without `items`
// even though the real value always has it. Prisma.QuoteGetPayload names
// the exact shape the `include` below produces.
type QuoteWithItems = Prisma.QuoteGetPayload<{ include: { items: true } }>;

export interface CreateQuoteResult {
  quote: QuoteWithItems;
  whatsappUrl: string;
}

// Amended during Task 1's review: the original route's outer catch always
// returned 500 unconditionally (validation failures were separate
// early-return 400s, never routed through it). A plain `Error` can't tell
// a deliberate validation failure apart from an unexpected one (e.g. a raw
// Prisma error) at the call site, so callers would have no way to map
// correctly to 400 vs 500. This marker class lets them.
export class QuoteValidationError extends Error {}

export async function createQuote(
  db: ScopedPrismaClient,
  organizationId: string,
  input: CreateQuoteInput
): Promise<CreateQuoteResult> {
  const {
    customerName,
    customerWhatsapp,
    customerEmail,
    customerBirthDate,
    lgpdAccepted,
    productName,
    variation,
    isBiscoito,
    cakeBase,
    filling1,
    frosting,
    extras,
    quantity,
    unitPrice,
    eventDate,
    preferredPaymentMethod,
    themeNotes,
    subtotal,
    extraTotal,
    finalTotal,
    couponCode,
    createdByAssistant,
  } = input;

  const trimmedName = (customerName || '').trim();
  const cleanWhatsapp = (customerWhatsapp || '').replace(/\D/g, '');

  if (!trimmedName) {
    throw new QuoteValidationError('Por favor, informe seu Nome Completo.');
  }

  if (!cleanWhatsapp || cleanWhatsapp.length < 10) {
    throw new QuoteValidationError('Por favor, informe um número de WhatsApp válido com DDD (ex: 11999998888).');
  }

  if (!productName) {
    throw new QuoteValidationError('Por favor, selecione um produto para o orçamento.');
  }

  const parsedEventDateCheck = eventDate ? new Date(eventDate) : null;
  if (!parsedEventDateCheck || isNaN(parsedEventDateCheck.getTime())) {
    throw new QuoteValidationError('Por favor, escolha a data desejada da entrega/festa.');
  }

  const eventDateStr = eventDate.slice(0, 10);
  const isBlockedDate = await db.blockedDate.findFirst({
    where: { date: new Date(`${eventDateStr}T00:00:00.000Z`) },
  });
  if (isBlockedDate) {
    throw new QuoteValidationError('Essa data já está com a agenda cheia. Por favor, escolha outra data.');
  }

  const parsedBirthDate = customerBirthDate ? new Date(customerBirthDate) : null;

  const customer = await db.customer.upsert({
    where: { organizationId_whatsapp: { organizationId, whatsapp: cleanWhatsapp } },
    create: {
      organizationId,
      name: customerName,
      whatsapp: cleanWhatsapp,
      email: customerEmail || null,
      birthDate: parsedBirthDate && !isNaN(parsedBirthDate.getTime()) ? parsedBirthDate : null,
      lgpdAccepted: lgpdAccepted !== undefined ? Boolean(lgpdAccepted) : true,
    },
    update: {
      name: customerName,
      email: customerEmail || undefined,
      birthDate: parsedBirthDate && !isNaN(parsedBirthDate.getTime()) ? parsedBirthDate : undefined,
      lgpdAccepted: lgpdAccepted !== undefined ? Boolean(lgpdAccepted) : undefined,
    },
  });

  const year = new Date().getFullYear();
  const prefix = `ORC-${year}-`;

  const generateQuoteNumberCandidate = async () => {
    const lastQuote = await db.quote.findFirst({
      where: { quoteNumber: { startsWith: prefix } },
      orderBy: { quoteNumber: 'desc' },
    });
    let nextSeq = 1;
    if (lastQuote?.quoteNumber) {
      const parts = lastQuote.quoteNumber.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) {
        nextSeq = lastSeq + 1;
      }
    }
    return `${prefix}${nextSeq.toString().padStart(4, '0')}`;
  };

  const parseEventDate = eventDate ? new Date(eventDate) : null;
  const isValidEventDate = parseEventDate !== null && !isNaN(parseEventDate.getTime());
  const qty = parseInt(String(quantity)) || 1;
  const price = parseFloat(String(unitPrice)) || 0;
  const tot = parseFloat(String(finalTotal)) || price * qty;
  const sub = parseFloat(String(subtotal)) || price * qty;

  if (!Number.isFinite(qty) || qty < 1 || !Number.isFinite(price) || price < 0 || !Number.isFinite(tot) || tot < 0 || !Number.isFinite(sub) || sub < 0) {
    throw new QuoteValidationError('Valores de preço ou quantidade inválidos.');
  }

  let appliedDiscount = 0;
  let appliedCouponCode: string | null = null;
  if (couponCode) {
    const cleanCode = String(couponCode).trim().toUpperCase().replace(/\s+/g, '');
    const coupon = await db.coupon.findUnique({
      where: { organizationId_code: { organizationId, code: cleanCode } },
    });
    let alreadyUsedByCustomer = false;
    if (coupon?.oncePerCustomer) {
      const priorUse = await db.quote.findFirst({
        where: { couponCode: coupon.code, customerWhatsapp: cleanWhatsapp },
      });
      alreadyUsedByCustomer = !!priorUse;
    }
    const eligibility = checkCouponEligibility(coupon, alreadyUsedByCustomer);
    if (eligibility.ok) {
      const claimed = await db.coupon.updateMany({
        where: {
          id: coupon!.id,
          ...(coupon!.maxUses !== null ? { usageCount: { lt: coupon!.maxUses } } : {}),
        },
        data: { usageCount: { increment: 1 } },
      });
      if (claimed.count > 0) {
        appliedCouponCode = coupon!.code;
        appliedDiscount = coupon!.discountType === 'PERCENT'
          ? Math.round(sub * (coupon!.discountValue / 100) * 100) / 100
          : Math.min(coupon!.discountValue, sub);
      }
    }
  }

  const depositSetting = await db.setting.findUnique({
    where: { organizationId_key: { organizationId, key: 'deposit_percentage' } },
  });
  const depositPercent = parseFloat(depositSetting?.value || '50') || 50;
  const depositAmount = Math.round(tot * (depositPercent / 100) * 100) / 100;

  const quote = await withNumberRetry(generateQuoteNumberCandidate, (quoteNumber) =>
    db.quote.create({
      data: {
        organizationId,
        quoteNumber,
        customerId: customer.id,
        customerName,
        customerWhatsapp: cleanWhatsapp,
        eventDate: isValidEventDate ? parseEventDate : null,
        preferredPaymentMethod: preferredPaymentMethod || null,
        themeNotes: themeNotes || null,
        subtotal: sub,
        extraTotal: parseFloat(String(extraTotal)) || 0,
        discount: appliedDiscount,
        couponCode: appliedCouponCode,
        finalTotal: tot,
        depositAmount,
        status: 'PENDING',
        createdByAssistant: Boolean(createdByAssistant),
        items: {
          create: [
            {
              productId: input.productId || 'custom',
              productName,
              variation: variation || null,
              cakeBase: cakeBase || null,
              filling1: filling1 || null,
              frosting: frosting || null,
              extras: extras || null,
              quantity: qty,
              unitPrice: price,
              totalPrice: tot,
            },
          ],
        },
      },
      include: {
        items: true,
      },
    })
  );

  const waSetting = await db.setting.findUnique({
    where: { organizationId_key: { organizationId, key: 'whatsapp_number' } },
  });
  const bakeryWhatsapp = waSetting?.value || '5512997594697';

  const formattedEventDate = isValidEventDate ? parseEventDate.toLocaleDateString('pt-BR') : undefined;
  const whatsappUrl = generateWhatsAppLink(bakeryWhatsapp, {
    quoteNumber: quote.quoteNumber,
    customerName,
    productName,
    variation,
    isBiscoito,
    cakeBase,
    filling1,
    frosting,
    extras,
    quantity: qty,
    eventDate: formattedEventDate,
    themeNotes,
    finalTotal: tot,
    depositAmount,
  });

  return { quote, whatsappUrl };
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npx vitest run tests/lib/quotes.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 8: Rewrite `POST /api/quotes/route.ts` as a thin wrapper, and add the `createdByAssistant` filter to `GET`**

```ts
// src/app/api/quotes/route.ts
import { NextResponse } from 'next/server';
import { getScopedPrisma } from '@/lib/db';
import { getCurrentOrganization } from '@/lib/tenant';
import { getSession } from '@/lib/auth';
import { createQuote, QuoteValidationError } from '@/lib/quotes';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    const db = getScopedPrisma(session.organizationId);

    const { searchParams } = new URL(request.url);
    const createdByAssistantParam = searchParams.get('createdByAssistant');

    const quotes = await db.quote.findMany({
      where: createdByAssistantParam === 'true' ? { createdByAssistant: true } : undefined,
      include: {
        items: true,
        customer: true,
        order: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(quotes);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar orçamentos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const organization = await getCurrentOrganization();
    if (!organization) {
      return NextResponse.json({ error: 'Loja não encontrada.' }, { status: 404 });
    }
    const db = getScopedPrisma(organization.id);
    const body = await request.json();

    const { quote, whatsappUrl } = await createQuote(db, organization.id, body);

    return NextResponse.json({ success: true, quote, whatsappUrl }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating quote:', error);
    if (error instanceof QuoteValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro ao gerar orçamento.' }, { status: 500 });
  }
}
```

- [ ] **Step 9: Verify nothing else broke**

Run: `npx tsc --noEmit -p .` -- expected clean.
Run: `npx vitest run tests/lib/quotes.test.ts` -- expected 5/5 passing (re-confirm after the route rewrite touches nothing in `quotes.ts` itself, but confirms the whole thing still compiles together).

- [ ] **Step 10: Commit**

```bash
git add prisma/schema.prisma src/lib/db.ts src/lib/quotes.ts src/app/api/quotes/route.ts tests/lib/quotes.test.ts
git commit -m "feat: extract createQuote into a shared function, add Quote.createdByAssistant"
```

---

## Task 2: Açucena's identity, recommendation behavior, and the `fecharPedido` tool

**Files:**
- Modify: `src/lib/assistant-tools.ts`
- Modify: `src/app/api/assistant/route.ts`
- Modify: `src/components/public/AssistantChat.tsx`
- Modify: `src/components/public/Navbar.tsx`
- Test: `tests/lib/assistant-tools.test.ts`

**Interfaces:**
- Consumes: `createQuote`, `CreateQuoteInput` (Task 1, `src/lib/quotes.ts`); `ScopedPrismaClient` (Task 1, `src/lib/db.ts`).
- Produces: `createAssistantTools(db: ScopedPrismaClient, config: AssistantToolsConfig)` where `AssistantToolsConfig` gains `organizationId: string`. The tool set gains `fecharPedido`. `buildAssistantInstructions` gains the Açucena identity and recommendation-by-need rules (same signature: `(bakeryName, depositPercentage?, minLeadDays?)`).

This task **widens** `assistant-tools.ts`'s database type from the narrow hand-rolled `AssistantDb` interface to the real `ScopedPrismaClient` (Task 1's export) -- `fecharPedido` needs `product`, `customer`, `quote`, `coupon`, `setting`, `blockedDate`, which is most of the client anyway, so the narrow-interface indirection no longer earns its keep.

- [ ] **Step 1: Write the failing tests**

`tests/lib/assistant-tools.test.ts` currently ends with these two blocks (verified against the file as it exists today):

```ts
  it('gerarResumoWhatsApp builds a wa.me link with the encoded summary', async () => {
    const { org } = await makeOrgWithCatalog();
    const db = getScopedPrisma(org.id);
    const tools = createAssistantTools(db, { whatsappNumber: '5512997594697', minLeadDays: 3 });

    const result = await tools.gerarResumoWhatsApp.execute!(
      { resumo: 'Bolo de chocolate, 20 fatias, para 24/12' },
      { toolCallId: 'test', messages: [] } as any
    );

    expect(result).toEqual({
      url: 'https://wa.me/5512997594697?text=Bolo%20de%20chocolate%2C%2020%20fatias%2C%20para%2024%2F12',
    });
  });
});

describe('buildAssistantInstructions', () => {
  it('includes the bakery name so the model knows who it represents', () => {
    const instructions = buildAssistantInstructions('Cinthia Rodrigues');
    expect(instructions).toContain('Cinthia Rodrigues');
  });
});
```

The `makeOrgWithCatalog` helper above these already creates a product ("Bolo de Chocolate", `basePrice: 120`) with one variation ("20 a 25 fatias", `price: 150`) -- no change needed there. Every existing `createAssistantTools(db, { whatsappNumber: ..., minLeadDays: ... })` call in this file must also gain `organizationId: org.id` now that `AssistantToolsConfig` requires it (Step 3 below) -- update all five existing call sites (the four inside `describe('createAssistantTools', ...)` plus none inside `buildAssistantInstructions`'s describe, which doesn't call `createAssistantTools`).

Replace the whole excerpt above with:

```ts
  it('gerarResumoWhatsApp builds a wa.me link with the encoded summary', async () => {
    const { org } = await makeOrgWithCatalog();
    const db = getScopedPrisma(org.id);
    const tools = createAssistantTools(db, { whatsappNumber: '5512997594697', minLeadDays: 3, organizationId: org.id });

    const result = await tools.gerarResumoWhatsApp.execute!(
      { resumo: 'Bolo de chocolate, 20 fatias, para 24/12' },
      { toolCallId: 'test', messages: [] } as any
    );

    expect(result).toEqual({
      url: 'https://wa.me/5512997594697?text=Bolo%20de%20chocolate%2C%2020%20fatias%2C%20para%2024%2F12',
    });
  });

  it('fecharPedido creates a Quote with createdByAssistant true and the catalog price, never a model-supplied one', async () => {
    const { org } = await makeOrgWithCatalog();
    const db = getScopedPrisma(org.id);
    const tools = createAssistantTools(db, { whatsappNumber: '5512997594697', minLeadDays: 3, organizationId: org.id });

    const result = await tools.fecharPedido.execute!(
      {
        customerName: 'Maria Silva',
        customerWhatsapp: '11999998888',
        productName: 'Bolo de Chocolate',
        variation: '20 a 25 fatias',
        quantity: 1,
        eventDate: '2027-03-10',
      },
      { toolCallId: 'test', messages: [] } as any
    );

    expect(result).toHaveProperty('numeroPedido');
    expect((result as any).numeroPedido).toMatch(/^ORC-\d{4}-0001$/);

    const quote = await prisma.quote.findFirst({ where: { organizationId: org.id } });
    expect(quote?.createdByAssistant).toBe(true);
    expect(quote?.status).toBe('PENDING');
    expect(quote?.finalTotal).toBe(150); // the variation's real price, not something the model could have invented
  });

  it('fecharPedido refuses an unknown product instead of guessing a price', async () => {
    const { org } = await makeOrgWithCatalog();
    const db = getScopedPrisma(org.id);
    const tools = createAssistantTools(db, { whatsappNumber: '5512997594697', minLeadDays: 3, organizationId: org.id });

    const result = await tools.fecharPedido.execute!(
      {
        customerName: 'Maria Silva',
        customerWhatsapp: '11999998888',
        productName: 'Bolo Que Não Existe',
        quantity: 1,
        eventDate: '2027-03-10',
      },
      { toolCallId: 'test', messages: [] } as any
    );

    expect(result).toHaveProperty('erro');
    const quote = await prisma.quote.findFirst({ where: { organizationId: org.id } });
    expect(quote).toBeNull();
  });
});

describe('buildAssistantInstructions', () => {
  it('includes the bakery name so the model knows who it represents', () => {
    const instructions = buildAssistantInstructions('Cinthia Rodrigues');
    expect(instructions).toContain('Cinthia Rodrigues');
  });

  it('names the agent Açucena', () => {
    const instructions = buildAssistantInstructions('Cinthia Rodrigues');
    expect(instructions).toContain('Açucena');
  });
});
```

Also update the four remaining `createAssistantTools(db, { whatsappNumber: '5512997594697', minLeadDays: ... })` calls earlier in the same file (`listarBolosECategorias`, `listarRecheios`, and the two `verificarDisponibilidade` tests) to add `organizationId: org.id`, same as above -- they don't exercise `fecharPedido`, but the config type change makes the field required everywhere.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/lib/assistant-tools.test.ts`
Expected: FAIL (`fecharPedido` doesn't exist yet, `organizationId` isn't a valid config key yet, "Açucena" isn't in the instructions yet)

- [ ] **Step 3: Widen the db type and add `fecharPedido`**

In `src/lib/assistant-tools.ts`:

Replace the narrow `AssistantDb` interface and its usage with the real scoped client type:

```ts
// src/lib/assistant-tools.ts
import { tool } from 'ai';
import { z } from 'zod';
import { checkDateAvailability } from './availability';
import { formatWhatsappForUrl } from './utils';
import { createQuote } from './quotes';
import type { ScopedPrismaClient } from './db';

export interface AssistantToolsConfig {
  whatsappNumber: string;
  minLeadDays: number;
  organizationId: string;
}
```

(Remove the old `interface AssistantDb { ... }` block entirely -- it's no longer used.)

Change every occurrence of `db: AssistantDb` to `db: ScopedPrismaClient` -- there is exactly one, the `createAssistantTools` function signature:

```ts
export function createAssistantTools(db: ScopedPrismaClient, config: AssistantToolsConfig) {
```

Update `buildAssistantInstructions`'s opening line and add the recommendation-by-need + `fecharPedido` rules. Replace the function body's first paragraph and the numbered rules with:

```ts
export function buildAssistantInstructions(bakeryName: string, depositPercentage: number = 50, minLeadDays: number = 3): string {
  return `Você é a Açucena, assistente virtual da confeitaria ${bakeryName}. Seu objetivo é ajudar quem visita o site a entender o cardápio, os sabores disponíveis, recomendar o produto certo quando o cliente descrever uma necessidade (não só quando pedir um nome específico), e ajudar a fechar o pedido -- usando APENAS os dados que as ferramentas te devolverem. Nunca invente preço, sabor, disponibilidade de data ou o total de um pedido.

Regras:
1. Você é uma IA, não a confeiteira. Nunca finja ser uma pessoa.
2. Responda sempre em português, num tom caloroso e direto.
3. Antes de afirmar qualquer preço, sabor ou disponibilidade de uma data específica, chame a ferramenta correspondente (listarBolosECategorias, listarRecheios ou verificarDisponibilidade). Nunca responda esses temas de memória.
4. Uma data "disponível" segundo a ferramenta ainda depende da confirmação final da confeiteira -- diga isso quando relevante, nunca prometa a data como fechada.
5. Sobre prazo mínimo em geral (sem data específica em mente): o prazo mínimo de antecedência para encomendar é de ${minLeadDays} dia(s). Se o cliente já tiver uma data específica em mente, chame verificarDisponibilidade com ela em vez de só citar esse número.
6. Sobre entrega: sim, a confeitaria faz entrega, mas depende da demanda do dia -- não é garantida, a confirmação final é sempre com a confeiteira.
7. Sobre pagamento: aceitamos Pix; o sinal sugerido para reservar a data é de ${depositPercentage}% do valor total do pedido; os detalhes finais de pagamento são combinados direto com a confeiteira.
8. Quando o cliente descrever uma necessidade em vez de pedir um produto específico (ex: "quero algo pra aniversário de criança"), pergunte o que falta pra recomendar bem -- ocasião, número de convidados/fatias aproximado, tema, preferência de sabor -- antes de recomendar. Só recomende produtos que vieram de listarBolosECategorias, nunca um produto inventado, e explique em uma frase por que cada sugestão se encaixa.
9. Se a pergunta não tiver nada a ver com a confeitaria, redirecione com educação de volta ao cardápio, sabores ou prazos.
10. Quando o cliente já tiver dado nome completo, WhatsApp, o produto/variação exato, a data e a quantidade, E tiver dito explicitamente que quer fechar (algo como "sim, pode fechar" -- não chame só porque a conversa avançou), chame a ferramenta fecharPedido. Isso NÃO confirma o pedido: sempre explique que a confeiteira ainda vai revisar antes de qualquer coisa virar certeza. Se fecharPedido devolver um erro, explique o problema ao cliente com suas palavras e ofereça chamar gerarResumoWhatsApp como alternativa.
11. Se o cliente não tiver dado detalhes suficientes pra fechar (ex: quer algo fora do catálogo, várias combinações de recheio, ou só quer confirmar detalhes com a confeiteira), chame gerarResumoWhatsApp com um resumo claro da conversa -- essa é a forma alternativa de encaminhar; você mesma nunca inventa um pedido sem os dados completos.`;
}
```

Add the `fecharPedido` tool as the last entry inside the object returned by `createAssistantTools` (after `gerarResumoWhatsApp`, before the closing `};`):

```ts
    fecharPedido: tool({
      description:
        'Cria um pedido de verdade pra confeiteira revisar e aprovar. Só chame isso depois de já ter nome completo, WhatsApp, o produto/variação exato, a data do evento e a quantidade confirmados pelo cliente, E o cliente já ter dito explicitamente que quer fechar. Isso NÃO confirma o pedido -- a confeiteira ainda revisa antes de qualquer coisa virar certeza.',
      inputSchema: z.object({
        customerName: z.string().min(1),
        customerWhatsapp: z.string().min(8),
        productName: z.string().describe('Nome exato do produto, como retornado por listarBolosECategorias'),
        variation: z.string().optional().describe('Nome exato da variação, se houver, como retornado por listarBolosECategorias'),
        quantity: z.number().int().positive(),
        eventDate: z.string().describe('Data desejada no formato YYYY-MM-DD'),
        themeNotes: z.string().optional(),
      }),
      execute: async ({ customerName, customerWhatsapp, productName, variation, quantity, eventDate, themeNotes }) => {
        const product = await db.product.findFirst({
          where: { name: { equals: productName, mode: 'insensitive' }, active: true },
          include: { variations: { where: { active: true } } },
        });
        if (!product) {
          return { erro: `Não encontrei "${productName}" no catálogo ativo. Confirme o nome exato com listarBolosECategorias antes de tentar de novo.` };
        }

        let unitPrice = product.basePrice;
        let variationName: string | undefined;
        if (variation) {
          const matched = product.variations.find(
            (v) => v.name.toLowerCase() === variation.toLowerCase()
          );
          if (!matched) {
            return { erro: `"${variation}" não é uma variação válida de "${product.name}". Confirme com listarBolosECategorias.` };
          }
          unitPrice = matched.price;
          variationName = matched.name;
        }

        const finalTotal = Math.round(unitPrice * quantity * 100) / 100;

        try {
          const { quote } = await createQuote(db, config.organizationId, {
            customerName,
            customerWhatsapp,
            productId: product.id,
            productName: product.name,
            variation: variationName,
            quantity,
            unitPrice,
            eventDate,
            finalTotal,
            subtotal: finalTotal,
            themeNotes,
            createdByAssistant: true,
          });
          return {
            numeroPedido: quote.quoteNumber,
            resumo: `Pedido ${quote.quoteNumber} registrado para revisão da confeiteira.`,
          };
        } catch (err: any) {
          return { erro: err?.message || 'Não consegui registrar o pedido agora. Tente novamente ou fale direto no WhatsApp.' };
        }
      },
    }),
```

Update the return type export at the bottom of the file (unchanged in shape, just confirm it still reads):
```ts
export type AssistantToolSet = ReturnType<typeof createAssistantTools>;
```

- [ ] **Step 4: Pass `organizationId` into `createAssistantTools` from the route**

In `src/app/api/assistant/route.ts`, find:
```ts
    const tools = createAssistantTools(db, { whatsappNumber, minLeadDays });
```
Replace with:
```ts
    const tools = createAssistantTools(db, { whatsappNumber, minLeadDays, organizationId: organization.id });
```

- [ ] **Step 5: Rename the assistant in the widget and navbar**

In `src/components/public/AssistantChat.tsx`, find both occurrences of `Assistente Virtual` (the header `<span>` text) and replace with `Açucena`.

In `src/components/public/Navbar.tsx`, find the two `Tirar Dúvidas` button labels (desktop nav and mobile quick-action button/menu item) and replace with `Falar com a Açucena` (desktop) and keep the mobile drawer's longer label `Tirar Dúvidas com a Assistente` as `Tirar Dúvidas com a Açucena`. The mobile top-bar icon-only button has no text to change.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run tests/lib/assistant-tools.test.ts`
Expected: PASS (all tests, old and new)

Run: `npx tsc --noEmit -p .`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/lib/assistant-tools.ts src/app/api/assistant/route.ts src/components/public/AssistantChat.tsx src/components/public/Navbar.tsx tests/lib/assistant-tools.test.ts
git commit -m "feat: rename assistant to Açucena, add need-based recommendation rules and fecharPedido tool"
```

---

## Task 3: Approval queue — `/admin/aprovacoes-ia`

**Files:**
- Create: `src/app/admin/aprovacoes-ia/page.tsx`
- Modify: `src/components/admin/AdminSidebar.tsx`

**Interfaces:**
- Consumes: `GET /api/quotes?createdByAssistant=true` (Task 1); `PUT /api/quotes/[id]` with `{ status }` or `{ convertToOrder: true }` (already existing, unchanged).

No new API routes -- this task is UI only, reusing endpoints Task 1 and the pre-existing quote-approval logic already provide.

- [ ] **Step 1: Write the page**

```tsx
// src/app/admin/aprovacoes-ia/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Sparkles, CheckCircle2, XCircle, PackageCheck } from 'lucide-react';

export default function AdminAssistantApprovalsPage() {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'PENDING' | 'ALL'>('PENDING');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/quotes?createdByAssistant=true');
      const data = await res.json();
      if (Array.isArray(data)) setQuotes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/quotes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleConvert = async (id: string) => {
    if (!confirm('Converter este orçamento em pedido confirmado?')) return;
    try {
      const res = await fetch(`/api/quotes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ convertToOrder: true }),
      });
      if (res.ok) loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const visible = filter === 'PENDING' ? quotes.filter((q) => q.status === 'PENDING') : quotes;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#FAF6F4]">
      <AdminSidebar />

      <main className="flex-1 p-6 md:p-10 space-y-8 overflow-y-auto">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#4A231A] flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[#C27360]" /> Pedidos da Açucena
          </h1>
          <p className="text-xs md:text-sm text-[#645451]">
            Pedidos que a assistente de IA montou na conversa com o cliente -- nada vira pedido de verdade sem você revisar e aprovar aqui.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilter('PENDING')}
            className={`px-4 py-2 rounded-xl text-xs font-bold ${filter === 'PENDING' ? 'bg-[#C27360] text-white' : 'bg-white border border-[#F2D7D0] text-[#645451]'}`}
          >
            Pendentes
          </button>
          <button
            onClick={() => setFilter('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold ${filter === 'ALL' ? 'bg-[#C27360] text-white' : 'bg-white border border-[#F2D7D0] text-[#645451]'}`}
          >
            Todos
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-[#645451]">Carregando...</div>
        ) : visible.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-[#F2D7D0] p-8">
            <p className="text-[#645451] font-medium">
              {filter === 'PENDING' ? 'Nenhum pedido da Açucena esperando aprovação.' : 'A Açucena ainda não criou nenhum pedido.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {visible.map((q) => (
              <div key={q.id} className="bg-white p-5 rounded-2xl border border-[#F2D7D0] shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-[#A75644]">{q.quoteNumber}</span>
                    <h3 className="font-serif font-bold text-lg text-[#4A231A]">{q.customerName}</h3>
                    <p className="text-xs text-[#645451]">{q.customerWhatsapp} -- {formatDateTime(q.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <span className="block text-lg font-bold text-[#4A231A] font-serif">{formatCurrency(q.finalTotal)}</span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      q.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                      q.status === 'APPROVED' ? 'bg-blue-100 text-blue-700' :
                      q.status === 'CONVERTED' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {q.status}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-[#F2D7D0] space-y-1">
                  {q.items?.map((item: any) => (
                    <p key={item.id} className="text-xs text-[#645451]">
                      {item.quantity}x {item.productName} {item.variation ? `(${item.variation})` : ''}
                    </p>
                  ))}
                  {q.themeNotes && <p className="text-xs text-[#645451] italic">"{q.themeNotes}"</p>}
                </div>

                {q.status === 'PENDING' && (
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => handleUpdateStatus(q.id, 'APPROVED')}
                      className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Aprovar
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(q.id, 'REJECTED')}
                      className="flex-1 px-4 py-2 rounded-xl bg-white border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Rejeitar
                    </button>
                  </div>
                )}

                {q.status === 'APPROVED' && (
                  <div className="mt-4">
                    <button
                      onClick={() => handleConvert(q.id)}
                      className="w-full px-4 py-2 rounded-xl bg-[#C27360] hover:bg-[#A75644] text-white text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <PackageCheck className="w-3.5 h-3.5" /> Converter em Pedido
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Add the sidebar link**

In `src/components/admin/AdminSidebar.tsx`, add `Sparkles` to the existing `lucide-react` import if not already imported (it already is, used elsewhere in the file), and add a nav item. Insert right after the `'Conversas da IA'` entry added in Fase 2:

```ts
    { label: 'Pedidos da Açucena', href: '/admin/aprovacoes-ia', icon: Sparkles, ownerOnly: false },
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit -p .`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/aprovacoes-ia src/components/admin/AdminSidebar.tsx
git commit -m "feat: add /admin/aprovacoes-ia approval queue for assistant-created orders"
```

---

## Task 4: Simulated payment option

**Files:**
- Modify: `src/app/admin/pedidos/page.tsx`

**Interfaces:**
- Consumes: `PUT /api/orders/[id]` with `{ addPayment: { amount, paymentMethod } }` (already existing, unchanged).

- [ ] **Step 1: Add the "Simulado" option to the existing payment method select**

In `src/app/admin/pedidos/page.tsx`, find the `<select>` inside the "Add Payment Modal" (`value={paymentMethod}`), currently:

```tsx
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#F2D7D0] text-sm outline-none"
                  >
                    <option value="Pix">Pix</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Cartao">Cartão de Crédito/Débito</option>
                    <option value="Transferencia">Transferência</option>
                  </select>
```

Add one option:

```tsx
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#F2D7D0] text-sm outline-none"
                  >
                    <option value="Pix">Pix</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Cartao">Cartão de Crédito/Débito</option>
                    <option value="Transferencia">Transferência</option>
                    <option value="Simulado">Simulado (sem dinheiro real)</option>
                  </select>
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit -p .`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/pedidos/page.tsx
git commit -m "feat: add a simulated payment method option to the existing payment flow"
```

---

## Task 5: Simulated receipt — `/recibo/[id]`

**Files:**
- Create: `src/app/api/orders/[id]/recibo/route.ts`
- Create: `src/app/recibo/[id]/page.tsx`

**Interfaces:**
- Produces: `GET /api/orders/[id]/recibo?whatsapp=...` -- public, verifies `whatsapp` against `order.customerWhatsapp` before returning data (same access model as `/api/track`). Consumed by the new page.

No automated test -- matches this repo's convention that route handlers and public pages aren't unit-tested (verified manually in Task 6), same as `/api/track` and `/pedido` have none today.

- [ ] **Step 1: Write the API route**

```ts
// src/app/api/orders/[id]/recibo/route.ts
import { NextResponse } from 'next/server';
import { getScopedPrisma } from '@/lib/db';
import { getCurrentOrganization } from '@/lib/tenant';

// Public: same access model as /api/track -- the pairing of order id +
// the WhatsApp given at order time is the access control. Never confirms
// whether an id exists to a caller with the wrong WhatsApp; both "wrong
// number" and "no such order" return the same 404.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const organization = await getCurrentOrganization();
    if (!organization) {
      return NextResponse.json({ error: 'Loja não encontrada.' }, { status: 404 });
    }
    const db = getScopedPrisma(organization.id);

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const whatsapp = (searchParams.get('whatsapp') || '').replace(/\D/g, '');

    if (!whatsapp || whatsapp.length < 10) {
      return NextResponse.json({ error: 'Informe o WhatsApp usado na encomenda.' }, { status: 400 });
    }

    const order = await db.order.findFirst({
      where: { id, customerWhatsapp: whatsapp },
      include: { items: true, payments: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Não encontramos esse pedido com esse WhatsApp.' }, { status: 404 });
    }

    return NextResponse.json({
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      deliveryDate: order.deliveryDate,
      totalAmount: order.totalAmount,
      paidAmount: order.paidAmount,
      paymentStatus: order.paymentStatus,
      items: order.items.map((i) => ({
        productName: i.productName,
        variationName: i.variationName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
      })),
      payments: order.payments.map((p) => ({
        amount: p.amount,
        paymentMethod: p.paymentMethod,
        paidAt: p.paidAt,
      })),
      createdAt: order.createdAt,
    });
  } catch (error) {
    console.error('Error fetching receipt:', error);
    return NextResponse.json({ error: 'Erro ao buscar recibo.' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Write the public page**

```tsx
// src/app/recibo/[id]/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Receipt, AlertTriangle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function ReceiptPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const whatsapp = searchParams.get('whatsapp') || '';

  const [data, setData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !whatsapp) {
      setErrorMsg('Link de recibo incompleto.');
      setLoading(false);
      return;
    }
    fetch(`/api/orders/${id}/recibo?whatsapp=${encodeURIComponent(whatsapp)}`)
      .then(async (res) => {
        const json = await res.json();
        if (res.ok) setData(json);
        else setErrorMsg(json.error || 'Não foi possível carregar o recibo.');
      })
      .catch(() => setErrorMsg('Erro ao conectar ao servidor.'))
      .finally(() => setLoading(false));
  }, [id, whatsapp]);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] py-10 px-4">
      <div className="max-w-lg mx-auto">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-accent-deep)] hover:underline mb-6">
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar para a loja
        </Link>

        {loading && <p className="text-center text-sm text-[var(--color-text-soft)]">Carregando...</p>}

        {errorMsg && (
          <div className="bg-white rounded-3xl border border-[var(--color-border)] shadow-card p-6 text-center">
            <p className="text-sm text-[var(--color-heading)] font-semibold">{errorMsg}</p>
          </div>
        )}

        {data && (
          <div className="bg-white rounded-3xl border border-[var(--color-border)] shadow-card overflow-hidden">
            <div className="bg-[var(--color-accent-deep)] text-white p-6 text-center">
              <Receipt className="w-8 h-8 mx-auto mb-2" />
              <h1 className="font-serif text-xl font-bold">Recibo do Pedido</h1>
              <p className="text-sm opacity-90">{data.orderNumber}</p>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-800 font-semibold">
                  Documento simulado para fins de demonstração, sem validade fiscal.
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-[var(--color-accent-strong)]">Cliente</span>
                <p className="text-sm text-[var(--color-heading)] font-semibold">{data.customerName}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-[var(--color-accent-strong)]">Itens</span>
                {data.items.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm text-[var(--color-text-soft)] py-1">
                    <span>{item.quantity}x {item.productName}{item.variationName ? ` (${item.variationName})` : ''}</span>
                    <span>{formatCurrency(item.totalPrice)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-[var(--color-border)] space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--color-text-soft)]">Total</span>
                  <span className="font-bold text-[var(--color-heading)]">{formatCurrency(data.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--color-text-soft)]">Pago</span>
                  <span className="font-bold text-emerald-600">{formatCurrency(data.paidAmount)}</span>
                </div>
                <div className="flex justify-between text-xs pt-1">
                  <span className="text-[var(--color-text-soft)]">Status</span>
                  <span className="font-bold text-[var(--color-heading)]">{data.paymentStatus}</span>
                </div>
              </div>

              {data.payments?.length > 0 && (
                <div className="pt-3 border-t border-[var(--color-border)]">
                  <span className="text-[10px] font-bold uppercase text-[var(--color-accent-strong)]">Pagamentos</span>
                  {data.payments.map((p: any, i: number) => (
                    <div key={i} className="flex justify-between text-xs text-[var(--color-text-soft)] py-1">
                      <span>{p.paymentMethod} -- {formatDate(p.paidAt)}</span>
                      <span>{formatCurrency(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit -p .`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/orders/[id]/recibo src/app/recibo
git commit -m "feat: add public simulated receipt page at /recibo/[id]"
```

---

## Task 6: Manual QA and Vercel preview validation

No code changes -- verifies Tasks 1-5 together before merging.

- [ ] **Step 1: Run the full automated test suite**

Run: `npm test`
Expected: all tests pass, including the new `quotes.test.ts` and the extended `assistant-tools.test.ts`.

- [ ] **Step 2: Push the schema to production**

The `Quote.createdByAssistant` field must exist in production before this branch is merged (Vercel deploys immediately on merge to `main`, and the assistant would fail creating any quote without it). Run `npm run db:push:prod` -- this is a production-database change, so confirm with the user before running it (same as Fase 2's schema push).

- [ ] **Step 3: Manual smoke test against `npm run dev`**

With a real `GOOGLE_GENERATIVE_AI_API_KEY` in `.env`, open the homepage, click "Falar com a Açucena", and confirm:
- The header says "Açucena", not "Assistente Virtual".
- Describe a vague need ("quero um bolo pra festa de criança") -- Açucena asks clarifying questions before recommending, and only recommends real catalog products.
- Give her a full order (name, WhatsApp, product, variation, date, quantity) and explicitly say "sim, pode fechar" -- she calls `fecharPedido` and confirms a pedido number without claiming it's confirmed.
- The new `Quote` appears in `/admin/aprovacoes-ia` with `status: PENDING`.
- Approve it, then convert it to an order -- it now appears in `/admin/pedidos`.
- Open the order, register a payment with method "Simulado (sem dinheiro real)" for the full amount -- `paymentStatus` becomes `PAGO`.
- Visit `/recibo/[orderId]?whatsapp=<the real number>` -- shows the receipt with the "documento simulado" warning. Visit it again with a wrong WhatsApp number -- confirm it's refused.

- [ ] **Step 4: Push the branch and get the Vercel preview URL**

```bash
git push -u origin feature/acucena-agente-vendas
```

Then fetch the preview deployment via the GitHub Deployments API and open a PR (same pattern as prior phases in this project):

```bash
gh pr create --title "feat: Açucena, agente de vendas de ponta a ponta (Fase 3)" --body "..."
```

- [ ] **Step 5: Hand the preview URL to the user**

Report the preview URL and the smoke-test results from Step 3. Per this project's standing workflow (`CLAUDE.md`), do not merge until CI (`build-and-test`) passes and the user has had a chance to review.
