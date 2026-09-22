import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { resetTestDatabase } from '../helpers/testDb';
import { prisma } from '@/lib/prisma';
import { getScopedPrisma } from '@/lib/db';
import { createQuote, QuoteValidationError } from '@/lib/quotes';

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

  it('throws a QuoteValidationError (not a generic Error) for validation failures', async () => {
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
    ).rejects.toBeInstanceOf(QuoteValidationError);
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
