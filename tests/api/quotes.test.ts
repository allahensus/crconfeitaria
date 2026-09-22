// tests/api/quotes.test.ts
//
// GET /api/quotes (src/app/api/quotes/route.ts) is a thin wrapper around a
// single Prisma query: db.quote.findMany with an optional
// `{ createdByAssistant: true }` filter driven by the ?createdByAssistant=true
// query param, otherwise no filter at all. The route itself isn't invoked
// directly here (its GET reads the session via next/headers' cookies(), which
// needs a real request context this codebase doesn't otherwise mock in
// tests -- see tests/lib/*.test.ts, which all test through the scoped Prisma
// client instead). This test exercises the exact query the route runs,
// against a real Postgres test database, which is what's actually under test.
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { resetTestDatabase } from '../helpers/testDb';
import { prisma } from '@/lib/prisma';
import { getScopedPrisma } from '@/lib/db';

describe('GET /api/quotes createdByAssistant filtering', () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function makeOrgWithQuotes() {
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

    const baseQuoteData = {
      organizationId: org.id,
      customerName: 'Cliente',
      customerWhatsapp: '11999998888',
      subtotal: 100,
      extraTotal: 0,
      discount: 0,
      finalTotal: 100,
      depositAmount: 50,
      status: 'PENDING' as const,
      items: {
        create: [
          {
            productId: product.id,
            productName: product.name,
            quantity: 1,
            unitPrice: 100,
            totalPrice: 100,
          },
        ],
      },
    };

    const assistantQuote = await prisma.quote.create({
      data: { ...baseQuoteData, quoteNumber: 'ORC-2027-0001', createdByAssistant: true },
    });
    const humanQuote = await prisma.quote.create({
      data: { ...baseQuoteData, quoteNumber: 'ORC-2027-0002', createdByAssistant: false },
    });

    return { org, assistantQuote, humanQuote };
  }

  it('returns only createdByAssistant quotes when the filter is applied, mirroring ?createdByAssistant=true', async () => {
    const { org, assistantQuote } = await makeOrgWithQuotes();
    const db = getScopedPrisma(org.id);

    // Same query the route runs when searchParams has createdByAssistant=true.
    const quotes = await db.quote.findMany({ where: { createdByAssistant: true } });

    expect(quotes).toHaveLength(1);
    expect(quotes[0].id).toBe(assistantQuote.id);
    expect(quotes[0].createdByAssistant).toBe(true);
  });

  it('returns every quote regardless of createdByAssistant when no filter is applied (default route behavior unchanged)', async () => {
    const { org } = await makeOrgWithQuotes();
    const db = getScopedPrisma(org.id);

    // Same query the route runs with no createdByAssistant param: where is undefined.
    const quotes = await db.quote.findMany({ where: undefined });

    expect(quotes).toHaveLength(2);
    expect(quotes.map((q) => q.createdByAssistant).sort()).toEqual([false, true]);
  });
});
