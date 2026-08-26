import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { resetTestDatabase } from '../helpers/testDb';
import { prisma } from '@/lib/prisma';
import { getScopedPrisma } from '@/lib/db';

describe('getScopedPrisma', () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('throws when called without an organizationId', () => {
    expect(() => getScopedPrisma('')).toThrow();
    // @ts-expect-error deliberately passing undefined
    expect(() => getScopedPrisma(undefined)).toThrow();
  });

  it('scopes reads and writes to the given organization', async () => {
    const orgA = await prisma.organization.create({ data: { name: 'Loja A', subdomain: 'loja-a' } });
    const orgB = await prisma.organization.create({ data: { name: 'Loja B', subdomain: 'loja-b' } });

    const dbA = getScopedPrisma(orgA.id);
    const dbB = getScopedPrisma(orgB.id);

    const categoryA = await dbA.category.create({ data: { name: 'Bolos', slug: 'bolos', organizationId: orgA.id } });

    // dbB must not see orgA's category, even by exact id.
    const foundInB = await dbB.category.findUnique({ where: { id: categoryA.id } });
    expect(foundInB).toBeNull();

    const listInB = await dbB.category.findMany();
    expect(listInB).toHaveLength(0);

    const listInA = await dbA.category.findMany();
    expect(listInA).toHaveLength(1);
    expect(listInA[0].organizationId).toBe(orgA.id);
  });

  it('does not scope models that are not tenant-scoped, like Organization itself', async () => {
    await prisma.organization.create({ data: { name: 'Loja A', subdomain: 'loja-a' } });
    const anotherOrg = await prisma.organization.create({ data: { name: 'Loja B', subdomain: 'loja-b' } });

    const dbForA = getScopedPrisma('some-org-id-not-in-db');
    // Organization is not in TENANT_SCOPED_MODELS, so this must pass through unfiltered.
    const orgs = await dbForA.organization.findMany();
    expect(orgs.length).toBeGreaterThanOrEqual(2);
  });
});
