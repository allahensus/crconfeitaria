import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { resetTestDatabase } from './helpers/testDb';
import { prisma } from '@/lib/prisma';

describe('Organization model', () => {
  beforeAll(async () => {
    await resetTestDatabase();
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

  it('requires organizationId and enforces per-organization uniqueness', async () => {
    const orgA = await prisma.organization.create({ data: { name: 'Loja A', subdomain: 'loja-a' } });
    const orgB = await prisma.organization.create({ data: { name: 'Loja B', subdomain: 'loja-b' } });

    await prisma.category.create({
      data: { name: 'Bolos', slug: 'bolos', organizationId: orgA.id },
    });

    // Same slug in a different organization must be allowed.
    const categoryB = await prisma.category.create({
      data: { name: 'Bolos', slug: 'bolos', organizationId: orgB.id },
    });
    expect(categoryB.organizationId).toBe(orgB.id);

    // Same slug in the SAME organization must be rejected.
    await expect(
      prisma.category.create({
        data: { name: 'Bolos Duplicado', slug: 'bolos', organizationId: orgA.id },
      })
    ).rejects.toThrow();
  });
});
