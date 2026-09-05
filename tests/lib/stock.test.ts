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
