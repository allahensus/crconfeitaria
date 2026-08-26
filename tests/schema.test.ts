import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { resetTestDatabase } from './helpers/testDb';
import { prisma } from '@/lib/prisma';

describe('Organization model', () => {
  beforeAll(() => {
    resetTestDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates an organization and links a user to it', async () => {
    const org = await prisma.organization.create({
      data: { name: 'Loja Teste', subdomain: 'loja-teste' },
    });

    const user = await prisma.user.create({
      data: {
        email: 'dona@loja-teste.com',
        name: 'Dona da Loja',
        password: 'hash',
        role: 'OWNER',
        organizationId: org.id,
      },
    });

    expect(user.organizationId).toBe(org.id);
    expect(org.status).toBe('ACTIVE');
  });

  it('still allows organizationId to be null on existing models (not backfilled yet)', async () => {
    const category = await prisma.category.create({
      data: { name: 'Categoria Sem Loja', slug: 'categoria-sem-loja' },
    });
    expect(category.organizationId).toBeNull();
  });
});
