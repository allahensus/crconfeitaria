import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { resetTestDatabase } from '../helpers/testDb';
import { prisma } from '@/lib/prisma';
import { getScopedPrisma } from '@/lib/db';

describe('cross-tenant data isolation', () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('keeps every tenant-scoped model isolated between two organizations', async () => {
    const orgA = await prisma.organization.create({ data: { name: 'Loja A', subdomain: 'loja-a' } });
    const orgB = await prisma.organization.create({ data: { name: 'Loja B', subdomain: 'loja-b' } });

    const dbA = getScopedPrisma(orgA.id);
    const dbB = getScopedPrisma(orgB.id);

    const category = await dbA.category.create({ data: { name: 'Bolos', slug: 'bolos' } });
    await dbA.product.create({
      data: {
        name: 'Bolo de Chocolate',
        slug: 'bolo-de-chocolate',
        categoryId: category.id,
        description: 'Delicioso',
        mainImage: '/img.jpg',
        basePrice: 100,
      },
    });
    await dbA.customer.create({ data: { name: 'Cliente A', whatsapp: '11999990000' } });
    await dbA.fillingOption.create({ data: { name: 'Ninho' } });
    await dbA.testimonial.create({ data: { name: 'Fulana', eventType: 'Aniversário', comment: 'Ótimo!' } });
    await dbA.ingredient.create({ data: { name: 'Farinha', packageQuantity: 1000, costPrice: 5 } });
    await dbA.setting.create({ data: { key: 'whatsapp_number', value: '5511999990000' } });

    expect(await dbB.category.findMany()).toHaveLength(0);
    expect(await dbB.product.findMany()).toHaveLength(0);
    expect(await dbB.customer.findMany()).toHaveLength(0);
    expect(await dbB.fillingOption.findMany()).toHaveLength(0);
    expect(await dbB.testimonial.findMany()).toHaveLength(0);
    expect(await dbB.ingredient.findMany()).toHaveLength(0);
    expect(await dbB.setting.findMany()).toHaveLength(0);

    expect(await dbA.category.findMany()).toHaveLength(1);
    expect(await dbA.product.findMany()).toHaveLength(1);
    expect(await dbA.customer.findMany()).toHaveLength(1);
  });

  it('lets two organizations reuse the same customer WhatsApp number as distinct customers', async () => {
    const orgA = await prisma.organization.create({ data: { name: 'Loja A', subdomain: 'loja-a' } });
    const orgB = await prisma.organization.create({ data: { name: 'Loja B', subdomain: 'loja-b' } });

    const dbA = getScopedPrisma(orgA.id);
    const dbB = getScopedPrisma(orgB.id);

    await dbA.customer.create({ data: { name: 'Cliente da Loja A', whatsapp: '11999990000' } });
    await dbB.customer.create({ data: { name: 'Cliente da Loja B', whatsapp: '11999990000' } });

    const foundByA = await dbA.customer.findFirst({ where: { whatsapp: '11999990000' } });
    const foundByB = await dbB.customer.findFirst({ where: { whatsapp: '11999990000' } });

    expect(foundByA?.name).toBe('Cliente da Loja A');
    expect(foundByB?.name).toBe('Cliente da Loja B');
  });

  it('lets two organizations independently sequence their own quote numbers', async () => {
    const orgA = await prisma.organization.create({ data: { name: 'Loja A', subdomain: 'loja-a' } });
    const orgB = await prisma.organization.create({ data: { name: 'Loja B', subdomain: 'loja-b' } });

    const dbA = getScopedPrisma(orgA.id);
    const dbB = getScopedPrisma(orgB.id);

    const quoteDataFor = (orgId: string) => ({
      quoteNumber: 'ORC-2026-0001',
      customerName: 'Cliente',
      customerWhatsapp: '11999990000',
      subtotal: 100,
      finalTotal: 100,
    });

    const quoteA = await dbA.quote.create({ data: quoteDataFor(orgA.id) });
    const quoteB = await dbB.quote.create({ data: quoteDataFor(orgB.id) });

    expect(quoteA.quoteNumber).toBe('ORC-2026-0001');
    expect(quoteB.quoteNumber).toBe('ORC-2026-0001');
    expect(quoteA.organizationId).toBe(orgA.id);
    expect(quoteB.organizationId).toBe(orgB.id);
  });
});
